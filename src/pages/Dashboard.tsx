import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Loader } from '../components/UI';
import { NewRequestModal } from '../components/NewRequestModal';
import { RequestList } from '../components/RequestList';
import { ReferenceViewer } from '../components/ReferenceViewer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Header } from '../components/Header';
import { runGAS, runGASCallback } from '../lib/api';
import type { Request } from '../types';

import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<any>({ total: 0, pending: 0, completed: 0, flagged: 0, archived: 0 });

    // New filter and search state
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    // Selection state for bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    const loadRequests = React.useCallback(() => {
        if (!user?.email) return;
        setIsLoading(true);
        console.log('[Dashboard] Loading requests via callback API...');

        // Use callback-based API to bypass Promise resolution issues
        runGASCallback(
            'getMyRequests',
            { includeArchived: true, userEmail: user.email },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (response: any) => {
                console.log('[Dashboard] Data received:', response);
                const data = response?.data || [];
                // Ensure state update happens in a new tick to be safe
                setTimeout(() => {
                    setRequests(data);
                    calculateStats(data);
                    setSelectedIds(new Set());
                    setIsLoading(false);
                    console.log(`[Dashboard] Set requests state with ${data.length} items`);
                }, 0);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (error: any) => {
                console.error('[Dashboard] Failed to load requests:', error);
                setIsLoading(false);
            }
        );
    }, [user?.email]);

    // Fetch requests on load
    useEffect(() => {
        if (user?.email) {
            loadRequests();
        }
    }, [loadRequests, user?.email]);

    const calculateStats = (data: Request[]) => {
        const activeRequests = data.filter(r => !r.archived);
        setStats({
            total: activeRequests.length,
            pending: activeRequests.filter(r => r.status === 'PENDING_CONSENT' || r.status === 'Sent' || r.status === 'Pending_Consent').length,
            completed: activeRequests.filter(r => ['Completed', 'Consent_Given', 'CONSENT_GIVEN', 'SEALED', 'Declined'].includes(r.status)).length,
            flagged: activeRequests.filter(r => r.anomalyFlag || r.status === 'EXPIRED' || r.status === 'Flagged').length,
            archived: data.filter(r => r.archived).length,
        });
    };

    const showSuccessToast = (message: string) => {
        setToastMessage(message);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const showErrorToast = (message: string) => {
        setToastMessage(message);
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
    };

    const handleCreateRequest = async (formData: { candidateName: string; candidateEmail: string; refereeName: string; refereeEmail: string; templateId?: string }) => {
        if (!user?.email) return;

        // Optimistic Update
        const tempId = 'temp-' + Date.now();
        const newRequest: Request = {
            requestId: tempId,
            candidateName: formData.candidateName,
            candidateEmail: formData.candidateEmail,
            refereeName: formData.refereeName,
            refereeEmail: formData.refereeEmail,
            status: 'PENDING_CONSENT',
            consentStatus: false,
            anomalyFlag: false,
            token: '',
            createdAt: new Date().toISOString()
        };

        setRequests(prev => [newRequest, ...prev]);
        calculateStats([newRequest, ...requests]);
        setIsModalOpen(false);

        try {
            const result = await runGAS('initiateRequest', {
                candidateName: formData.candidateName,
                candidateEmail: formData.candidateEmail,
                refereeName: formData.refereeName,
                refereeEmail: formData.refereeEmail,
                templateId: formData.templateId || 'standard-social-care',
                userEmail: user.email
            }) as { success: boolean; requestId: string; error?: string };

            if (result.success) {
                // Update temp ID with real ID
                setRequests(prev => prev.map(r =>
                    r.requestId === tempId ? { ...r, requestId: result.requestId } : r
                ));
                showSuccessToast('✓ Reference request created successfully');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to create request:', error);
            // Revert optimistic update
            setRequests(prev => prev.filter(r => r.requestId !== tempId));
            calculateStats(requests.filter(r => r.requestId !== tempId));
            alert('Failed to create request. Please try again.');
        }
    };

    // Bulk action handlers
    const handleArchiveSelected = async () => {
        if (selectedIds.size === 0 || !user?.email) return;

        setIsBulkActionLoading(true);
        try {
            const result = await runGAS('archiveRequests', { requestIds: Array.from(selectedIds), userEmail: user.email }) as { success: boolean; archivedCount?: number; error?: string };

            if (result.success) {
                showSuccessToast(`✓ Archived ${result.archivedCount || selectedIds.size} request(s)`);
                await loadRequests();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to archive:', error);
            showErrorToast('Failed to archive requests');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleUnarchiveSelected = async () => {
        if (selectedIds.size === 0 || !user?.email) return;

        setIsBulkActionLoading(true);
        try {
            const result = await runGAS('unarchiveRequests', { requestIds: Array.from(selectedIds), userEmail: user.email }) as { success: boolean; unarchivedCount?: number; error?: string };

            if (result.success) {
                showSuccessToast(`✓ Unarchived ${result.unarchivedCount || selectedIds.size} request(s)`);
                await loadRequests();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to unarchive:', error);
            showErrorToast('Failed to unarchive requests');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0 || !user?.email) return;

        // Confirm before delete
        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedIds.size} request(s)?\n\n` +
            '⚠️ Only test data (emails containing "test@" or "example.com") can be deleted.\n\n' +
            'This action cannot be undone.'
        );

        if (!confirmed) return;

        setIsBulkActionLoading(true);
        try {
            const result = await runGAS('deleteRequests', { requestIds: Array.from(selectedIds), userEmail: user.email }) as {
                success: boolean;
                deletedCount?: number;
                skippedCount?: number;
                skippedMessage?: string;
                error?: string
            };

            if (result.success) {
                let message = `✓ Deleted ${result.deletedCount || 0} test request(s)`;
                if (result.skippedCount && result.skippedCount > 0) {
                    message += `. ${result.skippedCount} skipped (not test data).`;
                }
                showSuccessToast(message);
                await loadRequests();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            showErrorToast('Failed to delete requests');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Check if any selected items are archived
    const hasArchivedSelected = Array.from(selectedIds).some(id => {
        const req = requests.find(r => r.requestId === id);
        return req?.archived;
    });

    const hasActiveSelected = Array.from(selectedIds).some(id => {
        const req = requests.find(r => r.requestId === id);
        return !req?.archived;
    });

    return (
        <div className="min-h-screen bg-nano-gray-50 font-sans">
            {/* Toast */}
            {showToast && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in">
                    <div className={`${toastType === 'success' ? 'bg-status-success' : 'bg-status-error'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`}>
                        <span className="text-lg">{toastType === 'success' ? '✓' : '✕'}</span>
                        <span className="font-medium">{toastMessage}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <Header user={user} onSignOut={logout}>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-semester-blue text-white hover:bg-semester-blue-dark font-medium shadow-sm border-none flex items-center gap-2"
                >
                    <span className="text-lg leading-none">+</span> New Request
                </Button>
            </Header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter('all'); setShowArchived(false); }}>
                        <div className="text-sm text-nano-gray-600 mb-1">Active Requests</div>
                        <div className="text-3xl font-semibold text-nano-gray-900">{stats.total}</div>
                        <div className="text-xs text-nano-gray-400 mt-1">All time</div>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter('pending'); setShowArchived(false); }}>
                        <div className="text-sm text-nano-gray-600 mb-1">Pending</div>
                        <div className="text-3xl font-semibold text-status-warning">{stats.pending}</div>
                        <div className="text-xs text-nano-gray-400 mt-1">Awaiting action</div>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter('completed'); setShowArchived(false); }}>
                        <div className="text-sm text-nano-gray-600 mb-1">Completed</div>
                        <div className="text-3xl font-semibold text-status-success">{stats.completed}</div>
                        <div className="text-xs text-nano-gray-400 mt-1">Ready to review</div>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter('flagged'); setShowArchived(false); }}>
                        <div className="text-sm text-nano-gray-600 mb-1">Flagged/Expired</div>
                        <div className="text-3xl font-semibold text-status-error">{stats.flagged}</div>
                        <div className="text-xs text-nano-gray-400 mt-1">Needs attention</div>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter('archived'); setShowArchived(true); }}>
                        <div className="text-sm text-nano-gray-600 mb-1">Archived</div>
                        <div className="text-3xl font-semibold text-nano-gray-400">{stats.archived}</div>
                        <div className="text-xs text-nano-gray-400 mt-1">Hidden from view</div>
                    </Card>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="mb-4 bg-semester-blue/5 border border-semester-blue/20 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="font-medium text-nano-gray-700">
                                {selectedIds.size} selected
                            </span>
                            <div className="h-4 w-px bg-nano-gray-300"></div>
                            <div className="flex gap-2">
                                {hasActiveSelected && (
                                    <Button
                                        variant="secondary"
                                        onClick={handleArchiveSelected}
                                        disabled={isBulkActionLoading}
                                        className="text-sm"
                                    >
                                        📦 Archive
                                    </Button>
                                )}
                                {hasArchivedSelected && (
                                    <Button
                                        variant="secondary"
                                        onClick={handleUnarchiveSelected}
                                        disabled={isBulkActionLoading}
                                        className="text-sm"
                                    >
                                        📤 Unarchive
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    onClick={handleDeleteSelected}
                                    disabled={isBulkActionLoading}
                                    className="text-sm text-status-error hover:bg-status-error/10"
                                >
                                    🗑️ Delete (test data only)
                                </Button>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-nano-gray-500 hover:text-nano-gray-700"
                        >
                            ✕ Clear
                        </button>
                    </div>
                )}

                {/* Request List */}
                <div className="mb-8">
                    <Card className="flex-1">
                        <div className="p-6 border-b border-nano-gray-200">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-nano-gray-900">Reference Requests</h2>

                                </div>

                                {/* Controls */}
                                <div className="flex flex-col md:flex-row gap-3">
                                    {/* Search */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by name or email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-nano-gray-300 rounded-lg focus:ring-2 focus:ring-semester-blue focus:border-semester-blue transition-all text-sm w-full md:w-64"
                                        />
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nano-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>

                                    {/* Status Filter */}
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setShowArchived(e.target.value === 'archived');
                                        }}
                                        className="px-4 py-2 border border-nano-gray-300 rounded-lg focus:ring-2 focus:ring-semester-blue focus:border-semester-blue transition-all text-sm bg-white"
                                    >
                                        <option value="all">All Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                        <option value="flagged">Flagged/Expired</option>
                                        <option value="archived">Archived</option>
                                    </select>

                                    {/* Show Archived Toggle */}
                                    {statusFilter !== 'archived' && (
                                        <label className="flex items-center gap-2 text-sm text-nano-gray-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showArchived}
                                                onChange={(e) => setShowArchived(e.target.checked)}
                                                className="w-4 h-4 text-semester-blue border-nano-gray-300 rounded focus:ring-semester-blue"
                                            />
                                            Show archived
                                        </label>
                                    )}

                                    {/* Refresh Button */}
                                    <Button variant="ghost" onClick={loadRequests} disabled={isLoading}>
                                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Refresh
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <RequestList
                            requests={requests}
                            isLoading={isLoading}
                            onViewRequest={(req) => setSelectedRequest(req)}
                            statusFilter={statusFilter}
                            searchQuery={searchQuery}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                            showArchived={showArchived}
                        />
                    </Card>
                </div>
            </main>

            {/* New Request Modal */}
            {isModalOpen && (
                <NewRequestModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleCreateRequest}
                />
            )}

            {/* Reference Viewer Modal */}
            {selectedRequest && (
                <ErrorBoundary>
                    <ReferenceViewer
                        requestId={selectedRequest.requestId}
                        candidateName={selectedRequest.candidateName}
                        refereeName={selectedRequest.refereeName}
                        status={selectedRequest.status}
                        onClose={() => setSelectedRequest(null)}
                        onSealed={loadRequests}
                    />
                </ErrorBoundary>
            )}
        </div>
    );
};

export default Dashboard;
