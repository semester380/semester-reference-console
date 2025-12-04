/**
 * Direct database token test - bypasses API layers
 */
function testDirectTokenLookup() {
  const testToken = 'a8603612-421b-410a-8c88-75170d304917'; // Known referee token
  
  Logger.log(`\n=== DIRECT TOKEN LOOKUP TEST ==`);
  Logger.log(`Searching for token: "${testToken}"`);
  
  const ss = getDatabaseSpreadsheet();
  const requestsSheet = ss.getSheetByName('Requests_Log');
  
  if (!requestsSheet) {
    Logger.log('ERROR: Requests_Log sheet not found!');
    return;
  }
  
  const data = requestsSheet.getDataRange().getValues();
  Logger.log(`Total rows: ${data.length}`);
  
  // Log headers
  Logger.log('\n=== HEADERS ===');
  data[0].forEach((header, idx) => {
    Logger.log(`[${idx}] ${header}`);
  });
  
  // Search for the token
  Logger.log('\n=== SEARCHING FOR TOKEN ===');
  let found = false;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const refereeToken = row[11]; // RefereeToken column
    
    // Log every row's referee token
    Logger.log(`\nRow ${i}:`);
    Logger.log(`  RequestID: ${row[0]}`);
    Logger.log(`  Candidate: ${row[1]}`);
    Logger.log(`  Status: ${row[6]}`);
    Logger.log(`  RefereeToken (col 11): "${refereeToken}"`);
    Logger.log(`  Token type: ${typeof refereeToken}`);
    Logger.log(`  Token length: ${refereeToken ? refereeToken.length : 0}`);
    Logger.log(`  Exact match: ${refereeToken === testToken}`);
    Logger.log(`  Trimmed match: ${refereeToken ? refereeToken.trim() === testToken.trim() : false}`);
    
    if (refereeToken === testToken) {
      Logger.log(`\n✅ FOUND EXACT MATCH at row ${i}`);
      found = true;
      
      // Log full row details
      Logger.log('\n=== FULL ROW DATA ===');
      data[0].forEach((header, idx) => {
        Logger.log(`${header}: ${row[idx]}`);
      });
      break;
    }
  }
  
  if (!found) {
    Logger.log('\n❌ TOKEN NOT FOUND IN ANY ROW');
  }
  
  return { tested: true, found: found };
}
