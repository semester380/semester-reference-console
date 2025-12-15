
import React, { useState, useEffect } from 'react';
import { Card, Loader } from '../components/UI';
import { DynamicForm } from '../components/DynamicForm';
import { Logo } from '../components/Logo';
import { runGAS } from '../lib/api';
import { Header } from '../components/Header';

import type { Template } from '../types';

const RefereePortal: React.FC = () => {
    const [view, setView] = useState<'choice' | 'form' | 'upload' | 'decline' | 'consent'>('choice');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [candidateName, setCandidateName] = useState<string>('');
    const [template, setTemplate] = useState<Template | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    const [declineDetails, setDeclineDetails] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const action = params.get('action');

        if (!token) {
            setError('Missing access token. Please check the link in your email.');
            setIsLoading(false);
            return;
        }

        if (action === 'authorize') {
            setView('consent');
            // For consent, we don't validate against validateRefereeToken
            // We could validate against a validateConsentToken if it existed, 
            // but for now we'll trust the token and let the action validate it.
            // Or we can fetch candidate name if possible.
            // Since we don't have a specific validateConsentToken API that returns info without action,
            // we will just show the consent screen.
            setIsLoading(false);
        } else {
            validateToken(token);
        }
    }, []);

    const validateToken = async (token: string) => {
        try {
            const result = await runGAS('validateRefereeToken', { token }) as { valid: boolean; candidateName: string; template: Template; error?: string };

            if (result.valid) {
                setCandidateName(result.candidateName);
                setTemplate(result.template);
            } else {
                setError(result.error || 'Invalid or expired token.');
            }
        } catch {
            setError('Failed to load reference form. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (responses: Record<string, unknown>) => {
        setIsSubmitting(true);
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        try {
            const result = await runGAS('submitReference', { token, responses }) as { success: boolean; error?: string };
            if (result.success) {
                setIsSuccess(true);
            } else {
                alert('Submission failed: ' + result.error);
            }
        } catch {
            alert('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        // Validate file size (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024;
        if (uploadFile.size > maxSize) {
            alert('File size exceeds 5MB limit. Please choose a smaller file.');
            return;
        }

        setIsSubmitting(true);

        try {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');

            // Read file as base64
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64Data = reader.result as string;
                    // Remove data URL prefix (e.g., "data:application/pdf;base64,")
                    const base64Content = base64Data.split(',')[1];

                    const result = await runGAS('uploadReferenceDocument', {
                        token,
                        fileData: base64Content,
                        fileName: uploadFile.name,
                        mimeType: uploadFile.type
                    }) as { success: boolean; error?: string };

                    if (result.success) {
                        setIsSuccess(true);
                    } else {
                        alert('Upload failed: ' + (result.error || 'Unknown error'));
                    }
                } catch (err) {
                    console.error('Upload error:', err);
                    alert('An error occurred during upload. Please try again.');
                } finally {
                    setIsSubmitting(false);
                }
            };

            reader.onerror = () => {
                alert('Failed to read file. Please try again.');
                setIsSubmitting(false);
            };

            reader.readAsDataURL(uploadFile);
        } catch (err) {
            console.error('Upload error:', err);
            alert('An error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };


    const handleDeclineSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        try {
            const result = await runGAS('submitReference', {
                token,
                responses: {},
                method: 'decline',
                declineReason,
                declineDetails
            }) as { success: boolean; error?: string };
            if (result.success) {
                setIsSuccess(true);
            } else {
                alert('Submission failed: ' + result.error);
            }
        } catch {
            alert('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConsent = async (decision: 'CONSENT_GIVEN' | 'CONSENT_DECLINED') => {
        setIsSubmitting(true);
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        try {
            const result = await runGAS('authorizeConsent', { token, decision }) as { success: boolean; error?: string };
            if (result.success) {
                setIsSuccess(true);
                // If declined, we might want to show a different message, but isSuccess=true handles generic success.
                // We can set a specific message state if needed.
            } else {
                setError(result.error || 'Failed to process consent.');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-nano-gray-50 flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-nano-gray-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center py-12 shadow-lg rounded-2xl">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-nano-gray-900 mb-2">Access Denied</h2>
                    <p className="text-nano-gray-600">{error}</p>
                </Card>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 selection:bg-semester-blue/20">
                <Header simple />
                <main className="max-w-3xl mx-auto px-4 py-12">
                    <Card className="w-full text-center py-12 shadow-lg rounded-2xl border-t-4 border-semester-blue">
                        <div className="text-5xl mb-6">✅</div>
                        <h2 className="text-2xl font-bold text-nano-gray-900 mb-3">Reference Submitted</h2>
                        <p className="text-nano-gray-600 leading-relaxed px-6">
                            Thank you for providing a reference for <strong className="text-nano-gray-900">{candidateName}</strong>.
                            Your input has been securely recorded.
                        </p>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 selection:bg-semester-blue/20">
            <Header simple />

            <main className="max-w-3xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex flex-col items-center mb-10">
                    <Logo variant="mark" className="mb-6 scale-125" />
                    <h1 className="text-3xl font-bold text-nano-gray-900 tracking-tight">Semester Reference</h1>
                    <p className="mt-3 text-lg text-nano-gray-600">
                        Reference for <span className="font-semibold text-semester-blue">{candidateName}</span>
                    </p>
                </div>

                {/* Content Area */}
                <div className="transition-all duration-300 ease-in-out">
                    {view === 'choice' && (
                        <div className="grid gap-6 md:grid-cols-3">
                            <button
                                onClick={() => setView('form')}
                                className="card card-hover text-left group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="text-6xl">📝</span>
                                </div>
                                <div className="text-4xl mb-4">📝</div>
                                <h3 className="text-lg font-bold text-nano-gray-900 mb-2">Complete Online Form</h3>
                                <p className="text-sm text-nano-gray-500">
                                    Fill out the structured reference form directly in your browser.
                                </p>
                            </button>

                            <button
                                onClick={() => setView('upload')}
                                className="card card-hover text-left group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="text-6xl">tj</span>
                                </div>
                                <div className="text-4xl mb-4">📂</div>
                                <h3 className="text-lg font-bold text-nano-gray-900 mb-2">Upload Document</h3>
                                <p className="text-sm text-nano-gray-500">
                                    Already have a reference letter? Upload it here (PDF, DOCX).
                                </p>
                            </button>

                            <button
                                onClick={() => setView('decline')}
                                className="card card-hover text-left group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="text-6xl">🚫</span>
                                </div>
                                <div className="text-4xl mb-4">🚫</div>
                                <h3 className="text-lg font-bold text-nano-gray-900 mb-2">Cannot Provide</h3>
                                <p className="text-sm text-nano-gray-500">
                                    Decline this request if you cannot provide a reference.
                                </p>
                            </button>
                        </div>
                    )}

                    {view === 'form' && (
                        <Card className="p-8 sm:p-10 shadow-xl rounded-2xl border border-nano-gray-100 relative">
                            <button
                                onClick={() => setView('choice')}
                                className="absolute top-6 right-6 text-nano-gray-400 hover:text-nano-gray-600 transition-colors"
                            >
                                ✕ Cancel
                            </button>
                            {template && (
                                <>
                                    {console.log('TEMPLATE_STRUCTURE:', JSON.stringify(template.structureJSON))}
                                    <DynamicForm
                                        structure={template.structureJSON}
                                        onSubmit={handleSubmit}
                                        isSubmitting={isSubmitting}
                                    />
                                </>
                            )}
                        </Card>
                    )}

                    {view === 'upload' && (
                        <Card className="p-8 sm:p-10 shadow-xl rounded-2xl border border-nano-gray-100 relative max-w-xl mx-auto">
                            <button
                                onClick={() => setView('choice')}
                                className="absolute top-6 right-6 text-nano-gray-400 hover:text-nano-gray-600 transition-colors"
                            >
                                ✕ Cancel
                            </button>
                            <h2 className="text-2xl font-bold text-nano-gray-900 mb-6">Upload Reference</h2>
                            <form onSubmit={handleUploadSubmit}>
                                <div className="border-2 border-dashed border-nano-gray-300 rounded-xl p-10 text-center hover:bg-nano-gray-50 transition-colors cursor-pointer mb-6 relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    />
                                    <div className="text-4xl mb-3">☁️</div>
                                    <p className="font-medium text-nano-gray-700 mb-1">
                                        {uploadFile ? uploadFile.name : 'Click or drag file to upload'}
                                    </p>
                                    <p className="text-sm text-nano-gray-400">PDF, DOC, DOCX (Max 5MB)</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!uploadFile || isSubmitting}
                                    className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Uploading...' : 'Upload Document'}
                                </button>
                            </form>
                        </Card>
                    )}

                    {view === 'decline' && (
                        <Card className="p-8 sm:p-10 shadow-xl rounded-2xl border border-nano-gray-100 relative max-w-xl mx-auto">
                            <button
                                onClick={() => setView('choice')}
                                className="absolute top-6 right-6 text-nano-gray-400 hover:text-nano-gray-600 transition-colors"
                            >
                                ✕ Cancel
                            </button>
                            <h2 className="text-2xl font-bold text-nano-gray-900 mb-6">Decline Reference</h2>
                            <form onSubmit={handleDeclineSubmit}>
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-nano-gray-700 mb-2">Reason</label>
                                    <select
                                        className="input"
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        required
                                    >
                                        <option value="">Select a reason...</option>
                                        <option value="policy">Company Policy</option>
                                        <option value="unknown">Don't know candidate well enough</option>
                                        <option value="conflict">Conflict of Interest</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="mb-8">
                                    <label className="block text-sm font-semibold text-nano-gray-700 mb-2">Additional Details (Optional)</label>
                                    <textarea
                                        className="input min-h-[100px]"
                                        value={declineDetails}
                                        onChange={(e) => setDeclineDetails(e.target.value)}
                                        placeholder="Please provide any additional context..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!declineReason || isSubmitting}
                                    className="btn-primary w-full py-3 text-lg bg-status-error hover:bg-red-700 focus:ring-red-500 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Confirm Decline'}
                                </button>
                            </form>
                        </Card>
                    )}

                    {view === 'consent' && (
                        <Card className="p-8 sm:p-10 shadow-xl rounded-2xl border border-nano-gray-100 relative max-w-xl mx-auto text-center">
                            <h2 className="text-2xl font-bold text-nano-gray-900 mb-4">Authorize Reference Request</h2>
                            <p className="text-nano-gray-600 mb-8 leading-relaxed">
                                A reference request has been initiated. Do you consent to us contacting the referee on your behalf?
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => handleConsent('CONSENT_GIVEN')}
                                    disabled={isSubmitting}
                                    className="btn-primary py-3 px-8 text-lg disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Processing...' : '✅ I Consent'}
                                </button>
                                <button
                                    onClick={() => handleConsent('CONSENT_DECLINED')}
                                    disabled={isSubmitting}
                                    className="px-8 py-3 rounded-lg border-2 border-nano-gray-200 text-nano-gray-600 font-semibold hover:bg-nano-gray-50 transition-colors disabled:opacity-50"
                                >
                                    🚫 Decline
                                </button>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center">
                    <Logo variant="mark" className="mx-auto mb-4 opacity-50 grayscale hover:grayscale-0 transition-all" />
                    <p className="text-xs text-nano-gray-400 leading-relaxed">
                        &copy; {new Date().getFullYear()} Semester. All rights reserved.
                        <br />
                        Securely processed in compliance with GDPR.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default RefereePortal;
