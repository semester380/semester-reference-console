/**
 * Semester Reference Console - Main Backend Controller
 * Sprint 1: Core Workflow & Enterprise Foundation
 */

// --- Constants ---
const DB_SPREADSHEET_NAME = "SRC_Database";
const SHEET_REQUESTS = "Requests_Log";
const SHEET_AUDIT = "Audit_Trail";
const SHEET_TEMPLATES = "Template_Definitions";
const SHEET_AI_RESULTS = "AI_Results";
const TOKEN_EXPIRY_HOURS = 72;

// AI & Automation
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const CHASE_INTERVAL_DAYS = 3;
const MAX_CHASES_PER_DAY = 50;

// Column indices for Requests_Log (0-indexed)
const COL_REQUEST_ID = 0;
const COL_CANDIDATE_NAME = 1;
const COL_CANDIDATE_EMAIL = 2;
const COL_REFEREE_NAME = 3;
const COL_REFEREE_EMAIL = 4;
const COL_STATUS = 6;
const COL_ARCHIVED = 24; // New column for archive flag

/**
 * Serves the React application via HtmlService OR handles JSON API requests
 */
function doGet(e) {
  // If it's an API request (indicated by parameter), handle it
  if (e.parameter.responseFormat === 'json') {
    return handleApiRequest(e);
  }

  // Template Manager Route
  if (e.parameter.view === 'templates') {
    return HtmlService.createHtmlOutputFromFile('TemplateManager')
      .setTitle('Template Manager - Semester Reference Console')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // Otherwise serve the React App
  // In a real deployment, we might serve index.html here
  // For now, we'll return a simple message or the app if built
  return HtmlService.createHtmlOutput("Semester Reference Console Backend is Running. Use the React App to interact.")
    .setTitle('Semester Reference Console')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Handle POST requests (JSON API)
 */
function doPost(e) {
  return handleApiRequest(e);
}

/**
 * Main API Dispatcher
 */
function handleApiRequest(e) {
  const lock = LockService.getScriptLock();
  // Wait for up to 30 seconds for other processes to finish.
  lock.tryLock(30000);

  try {
    // Parse parameters
    let action = e.parameter.action;
    let payload = {};
    
    // If POST, parse body
    if (e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        if (body.action) action = body.action;
        payload = body;
      } catch (err) {
        // Fallback if not JSON
        payload = e.parameter;
      }
    } else {
      payload = e.parameter;
    }

    let result = {};

    switch (action) {
      case 'healthCheck':
        result = { success: true, service: 'Semester Reference Console', env: 'production', timestamp: new Date().toISOString() };
        break;
      case 'initializeDatabase':
        result = initializeDatabase();
        break;
      case 'initiateRequest':
        result = initiateRequest(payload);
        break;
      case 'getMyRequests':
        result = getMyRequests(payload.includeArchived || false);
        break;
      case 'getRequest':
        result = getRequest(payload.requestId);
        break;
      case 'getTemplates':
        result = getTemplates();
        break;
      case 'saveTemplate':
        result = saveTemplate(payload.name, payload.structure);
        break;
      case 'validateRefereeToken':
        result = validateRefereeToken(payload.token);
        break;
      case 'submitReference':
        result = submitReference(payload.token, payload.responses, payload.method, payload.declineReason, payload.declineDetails, payload.uploadedFileUrl, payload.fileName);
        break;
      case 'authorizeConsent':
        result = processCandidateConsent(payload.token, payload.decision);
        break;
      case 'getAuditTrail':
        result = { success: true, data: getAuditTrail(payload.requestId) };
        break;
      case 'sealRequest':
        result = sealRequest(payload.requestId);
        break;
      case 'runAnalysis':
        result = analyzeReference(payload.requestId);
        break;
      case 'runSmartChase':
        result = runSmartChase();
        break;
      case 'uploadReferenceDocument':
        result = uploadReferenceDocument(payload);
        break;
      case 'runE2ETest':
        result = runCompleteE2ETest();
        break;
      case 'archiveRequests':
        result = archiveRequests(payload.requestIds);
        break;
      case 'unarchiveRequests':
        result = unarchiveRequests(payload.requestIds);
        break;
      case 'deleteRequests':
        result = deleteRequests(payload.requestIds);
        break;
      default:
        result = { success: false, error: "Unknown action: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- Database & Auditing ---

/**
 * Initialize or verify database structure
 */
function initializeDatabase() {
  const ss = getDatabaseSpreadsheet();
  
  // 1. Requests_Log
  let requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
  if (!requestsSheet) {
    requestsSheet = ss.insertSheet(SHEET_REQUESTS);
    requestsSheet.appendRow([
      'RequestID', 'CandidateName', 'CandidateEmail', 'RefereeName', 'RefereeEmail', 
      'RequesterEmail', 'Status', 'ConsentStatus', 'ConsentTimestamp', 
      'ConsentToken', 'ConsentTokenExpiry', 'RefereeToken', 'RefereeTokenExpiry',
      'TemplateID', 'CreatedAt', 'UpdatedAt',
      'Method', 'DeclineReason', 'DeclineDetails', 'PdfFileId', 'PdfUrl', 'UploadedFileUrl', 'FileName'
    ]);
    requestsSheet.setFrozenRows(1);
  } else {
    // Check for new columns and add if missing (simple check)
    const headers = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    if (!headers.includes('Method')) {
      requestsSheet.getRange(1, headers.length + 1).setValue('Method');
      requestsSheet.getRange(1, headers.length + 2).setValue('DeclineReason');
      requestsSheet.getRange(1, headers.length + 3).setValue('DeclineDetails');
      requestsSheet.getRange(1, headers.length + 4).setValue('PdfFileId');
      requestsSheet.getRange(1, headers.length + 5).setValue('PdfUrl');
      requestsSheet.getRange(1, headers.length + 6).setValue('UploadedFileUrl');
      requestsSheet.getRange(1, headers.length + 7).setValue('FileName');
      requestsSheet.getRange(1, headers.length + 8).setValue('LastChaseDate');
    }
    // Add Archived column if missing
    if (!headers.includes('Archived')) {
      const colIndex = headers.length + 1;
      requestsSheet.getRange(1, colIndex).setValue('Archived');
    }
  }
  
  // 2. Audit_Trail
  let auditSheet = ss.getSheetByName(SHEET_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(SHEET_AUDIT);
    auditSheet.appendRow(['AuditID', 'RequestID', 'Timestamp', 'Actor', 'Action', 'Metadata']);
    auditSheet.setFrozenRows(1);
  }

  // 3. Template_Definitions
  let templatesSheet = ss.getSheetByName(SHEET_TEMPLATES);
  if (!templatesSheet) {
    templatesSheet = ss.insertSheet(SHEET_TEMPLATES);
    templatesSheet.appendRow(['TemplateID', 'Name', 'StructureJSON', 'CreatedBy', 'Timestamp']);
    templatesSheet.setFrozenRows(1);
  }
  
  // Always ensure default template exists and is up to date
  const defaultStructure = [
    { id: 'q1', type: 'rating', label: 'Technical Competence', required: true },
    { id: 'q2', type: 'rating', label: 'Communication Skills', required: true },
    { id: 'q3', type: 'boolean', label: 'Would you rehire this person?', required: true },
    { id: 'q4', type: 'text', label: 'Additional Comments', required: false },
    { id: 'sig1', type: 'signature', label: 'I confirm this reference is accurate', required: false }
  ];
  
  const defaultJson = JSON.stringify(defaultStructure);
  const tData = templatesSheet.getDataRange().getValues();
  let found = false;
  
  for (let i = 1; i < tData.length; i++) {
    if (tData[i][0] === 'default') {
       templatesSheet.getRange(i + 1, 3).setValue(defaultJson); // Update structure
       found = true;
       break;
    }
  }
  
  if (!found) {
    templatesSheet.appendRow([
      'default', 
      'Standard Employment Reference', 
      defaultJson, 
      'system', 
      new Date()
    ]);
  }
  
  // 4. AI_Results
  let aiSheet = ss.getSheetByName(SHEET_AI_RESULTS);
  if (!aiSheet) {
    aiSheet = ss.insertSheet(SHEET_AI_RESULTS);
    aiSheet.appendRow(['RequestID', 'Sentiment', 'Summary', 'AnomaliesJSON', 'Timestamp']);
    aiSheet.setFrozenRows(1);
  }
  
  return { success: true, message: "Database initialized successfully" };
}

/**
 * Get or create the master spreadsheet
 */
function getDatabaseSpreadsheet() {
  const files = DriveApp.getFilesByName(DB_SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  } else {
    return SpreadsheetApp.create(DB_SPREADSHEET_NAME);
  }
}

/**
 * Log an audit event (Mandatory for compliance)
 */
function logAudit(requestId, actor, action, metadata = {}) {
  try {
    const ss = getDatabaseSpreadsheet();
    const auditSheet = ss.getSheetByName(SHEET_AUDIT);
    
    const auditId = Utilities.getUuid();
    const timestamp = new Date();
    const metadataStr = JSON.stringify(metadata);
    
    auditSheet.appendRow([
      auditId, requestId, timestamp, actor, action, metadataStr
    ]);
  } catch (e) {
    console.error("AUDIT FAILURE: " + e.toString());
  }
}

// --- Core Workflow: Initiation ---

/**
 * Initiate a new reference request
 */
function initiateRequest(requestData) {
  try {
    // 1. Validate Input
    if (!requestData.candidateName || !requestData.candidateEmail || !requestData.refereeName || !requestData.refereeEmail) {
      throw new Error("Missing required fields");
    }
    
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
    
    // 2. Generate Secure Data
    const requestId = Utilities.getUuid();
    const consentToken = Utilities.getUuid();
    const now = new Date();
    const expiry = new Date(now.getTime() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000));
    const requesterEmail = Session.getActiveUser().getEmail();
    
    // 3. Create Record
    const rowData = [
      requestId,
      requestData.candidateName,
      requestData.candidateEmail,
      requestData.refereeName,
      requestData.refereeEmail,
      requesterEmail,
      'PENDING_CONSENT', // Status
      'PENDING',         // ConsentStatus
      '',                // ConsentTimestamp
      consentToken,
      expiry,
      '',                // RefereeToken (generated after consent)
      '',                // RefereeTokenExpiry
      requestData.templateId || 'default',
      now,
      now,
      '', '', '', '', '', '', '' // New fields empty
    ];
    
    requestsSheet.appendRow(rowData);
    
    // 4. Log Audit
    logAudit(requestId, requesterEmail, 'REQUEST_INITIATED', { 
      candidate: requestData.candidateEmail,
      referee: requestData.refereeEmail 
    });
    
    // 5. Send Authorization Email
    sendAuthorizationEmail(requestData.candidateEmail, requestData.candidateName, consentToken, requestData.refereeName);
    
    return { success: true, requestId: requestId };
    
  } catch (e) {
    console.error("initiateRequest Error: " + e.toString());
    sendErrorAlert('initiateRequest', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Send authorization email to candidate
 */
function sendAuthorizationEmail(email, name, token, refereeName) {
  const webAppUrl = ScriptApp.getService().getUrl();
  // In a real app, this would point to the React App URL with the token
  // For now, we assume the React App is hosting the portal
  // We'll use a placeholder URL that the user needs to configure
  // Or if serving via GAS, use webAppUrl
  
  // Construct the URL to the React App (Portal)
  // Use the configured PORTAL_BASE_URL or fallback to the Vercel app
  const portalBaseUrl = PropertiesService.getScriptProperties().getProperty('PORTAL_BASE_URL') || 'https://semester-reference-console-nmd4bhpey-robs-projects-ae895b9a.vercel.app/';
  
  // Ensure we don't double-slash
  const baseUrl = portalBaseUrl.endsWith('/') ? portalBaseUrl.slice(0, -1) : portalBaseUrl;
  
  // React App Route: /?view=portal&action=authorize&token=...
  const authUrl = `${baseUrl}/?view=portal&action=authorize&token=${token}`;
  
  const subject = `Action Required: Authorize Reference Request for ${refereeName}`;
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827; margin-bottom: 24px; font-weight: 600;">Reference Authorization Required</h2>
      <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">Dear ${name},</p>
      <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
        A reference request has been initiated for <strong>${refereeName}</strong>. 
        In compliance with data protection regulations, we require your explicit consent before contacting this referee.
      </p>
      <div style="margin: 32px 0;">
        <a href="${authUrl}" style="background-color: #0052CC; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">Authorize Request</a>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        If you did not expect this request, you can safely ignore this email or decline the request via the link above.
      </p>
    </div>
  `;
  
  GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
}

// --- Core Workflow: Authorization ---

/**
 * Process candidate's consent decision
 */
function processCandidateConsent(token, decision) {
  try {
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = requestsSheet.getDataRange().getValues();
    
    // Find request by token (Column index 9 is ConsentToken - 0-based)
    let rowIndex = -1;
    let request = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][9] === token) {
        rowIndex = i;
        request = data[i];
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: "Invalid token" };
    }
    
    // Check Expiry (Column index 10)
    const expiry = new Date(request[10]);
    if (new Date() > expiry) {
      requestsSheet.getRange(rowIndex + 1, 7).setValue('EXPIRED'); // Status column
      return { success: false, error: "Token expired" };
    }
    
    // Check if already processed
    if (request[7] !== 'PENDING') {
       return { success: false, error: "Request already processed" };
    }
    
    const requestId = request[0];
    const now = new Date();
    
    // Update Record
    if (decision === 'CONSENT_GIVEN') {
      requestsSheet.getRange(rowIndex + 1, 7).setValue('CONSENT_GIVEN'); // Status
      requestsSheet.getRange(rowIndex + 1, 8).setValue('GRANTED'); // ConsentStatus
      requestsSheet.getRange(rowIndex + 1, 9).setValue(now); // ConsentTimestamp (column 9, index 8)
      
      // Generate Referee Token
      const refereeToken = Utilities.getUuid();
      const refExpiry = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
      
      requestsSheet.getRange(rowIndex + 1, 12).setValue(refereeToken);
      requestsSheet.getRange(rowIndex + 1, 13).setValue(refExpiry);
      
      // Send Invite to Referee
      sendRefereeInviteEmail(request[4], request[3], request[1], refereeToken);
      
    } else {
      requestsSheet.getRange(rowIndex + 1, 7).setValue('CONSENT_DECLINED');
      requestsSheet.getRange(rowIndex + 1, 8).setValue('DECLINED');
      requestsSheet.getRange(rowIndex + 1, 9).setValue(now);
    }
    
    logAudit(requestId, 'Candidate', decision, { token: '***' });
    
    return { success: true };
    
  } catch (e) {
    console.error("processCandidateConsent Error: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function sendRefereeInviteEmail(email, name, candidateName, token) {
  const webAppUrl = ScriptApp.getService().getUrl();
  const portalBaseUrl = PropertiesService.getScriptProperties().getProperty('PORTAL_BASE_URL') || 'https://semester-reference-console-nmd4bhpey-robs-projects-ae895b9a.vercel.app/';
  
  // Ensure we don't double-slash
  const baseUrl = portalBaseUrl.endsWith('/') ? portalBaseUrl.slice(0, -1) : portalBaseUrl;
  
  const inviteUrl = `${baseUrl}/?view=portal&token=${token}`;
  
  const subject = `Reference Request for ${candidateName} - Semester`;
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827; margin-bottom: 24px; font-weight: 600;">Reference Request</h2>
      <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">Dear ${name},</p>
      <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
        <strong>${candidateName}</strong> has nominated you as a referee. We would appreciate your feedback on their past performance.
      </p>
      <div style="margin: 32px 0;">
        <a href="${inviteUrl}" style="background-color: #0052CC; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">Provide Reference</a>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        You can choose to complete a short online form, upload a document, or decline this request if you are unable to provide a reference.
      </p>
    </div>
  `;
  
  GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
}

// --- Core Workflow: Referee Portal ---

/**
 * Validate referee token and return form data
 */
function validateRefereeToken(token) {
  console.log(`[validateRefereeToken] Looking for token: "${token}"`);
  console.log(`[validateRefereeToken] Token type: ${typeof token}, length: ${token ? token.length : 0}`);
  
  const ss = getDatabaseSpreadsheet();
  const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
  const data = requestsSheet.getDataRange().getValues();
  
  console.log(`[validateRefereeToken] Total rows (including header): ${data.length}`);
  
  let request = null;
  for (let i = 1; i < data.length; i++) {
    const sheetToken = data[i][11]; // RefereeToken column
    console.log(`[validateRefereeToken] Row ${i}: sheetToken="${sheetToken}", type=${typeof sheetToken}, match=${sheetToken === token}`);
    
    if (sheetToken === token) { // RefereeToken column
      console.log(`[validateRefereeToken] MATCH FOUND at row ${i}`);
      request = data[i];
      break;
    }
  }
  
  if (!request) {
    console.log(`[validateRefereeToken] No match found - returning Invalid token`);
    return { valid: false, error: "Invalid token" };
  }
  
  console.log(`[validateRefereeToken] Token validated successfully`);
  
  // Check Expiry
  const expiry = new Date(request[12]);
  if (new Date() > expiry) {
    console.log(`[validateRefereeToken] Token expired`);
    return { valid: false, error: "Token expired" };
  }
  
  // Check if already completed
  if (['Completed', 'Declined', 'SEALED'].includes(request[6])) {
     console.log(`[validateRefereeToken] Reference already submitted, status: ${request[6]}`);
     return { valid: false, error: "Reference already submitted" };
  }
  
  // Get Template
  const templatesResponse = getTemplates();
  const templates = templatesResponse.data || [];
  const templateId = request[13];
  const template = templates.find(t => t.templateId === templateId) || templates[0];
  
  console.log(`[validateRefereeToken] Returning valid response`);
  return {
    valid: true,
    candidateName: request[1],
    template: template
  };
}

/**
 * Submit reference response
 */
function submitReference(token, responses, method, declineReason, declineDetails, uploadedFileUrl, fileName) {
  try {
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = requestsSheet.getDataRange().getValues();
    
    let rowIndex = -1;
    let request = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][11] === token) {
        rowIndex = i;
        request = data[i];
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: "Invalid token" };
    }
    
    const requestId = request[0];
    const now = new Date();
    
    // Update Status and Details
    if (method === 'decline') {
      requestsSheet.getRange(rowIndex + 1, 7).setValue('Declined');
      requestsSheet.getRange(rowIndex + 1, 17).setValue('decline'); // Method
      requestsSheet.getRange(rowIndex + 1, 18).setValue(declineReason);
      requestsSheet.getRange(rowIndex + 1, 19).setValue(declineDetails);
      logAudit(requestId, 'Referee', 'REFERENCE_DECLINED', { reason: declineReason });
    } else if (method === 'upload') {
      requestsSheet.getRange(rowIndex + 1, 7).setValue('Completed');
      requestsSheet.getRange(rowIndex + 1, 17).setValue('upload'); // Method
      requestsSheet.getRange(rowIndex + 1, 22).setValue(uploadedFileUrl);
      requestsSheet.getRange(rowIndex + 1, 23).setValue(fileName);
      logAudit(requestId, 'Referee', 'DOCUMENT_UPLOADED', { fileName: fileName });
    } else {
      // Form submission
      requestsSheet.getRange(rowIndex + 1, 7).setValue('Completed');
      requestsSheet.getRange(rowIndex + 1, 17).setValue('form'); // Method
      
      // Store responses as a JSON file in Drive or a separate sheet?
      // For simplicity in this phase, we'll assume responses are stored in a separate 'Responses' sheet or we just log them.
      // Ideally, we'd have a 'Responses' sheet. Let's create one if needed, or just store JSON in a Note/Cell if small.
      // For enterprise, we should use a separate sheet.
      // Let's create a Responses sheet on the fly.
      storeResponses(requestId, responses);
      
      logAudit(requestId, 'Referee', 'REFERENCE_SUBMITTED', {});
    }
    
    requestsSheet.getRange(rowIndex + 1, 16).setValue(now); // UpdatedAt
    
    // Trigger AI Analysis automatically
    if (method !== 'decline') {
      analyzeReference(requestId);
    }
    
    return { success: true };
  } catch (e) {
    sendErrorAlert('submitReference', e);
    return { success: false, error: e.toString() };
  }
}

function storeResponses(requestId, responses) {
  const ss = getDatabaseSpreadsheet();
  let sheet = ss.getSheetByName("Responses");
  if (!sheet) {
    sheet = ss.insertSheet("Responses");
    sheet.appendRow(['RequestID', 'ResponsesJSON', 'Timestamp']);
  }
  sheet.appendRow([requestId, JSON.stringify(responses), new Date()]);
}

/**
 * Upload reference document and store in Drive
 */
function uploadReferenceDocument(payload) {
  try {
    const { token, fileData, fileName, mimeType } = payload;
    
    if (!token || !fileData || !fileName) {
      throw new Error("Missing required fields: token, fileData, or fileName");
    }
    
    // Validate token and get request info
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = requestsSheet.getDataRange().getValues();
    
    let rowIndex = -1;
    let request = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][11] === token) { // RefereeToken column
        rowIndex = i;
        request = data[i];
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: "Invalid token" };
    }
    
    // Check if already completed
    if (['Completed', 'Declined', 'SEALED'].includes(request[6])) {
      return { success: false, error: "Reference already submitted" };
    }
    
    const requestId = request[0];
    const refereeName = request[3];
    
    // Get or create Drive folder
    const folderName = "Semester Reference Uploads";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    // Decode base64 and create file
    const contentType = mimeType || 'application/pdf';
    const blob = Utilities.newBlob(Utilities.base64Decode(fileData), contentType, fileName);
    
    // Create unique filename
    const timestamp = new Date().getTime();
    const extension = fileName.split('.').pop();
    const uniqueFileName = `${requestId}_${refereeName}_${timestamp}.${extension}`;
    
    // Upload to Drive
    const file = folder.createFile(blob.setName(uniqueFileName));
    
    // Set sharing to "Anyone with link can view"
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileUrl = file.getUrl();
    const fileId = file.getId();
    
    // Update request record
    const now = new Date();
    requestsSheet.getRange(rowIndex + 1, 7).setValue('Completed'); // Status
    requestsSheet.getRange(rowIndex + 1, 16).setValue(now); // UpdatedAt
    requestsSheet.getRange(rowIndex + 1, 17).setValue('upload'); // Method
    requestsSheet.getRange(rowIndex + 1, 22).setValue(fileUrl); // UploadedFileUrl
    requestsSheet.getRange(rowIndex + 1, 23).setValue(fileName); // FileName
    
    // Log audit event
    logAudit(requestId, 'Referee', 'DOCUMENT_UPLOADED', { 
      fileName: fileName,
      fileId: fileId,
      fileUrl: fileUrl
    });
    
    // Trigger AI analysis
    analyzeReference(requestId);
    
    return { 
      success: true, 
      fileUrl: fileUrl,
      fileName: fileName,
      fileId: fileId
    };
    
  } catch (e) {
    Logger.log('uploadReferenceDocument Error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

// --- Dashboard & Management ---

function getMyRequests(includeArchived = false) {
  const ss = getDatabaseSpreadsheet();
  const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
  const data = requestsSheet.getDataRange().getValues();
  const headers = data[0];
  const userEmail = Session.getActiveUser().getEmail();
  
  // Find Archived column index dynamically
  const archivedColIndex = headers.indexOf('Archived');
  
  // Fetch all AI results for efficient lookup
  const aiResults = getAllAIResults();
  
  const myRequests = [];
  // Skip header
  for (let i = 1; i < data.length; i++) {
    // Check archived status
    const isArchived = archivedColIndex !== -1 && data[i][archivedColIndex] === true;
    
    // Skip archived unless explicitly requested
    if (isArchived && !includeArchived) {
      continue;
    }
    
    const requestId = data[i][0];
    
    // We need to fetch responses if completed
    let responses = {};
    if (data[i][6] === 'Completed' || data[i][6] === 'Declined' || data[i][6] === 'SEALED') {
      responses = fetchResponses(requestId);
      
      // Add decline/upload info from columns
      if (data[i][16] === 'decline') {
        responses.declineReason = data[i][17];
        responses.declineDetails = data[i][18];
      } else if (data[i][16] === 'upload') {
        responses.uploadedFileUrl = data[i][21];
        responses.fileName = data[i][22];
      }
    }
    
    myRequests.push({
      requestId: requestId,
      candidateName: data[i][1],
      candidateEmail: data[i][2],
      refereeName: data[i][3],
      refereeEmail: data[i][4],
      status: data[i][6],
      consentStatus: data[i][7] === 'GRANTED',
      token: data[i][9], // Exposed for testing
      refereeToken: data[i][11], // Exposed for testing
      createdAt: data[i][14],
      responses: responses,
      aiAnalysis: aiResults[requestId] || null,
      archived: isArchived
    });
  }
  
  return { success: true, data: myRequests.reverse() };
}

function getAllAIResults() {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName("AI_Results");
  if (!sheet) return {};
  
  const data = sheet.getDataRange().getValues();
  const results = {};
  
  for (let i = 1; i < data.length; i++) {
    try {
      results[data[i][0]] = {
        sentimentScore: data[i][1],
        summary: JSON.parse(data[i][2]),
        anomalies: JSON.parse(data[i][3]),
        timestamp: data[i][4]
      };
    } catch (e) {}
  }
  return results;
}

function fetchResponses(requestId) {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName("Responses");
  if (!sheet) return {};
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === requestId) {
      try {
        return JSON.parse(data[i][1]);
      } catch (e) {
        return {};
      }
    }
  }
  return {};
}

function getRequest(requestId) {
  const requests = getMyRequests().data;
  const request = requests.find(r => r.requestId === requestId);
  
  if (request && request.responses && typeof request.responses === 'string') {
    try {
      request.responses = JSON.parse(request.responses);
    } catch (e) {
      // Keep as string if parse fails
      console.error("Failed to parse responses JSON: " + e.toString());
    }
  }
  
  return { success: true, data: request };
}

// --- Templates ---

function getTemplates() {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TEMPLATES);
  const data = sheet.getDataRange().getValues();
  
  const templates = [];
  for (let i = 1; i < data.length; i++) {
    try {
      templates.push({
        templateId: data[i][0],
        name: data[i][1],
        structureJSON: JSON.parse(data[i][2]),
        active: true
      });
    } catch (e) {}
  }
  return { success: true, data: templates };
}

function saveTemplate(name, structure) {
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TEMPLATES);
    const templateId = Utilities.getUuid();
    sheet.appendRow([templateId, name, JSON.stringify(structure), Session.getActiveUser().getEmail(), new Date()]);
    return { success: true, templateId: templateId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// --- AI & Analysis ---

function analyzeReference(requestId) {
  // Call the function in AI.gs
  // We need to expose it here or import it. 
  // Since they are in the same project, we can call it directly if it's global.
  // Assuming AI.gs functions are available.
  
  // First, fetch the reference data
  const request = getRequest(requestId).data;
  if (!request) return { success: false, error: "Request not found" };
  
  // If it's a decline or upload, AI might be limited
  if (request.responses.declineReason) {
    return { success: true, message: "Skipped AI for declined reference" };
  }
  
  // Call AI module
  if (typeof analyzeSentimentAndAnomalies === 'function') {
    const analysis = analyzeSentimentAndAnomalies(requestId, request.responses);
    return { success: true, analysis: analysis };
  } else {
    return { success: false, error: "AI module not found" };
  }
}

// --- PDF & Sealing ---

/**
 * Generate PDF and seal the reference request
 */
function sealRequest(requestId) {
  try {
    // Get request data
    const request = getRequest(requestId).data;
    if (!request) {
      return { success: false, error: "Request not found" };
    }
    
    // Generate PDF
    const pdfResult = generatePDF(requestId, request);
    if (!pdfResult.success) {
      return pdfResult;
    }
    
    // Update status to SEALED
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requestId) {
        sheet.getRange(i + 1, 7).setValue('SEALED'); // Status
        sheet.getRange(i + 1, 20).setValue(pdfResult.pdfFileId); // PdfFileId (column 20)
        sheet.getRange(i + 1, 21).setValue(pdfResult.pdfUrl); // PdfUrl (column 21)
        break;
      }
    }
    
    logAudit(requestId, Session.getActiveUser().getEmail(), 'REFERENCE_SEALED', { 
      pdfUrl: pdfResult.pdfUrl,
      pdfFileId: pdfResult.pdfFileId
    });
    
    return { 
      success: true, 
      pdfUrl: pdfResult.pdfUrl,
      pdfFileId: pdfResult.pdfFileId
    };
    
  } catch (e) {
    Logger.log('sealRequest Error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Generate PDF from template
 */
function generatePDF(requestId, request) {
  try {
    const responses = request.responses || {};
    const method = responses.uploadedFileUrl ? 'upload' : 
                   responses.declineReason ? 'decline' : 'form';
    
    // Build content based on method
    let content = '';
    
    if (method === 'decline') {
      content = buildDeclineContent(responses);
    } else if (method === 'upload') {
      content = buildUploadContent(responses);
    } else {
      content = buildFormContent(responses);
    }
    
    // Load template
    const templateHtml = HtmlService.createHtmlOutputFromFile('PdfTemplate').getContent();
    
    // Replace placeholders using simple {{name}} syntax
    const methodLabels = {
      'form': 'Online Form',
      'upload': 'Uploaded Document', 
      'decline': 'Declined'
    };
    
    let html = templateHtml
      .replace(/\{\{candidateName\}\}/g, request.candidateName || '')
      .replace(/\{\{candidateEmail\}\}/g, request.candidateEmail || '')
      .replace(/\{\{refereeName\}\}/g, request.refereeName || '')
      .replace(/\{\{refereeEmail\}\}/g, request.refereeEmail || '')
      .replace(/\{\{requestId\}\}/g, requestId)
      .replace(/\{\{method\}\}/g, method)
      .replace(/\{\{methodLabel\}\}/g, methodLabels[method])
      .replace(/\{\{content\}\}/g, content)
      .replace(/\{\{generatedDate\}\}/g, new Date().toLocaleString('en-GB'));
    
    // Create PDF blob
    const blob = Utilities.newBlob(html, 'text/html', 'reference.html')
      .getAs('application/pdf')
      .setName('Reference_' + (request.candidateName || 'Unknown') + '_' + requestId + '.pdf');
    
    // Get or create PDF folder
    const folderName = "Semester References PDFs";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    // Save PDF
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      success: true,
      pdfUrl: file.getUrl(),
      pdfFileId: file.getId()
    };
    
  } catch (e) {
    Logger.log('generatePDF Error: ' + e.toString());
    return { success: false, error: 'PDF generation failed: ' + e.toString() };
  }
}

function buildFormContent(responses) {
  let html = '<div class="section"><div class="section-title">Reference Response</div>';
  
  for (const key in responses) {
    const value = responses[key];
    
    // Skip signature objects for now (we'll handle them separately)
    if (typeof value === 'object' && value && value.typedName) {
      continue;
    }
    
    html += '<div class="question-block">';
    
    // Question label
    const labels = {
      'q1': 'Technical Competence',
      'q2': 'Communication Skills',
      'q3': 'Would you rehire this person?',
      'q4': 'Additional Comments'
    };
    html += '<div class="question-label">' + (labels[key] || key) + '</div>';
    
    // Answer
    if (typeof value === 'number') {
      const stars = '★'.repeat(value) + '☆'.repeat(5 - value);
      html += '<div class="answer"><span class="rating-stars">' + stars + '</span> (' + value + '/5)</div>';
    } else if (typeof value === 'boolean') {
      html += '<div class="answer">' + (value ? '✓ Yes' : '✗ No') + '</div>';
    } else {
      html += '<div class="answer">' + (value || 'No response') + '</div>';
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  
  // Add signature if present
  for (const key in responses) {
    if (typeof responses[key] === 'object' && responses[key] && responses[key].typedName) {
      html += buildSignatureContent(responses[key]);
      break;
    }
  }
  
  return html;
}

function buildUploadContent(responses) {
  return '<div class="section">' +
    '<div class="section-title">Uploaded Reference</div>' +
    '<div class="upload-info">' +
    '<div class="info-label">Document Name</div>' +
    '<div class="info-value">' + (responses.fileName || 'reference_document.pdf') + '</div>' +
    '<div class="info-label" style="margin-top: 10px;">Document Link</div>' +
    '<div class="info-value" style="word-break: break-all;">' + (responses.uploadedFileUrl || '') + '</div>' +
    '</div></div>';
}

function buildDeclineContent(responses) {
  const reasons = {
    'policy': 'Company Policy',
    'unknown': 'Don\'t know candidate well enough',
    'conflict': 'Conflict of Interest',
    'other': 'Other'
  };
  
  return '<div class="section decline-box">' +
    '<div class="section-title">Reference Declined</div>' +
    '<div class="question-block">' +
    '<div class="question-label">Reason</div>' +
    '<div class="answer">' + (reasons[responses.declineReason] || responses.declineReason || 'Not specified') + '</div>' +
    '</div>' +
    (responses.declineDetails ? 
      '<div class="question-block">' +
      '<div class="question-label">Additional Details</div>' +
      '<div class="answer">' + responses.declineDetails + '</div>' +
      '</div>' : '') +
    '</div>';
}

function buildSignatureContent(signature) {
  return '<div class="signature-box">' +
    '<div class="section-title">✍️ Digital Signature</div>' +
    '<div class="signature-info">' +
    '<div><div class="info-label">Signed By</div><div class="info-value">' + signature.typedName + '</div></div>' +
    '<div><div class="info-label">Signed On</div><div class="info-value">' + new Date(signature.signedAt).toLocaleString('en-GB') + '</div></div>' +
    '</div>' +
    (signature.signatureDataUrl ? '<img src="' + signature.signatureDataUrl + '" class="signature-image" alt="Signature" />' : '') +
    '<div style="margin-top: 15px; padding: 10px; background-color: #eff6ff; border-radius: 4px; font-size: 11px; color: #1e40af;">✓ Digitally signed and timestamped</div>' +
    '</div>';
}

function getAuditTrail(requestId) {
  const ss = getDatabaseSpreadsheet();
  const auditSheet = ss.getSheetByName(SHEET_AUDIT);
  const data = auditSheet.getDataRange().getValues();
  
  const trail = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === requestId) {
      trail.push({
        auditId: data[i][0],
        timestamp: data[i][2],
        actor: data[i][3],
        action: data[i][4],
        metadata: data[i][5]
      });
    }
  }
  return trail;
}
