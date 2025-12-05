import React, { useState } from 'react';
import { Badge, Loader } from './UI';
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
            <div className="text-center py-12">
                <Loader />
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
            <div className="text-center py-16 px-6">
                <div className="max-w-md mx-auto">
                    <div className="text-6xl mb-6">📋</div>
                    <h3 className="text-xl font-semibold text-nano-gray-900 mb-2">
                        No reference requests yet
                    </h3>
                    <p className="text-nano-gray-600 mb-6">
                        Get started by creating your first reference request. It only takes a minute.
                    </p>
                    <div className="bg-semester-blue/5 border border-semester-blue/20 rounded-lg p-4 text-left">
                        <p className="text-sm text-nano-gray-700">
                            <strong>Pro tip:</strong> You can create templates in the Template Builder to streamline your reference collection process.
                        </p>
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
        <div className="overflow-x-auto">
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
    );
};
