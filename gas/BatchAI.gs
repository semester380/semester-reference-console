/**
 * Batch analyze all completed references that don't have AI analysis yet
 * This will run AI analysis on all refs with status Completed or Sealed
 */
function batchAnalyzeReferences() {
  try {
    console.log('=== BATCH AI ANALYSIS START ===');
    
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Requests_Log');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const colMap = {};
    headers.forEach((header, index) => {
      colMap[header] = index;
    });
    
    const results = {
      total: 0,
      analyzed: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    // Process each row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const requestId = row[colMap['RequestID']];
      const status = row[colMap['Status']];
      const currentSentiment = row[colMap['SentimentScore']];
      const candidateName = row[colMap['CandidateName']];
      
      // Only analyze Completed or Sealed references
      if (status !== 'Completed' && status !== 'Sealed') {
        continue;
      }
      
      results.total++;
      
      // Skip if already analyzed (has sentiment score), UNLESS it was an error
      if (currentSentiment && currentSentiment !== '' && currentSentiment !== 'Not Configured' && currentSentiment !== 'Error') {
        results.skipped++;
        results.details.push({
          requestId: requestId,
          candidate: candidateName,
          status: 'Skipped - Already analyzed',
          sentiment: currentSentiment
        });
        continue;
      }
      
      // Run AI analysis
      try {
        console.log('Analyzing request:', requestId, 'Candidate:', candidateName);
        const analysisResult = analyseReference(requestId, null);
        
        if (analysisResult && analysisResult.success && analysisResult.analysis) {
          results.analyzed++;
          results.details.push({
            requestId: requestId,
            candidate: candidateName,
            status: 'Analyzed',
            sentiment: analysisResult.analysis.sentimentScore,
            summary: analysisResult.analysis.summary ? analysisResult.analysis.summary[0] : 'No summary'
          });
          console.log('✓ Analyzed:', candidateName, '- Sentiment:', analysisResult.analysis.sentimentScore);
        } else {
          results.errors++;
          results.details.push({
            requestId: requestId,
            candidate: candidateName,
            status: 'Error',
            error: analysisResult ? analysisResult.error : 'Unknown error'
          });
          console.log('✗ Error analyzing:', candidateName);
        }
        
        // Small delay to avoid rate limiting
        Utilities.sleep(1000);
        
      } catch (error) {
        results.errors++;
        results.details.push({
          requestId: requestId,
          candidate: candidateName,
          status: 'Error',
          error: error.toString()
        });
        console.error('Error analyzing request:', requestId, error);
      }
    }
    
    console.log('=== BATCH AI ANALYSIS COMPLETE ===');
    console.log('Total eligible:', results.total);
    console.log('Analyzed:', results.analyzed);
    console.log('Skipped (already done):', results.skipped);
    console.log('Errors:', results.errors);
    
    return {
      success: true,
      results: results
    };
    
  } catch (error) {
    console.error('Error in batchAnalyzeReferences:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}
