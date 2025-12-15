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

// --- Default Template Definition ---
const DEFAULT_TEMPLATE = {
  id: "standard-social-care",
  name: "Standard Social Care Reference",
  isDefault: true,
  ratingScale: ["Excellent", "Very Good", "Good", "Fair", "Poor"],
  sections: [
    {
      id: "employment",
      title: "Employment Details",
      fields: [
        { id: "dateStarted", label: "Date Started", type: "date", required: true },
        { id: "dateEnded", label: "Date Ended", type: "date", required: true },
        { id: "jobTitle", label: "Job Title", type: "text", required: true },
        { id: "reasonForLeaving", label: "Reason for Leaving", type: "textarea", required: true },
        { id: "safeguardingConcerns", label: "Were there any safeguarding concerns during employment?", type: "boolean", required: true },
        { id: "safeguardingDetails", label: "If yes, please provide details", type: "textarea", required: false },
        { id: "disciplinaryAction", label: "Was the candidate subject to any disciplinary action?", type: "boolean", required: true },
        { id: "disciplinaryDetails", label: "If yes, please provide details", type: "textarea", required: false }
      ]
    },
    {
      id: "ratings",
      title: "Ratings & Attributes",
      description: "Please rate the candidate on the following attributes:",
      fields: [
        { id: "suitableForRole", label: "Suitable for Role", type: "rating", required: true },
        { id: "punctuality", label: "Punctuality", type: "rating", required: true },
        { id: "attitude", label: "Attitude to Work", type: "rating", required: true },
        { id: "reliability", label: "Reliability", type: "rating", required: true },
        { id: "honesty", label: "Honesty & Integrity", type: "rating", required: true },
        { id: "initiative", label: "Initiative", type: "rating", required: true },
        { id: "communication", label: "Communication Skills", type: "rating", required: true },
        { id: "furtherInfo", label: "Any further information about the candidate's performance?", type: "textarea", required: false }
      ]
    },
    {
      id: "safeguarding",
      title: "Safeguarding & Professional Judgement",
      fields: [
        { id: "characterReservations", label: "Do you have any reservations about the candidate's character or conduct?", type: "boolean", required: true },
        { id: "reservationDetails", label: "If yes, please provide details", type: "textarea", required: false },
        { id: "shouldNotBeEmployed", label: "Is there any reason the candidate should NOT be employed to work with vulnerable persons?", type: "boolean", required: true },
        { id: "shouldNotBeEmployedDetails", label: "If yes, please explain", type: "textarea", required: false },
        { id: "knowsROA", label: "Does the candidate have knowledge of the Rehabilitation of Offenders Act?", type: "boolean", required: false }
      ]
    },
    {
      id: "consent",
      title: "Consent to Share",
      fields: [
        { id: "consentToShare", label: "Are you happy for this reference to be shared with third-party clients?", type: "boolean", required: true }
      ]
    },
    {
      id: "declaration",
      title: "Declaration",
      description: "Please confirm your details below:",
      fields: [
        { id: "refereeName", label: "Your Full Name", type: "text", required: true },
        { id: "refereePosition", label: "Your Position/Title", type: "text", required: true },
        { id: "refereeCompany", label: "Company/Organisation", type: "text", required: true },
        { id: "refereeTelephone", label: "Telephone Number", type: "text", required: true },
        { id: "refereeEmailConfirm", label: "Email Address", type: "email", required: true },
        { id: "signature", label: "Digital Signature", type: "signature", required: true }
      ]
    }
  ]
};

/**
 * Get the default template definition
 */
function getDefaultTemplate() {
  return DEFAULT_TEMPLATE;
}

/**
 * Get templates with auto-healing and debug info
 */
function getTemplates() {
  const ss = getDatabaseSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TEMPLATES);
  
  // Auto-heal if missing sheet
  if (!sheet) {
     console.log("Sheet missing, initializing...");
     initializeDatabase();
     SpreadsheetApp.flush(); // Force write
     sheet = ss.getSheetByName(SHEET_TEMPLATES);
  }

  // Auto-heal if empty (just header)
  if (sheet.getLastRow() <= 1) {
     console.log("Sheet empty, initializing...");
     initializeDatabase();
     SpreadsheetApp.flush(); // Force write
  }
  
  const data = sheet.getDataRange().getValues();
  const templates = [];
  let parseErrors = 0;
  
  for (let i = 1; i < data.length; i++) {
    try {
      const jsonStr = data[i][2];
      if (!jsonStr || jsonStr === '') {
          parseErrors++;
          continue;
      }
      
      let structure = [];
      try {
        structure = JSON.parse(jsonStr);
      } catch (jsonErr) {
        console.error("JSON Parse Error Row " + (i+1) + ": " + jsonErr);
        // Fallback: If it's the default template, recover it? 
        // For now just count error
        parseErrors++;
        continue;
      }

      templates.push({
        templateId: data[i][0],
        name: data[i][1],
        structureJSON: structure,
        active: true
      });
    } catch (e) {
      console.error("General Row Error " + (i+1) + ": " + e);
      parseErrors++;
    }
  }
  
  return { 
      success: true, 
      data: templates, 
      meta: { 
          totalRows: data.length, 
          parseErrors: parseErrors,
          sheetName: sheet.getName()
      } 
  };
}


/**
 * Serves the React application via HtmlService OR handles JSON API requests
 */
function doGet(e) {
  // If it's an API request (indicated by parameter), handle it
  if (e.parameter.responseFormat === 'json' || e.parameter.callback) {
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
 * Security Helpers
 */
function isAdminRequest(e) {
  let key = e.parameter.adminKey;
  if (!key && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      key = body.adminKey;
    } catch (err) {}
  }
  // Also check jsonPayload for JSONP
  if (!key && e.parameter.jsonPayload) {
    try {
      const body = JSON.parse(e.parameter.jsonPayload);
      key = body.adminKey;
    } catch (err) {}
  }
  
  const storedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_API_KEY');
  return key && key === storedKey;
}

function getStaffFromRequest(e) {
  let userEmail = e.parameter.userEmail;
  if (!userEmail && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      userEmail = body.userEmail;
    } catch (err) {}
  }
  // Also check jsonPayload for JSONP
  if (!userEmail && e.parameter.jsonPayload) {
    try {
      const body = JSON.parse(e.parameter.jsonPayload);
      userEmail = body.userEmail;
    } catch (err) {}
  }
  
  if (!userEmail) return null;
  return getStaffByEmail(userEmail);
}

