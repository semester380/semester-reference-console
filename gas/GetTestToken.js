
function getTestToken() {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_REQUESTS);
    // Find the last request and return its referee token
    // Or create a new one
    const requestId = Utilities.getUuid();
    const token = Utilities.getUuid();
    const now = new Date();

    // Append a dummy request
    sheet.appendRow([
        requestId,
        'Browser Test Candidate',
        'candidate@test.com',
        'Browser Test Referee',
        'referee@test.com',
        'rob@semester.co.uk',
        'CONSENT_GIVEN', // Status
        'GIVEN', // ConsentStatus
        now,
        'CONSENT_TOKEN',
        new Date(now.getTime() + 3600000),
        token, // Referee Token
        new Date(now.getTime() + 3600000 * 72),
        'standard-social-care', // Template ID
        now,
        now
    ]);

    return token;
}
