/**
 * GAS Client Utilities
 * Handles communication between React and Google Apps Script
 */

// Mock implementation for local development
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
                        status: 'PENDING_CONSENT',
                        createdAt: new Date().toISOString()
                    }
                ]);
            }, 800);
        });
    }
};

export const runGAS = (functionName: string, ...args: unknown[]) => {
    return new Promise((resolve, reject) => {
        if (import.meta.env.DEV) {
            // Local development mock
            console.log(`[GAS Mock] Calling ${functionName} with:`, args);
            if (mockGAS[functionName as keyof typeof mockGAS]) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (mockGAS[functionName as keyof typeof mockGAS] as any)(...args).then(resolve).catch(reject);
            } else {
                console.warn(`[GAS Mock] Function ${functionName} not implemented`);
                resolve({ success: true });
            }
        } else {
            // Production GAS environment
            // @ts-expect-error - GAS environment global
            if (!window.google || !window.google.script) {
                reject(new Error('GAS environment not found'));
                return;
            }

            // @ts-expect-error - GAS environment global
            window.google.script.run
                .withSuccessHandler(resolve)
                .withFailureHandler(reject)[functionName](...args);
        }
    });
};
