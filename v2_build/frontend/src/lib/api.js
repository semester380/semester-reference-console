
const PROXY_URL = 'http://localhost:3001/api';

/**
 * Call the Proxy API
 * @param {string} action - The backend action name (e.g. 'verifyStaff')
 * @param {object} payload - Data to send
 * @param {string|null} userEmail - Optional staff email for identity
 */
export async function callAction(action, payload = {}, userEmail = null) {
    try {
        const finalPayload = { ...payload };
        if (userEmail) {
            finalPayload.userEmail = userEmail;
        }

        const res = await fetch(`${PROXY_URL}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(finalPayload),
        });

        if (!res.ok) {
            // HTTP Error (Network, 500, etc)
            const text = await res.text();
            throw new Error(`Network Error: ${res.status} ${text}`);
        }

        const json = await res.json();

        // Logic Error (GAS returned { success: false, error: ... })
        if (!json.success && json.error) {
            throw new Error(json.error);
        }

        return json;

    } catch (err) {
        console.error(`[API] ${action} Failed:`, err);
        return { success: false, error: err.message };
    }
}