function requireRole(staff, requiredRoles) {
  if (!staff || !staff.active) {
    throw new Error('Unauthorized: Invalid or inactive staff member');
  }
  if (!requiredRoles.includes(staff.role)) {
    throw new Error(`Unauthorized: Requires role ${requiredRoles.join(' or ')}`);
  }
}

/**
 * Main API Dispatcher
 */
function handleApiRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    // Parse parameters
    let action = e.parameter.action;
    let payload = {};
    
    if (e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        if (body.action) action = body.action;
        payload = body;
      } catch (err) {
        payload = e.parameter;
      }
    } else {
      if (e.parameter.jsonPayload) {
        try {
          payload = JSON.parse(e.parameter.jsonPayload);
          if (payload.action) action = payload.action;
        } catch (err) {
          console.error("Failed to parse jsonPayload: " + err);
          payload = e.parameter;
        }
      } else {
        payload = e.parameter;
      }
    }

    // --- Endpoint Classification & Security ---
    const publicEndpoints = [
      'healthCheck', 'processCandidateConsent', 'validateRefereeToken', 
      'submitReference', 'uploadReferenceDocument', 'getTemplates', 
      'healthCheck', 'processCandidateConsent', 'validateRefereeToken', 
      'submitReference', 'uploadReferenceDocument', 'getTemplates', 
      'healthCheck', 'processCandidateConsent', 'validateRefereeToken', 
      'submitReference', 'uploadReferenceDocument', 'getTemplates', 
      'authorizeConsent', 'getDefaultTemplate', 'inspectTemplates',
      'verifyStaff'
    ];
    
    const adminOnlyEndpoints = [
      'archiveRequests', 'unarchiveRequests', 'deleteRequests', 
      'runSmartChase', 'runAnalysis', 'listStaff', 'addStaff', 
      'updateStaff', 'deactivateStaff', 
      'initializeDatabase', 'resetTemplates', 'fixTemplateStructure', 'seedEmploymentTemplate', 'sealRequest', 'diagnoseConfig', 'fixPermissions',
      'runCompleteE2ETest', 'runQA', 'saveTemplate', 'deleteTemplate'
    ];
    
    const staffEndpoints = [
      'initiateRequest', 'getMyRequests', 'getRequest', 'getAuditTrail'
    ];

    const isPublic = publicEndpoints.includes(action);
    const requiresAdmin = adminOnlyEndpoints.includes(action);
    const requiresStaff = staffEndpoints.includes(action) || requiresAdmin;

    let staff = null;

    if (requiresStaff) {
      if (!isAdminRequest(e)) {
        throw new Error('Unauthorized: Missing or invalid admin key');
      }

      staff = getStaffFromRequest(e);
      if (!staff) {
        throw new Error('Unauthorized: Invalid or inactive staff member');
      }

      if (requiresAdmin) {
        requireRole(staff, ['Admin']);
      }
    }

    let result = {};

    switch (action) {
      // Public
      case 'healthCheck':
        result = { success: true, service: 'Semester Reference Console', env: 'production', timestamp: new Date().toISOString() };
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
      case 'uploadReferenceDocument':
        result = uploadReferenceDocument(payload);
        break;
      case 'getTemplates':
        result = getTemplates();
        break;
      case 'getDefaultTemplate':
        result = { success: true, template: getDefaultTemplate() };
        break;
      case 'inspectTemplates':
        result = inspectTemplates();
        break;
 
      case 'verifyStaff':
        // Require Admin Key even though it's in "public" list (to prevent scraping)
        if (!isAdminRequest(e)) {
           throw new Error('Unauthorized: Missing valid admin key');
        }
        result = verifyStaffAccess(payload.userEmail);
        break;



      case 'runCompleteE2ETest':
        result = runCompleteE2ETest();
        break;
      case 'runQA':
        result = runQA();
        break;

      // Staff (Recruiter + Admin)
      case 'initiateRequest':
        result = initiateRequest(payload, staff);
        break;
      case 'getMyRequests':
        result = getMyRequests(payload.includeArchived || false);
        break;
      case 'getRequest':
        result = getRequest(payload.requestId);
        break;
      case 'getAuditTrail':
        result = { success: true, data: getAuditTrail(payload.requestId) };
        break;

      // Admin Only
      case 'initializeDatabase':
        result = initializeDatabase();
        break;
      case 'resetTemplates':
        result = resetTemplates();
        break;
      case 'fixTemplateStructure':
        result = fixTemplateStructure();
        break;
      case 'saveTemplate':
        result = saveTemplate(payload.templateName, payload.structureJSON, payload.templateId, staff);
        break;
      case 'deleteTemplate':
        result = deleteTemplate(payload.templateId, staff);
        break;
      case 'seedEmploymentTemplate':
        result = seedEmploymentTemplate();
        break;
      case 'archiveRequests':
        result = archiveRequests(payload.requestIds, staff);
        break;
      case 'unarchiveRequests':
        result = unarchiveRequests(payload.requestIds, staff);
        break;
      case 'deleteRequests':
        result = deleteRequests(payload.requestIds, staff);
        break;
      case 'runSmartChase':
        result = runSmartChase(staff);
        break;
      case 'runAnalysis':
        result = analyzeReference(payload.requestId, staff);
        break;
      case 'sealRequest':
        result = sealRequest(payload.requestId, staff);
        break;
      
      // Staff Management (Admin Only)
      case 'listStaff':
        result = listStaff();
        break;
      case 'addStaff':
        result = addStaff(payload.name, payload.email, payload.role);
        break;
      case 'updateStaff':
        result = updateStaff(payload.staffId, payload);
        break;
      case 'deactivateStaff':
        result = deactivateStaff(payload.staffId);
        break;
      case 'fixPermissions':
        const id = ScriptApp.getScriptId();
        const file = DriveApp.getFileById(id);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        result = { success: true, message: "Permissions updated to ANYONE_WITH_LINK" };
        break;
      case 'diagnoseConfig':
        const props = PropertiesService.getScriptProperties().getProperties();
        result = {
          success: true,
          config: {
            ADMIN_API_KEY: props.ADMIN_API_KEY ? 'SET' : 'MISSING',
            PORTAL_BASE_URL: props.PORTAL_BASE_URL,
            GeminiAPIKey: props.GeminiAPIKey ? 'SET' : 'MISSING'
          },
          identity: {
            effectiveUser: Session.getEffectiveUser().getEmail(),
            activeUser: Session.getActiveUser().getEmail()
          }
        };
        break;

      default:
        return createErrorResponse('Invalid action: ' + action);
    }

    // JSONP Support
    const callback = e.parameter.callback;
    if (callback) {
      const json = JSON.stringify(result);
      const script = `${callback}(${json})`;
      return ContentService.createTextOutput(script).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    const errorResult = { success: false, error: err.toString() };
    const callback = e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(`${callback}(${JSON.stringify(errorResult)})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(errorResult)).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }

}

/**
 * Helper to create standardized error responses
 */
function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function testConsentLogic(token) {
  const ss = getDatabaseSpreadsheet();
  const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
  const data = requestsSheet.getDataRange().getValues();
  const headers = data[0];
  
  const colConsentToken = headers.indexOf("ConsentToken");
  const colStatus = headers.indexOf("Status");
  const colConsentStatus = headers.indexOf("ConsentStatus");
  
  let log = [];
  log.push("Headers found: " + JSON.stringify(headers));
  log.push("Indices: Token=" + colConsentToken + ", Status=" + colStatus + ", ConsentStatus=" + colConsentStatus);
  log.push("Searching for token: " + token);
  
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colConsentToken]) === String(token)) {
      found = true;
      log.push("Found at row " + (i+1));
      log.push("Row data: " + JSON.stringify(data[i]));
      log.push("Status: " + data[i][colStatus]);
      log.push("ConsentStatus: " + data[i][colConsentStatus]);
      break;
    }
  }
  
  if (!found) {
    log.push("Token NOT found in " + data.length + " rows");
    // Log first 5 tokens to see format
    for(let i=1; i<Math.min(data.length, 6); i++) {
       log.push("Row " + (i+1) + " token: " + data[i][colConsentToken]);
    }
  }
  
  return { success: true, log: log };
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
      const colIndex = requestsSheet.getLastColumn() + 1;
      requestsSheet.getRange(1, colIndex).setValue('Archived');
    }
    // Add Staff tracking columns if missing
    const updatedHeaders = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    if (!updatedHeaders.includes('CreatedByStaffId')) {
      const colIndex = requestsSheet.getLastColumn() + 1;
      requestsSheet.getRange(1, colIndex).setValue('CreatedByStaffId');
      requestsSheet.getRange(1, colIndex + 1).setValue('LastUpdatedByStaffId');
    }
  }
  
  // 2. Audit_Trail
  let auditSheet = ss.getSheetByName(SHEET_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(SHEET_AUDIT);
    auditSheet.appendRow(['AuditID', 'RequestID', 'Timestamp', 'ActorType', 'ActorId', 'ActorName', 'Action', 'Metadata']);
    auditSheet.setFrozenRows(1);
  } else {
    // Check for new columns
    const headers = auditSheet.getRange(1, 1, 1, auditSheet.getLastColumn()).getValues()[0];
    if (!headers.includes('ActorType')) {
      // This is a breaking schema change for Audit_Trail, but since it's just logs, we can append columns
      // Ideally we'd migrate, but for now we'll just add them at the end if missing
      // Or better, we can just update the header row if it's empty or compatible
      // For simplicity in this audit, let's just add them if missing
      const colIndex = auditSheet.getLastColumn() + 1;
      auditSheet.getRange(1, colIndex).setValue('ActorType');
      auditSheet.getRange(1, colIndex + 1).setValue('ActorId');
      auditSheet.getRange(1, colIndex + 2).setValue('ActorName');
    }
  }

  // 3. Staff Sheet
  initializeStaffSheet();

  // 4. Template_Definitions
  let templatesSheet = ss.getSheetByName(SHEET_TEMPLATES);
  if (!templatesSheet) {
    templatesSheet = ss.insertSheet(SHEET_TEMPLATES);
    templatesSheet.appendRow(['TemplateID', 'Name', 'StructureJSON', 'CreatedBy', 'Timestamp']);
    templatesSheet.setFrozenRows(1);
  }
  
  // Ensure the rich DEFAULT_TEMPLATE exists
  const defaultTmpl = getDefaultTemplate();
  
  // Flatten Sections to Fields for Frontend Compatibility
  // The Frontend Builder expects a flat array of TemplateField[], not nested sections.
  let flatFields = [];
  if (defaultTmpl.sections) {
    defaultTmpl.sections.forEach(section => {
      // Add section header as a "label" or just append fields?
      // For now, just append fields to ensure they appear in the builder.
      if (section.fields) {
        flatFields = flatFields.concat(section.fields);
      }
    });
  }
  const flatJson = JSON.stringify(flatFields);

  const tData = templatesSheet.getDataRange().getValues();
  let found = false;
  
  for (let i = 1; i < tData.length; i++) {
    // Check for ID match
    if (tData[i][0] === defaultTmpl.id) {
       // FORCE UPDATE to fix corruption/mismatch
       // We overwrite the StructureJSON with the flat version
       templatesSheet.getRange(i + 1, 3).setValue(flatJson); 
       templatesSheet.getRange(i + 1, 2).setValue(defaultTmpl.name); // Ensure name is correct too
       found = true;
       break;
    }
  }
  
  if (!found) {
    templatesSheet.appendRow([
      defaultTmpl.id, 
      defaultTmpl.name, 
      flatJson,
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
 * Hard Reset for Templates (User requested fix for corrupt data)
 */
function resetTemplates() {
  const ss = getDatabaseSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TEMPLATES);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(SHEET_TEMPLATES);
  }
  sheet.appendRow(['TemplateID', 'Name', 'StructureJSON', 'CreatedBy', 'Timestamp']);
  sheet.setFrozenRows(1);
  SpreadsheetApp.flush();
  
  // Re-seed with default
  return initializeDatabase();
}

/**
 * Get or create the master spreadsheet
 * Safely ignores Trashed files to prevent corruption
 */
function getDatabaseSpreadsheet() {
  const files = DriveApp.getFilesByName(DB_SPREADSHEET_NAME);
  while (files.hasNext()) {
    const file = files.next();
    if (!file.isTrashed()) {
      return SpreadsheetApp.open(file);
    }
  }
  return SpreadsheetApp.create(DB_SPREADSHEET_NAME);
}

/**
 * Log an audit event (Mandatory for compliance)
 */
/**
 * Log an event to the audit trail
 */
function logAudit(requestId, actorType, actorId, actorName, action, metadata = {}) {
  const ss = getDatabaseSpreadsheet();
  const auditSheet = ss.getSheetByName(SHEET_AUDIT);
  
  auditSheet.appendRow([
    Utilities.getUuid(),
    requestId,
    new Date(),
    actorType,
    actorId || '',
    actorName || '',
    action,
    JSON.stringify(metadata)
  ]);
}

// --- Core Workflow: Initiation ---

/**
 * Initiate a new reference request
 */
function initiateRequest(requestData, staff) {
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
    
    const requesterEmail = staff ? staff.email : (Session.getActiveUser().getEmail() || 'system');
    const staffId = staff ? staff.staffId : '';
    const staffName = staff ? staff.name : 'System';
    
    // 3. Create Record
    // Schema: RequestID, CandidateName, CandidateEmail, RefereeName, RefereeEmail, RequesterEmail, Status, ConsentStatus, ConsentTimestamp, ConsentToken, ConsentTokenExpiry, RefereeToken, RefereeTokenExpiry, TemplateID, CreatedAt, UpdatedAt, Method, DeclineReason, DeclineDetails, PdfFileId, PdfUrl, UploadedFileUrl, FileName, LastChaseDate, Archived, CreatedByStaffId, LastUpdatedByStaffId
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
      '', '', '', '', '', '', '', '', // Method...LastChaseDate (8 fields)
      '', // Archived
      staffId, // CreatedByStaffId
      staffId  // LastUpdatedByStaffId
    ];
    
    requestsSheet.appendRow(rowData);
    
    // 4. Log Audit
    logAudit(requestId, 'Staff', staffId, staffName, 'REQUEST_INITIATED', { 
      candidate: requestData.candidateEmail,
      referee: requestData.refereeEmail 
    });
    
    // 5. Send Authorization Email
    sendAuthorizationEmail(requestData.candidateEmail, requestData.candidateName, consentToken, requestData.refereeName);
    
    return { success: true, requestId: requestId };
    
  } catch (e) {
    console.error("initiateRequest Error: " + e.toString());
    sendErrorAlert('initiateRequest', e); // Use the new central alert (which now exists)
    return { success: false, error: e.toString() };
  }
}


/**
 * Send authorization email to candidate
 */
function sendAuthorizationEmail(email, name, token, refereeName) {
  const portalBaseUrl = PropertiesService.getScriptProperties().getProperty('PORTAL_BASE_URL') || 'https://semester-reference-console-nmd4bhpey-robs-projects-ae895b9a.vercel.app/';
  const baseUrl = portalBaseUrl.endsWith('/') ? portalBaseUrl.slice(0, -1) : portalBaseUrl;
  const authUrl = `${baseUrl}/?view=portal&action=authorize&token=${token}`;
  
  const subject = `Please approve your reference for ${refereeName}`;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
       <h2 style="color: #111827; font-weight: 600; margin: 0;">Authorization Required</h2>
    </div>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">Dear ${name},</p>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
      We are ready to request a reference from <strong>${refereeName}</strong> to support your application.
    </p>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
      To comply with GDPR and keep you in control of your data, please confirm that you are happy for us to contact them.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${authUrl}" style="background-color: #0052CC; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Approve Reference Request</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; margin-top: 32px; line-height: 1.5;">
      This will immediately send an invitation to your referee.<br/>
      If you did not expect this request, you can ignore this email or decline via the link.
    </p>
  `;
  
  sendBrandedEmail(email, subject, content);
}

// --- Core Workflow: Authorization ---

/**
 * Process candidate's consent decision
 */
function processCandidateConsent(token, decision) {
  try {
    console.log("Processing Consent. Token:", token, "Decision:", decision);
    
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = requestsSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Dynamic Column Lookup
    const colConsentToken = headers.indexOf("ConsentToken");
    const colStatus = headers.indexOf("Status");
    const colConsentStatus = headers.indexOf("ConsentStatus");
    const colConsentTimestamp = headers.indexOf("ConsentTimestamp");
    const colRefereeToken = headers.indexOf("RefereeToken");
    const colRefereeTokenExpiry = headers.indexOf("RefereeTokenExpiry");
    const colRequestId = headers.indexOf("RequestID");
    const colCandidateName = headers.indexOf("CandidateName");
    const colRefereeName = headers.indexOf("RefereeName");
    const colRefereeEmail = headers.indexOf("RefereeEmail");
    const colCandidateEmail = headers.indexOf("CandidateEmail");
    const colConsentTokenExpiry = headers.indexOf("ConsentTokenExpiry");
    
    if (colConsentToken === -1 || colStatus === -1) {
      console.error("Critical: Missing columns in Requests_Log");
      return { success: false, error: "Database configuration error" };
    }
    
    // Find request by token
    let rowIndex = -1;
    let request = null;
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colConsentToken]) === String(token)) {
        rowIndex = i;
        request = data[i];
        break;
      }
    }
    
    if (rowIndex === -1) {
      console.warn("Token not found:", token);
      return { success: false, error: "Invalid token" };
    }
    
    console.log("Found Request:", request[colRequestId], "Current ConsentStatus:", request[colConsentStatus]);
    
    // Check Expiry
    if (colConsentTokenExpiry !== -1 && request[colConsentTokenExpiry]) {
      const expiry = new Date(request[colConsentTokenExpiry]);
      if (new Date() > expiry) {
        console.warn("Token expired for request:", request[colRequestId]);
        requestsSheet.getRange(rowIndex + 1, colStatus + 1).setValue('EXPIRED'); 
        return { success: false, error: "Token expired" };
      }
    }
    
    // Check if already processed
    // Allow retry if status is PENDING or if it's just a re-click (idempotency could be better, but for now strict check)
    // Actually, if it's already GRANTED, just return success to be idempotent
    const currentStatus = request[colConsentStatus];
    if (currentStatus === 'GRANTED' && decision === 'CONSENT_GIVEN') {
       console.log("Consent already granted, returning success idempotently");
       return { success: true };
    }
    
    if (currentStatus !== 'PENDING' && currentStatus !== '') {
       console.warn("Request already processed. Status:", currentStatus);
       return { success: false, error: "Request already processed" };
    }
    
    const requestId = request[colRequestId];
    const now = new Date();
    
    // Update Record
    if (decision === 'CONSENT_GIVEN') {
      requestsSheet.getRange(rowIndex + 1, colStatus + 1).setValue('CONSENT_GIVEN');
      requestsSheet.getRange(rowIndex + 1, colConsentStatus + 1).setValue('GRANTED');
      requestsSheet.getRange(rowIndex + 1, colConsentTimestamp + 1).setValue(now);
      
      // Generate Referee Token
      const refereeToken = Utilities.getUuid();
      const refExpiry = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
      
      requestsSheet.getRange(rowIndex + 1, colRefereeToken + 1).setValue(refereeToken);
      requestsSheet.getRange(rowIndex + 1, colRefereeTokenExpiry + 1).setValue(refExpiry);
      
      // Send Invite to Referee
      sendRefereeInviteEmail(request[colRefereeEmail], request[colRefereeName], request[colCandidateName], refereeToken);
      
    } else {
      requestsSheet.getRange(rowIndex + 1, colStatus + 1).setValue('CONSENT_DECLINED');
      requestsSheet.getRange(rowIndex + 1, colConsentStatus + 1).setValue('DECLINED');
      requestsSheet.getRange(rowIndex + 1, colConsentTimestamp + 1).setValue(now);
    }
    
    logAudit(requestId, 'Candidate', '', 'Candidate', decision, { token: '***' });
    
    return { success: true };
    
  } catch (e) {
    console.error("processCandidateConsent Error: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function sendRefereeInviteEmail(email, name, candidateName, token) {
  const portalBaseUrl = PropertiesService.getScriptProperties().getProperty('PORTAL_BASE_URL') || 'https://semester-reference-console-nmd4bhpey-robs-projects-ae895b9a.vercel.app/';
  const baseUrl = portalBaseUrl.endsWith('/') ? portalBaseUrl.slice(0, -1) : portalBaseUrl;
  const inviteUrl = `${baseUrl}/?view=portal&token=${token}`;
  
  const subject = `Reference request for ${candidateName} (takes ~2 minutes)`;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
       <h2 style="color: #111827; font-weight: 600; margin: 0;">Reference Request</h2>
    </div>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">Dear ${name},</p>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
      <strong>${candidateName}</strong> has nominated you as a referee and we would really value your feedback.
    </p>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">
      We know you’re busy, so we’ve made this as quick as possible:
    </p>
    <ul style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
      <li><strong>Online form:</strong> mobile-friendly, usually takes about 2 minutes.</li>
      <li><strong>Upload:</strong> or simply upload an existing reference letter.</li>
      <li><strong>Decline:</strong> if you cannot provide a reference, please let us know via the link.</li>
    </ul>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${inviteUrl}" style="background-color: #0052CC; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Provide Reference</a>
    </div>
  `;
  
  sendBrandedEmail(email, subject, content);
}

// --- Core Workflow: Referee Portal ---

/**
 * Validate referee token and return form data
 */
function validateRefereeToken(token) {
  console.log(`[validateRefereeToken] Looking for token: "${token}"`);
  
  const ss = getDatabaseSpreadsheet();
  const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
  const data = requestsSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Dynamic Column Lookup
  const colRefereeToken = headers.indexOf("RefereeToken");
  const colRefereeTokenExpiry = headers.indexOf("RefereeTokenExpiry");
  const colStatus = headers.indexOf("Status");
  const colTemplateId = headers.indexOf("TemplateID");
  const colCandidateName = headers.indexOf("CandidateName");
  
  if (colRefereeToken === -1) {
    console.error("Critical: RefereeToken column missing");
    return { valid: false, error: "Database configuration error" };
  }
  
  let request = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colRefereeToken]) === String(token)) {
      console.log(`[validateRefereeToken] MATCH FOUND at row ${i}`);
      request = data[i];
      break;
    }
  }
  
  if (!request) {
    console.log(`[validateRefereeToken] No match found for token: ${token}`);
    return { valid: false, error: "Invalid token" };
  }
  
  // Check Expiry
  if (colRefereeTokenExpiry !== -1 && request[colRefereeTokenExpiry]) {
    const expiry = new Date(request[colRefereeTokenExpiry]);
    if (new Date() > expiry) {
      console.log(`[validateRefereeToken] Token expired`);
      return { valid: false, error: "Token expired" };
    }
  }
  
  // Check if already completed
  const status = request[colStatus];
  if (['Completed', 'Declined', 'SEALED'].includes(status)) {
     console.log(`[validateRefereeToken] Reference already submitted, status: ${status}`);
     return { valid: false, error: "Reference already submitted" };
  }
  
  // Get Template
  const templatesResponse = getTemplates();
  const templates = templatesResponse.data || [];
  const templateId = request[colTemplateId];
  const template = templates.find(t => t.templateId === templateId) || templates[0];
  
  return {
    valid: true,
    candidateName: request[colCandidateName],
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
      logAudit(requestId, 'Referee', '', 'Referee', 'REFERENCE_DECLINED', { reason: declineReason });
      
      // Notify Staff
      sendReferenceDeclinedNotification(requestId, declineReason);

    } else if (method === 'upload') {
      requestsSheet.getRange(rowIndex + 1, 7).setValue('Completed');
      requestsSheet.getRange(rowIndex + 1, 17).setValue('upload'); // Method
      requestsSheet.getRange(rowIndex + 1, 22).setValue(uploadedFileUrl);
      requestsSheet.getRange(rowIndex + 1, 23).setValue(fileName);
      logAudit(requestId, 'Referee', '', 'Referee', 'DOCUMENT_UPLOADED', { fileName: fileName });
      
      // Notify Staff
      sendReferenceCompletedNotification(requestId, 'upload');

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
      
      logAudit(requestId, 'Referee', '', 'Referee', 'REFERENCE_SUBMITTED', {});
      
      // Notify Staff
      sendReferenceCompletedNotification(requestId, 'form');
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
    logAudit(requestId, 'Referee', '', 'Referee', 'DOCUMENT_UPLOADED', { 
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

// --- Template Seeding (REMOVED) ---
// Seeder run complete. Code removed for security.

// Helper to check for Template Admin
function isTemplateAdmin(email) {
  const allowed = ['rob@semester.co.uk', 'nicola@semester.co.uk'];
  return allowed.includes(email);
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

function getTemplateById(templateId) {
  if (!templateId) return null;
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TEMPLATES);
  const data = sheet.getDataRange().getValues();
  
  // Search for template
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === templateId) {
       try {
         return {
           templateId: data[i][0],
           name: data[i][1],
           structureJSON: JSON.parse(data[i][2]),
           active: true
         };
       } catch (e) {
         console.error('Error parsing template JSON', e);
         return null;
       }
    }
  }
  return null;
}

function saveTemplate(name, structure, templateId, staff) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!isTemplateAdmin(userEmail)) {
      throw new Error('Unauthorized: Only specialized admins can edit templates.');
    }
    
    const db = getDatabaseSpreadsheet();
    const sheet = db.getSheetByName("Template_Definitions");
    const data = sheet.getDataRange().getValues();
    const user = Session.getActiveUser().getEmail();
    const timestamp = new Date();
    
    // Check if updating existing
    if (templateId) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === templateId) {
          // Update existing row
          const rowIndex = i + 1;
          sheet.getRange(rowIndex, 2).setValue(name);
          sheet.getRange(rowIndex, 3).setValue(JSON.stringify(structure));
          sheet.getRange(rowIndex, 4).setValue(user);
          sheet.getRange(rowIndex, 5).setValue(timestamp);
          return { success: true, templateId: templateId };
        }
      }
    }
    
    // If not found or no ID, create new
    const newId = templateId || Utilities.getUuid();
    sheet.appendRow([newId, name, JSON.stringify(structure), user, timestamp]);
    return { success: true, templateId: newId };
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// --- AI & Analysis ---

function analyzeReference(requestId, staff) {
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
  
  // Log manual trigger
  if (staff) {
    logAudit(requestId, 'Staff', staff.staffId, staff.name, 'AI_ANALYSIS_TRIGGERED', {});
  }
  
  // Call AI module
  if (typeof analyzeSentimentAndAnomalies === 'function') {
    const analysis = analyzeSentimentAndAnomalies(requestId, request.responses);
    return { success: true, analysis: analysis };
  } else {
  }
}

/**
 * Delete a template
 */
function deleteTemplate(templateId) {
  try {
    if (!templateId) return { success: false, error: "Missing template ID" };
    
    // Prevent deleting default
    if (templateId === DEFAULT_TEMPLATE.id) {
       return { success: false, error: "Cannot delete the default system template" };
    }

    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TEMPLATES);
    const data = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === templateId) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: "Template not found" };
    }
    
    sheet.deleteRow(rowIndex);
    
    return { success: true };
    
  } catch (e) {
    console.error("deleteTemplate Error:", e);
    return { success: false, error: e.toString() };
  }
}

// --- PDF & Sealing ---

/**
 * Generate PDF and seal the reference request
 */
/**
 * Generate PDF and seal the reference request
 */
function sealRequest(requestId, staff) {
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
    
    const staffId = staff ? staff.staffId : '';
    const staffName = staff ? staff.name : (Session.getActiveUser().getEmail() || 'System');
    
    logAudit(requestId, 'Staff', staffId, staffName, 'REFERENCE_SEALED', { 
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
      // Fetch the specific template used for this request
      // TemplateID is likely in column 15 (Index 14) of Requests_Log, but getRequest might not expose it easily 
      // if it's not mapped. Let's just grab the template or default.
      
      let templateToUse = DEFAULT_TEMPLATE;
      if (request.templateId) {
         const tmpl = getTemplateById(request.templateId);
         if (tmpl && tmpl.structureJSON) {
            // Remap structureJSON (array of fields) to expected object format if needed
            // DEFAULT_TEMPLATE is { sections: [...] }
            // Dynamic form structure is Array<Field>.
            // We need to confirm what buildFormContent expects.
            // buildFormContent below expects `template.sections`.
            // The saved templates are `Array<Field>`. We need to adapt.
            templateToUse = { 
               sections: [{
                 id: "main",
                 title: "Reference Questions",
                 fields: tmpl.structureJSON
               }]
            };
         }
      } else {
        // Fallback or "Default" template - check if DEFAULT_TEMPLATE is compatible
        // DEFAULT_TEMPLATE in Code.gs is currently the JSON object structure.
      }
      
      content = buildFormContent(responses, templateToUse);
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
    sendErrorAlert('generatePDF', e);
    return { success: false, error: 'PDF generation failed: ' + e.toString() };
  }
}

// --- Email & Alert Helpers ---

function sendBrandedEmail(recipient, subject, content) {
  // SVG Logo (Basic shapes for email client compatibility - using images is better but SVG text works in some)
  // For maximum compatibility in emails, we should use a public image URL if possible. 
  // Since we don't have one, we will use a simple text header with brand colors and a 'Semester' label.
  // Advanced: we could inline a base64 png, but Gmail blocks it often.
  // Best approach: Clean minimal header.
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #ffffff; padding: 24px 32px; border-bottom: 3px solid #0052CC; display: flex; align-items: center; gap: 10px; }
        .logo-circle { width: 16px; height: 16px; background-color: #0052CC; border-radius: 50%; display: inline-block; }
        .brand-name { font-size: 20px; font-weight: bold; color: #111827; display: inline-block; vertical-align: middle; margin-left: 8px; }
        .content { padding: 40px 32px; color: #374151; font-size: 16px; line-height: 1.6; }
        .footer { background-color: #f9fafb; padding: 32px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer-text { font-size: 12px; color: #6b7280; line-height: 1.5; }
        a.button { display: inline-block; background-color: #0052CC; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
        a.button:hover { background-color: #5E17EB; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="logo-circle"></span>
          <span class="brand-name">Semester</span>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p class="footer-text">
            <strong>Semester Reference Console</strong><br/>
            Secure, efficient reference management.<br/><br/>
            &copy; ${new Date().getFullYear()} Semester Ltd.<br/>
            <a href="https://semester.co.uk" style="color: #0052CC; text-decoration: none;">semester.co.uk</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  GmailApp.sendEmail(recipient, subject, '', { htmlBody: htmlBody });
}

function sendErrorAlert(context, error) {

  try {
    const recipients = 'rob@semester.co.uk'; // Configurable
    const subject = 'Semester Reference Console – Error Alert';
    const htmlBody = `
      <div style="font-family: monospace; padding: 20px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px;">
        <h2 style="color: #991b1b; margin-top: 0;">System Error Detected</h2>
        <p><strong>Context:</strong> ${context}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <div style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e5e7eb; margin-top: 15px;">
           <strong>Error Details:</strong><br/>
           <pre style="white-space: pre-wrap;">${error.toString()}</pre>
           ${error.stack ? '<br/><strong>Stack:</strong><br/><pre style="white-space: pre-wrap;">' + error.stack + '</pre>' : ''}
        </div>
      </div>
    `;
    
    GmailApp.sendEmail(recipients, subject, '', { htmlBody: htmlBody });
    console.log("Error alert sent to " + recipients);
    
  } catch (alertError) {
    console.error("Failed to send error alert: " + alertError.toString());
  }
}

function sendReferenceCompletedNotification(requestId, method) {
  try {
     const request = getRequest(requestId).data;
     if (!request) return;
     
     // Find staff member
     let staffEmail = 'rob@semester.co.uk'; // Fallback
     let staffName = 'Staff Member';
     
     // Try to get creator via StaffId in DB (needs lookup)
     // Or use RequesterEmail column which might be stored if we added it (Column 5 "RequesterEmail" in initiatedRequest)
     // Note: In initiateRequest we store RequesterEmail at index 5.
     // Let's assume request object from getRequest has it.
     // getRequest returns formatted object, but we might need to check how it maps.
     // Looking at getMyRequests map: It doesn't seemingly expose requesterEmail.
     
     // Let's re-fetch the raw row or just use what we have.
     // getRequest uses getMyRequests which maps specific columns.
     // Let's fetch the raw data lightly or just rely on the stored ID.
     
     const ss = getDatabaseSpreadsheet();
     const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
     const data = requestsSheet.getDataRange().getValues();
     let row = data.find(r => r[0] === requestId);
     
     if (row) {
        const creatorId = row[25]; // CreatedByStaffId
        const requesterEmail = row[5]; // RequesterEmail
        
        if (creatorId && typeof getStaffById === 'function') {
           const staff = getStaffById(creatorId);
           if (staff) {
             staffEmail = staff.email;
             staffName = staff.name.split(' ')[0];
           }
        } else if (requesterEmail) {
           staffEmail = requesterEmail;
        }
     }
     
     const subject = `Reference received for ${request.candidateName} from ${request.refereeName}`;
     const methodText = method === 'upload' ? 'uploaded a document' : 'completed the online form';
     
     const content = `
       <p>Hi ${staffName},</p>
       <p>Good news – <strong>${request.refereeName}</strong> has ${methodText} for <strong>${request.candidateName}</strong>.</p>
       
       <div style="margin: 25px 0;">
         <a href="https://references.semester.co.uk" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Reference</a>
       </div>
       
       <p style="font-size: 13px; color: #6b7280;">Login required to view full details.</p>
     `;
     
     sendBrandedEmail(staffEmail, subject, content);

     
  } catch (e) {
    console.error("Failed to send completion notification: " + e);
    sendErrorAlert("sendReferenceCompletedNotification", e);
  }
}

function sendReferenceDeclinedNotification(requestId, reason) {
  try {
     const request = getRequest(requestId).data;
     if (!request) return;
     
     // Staff lookup (same logic)
     let staffEmail = 'rob@semester.co.uk'; 
     let staffName = 'Staff Member';
     
     const ss = getDatabaseSpreadsheet();
     const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
     const data = requestsSheet.getDataRange().getValues();
     let row = data.find(r => r[0] === requestId);
     
     if (row) {
        const creatorId = row[25];
        const requesterEmail = row[5];
        if (creatorId && typeof getStaffById === 'function') {
           const staff = getStaffById(creatorId);
           if (staff && staff.email) {
             staffEmail = staff.email;
             staffName = staff.name.split(' ')[0];
           }
        } else if (requesterEmail) {
           staffEmail = requesterEmail;
        }
     }
     
     const subject = `Reference declined: ${request.refereeName} for ${request.candidateName}`;
     const content = `
       <p>Hi ${staffName},</p>
       <p><strong>${request.refereeName}</strong> has declined to provide a reference for <strong>${request.candidateName}</strong>.</p>
       
       <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0;">
         <strong>Reason:</strong> ${reason || 'No reason provided'}
       </div>
       
       <p>You may want to contact the candidate to request an alternative referee.</p>
       
       <div style="margin: 25px 0;">
         <a href="https://references.semester.co.uk" style="background-color: #4b5563; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Request</a>
       </div>
     `;
     
     sendBrandedEmail(staffEmail, subject, content);

     
  } catch (e) {
    console.error("Failed to send decline notification: " + e);
   sendErrorAlert("sendReferenceDeclinedNotification", e);
  }
}


/**
 * Delete a template
 */
function deleteTemplate(templateId, staff) {
  try {
    // 1. Strict RBAC Check
    // If called from API 'staff' might be passed, if from refined Context it might be different.
    // For GAS web apps running as 'User accessing the web app', Session.getActiveUser() is reliable for the actual Google user.
    // We will verify BOTH just to be safe if 'staff' context is used.
    
    const userEmail = Session.getActiveUser().getEmail();
    if (!isTemplateAdmin(userEmail)) {
       return { success: false, error: "Unauthorized: Only Rob or Nicola can delete templates." };
    }

    if (!templateId) return { success: false, error: "Missing template ID" };
    
    // Prevent deleting default
    if (templateId === DEFAULT_TEMPLATE.id) {
       return { success: false, error: "Cannot delete the default system template" };
    }

    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TEMPLATES);
    const data = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === templateId) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: "Template not found" };
    }
    
    sheet.deleteRow(rowIndex);
    
    return { success: true };
    
  } catch (e) {
    console.error("deleteTemplate Error:", e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Build HTML content for PDF generation
 */
function buildFormContent(responses, customTemplate) {
  const template = customTemplate || DEFAULT_TEMPLATE;
  let html = '';
  
  // Helper to safely get value
  const getVal = (id) => {
    let v = responses[id];
    if (v === undefined || v === null) return null;
    return v;
  };

  // Build HTML for each section
  template.sections.forEach(section => {
    // Skip declaration section for now (handled separately with signature)
    if (section.id === 'declaration') return;
    
    let sectionHtml = '<div class="section">';
    sectionHtml += '<div class="section-title">' + section.title + '</div>';
    if (section.description) {
       sectionHtml += '<div class="section-description">' + section.description + '</div>';
    }
    
    // Check if we should use grid (if section contains half-width items)
    // We'll iterate manually to handle layout
    let i = 0;
    while(i < section.fields.length) {
      const field = section.fields[i];
      const value = getVal(field.id);
      
      // Handle Half-Width Pairing
      if (field.layout === 'half') {
         // Start grid row
         sectionHtml += '<div class="info-grid" style="margin-bottom: 8px;">';
         
         // Item 1
         sectionHtml += buildFieldHtml(field, value);
         
         // Item 2 (if exists and is half)
         const nextField = section.fields[i+1];
         if (nextField && nextField.layout === 'half') {
            sectionHtml += buildFieldHtml(nextField, getVal(nextField.id));
            i++; // Skip next
         } else {
            // Empty spacer if needed, or just end grid
            sectionHtml += '<div></div>'; 
         }
         
         sectionHtml += '</div>'; // End grid
      } else {
         // Full width
          sectionHtml += '<div style="margin-bottom: 8px;">';
          sectionHtml += buildFieldHtml(field, value);
          sectionHtml += '</div>';
      }
      i++;
    }
    
    sectionHtml += '</div>';
    html += sectionHtml;
  });
  
  // Build Declaration section with signature
  html += buildDeclarationSection(responses);
  
  return html;
}

/**
 * Helper to build single field HTML
 */
function buildFieldHtml(field, value) {
  let html = '<div class="question-block">';
  html += '<div class="question-label">' + field.label + '</div>';
  
  if (field.type === 'rating') {
    const num = parseInt(value);
    let label = '-';
    if (!isNaN(num)) {
      const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
      // scale 1-5
      const text = labels[num - 1] || '';
      label = num + '/5 ' + (text ? '('+text+')' : '');
    }
    html += '<div class="answer"><span class="rating-value">' + label + '</span></div>';
  } else if (field.type === 'boolean') {
    // Tickbox style
    const isTrue = (value === true || value === 'true');
    // Using HTML symbols for checkbox state
    // ☑ (checked) = &#9745;
    // ☐ (unchecked) = &#9744;
    
    // If it's a specific "Consent" boolean, we might want to show both options?
    // For general booleans:
    if (value === null) {
       html += '<div class="answer">-</div>';
    } else {
       html += '<div class="answer" style="font-size: 14px;">';
       html += (isTrue ? '&#9745; Yes &nbsp;&nbsp; &#9744; No' : '&#9744; Yes &nbsp;&nbsp; &#9745; No');
       html += '</div>';
    }
  } else if (field.type === 'date') {
    const dateStr = value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    html += '<div class="answer">' + dateStr + '</div>';
  } else if (field.type === 'textarea') {
     // Preserve line breaks
     const text = value ? String(value).replace(/\n/g, '<br>') : '-';
     html += '<div class="answer">' + text + '</div>';
  } else {
    html += '<div class="answer">' + (value || '-') + '</div>';
  }
  
  html += '</div>';
  return html;
}

/**
 * Build the declaration section with referee details and signature
 */
function buildDeclarationSection(responses) {
  let html = '<div class="section declaration-section">';
  html += '<div class="section-title">Declaration</div>';
  html += '<div class="declaration-grid">';
  
  // Referee details
  const declarationFields = [
    { id: 'refereeName', label: 'Name' },
    { id: 'refereePosition', label: 'Position' },
    { id: 'refereeCompany', label: 'Company' },
    { id: 'refereeTelephone', label: 'Telephone' },
    { id: 'refereeEmailConfirm', label: 'Email' }
  ];
  
  declarationFields.forEach(field => {
    const value = responses[field.id];
    if (value) {
      html += '<div class="declaration-item">';
      html += '<div class="info-label">' + field.label + '</div>';
      html += '<div class="info-value">' + value + '</div>';
      html += '</div>';
    }
  });
  
  html += '</div>';
  
  // Add signature if present
  for (const key in responses) {
    if (typeof responses[key] === 'object' && responses[key] && responses[key].typedName) {
      html += buildSignatureContent(responses[key]);
      break;
    }
  }
  
  html += '</div>';
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

/**
 * Send critical error alert to admin
 */
function sendErrorAlert(context, error) {
  const adminEmail = Session.getEffectiveUser().getEmail();
  if (adminEmail) {
    MailApp.sendEmail({
      to: adminEmail,
      subject: `CRITICAL ERROR: ${context}`,
      body: `Error details:\n\n${error.toString()}\n\nStack:\n${error.stack || 'No stack trace'}`
    });
  }
}
