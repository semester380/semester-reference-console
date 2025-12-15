import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input } from '../components/UI';
import { DynamicForm } from '../components/DynamicForm';
import { runGAS } from '../lib/api';
import { Logo } from '../components/Logo';
import type { TemplateField, Template } from '../types';

import { useAuth } from '../context/AuthContext';

const TemplateBuilder: React.FC = () => {
    const { user, logout } = useAuth();
    const isTemplateAdmin = user?.email === 'rob@semester.co.uk' || user?.email === 'nicola@semester.co.uk';

    const [templateName, setTemplateName] = useState('New Reference Template');
    const [fields, setFields] = useState<TemplateField[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder');
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Load templates on mount
    const loadTemplates = useCallback(async () => {
        try {
            const result = await runGAS('getTemplates');
            // Check if result is the array or the response wrapper
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loadedTemplates = Array.isArray(result) ? result : (result as any).data || [];

            setTemplates(loadedTemplates);
            // DEBUG: Alert what we got
            alert('Debug Templates: ' + JSON.stringify(result));


            // HELPFUL DEBUG & AUTO-REPAIR
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meta = (result as any).meta;
            if (loadedTemplates.length === 0) {
                if (meta) {
                    alert(`DEBUG: No templates found.\nTotal Rows in Sheet: ${meta.totalRows}\nParse Errors: ${meta.parseErrors}\nSheet Name: ${meta.sheetName}`);
                } else {
                    console.warn("No templates found and no metadata returned.");
                }
            } else {
                // Check for "Corrupt Structure" (Empty fields on Standard Template)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const standard = loadedTemplates.find((t: any) => t.templateId === 'standard-social-care' || t.name === 'Standard Social Care Reference');
                if (standard) {
                    const hasFields = standard.structureJSON && Array.isArray(standard.structureJSON) && standard.structureJSON.length > 0;
                    if (!hasFields) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        // const repairKey = 'template_repair_attempted_' + Date.now().toString().substring(0, 8); // Unique per session/day approx
                        // Use a simpler flag to avoid infinite loops in short term
                        if (!sessionStorage.getItem('repair_triggered')) {
                            sessionStorage.setItem('repair_triggered', 'true');
                            console.warn("CORRUPT TEMPLATE DETECTED: Auto-repairing...");
                            try {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const repairResult = await runGAS('fixTemplateStructure') as any;
                                alert(`System Self-Repair: Standard Template restored.\nField Count: ${repairResult.fieldCount}`);
                                // Reload
                                window.location.reload();
                                return;
                            } catch (err) {
                                alert("System Self-Repair Failed: " + err);
                            }
                        }
                    }
                }
            }

            // Auto-select "Standard" template if available
            if (loadedTemplates.length > 0 && !selectedTemplateId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const standard = loadedTemplates.find((t: any) => t.templateId === 'standard-social-care');
                const first = standard || loadedTemplates[0];
                setTemplateName(first.name);
                setFields(first.structureJSON);
                setSelectedTemplateId(first.templateId);
            }
        } catch (error) {
            console.error("Failed to load templates", error);
        }
    }, [selectedTemplateId]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const selectTemplate = (template: Template) => {
        setTemplateName(template.name);
        setFields(template.structureJSON);
        setSelectedTemplateId(template.templateId);
    };

    const handleNewTemplate = () => {
        if (!isTemplateAdmin) return;
        setTemplateName('New Reference Template');
        setFields([]);
        setSelectedTemplateId('');
    };

    const addField = (type: TemplateField['type']) => {
        if (!isTemplateAdmin) return;
        const newField: TemplateField = {
            id: `field_${Date.now()}`,
            type,
            label: 'New Question',
            required: false,
            layout: 'full' // Default to full width
        };
        setFields([...fields, newField]);
    };

    const updateField = (id: string, updates: Partial<TemplateField>) => {
        if (!isTemplateAdmin) return;
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeField = (id: string) => {
        if (!isTemplateAdmin) return;
        setFields(fields.filter(f => f.id !== id));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (!isTemplateAdmin) return;
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === fields.length - 1)
        ) return;

        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
        setFields(newFields);
    };

    const handleSave = async () => {
        if (!isTemplateAdmin) return;
        setIsSaving(true);
        try {
            // Pass selectedTemplateId if updating, or undefined/null if new
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await runGAS('saveTemplate', templateName, fields, selectedTemplateId) as any;

            // If result contains the ID (which it should), update our selection state 
            // so subsequent saves update the same record instead of creating duplicates
            if (result && result.templateId) {
                setSelectedTemplateId(result.templateId);
            }

            alert('Template saved successfully!');
            await loadTemplates(); // Refresh list
        } catch {
            alert('Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-nano-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-semester-blue border-b border-semester-blue-dark sticky top-0 z-10 shadow-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => window.location.href = '/'}>
                            ← Back
                        </Button>
                        <div>
                            <Logo inverted={true} />
                            <div className="flex items-center gap-2 mt-1 pl-10">
                                <p className="text-sm text-blue-100">Template Builder <span className="opacity-50 text-xs ml-1">v0.0.3 + Debug</span></p>
                                {!isTemplateAdmin && (
                                    <span className="bg-white/10 text-white text-xs px-2 py-0.5 rounded border border-white/20">Read Only</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="mr-4">
                            <select
                                className="bg-white/10 border border-white/20 text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-white/50 placeholder-white/50"
                                style={{ colorScheme: 'dark' }}
                                value={selectedTemplateId}
                                onChange={(e) => {
                                    const t = templates.find(t => t.templateId === e.target.value);
                                    if (t) selectTemplate(t);
                                    else handleNewTemplate();
                                }}
                            >
                                {isTemplateAdmin && <option value="" className="text-gray-900">+ Create New Template</option>}
                                <option disabled className="text-gray-900">──────────</option>
                                {templates.map(t => (
                                    <option key={t.templateId} value={t.templateId} className="text-gray-900">
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex bg-nano-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('builder')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'builder'
                                    ? 'bg-white text-nano-gray-900 shadow-sm'
                                    : 'text-nano-gray-600 hover:text-nano-gray-900'
                                    }`}
                            >
                                {isTemplateAdmin ? 'Editor' : 'View Structure'}
                            </button>
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'preview'
                                    ? 'bg-white text-nano-gray-900 shadow-sm'
                                    : 'text-nano-gray-600 hover:text-nano-gray-900'
                                    }`}
                            >
                                Preview
                            </button>
                        </div>
                        {isTemplateAdmin ? (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={async () => {
                                        if (window.confirm('Restore default templates? This will add the Standard Social Care Reference if missing.')) {
                                            try {
                                                await runGAS('initializeDatabase');
                                                alert('Defaults restored!');
                                                await loadTemplates();
                                            } catch (e) {
                                                alert('Failed to restore defaults: ' + e);
                                            }
                                        }
                                    }}
                                    className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                                >
                                    Restore(Soft)
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={async () => {
                                        if (window.confirm('SEED TEMPLATE: This will overwrite/create the Employment Reference V1 template. Continue?')) {
                                            try {
                                                await runGAS('seedEmploymentTemplate');
                                                alert('Template seeded successfully!');
                                                await loadTemplates();
                                            } catch (e) {
                                                alert('Seed failed: ' + e);
                                            }
                                        }
                                    }}
                                    className="bg-blue-500/20 text-blue-200 border-blue-500/30 hover:bg-blue-500/30 ml-2"
                                >
                                    Seed Emp. Ref
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={async () => {
                                        if (window.confirm('FIX TEMPLATE STRUCTURE: This will wipe existing templates and recreate the default one with correct structure. Continue?')) {
                                            try {
                                                const result = await runGAS('fixTemplateStructure') as { message: string, fieldCount: number };
                                                alert(`Success! ${result.message}\nFields: ${result.fieldCount}`);
                                                await loadTemplates();
                                            } catch (e) {
                                                alert('Fix failed: ' + e);
                                            }
                                        }
                                    }}
                                    className="bg-green-500/20 text-green-200 border-green-500/30 hover:bg-green-500/30 ml-2"
                                >
                                    Fix Structure
                                </Button>
                                {selectedTemplateId && (
                                    <Button
                                        variant="secondary"
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to delete this template? This cannot be undone.')) {
                                                try {
                                                    await runGAS('deleteTemplate', selectedTemplateId);
                                                    alert('Template deleted');
                                                    handleNewTemplate();
                                                    await loadTemplates();
                                                } catch (e) {
                                                    alert('Failed to delete template: ' + e);
                                                }
                                            }
                                        }}
                                        className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                                    >
                                        Delete
                                    </Button>
                                )}
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Template'}
                                </Button>
                            </>
                        ) : (
                            <div className="text-white/50 text-xs italic pr-2">Editing Restricted</div>
                        )}
                        <Button variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40" onClick={logout}>
                            Sign Out
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex gap-8">
                {/* Editor Column */}
                <div className={`flex-1 ${activeTab === 'preview' ? 'hidden md:block' : ''}`}>
                    <Card className="h-full flex flex-col">
                        <div className="p-6 border-b border-nano-gray-200">
                            <label className="block text-sm font-medium text-nano-gray-700 mb-2">
                                Template Name
                            </label>
                            <Input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., Senior Developer Reference"
                                disabled={!isTemplateAdmin}
                            />
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-nano-gray-50 p-4 rounded-lg border border-nano-gray-200 group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-white px-2 py-1 rounded text-xs font-mono text-nano-gray-500 border border-nano-gray-200 uppercase">
                                                    {field.type}
                                                </span>
                                                <div className="flex flex-col">
                                                    <button
                                                        onClick={() => moveField(index, 'up')}
                                                        disabled={index === 0 || !isTemplateAdmin}
                                                        className="text-nano-gray-400 hover:text-semester-blue disabled:opacity-30 text-xs"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button
                                                        onClick={() => moveField(index, 'down')}
                                                        disabled={index === fields.length - 1 || !isTemplateAdmin}
                                                        className="text-nano-gray-400 hover:text-semester-blue disabled:opacity-30 text-xs"
                                                    >
                                                        ▼
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeField(field.id)}
                                                disabled={!isTemplateAdmin}
                                                className="text-status-error opacity-0 group-hover:opacity-100 transition-opacity text-sm hover:underline disabled:hidden"
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-nano-gray-500 mb-1">Question Label</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 rounded border border-nano-gray-300 focus:ring-semester-blue focus:border-semester-blue text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                                    value={field.label}
                                                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                    disabled={!isTemplateAdmin}
                                                />
                                            </div>

                                            {/* Layout option for desktop */}
                                            <div>
                                                <label className="block text-xs font-medium text-nano-gray-500 mb-1">Field Width (Desktop)</label>
                                                <select
                                                    className="w-full px-3 py-2 rounded border border-nano-gray-300 focus:ring-semester-blue focus:border-semester-blue text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                                    value={field.layout || 'full'}
                                                    onChange={(e) => updateField(field.id, { layout: e.target.value as 'full' | 'half' })}
                                                    disabled={!isTemplateAdmin}
                                                >
                                                    <option value="full">Full Width</option>
                                                    <option value="half">Half Width</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`req-${field.id}`}
                                                    checked={field.required}
                                                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                    className="rounded border-nano-gray-300 text-semester-blue focus:ring-semester-blue disabled:opacity-50"
                                                    disabled={!isTemplateAdmin}
                                                />
                                                <label htmlFor={`req-${field.id}`} className="text-sm text-nano-gray-700">Required field</label>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {fields.length === 0 && (
                                    <div className="text-center py-12 text-nano-gray-400 border-2 border-dashed border-nano-gray-200 rounded-lg">
                                        <p>No fields added yet.</p>
                                        <p className="text-sm mt-1">Click a button below to start building.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isTemplateAdmin && (
                            <div className="p-6 border-t border-nano-gray-200 bg-nano-gray-50 rounded-b-xl">
                                <p className="text-xs font-medium text-nano-gray-500 uppercase mb-3">Add Field</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <button
                                        onClick={() => addField('rating')}
                                        className="px-3 py-2 bg-white border border-nano-gray-200 rounded hover:border-semester-blue hover:text-semester-blue transition-colors text-sm font-medium"
                                    >
                                        ⭐ Rating
                                    </button>
                                    <button
                                        onClick={() => addField('text')}
                                        className="px-3 py-2 bg-white border border-nano-gray-200 rounded hover:border-semester-blue hover:text-semester-blue transition-colors text-sm font-medium"
                                    >
                                        📝 Text
                                    </button>
                                    <button
                                        onClick={() => addField('boolean')}
                                        className="px-3 py-2 bg-white border border-nano-gray-200 rounded hover:border-semester-blue hover:text-semester-blue transition-colors text-sm font-medium"
                                    >
                                        ✓ Yes/No
                                    </button>
                                    <button
                                        onClick={() => addField('date')}
                                        className="px-3 py-2 bg-white border border-nano-gray-200 rounded hover:border-semester-blue hover:text-semester-blue transition-colors text-sm font-medium"
                                    >
                                        📅 Date
                                    </button>
                                    <button
                                        onClick={() => addField('textarea')}
                                        className="px-3 py-2 bg-white border border-nano-gray-200 rounded hover:border-semester-blue hover:text-semester-blue transition-colors text-sm font-medium"
                                    >
                                        📄 Long Text
                                    </button>
                                    <button
                                        onClick={() => addField('signature')}
                                        className="px-3 py-2 bg-white border border-nano-gray-200 rounded hover:border-semester-blue hover:text-semester-blue transition-colors text-sm font-medium"
                                    >
                                        ✍️ Signature
                                    </button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Preview Column */}
                <div className={`flex-1 ${activeTab === 'builder' ? 'hidden md:block' : ''}`}>
                    <div className="sticky top-24">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-nano-gray-900">Live Preview</h2>

                            {/* Preview Mode Toggle */}
                            <div className="flex bg-nano-gray-100 p-1 rounded-lg">
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

                        {/* Mobile Preview */}
                        {previewMode === 'mobile' && (
                            <div className="mx-auto max-w-[375px] border-[8px] border-nano-gray-800 rounded-[3rem] overflow-hidden bg-white shadow-xl h-[700px] relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-nano-gray-800 rounded-b-xl z-20"></div>
                                <div className="h-full overflow-y-auto bg-nano-gray-50 scrollbar-hide">
                                    <div className="p-6 pt-12">
                                        <div className="text-center mb-6">
                                            <h1 className="text-xl font-bold text-nano-gray-900">Semester Reference</h1>
                                            <p className="mt-1 text-xs text-nano-gray-600">
                                                Reference for <span className="font-semibold">Candidate Name</span>
                                            </p>
                                        </div>

                                        <Card className="p-4 shadow-sm">
                                            <DynamicForm
                                                structure={fields}
                                                onSubmit={(data) => console.log('Preview Submit:', data)}
                                                previewMode="mobile"
                                            />
                                        </Card>

                                        <div className="mt-6 text-center text-[10px] text-nano-gray-400">
                                            &copy; {new Date().getFullYear()} Semester. All rights reserved.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Desktop Preview */}
                        {previewMode === 'desktop' && (
                            <Card className="p-8 bg-white shadow-lg">
                                <div className="max-w-4xl mx-auto">
                                    <div className="text-center mb-8">
                                        <h1 className="text-3xl font-bold text-nano-gray-900">Semester Reference</h1>
                                        <p className="mt-2 text-sm text-nano-gray-600">
                                            Reference for <span className="font-semibold">Candidate Name</span>
                                        </p>
                                    </div>

                                    <DynamicForm
                                        structure={fields}
                                        onSubmit={(data) => console.log('Preview Submit:', data)}
                                        previewMode="desktop"
                                    />

                                    <div className="mt-8 text-center text-xs text-nano-gray-400 border-t border-nano-gray-200 pt-6">
                                        &copy; {new Date().getFullYear()} Semester. All rights reserved. Secure reference processing.
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TemplateBuilder;
