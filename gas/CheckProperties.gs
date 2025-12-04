/**
 * Check and set script properties
 */
function checkScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const all = scriptProperties.getProperties();
  
  console.log('=== CURRENT SCRIPT PROPERTIES ===');
  for (const key in all) {
    console.log(`${key}: ${all[key]}`);
  }
  
  // Set PORTAL_BASE_URL if not set
  const portalUrl = 'https://semester-reference-console-nmd4bhpey-robs-projects-ae895b9a.vercel.app/';
  if (!all.PORTAL_BASE_URL || all.PORTAL_BASE_URL !== portalUrl) {
    console.log(`\nSetting PORTAL_BASE_URL to: ${portalUrl}`);
    scriptProperties.setProperty('PORTAL_BASE_URL', portalUrl);
  }
  
  return { success: true, properties: all };
}
