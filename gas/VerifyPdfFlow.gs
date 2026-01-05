
/**
 * E2E Verification for Seal & PDF Generation
 * Run via: clasp run verifyPdfEndToEnd
 */
function verifyPdfEndToEnd() {
  console.log("Starting PDF E2E Verification...");
  
  // 1. Initiate
  const reqData = {
    candidateName: "Pdf Test Candidate",
    candidateEmail: "candidate@example.com",
    refereeName: "Pdf Test Referee",
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
  console.log("Request Initiated: " + requestId);
  
  // 2. Get Consent Token from Sheet (Helper)
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName("Requests_Log"); // Hardcoded based on constant
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colConsentToken = headers.indexOf("ConsentToken");
  const colRefereeToken = headers.indexOf("RefereeToken");
  
  // Find row
  let rowIdx = -1;
  for(let i=1; i<data.length; i++){
    if(data[i][0] === requestId) {
      rowIdx = i;
      break;
    }
  }
  
  if (rowIdx === -1) return "ROW_NOT_FOUND";
  const consentToken = data[rowIdx][colConsentToken];
  console.log("Consent Token found: " + consentToken?.substring(0,5)+"...");
  
  // 3. Grant Consent
  processCandidateConsent(consentToken, 'CONSENT_GIVEN');
  console.log("Consent Granted");
  
  // 4. Get Referee Token (Refresh data)
  const data2 = sheet.getDataRange().getValues();
  const refereeToken = data2[rowIdx][colRefereeToken]; // Row index matches (data hasn't shifted hopefully)
  // Or re-find to be safe? Row index should be stable for append-only log unless concurrent edits.
  
  console.log("Referee Token found: " + refereeToken?.substring(0,5)+"...");

  // 5. Submit Reference
  const responses = {
    "dateStarted": "2020-01-01",
    "dateEnded": "2023-01-01",
    "jobTitle": "Tester",
    "reasonForLeaving": "End of project",
    "safeguardingConcerns": false,
    "disciplinaryAction": false,
    "suitableForRole": "5",
    "punctuality": "5",
    "attitude": "5",
    "reliability": "5",
    "honesty": "5",
    "initiative": "5",
    "communication": "5",
    "furtherInfo": "Good.",
    "characterReservations": false,
    "shouldNotBeEmployed": false,
    "consentToShare": true,
    "refereeName": "Pdf Test Referee",
    "refereePosition": "Manager",
    "refereeCompany": "Test Co", 
    "refereeTelephone": "12345",
    "refereeEmailConfirm": "referee@example.com",
    "signature": { typedName: "Pdf Test Referee", signedAt: new Date().toISOString() }
  };
  
  submitReference(refereeToken, responses, 'form');
  console.log("Reference Submitted");
  
  // 6. Seal & Generate PDF
  const sealRes = sealRequest(requestId, staff);
  if (!sealRes.success) {
     console.error("Seal failed: " + sealRes.error);
     return "SEAL_FAILED";
  }
  
  console.log("PDF Verified URL: " + sealRes.pdfUrl);
  return sealRes.pdfUrl;
}
