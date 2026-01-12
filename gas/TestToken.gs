function logScriptProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  console.log('--- Script Properties ---');
  console.log('ADMIN_API_KEY:', props.ADMIN_API_KEY || 'MISSING');
  console.log('GeminiAPIKey:', props.GeminiAPIKey ? 'SET (Hidden)' : 'MISSING');
  console.log('DatabaseSheetId:', props.DatabaseSheetId || 'MISSING');
  return props;
}

function setAdminKey() {
  PropertiesService.getScriptProperties().setProperty('ADMIN_API_KEY', 'uO4KpB7Zx9qL1Fs8cYp3rN5wD2mH6vQ0TgE9jS4aB8kR1nC5uL7zX2pY6');
  console.log('Admin Key set to: uO4KpB7Zx9qL1Fs8cYp3rN5wD2mH6vQ0TgE9jS4aB8kR1nC5uL7zX2pY6');
}
