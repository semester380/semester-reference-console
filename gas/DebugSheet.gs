/**
 * Debug script to inspect SRC_Database sheet structure
 * This will log the actual column headers and sample data
 */
function inspectSheetStructure() {
  try {
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests_Log');
    
    if (!requestsSheet) {
      Logger.log('ERROR: Requests_Log sheet not found');
      return;
    }
    
    // Get headers
    const headers = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    Logger.log('=== COLUMN HEADERS ===');
    headers.forEach((header, index) => {
      Logger.log(`Column ${index} (1-based: ${index + 1}): ${header}`);
    });
    
    // Get first data row (if exists)
    if (requestsSheet.getLastRow() > 1) {
      Logger.log('\\n=== SAMPLE DATA ROW ===');
      const sampleRow = requestsSheet.getRange(2, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
      sampleRow.forEach((value, index) => {
        const preview = value ? String(value).substring(0, 50) : '(empty)';
        Logger.log(`${headers[index]}: ${preview}`);
      });
      
      // Specifically check token columns
      Logger.log('\\n=== TOKEN COLUMNS DETAIL ===');
      const consentTokenIndex = headers.indexOf('ConsentToken');
      const refereeTokenIndex = headers.indexOf('RefereeToken');
      
      Logger.log(`ConsentToken is at index ${consentTokenIndex} (column ${consentTokenIndex + 1})`);
      Logger.log(`RefereeToken is at index ${refereeTokenIndex} (column ${refereeTokenIndex + 1})`);
      
      if (sampleRow[consentTokenIndex]) {
        Logger.log(`Sample ConsentToken: ${sampleRow[consentTokenIndex]}`);
      }
      if (sampleRow[refereeTokenIndex]) {
        Logger.log(`Sample RefereeToken: ${sampleRow[refereeTokenIndex]}`);
      }
    }
    
    return { success: true, headers: headers };
    
  } catch (e) {
    Logger.log('Error inspecting sheet: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}
// Note: getDatabaseSpreadsheet is defined in Code.gs
