/**
 * Archive & Bulk Actions Module
 * Provides archive, unarchive, and safe delete functionality for requests
 */

/**
 * Archive multiple requests (soft delete)
 * @param {string[]} requestIds - Array of request IDs to archive
 * @returns {Object} Result with success status and count
 */
function archiveRequests(requestIds) {
  if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
    return { success: false, error: 'No request IDs provided' };
  }
  
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find Archived column index
    let archivedColIndex = headers.indexOf('Archived');
    if (archivedColIndex === -1) {
      // Add Archived column if it doesn't exist
      archivedColIndex = headers.length;
      sheet.getRange(1, archivedColIndex + 1).setValue('Archived');
    }
    
    let archivedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const requestId = data[i][COL_REQUEST_ID];
      if (requestIds.includes(requestId)) {
        // Set Archived = TRUE (column is 1-indexed)
        sheet.getRange(i + 1, archivedColIndex + 1).setValue(true);
        archivedCount++;
        
        // Log to audit trail
        logAudit(requestId, 'admin-dashboard', 'REQUEST_ARCHIVED', { 
          candidateName: data[i][COL_CANDIDATE_NAME],
          refereeName: data[i][COL_REFEREE_NAME]
        });
      }
    }
    
    return { 
      success: true, 
      message: `Archived ${archivedCount} request(s)`,
      archivedCount: archivedCount
    };
    
  } catch (e) {
    console.error('archiveRequests Error:', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Unarchive multiple requests
 * @param {string[]} requestIds - Array of request IDs to unarchive
 * @returns {Object} Result with success status and count
 */
function unarchiveRequests(requestIds) {
  if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
    return { success: false, error: 'No request IDs provided' };
  }
  
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find Archived column index
    const archivedColIndex = headers.indexOf('Archived');
    if (archivedColIndex === -1) {
      return { success: false, error: 'Archived column not found' };
    }
    
    let unarchivedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const requestId = data[i][COL_REQUEST_ID];
      if (requestIds.includes(requestId)) {
        // Set Archived = FALSE (column is 1-indexed)
        sheet.getRange(i + 1, archivedColIndex + 1).setValue(false);
        unarchivedCount++;
        
        // Log to audit trail
        logAudit(requestId, 'admin-dashboard', 'REQUEST_UNARCHIVED', { 
          candidateName: data[i][COL_CANDIDATE_NAME],
          refereeName: data[i][COL_REFEREE_NAME]
        });
      }
    }
    
    return { 
      success: true, 
      message: `Unarchived ${unarchivedCount} request(s)`,
      unarchivedCount: unarchivedCount
    };
    
  } catch (e) {
    console.error('unarchiveRequests Error:', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Delete requests (ONLY for test data - strict safety checks)
 * @param {string[]} requestIds - Array of request IDs to delete
 * @returns {Object} Result with deleted and skipped counts
 */
function deleteRequests(requestIds) {
  if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
    return { success: false, error: 'No request IDs provided' };
  }
  
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = sheet.getDataRange().getValues();
    
    // Safety: Test data patterns - ONLY these will be deleted
    const testPatterns = [
      'test@',
      'example.com',
      'test.com',
      '@test.',
      'pdf test',
      'e2e test',
      'decline test',
      'testdata'
    ];
    
    function isTestData(row) {
      const candidateEmail = (row[COL_CANDIDATE_EMAIL] || '').toLowerCase();
      const refereeEmail = (row[COL_REFEREE_EMAIL] || '').toLowerCase();
      const candidateName = (row[COL_CANDIDATE_NAME] || '').toLowerCase();
      const refereeName = (row[COL_REFEREE_NAME] || '').toLowerCase();
      
      for (const pattern of testPatterns) {
        if (candidateEmail.includes(pattern) || 
            refereeEmail.includes(pattern) ||
            candidateName.includes(pattern) ||
            refereeName.includes(pattern)) {
          return true;
        }
      }
      return false;
    }
    
    // Collect rows to delete (in reverse order to avoid index shifting)
    const rowsToDelete = [];
    const skippedIds = [];
    
    for (let i = 1; i < data.length; i++) {
      const requestId = data[i][COL_REQUEST_ID];
      if (requestIds.includes(requestId)) {
        if (isTestData(data[i])) {
          rowsToDelete.push({
            rowIndex: i + 1, // 1-indexed for sheet
            requestId: requestId,
            rowData: {
              candidateName: data[i][COL_CANDIDATE_NAME],
              candidateEmail: data[i][COL_CANDIDATE_EMAIL],
              refereeName: data[i][COL_REFEREE_NAME],
              refereeEmail: data[i][COL_REFEREE_EMAIL],
              status: data[i][COL_STATUS]
            }
          });
        } else {
          skippedIds.push(requestId);
        }
      }
    }
    
    // Delete rows in reverse order (to maintain correct indices)
    rowsToDelete.sort((a, b) => b.rowIndex - a.rowIndex);
    
    for (const row of rowsToDelete) {
      // Log before deletion
      logAudit(row.requestId, 'admin-dashboard', 'REQUEST_DELETED', row.rowData);
      
      // Also delete from Responses sheet if exists
      deleteResponsesForRequest(row.requestId);
      
      // Delete the row
      sheet.deleteRow(row.rowIndex);
    }
    
    const result = { 
      success: true, 
      message: `Deleted ${rowsToDelete.length} test request(s)`,
      deletedCount: rowsToDelete.length,
      skippedCount: skippedIds.length
    };
    
    if (skippedIds.length > 0) {
      result.skippedMessage = `${skippedIds.length} request(s) were not deleted (not test data). Only requests with test emails/names can be deleted.`;
      result.skippedIds = skippedIds;
    }
    
    return result;
    
  } catch (e) {
    console.error('deleteRequests Error:', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Helper to delete responses for a request
 */
function deleteResponsesForRequest(requestId) {
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Responses');
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][0] === requestId) {
        sheet.deleteRow(i + 1);
      }
    }
  } catch (e) {
    console.error('deleteResponsesForRequest Error:', e);
  }
}

/**
 * Ensure Archived column exists in the sheet
 */
function ensureArchivedColumn() {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_REQUESTS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (!headers.includes('Archived')) {
    const colIndex = headers.length + 1;
    sheet.getRange(1, colIndex).setValue('Archived');
    console.log('Added Archived column at index:', colIndex);
    return true;
  }
  return false;
}
