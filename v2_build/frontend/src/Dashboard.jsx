
import React, { useState, useEffect } from 'react';
import { callAction } from './lib/api';

const STATUS_CONFIG = {
    'PENDING_CONSENT': { label: 'Pending Consent', color: 'bg-yellow-100 text-yellow-800' },
    'CONSENT_GIVEN': { label: 'Consent Given', color: 'bg-green-100 text-green-800' },
    'CONSENT_DECLINED': { label: 'Declined', color: 'bg-red-100 text-red-800' },
    'CONSENT_QUERY': { label: 'Query', color: 'bg-orange-100 text-orange-800' },
    'Completed': { label: 'Ready', color: 'bg-green-100 text-green-800 border-green-200' },
    'Declined': { label: 'Ref. Declined', color: 'bg-red-100 text-red-800' },
    'EXPIRED': { label: 'Expired', color: 'bg-gray-100 text-gray-800' }
};

function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
}

export default function Dashboard({ user, onLogout }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const result = await callAction('getMyRequests', {}, user.email);
            if (result.success) {
                // GAS returns { data: [...], count: N }
                setRequests(result.data || []);
            } else {
                setError(result.error || 'Failed to load requests');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async (req) => {
        try {
            const result = await callAction('downloadPdfPayload', { token: req.ConsentToken });
            if (result.success && result.content) {
                // Convert base64 to blob
                const byteCharacters = atob(result.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                // Create link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `Reference_${req.CandidateName.replace(/\s+/g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Failed to download PDF: ' + (result.error || 'No content'));
            }
        } catch (e) {
            console.error(e);
            alert('Error downloading PDF');
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            {/* Top Navigation */}
            <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="flex space-x-1">
                                <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
                                <div className="w-3 h-3 rounded-full bg-[var(--color-plum)]"></div>
                                <div className="w-3 h-3 rounded-full bg-[var(--color-pink)]"></div>
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">Semester</span>
                        </div>
                        <div className="flex items-center space-x-6">
                            <span className="text-sm text-gray-600">
                                <span className="font-medium text-gray-900">{user.name}</span>
                                <span className="mx-2 text-gray-300">|</span>
                                {user.role}
                            </span>
                            <button
                                onClick={onLogout}
                                className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="md:flex md:items-center md:justify-between mb-8 px-4 sm:px-0">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                            Reference Requests
                        </h2>
                    </div>
                    <div className="mt-4 flex md:mt-0 md:ml-4">
                        <button
                            type="button"
                            className="bg-[var(--color-primary)] hover:bg-[#0042a3] text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors flex items-center gap-2"
                        >
                            <span>+</span> New Request
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : error ? (
                    <div className="rounded-md bg-red-50 p-4 mx-4 sm:mx-0">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error loading requests</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{error}</p>
                                </div>
                                <button onClick={loadRequests} className="mt-4 text-sm font-medium text-red-800 underline">
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-100">
                        {requests.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No requests found.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {requests.map((req) => (
                                    <li key={req.RequestID} className="hover:bg-gray-50 transition-colors">
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-sm font-medium text-[var(--color-primary)] truncate">
                                                        {req.CandidateName}
                                                        <span className="text-gray-400 font-normal ml-2 text-xs">for {req.RefereeName}</span>
                                                    </p>
                                                    <p className="flex items-center text-xs text-gray-500">
                                                        Created {new Date(req.CreatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="ml-2 flex-shrink-0 flex gap-4 items-center">
                                                    <StatusBadge status={req.Status} />

                                                    {/* Actions Placeholder */}
                                                    <div className="flex gap-2">
                                                        {req.Status === 'Completed' && (
                                                            <button
                                                                onClick={() => handleDownloadPdf(req)}
                                                                className="text-xs font-medium text-gray-600 hover:text-[var(--color-primary)] border border-gray-300 rounded px-2 py-1"
                                                                title="Download PDF"
                                                            >
                                                                PDF
                                                            </button>
                                                        )}
                                                        <button
                                                            className="text-xs font-medium text-gray-600 hover:text-[var(--color-primary)] border border-gray-300 rounded px-2 py-1"
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
