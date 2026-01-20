import React, { useState } from 'react';
import { Badge, Skeleton } from './UI';
import type { Request } from '../types';

interface RequestListProps {
    requests: Request[];
    isLoading?: boolean;
    onViewRequest?: (request: Request) => void;
    statusFilter?: string;
    searchQuery?: string;
    showArchived?: boolean;
}

export const RequestList: React.FC<RequestListProps> = ({
    requests,
    isLoading = false,
    onViewRequest,
    statusFilter = 'all',
    searchQuery = '',
    showArchived = false
}) => {

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const copyToClipboard = (text: string, id: string, type: 'referee' | 'candidate') => {
        navigator.clipboard.writeText(text);
        setCopiedId(`${id}-${type}`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getMockRefereeLink = (req: Request) => {
        const token = req.refereeToken;
        if (!token) {
            return '#';
        }
        return `${window.location.origin}?view=portal&token=${token}`;
    };

    const getMockCandidateLink = (req: Request) => {
        const token = req.token;
        if (!token) {
            console.error('Missing consent token for request:', req.requestId);
            return '#';
        }
        return `${window.location.origin}?view=portal&action=authorize&token=${token}`;
    };

    const toggleGroup = (candidateEmail: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(candidateEmail)) {
                next.delete(candidateEmail);
            } else {
                next.add(candidateEmail);
            }
            return next;
        });
    };

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
                case 'awaiting':
                    return ['Consent_Given', 'CONSENT_GIVEN'].includes(req.status);
                case 'completed':
                    return ['Completed', 'SEALED'].includes(req.status);
                case 'declined':
                    return ['Declined', 'CONSENT_DECLINED'].includes(req.status);
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

    // Group requests by candidate
    const candidateGroups: Array<{
        candidateName: string;
        candidateEmail: string;
        references: Request[];
        statusCounts: { [key: string]: number };
    }> = [];

    const groupedMap = new Map<string, Request[]>();

    filteredRequests.forEach(req => {
        const key = `${req.candidateEmail}`;
        if (!groupedMap.has(key)) {
            groupedMap.set(key, []);
        }
        groupedMap.get(key)!.push(req);
    });

    groupedMap.forEach((references) => {
        const statusCounts: { [key: string]: number } = {};
        references.forEach(ref => {
            const status = ref.status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        candidateGroups.push({
            candidateName: references[0].candidateName,
            candidateEmail: references[0].candidateEmail,
            references: references.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()),
            statusCounts
        });
    });

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
                                    Use the Template Builder to create customised reference forms that match your organisation's specific requirements.
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
                        {candidateGroups.map((group) => {
                            const isExpanded = expandedGroups.has(group.candidateEmail);
                            const isMultiple = group.references.length > 1;

                            return (
                                <div key={group.candidateEmail} className="p-4">
                                    {isMultiple ? (
                                        <>
                                            {/* Grouped header - clickable */}
                                            <div
                                                onClick={() => toggleGroup(group.candidateEmail)}
                                                className="cursor-pointer hover:bg-nano-gray-50 -m-4 p-4 rounded-lg transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-nano-gray-900 flex items-center gap-2">
                                                            👤 {group.candidateName}
                                                            <span className="text-xs font-normal text-nano-gray-500">
                                                                ({group.references.length} references)
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-nano-gray-500 mt-1">
                                                            📧 {group.candidateEmail}
                                                        </div>
                                                        <div className="text-xs text-nano-gray-600 mt-2 flex flex-wrap gap-1">
                                                            {Object.entries(group.statusCounts).map(([status, count]) => (
                                                                <span key={status} className="inline-flex items-center gap-1">
                                                                    {getStatusBadge(status as any, false)}
                                                                    <span className="text-nano-gray-400">×{count}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="text-nano-gray-400 text-xl ml-2">
                                                        {isExpanded ? '⌃' : '⌄'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded individual references */}
                                            {isExpanded && (
                                                <div className="mt-4 pl-4 border-l-2 border-nano-gray-200 space-y-3">
                                                    {group.references.map(req => (
                                                        <div key={req.requestId} className="text-sm">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-nano-gray-400">→</span>
                                                                <span className="font-medium text-nano-gray-700">{req.refereeName}</span>
                                                                {getStatusBadge(req.status, req.archived)}
                                                            </div>
                                                            <div className="text-xs text-nano-gray-500 pl-5">
                                                                Created: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                                            </div>
                                                            <div className="flex gap-2 pl-5 pt-2">
                                                                {onViewRequest && (
                                                                    <button
                                                                        onClick={() => onViewRequest(req)}
                                                                        className="text-semester-blue hover:text-semester-blue-dark text-xs font-medium"
                                                                    >
                                                                        View Details →
                                                                    </button>
                                                                )}
                                                                {!req.archived && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => copyToClipboard(getMockRefereeLink(req), req.requestId, 'referee')}
                                                                            className="text-xs px-2 py-1 hover:bg-nano-gray-100 rounded text-nano-gray-600"
                                                                        >
                                                                            {copiedId === `${req.requestId}-referee` ? '✅' : '🔗'} Ref Link
                                                                        </button>
                                                                        <button
                                                                            onClick={() => copyToClipboard(getMockCandidateLink(req), req.requestId, 'candidate')}
                                                                            className="text-xs px-2 py-1 hover:bg-nano-gray-100 rounded text-nano-gray-600"
                                                                        >
                                                                            {copiedId === `${req.requestId}-candidate` ? '✅' : '📧'} Consent
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        // Single reference - show directly without grouping UI
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                {getStatusBadge(group.references[0].status, group.references[0].archived)}
                                                {group.references[0].anomalyFlag && (
                                                    <Badge variant="error" className="text-xs">⚠️ Flagged</Badge>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-nano-gray-900">
                                                    {group.candidateName}
                                                </div>
                                                <div className="text-xs text-nano-gray-500">{group.candidateEmail}</div>
                                                <div className="text-xs text-nano-gray-400 mt-1 flex items-center gap-1">
                                                    <span>→</span> {group.references[0].refereeName}
                                                </div>
                                            </div>
                                            <div className="text-xs text-nano-gray-400">
                                                Created: {group.references[0].createdAt ? new Date(group.references[0].createdAt).toLocaleDateString() : '-'}
                                            </div>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {onViewRequest && (
                                                    <button
                                                        onClick={() => onViewRequest(group.references[0])}
                                                        className="text-semester-blue hover:text-semester-blue-dark text-xs font-medium"
                                                    >
                                                        View Details →
                                                    </button>
                                                )}
                                                {!group.references[0].archived && (
                                                    <>
                                                        <button
                                                            onClick={() => copyToClipboard(getMockRefereeLink(group.references[0]), group.references[0].requestId, 'referee')}
                                                            className="text-xs px-2 py-1 hover:bg-nano-gray-100 rounded text-nano-gray-600"
                                                        >
                                                            {copiedId === `${group.references[0].requestId}-referee` ? '✅' : '🔗'} Ref Link
                                                        </button>
                                                        <button
                                                            onClick={() => copyToClipboard(getMockCandidateLink(group.references[0]), group.references[0].requestId, 'candidate')}
                                                            className="text-xs px-2 py-1 hover:bg-nano-gray-100 rounded text-nano-gray-600"
                                                        >
                                                            {copiedId === `${group.references[0].requestId}-candidate` ? '✅' : '📧'} Consent
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-nano-gray-200">
                    <thead className="bg-nano-gray-50">
                        <tr>
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
                        {candidateGroups.map((group) => {
                            const isExpanded = expandedGroups.has(group.candidateEmail);
                            const isMultiple = group.references.length > 1;

                            return (
                                <React.Fragment key={group.candidateEmail}>
                                    {isMultiple ? (
                                        <>
                                            {/* Grouped header row */}
                                            <tr
                                                onClick={() => toggleGroup(group.candidateEmail)}
                                                className="cursor-pointer hover:bg-nano-gray-100 transition-colors bg-nano-gray-50"
                                            >
                                                <td colSpan={4} className="px-6 py-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-nano-gray-900 flex items-center gap-2">
                                                                👤 {group.candidateName}
                                                                <span className="text-xs font-normal text-nano-gray-500">
                                                                    ({group.references.length} references)
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-nano-gray-500 mt-1">
                                                                📧 {group.candidateEmail}
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {Object.entries(group.statusCounts).map(([status, count]) => (
                                                                    <div key={status} className="inline-flex items-center gap-1">
                                                                        {getStatusBadge(status as any, false)}
                                                                        <span className="text-xs text-nano-gray-500">×{count}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="text-nano-gray-400 text-xl ml-4">
                                                            {isExpanded ? '⌃' : ' ⌄'}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Individual reference rows */}
                                            {isExpanded && group.references.map(req => (
                                                <tr key={req.requestId} className="bg-green-50/30 hover:bg-nano-gray-100">
                                                    <td className="px-6 py-4 pl-12">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-nano-gray-400">→</span>
                                                            <div>
                                                                <div className="text-sm font-medium text-nano-gray-700">
                                                                    {req.refereeName}
                                                                </div>
                                                                <div className="text-xs text-nano-gray-500">{req.refereeEmail}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(req.status, req.archived)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-nano-gray-500">
                                                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {onViewRequest && (
                                                                <button
                                                                    onClick={() => onViewRequest(req)}
                                                                    className="text-semester-blue hover:text-semester-blue-dark text-sm font-medium"
                                                                >
                                                                    View →
                                                                </button>
                                                            )}
                                                            {!req.archived && (
                                                                <>
                                                                    <button
                                                                        onClick={() => copyToClipboard(getMockRefereeLink(req), req.requestId, 'referee')}
                                                                        className="text-nano-gray-600 hover:text-semester-blue text-xs font-medium px-2 py-1 hover:bg-nano-gray-100 rounded"
                                                                    >
                                                                        {copiedId === `${req.requestId}-referee` ? '✅' : '🔗'} Ref Link
                                                                    </button>
                                                                    <button
                                                                        onClick={() => copyToClipboard(getMockCandidateLink(req), req.requestId, 'candidate')}
                                                                        className="text-nano-gray-600 hover:text-semester-blue text-xs font-medium px-2 py-1 hover:bg-nano-gray-100 rounded"
                                                                    >
                                                                        {copiedId === `${req.requestId}-candidate` ? '✅' : '📧'} Consent
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    ) : (
                                        // Single reference - show as regular row
                                        <tr className="hover:bg-nano-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-nano-gray-900">
                                                    {group.candidateName}
                                                </div>
                                                <div className="text-xs text-nano-gray-500">{group.candidateEmail}</div>
                                                <div className="text-xs text-nano-gray-400 mt-1">→ {group.references[0].refereeName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(group.references[0].status, group.references[0].archived)}
                                                {group.references[0].anomalyFlag && (
                                                    <Badge variant="error" className="ml-2">⚠️ Flagged</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-nano-gray-500">
                                                {group.references[0].createdAt ? new Date(group.references[0].createdAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex justify-end gap-2">
                                                    {onViewRequest && (
                                                        <button
                                                            onClick={() => onViewRequest(group.references[0])}
                                                            className="text-semester-blue hover:text-semester-blue-dark text-sm font-medium"
                                                        >
                                                            View
                                                        </button>
                                                    )}
                                                    {!group.references[0].archived && (
                                                        <>
                                                            <button
                                                                onClick={() => copyToClipboard(getMockRefereeLink(group.references[0]), group.references[0].requestId, 'referee')}
                                                                className="text-nano-gray-600 hover:text-semester-blue text-xs font-medium px-2 py-1 hover:bg-nano-gray-100 rounded"
                                                            >
                                                                {copiedId === `${group.references[0].requestId}-referee` ? '✅' : '🔗'} Ref Link
                                                            </button>
                                                            <button
                                                                onClick={() => copyToClipboard(getMockCandidateLink(group.references[0]), group.references[0].requestId, 'candidate')}
                                                                className="text-nano-gray-600 hover:text-semester-blue text-xs font-medium px-2 py-1 hover:bg-nano-gray-100 rounded"
                                                            >
                                                                {copiedId === `${group.references[0].requestId}-candidate` ? '✅' : '📧'} Consent
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
