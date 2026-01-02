/**
 * Test Gemini API connection directly
 * Call this via: clasp run testGeminiAPI
 */
function testGeminiAPI() {
  try {
    console.log('=== TESTING GEMINI API ===');
    
    // 1. Check if API key is set
    const apiKey = PropertiesService.getScriptProperties().getProperty('GeminiAPIKey');
    console.log('API Key exists:', !!apiKey);
    console.log('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'GeminiAPIKey not set in Script Properties'
      };
    }
    
    // 2. Test API call with simple prompt
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + apiKey;
    
    const payload = {
      contents: [{
        parts: [{
          text: 'Say hello in one word.'
        }]
      }]
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    console.log('Calling Gemini API...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('Response Code:', responseCode);
    console.log('Response Text:', responseText);
    
    if (responseCode !== 200) {
      return {
        success: false,
        responseCode: responseCode,
        error: responseText,
        diagnosis: responseCode === 403 ? 'API key may not have Generative Language API enabled' :
                   responseCode === 400 ? 'Bad request - check API endpoint or payload format' :
                   responseCode === 401 ? 'Unauthorized - invalid API key' :
                   'Unknown error'
      };
    }
   
    // 3. Parse response
    const responseData = JSON.parse(responseText);
    const generatedText = responseData.candidates 
      && responseData.candidates[0] 
      && responseData.candidates[0].content 
      && responseData.candidates[0].content.parts 
      && responseData.candidates[0].content.parts[0]
      && responseData.candidates[0].content.parts[0].text;
    
    console.log('Generated Text:', generatedText);
    
    return {
      success: true,
      message: 'Gemini API is working correctly!',
      response: generatedText,
      fullResponse: responseData
    };
    
  } catch (error) {
    console.error('Error testing Gemini API:', error.toString());
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}

/**
 * Test AI analysis on a specific request
 * @param {string} requestId - Request ID to analyze
 */
function testAIAnalysisOnRequest(requestId) {
  try {
    console.log('=== TESTING AI ANALYSIS ===');
    console.log('Request ID:', requestId);
    
    // Get request data
    const request = getRequest(requestId);
    if (!request || !request.data) {
      return {
        success: false,
        error: 'Request not found: ' + requestId
      };
    }
    
    console.log('Request found:', request.data.candidateName);
    console.log('Responses:', JSON.stringify(request.data.responses).substring(0, 200));
    
    // Call AI analysis
    const result = analyseReference(requestId, null);
    console.log('AI Analysis Result:', JSON.stringify(result));
    
    return result;
    
  } catch (error) {
    console.error('Error testing AI analysis:', error.toString());
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}

function listGeminiModels() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GeminiAPIKey');
  if (!apiKey) return JSON.stringify({ error: "No API Key found" });
  
  const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;
  const options = {
    method: 'get',
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const content = response.getContentText();
    try {
      return JSON.parse(content);
    } catch (e) {
      return { error: "Failed to parse API response", raw: content };
    }
  } catch (e) {
    return { error: e.toString() };
  }
}

