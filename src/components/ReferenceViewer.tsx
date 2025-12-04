import React, { useState, useEffect } from 'react';
import { Card, Button } from './UI';
import { runGAS } from '../lib/api';
import type { AuditEvent, Request, SignatureResponse } from '../types';

interface ReferenceViewerProps {
    requestId: string;
    candidateName: string;
    refereeName: string;
    status: string;
    onClose: () => void;
    onSealed?: () => void;
}

// Lifecycle configuration
const LIFECYCLE_STEPS = [
    { key: 'PENDING_CONSENT', label: 'Consent Pending', icon: '📧' },
    { key: 'Consent_Given', label: 'Consent Given', icon: '✅' },
    { key: 'Completed', label: 'Reference Submitted', icon: '✍️' },
    { key: 'Declined', label: 'Reference Declined', icon: '🚫' },
    { key: 'Analyzed', label: 'AI Analyzed', icon: '🤖' },
    { key: 'Sealed', label: 'Sealed', icon: '🔒' }
];

export const ReferenceViewer: React.FC<ReferenceViewerProps> = ({
    requestId,
    candidateName,
    refereeName,
    status,
    onClose,
    onSealed
}) => {
    const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [showAudit, setShowAudit] = useState(false);
    const [isSealing, setIsSealing] = useState(false);
    const [requestData, setRequestData] = useState<Request | null>(null);

    useEffect(() => {
        loadRequestData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId]);

    useEffect(() => {
        if (showAudit && auditTrail.length === 0) {
            loadAuditTrail();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAudit]);

    const loadRequestData = async () => {
        try {
            console.log('Loading request data for:', requestId);
            // Fetch full request details
            const response = await runGAS('getMyRequests') as { success: boolean; data: Request[] };
            console.log('API Response:', response);

            if (response && response.data) {
                const requests = response.data;
                const request = requests.find((r: Request) => r.requestId === requestId);
                if (request) {
                    setRequestData(request);
                } else {
                    console.warn('Request not found in API response:', requestId);
                }
            } else {
                console.error('Invalid API response format:', response);
            }
        } catch (error) {
            console.error('Error loading request data:', error);
        }
    };

    const loadAuditTrail = async () => {
        setIsLoadingAudit(true);
        try {
            const trail = await runGAS('getAuditTrail', requestId) as AuditEvent[];
            setAuditTrail(trail);
        } catch (e) {
            console.error('Failed to load audit trail:', e);
        } finally {
            setIsLoadingAudit(false);
        }
    };

    const handleSeal = async () => {
        if (!confirm('Are you sure you want to seal this reference? This action cannot be undone.')) {
            return;
        }

        setIsSealing(true);
        try {
            const result = await runGAS('sealRequest', requestId) as { success: boolean; error?: string };
            if (result.success) {
                alert('Reference sealed successfully!');
                if (onSealed) onSealed();
                onClose();
            } else {
                alert('Failed to seal: ' + result.error);
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred while sealing.');
        } finally {
            setIsSealing(false);
        }
    };


    const handleDownloadPDF = async () => {
        try {
            // Check if PDF already exists
            if (requestData?.pdfUrl) {
                window.open(requestData.pdfUrl, '_blank');
                return;
            }

            // Generate PDF via seal if not exists
            const result = await runGAS('sealRequest', requestId) as { success: boolean; pdfUrl?: string; error?: string };

            if (result.success && result.pdfUrl) {
                window.open(result.pdfUrl, '_blank');
                // Reload request data to get updated pdfUrl
                loadRequestData();
            } else {
                alert('Failed to generate PDF: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('An error occurred while generating the PDF.');
        }
    };


    // Determine current step in lifecycle
    const currentStatus = requestData?.status || status;
    const currentStepIndex = LIFECYCLE_STEPS.findIndex(step =>
        step.key.toLowerCase() === currentStatus.toLowerCase()
    );
    const activeStep = currentStepIndex >= 0 ? currentStepIndex : 0;

    const formatDate = (isoString?: string) => {
        if (!isoString) return 'Unknown';
        const date = new Date(isoString);
        return date.toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderSignature = (signature: SignatureResponse) => {
        return (
            <div className="bg-white border-2 border-semester-blue/10 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-semester-blue mb-4 flex items-center gap-2">
                    <span className="text-lg">✍️</span> Digital Signature
                </h4>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-nano-gray-500 uppercase tracking-wider font-medium">Signed by</span>
                            <p className="text-sm font-medium text-nano-gray-900 mt-1">{signature.typedName}</p>
                        </div>
                        <div>
                            <span className="text-xs text-nano-gray-500 uppercase tracking-wider font-medium">Signed on</span>
                            <p className="text-sm font-medium text-nano-gray-900 mt-1">{formatDate(signature.signedAt)}</p>
                        </div>
                    </div>

                    {signature.signatureDataUrl && (
                        <div className="mt-3 p-4 bg-nano-gray-50 rounded-lg border border-nano-gray-200 flex justify-center">
                            <img
                                src={signature.signatureDataUrl}
                                alt="Signature"
                                className="max-h-24 mix-blend-multiply"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-semester-blue bg-semester-blue/5 p-2.5 rounded-lg border border-semester-blue/10">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Digitally signed and timestamped
                    </div>
                </div>
            </div>
        );
    };

    // Ensure responses is an object (handle JSON string from Sheets)
    let responses = requestData?.responses || {};

    // Robust parsing for potentially double-encoded JSON
    if (typeof responses === 'string') {
        try {
            const parsed = JSON.parse(responses);
            responses = parsed;

            // Handle double encoding
            if (typeof responses === 'string') {
                try {
                    responses = JSON.parse(responses);
                } catch {
                    // Keep as string if second parse fails
                }
            }
        } catch (e) {
            console.error('Failed to parse responses JSON:', e);
            responses = {};
        }
    }

    // Final safety check - if still not an object, make it one
    if (typeof responses !== 'object' || responses === null) {
        responses = { value: String(responses) };
    }
    const hasSignature = Object.values(responses).some(
        (value: unknown) => value && typeof value === 'object' && 'typedName' in value
    );

    return (
        <div className="fixed inset-0 bg-nano-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border-0">
                <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-nano-gray-200 p-6 flex justify-between items-start z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-nano-gray-900 tracking-tight">Reference Details</h2>
                        <p className="text-sm text-nano-gray-500 mt-1">Request ID: {requestId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-nano-gray-400 hover:text-nano-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-nano-gray-100 transition-colors"
                    >
                        ×
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Reference Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-nano-gray-50 p-5 rounded-xl border border-nano-gray-100">
                            <h3 className="text-xs font-semibold text-nano-gray-400 uppercase tracking-wider mb-3">Candidate</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-semester-blue/10 flex items-center justify-center text-semester-blue font-semibold text-lg">
                                    {candidateName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-medium text-nano-gray-900">{candidateName}</p>
                                    <p className="text-sm text-nano-gray-500">Candidate</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-nano-gray-50 p-5 rounded-xl border border-nano-gray-100">
                            <h3 className="text-xs font-semibold text-nano-gray-400 uppercase tracking-wider mb-3">Referee</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-semester-plum/10 flex items-center justify-center text-semester-plum font-semibold text-lg">
                                    {refereeName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-medium text-nano-gray-900">{refereeName}</p>
                                    <p className="text-sm text-nano-gray-500">Referee</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lifecycle Progress */}
                    <div className="bg-white p-6 rounded-xl border border-nano-gray-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-nano-gray-900 mb-6">Request Status</h3>
                        <div className="relative flex items-center justify-between px-4">
                            {/* Connecting Line */}
                            <div className="absolute left-0 top-5 w-full h-0.5 bg-nano-gray-100 -z-10" />

                            {LIFECYCLE_STEPS.map((step, index) => {
                                const isActive = index === activeStep;
                                const isCompleted = index < activeStep;

                                return (
                                    <div key={step.key} className="flex flex-col items-center bg-white px-2">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 border-2 ${isActive
                                            ? 'border-semester-blue bg-semester-blue text-white shadow-lg shadow-semester-blue/20 scale-110'
                                            : isCompleted
                                                ? 'border-semester-blue bg-white text-semester-blue'
                                                : 'border-nano-gray-200 bg-white text-nano-gray-300'
                                            }`}>
                                            {step.icon}
                                        </div>
                                        <span className={`text-xs mt-3 font-medium transition-colors ${isActive ? 'text-semester-blue' : isCompleted ? 'text-nano-gray-700' : 'text-nano-gray-400'
                                            }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reference Content */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-nano-gray-900">Reference Details</h3>

                        {currentStatus === 'Declined' ? (
                            <div className="bg-red-50 rounded-xl border border-red-100 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl">🚫</div>
                                    <div>
                                        <h4 className="text-lg font-bold text-red-800 mb-2">Reference Declined</h4>
                                        <p className="text-red-700 font-medium mb-4">
                                            Reason: <span className="font-normal">{(responses.declineReason as string) || 'Not specified'}</span>
                                        </p>
                                        {Boolean(responses.declineDetails) && (
                                            <div className="bg-white/60 p-4 rounded-lg border border-red-100">
                                                <p className="text-red-800 text-sm">{String(responses.declineDetails)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : responses.uploadedFileUrl ? (
                            <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">📄</div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-bold text-blue-900 mb-1">Uploaded Reference Document</h4>
                                        <p className="text-blue-700 text-sm mb-3">
                                            Filename: {(responses.fileName as string) || 'reference_document.pdf'}
                                        </p>
                                        <Button
                                            onClick={() => window.open(responses.uploadedFileUrl as string, '_blank')}
                                            className="bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                                        >
                                            View Document
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-nano-gray-200 divide-y divide-nano-gray-100 overflow-hidden">
                                {Object.entries(responses).map(([key, value]) => {
                                    // Check if this is a signature
                                    if (typeof value === 'object' && value && 'typedName' in value) {
                                        return (
                                            <div key={key} className="p-6 bg-nano-gray-50/50">
                                                {renderSignature(value as SignatureResponse)}
                                            </div>
                                        );
                                    }

                                    // Regular responses
                                    let displayValue: React.ReactNode;
                                    if (typeof value === 'boolean') {
                                        displayValue = value ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                                                ✅ Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                                                ❌ No
                                            </span>
                                        );
                                    } else if (typeof value === 'number') {
                                        displayValue = (
                                            <div className="flex items-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className={`text-lg ${i < value ? 'text-yellow-400' : 'text-nano-gray-200'}`}>★</span>
                                                ))}
                                                <span className="ml-2 text-sm text-nano-gray-500 font-medium">({value}/5)</span>
                                            </div>
                                        );
                                    } else {
                                        displayValue = <p className="text-nano-gray-700 leading-relaxed whitespace-pre-wrap">{String(value)}</p>;
                                    }

                                    return (
                                        <div key={key} className="p-6 hover:bg-nano-gray-50 transition-colors">
                                            <p className="text-sm font-medium text-nano-gray-500 mb-3 uppercase tracking-wide">
                                                {key === 'q1' ? 'Technical Competence' :
                                                    key === 'q2' ? 'Communication Skills' :
                                                        key === 'q3' ? 'Would you rehire this person?' :
                                                            key === 'q4' ? 'Additional Comments' : key}
                                            </p>
                                            {displayValue}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* AI Insights */}
                    <div className="bg-gradient-to-br from-semester-plum/5 to-semester-pink/5 rounded-xl border border-semester-plum/10 p-6">
                        <h3 className="text-lg font-bold text-nano-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-xl">🤖</span> AI Analysis
                        </h3>

                        {requestData?.aiAnalysis ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-nano-gray-600">Sentiment:</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${requestData.aiAnalysis.sentimentScore?.includes('Positive') ? 'bg-green-50 text-green-700 border-green-200' :
                                        requestData.aiAnalysis.sentimentScore?.includes('Negative') ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}>
                                        {requestData.aiAnalysis.sentimentScore || 'Unknown'}
                                    </span>
                                </div>

                                {requestData.aiAnalysis.summary && requestData.aiAnalysis.summary.length > 0 && (
                                    <div className="bg-white/80 p-4 rounded-lg border border-semester-plum/10 shadow-sm">
                                        <ul className="list-disc pl-4 space-y-1">
                                            {requestData.aiAnalysis.summary.map((point, i) => (
                                                <li key={i} className="text-sm text-nano-gray-700 leading-relaxed">{point}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {requestData.aiAnalysis.anomalies && requestData.aiAnalysis.anomalies.length > 0 && (
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                        <p className="text-xs font-bold text-red-800 uppercase mb-2">Potential Anomalies Detected</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {requestData.aiAnalysis.anomalies.map((anomaly, i) => (
                                                <li key={i} className="text-sm text-red-700">{anomaly}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2 text-xs text-nano-gray-500">
                                        <svg className="w-4 h-4 text-semester-plum" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Analysis generated automatically on {new Date(requestData.aiAnalysis.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-nano-gray-500 bg-white/50 rounded-lg border border-dashed border-nano-gray-300">
                                <p>AI Analysis pending or not configured.</p>
                                <p className="text-xs mt-1">Analysis runs automatically upon submission.</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Activity Timeline */}
                    <div className="border-t border-nano-gray-200 pt-8">
                        <h3 className="text-lg font-bold text-nano-gray-900 mb-6">Recent Activity</h3>
                        <div className="space-y-0 relative">
                            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-nano-gray-100" />

                            <div className="relative pl-8 pb-8">
                                <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-semester-blue shadow-sm" />
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-semibold text-nano-gray-900">Candidate consent granted</p>
                                        <p className="text-xs text-nano-gray-500 mt-1">Candidate authorized referee to provide reference</p>
                                    </div>
                                    <span className="text-xs font-medium text-nano-gray-400 bg-nano-gray-50 px-2 py-1 rounded">
                                        {formatDate(requestData?.consentTimestamp)}
                                    </span>
                                </div>
                            </div>

                            <div className="relative pl-8 pb-8">
                                <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-semester-blue shadow-sm" />
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-semibold text-nano-gray-900">Referee submitted reference</p>
                                        <p className="text-xs text-nano-gray-500 mt-1">Reference form completed and submitted</p>
                                    </div>
                                    <span className="text-xs font-medium text-nano-gray-400 bg-nano-gray-50 px-2 py-1 rounded">
                                        {formatDate(requestData?.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {hasSignature && (
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-semester-plum shadow-sm" />
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-semibold text-nano-gray-900">Digital signature captured</p>
                                            <p className="text-xs text-nano-gray-500 mt-1">Legally binding signature recorded</p>
                                        </div>
                                        <span className="text-xs font-medium text-nano-gray-400 bg-nano-gray-50 px-2 py-1 rounded">
                                            {formatDate(new Date().toISOString())}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-nano-gray-200">
                        {currentStatus !== 'SEALED' && currentStatus !== 'Sealed' && (
                            <Button onClick={handleSeal} disabled={isSealing} className="bg-semester-blue hover:bg-semester-blue-dark text-white shadow-lg shadow-semester-blue/20">
                                {isSealing ? 'Sealing...' : '🔒 Seal Reference'}
                            </Button>
                        )}
                        {(currentStatus === 'SEALED' || currentStatus === 'Sealed') && (
                            <Button onClick={handleDownloadPDF} className="bg-semester-blue hover:bg-semester-blue-dark text-white shadow-lg shadow-semester-blue/20">
                                📥 Download PDF
                            </Button>
                        )}
                        <Button variant="secondary" onClick={() => setShowAudit(!showAudit)}>
                            {showAudit ? 'Hide' : 'View'} Full Audit Log
                        </Button>
                    </div>

                    {/* Audit Trail (Detailed) */}
                    {showAudit && (
                        <div className="bg-nano-gray-50 rounded-xl p-6 border border-nano-gray-200 animate-fade-in">
                            <h3 className="text-sm font-bold text-nano-gray-900 mb-4 uppercase tracking-wider">Complete Audit Trail</h3>
                            {isLoadingAudit ? (
                                <p className="text-nano-gray-500 text-sm">Loading audit trail...</p>
                            ) : (
                                <div className="space-y-3">
                                    {auditTrail.map((event) => (
                                        <div
                                            key={event.auditId}
                                            className="bg-white p-3 rounded-lg border border-nano-gray-200 text-sm shadow-sm flex justify-between items-center"
                                        >
                                            <div>
                                                <span className="font-medium text-nano-gray-900 block">{event.action}</span>
                                                <span className="text-xs text-nano-gray-500">Actor: {event.actor}</span>
                                            </div>
                                            <span className="text-xs font-mono text-nano-gray-400">
                                                {formatDate(event.timestamp)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
