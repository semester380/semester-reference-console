
const fs = require('fs');

async function main() {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyncjKFGRUoessq3Okkq84f2iQ9cdQnXmj31LClYelJNOR1rONvdSWcrinCzRj-a2eC/exec';
    const CONSENT_TOKEN = '4bf423c3-fdc7-4b45-9b38-266446f072af';

    console.log('1. Fetching Referee Token...');
    const linkResp = await fetch(`${SCRIPT_URL}?action=audit_get_referee_link&token=${CONSENT_TOKEN}`);
    const linkText = await linkResp.text();
    console.log('   Response:', linkText);


    // Extract UUID from link or raw response
    let refereeToken = "";
    const tokenMatch = linkText.match(/token=([0-9a-fA-F-]+)/);
    if (tokenMatch) {
        refereeToken = tokenMatch[1];
    } else if (linkText.trim().length === 36) {
        refereeToken = linkText.trim();
    } else {
        console.error('FAILED: Could not extract referee token from:', linkText);
        return;
    }
    console.log('   Referee Token:', refereeToken);

    console.log('2. Submitting Stress Test Reference...');
    const longText = "STRESS TEST PDF GENERATION. " + "This is a long line to test pagination. ".repeat(40);

    const payload = {
        action: 'submitReference', // Important: Matches handleApiRequest
        token: refereeToken,
        method: 'form',
        responses: {
            jobTitle: "PDF Sync Test 2026 (Node)",
            dateStarted: "2020-01-01",
            dateEnded: "2023-01-01",
            salary: "50000",
            reasonForLeaving: "Contract Ended",
            disciplinaryAction: false,
            safeguardingConcerns: false,
            suitableForRole: 5,
            reliability: 5,
            punctuality: 5,
            honesty: 5,
            attitude: 5,
            initiative: 5,
            communication: 5,
            serviceLength: 5,
            furtherInfo: longText,
            refereeName: "QA Bot Programmatic",
            refereePosition: "Automated Tester",
            refereeCompany: "Semester QA",
            refereeEmailConfirm: "qa_auto@example.com",
            refereeTelephone: "0123456789",
            signature: { dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", timestamp: new Date().toISOString() }
        }
    };

    // doPost expects a POST request.
    // Google Apps Script requires following redirects for POST? Usually fetch handles valid redirects.
    // But strictly, we post to the /exec URL.

    const submitResp = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
        // Content-Type application/json is usually handled by GAS if we use `payload = JSON.parse(e.postData.contents)`
        // but handleApiRequest logic: `if (e.postData && e.postData.contents) { ... }`
    });

    const submitText = await submitResp.text();
    console.log('   Submit Response:', submitText);

    try {
        const json = JSON.parse(submitText);
        if (!json.success) {
            console.error("   Submission FAILED:", json);
            return;
        }
    } catch (e) {
        // Sometimes GAS returns HTML redirect page if not followed, but fetch follows by default.
        // If text is not JSON, might be error page.
        if (!submitText.includes('success')) {
            console.log("   Warning: Response might not be JSON or Success. Proceeding to check PDF anyway.");
        }
    }

    console.log('3. Waiting 10s for PDF Generation...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('4. Fetching PDF Base64...');
    // Loop a few times
    for (let i = 0; i < 3; i++) {
        const pdfResp = await fetch(`${SCRIPT_URL}?action=audit_get_pdf_base64&token=${CONSENT_TOKEN}`);
        const pdfBase64 = await pdfResp.text();

        if (!pdfBase64.includes("Not Found") && !pdfBase64.includes("No PDF ID") && pdfBase64.length > 1000) {
            console.log('   SUCCESS: PDF Content Found! Length:', pdfBase64.length);
            fs.writeFileSync('test_output.pdf', Buffer.from(pdfBase64, 'base64'));
            console.log('   Saved to test_output.pdf');
            return;
        } else {
            console.log(`   Attempt ${i + 1}: ${pdfBase64.substring(0, 50)}...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    console.error("FAILED to retrieve PDF after 3 attempts.");

}

main().catch(console.error);
