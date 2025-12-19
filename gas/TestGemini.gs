
/**
 * Diagnostic tool for User to verify Gemini Key
 */
function testGeminiConfiguration() {
  const key = PropertiesService.getScriptProperties().getProperty('GeminiAPIKey');
  if (!key) {
    Logger.log('❌ Error: GeminiAPIKey property is missing.');
    return 'Missing Key';
  }
  
  Logger.log('ℹ️ Key found. Starts with: ' + key.substring(0, 5) + '...');
  
  // Test Call
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + key;
  const payload = {
    contents: [{
      parts: [{ text: "Say hello" }]
    }]
  };
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    const text = response.getContentText();
    
    if (code === 200) {
      Logger.log('✅ SUCCESS: Gemini API responded correctly.');
      Logger.log('Response: ' + text.substring(0, 100) + '...');
      return 'Success';
    } else {
      Logger.log('❌ FAILURE: API responded with code ' + code);
      Logger.log('Error Details: ' + text);
      return 'Failure';
    }
    
  } catch (e) {
    Logger.log('❌ EXCEPTION: Request failed completely.');
    Logger.log(e.toString());
    return 'Exception';
  }
}
