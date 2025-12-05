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
    }
};

/**
 * Generic runner for GAS functions
 */
export const runGAS = (functionName: string, ...args: unknown[]) => {
    return new Promise((resolve, reject) => {
        const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
        // Hardcoded URL to ensure Vercel uses the correct active deployment (v40+)
        const gasBaseUrl = 'https://script.google.com/macros/s/AKfycbxLfH_xrN0vYEKZYC7W-8OzDwHJ_8V8bAJvzGG3FJRDnAHrcM4XUWWasLPY176f7Hz5/exec';

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
            if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
                Object.assign(payload, args[0]);
            } else if (args.length === 1 && typeof args[0] === 'string') {
                // Single primitive argument
                if (functionName === 'sealRequest' || functionName === 'getRequest' || functionName === 'getAuditTrail' || functionName === 'runAnalysis') {
                    payload.requestId = args[0];
                } else {
                    payload.token = args[0];
                }
            } else if (args.length === 1 && Array.isArray(args[0])) {
                // Array argument - for bulk action functions
                if (functionName === 'archiveRequests' || functionName === 'unarchiveRequests' || functionName === 'deleteRequests') {
                    payload.requestIds = args[0];
                } else {
                    payload.data = args[0];
                }
            } else if (args.length > 1) {
                if (functionName === 'submitReference') {
                    // Map arguments for submitReference: token, responses, method, declineReason, declineDetails, uploadedFileUrl, fileName
                    payload.token = args[0];
                    payload.responses = args[1];
                    if (args[2]) payload.method = args[2];
                    if (args[3]) payload.declineReason = args[3];
                    if (args[4]) payload.declineDetails = args[4];
                    if (args[5]) payload.uploadedFileUrl = args[5];
                    if (args[6]) payload.fileName = args[6];
                } else if (functionName === 'authorizeConsent') {
                    payload.token = args[0];
                    payload.decision = args[1];
                } else if (functionName === 'uploadReferenceDocument') {
                    // Payload is already an object with token, fileData, fileName, mimeType
                    Object.assign(payload, args[0]);
                } else {
                    // For other functions with multiple args, map them to named parameters
                    payload.data = args;
                }
            }

            console.log('[GAS Live] Payload:', JSON.stringify(payload, null, 2));

            fetch(gasBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload),
                mode: 'cors',
            })
                .then(response => response.json())
                .then(result => {
                    console.log(`[GAS Live] Result for ${functionName}:`, result);
                    resolve(result);
                })
                .catch(err => {
                    console.error(`[GAS Live] Error for ${functionName}:`, err);
                    reject(err);
                });
        } else {
            reject(new Error('GAS backend URL not configured. Set VITE_GAS_BASE_URL in .env'));
        }
    });
};
