/**
 * Semester Reference Console - AI & Automation Module
 * Handles Gemini API integration and intelligent automation
 * Note: getDatabaseSpreadsheet and logAudit are defined in Code.gs
 */

/**
 * Analyse sentiment and detect anomalies using Gemini API
 * @param {string} requestId - Request ID
 * @param {Object} formData - Submitted form data
 * @returns {Object} Analysis results
 */
function analyseSentimentAndAnomalies(requestId, formData) {
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
    Logger.log('Error in analyseSentimentAndAnomalies: ' + error.toString());
    return {
      configured: true,
      sentimentScore: 'Error',
      summary: ['Error analysing reference: ' + error.toString()],
      anomalies: []
    };
  }
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
function runSmartChase(staff) {
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
        const candidateName = data[i][1];
        const refereeName = data[i][3];
        const refereeEmail = data[i][4];
        const token = data[i][11]; // RefereeToken is column 12 (index 11)
        
        sendSmartChaseEmail(refereeName, refereeEmail, token, requestId, staff, candidateName);
        
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
 * @param {Object} staff - Staff object
 * @param {string} candidateName - Candidate name
 */
function sendSmartChaseEmail(refereeName, refereeEmail, token, requestId, staff, candidateName) {
  const portalBaseUrl = PropertiesService.getScriptProperties().getProperty('PORTAL_BASE_URL') || ScriptApp.getService().getUrl();
  // Ensure no double slash
  const baseUrl = portalBaseUrl.endsWith('/') ? portalBaseUrl.slice(0, -1) : portalBaseUrl;
  const formUrl = baseUrl + '?view=portal&token=' + token;
  
  const subject = 'Friendly reminder: reference request for ' + (candidateName || 'Candidate');
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
       <h2 style="color: #111827; font-weight: 600; margin: 0;">Reference Reminder</h2>
    </div>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">Dear ${refereeName},</p>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">We wanted to follow up on the reference request we sent you. If you have a spare moment, we would really appreciate your feedback.</p>
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">You have three convenient options:</p>
    <ul style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
    <li><strong>Complete a short online form</strong></li>
    <li><strong>Upload your own reference document</strong></li>
    <li><strong>Decline</strong> if you are unable to provide a reference</li>
    </ul>
    <div style="margin: 32px 0; text-align: center;">
       <a href="${formUrl}" style="background-color: #0052CC; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Provide Reference</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
    <p style="color: #9ca3af; font-size: 13px; text-align: center;">Thank you again for your help.<br/>The Semester Team</p>
  `;
  
  // Use global sendBrandedEmail if available
  try {
     if (typeof sendBrandedEmail === 'function') {
        sendBrandedEmail(refereeEmail, subject, content);
     } else {
        GmailApp.sendEmail(refereeEmail, subject, '', { htmlBody: content });
     }
  } catch(e) {
     console.error('Error sending smart chase: ' + e.toString());
  }
  
  const staffId = staff ? staff.staffId : '';
  const staffName = staff ? staff.name : 'System';
  const actorType = staff ? 'Staff' : 'System';
  
  logAudit(requestId, actorType, staffId, staffName, 'CHASE_EMAIL_SENT', { refereeEmail: refereeEmail });
}

/**
 * Extract text content from form data for analysis
 * @param {Object} formData - Form responses
 * @returns {string} Combined text content
 */
function extractTextContent(formData) {
  if (!formData || typeof formData !== 'object') {
    return '';
  }
  
  const textParts = [];
  for (const key in formData) {
    if (formData.hasOwnProperty(key)) {
      const value = formData[key];
      if (value && typeof value === 'string') {
        textParts.push(value);
      } else if (value && typeof value === 'object') {
        textParts.push(JSON.stringify(value));
      }
    }
  }
  
  return textParts.join(' ');
}

/**
 * Call Gemini API for analysis
 * @param {string} apiKey - Gemini API key
 * @param {string} textContent - Text to analyze
 * @param {Object} formData - Full form data
 * @returns {Object} Analysis results
 */
function callGeminiAPI(apiKey, textContent, formData) {
  try {
    // Updated to Gemini 2.5 Flash (current model as of late 2025)
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    
    const prompt = `You are an HR expert analyzing a job reference. Analyze the following reference data and provide:
1. Sentiment Score (Positive/Neutral/Negative)
2. A brief summary (max 2 sentences)
3. Any anomalies or red flags

Reference Data:
${textContent}

Respond in JSON format: {"sentimentScore": "...", "summary": "...", "anomalies": ["..."]}`;

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
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log('Gemini API error: ' + response.getContentText());
      return {
        sentimentScore: 'Error',
        summary: ['API error: ' + responseCode],
        anomalies: []
      };
    }
    
    const responseData = JSON.parse(response.getContentText());
    
    // Extract text from Gemini response
    const generatedText = responseData.candidates && responseData.candidates[0] 
      && responseData.candidates[0].content 
      && responseData.candidates[0].content.parts 
      && responseData.candidates[0].content.parts[0]
      && responseData.candidates[0].content.parts[0].text;
    
    if (!generatedText) {
      return {
        sentimentScore: 'Error',
        summary: ['Invalid response from Gemini'],
        anomalies: []
      };
    }
    
    // Parse JSON from generated text
    try {
      const analysisResult = JSON.parse(generatedText);
      return {
        sentimentScore: analysisResult.sentimentScore || 'Neutral',
        summary: Array.isArray(analysisResult.summary) ? analysisResult.summary : [analysisResult.summary || 'No summary available'],
        anomalies: Array.isArray(analysisResult.anomalies) ? analysisResult.anomalies : []
      };
    } catch (parseErr) {
      // If Gemini didn't return valid JSON, create summary from text
      return {
        sentimentScore: 'Neutral',
        summary: [generatedText.substring(0, 200)],
        anomalies: []
      };
    }
    
  } catch (error) {
    Logger.log('Error calling Gemini API: ' + error.toString());
    return {
      sentimentScore: 'Error',
      summary: ['Error: ' + error.toString()],
      anomalies: []
    };
  }
}

/**
 * Save AI results to AI_Results sheet
 * @param {string} requestId - Request ID
 * @param {Object} analysis - Analysis results
 */
function saveAIResults(requestId, analysis) {
  try {
    const ss = getDatabaseSpreadsheet();
    let sheet = ss.getSheetByName('AI_Results');
    
    if (!sheet) {
      sheet = ss.insertSheet('AI_Results');
      sheet.appendRow(['RequestID', 'Timestamp', 'SentimentScore', 'Summary', 'Anomalies', 'RawData']);
    }
    
    const now = new Date();
    const summaryText = Array.isArray(analysis.summary) ? analysis.summary.join('; ') : analysis.summary;
    const anomaliesText = Array.isArray(analysis.anomalies) ? analysis.anomalies.join('; ') : '';
    const rawData = JSON.stringify(analysis);
    
    sheet.appendRow([
      requestId,
      now,
      analysis.sentimentScore,
      summaryText,
      anomaliesText,
      rawData
    ]);
  } catch (error) {
    Logger.log('Error saving AI results: ' + error.toString());
  }
}
