/**
 * AI.gs
 * Handles interaction with Gemini API for specialized analysis
 */

/**
 * Checks if the Gemini API is configured
 */
function isGeminiConfigured() {
  const key = PropertiesService.getScriptProperties().getProperty('GeminiAPIKey');
  return !!key;
}

/**
 * Main function to analyse reference sentiment and anomalies
 * @param {string} requestId - The ID of the request
 * @param {Object} formData - The response data from the reference
 */
function analyseSentimentAndAnomalies(requestId, formData) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GeminiAPIKey');
    if (!apiKey) {
      Logger.log('AI Analysis skipped: GeminiAPIKey not set');
      return {
        sentimentScore: 'Error',
        summary: ['AI not configured'],
        anomalies: []
      };
    }

    // Prepare content for analysis
    let contentToAnalyze = '';
    
    // Safety check for formData
    if (!formData) {
       return { sentimentScore: 'Error', summary: ['No data to analyze'], anomalies: [] };
    }

    // Format Q&A pairs
    for (const [key, value] of Object.entries(formData)) {
      if (['candidateName', 'refereeName', 'refereeEmail', 'relationship', 'uploadedFileUrl'].includes(key)) continue;
      // Skip metadata or complex objects (like signature)
      if (typeof value === 'object') continue;
      
      contentToAnalyze += `Question (${key}): ${value}\n`;
    }

    if (!contentToAnalyze.trim()) {
        contentToAnalyze = "No text responses provided.";
    }

    // Call Gemini
    const analysis = callGeminiAPI(apiKey, contentToAnalyze, formData);
    
    // Log result
    Logger.log('AI Analysis Result for ' + requestId + ': ' + JSON.stringify(analysis));
    
    // Clean up summary array if needed
    if (analysis.summary && !Array.isArray(analysis.summary)) {
        analysis.summary = [analysis.summary];
    }
    
    // Clean up anomalies array
    if (analysis.anomalies && !Array.isArray(analysis.anomalies)) {
        analysis.anomalies = [analysis.anomalies];
    }

    // Store in Sheet
    saveAIResult(requestId, analysis);
    
    return analysis;

  } catch (error) {
    Logger.log('Error in analyseSentimentAndAnomalies: ' + error.toString());
    return {
      sentimentScore: 'Error',
      summary: ['Analysis failed: ' + error.toString()],
      anomalies: []
    };
  }
}

/**
 * Calls the Gemini API with the constructed prompt
 * Implements fallback logic to try multiple models
 */
function callGeminiAPI(apiKey, textContent, formData) {
  // 1. Prepare Prompt
  const prompt = `You are an HR expert analyzing a job reference. Analyze the following reference data and provide:
1. Sentiment Score (Positive/Neutral/Negative)
2. A brief summary (max 2 sentences)
3. Any anomalies or red flags (contradictions, concerning language)

Reference Context:
Candidate: ${formData.candidateName || 'Unknown'}
Referee: ${formData.refereeName || 'Unknown'}
Email: ${formData.refereeEmail || 'Unknown'}

Questions & Responses:
${textContent}

Format the output strictly as JSON:
{
  "sentimentScore": "Positive/Neutral/Negative",
  "summary": ["Summary point 1", "Summary point 2"],
  "anomalies": ["Anomaly 1", "Anomaly 2"]
}`;

  // 2. Prepare Payload
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  // 3. Try Models in Sequence
  // Based on listModels diagnostic: gemini-flash-latest, gemini-2.5-flash-lite, and gemini-pro-latest are available.
  const models = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-pro-latest'];
  
  let allErrors = [];
  let successResponse = null;
  let usedModel = null;

  for (const model of models) {
    try {
      Logger.log('Attempting AI analysis with model: ' + model);
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
      
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        successResponse = response.getContentText();
        usedModel = model;
        Logger.log('Success with model: ' + model);
        break; 
      } else {
        const errorMsg = model + ': ' + responseCode + ' (' + response.getContentText().substring(0, 50) + ')';
        Logger.log(errorMsg);
        allErrors.push(errorMsg);
      }
    } catch (e) {
      const errorMsg = model + ' Exception: ' + e.toString();
      Logger.log(errorMsg);
      allErrors.push(errorMsg);
    }
  }

  // 4. Handle Failure
  if (!successResponse) {
    return {
      sentimentScore: "Error",
      summary: ["All models failed. Details: " + allErrors.join(' | ')],
      anomalies: []
    };
  }

  // 5. Parse Success Response
  try {
    const json = JSON.parse(successResponse);
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) throw new Error('Empty response content');
    
    // Clean markdown
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
    
  } catch (e) {
    Logger.log('Error parsing AI response: ' + e.toString());
    return {
      sentimentScore: "Error",
      summary: ["Parsing Error: " + e.toString()],
      anomalies: []
    };
  }
}

/**
 * Saves AI results to the hidden AI_Results sheet
 */
function saveAIResult(requestId, analysis) {
  try {
    // Check if sheet exists, if not create/get it safely (helper in Code.gs usually handles this)
    const ss = getDatabaseSpreadsheet(); 
    let sheet = ss.getSheetByName('AI_Results');
    
    if (!sheet) {
      sheet = ss.insertSheet('AI_Results');
      sheet.appendRow(['RequestId', 'Timestamp', 'Sentiment', 'Summary', 'Anomalies', 'FullJSON']);
    }
    
    const timestamp = new Date();
    
    sheet.appendRow([
      requestId,
      timestamp,
      analysis.sentimentScore,
      (analysis.summary || []).join('. '),
      (analysis.anomalies || []).join('. '),
      JSON.stringify(analysis)
    ]);
    
  } catch (e) {
    Logger.log('Failed to save AI result to sheet: ' + e.toString());
  }
}

/**
 * Helper to get DB spreadsheet (duplicated here to ensure standalone functioning if needed, 
 * but connects to main DB logic)
 */
function getDatabaseSpreadsheet() {
  // Use the ID from Properties or fallback to active
  const dbId = PropertiesService.getScriptProperties().getProperty('DatabaseSheetId');
  if (dbId) return SpreadsheetApp.openById(dbId);
  return SpreadsheetApp.getActiveSpreadsheet();
}
