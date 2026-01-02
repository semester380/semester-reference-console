/**
 * API Bridge (formerly gas.ts)
 * Handles communication between React and Google Apps Script
 */

import type { Template } from '../types';
import { CONFIG } from './config';

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
    analyseReference: (requestId: string) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('[Mock] Analysing reference:', requestId);
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

// Production v96 - SECURE + TEMPLATE SEEDED + RBAC
const gasBaseUrl = CONFIG.GAS_BASE_URL;


export const runGAS = async (functionName: string, ...args: unknown[]) => {
    const useMocks = CONFIG.USE_MOCKS;

    if (useMocks) {
        console.log(`[GAS Mock] Calling ${functionName} with:`, args);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((mockGAS as any)[functionName]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return ((mockGAS as any)[functionName])(...args);
        } else {
            console.warn(`[GAS Mock] Function ${functionName} not implemented`);
            return { success: true, message: 'Mock Success' };
        }
    }

    // Construct payload
    const argsMap = args[0] as Record<string, unknown> || {};
    const payload = {
        action: functionName,
        ...argsMap,
        adminKey: CONFIG.ADMIN_API_KEY
    };

    // Use POST to avoid URL length limits (e.g. Signatures, Files)
    try {
        const response = await fetch(gasBaseUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            // Important: GAS handles 'text/plain' better for CORS in some cases, 
            // but standard 'application/json' usually triggers preflight.
            // We'll use no-cors-like behavior if possible, but we need the response.
            // GAS Web App CORS allows requests from everywhere usually.
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success === false) {
            throw new Error(data.error || 'Server reported failure');
        }

        return data;

    } catch (e: unknown) {
        console.error('GAS API Error:', e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw errorMessage;
    }
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
    runGAS(functionName, params).then(onSuccess).catch(onError);
};
