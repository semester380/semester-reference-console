/**
 * API Bridge (formerly gas.ts)
 * Handles communication between React and Google Apps Script
 */

import type { Template } from '../types';

// Mock Data
const MOCK_TEMPLATES: Template[] = [
    {
        templateId: 'default',
        name: 'Standard Employment Reference',
        active: true,
        structureJSON: [
            { id: 'q1', type: 'rating', label: 'Technical Competence', required: true },
            { id: 'q2', type: 'rating', label: 'Communication Skills', required: true },
            { id: 'q3', type: 'boolean', label: 'Would you rehire this person?', required: true },
            { id: 'q4', type: 'text', label: 'Additional Comments', required: false },
            { id: 'sig1', type: 'signature', label: 'I confirm this reference is accurate', required: true }
        ]
    }
];

// Mock AI Analysis Results
const MOCK_AI_ANALYSIS = {
    sentiment: 'Positive',
    summary: 'The reference demonstrates strong technical competence and excellent communication skills. The referee expressed willingness to rehire, indicating high satisfaction with the candidate\'s performance.',
    anomalies: []
};

// Mock Implementation
const mockGAS = {
    initiateRequest: () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, requestId: 'mock-id-' + Date.now() });
            }, 1000);
        });
    },
    getMyRequests: () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        requestId: 'mock-1',
                        candidateName: 'John Doe',
                        candidateEmail: 'john@example.com',
                        refereeName: 'Jane Smith',
                        refereeEmail: 'jane@company.com',
                        status: 'Completed',
                        consentStatus: true,
                        anomalyFlag: false,
                        token: 'test-token-001',
                        candidateToken: 'consent-token-001',
                        refereeToken: 'referee-token-001',
                        createdAt: new Date(Date.now() - 86400000).toISOString(),
                        responses: {
                            q1: 5,
                            q2: 4,
                            q3: true,
                            q4: 'Excellent candidate with strong technical skills and great team collaboration.',
                            signature1: {
                                typedName: 'Jane Smith',
                                signedAt: new Date().toISOString(),
                                signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                            }
                        }
                    },
                    {
                        requestId: 'mock-2',
                        candidateName: 'Alice Johnson',
                        candidateEmail: 'alice@example.com',
                        refereeName: 'Bob Wilson',
                        refereeEmail: 'bob@company.com',
                        status: 'Declined',
                        consentStatus: true,
                        anomalyFlag: true,
                        token: 'test-token-002',
                        candidateToken: 'consent-token-002',
                        refereeToken: 'referee-token-002',
                        createdAt: new Date(Date.now() - 43200000).toISOString(),
                        responses: {
                            declineReason: 'policy',
                            declineDetails: 'Company policy prohibits providing detailed references.'
                        }
                    },
                    {
                        requestId: 'mock-3',
                        candidateName: 'Charlie Brown',
                        candidateEmail: 'charlie@example.com',
                        refereeName: 'Diana Prince',
                        refereeEmail: 'diana@company.com',
                        status: 'Completed',
                        consentStatus: true,
                        anomalyFlag: false,
                        token: 'test-token-003',
                        candidateToken: 'consent-token-003',
                        refereeToken: 'referee-token-003',
                        createdAt: new Date(Date.now() - 172800000).toISOString(),
                        responses: {
                            fileName: 'reference_letter.pdf',
                            uploadedFileUrl: 'https://example.com/mock-upload.pdf'
                        }
                    }
                ]);
            }, 800);
        });
    },
    getTemplates: () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_TEMPLATES);
            }, 600);
        });
    },
    saveTemplate: (name: string, structure: unknown) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('[Mock] Saved Template:', name, structure);
                resolve({ success: true, templateId: 'mock-tpl-' + Date.now() });
            }, 800);
        });
    },
    validateRefereeToken: (token: string) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (token === 'invalid') {
                    resolve({ valid: false, error: 'Token expired or invalid' });
                } else {
                    resolve({
                        valid: true,
                        candidateName: 'John Doe',
                        template: MOCK_TEMPLATES[0]
                    });
                }
            }, 1000);
        });
    },
    submitReference: (token: string, responses: unknown) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('[Mock] Submitted Reference:', token, responses);
                resolve({ success: true });
            }, 1500);
        });
    },
    sealRequest: (requestId: string) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('[Mock] Sealed Request:', requestId);
                resolve({ success: true, pdfUrl: 'https://example.com/mock-reference.pdf' });
            }, 1000);
        });
    },
    getAuditTrail: () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { auditId: '1', timestamp: new Date(Date.now() - 100000).toISOString(), actor: 'requester@example.com', action: 'REQUEST_INITIATED', metadata: '{}' },
                    { auditId: '2', timestamp: new Date(Date.now() - 50000).toISOString(), actor: 'Candidate', action: 'CONSENT_GIVEN', metadata: '{}' },
                    { auditId: '3', timestamp: new Date(Date.now() - 10000).toISOString(), actor: 'Referee', action: 'REFERENCE_SUBMITTED', metadata: '{}' }
                ]);
            }, 800);
        });
    },
    analyzeReference: (requestId: string) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('[Mock] Analyzing reference:', requestId);
                resolve({
                    success: true,
                    analysis: MOCK_AI_ANALYSIS
                });
            }, 1500);
        });
    },
    verifyStaff: (email: string) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (email?.endsWith('@semester.co.uk')) {
                    resolve({
                        success: true,
                        user: { name: 'Mock User', email, role: 'Admin' }
                    });
                } else {
                    resolve({ success: false, error: 'User not found in mock DB' });
                }
            }, 500);
        });
    }
};

