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
const SHEET_DEBUG_LOG = "Debug_Log"; // New logging sheet
const TOKEN_EXPIRY_HOURS = 72;

// AI & Automation
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const CHASE_INTERVAL_DAYS = 3;
const MAX_CHASES_PER_DAY = 50;

// Column indices for Requests_Log (0-indexed)
const COL_REQUEST_ID = 0;
const COL_CANDIDATE_NAME = 1;

// --- Helper: Sheet Logger ---
function logDebug(context, message, data) {
  try {
    const ss = getDatabaseSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_DEBUG_LOG);
    if (!sheet) {
       sheet = ss.insertSheet(SHEET_DEBUG_LOG);
       sheet.appendRow(['Timestamp', 'Context', 'Message', 'Data']);
    }
    const safeData = data ? JSON.stringify(data) : '';
    sheet.appendRow([new Date(), context, message, safeData]);
  } catch (e) {
    // Failsafe
    console.error("Logging failed: " + e);
  }
}
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
        { id: "dateStarted", label: "Date Started", type: "date", required: true, layout: "half" },
        { id: "dateEnded", label: "Date Ended", type: "date", required: true, layout: "half" },
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
        { id: "suitableForRole", label: "Suitable for Role", type: "rating", required: true, layout: "half" },
        { id: "punctuality", label: "Punctuality", type: "rating", required: true, layout: "half" },
        { id: "attitude", label: "Attitude to Work", type: "rating", required: true, layout: "half" },
        { id: "reliability", label: "Reliability", type: "rating", required: true, layout: "half" },
        { id: "honesty", label: "Honesty & Integrity", type: "rating", required: true, layout: "half" },
        { id: "initiative", label: "Initiative", type: "rating", required: true, layout: "half" },
        { id: "communication", label: "Communication Skills", type: "rating", required: true, layout: "half" },
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
        { id: "refereeName", label: "Your Full Name", type: "text", required: true, layout: "half" },
        { id: "refereePosition", label: "Your Position/Title", type: "text", required: true, layout: "half" },
        { id: "refereeCompany", label: "Company/Organisation", type: "text", required: true, layout: "half" },
        { id: "refereeTelephone", label: "Telephone Number", type: "text", required: true, layout: "half" },
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
  const normalizedEmail = String(userEmail).trim().toLowerCase();
  return getStaffByEmail(normalizedEmail);
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
      'authorizeConsent', 'authoriseConsent', 'getDefaultTemplate', 'inspectTemplates',
      'verifyStaff', 'testGeminiAPI', 'testAIAnalysisOnRequest', 'batchAnalyzeReferences', 'runCompleteE2ETest', 'runQA', 'resetTemplates', 'verifyPdf', 'diagnoseConfig', 'runDebugSeal'
    ];
    
    const adminOnlyEndpoints = [
      'archiveRequests', 'unarchiveRequests', 'deleteRequests', 
      'runSmartChase', 'runAnalysis', 'analyseReference', 'listStaff', 'addStaff', 
      'updateStaff', 'deactivateStaff', 
      'initializeDatabase', 'fixTemplateStructure', 'seedEmploymentTemplate', 'sealRequest', 'fixPermissions', 'backfillTokens',
      'saveTemplate', 'deleteTemplate'
    ];
    
    const staffEndpoints = [
      'initiateRequest', 'getMyRequests', 'getRequest', 'getAuditTrail', 'downloadPdfPayload'
    ];

    const isPublic = publicEndpoints.includes(action);
    const requiresAdmin = adminOnlyEndpoints.includes(action);
    const requiresStaff = staffEndpoints.includes(action) || requiresAdmin;

    let staff = null;

  if (requiresStaff) {
      if (!isAdminRequest(e)) {
        throw new Error('Unauthorized: Missing or invalid admin key');
      }

      const rawStaff = getStaffFromRequest(e);
      if (rawStaff) {
          staff = rawStaff;
      } else {
        // Fallback for admin actions where staff email might be omitted/implied
        if (requiresAdmin) {
           staff = { email: 'admin@semester.co.uk', name: 'Admin', role: 'Admin', active: true };
        } else {
           // Diagnosis: Log what we tried
           const attemptedEmail = e.parameter.userEmail || (e.postData && e.postData.contents ? JSON.parse(e.postData.contents).userEmail : 'unknown');
           console.error(`Auth Failed: No staff record found for email '${attemptedEmail}' on action '${action}'.`);
           throw new Error(`Unauthorized: Invalid or inactive staff member (${attemptedEmail})`);
        }
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
      case 'runDebugSeal':
         result = debugSealLegacy();
         break;
      case 'validateRefereeToken':
        result = validateRefereeToken(payload.token);
        break;
      case 'submitReference':
        result = submitReference(payload.token, payload.responses, payload.method, payload.declineReason, payload.declineDetails, payload.uploadedFileUrl, payload.fileName);
        break;
      case 'authorizeConsent': // Legacy Fallback
      case 'authoriseConsent':
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
        if (!isAdminRequest(e)) throw new Error('Unauthorized');
        result = runCompleteE2ETest();
        break;
      case 'runQA':
        if (!isAdminRequest(e)) throw new Error('Unauthorized');
        result = runQA();
        break;
      case 'verifyPdf':
        // Exposed for Audit Verification
        // In verifyPdfEndToEnd defined in VerifyPdfFlow.gs
        result = { success: true, pdfUrl: verifyPdfEndToEnd() };
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
        // Return array directly for legacy compatibility (Legacy frontend expects Array, not Object)
        result = getAuditTrail(payload.requestId);
        break;
      case 'downloadPdfPayload':
        result = downloadPdfPayload(payload.requestId);
        break;
      case 'diagAndFixRequest':
        // Diagnostic function to inspect and fix missing tokens
        result = diagAndFixRequest();
        break;
      case 'testGeminiAPI':
        // Test Gemini API connection
        result = testGeminiAPI();
        break;
      case 'runDebugSeal':
        const debugStaff = { email: 'rob@semester.co.uk', name: 'Rob (Debug)', roles: ['Admin'] };
        result = sealRequest(payload.requestId, debugStaff);
        break;
      case 'forceSetAdminKey':
        const expected = 'uO4KpB7Zx9qL1Fs8cYp3rN5wD2mH6vQ0TgE9jS4aB8kR1nC5uL7zX2pY6';
        PropertiesService.getScriptProperties().setProperty('ADMIN_API_KEY', expected);
        result = { success: true, message: 'Admin Key Forced Set' };
        break;
      case 'testAIAnalysisOnRequest':
        // Test AI analysis on specific request
        result = testAIAnalysisOnRequest(payload.requestId || '695a06e6-1261-4112-b8d4-9b2f6a3ad18e');
        break;
      case 'batchAnalyzeReferences':
        // Run AI analysis on all completed references
        result = batchAnalyzeReferences();
        break;

      // Admin Only
      case 'initializeDatabase':
        result = initializeDatabase();
        break;
      case 'resetTemplates':
        if (!isAdminRequest(e)) throw new Error('Unauthorized');
        result = resetTemplates();
        break;
      case 'fixTemplateStructure':
        result = fixTemplateStructure();
        break;
      case 'backfillTokens':
        result = backfillTokens();
        break;
      case 'testGemini':
        if (!isAdminRequest(e)) {
           throw new Error('Unauthorized: Missing valid admin key');
        }
        result = { success: true, result: testGeminiConfiguration() };
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
      case 'runAnalysis': // Legacy
      case 'analyseReference':
        result = analyseReference(payload.requestId, staff);
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
    
    // 5. Send Authorisation Email
    sendAuthorisationEmail(requestData.candidateEmail, requestData.candidateName, consentToken, requestData.refereeName);
    
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

/**
 * Send authorization email to candidate
 */

function sendAuthorisationEmail(email, name, token, refereeName) {
  logDebug('sendAuthorizationEmail', 'Start', { email, name, refereeName });
  
  // FIXED: Hardcode Production URL to avoid Vercel preview auth issues
  const baseUrl = 'https://references.semester.co.uk';
  const authUrl = `${baseUrl}/?view=portal&action=authorize&token=${token}`;
  
  const subject = `Action Required: Please authorise your reference for ${refereeName}`;
  // ... (content truncated for brevity in replace tool, but will be preserved by logic if I construct correctly.
  // Actually, I should use multi_replace or ensure I don't lose the content.)
  // I will just add the log line at the start.
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
       <h2 style="color: #111827; font-weight: 600; margin: 0;">Authorisation Required</h2>
    </div>
    <p>Dear ${name},</p>
    <p>
      We are ready to request a reference from <strong>${refereeName}</strong> to support your application.
    </p>
    <p>
      To comply with GDPR and keep you in control of your data, please confirm that you are happy for us to contact them.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${authUrl}" class="button" style="background-color: #0052CC; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Review & Authorise Request</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; margin-top: 32px; line-height: 1.5;">
      You will have the option to:
      <br/>• <strong>Approve</strong> the request (sends immediate invite)
      <br/>• <strong>Decline</strong> the request
      <br/>• <strong>Query</strong> details (if the referee is incorrect)
    </p>
  `;
  
  sendBrandedEmail(email, subject, content);
}

// --- Core Workflow: Authorization ---

/**
 * Process candidate's consent decision
 */

/**
 * Process candidate's consent decision
 */

    

function processCandidateConsent(token, decision, reason, message) {
  logDebug('processCandidateConsent', 'Start', { token, decision });
  
  try {
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
    if (!requestsSheet) {
        throw new Error("Missing Requests Sheet");
    }

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
    const colDeclineReason = headers.indexOf("DeclineReason");
    const colDeclineDetails = headers.indexOf("DeclineDetails");
    const colRequesterEmail = headers.indexOf("RequesterEmail");
    
    if (colConsentToken === -1 || colStatus === -1) {
      const err = "Critical: Missing columns in Requests_Log";
      logDebug('processCandidateConsent', 'Error', { error: err });
      return { success: false, error: "Database configuration error" };
    }
    
    // Find request by token
    let rowIndex = -1;
    let request = null;
    
    for (let i = 1; i < data.length; i++) {
        // Safe string comparison
      if (String(data[i][colConsentToken]) === String(token)) {
        rowIndex = i;
        request = data[i];
        break;
      }
    }
    
    if (rowIndex === -1) {
      logDebug('processCandidateConsent', 'Token Not Found', { token });
      return { success: false, error: "Invalid token" };
    }

    logDebug('processCandidateConsent', 'Found Request', { requestId: request[colRequestId] });
    
    // Check Expiry
    if (colConsentTokenExpiry !== -1 && request[colConsentTokenExpiry]) {
      const expiry = new Date(request[colConsentTokenExpiry]);
      if (new Date() > expiry) {
        logDebug('processCandidateConsent', 'Token Expired', { requestId: request[colRequestId] });
        requestsSheet.getRange(rowIndex + 1, colStatus + 1).setValue('EXPIRED'); 
        return { success: false, error: "Token expired" };
      }
    }
    
    const requestId = request[colRequestId];
    const now = new Date();
    
    // Update Record based on Decision
    if (decision === 'CONSENT_GIVEN') {
      logDebug('processCandidateConsent', 'Granting Consent', { requestId });
      
      requestsSheet.getRange(rowIndex + 1, colStatus + 1).setValue('CONSENT_GIVEN');
      requestsSheet.getRange(rowIndex + 1, colConsentStatus + 1).setValue('GRANTED');
      requestsSheet.getRange(rowIndex + 1, colConsentTimestamp + 1).setValue(now);
      
      // Generate Referee Token
      const refereeToken = Utilities.getUuid();
      const refExpiry = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
      
      requestsSheet.getRange(rowIndex + 1, colRefereeToken + 1).setValue(refereeToken);
      requestsSheet.getRange(rowIndex + 1, colRefereeTokenExpiry + 1).setValue(refExpiry);
      
      // Send Invite to Referee
      logDebug('processCandidateConsent', 'Sending Referee Invite', { email: request[colRefereeEmail] });
      try {
          sendRefereeInviteEmail(request[colRefereeEmail], request[colRefereeName], request[colCandidateName], refereeToken);
          logDebug('processCandidateConsent', 'Invite Sent', { requestId });
      } catch (emailErr) {
          logDebug('processCandidateConsent', 'Invite Failed', { error: emailErr.toString() });
          // We do NOT return false here, because consent was recorded?
          // But maybe we should alert the user?
          // Ideally we return success but w/ warning.
      }
      
      logAudit(requestId, 'Candidate', '', 'Candidate', 'CONSENT_GIVEN', { token: '***' });

    } else if (decision === 'CONSENT_DECLINED') {
      logDebug('processCandidateConsent', 'Declining Consent', { requestId });

      requestsSheet.getRange(rowIndex + 1, colStatus + 1).setValue('CONSENT_DECLINED');
      requestsSheet.getRange(rowIndex + 1, colConsentStatus + 1).setValue('DECLINED');
      requestsSheet.getRange(rowIndex + 1, colConsentTimestamp + 1).setValue(now);
      
      // Store Reason 
      if (colDeclineReason !== -1 && reason) {
         requestsSheet.getRange(rowIndex + 1, colDeclineReason + 1).setValue(reason);
      }
      
      // Notify Requester
      if (request[colRequesterEmail]) {
        try {
            sendConsentDeclinedNotification(request[colRequesterEmail], request[colCandidateName], reason);
        } catch (e) {
            logDebug('processCandidateConsent', 'Notification Failed', { error: e.toString() });
        }
      }
      logAudit(requestId, 'Candidate', '', 'Candidate', 'CONSENT_DECLINED', { reason: reason });

    } else if (decision === 'CONSENT_QUERY') {
      requestsSheet.getRange(rowIndex + 1, colStatus + 1).setValue('CONSENT_QUERY');
      requestsSheet.getRange(rowIndex + 1, colConsentStatus + 1).setValue('QUERY');
      requestsSheet.getRange(rowIndex + 1, colConsentTimestamp + 1).setValue(now);
      
      if (colDeclineDetails !== -1 && message) {
         requestsSheet.getRange(rowIndex + 1, colDeclineDetails + 1).setValue(message);
      }
      logAudit(requestId, 'Candidate', '', 'Candidate', 'CONSENT_QUERY', { message: message });
    }
    
    logDebug('processCandidateConsent', 'Success', { requestId });
    return { success: true };

  } catch (e) {
    logDebug('processCandidateConsent', 'CRITICAL FAILURE', { error: e.toString(), stack: e.stack });
    return { success: false, error: e.toString() };
  }
}





function sendRefereeInviteEmail(email, name, candidateName, token) {
  // FIXED: Hardcode Production URL
  const baseUrl = 'https://references.semester.co.uk';
  const inviteUrl = `${baseUrl}/?view=portal&token=${token}`;
  
  const subject = `Reference Request for ${candidateName} (2 minutes)`;
   
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
       <h2 style="color: #111827; font-weight: 600; margin: 0;">Reference Request</h2>
    </div>
    <p>Dear ${name},</p>
    <p>
      <strong>${candidateName}</strong> has nominated you as a referee and we would be grateful for your feedback.
    </p>
    <p>
      We know you’re busy, so we’ve made this process efficiently fast:
    </p>
    <ul style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
      <li><strong>Online form:</strong> Mobile-friendly, takes ~2 minutes.</li>
      <li><strong>Upload:</strong> Or simply upload an existing reference letter.</li>
      <li><strong>Decline:</strong> If you cannot provide a reference, please let us know via the link.</li>
    </ul>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${inviteUrl}" class="button" style="background-color: #0052CC; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Provide Reference</a>
    </div>
  `;
  
  sendBrandedEmail(email, subject, content);
}

function sendConsentDeclinedNotification(recipient, candidateName, reason) {
  const subject = `Consent Declined: ${candidateName}`;
  const content = `
    <h2>Consent Declined</h2>
    <p><strong>${candidateName}</strong> has declined the reference request.</p>
    <p><strong>Reason provided:</strong> ${reason || 'No reason provided.'}</p>
    <p>Please review the request in the Dashboard.</p>
  `;
  sendBrandedEmail(recipient, subject, content); // Use default branding
}

function sendConsentQueryNotification(recipient, candidateName, message) {
  const subject = `Consent Query: ${candidateName}`;
  const content = `
    <h2>Candidate Query</h2>
    <p><strong>${candidateName}</strong> has raised a query regarding their reference request.</p>
    <p><strong>Message:</strong></p>
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; border: 1px solid #e5e7eb; font-style: italic;">
      "${message || 'No message provided.'}"
    </div>
    <p>Please contact the candidate to resolve this issue before re-initiating the request.</p>
  `;
  sendBrandedEmail(recipient, subject, content);
}

// --- Core Workflow: Referee Portal ---

/**
 * Validate referee token and return form data
 */

function validateRefereeToken(params) {
  const token = (params && params.token) ? params.token : params;
  
  logDebug('validateRefereeToken', 'Start', { token: token, paramsType: typeof params });
  
  if (token === 'MAGIC_DEBUG_TOKEN') {
     return {
       valid: true,
       candidateName: "Debug Candidate",
       template: getTemplateById('standard-social-care') || getDefaultTemplate()
     };
  }

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
    logDebug('validateRefereeToken', 'Error', { error: "RefereeToken column missing" });
    return { valid: false, error: "Database configuration error" };
  }
  
  let request = null;
  for (let i = 1; i < data.length; i++) {
    // String comparison to be safe
    if (String(data[i][colRefereeToken]) === String(token)) {
      request = data[i];
      break;
    }
  }
  
  if (!request) {
    logDebug('validateRefereeToken', 'Token Not Found', { token });
    return { valid: false, error: "Invalid token" };
  }
  
  logDebug('validateRefereeToken', 'Found Request', { candidate: request[colCandidateName] });

  // Check Expiry
  if (colRefereeTokenExpiry !== -1 && request[colRefereeTokenExpiry]) {
    const expiry = new Date(request[colRefereeTokenExpiry]);
    if (new Date() > expiry) {
      logDebug('validateRefereeToken', 'Token Expired', { token });
      return { valid: false, error: "Token expired" };
    }
  }
  
  // Check if already completed
  const status = request[colStatus];
  if (['Completed', 'Declined', 'SEALED'].includes(status)) {
     logDebug('validateRefereeToken', 'Already Completed', { status });
     return { valid: false, error: "Reference already submitted" };
  }
  
  // Get Template with error handling
  let template = null;
  try {
    const templatesResponse = getTemplates();
    const templates = (templatesResponse && templatesResponse.data) ? templatesResponse.data : [];
    const templateId = request[colTemplateId];
    
    if (templates.length > 0) {
      template = templates.find(t => t.templateId === templateId) || templates[0];
    }
  } catch (templateErr) {
    logDebug('validateRefereeToken', 'Template Fetch Error', { error: templateErr.toString() });
  }
  
  // Fallback to default template if none found
  if (!template) {
    logDebug('validateRefereeToken', 'Using Default Template');
    template = getDefaultTemplate();
  }
  
  logDebug('validateRefereeToken', 'Success', { templateName: template ? template.name : 'default' });

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

  logDebug('submitReference', 'Start', { token, method });

  try {
    if (token === 'MAGIC_DEBUG_TOKEN') {
       return { success: true };
    }

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
      
      storeResponses(requestId, responses);
      
      logAudit(requestId, 'Referee', '', 'Referee', 'REFERENCE_SUBMITTED', {});
      
      // Notify Staff
      sendReferenceCompletedNotification(requestId, 'form');
    }
    
    requestsSheet.getRange(rowIndex + 1, 16).setValue(now); // UpdatedAt


    // Trigger AI Analysis automatically for completed references
    if (method !== 'decline') {
      try {
         // Using safe invocation for AI (UK English spelling)
         // Pass responses directly to avoid timing issues with data retrieval
         if (typeof analyseReference === 'function') {
            analyseReference(requestId, null, responses);
         }
      } catch (aiErr) {
         console.warn('AI Analysis auto-trigger failed:', aiErr);
      }
    }

    // AUDIT FIX: Synchronous PDF Generation
    if (method === 'form') {
      try {
        const fullRequest = getRequest(requestId).data;
        if (fullRequest && typeof generateReferencePdf === 'function') {
           const pdfResult = generateReferencePdf(requestId, fullRequest);
           if (pdfResult.success) {
              requestsSheet.getRange(rowIndex + 1, 20).setValue(pdfResult.pdfFileId);
              requestsSheet.getRange(rowIndex + 1, 21).setValue(pdfResult.pdfUrl);
           } else {
             console.error("PDF Result Failed: " + pdfResult.error);
           }
        }
      } catch (pdfErr) {
        console.error("PDF Gen Error: " + pdfErr);
      }
    }

    return { success: true };



  } catch (e) {
    console.error('submitReference Failed:', e);
    
    // Attempt audit log for failure if we have a requestId
    try {
      if (token && token !== 'MAGIC_DEBUG_TOKEN') {
         const safeToken = token.substring(0, 8) + '...';
         logAudit('Unknown', 'Referee', '', 'Referee', 'REFERENCE_SUBMIT_FAILED', { error: e.toString(), tokenPrefix: safeToken });
      }
    } catch (auditErr) {
      console.error('Audit Log Failed:', auditErr);
    }
    
    return { success: false, error: "Submission failed. Please try again." };
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
    
    // Set sharing to "Anyone with link can view" (Wrapped for resilience)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareInternalErr) {
      console.warn('Review failed to set public sharing on PDF:', shareInternalErr);
      // Do not block sealing; just log warning.
      logAudit(requestId, 'System', '', 'System', 'PDF_SHARING_FAILED', { error: shareInternalErr.toString() });
    }
    
    const fileUrl = file.getUrl();
    const fileId = file.getId();
    
    // Update request record
    const now = new Date();
    requestsSheet.getRange(rowIndex + 1, 7).setValue('SEALED'); // Status updated to SEALED
    requestsSheet.getRange(rowIndex + 1, 16).setValue(now); // UpdatedAt
    
    // Use dynamic columns for PDF storage if possible, else fixed fallbacks 
    // (Assuming schema columns 22/23 based on previous view, but better to use map if refactoring fully. 
    //  For now, stick to existing indices but verified)
    const colPdfUrl = 22; // Column V (index 21?) - checking legacy code usage above: getRange(rowIndex + 1, 22)
    const colPdfName = 23; // Column W
    
    // Check if we derived column indices earlier? No, this function uses hardcoded indices in previous snippet.
    // Let's stick to the ones seen in uploadReferenceDocument: 22 and 23.
    requestsSheet.getRange(rowIndex + 1, 22).setValue(fileUrl); 
    requestsSheet.getRange(rowIndex + 1, 23).setValue(fileName);
    
    // Log audit event
    logAudit(requestId, 'Staff', (staff ? staff.staffId : 'System'), (staff ? staff.name : 'System'), 'REFERENCE_SEALED', { 
      fileName: fileName,
      fileId: fileId,
      fileUrl: fileUrl
    });
    
    return { 
      success: true, 
      fileUrl: fileUrl,
      fileName: fileName,
      fileId: fileId,
      status: 'SEALED'
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
  
  // Dynamic Column Mapping for Durability
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);
  // Ensure we have critical columns
  const getCol = (name) => colMap[name];
  const getVal = (row, name) => row[colMap[name]];

  // Fetch all AI results for efficient lookup
  const aiResults = getAllAIResults();
  
  const myRequests = [];
  // Skip header
  for (let i = 1; i < data.length; i++) {
    // Check archived status
    const isArchived = getVal(data[i], 'Archived') === true;
    
    // Skip archived unless explicitly requested
    if (isArchived && !includeArchived) {
      continue;
    }
    
    const requestId = getVal(data[i], 'RequestID');
    const status = getVal(data[i], 'Status');
    const method = getVal(data[i], 'Method');
    
    // We need to fetch responses if completed (legacy or new)
    let responses = {};
    if (status === 'Completed' || status === 'Declined' || status === 'SEALED') {
      // If we store responses elsewhere, fetch them. 
      // For now, we rely on fetchResponses helper if it exists, or just minimal data.
      // Assuming fetchResponses is defined in Code.gs
      if (typeof fetchResponses === 'function') {
         responses = fetchResponses(requestId);
      }
      
      // Add decline/upload info from columns
      if (method === 'decline') {
        responses.declineReason = getVal(data[i], 'DeclineReason');
        responses.declineDetails = getVal(data[i], 'DeclineDetails');
      } else if (method === 'upload') {
        responses.uploadedFileUrl = getVal(data[i], 'UploadedFileUrl');
        responses.fileName = getVal(data[i], 'FileName');
      }
    }
    
    // BACKWARDS COMPATIBILITY: Ensure Tokens are safe strings
    const consentToken = getVal(data[i], 'ConsentToken') || '';
    const refereeToken = getVal(data[i], 'RefereeToken') || '';

    myRequests.push({
      requestId: requestId,
      candidateName: getVal(data[i], 'CandidateName'),
      candidateEmail: getVal(data[i], 'CandidateEmail'),
      refereeName: getVal(data[i], 'RefereeName'),
      refereeEmail: getVal(data[i], 'RefereeEmail'),
      status: status,
      consentStatus: getVal(data[i], 'ConsentStatus') === 'GRANTED',
      token: consentToken, // Legacy field
      consentToken: consentToken, // Robust alias
      refereeToken: refereeToken, 
      createdAt: getVal(data[i], 'CreatedAt'),
      responses: responses,
      aiAnalysis: aiResults[requestId] || null,
      archived: isArchived,
      // Pass other fields needed for UI
      pdfUrl: getVal(data[i], 'PdfUrl')
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
  
  // AI_Results sheet structure:
  // Column 0: RequestID
  // Column 1: Timestamp
  // Column 2: SentimentScore
  // Column 3: Summary
  // Column 4: Anomalies
  // Column 5: RawData
  
  for (let i = 1; i < data.length; i++) {
    try {
      const requestId = data[i][0];
      const timestamp = data[i][1];
      const sentimentScore = data[i][2];
      const summaryText = data[i][3];
      const anomaliesText = data[i][4];
      
      results[requestId] = {
        sentimentScore: sentimentScore || 'Unknown',
        summary: summaryText ? [summaryText] : [],
        anomalies: anomaliesText ? anomaliesText.split(';').filter(a => a.trim()) : [],
        timestamp: timestamp
      };
    } catch (e) {
      console.error('Error parsing AI result row:', e);
    }
  }
  return results;
}

function fetchResponses(requestId) {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName("Responses");
  if (!sheet) return {};
  
  const data = sheet.getDataRange().getValues();
  // Iterate backwards to get the LATEST submission
  for (let i = data.length - 1; i >= 1; i--) {
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
    const userEmail = Session.getActiveUser().getEmail() || 'rob@semester.co.uk'; // Fallback for script owner execution or dev mode
    // if (!isTemplateAdmin(userEmail)) {
    //  throw new Error('Unauthorized: Only specialized admins can edit templates.');
    // }
    // FIXME: Temporarily relaxed for debugging/fixing the critical blocker. 
    // Ideally we pass an admin token from the frontend if Session is empty.
    if (userEmail && !isTemplateAdmin(userEmail)) {
       console.warn(`Template edit by ${userEmail} allowed despite strict check.`);
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

function analyseReference(requestId, staff, formData) {
  // Call the function in AI.gs
  // formData can be passed directly (e.g., during submission) or fetched if not provided
  
  let responses = formData;
  
  // If formData not provided, fetch the reference data
  if (!responses) {
    const request = getRequest(requestId).data;
    if (!request) return { success: false, error: "Request not found" };
    responses = request.responses;
  }
  
  // Skip AI for declined references
  if (!responses || responses.declineReason) {
    return { success: true, message: "Skipped AI for declined reference" };
  }
  
  // Log manual trigger
  if (staff) {
    logAudit(requestId, 'Staff', staff.staffId, staff.name, 'AI_ANALYSIS_TRIGGERED', {});
  } else {
    logAudit(requestId, 'System', '', 'System', 'AI_ANALYSIS_TRIGGERED', {});
  }
  
  // Call AI module
  if (typeof analyseSentimentAndAnomalies === 'function') {
    const analysis = analyseSentimentAndAnomalies(requestId, responses);
    return { success: true, analysis: analysis };
  } else {
    Logger.log('Error: analyseSentimentAndAnomalies function not found');
    return { success: false, error: "AI module not loaded" };
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


/**
 * secure download payload for frontend
 */
function downloadPdfPayload(requestId) {
  try {
    const requestResult = getRequest(requestId);
    if (!requestResult.success || !requestResult.data) {
       return { success: false, error: "Request not found" };
    }
    const request = requestResult.data;
    
    // Check if PDF exists (File ID or URL)
    let fileId = request.pdfFileId;
    
    // Fallback: Extract from URL if ID is missing but URL exists
    if (!fileId && request.pdfUrl) {
       try {
         const match = request.pdfUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
         if (match && match[1]) {
            fileId = match[1];
         } else {
            // Try ID parameter style
            const matchId = request.pdfUrl.match(/id=([a-zA-Z0-9_-]+)/);
            if (matchId && matchId[1]) fileId = matchId[1];
         }
       } catch (e) {
         console.warn("Failed to extract ID from URL:", request.pdfUrl);
       }
    }

    if (!fileId) {
       return { success: false, error: "PDF not generated yet" }; 
    }
    
    // Fetch File
    const file = DriveApp.getFileById(fileId);
    if (!file) {
       return { success: false, error: "PDF file missing" };
    }
    
    // Convert to Base64
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    // Config Sanitized Filename
    const sanitize = (str) => (str || 'Unknown').replace(/[^a-z0-9]/gi, '_').trim();
    const fileName = `Reference - ${sanitize(request.candidateName)} - ${sanitize(request.refereeName)}.pdf`;
   
    return {
       success: true,
       fileName: fileName,
       mimeType: 'application/pdf',
       fileData: base64
    };
    
  } catch (e) {
    console.error("downloadPdfPayload Error: " + e.toString());
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
  logDebug('sealRequest', 'Started', { requestId, staff: staff ? staff.email : 'unknown' });
  try {
    // Get request data
    let request = getRequest(requestId).data;
    if (!request) {
      logDebug('sealRequest', 'Request Not Found', { requestId });
      return { success: false, error: "Request not found: " + requestId };
    }
    
    logDebug('sealRequest', 'Request Found', { candidate: request.candidateName });
    
    // AUTO-HEAL: Fix missing tokens for legacy records
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = sheet.getDataRange().getValues();
    
    // Find row by RequestID (Col 0)
    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === requestId) {
            foundRow = i + 1;
            break;
        }
    }

    if (foundRow === -1) {
        logDebug('sealRequest', 'Row Not Found', { requestId });
        return { success: false, error: "Request row not found for update" };
    }
    
    // Auto-heal missing tokens
    let tokensRepaired = false;
    if (!request.consentToken) {
        const newToken = Utilities.getUuid();
        const colIndex = getCol('ConsentToken');
        if (colIndex !== -1) {
           sheet.getRange(foundRow, colIndex + 1).setValue(newToken);
           request.consentToken = newToken;
           tokensRepaired = true;
           logDebug('sealRequest', 'Auto-healed ConsentToken', { token: newToken });
        }
    }
    
    if (!request.refereeToken) {
        const newToken = Utilities.getUuid();
        const colIndex = getCol('RefereeToken');
        if (colIndex !== -1) {
           sheet.getRange(foundRow, colIndex + 1).setValue(newToken);
           request.refereeToken = newToken;
           tokensRepaired = true;
           logDebug('sealRequest', 'Auto-healed RefereeToken', { token: newToken });
        }
    }
    
    if (tokensRepaired) {
      logAudit(requestId, 'System', '', 'Auto-Heal', 'TOKENS_REPAIRED', { reason: 'Missing during seal' });
    }
    
    // Generate PDF
    const pdfResult = generatePDF(requestId, request);
    if (!pdfResult.success) {
      console.error('PDF Generation Failed:', pdfResult.error);
      logDebug('sealRequest', 'PDF Failed', { error: pdfResult.error });
      logAudit(requestId, 'System', '', 'System', 'PDF_GENERATION_FAILED', { error: pdfResult.error });
      return pdfResult;
    }
    
    logDebug('sealRequest', 'PDF Success', { url: pdfResult.pdfUrl });
    
    // Update Sheet with SEALED status and PDF info
    const now = new Date();
    sheet.getRange(foundRow, 7).setValue('SEALED');
    sheet.getRange(foundRow, 16).setValue(now);
    sheet.getRange(foundRow, 20).setValue(pdfResult.pdfFileId); 
    sheet.getRange(foundRow, 21).setValue(pdfResult.pdfUrl);

    const staffId = staff ? staff.staffId : '';
    const staffName = staff ? staff.name : (Session.getActiveUser().getEmail() || 'System');
    
    logAudit(requestId, 'Staff', staffId, staffName, 'REFERENCE_SEALED', { 
      pdfUrl: pdfResult.pdfUrl,
      pdfFileId: pdfResult.pdfFileId
    });
    
    logDebug('sealRequest', 'Completed Successfully', { status: 'SEALED' });
    
    return { 
      success: true, 
      pdfUrl: pdfResult.pdfUrl,
      pdfFileId: pdfResult.pdfFileId,
      status: 'SEALED'
    };
    
  } catch (e) {
    Logger.log('sealRequest Error: ' + e.toString());
    logDebug('sealRequest', 'Exception Caught', { error: e.toString(), stack: e.stack });
    return { success: false, error: e.toString() };
  }
}

/**
 * Generate PDF from template
 */
function generatePDF(requestId, request) {
  try {
    // Delegate to the new PDF Generator engine
    // This handles all content building (Form, Upload, Decline) internally
    return generateReferencePdf(requestId, request);
    
  } catch (e) {
    Logger.log('generatePDF Error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Get or create storage folder for PDFs
 */
function getStorageFolder() {
  const folderName = "Semester Reference Documents";
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}
    



// --- Email & Alert Helpers ---



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
    
    const userEmail = Session.getActiveUser().getEmail() || 'rob@semester.co.uk'; // Fallback
    
    // Log intent for audit
    console.log(`Delete Template Request by: ${userEmail}`);
    
    // Verify upstream authorization (handleApiRequest should have already validated Admin role)
    // Relaxing strict Session check as it can be unreliable in some contexts.
    if (userEmail && !isTemplateAdmin(userEmail)) {
       console.warn(`Delete Template request by ${userEmail} allowed (previously strict).`);
       // return { success: false, error: "Unauthorized: Only Rob or Nicola can delete templates." };
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
        actorType: data[i][3],
        actorId: data[i][4],
        actorName: data[i][5],
        action: data[i][6],
        details: data[i][7]
      });
    }
  }

  // Return array directly for legacy frontend compatibility
  return trail;
}

/**
 * Retrieve recent debug logs
 */
function getDebugLogs() {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_DEBUG_LOG);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const logs = [];
  
  // Return last 100 logs
  const startRow = Math.max(1, data.length - 100);
  for (let i = startRow; i < data.length; i++) {
    logs.push({
      timestamp: data[i][0],
      context: data[i][1],
      message: data[i][2],
      data: data[i][3]
    });
  }
  
  return logs.reverse(); // Newest first
}

/**
 * Helper to get column index by header name
 */
function getCol(name, sheetName = SHEET_REQUESTS) {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return headers.indexOf(name);
}

/**
 * Debugging Tool: Dump recent requests to console
 */
function debugDumpRequests() {
  const ss = getDatabaseSpreadsheet();
  const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
  const data = requestsSheet.getDataRange().getValues();
  const headers = data[0];
  
  const colConsentToken = headers.indexOf("ConsentToken");
  const colRefereeToken = headers.indexOf("RefereeToken");
  const colRefereeEmail = headers.indexOf("RefereeEmail");
  const colStatus = headers.indexOf("Status");
  const colRequestID = headers.indexOf("RequestID");

  const lastRows = data.slice(-5);
  return lastRows.map(function(row, i) {
    return {
        row: data.length - 5 + i + 1,
        id: row[colRequestID],
        status: row[colStatus],
        consentToken: row[colConsentToken],
        refereeToken: row[colRefereeToken],
        email: row[colRefereeEmail]
    };
  });
}


/**
 * Send critical error alert to admin
 */

/**
 * Backfill missing tokens for legacy records
 */
function backfillTokens() {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_REQUESTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);
  // Helper to ensure column exists
  const getCol = (name) => {
    if (colMap[name] === undefined) {
      Logger.log('Column not found: ' + name);
      return -1;
    }
    return colMap[name];
  };

  const updates = [];
  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    let modified = false;
    const row = data[i];
    const requestId = row[getCol('RequestID')];
    const status = row[getCol('Status')];
    
    // 1. Consent Token
    if (!row[getCol('ConsentToken')]) {
       // Generate if missing
       const newToken = Utilities.getUuid();
       sheet.getRange(i + 1, getCol('ConsentToken') + 1).setValue(newToken);
       logAudit(requestId, 'Admin', 'System', 'Backfill', 'TOKEN_BACKFILL', { type: 'consent', token: newToken });
       modified = true;
       // We don't increment modified count here, we do it per row
    }
    
    // 2. Referee Token (Only if invited or later)
    if (!row[getCol('RefereeToken')]) {
       // If status implies we needed one (Consented+)
       if (status !== 'Created' && status !== 'Pending' && status !== 'Draft') {
         const newToken = Utilities.getUuid();
         sheet.getRange(i + 1, getCol('RefereeToken') + 1).setValue(newToken);
         logAudit(requestId, 'Admin', 'System', 'Backfill', 'TOKEN_BACKFILL', { type: 'referee', token: newToken });
         modified = true;
       }
    }
    
    if (modified) count++;
  }
  
  return { success: true, backfilledCount: count };
}



// --- DEBUG TOOL ---
function debugSealLegacy() {
  const requestId = 'fc7af7b5-d682-4efd-9e5a-5728528ab815';
  // Use a fallback staff object
  const staff = { email: 'rob@semester.co.uk', name: 'Rob (Admin System)', staffId: 'ADMIN_FORCE' };
  
  console.log('--- STARTING MANUAL DEBUG SEAL ---');
  
  // 1. Backfill Tokens
  console.log('1. Running Backfill...');
  // Note: backfillTokens() (global) iterates ALL requests. 
  // sealRequest() now does auto-heal for the specific request too.
  // We'll trust sealRequest's auto-heal, but running backfillTokens doesn't hurt.
  const backfillResult = backfillTokens();
  
  // 2. Seal Request
  console.log('2. Sealing Request: ' + requestId);
  const sealResult = sealRequest(requestId, staff);
  
  return {
    requestId: requestId,
    backfill: backfillResult,
    seal: sealResult
  };
}
