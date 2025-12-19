
function testDebugEmail() {
    const email = "rob@semester.co.uk";
    const name = "Rob Tester";
    const token = "DEBUG-TOKEN-123";
    const refereeName = "John Doe";

    console.log("Attempting to send email to " + email);
    try {
        sendAuthorizationEmail(email, name, token, refereeName);
        console.log("Email sent successfully.");
        return "Success";
    } catch (e) {
        console.error("Error sending email: " + e.toString());
        return "Error: " + e.toString();
    }
}

function debugDumpRequests() {
    const ss = getDatabaseSpreadsheet();
    const requestsSheet = ss.getSheetByName(SHEET_REQUESTS);
    const data = requestsSheet.getDataRange().getValues();
    const headers = data[0];

    const colConsentToken = headers.indexOf("ConsentToken");
    const colRefereeToken = headers.indexOf("RefereeToken");
    const colRefereeEmail = headers.indexOf("RefereeEmail");
    const colStatus = headers.indexOf("Status");
    const colRequestID = headers.indexOf("RequestID");

    const lastRows = data.slice(-5);
    return lastRows.map((row, i) => ({
        row: data.length - 5 + i + 1,
        id: row[colRequestID],
        status: row[colStatus],
        consentToken: row[colConsentToken],
        refereeToken: row[colRefereeToken],
        email: row[colRefereeEmail]
    }));
}
