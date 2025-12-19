
function getDebugLogs() {
  const ss = SpreadsheetApp.open(DriveApp.getFilesByName("SRC_Database").next());
  const sheet = ss.getSheetByName("Debug_Log");
  if (!sheet) return "No logs found";
  return sheet.getDataRange().getValues();
}
