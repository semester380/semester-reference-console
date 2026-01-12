
import React, { useState, useEffect } from 'react';
import { callAction } from './lib/api';

export default function RefereePortal() {
    const [status, setStatus] = useState('loading'); // loading, ready, error, success
    const [token, setToken] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [candidateName, setCandidateName] = useState('');
    const [template, setTemplate] = useState(null);
    const [activeTab, setActiveTab] = useState('form'); // form, upload, decline

    // Form State
    const [responses, setResponses] = useState({});

    // Upload State
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Decline State
    const [declineReason, setDeclineReason] = useState('');
    const [declineDetails, setDeclineDetails] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        if (!t) {
            setStatus('error');
            setErrorMsg('Missing referee token.');
        } else {
            setToken(t);
            validateToken(t);
        }
    }, []);

    const validateToken = async (t) => {
        const result = await callAction('validateRefereeToken', { token: t });
        if (result.valid) {
            setCandidateName(result.candidateName);
            setTemplate(result.template);
            setStatus('ready');

            // Initialize responses
            let init = {};
            // Flatten if needed or just handle dynamically
            // Safe parsing of template fields
            let fields = [];
            if (result.template.sections) {
                result.template.sections.forEach(s => fields.push(...s.fields));
            } else if (Array.isArray(result.template.StructureJSON)) {
                fields = result.template.StructureJSON;
            } else if (typeof result.template.StructureJSON === 'string') {
                try { fields = JSON.parse(result.template.StructureJSON); } catch (e) { }
            }

            // If template provides a direct array of fields (legacy or simplified)
            if (Array.isArray(result.template)) fields = result.template;

            // ... actually, let's rely on render logic to find fields
        } else {
            setStatus('error');
            setErrorMsg(result.error || 'Invalid or expired token.');
        }
    };

    const handleFieldChange = (id, value) => {
        setResponses(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        setStatus('submitting');

        const payload = {
            token,
            method: 'form',
            responses: responses
        };

        const result = await callAction('submitReference', payload);
        if (result.success) {
            setStatus('success');
        } else {
            setStatus('error'); // Or stay on ready with alert
            setErrorMsg(result.error);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        try {
            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Content = reader.result.split(',')[1];
                const mimeType = file.type;

                // First upload the file
                const upResult = await callAction('uploadReferenceDocument', {
                    token,
                    fileData: base64Content,
                    fileName: file.name,
                    mimeType: mimeType
                });

                if (upResult.success) {
                    // Then submit the reference as 'upload' method
                    // Actually submitReference handles the final status update
                    // But typically uploadReferenceDocument returns a URL that we pass to submitReference?
                    // Let's check API Map...
                    // uploadReferenceDocument returns { success: true, fileUrl: string }
                    // submitReference(method='upload', uploadedFileUrl=...)

                    const submitPayload = {
                        token,
                        method: 'upload',
                        uploadedFileUrl: upResult.fileUrl, // Make sure backend returns this!
                        fileName: file.name
                    };

                    const finResult = await callAction('submitReference', submitPayload);
                    if (finResult.success) {
                        setStatus('success');
                    } else {
                        throw new Error(finResult.error);
                    }
                } else {
                    throw new Error(upResult.error);
                }
            };
        } catch (err) {
            alert("Upload failed: " + err.message);
            setUploading(false);
        }
    };

    const handleDecline = async () => {
        if (!declineReason) {
            alert("Please provide a reason.");
            return;
        }
        setStatus('submitting');
        const payload = {
            token,
            method: 'decline',
            declineReason,
            declineDetails
        };
        const result = await callAction('submitReference', payload);
        if (result.success) {
            setStatus('success'); // Maybe success-decline state?
        } else {
            setStatus('error');
            setErrorMsg(result.error);
        }
    };

    // Render Logic
    if (status === 'loading' || status === 'submitting') {
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
                    <p className="text-gray-600">Your reference for {candidateName} has been submitted securely.</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
                <div className="text-center text-red-700">
                    <h2 className="text-xl font-bold">Error</h2>
                    <p>{errorMsg}</p>
                </div>
            </div>
        );
    }

    // Main Form Render (Simplified for prompt brevity, would iterate fields)
    // Extract fields safely
    let fields = [];
    if (template && template.sections) {
        template.sections.forEach(s => fields.push(...s.fields));
    } else if (template && typeof template.StructureJSON === 'string') {
        try { fields = JSON.parse(template.StructureJSON); } catch (e) { }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                            <div className="w-2 h-2 rounded-full bg-[var(--color-plum)]"></div>
                            <div className="w-2 h-2 rounded-full bg-[var(--color-pink)]"></div>
                        </div>
                        <span className="font-bold text-lg text-gray-900">Semester</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Reference Request</h1>
                    <p className="mt-2 text-lg text-gray-600">for {candidateName}</p>
                </div>

                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('form')}
                                className={`${activeTab === 'form' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                            >
                                Online Form
                            </button>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`${activeTab === 'upload' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                            >
                                Upload Document
                            </button>
                            <button
                                onClick={() => setActiveTab('decline')}
                                className={`${activeTab === 'decline' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                            >
                                Decline
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'form' && (
                            <form onSubmit={handleSubmitForm} className="space-y-6">
                                {fields.length > 0 ? fields.map((field, idx) => (
                                    <div key={field.id || idx}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            required={field.required}
                                            className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                            onChange={(e) => handleFieldChange(field.id || field.label, e.target.value)}
                                        />
                                    </div>
                                )) : (
                                    <p className="text-gray-500">Form template loading...</p>
                                )}

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Submit Reference
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'upload' && (
                            <div className="space-y-6 text-center">
                                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[var(--color-primary)] hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files[0])} />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PDF, DOC up to 10MB</p>
                                    </div>
                                </div>
                                {file && <p className="text-sm text-gray-900 font-medium">Selected: {file.name}</p>}
                                <button
                                    onClick={handleFileUpload}
                                    disabled={!file || uploading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {uploading ? 'Uploading...' : 'Upload & Submit'}
                                </button>
                            </div>
                        )}

                        {activeTab === 'decline' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Reason</label>
                                    <select
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        value={declineReason}
                                    >
                                        <option value="">Select a reason...</option>
                                        <option value="Policy">Company Policy (No References)</option>
                                        <option value="Unknown">Don't know the candidate</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Details</label>
                                    <textarea
                                        rows={3}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                        onChange={(e) => setDeclineDetails(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleDecline}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                                >
                                    Decline Request
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
