
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const GAS_URL = process.env.GAS_URL;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Security: Endpoints that require Admin Key
const ADMIN_PROTECTED_ACTIONS = [
    // Staff Actions
    'initiateRequest', 'getMyRequests', 'getRequest', 'getAuditTrail', 'downloadPdfPayload',
    // Admin Actions
    'listStaff', 'sealRequest', 'archiveRequests'
];

app.use(cors());
app.use(express.json());

// Proxy Endpoint
app.post('/api/:action', async (req, res) => {
    const action = req.params.action;
    const clientPayload = req.body || {};

    console.log(`[PROXY] Action: ${action}`);

    // 1. Construct GAS Payload
    const gasPayload = {
        action: action,
        ...clientPayload
    };

    // 2. Security Injection
    if (ADMIN_PROTECTED_ACTIONS.includes(action) || action === 'verifyStaff') {
        if (!ADMIN_API_KEY) {
            console.error('[PROXY] Error: ADMIN_API_KEY not configured.');
            return res.status(500).json({ success: false, error: 'Server configuration error' });
        }
        gasPayload.adminKey = ADMIN_API_KEY;
        console.log(`[PROXY] Injected Admin Key for ${action}`);
    }

    // 3. Forward to GAS
    try {
        if (!GAS_URL) {
            throw new Error("GAS_URL not configured");
        }

        const response = await fetch(GAS_URL, {
            method: 'POST',
            redirect: 'follow', // Important for GAS
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gasPayload)
        });

        const text = await response.text();

        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            console.error('[PROXY] Invalid JSON from GAS:', text.substring(0, 100));
            // Check for HTML error pages
            if (text.includes("<!DOCTYPE html>")) {
                return res.status(502).json({ success: false, error: 'Bad Gateway: Received HTML instead of JSON (Check deployment URL)' });
            }
            return res.status(502).json({ success: false, error: 'Bad Gateway: Invalid response from backend' });
        }

        // 4. Return to Client
        res.json(json);

    } catch (err) {
        console.error('[PROXY] Request Failed:', err);
        res.status(500).json({ success: false, error: 'Proxy request failed: ' + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Target GAS URL: ${GAS_URL ? 'Configured' : 'MISSING'}`);
});
