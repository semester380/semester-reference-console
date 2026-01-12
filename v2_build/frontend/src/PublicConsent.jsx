
import React, { useState, useEffect } from 'react';
import { callAction } from './lib/api';

export default function PublicConsent() {
    const [status, setStatus] = useState('loading'); // loading, ready, success, error
    const [token, setToken] = useState(null);
    const [actionType, setActionType] = useState(null); // approve, decline, query
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        if (!t) {
            setStatus('error');
            setMessage('Missing authorization token.');
        } else {
            setToken(t);
            setStatus('ready');
        }
    }, []);

    const handleSubmit = async (decision) => {
        setStatus('submitting');
        const payload = {
            token,
            decision: decision, // CONSENT_GIVEN, CONSENT_DECLINED, CONSENT_QUERY
            reason: reason,
            message: message
        };

        const result = await callAction('authorizeConsent', payload);
        if (result.success) {
            setStatus('success');
            setActionType(decision === 'CONSENT_GIVEN' ? 'approved' : decision === 'CONSENT_DECLINED' ? 'declined' : 'query');
        } else {
            setStatus('error');
            setMessage(result.error || 'Submission failed. Please try again.');
        }
    };

    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You</h2>
                    <p className="text-gray-600">
                        {actionType === 'approved' && "The referee has been invited."}
                        {actionType === 'declined' && "Your decision has been recorded."}
                        {actionType === 'query' && "Your query has been sent to the recruiter."}
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center border-l-4 border-red-500">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-red-600">{message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-8">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
                                <div className="w-3 h-3 rounded-full bg-[var(--color-plum)]"></div>
                                <div className="w-3 h-3 rounded-full bg-[var(--color-pink)]"></div>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Reference Authorisation</h1>
                        <p className="mt-2 text-gray-600">Please confirm you are happy for us to contact your referee.</p>
                    </div>

                    {!actionType ? (
                        <div className="space-y-4">
                            <button
                                onClick={() => handleSubmit('CONSENT_GIVEN')}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity"
                            >
                                Approve Request
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setActionType('decline')}
                                    className="flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={() => setActionType('query')}
                                    className="flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Have a Query?
                                </button>
                            </div>
                        </div>
                    ) : actionType === 'decline' ? (
                        <div className="space-y-4 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for declining (Optional)</label>
                                <textarea
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    rows="3"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActionType(null)}
                                    className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => handleSubmit('CONSENT_DECLINED')}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Confirm Decline
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Query
                        <div className="space-y-4 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Query</label>
                                <textarea
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    rows="3"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Is the referee email incorrect?"
                                ></textarea>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActionType(null)}
                                    className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => handleSubmit('CONSENT_QUERY')}
                                    className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-md hover:opacity-90"
                                >
                                    Send Query
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
