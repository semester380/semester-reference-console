/**
 * Fix template structure for frontend compatibility
 * Frontend expects: { template Id, name, structureJSON: Array<TemplateField> }
 */
function fixTemplateStructure() {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TEMPLATES);
  
  if (!sheet) {
    return { success: false, error: "Template sheet not found" };
  }
  
  // Clear existing data (keep header)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  // Get the default template
  const defaultTmpl = getDefaultTemplate();
  
  // Flatten sections to fields array
  let flatFields = [];
  if (defaultTmpl.sections) {
    defaultTmpl.sections.forEach(section => {
      if (section.fields) {
        flatFields = flatFields.concat(section.fields);
      }
    });
  }
  
  // Insert the correctly formatted template
  sheet.appendRow([
    defaultTmpl.id,
    defaultTmpl.name,
    JSON.stringify(flatFields),
    'system',
    new Date()
  ]);
  
  SpreadsheetApp.flush();
  
  return {
    success: true,
    message: "Template structure fixed",
    templateId: defaultTmpl.id,
    fieldCount: flatFields.length
  };
}
