/**
 * ADMIN ONLY: Clear all test data from the system
 * This removes all requests, audit trail entries, and AI results
 * Templates and staff data are preserved
 */
function clearAllTestData() {
  try {
    const ss = getDatabaseSpreadsheet();
    
    // 1. Clear Requests_Log (keep header row)
    const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
    if (requestsSheet && requestsSheet.getLastRow() > 1) {
      requestsSheet.deleteRows(2, requestsSheet.getLastRow() - 1);
      console.log('Cleared Requests_Log');
    }
    
    // 2. Clear Audit_Trail (keep header row)
    const auditSheet = ss.getSheetByName(SHEET_AUDIT);
    if (auditSheet && auditSheet.getLastRow() > 1) {
      auditSheet.deleteRows(2, auditSheet.getLastRow() - 1);
      console.log('Cleared Audit_Trail');
    }
    
    // 3. Clear AI_Results (keep header row)
    const aiSheet = ss.getSheetByName(SHEET_AI_RESULTS);
    if (aiSheet && aiSheet.getLastRow() > 1) {
      aiSheet.deleteRows(2, aiSheet.getLastRow() - 1);
      console.log('Cleared AI_Results');
    }
    
    // Note: Templates and Staff sheets are NOT cleared - they contain configuration
    
    return { 
      success: true, 
      message: 'All test data cleared. Templates and staff data preserved.' 
    };
    
  } catch (e) {
    console.error('clearAllTestData Error:', e);
    return { success: false, error: e.toString() };
  }
}
