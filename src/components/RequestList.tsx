import React, { useState } from 'react';
import { Badge, Loader, Skeleton } from './UI';
import type { Request } from '../types';

interface RequestListProps {
    requests: Request[];
    isLoading?: boolean;
    onViewRequest?: (request: Request) => void;
    statusFilter?: string;
    searchQuery?: string;
    selectedIds?: Set<string>;
    onSelectionChange?: (selectedIds: Set<string>) => void;
    showArchived?: boolean;
}

export const RequestList: React.FC<RequestListProps> = ({
    requests,
    isLoading = false,
    onViewRequest,
    statusFilter = 'all',
    searchQuery = '',
    selectedIds = new Set(),
    onSelectionChange,
    showArchived = false
}) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-nano-gray-200 overflow-hidden p-6">
                {/* Mobile Skeleton */}
                <div className="block md:hidden space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 border border-nano-gray-200 rounded-lg">
                            <Skeleton variant="card" className="mb-3" />
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-6 w-18" />
                            </div>
                        </div>
                    ))}
                </div>
                {/* Desktop Skeleton */}
                <div className="hidden md:block">
                    <Skeleton variant="table" className="p-4" />
                </div>
            </div>
        );
    }

    // Filter and search requests
    let filteredRequests = requests;

    // Apply archive filter
    if (!showArchived) {
        filteredRequests = filteredRequests.filter(req => !req.archived);
    }

    // Apply status filter
    if (statusFilter !== 'all' && statusFilter !== 'archived') {
        filteredRequests = filteredRequests.filter(req => {
            switch (statusFilter) {
                case 'pending':
                    return ['PENDING_CONSENT', 'Sent', 'Pending_Consent'].includes(req.status);
                case 'completed':
                    return ['Completed', 'Consent_Given', 'CONSENT_GIVEN', 'SEALED'].includes(req.status);
                case 'flagged':
                    return req.anomalyFlag || req.status === 'EXPIRED' || req.status === 'Flagged';
                default:
                    return true;
            }
        });
    } else if (statusFilter === 'archived') {
        // Show only archived
        filteredRequests = filteredRequests.filter(req => req.archived);
    }

    // Apply search
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredRequests = filteredRequests.filter(req =>
            req.candidateName.toLowerCase().includes(query) ||
            req.refereeName.toLowerCase().includes(query) ||
            req.candidateEmail.toLowerCase().includes(query) ||
            req.refereeEmail.toLowerCase().includes(query)
        );
    }

    if (filteredRequests.length === 0 && (statusFilter !== 'all' || searchQuery.trim())) {
        return (
            <div className="text-center py-12 text-nano-gray-500">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-lg font-medium text-nano-gray-700">No matching requests</p>
                <p className="text-sm mt-2">Try adjusting your filters or search query</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-nano-gray-200 p-12 animate-fade-in-up">
                <div className="text-center max-w-lg mx-auto">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-semester-blue/10 rounded-full mb-6 animate-scale-in">
                        <span className="text-4xl">📋</span>
                    </div>
                    <h3 className="text-2xl font-bold text-nano-gray-900 mb-3">
                        Welcome to Reference Management
                    </h3>
                    <p className="text-nano-gray-600 mb-8 leading-relaxed">
                        Start building trust with structured reference requests. Create your first request to begin collecting professional references from candidates.
                    </p>
                    <div className="bg-gradient-to-r from-semester-blue/5 to-semester-plum/5 border border-semester-blue/20 rounded-xl p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">💡</span>
                            <div className="text-left">
                                <h4 className="font-semibold text-nano-gray-900 mb-1">Pro tip</h4>
                                <p className="text-sm text-nano-gray-700">
                                    Use the Template Builder to create customized reference forms that match your organization's specific requirements.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-nano-gray-500 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-semester-blue rounded-full"></span>
                            Secure & Compliant
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-semester-plum rounded-full"></span>
                            GDPR Protected
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-semester-pink rounded-full"></span>
                            Easy to Use
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const getStatusBadge = (status: string, archived?: boolean) => {
        if (archived) {
            return <Badge variant="default">Archived</Badge>;
        }

        const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
            'PENDING_CONSENT': { variant: 'warning', label: 'Pending Consent' },
            'Pending_Consent': { variant: 'warning', label: 'Pending Consent' },
            'CONSENT_GIVEN': { variant: 'info', label: 'Awaiting Reference' },
            'Consent_Given': { variant: 'info', label: 'Awaiting Reference' },
            'Sent': { variant: 'info', label: 'Sent' },
            'Viewed': { variant: 'info', label: 'Viewed' },
            'Completed': { variant: 'success', label: 'Completed' },
            'SEALED': { variant: 'success', label: 'Sealed' },
            'Sealed': { variant: 'success', label: 'Sealed' },
            'CONSENT_DECLINED': { variant: 'error', label: 'Declined' },
            'EXPIRED': { variant: 'error', label: 'Expired' },
            'Flagged': { variant: 'error', label: 'Flagged' },
        };

        const config = statusMap[status] || { variant: 'default' as const, label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const copyToClipboard = (text: string, id: string, type: 'referee' | 'candidate') => {
        navigator.clipboard.writeText(text);
        setCopiedId(`${id}-${type}`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getMockRefereeLink = (req: Request) => {
        // Only use refereeToken if it exists. Do not fall back to req.token (which is consent token).
        const token = req.refereeToken;
        if (!token) {
            // If no referee token (e.g. consent not given yet), return empty or handle gracefully
            return '#';
        }
        return `${window.location.origin}?view=portal&token=${token}`;
    };

    const getMockCandidateLink = (req: Request) => {
        // req.token is the consent token from the backend (ConsentToken column)
        const token = req.token;
        if (!token) {
            console.error('Missing consent token for request:', req.requestId);
            return '#';
        }
        return `${window.location.origin}?view=portal&action=authorize&token=${token}`;
    };

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        if (onSelectionChange) {
            if (checked) {
                const allIds = new Set(filteredRequests.map(r => r.requestId));
                onSelectionChange(allIds);
            } else {
                onSelectionChange(new Set());
            }
        }
    };

    const handleSelectRow = (requestId: string, checked: boolean) => {
        if (onSelectionChange) {
            const newSelection = new Set(selectedIds);
            if (checked) {
                newSelection.add(requestId);
            } else {
                newSelection.delete(requestId);
            }
            onSelectionChange(newSelection);
        }
    };

    const allSelected = filteredRequests.length > 0 && filteredRequests.every(r => selectedIds.has(r.requestId));
    const someSelected = filteredRequests.some(r => selectedIds.has(r.requestId));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-nano-gray-200 overflow-hidden">
            {/* Mobile Card View */}
            <div className="block md:hidden">
                {filteredRequests.length === 0 ? (
                    <div className="p-8 text-center text-nano-gray-500">
                        <div className="text-4xl mb-4">📋</div>
                        <p className="text-lg font-medium">No requests found</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="divide-y divide-nano-gray-200">
                        {filteredRequests.map((req) => (
                            <div
                                key={req.requestId}
                                className={`p-4 hover:bg-nano-gray-50 transition-colors ${req.archived ? 'opacity-60 bg-nano-gray-50' : ''
                                    } ${selectedIds.has(req.requestId) ? 'bg-semester-blue/5' : ''}`}
                            >
                                {onSelectionChange && (
                                    <div className="flex items-center gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(req.requestId)}
                                            onChange={(e) => handleSelectRow(req.requestId, e.target.checked)}
                                            className="w-4 h-4 text-semester-blue border-nano-gray-300 rounded focus:ring-semester-blue"
                                        />
                                        {getStatusBadge(req.status, req.archived)}
                                        {req.anomalyFlag && !req.archived && (
                                            <Badge variant="error" className="text-xs">⚠️ Flagged</Badge>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <div>
                                        <div className={`font-medium text-sm ${req.archived ? 'text-nano-gray-500' : 'text-nano-gray-900'}`}>
                                            {req.candidateName}
                                        </div>
                                        <div className="text-xs text-nano-gray-500">{req.candidateEmail}</div>
                                        <div className="text-xs text-nano-gray-400 mt-1 flex items-center gap-1">
                                            <span>→</span> {req.refereeName}
                                        </div>
                                    </div>

                                    <div className="text-xs text-nano-gray-400">
                                        Created: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {onViewRequest && (
                                            <button
                                                onClick={() => onViewRequest(req)}
                                                className="text-semester-blue hover:text-semester-blue-dark text-xs font-medium px-2 py-1 hover:bg-semester-blue/10 rounded transition-all"
                                            >
                                                👁 View
                                            </button>
                                        )}
                                        {!req.archived && (
                                            <>
                                                <button
                                                    onClick={() => copyToClipboard(getMockRefereeLink(req), req.requestId, 'referee')}
                                                    className="text-nano-gray-600 hover:text-semester-blue text-xs font-medium px-2 py-1 hover:bg-nano-gray-100 rounded transition-all"
                                                >
                                                    {copiedId === `${req.requestId}-referee` ? '✓ Copied' : '🔗 Ref Link'}
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(getMockCandidateLink(req), req.requestId, 'candidate')}
                                                    className="text-nano-gray-600 hover:text-semester-blue text-xs font-medium px-2 py-1 hover:bg-nano-gray-100 rounded transition-all"
                                                >
                                                    {copiedId === `${req.requestId}-candidate` ? '✓ Copied' : '📧 Consent'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-nano-gray-200">
                    <thead className="bg-nano-gray-50">
                        <tr>
                            {onSelectionChange && (
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = someSelected && !allSelected;
                                        }}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="w-4 h-4 text-semester-blue border-nano-gray-300 rounded focus:ring-semester-blue"
                                    />
                                </th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-nano-gray-500 uppercase tracking-wider">
                                Candidate → Referee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-nano-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-nano-gray-500 uppercase tracking-wider">
                                Created
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-nano-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-nano-gray-200">
                        {filteredRequests.map((req) => (
                            <tr
                                key={req.requestId}
                                className={`hover:bg-nano-gray-50 transition-colors ${req.archived ? 'opacity-60 bg-nano-gray-50' : ''
                                    } ${selectedIds.has(req.requestId) ? 'bg-semester-blue/5' : ''}`}
                            >
                                {onSelectionChange && (
                                    <td className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(req.requestId)}
                                            onChange={(e) => handleSelectRow(req.requestId, e.target.checked)}
                                            className="w-4 h-4 text-semester-blue border-nano-gray-300 rounded focus:ring-semester-blue"
                                        />
                                    </td>
                                )}
                                <td className="px-6 py-4">
                                    <div className={`text-sm font-medium ${req.archived ? 'text-nano-gray-500' : 'text-nano-gray-900'}`}>
                                        {req.candidateName}
                                    </div>
                                    <div className="text-xs text-nano-gray-500">{req.candidateEmail}</div>
                                    <div className="text-xs text-nano-gray-400 mt-1">→ {req.refereeName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(req.status, req.archived)}
                                    {req.anomalyFlag && !req.archived && (
                                        <Badge variant="error" className="ml-2">⚠️ Flagged</Badge>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-nano-gray-500">
                                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="flex justify-end gap-2">
                                        {onViewRequest && (
                                            <button
                                                onClick={() => onViewRequest(req)}
                                                className="text-semester-blue hover:text-semester-blue-dark text-sm font-medium px-3 py-1.5 hover:bg-semester-blue/10 rounded transition-all"
                                                title="View details"
                                            >
                                                View
                                            </button>
                                        )}
                                        {!req.archived && (
                                            <>
                                                <button
                                                    onClick={() => copyToClipboard(getMockRefereeLink(req), req.requestId, 'referee')}
                                                    data-referee-url={getMockRefereeLink(req)}
                                                    className="text-nano-gray-600 hover:text-semester-blue text-sm font-medium px-3 py-1.5 hover:bg-nano-gray-100 rounded transition-all"
                                                    title="Copy referee portal link"
                                                >
                                                    {copiedId === `${req.requestId}-referee` ? '✓ Copied' : '🔗 Referee Link'}
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(getMockCandidateLink(req), req.requestId, 'candidate')}
                                                    data-candidate-url={getMockCandidateLink(req)}
                                                    className="text-nano-gray-600 hover:text-semester-blue text-sm font-medium px-3 py-1.5 hover:bg-nano-gray-100 rounded transition-all"
                                                    title="Copy candidate consent link"
                                                >
                                                    {copiedId === `${req.requestId}-candidate` ? '✓ Copied' : '📧 Consent Link'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
