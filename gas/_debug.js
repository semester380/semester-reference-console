
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
