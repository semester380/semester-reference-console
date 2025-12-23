/**
 * Diagnostic and fix function for request 695a06e6-1261-4112-b8d4-9b2f6a3ad18e
 * This function can be called directly via the web app (no authentication required for testing)
 */
function diagAndFixRequest() {
  try {
    const targetRequestId = '695a06e6-1261-4112-b8d4-9b2f6a3ad18e';
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Build column map
    const colMap = {};
    headers.forEach((h, i) => colMap[h] = i);
    
    // Find the request row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][colMap['RequestID']] === targetRequestId) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return {
        success: false,
        error: 'Request not found: ' + targetRequestId
      };
    }
    
    const row = data[rowIndex];
    
    // Diagnostic info
    const diagnostic = {
      requestId: row[colMap['RequestID']],
      status: row[colMap['Status']],
      consentToken: row[colMap['ConsentToken']],
      refereeToken: row[colMap['RefereeToken']],
      consentStatus: row[colMap['ConsentStatus']],
      candidateName: row[colMap['CandidateName']],
      refereeName: row[colMap['RefereeName']],
      rowNumber: rowIndex + 1
    };
    
    // Check what needs fixing
    const needsConsentTokenFix = !diagnostic.consentToken || diagnostic.consentToken === '';
    const needsRefereeTokenFix = !diagnostic.refereeToken || diagnostic.refereeToken === '';
    
    // Fix if needed
    let fixed = false;
    if (needsConsentTokenFix || needsRefereeTokenFix) {
      if (needsConsentTokenFix) {
        const newConsentToken = Utilities.getUuid();
        sheet.getRange(rowIndex + 1, colMap['ConsentToken'] + 1).setValue(newConsentToken);
        diagnostic.newConsentToken = newConsentToken;
        fixed = true;
        
        // Also update expiry
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 14);
        sheet.getRange(rowIndex + 1, colMap['ConsentTokenExpiry'] + 1).setValue(expiry.toISOString());
      }
      
      if (needsRefereeTokenFix) {
        const newRefereeToken = Utilities.getUuid();
        sheet.getRange(rowIndex + 1, colMap['RefereeToken'] + 1).setValue(newRefereeToken);
        diagnostic.newRefereeToken = newRefereeToken;
        fixed = true;
        
        // Also update expiry  
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        sheet.getRange(rowIndex + 1, colMap['RefereeTokenExpiry'] + 1).setValue(expiry.toISOString());
      }
      
      logAudit(targetRequestId, 'System', 'auto-fix', 'Diagnostic Fix', 'AUTO_HEAL_TOKENS', {
        consentTokenAdded: needsConsentTokenFix,
        refereeTokenAdded: needsRefereeTokenFix
      });
    }
    
    return {
      success: true,
      fixed: fixed,
      diagnostic: diagnostic,
      message: fixed ? 'Tokens backfilled successfully' : 'No tokens needed backfilling'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}
