/**
 * Application Configuration
 * Centralizes environment variables and provides fallbacks for production reliability
 */

// Current Deployment: @209 - Fixed PDF Download Payload
export const WORKING_GAS_ID = 'AKfycbw7F-NmvSVO8peVIjt7WaxKuvrKnSxXnbiNGvHWvb8DBJy-bu1mI7G8CU8s-9kSOZnI';

// Known broken IDs to ignore if they appear in environment variables
const BROKEN_GAS_IDS = [
    'AKfycbw_bRkR4pDtIDtQv2mP8bSoB1ZqQDSkOVndaEgfluA8QEPf-9azWjb7L6-BVHHGsAtb',
    'AKfycbzuzXVqL74-ikBAfNMyAgBwwPXqFBxleHXrF4makw4i7TCjwnlay3J1h4aMsA-dHsvZ'
];

function getGasBaseUrl() {
    const envUrl = import.meta.env.VITE_GAS_BASE_URL;

    // If env var is missing or contains a known broken ID, use the working fallback
    // If env var is missing or contains a known broken ID, use the working fallback
    if (!envUrl || BROKEN_GAS_IDS.some(id => envUrl.includes(id))) {
        // Fallback is expected in some environments where env vars aren't set
        // We only warn if we are strictly in dev mode to help debugging
        if (import.meta.env.DEV) {
            console.info('[Config] Using fallback GAS deployment ID (Production ID)');
        }
        return `https://script.google.com/macros/s/${WORKING_GAS_ID}/exec`;
    }

    return envUrl;
}

export const CONFIG = {
    GAS_BASE_URL: getGasBaseUrl(),
    ADMIN_API_KEY: import.meta.env.VITE_ADMIN_API_KEY || 'uO4KpB7Zx9qL1Fs8cYp3rN5wD2mH6vQ0TgE9jS4aB8kR1nC5uL7zX2pY6',
    IS_DEV: import.meta.env.DEV,
    USE_MOCKS: import.meta.env.VITE_USE_MOCKS === 'true'
};
