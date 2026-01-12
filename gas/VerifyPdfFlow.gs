
/**
 * E2E Verification for Seal & PDF Generation
 * Run via: clasp run verifyPdfEndToEnd
 */
function verifyPdfEndToEnd() {
  console.log("Starting PDF E2E Verification...");
  
  // 1. Initiate Standard Request
  console.log('--- TEST 1: STANDARD REFERENCE ---');
  let pdf1 = runTestCycle("Standard Test", false);
  console.log("Standard PDF: " + pdf1);
  
  // 2. Initiate Long Request (Stress Test)
  console.log('--- TEST 2: LONG REFERENCE (STRESS) ---');
  let pdf2 = runTestCycle("Long Content Test", true);
  console.log("Long/Compact PDF: " + pdf2);
  
  return { standard: pdf1, compact: pdf2 };
}

function runTestCycle(nameSuffix, isStress) {
  const reqData = {
    candidateName: "Pdf Candidate " + nameSuffix,
    candidateEmail: "candidate@example.com",
    refereeName: "Pdf Referee " + nameSuffix,
    refereeEmail: "referee@example.com",
    templateId: "standard-social-care"
  };
  const staff = { email: "rob@semester.co.uk", name: "Rob", staffId: "TEST_ROB" };
  
  // Ensure DB ready
  initializeDatabase();
  
  const initRes = initiateRequest(reqData, staff);
  if (!initRes.success) {
    console.error("Initiate failed: " + initRes.error);
    return "INITIATE_FAILED";
  }
  
  const requestId = initRes.requestId;
  
  // Get Tokens
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName("Requests_Log");
  const data = sheet.getDataRange().getValues();
  let rowIdx = data.findIndex(r => r[0] === requestId);
  
  if (rowIdx === -1) return "ROW_NOT_FOUND";
  const consentToken = data[rowIdx][25] || data[rowIdx][9]; // Try hard to find it, schema varies
  const refereeToken = data[rowIdx][27] || data[rowIdx][11]; // Heuristic column guess based on Code.gs init
  
  // Just grab from getRequest to be safe
  const req = getRequest(requestId).data;
  
  // Grant Consent
  processCandidateConsent(req.consentToken, 'CONSENT_GIVEN');
  
  // Prepare Responses
  const responses = {
    "dateStarted": "2020-01-01",
    "dateEnded": "2023-01-01",
    "jobTitle": "Senior Care Specialist",
    "reasonForLeaving": isStress ? lorem(50) : "End of contract.",
    "safeguardingConcerns": isStress, // True triggers details
    "safeguardingDetails": isStress ? lorem(30) : "",
    "disciplinaryAction": false,
    "suitableForRole": "5",
    "punctuality": "4",
    "attitude": "5",
    "reliability": "5",
    "honesty": "5",
    "initiative": "4",
    "communication": "5",
    "furtherInfo": isStress ? lorem(100) : "Excellent candidate.",
    "characterReservations": false,
    "shouldNotBeEmployed": false,
    "consentToShare": true,
    "refereeName": reqData.refereeName,
    "refereePosition": "Manager",
    "refereeCompany": "Test Co", 
    "refereeTelephone": "12345",
    "refereeEmailConfirm": "referee@example.com",
    "signature": { typedName: reqData.refereeName, signedAt: new Date().toISOString() }
  };
  
  submitReference(req.refereeToken, responses, 'form');
  
  // Seal
  const sealRes = sealRequest(requestId, staff);
  return sealRes.success ? sealRes.pdfUrl : sealRes.error;
}

function lorem(words) {
  const str = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ";
  let res = "";
  while (res.split(' ').length < words) res += str;
  return res;
}
