function getLatestRequestTokens(email) {
  const sheet = getDatabaseSpreadsheet().getSheetByName("Requests_Log");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const colCandidateEmail = headers.indexOf("CandidateEmail");
  const colConsentToken = headers.indexOf("ConsentToken");
  const colRefereeToken = headers.indexOf("RefereeToken");
  const colRequestId = headers.indexOf("RequestID");
  
  // Search backwards for latest
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][colCandidateEmail] === email) {
      return {
        requestId: data[i][colRequestId],
        consentToken: data[i][colConsentToken],
        refereeToken: data[i][colRefereeToken]
      };
    }
  }
  return null;
}
