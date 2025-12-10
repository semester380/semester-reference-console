/**
 * Diagnostic function to inspect template data
 */
function inspectTemplates() {
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TEMPLATES);
  
  if (!sheet) {
    return { success: false, error: "Template sheet not found" };
  }
  
  const data = sheet.getDataRange().getValues();
  const rows = [];
  
  for (let i = 0; i < Math.min(data.length, 5); i++) {
    rows.push({
      row: i + 1,
      templateId: data[i][0],
      name: data[i][1],
      structureJSON: data[i][2] ? data[i][2].substring(0, 200) + '...' : 'EMPTY',
      createdBy: data[i][3],
      timestamp: data[i][4]
    });
  }
  
  return {
    success: true,
    totalRows: data.length,
    rows: rows,
    firstTemplateFullJSON: data.length > 1 ? data[1][2] : null
  };
}