/**
 * Generic runner for GAS functions
 */
// Helper for on-screen logging
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debugLog = (msg: string) => {
    console.log('[API DEBUG] ' + msg);
    try {
        let div = document.getElementById('api-debug-log');
        if (!div) {
            div = document.createElement('div');
            div.id = 'api-debug-log';
            div.style.cssText = 'position:fixed;bottom:0;right:0;width:400px;height:300px;background:rgba(0,0,0,0.8);color:#0f0;font-family:monospace;font-size:10px;overflow:auto;z-index:999999;pointer-events:none;padding:10px;';
            document.body.appendChild(div);
        }
        const line = document.createElement('div');
        line.innerText = new Date().toISOString().split('T')[1].slice(0, -1) + ': ' + msg;
        div.prepend(line);
    } catch (e) { /* ignore */ }
};

export const runGAS = (functionName: string, ...args: unknown[]) => {
    debugLog(`runGAS called: ${functionName}`);
    return new Promise((resolve, reject) => {
        const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
        // Production v96
        const GAS_DEPLOYMENT_ID = 'AKfycbzH8Cbgot_NYyEY0E_Mj19xkNDv67o81b3wXCU_jYOODAKIMmJQb3q8ciujoaF0zVve';
        const gasBaseUrl = `https://script.google.com/macros/s/${GAS_DEPLOYMENT_ID}/exec`;

        if (useMocks) {
            console.log(`[GAS Mock] Calling ${functionName} with:`, args);
            if (mockGAS[functionName as keyof typeof mockGAS]) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (mockGAS[functionName as keyof typeof mockGAS] as any)(...args).then(resolve).catch(reject);
            } else {
                resolve({ success: true, message: 'Mock Success' });
            }
            return;
        }

        // Construct payload
        const argsMap = args[0] as Record<string, unknown> || {};
        const jsonPayload = JSON.stringify({
            action: functionName,
            ...argsMap,
            adminKey: 'uO4KpB7Zx9qL1Fs8cYp3rN5wD2mH6vQ0TgE9jS4aB8kR1nC5uL7zX2pY6'
        });

        // JSONP Implementation
        const callbackName = `gasCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        debugLog(`Generated: ${callbackName}`);

        const separator = gasBaseUrl.includes('?') ? '&' : '?';
        const url = `${gasBaseUrl}${separator}action=${encodeURIComponent(functionName)}&callback=${callbackName}&jsonPayload=${encodeURIComponent(jsonPayload)}`;
        debugLog(`URL: ${url.substring(0, 100)}...`);

        // Cleanup
        let timeoutId: number;
        const cleanup = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any)[callbackName];
            const script = document.getElementById(callbackName);
            if (script) script.remove();
            if (timeoutId) clearTimeout(timeoutId);
        };

        // Callback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)[callbackName] = (response: any) => {
            debugLog(`CALLBACK FIRED! Success: ${response?.success}`);
            cleanup();
            if (response && response.success) {
                resolve(response);
            } else {
                debugLog(`Error: ${JSON.stringify(response)}`);
                reject(response?.error || 'Unknown error');
            }
        };

        // Script creation
        const script = document.createElement('script');
        script.src = url;
        script.id = callbackName;
        script.onerror = () => {
            debugLog('SCRIPT ERROR event fired');
            cleanup();
            reject(new Error('Script load failed'));
        };
        script.onload = () => { debugLog('Script onload'); };

        document.body.appendChild(script);
        debugLog('Script appended');

        // Timeout
        timeoutId = window.setTimeout(() => {
            debugLog('TIMEOUT reached');
            cleanup();
            reject(new Error(`Timeout waiting for ${functionName}`));
        }, 30000);
    });
};
return new Promise((resolve, reject) => {
    const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
    // Production v96 - SECURE + TEMPLATE SEEDED + RBAC
    const GAS_DEPLOYMENT_ID = 'AKfycbzH8Cbgot_NYyEY0E_Mj19xkNDv67o81b3wXCU_jYOODAKIMmJQb3q8ciujoaF0zVve';
    const gasBaseUrl = `https://script.google.com/macros/s/${GAS_DEPLOYMENT_ID}/exec`;

    if (useMocks) {
        // Local development mock
        console.log(`[GAS Mock] Calling ${functionName} with:`, args);
        if (mockGAS[functionName as keyof typeof mockGAS]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mockGAS[functionName as keyof typeof mockGAS] as any)(...args).then(resolve).catch(reject);
        } else {
            console.warn(`[GAS Mock] Function ${functionName} not implemented`);
            resolve({ success: true });
        }
    } else if (gasBaseUrl) {
        // Live GAS backend via HTTP
        console.log(`[GAS Live] Calling ${functionName} with:`, args);

        // Convert args to payload object
        const payload: Record<string, unknown> = { action: functionName };

        // Inject Auth Credentials
        // Inject Auth Credentials (SKIP for public endpoints)
        const PUBLIC_ENDPOINTS = [
            'healthCheck',
            'processCandidateConsent',
            'validateRefereeToken',
            'submitReference',
            'uploadReferenceDocument',
            'getTemplates',
            'authorizeConsent',
            'getDefaultTemplate'
        ];

        const requiresAuth = !PUBLIC_ENDPOINTS.includes(functionName);

        // Special case: verifyStaff is public (pre-auth) but requires adminKey
        const requiresAdminKey = requiresAuth || functionName === 'verifyStaff';

        if (requiresAdminKey) {
            const adminKey = import.meta.env.VITE_ADMIN_API_KEY;
            if (adminKey) payload.adminKey = adminKey;
        }

        if (requiresAuth) {
            const storedUser = localStorage.getItem('src_user');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (user && user.email) {
                        payload.userEmail = user.email;
                    }
                } catch (e) {
                    console.error('Failed to parse stored user for auth injection', e);
                }
            }
        }

        if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
            Object.assign(payload, args[0]);
        } else if (args.length === 1 && typeof args[0] === 'string') {
            // Single primitive argument
            if (functionName === 'sealRequest' || functionName === 'getRequest' || functionName === 'getAuditTrail' || functionName === 'runAnalysis') {
                payload.requestId = args[0];
                return;
            }

            // Construct payload
            const argsMap = args[0] as Record<string, unknown> || {};
            const jsonPayload = JSON.stringify({
                action: functionName,
                ...argsMap,
                // Add admin key if needed (simulated for auth context)
                adminKey: 'uO4KpB7Zx9qL1Fs8cYp3rN5wD2mH6vQ0TgE9jS4aB8kR1nC5uL7zX2pY6'
            });

            // JSONP Implementation
            const callbackName = `gasCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            debugLog(`Generated: ${callbackName}`);

            const separator = gasBaseUrl.includes('?') ? '&' : '?';
            const url = `${gasBaseUrl}${separator}action=${encodeURIComponent(functionName)}&callback=${callbackName}&jsonPayload=${encodeURIComponent(jsonPayload)}`;
            debugLog(`URL: ${url.substring(0, 100)}...`);

            // Cleanup
            let timeoutId: number;
            const cleanup = () => {
                delete (window as any)[callbackName];
                const script = document.getElementById(callbackName);
                if (script) script.remove();
                if (timeoutId) clearTimeout(timeoutId);
            };

            // Callback
            (window as any)[callbackName] = (response: any) => {
                debugLog(`CALLBACK FIRED! Success: ${response?.success}`);
                cleanup();
                if (response && response.success) {
                    resolve(response);
                } else {
                    debugLog(`Callback Error: ${JSON.stringify(response)}`);
                    reject(response?.error || 'Unknown error from GAS');
                }
            };

            // Script creation
            const script = document.createElement('script');
            script.src = url;
            script.id = callbackName;
            script.onerror = (error) => {
                debugLog('SCRIPT ERROR event fired');
                cleanup();
                reject(new Error('Script load failed (Network/Blocking)'));
            };
            script.onload = () => {
                debugLog('Script onload fired');
            };

            document.body.appendChild(script);
            debugLog('Script appended');

            // Timeout
            timeoutId = window.setTimeout(() => {
                debugLog('TIMEOUT reached');
                cleanup();
                reject(new Error(`Timeout waiting for ${functionName}`));
            }, 30000);
        });
};

/**
 * Callback-based runner for GAS functions to bypass Promise resolution issues
 */
export const runGASCallback = (
    functionName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => void
) => {
    const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
    const gasBaseUrl = 'https://script.google.com/macros/s/AKfycbzH8Cbgot_NYyEY0E_Mj19xkNDv67o81b3wXCU_jYOODAKIMmJQb3q8ciujoaF0zVve/exec';

    if (useMocks) {
        console.log(`[GAS Mock] Calling ${functionName} with:`, params);
        if (mockGAS[functionName as keyof typeof mockGAS]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mockGAS[functionName as keyof typeof mockGAS] as any)(params)
                .then(onSuccess)
                .catch(onError);
        } else {
            console.warn(`[GAS Mock] Function ${functionName} not implemented`);
            onSuccess({ success: true });
        }
        return;
    }

    if (!gasBaseUrl) {
        onError(new Error('GAS backend URL not configured'));
        return;
    }

    console.log(`[GAS Live Callback] Calling ${functionName} with:`, params);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { action: functionName };

    // Inject Auth/Admin Key
    const PUBLIC_ENDPOINTS = [
        'healthCheck', 'processCandidateConsent', 'validateRefereeToken',
        'submitReference', 'uploadReferenceDocument', 'getTemplates',
        'authorizeConsent', 'getDefaultTemplate'
    ];

    if (!PUBLIC_ENDPOINTS.includes(functionName) || functionName === 'verifyStaff') {
        payload.adminKey = import.meta.env.VITE_ADMIN_API_KEY;
        const storedUser = localStorage.getItem('src_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user?.email) payload.userEmail = user.email;
            } catch { /* ignore */ }
        }
    }

    // Merge params
    if (params) {
        // Handle different param types similar to runGAS if needed, 
        // but typically params is just an object to merge
        Object.assign(payload, params);
    }

    console.log('[GAS Live Callback] Payload:', JSON.stringify(payload, null, 2));

    const callbackName = `gasCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[callbackName] = (response: any) => {
        console.log(`[GAS Live Callback] ${callbackName} EXECUTED`, response);
        cleanup();

        if (response && response.success) {
            onSuccess(response);
        } else {
            console.error(`[GAS Live Callback] Error:`, response);
            onError(response?.error || 'Unknown error');
        }
    };

    // Construct URL
    const jsonPayload = JSON.stringify(payload);
    const script = document.createElement('script');
    const separator = gasBaseUrl.includes('?') ? '&' : '?';
    script.src = `${gasBaseUrl}${separator}callback=${callbackName}&jsonPayload=${encodeURIComponent(jsonPayload)}`;

    script.onerror = (err) => {
        cleanup();
        console.error(`[GAS Live Callback] Script load error:`, err);
        onError('Failed to load GAS script');
    };

    document.body.appendChild(script);

    function cleanup() {
        // @ts-expect-error - dynamic delete
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
    }
};
