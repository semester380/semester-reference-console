import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input } from '../components/UI';
import { DynamicForm } from '../components/DynamicForm';
import { runGAS } from '../lib/api';
import { Header } from '../components/Header';
import type { TemplateField, Template } from '../types';

import { useAuth } from '../context/AuthContext';

const TemplateBuilder: React.FC = () => {
    const { user, logout } = useAuth();
    const isTemplateAdmin = user?.email === 'rob@semester.co.uk' || user?.email === 'nicola@semester.co.uk';

    // State
    const [templateName, setTemplateName] = useState('New Reference Template');
    const [fields, setFields] = useState<TemplateField[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder');
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [isDirty, setIsDirty] = useState(false);

    // Maintenance Mode Check
    const isMaintenanceMode = new URLSearchParams(window.location.search).get('maintenance') === 'true';

    // Load templates on mount
    const loadTemplates = useCallback(async () => {
        try {
            const result = await runGAS('getTemplates');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loadedTemplates = Array.isArray(result) ? result : (result as any).data || [];
            setTemplates(loadedTemplates);
        } catch (error) {
            console.error("Failed to load templates", error);
        }
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // Warn on unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const selectTemplate = (template: Template) => {
        if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;

        setTemplateName(template.name);
        setFields(template.structureJSON || []);
        setSelectedTemplateId(template.templateId);
        setIsDirty(false);
        setSaveStatus('idle');
    };

    const handleNewTemplate = () => {
        if (!isTemplateAdmin) return;
        if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;

        setTemplateName('New Reference Template');
        setFields([]);
        setSelectedTemplateId('');
        setIsDirty(false);
        setSaveStatus('idle');
    };

    const duplicateTemplate = () => {
        if (!isTemplateAdmin) return;
        if (isDirty && !window.confirm('You must save or discard changes before duplicating. Discard current changes?')) return;

        setTemplateName(`Copy of ${templateName}`);
        setSelectedTemplateId(''); // New ID on save
        setIsDirty(true);
        setSaveStatus('idle');
    }

    // Field Operations
    const handleFieldChange = (newFields: TemplateField[]) => {
        setFields(newFields);
        setIsDirty(true);
        setSaveStatus('idle');
    };

    const addField = (type: TemplateField['type']) => {
        if (!isTemplateAdmin) return;
        const newField: TemplateField = {
            id: `field_${Date.now()}`,
            type,
            label: 'New Question',
            required: false,
            layout: 'full'
        };
        handleFieldChange([...fields, newField]);
    };

    const updateField = (id: string, updates: Partial<TemplateField>) => {
        if (!isTemplateAdmin) return;
        handleFieldChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeField = (id: string) => {
        if (!isTemplateAdmin) return;
        handleFieldChange(fields.filter(f => f.id !== id));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (!isTemplateAdmin) return;
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;

        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
        handleFieldChange(newFields);
    };

    const handleSave = async () => {
        if (!isTemplateAdmin || !user?.email) return;
        setIsSaving(true);
        setSaveStatus('saving');
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await runGAS('saveTemplate', {
                templateName,
                structureJSON: fields,
                templateId: selectedTemplateId,
                userEmail: user.email
            }) as any;

            if (result && result.templateId) {
                setSelectedTemplateId(result.templateId);
            }
            setIsDirty(false);
            setSaveStatus('saved');
            await loadTemplates();

            // Revert status to idle after 3s
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch {
            setSaveStatus('error');
            alert('Failed to save template. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Maintenance Tools
    const runMaintenanceAction = async (action: string, confirmMsg: string) => {
        if (!window.confirm(confirmMsg) || !user?.email) return;
        try {
            await runGAS(action, { userEmail: user.email });
            alert('Action completed successfully.');
            await loadTemplates();
        } catch (e) {
            alert('Action failed: ' + e);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Maintenance Banner */}
            {isMaintenanceMode && isTemplateAdmin && (
                <div className="bg-red-600 text-white text-xs font-bold text-center py-1 uppercase tracking-wider">
                    ⚠️ Maintenance Mode Active - Use Tools With Caution ⚠️
                </div>
            )}
            <Header user={user} onSignOut={logout}>
                <div className="flex items-center gap-4">
                    {/* Back to Dashboard */}
                    <Button variant="ghost" className="hidden sm:inline-flex text-nano-gray-500 hover:text-nano-gray-900" onClick={() => window.location.href = '/'}>
                        ← Dashboard
                    </Button>

                    {/* Template Selector */}
                    <div className="relative group">
                        <select
                            className="appearance-none bg-white border border-nano-gray-300 text-nano-gray-900 text-sm rounded-lg pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-semester-blue/20 focus:border-semester-blue cursor-pointer hover:border-semester-blue transition-colors min-w-[240px]"
                            value={selectedTemplateId}
                            onChange={(e) => {
                                if (e.target.value === 'new') handleNewTemplate();
                                else {
                                    const t = templates.find(temp => temp.templateId === e.target.value);
                                    if (t) selectTemplate(t);
                                }
                            }}
                        >
                            <option value="" disabled>Select a template...</option>
                            {templates.map(t => (
                                <option key={t.templateId} value={t.templateId}>
                                    {t.name}
                                </option>
                            ))}
                            {isTemplateAdmin && (
                                <>
                                    <option disabled>──────────</option>
                                    <option value="new">+ Create New Template</option>
                                </>
                            )}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-nano-gray-400">
                            ▼
                        </div>
                    </div>

                    {/* Actions */}
                    {isTemplateAdmin ? (
                        <div className="flex items-center gap-2">
                            {selectedTemplateId && (
                                <Button
                                    variant="secondary"
                                    className="text-sm"
                                    onClick={duplicateTemplate}
                                    title="Duplicate Template"
                                >
                                    Duplicate
                                </Button>
                            )}
                            <Button
                                onClick={handleSave}
                                disabled={!isDirty || isSaving}
                                className={`transition-all min-w-[100px] ${saveStatus === 'saved'
                                    ? 'bg-status-success hover:bg-status-success/90 text-white border-transparent'
                                    : 'bg-semester-blue text-white hover:bg-semester-blue-dark'
                                    }`}
                            >
                                {saveStatus === 'saving' ? 'Saving...' :
                                    saveStatus === 'saved' ? 'Saved ✓' :
                                        'Save Changes'}
                            </Button>
                        </div>
                    ) : (
                        <div className="text-gray-400 text-sm italic px-3 bg-gray-50 rounded border border-gray-100 py-1.5">
                            Read Only Mode
                        </div>
                    )}
                </div>
            </Header>

            {/* View Toggle */}
            < div className="bg-white border-b border-nano-gray-200" >
                <div className="max-w-7xl mx-auto px-6 py-2 flex justify-center">
                    <div className="flex bg-nano-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('builder')}
                            className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'builder'
                                ? 'bg-white text-semester-blue shadow-sm ring-1 ring-black/5'
                                : 'text-nano-gray-500 hover:text-nano-gray-900'
                                }`}
                        >
                            Builder
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'preview'
                                ? 'bg-white text-semester-blue shadow-sm ring-1 ring-black/5'
                                : 'text-nano-gray-500 hover:text-nano-gray-900'
                                }`}
                        >
                            Live Preview
                        </button>
                    </div>
                </div>
            </div >

            {/* Main Content */}
            < main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex gap-8" >

                {/* BUILDER TAB */}
                < div className={`flex-1 flex flex-col gap-6 ${activeTab === 'preview' ? 'hidden' : 'block'}`}>
                    {/* Template Settings */}
                    < Card className="p-6" >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-nano-gray-500 uppercase tracking-wide mb-1">
                                    Template Name
                                    {isDirty && <span className="text-amber-500 ml-1" title="Unsaved changes">*</span>}
                                </label>
                                <Input
                                    value={templateName}
                                    onChange={(e) => {
                                        setTemplateName(e.target.value);
                                        setIsDirty(true);
                                        setSaveStatus('idle');
                                    }}
                                    className="text-lg font-medium"
                                    placeholder="e.g., Senior Developer Reference"
                                    disabled={!isTemplateAdmin}
                                />
                            </div>
                            {selectedTemplateId && isTemplateAdmin && (
                                <div className="ml-4 pt-6">
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Delete this template permanently?') && user?.email) {
                                                await runGAS('deleteTemplate', { templateId: selectedTemplateId, userEmail: user.email });
                                                handleNewTemplate();
                                                await loadTemplates();
                                            }
                                        }}
                                        className="text-red-500 text-sm hover:underline hover:text-red-700"
                                    >
                                        Delete Template
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card >

                    {/* Fields List */}
                    < Card className="flex-1 flex flex-col min-h-[500px]" >
                        <div className="p-4 bg-nano-gray-50 border-b border-nano-gray-200 flex justify-between items-center rounded-t-xl">
                            <h2 className="font-semibold text-nano-gray-800">Questions & Fields</h2>
                            <span className="text-xs text-nano-gray-500">{fields.length} items</span>
                        </div>

                        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                            {fields.map((field, index) => (
                                <div key={field.id} className="bg-white p-4 rounded-xl border border-nano-gray-200 shadow-sm hover:border-semester-blue/30 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => moveField(index, 'up')}
                                                    disabled={index === 0 || !isTemplateAdmin}
                                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-nano-gray-100 text-nano-gray-400 disabled:opacity-30"
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    onClick={() => moveField(index, 'down')}
                                                    disabled={index === fields.length - 1 || !isTemplateAdmin}
                                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-nano-gray-100 text-nano-gray-400 disabled:opacity-30"
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                            <span className="px-2 py-1 bg-nano-gray-100 rounded text-xs font-mono text-nano-gray-600 border border-nano-gray-200 uppercase tracking-wider">
                                                {field.type}
                                            </span>
                                            {field.required && (
                                                <span className="text-xs text-status-error font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Required</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeField(field.id)}
                                            disabled={!isTemplateAdmin}
                                            className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden"
                                            title="Remove Field"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className="space-y-4 pl-9">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-nano-gray-500 mb-1">Question Label</label>
                                                <Input
                                                    value={field.label}
                                                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                    disabled={!isTemplateAdmin}
                                                    className="w-full"
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-nano-gray-500 mb-1">Help Text (Optional)</label>
                                                <Input
                                                    value={field.description || ''}
                                                    onChange={(e) => updateField(field.id, { description: e.target.value })}
                                                    disabled={!isTemplateAdmin}
                                                    placeholder="Additional context for the referee..."
                                                    className="w-full text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-nano-gray-500 mb-1">Width</label>
                                                <select
                                                    className="w-full px-3 py-2 bg-white rounded border border-nano-gray-300 focus:ring-semester-blue focus:border-semester-blue text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                                    value={field.layout || 'full'}
                                                    onChange={(e) => updateField(field.id, { layout: e.target.value as 'full' | 'half' })}
                                                    disabled={!isTemplateAdmin}
                                                >
                                                    <option value="full">Full Width</option>
                                                    <option value="half">Half Width (2 cols)</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center pt-5">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                        disabled={!isTemplateAdmin}
                                                        className="rounded border-nano-gray-300 text-semester-blue focus:ring-semester-blue"
                                                    />
                                                    <span className="text-sm text-nano-gray-700">Required Field</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-16 text-nano-gray-400 border-2 border-dashed border-nano-gray-200 rounded-lg">
                                    <p className="font-medium text-nano-gray-600">This template is empty.</p>
                                    {isTemplateAdmin ?
                                        <p className="text-sm mt-1">Use the toolbar below to add questions.</p> :
                                        <p className="text-sm mt-1">Waiting for an admin to add questions.</p>
                                    }
                                </div>
                            )}
                        </div>

                        {/* Add Field Toolbar */}
                        {
                            isTemplateAdmin && (
                                <div className="p-4 bg-nano-gray-50 border-t border-nano-gray-200 rounded-b-xl sticky bottom-0 z-10">
                                    <p className="text-xs font-bold text-nano-gray-400 uppercase tracking-wider mb-2">Append Field</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { type: 'rating', icon: '⭐', label: 'Rating' },
                                            { type: 'text', icon: '✍️', label: 'Short Text' },
                                            { type: 'textarea', icon: '📝', label: 'Long Text' },
                                            { type: 'boolean', icon: '⚡', label: 'Yes/No' },
                                            { type: 'date', icon: '📅', label: 'Date' },
                                            { type: 'signature', icon: '✒️', label: 'Signature' },
                                        ].map(btn => (
                                            <button
                                                key={btn.type}
                                                onClick={() => addField(btn.type as TemplateField['type'])}
                                                className="px-3 py-2 bg-white border border-nano-gray-200 rounded-lg shadow-sm hover:border-semester-blue hover:text-semester-blue hover:shadow transition-all text-sm font-medium flex items-center gap-2"
                                            >
                                                <span>{btn.icon}</span>
                                                {btn.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                    </Card >

                    {/* Maintenance Tools (Hidden unless enabled) */}
                    {
                        isMaintenanceMode && isTemplateAdmin && (
                            <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-xl">
                                <h3 className="text-red-800 font-bold mb-4 flex items-center gap-2">
                                    <span>🛠️</span> Maintenance Tools
                                </h3>
                                <div className="flex gap-4">
                                    <Button
                                        variant="secondary"
                                        onClick={() => runMaintenanceAction('initializeDatabase', 'Restore Defaults: This will reset templates if missing.')}
                                        className="bg-white border-red-200 text-red-700 hover:bg-red-100"
                                    >
                                        Soft Restore
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => runMaintenanceAction('seedEmploymentTemplate', 'SEED: Overwrite Employment Template?')}
                                        className="bg-white border-red-200 text-red-700 hover:bg-red-100"
                                    >
                                        Seed Emp. Ref
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => runMaintenanceAction('fixTemplateStructure', 'FIX: Wipe and recreate "Standard Social Care"?')}
                                        className="bg-white border-red-200 text-red-700 hover:bg-red-100"
                                    >
                                        Fix Structure
                                    </Button>
                                </div>
                            </div>
                        )
                    }
                </div >

                {/* PREVIEW TAB */}
                < div className={`flex-1 ${activeTab === 'builder' ? 'hidden' : 'block'}`}>
                    <div className="sticky top-24 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-nano-gray-900">Live Preview</h2>
                                <p className="text-nano-gray-500 text-sm">See how it looks for referees</p>
                            </div>

                            <div className="flex bg-nano-gray-200 p-1 rounded-lg">
                                <button
                                    onClick={() => setPreviewMode('mobile')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'mobile'
                                        ? 'bg-white text-nano-gray-900 shadow-sm'
                                        : 'text-nano-gray-600 hover:text-nano-gray-900'
                                        }`}
                                >
                                    📱 Mobile
                                </button>
                                <button
                                    onClick={() => setPreviewMode('desktop')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'desktop'
                                        ? 'bg-white text-nano-gray-900 shadow-sm'
                                        : 'text-nano-gray-600 hover:text-nano-gray-900'
                                        }`}
                                >
                                    💻 Desktop
                                </button>
                            </div>
                        </div>

                        {previewMode === 'mobile' ? (
                            <div className="mx-auto max-w-[375px] border-[8px] border-nano-gray-800 rounded-[3rem] overflow-hidden bg-white shadow-2xl h-[700px] relative ring-4 ring-gray-100">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-nano-gray-800 rounded-b-xl z-20"></div>
                                <div className="h-full overflow-y-auto bg-nano-gray-50 scrollbar-hide">
                                    <div className="p-6 pt-12">
                                        <div className="text-center mb-6">
                                            <h1 className="text-lg font-bold text-nano-gray-900 leading-tight">Reference Request</h1>
                                            <p className="mt-2 text-xs text-nano-gray-500">
                                                for <span className="font-semibold text-nano-gray-900">John Doe</span>
                                            </p>
                                        </div>

                                        <Card className="p-4 shadow-sm border-0">
                                            <DynamicForm
                                                structure={fields}
                                                onSubmit={(data) => console.log('Preview Submit:', data)}
                                                previewMode="mobile"
                                            />
                                        </Card>

                                        <div className="mt-8 mb-4 text-center">
                                            <div className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-full">
                                                🔒 Secured by Semester
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Card className="p-10 bg-white shadow-xl w-full border border-nano-gray-100">
                                <div className="max-w-3xl mx-auto">
                                    <div className="text-center mb-10 pb-8 border-b border-nano-gray-100">
                                        <h1 className="text-3xl font-bold text-nano-gray-900 tracking-tight">Reference Request</h1>
                                        <p className="mt-3 text-nano-gray-500">
                                            Please provide a reference for <span className="font-semibold text-nano-gray-900">John Doe</span>
                                        </p>
                                    </div>

                                    <DynamicForm
                                        structure={fields}
                                        onSubmit={(data) => console.log('Preview Submit:', data)}
                                        previewMode="desktop"
                                    />

                                    <div className="mt-12 text-center text-xs text-nano-gray-400 pt-8 border-t border-nano-gray-100 flex justify-center items-center gap-2">
                                        <span>🔒</span>
                                        <span>Securely processed by Semester.co.uk</span>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div >
            </main >
        </div >
    );
};

export default TemplateBuilder;
