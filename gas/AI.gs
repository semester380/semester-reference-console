/**
 * Semester Reference Console - AI & Automation Module
 * Handles Gemini API integration and intelligent automation
 */

/**
 * Get or create the master spreadsheet (duplicated from Code.gs for cross-file access)
 */
function getDatabaseSpreadsheet() {
  const DB_SPREADSHEET_NAME = "SRC_Database";
  const files = DriveApp.getFilesByName(DB_SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  } else {
    return SpreadsheetApp.create(DB_SPREADSHEET_NAME);
  }
}

/**
 * Analyze sentiment and detect anomalies using Gemini API
 * @param {string} requestId - Request ID
 * @param {Object} formData - Submitted form data
 * @returns {Object} Analysis results
 */
function analyzeSentimentAndAnomalies(requestId, formData) {
  try {
    const geminiApiKey = PropertiesService.getScriptProperties().getProperty('GeminiAPIKey');
    
    if (!geminiApiKey) {
      Logger.log('Gemini API key not configured');
      return {
        configured: false,
        sentimentScore: 'Not Configured',
        summary: ['AI analysis not configured. Set GeminiAPIKey in Script Properties.'],
        anomalies: []
      };
    }
    
    // Extract text fields for analysis
    const textContent = extractTextContent(formData);
    
    // Call Gemini API
    const analysis = callGeminiAPI(geminiApiKey, textContent, formData);
    
    // Update Requests_Log with results
    updateRequestAnalysis(requestId, analysis);
    
    // Save full results to AI_Results sheet
    saveAIResults(requestId, analysis);
    
    return Object.assign({ configured: true }, analysis);
  } catch (error) {
    Logger.log('Error in analyzeSentimentAndAnomalies: ' + error.toString());
    return {
      configured: true,
      sentimentScore: 'Error',
      summary: ['Error analyzing reference: ' + error.toString()],
      anomalies: []
    };
  }
}

/**
 * Save full AI analysis results to AI_Results sheet
 * @param {string} requestId - Request ID
 * @param {Object} analysis - Analysis results
 */
function saveAIResults(requestId, analysis) {
  try {
    const ss = getDatabaseSpreadsheet();
    let aiSheet = ss.getSheetByName('AI_Results');
    
    // Create sheet if it doesn't exist (should be created by init, but safety first)
    if (!aiSheet) {
      aiSheet = ss.insertSheet('AI_Results');
      aiSheet.appendRow(['RequestID', 'Sentiment', 'Summary', 'AnomaliesJSON', 'Timestamp']);
      aiSheet.setFrozenRows(1);
    }
    
    const timestamp = new Date();
    const summaryJson = JSON.stringify(analysis.summary || []);
    const anomaliesJson = JSON.stringify(analysis.anomalies || []);
    
    // Check if record exists and update, or append
    const data = aiSheet.getDataRange().getValues();
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requestId) {
        aiSheet.getRange(i + 1, 2).setValue(analysis.sentimentScore);
        aiSheet.getRange(i + 1, 3).setValue(summaryJson);
        aiSheet.getRange(i + 1, 4).setValue(anomaliesJson);
        aiSheet.getRange(i + 1, 5).setValue(timestamp);
        found = true;
        break;
      }
    }
    
    if (!found) {
      aiSheet.appendRow([
        requestId, 
        analysis.sentimentScore, 
        summaryJson, 
        anomaliesJson, 
        timestamp
      ]);
    }
    
  } catch (e) {
    Logger.log('Error saving AI results: ' + e.toString());
  }
}

/**
 * Extract text content from form data
 * @param {Object} formData - Form data
 * @returns {string} Combined text content
 */
function extractTextContent(formData) {
  let textContent = '';
  
  for (const key in formData) {
    if (typeof formData[key] === 'string' && formData[key].length > 20) {
      textContent += formData[key] + '\n\n';
    }
  }
  
  return textContent;
}

/**
 * Call Gemini API for analysis
 * @param {string} apiKey - Gemini API key
 * @param {string} textContent - Text to analyze
 * @param {Object} formData - Full form data for anomaly detection
 * @returns {Object} Analysis results
 */
function callGeminiAPI(apiKey, textContent, formData) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  
  const prompt = `
Analyze the following employment reference and provide:
1. Overall sentiment (Highly Positive, Positive, Neutral, Cautionary, Negative)
2. Three key bullet points summarizing strengths and weaknesses
3. Any red flags or concerning patterns

Reference text:
${textContent}

Respond in JSON format:
{
  "sentiment": "...",
  "summary": ["point 1", "point 2", "point 3"],
  "concerns": ["concern 1", "concern 2"]
}
  `;
  
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
    headers: {
      'x-goog-api-key': apiKey
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    if (result.candidates && result.candidates[0]) {
      const text = result.candidates[0].content.parts[0].text;
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Detect anomalies
        const anomalies = detectAnomalies(formData);
        
        return {
          sentimentScore: analysis.sentiment || 'Unknown',
          summary: analysis.summary || [],
          anomalies: anomalies.concat(analysis.concerns || [])
        };
      }
    }
    
    return {
      sentimentScore: 'Unknown',
      summary: [],
      anomalies: detectAnomalies(formData)
    };
  } catch (error) {
    Logger.log('Gemini API Error: ' + error.toString());
    return {
      sentimentScore: 'Error',
      summary: [],
      anomalies: detectAnomalies(formData)
    };
  }
}

/**
 * Detect anomalies in form submission
 * @param {Object} formData - Form data
 * @returns {Array} List of detected anomalies
 */
function detectAnomalies(formData) {
  const anomalies = [];
  
  // Check completion time (if tracked)
  if (formData.completionTime && formData.completionTime < 90) {
    anomalies.push('Completed in under 90 seconds');
  }
  
  // Check for contradictory answers
  // Example: High rating but would not rehire
  if (formData.overallRating >= 4 && formData.wouldRehire === false) {
    anomalies.push('High rating but would not rehire');
  }
  
  // Check for all maximum ratings (potential bias)
  const ratings = Object.keys(formData)
    .filter(key => key.includes('rating'))
    .map(key => formData[key]);
  
  if (ratings.length > 0 && ratings.every(r => r === 5)) {
    anomalies.push('All ratings at maximum (potential bias)');
  }
  
  return anomalies;
}

/**
 * Update request with analysis results
 * @param {string} requestId - Request ID
 * @param {Object} analysis - Analysis results
 */
function updateRequestAnalysis(requestId, analysis) {
  const ss = getDatabaseSpreadsheet();
  const requestsSheet = ss.getSheetByName('Requests_Log');
  const data = requestsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === requestId) {
      requestsSheet.getRange(i + 1, 9).setValue(analysis.sentimentScore); // SentimentScore
      requestsSheet.getRange(i + 1, 10).setValue(analysis.anomalies.length > 0); // AnomalyFlag
      break;
    }
  }
}

/**
 * Run smart chase automation (triggered by time-driven trigger)
 */
function runSmartChase() {
  try {
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests_Log');
    const data = requestsSheet.getDataRange().getValues();
    
    const now = new Date();
    
    for (let i = 1; i < data.length; i++) {
      const status = data[i][6]; // Status is column 7 (index 6)
      const lastChaseDate = data[i][23]; // LastChaseDate is column 24 (index 23)
      
      // Only chase if status is 'PENDING_CONSENT' or 'CONSENT_GIVEN' (waiting for referee)
      // Actually, we want to chase if Consent is Given but Reference is NOT Completed
      // Status 'CONSENT_GIVEN' implies waiting for referee.
      if (status !== 'CONSENT_GIVEN') {
        continue;
      }
      
      // Check if we should send a chase
      const daysSinceLastChase = lastChaseDate 
        ? (now - new Date(lastChaseDate)) / (1000 * 60 * 60 * 24)
        : 999;
      
      if (daysSinceLastChase >= 3) {
        const requestId = data[i][0];
        const refereeName = data[i][3];
        const refereeEmail = data[i][4];
        const token = data[i][11]; // RefereeToken is column 12 (index 11)
        
        sendSmartChaseEmail(refereeName, refereeEmail, token, requestId);
        
        // Update last chase date (Column 24)
        requestsSheet.getRange(i + 1, 24).setValue(now);
      }
    }
  } catch (error) {
    Logger.log('Error in runSmartChase: ' + error.toString());
  }
}

/**
 * Send chase reminder email
 * @param {string} refereeName - Referee name
 * @param {string} refereeEmail - Referee email
 * @param {string} token - Referee token
 * @param {string} requestId - Request ID
 */
function sendSmartChaseEmail(refereeName, refereeEmail, token, requestId) {
  const portalBaseUrl = PropertiesService.getScriptProperties().getProperty('PORTAL_BASE_URL') || ScriptApp.getService().getUrl();
  const formUrl = portalBaseUrl + '?view=portal&token=' + token;
  
  const subject = 'Reminder: Reference Request Pending - Semester';
  const htmlBody = '<div style="font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">' +
    '<h2 style="color: #111827; margin-bottom: 24px; font-weight: 600;">Friendly Reminder</h2>' +
    '<p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">Dear ' + refereeName + ',</p>' +
    '<p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">We wanted to follow up on the reference request we sent you. Your input would be greatly valued and we would appreciate your feedback when you have a moment.</p>' +
    '<p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">You have three convenient options:</p>' +
    '<ul style="color: #4b5563; line-height: 1.8; margin-bottom: 24px; padding-left: 20px;">' +
    '<li>Complete a short online form</li>' +
    '<li>Upload your own reference document</li>' +
    '<li>Decline if you\'re unable to provide a reference</li>' +
    '</ul>' +
    '<div style="margin: 32px 0;"><a href="' + formUrl + '" style="background-color: #0052CC; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">Provide Reference</a></div>' +
    '<p style="color: #6b7280; font-size: 14px; margin-top: 32px;">Thank you for your time and support.</p>' +
    '<p style="color: #6b7280; font-size: 14px; margin-top: 16px;">Best regards,<br/>The Semester Team</p>' +
    '</div>';
  
  GmailApp.sendEmail(refereeEmail, subject, '', { htmlBody: htmlBody });
  
  logAudit(requestId, 'System', 'CHASE_EMAIL_SENT', { refereeEmail: refereeEmail });
}
