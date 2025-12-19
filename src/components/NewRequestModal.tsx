import React, { useState, useEffect } from 'react';
import { Button, Input } from './UI';
import { runGAS } from '../lib/api';
import type { Template } from '../types';

interface NewRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { candidateName: string; candidateEmail: string; refereeName: string; refereeEmail: string; templateId: string }) => void;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        candidateName: '',
        candidateEmail: '',
        refereeName: '',
        refereeEmail: '',
    });

    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [complianceChecked, setComplianceChecked] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            console.log("Fetching templates...");
            const result = await runGAS('getTemplates');
            console.log("Templates fetched:", result);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loaded: Template[] = Array.isArray(result) ? result : (result as any).data || [];
            console.log("Processed templates:", loaded);

            setTemplates(loaded);
            if (loaded.length > 0) {
                if (!selectedTemplateId) {
                    setSelectedTemplateId(loaded[0].templateId);
                }
            } else {
                console.warn("Template list is empty");
            }
        } catch (error) {
            console.error("Failed to load templates", error);
            alert("Error loading templates (check console): " + error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const validateField = (name: string, value: string) => {
        let error = '';
        if (!value) error = 'This field is required';
        if (name.includes('Email') && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = 'Invalid email address';
        }
        return error;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Real-time validation
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Final validation
        const newErrors: Record<string, string> = {};
        let hasError = false;
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key as keyof typeof formData]);
            if (error) {
                newErrors[key] = error;
                hasError = true;
            }
        });

        if (hasError) {
            setErrors(newErrors);
            return;
        }

        onSubmit({ ...formData, templateId: selectedTemplateId });
        onClose();
    };

    const selectedTemplate = templates.find(t => t.templateId === selectedTemplateId);

    const fieldTypeEmoji: Record<string, string> = {
        'date': '📅',
        'text': '✏️',
        'textarea': '📝',
        'rating': '⭐',
        'boolean': '✅', // mapped from 'yes/no' or 'boolean'
        'yes/no': '✅',
        'email': '📧',
        'signature': '✍️',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-nano-gray-900">New Reference Request</h2>
                    <button onClick={onClose} className="text-nano-gray-400 hover:text-nano-gray-600">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Template Selector */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-nano-gray-700 mb-2">
                                📋 Reference Template
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => {
                                        setSelectedTemplateId(e.target.value);
                                        setShowPreview(false);
                                    }}
                                    disabled={loading}
                                    className="flex-1 px-3 py-2 border border-nano-gray-200 rounded-lg text-nano-gray-900 focus:ring-2 focus:ring-semester-blue focus:border-transparent disabled:bg-gray-100"
                                >
                                    {loading ? (
                                        <option>Loading templates...</option>
                                    ) : (
                                        templates.map((t) => (
                                            <option key={t.templateId} value={t.templateId}>
                                                {t.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(!showPreview)}
                                    disabled={!selectedTemplate}
                                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showPreview
                                        ? 'bg-semester-blue text-white border-semester-blue'
                                        : 'bg-white text-semester-blue border-semester-blue hover:bg-semester-blue/10'
                                        }`}
                                >
                                    {showPreview ? '✕ Hide' : '👁 Preview'}
                                </button>
                            </div>
                            {selectedTemplate && (
                                <p className="text-xs text-nano-gray-500 mt-1">
                                    {selectedTemplate.structureJSON?.length || 0} fields
                                </p>
                            )}
                        </div>

                        {/* Template Preview */}
                        {showPreview && selectedTemplate && (
                            <div className="bg-nano-gray-50 p-4 rounded-lg border border-nano-gray-200 mb-4">
                                <h3 className="text-sm font-semibold text-nano-gray-900 mb-3">
                                    📋 Template Preview: {selectedTemplate.name}
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-white p-3 rounded-md border border-nano-gray-100">
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedTemplate.structureJSON.map((field, fIdx) => (
                                                <div key={fIdx} className="text-xs text-nano-gray-600 flex items-center gap-1">
                                                    <span>{fieldTypeEmoji[field.type] || '•'}</span>
                                                    <span>{field.label}</span>
                                                    {field.required && <span className="text-status-error">*</span>}
                                                </div>
                                            ))}
                                            {selectedTemplate.structureJSON.length === 0 && (
                                                <div className="text-gray-400 italic text-xs col-span-2">No fields defined</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-nano-gray-400 mt-3 text-center">
                                    This is what the referee will be asked to provide
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Candidate Name"
                                name="candidateName"
                                value={formData.candidateName}
                                onChange={handleChange}
                                error={errors.candidateName}
                                placeholder="e.g. Jane Doe"
                                autoFocus
                            />
                            <Input
                                label="Candidate Email"
                                name="candidateEmail"
                                value={formData.candidateEmail}
                                onChange={handleChange}
                                error={errors.candidateEmail}
                                placeholder="jane@example.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Referee Name"
                                name="refereeName"
                                value={formData.refereeName}
                                onChange={handleChange}
                                error={errors.refereeName}
                                placeholder="e.g. John Smith"
                            />
                            <Input
                                label="Referee Email"
                                name="refereeEmail"
                                value={formData.refereeEmail}
                                onChange={handleChange}
                                error={errors.refereeEmail}
                                placeholder="john@company.com"
                            />
                        </div>

                        {/* Compliance Guardrails */}
                        <div className="bg-nano-gray-50 p-4 rounded-lg border border-nano-gray-200 mt-6">
                            <h3 className="text-sm font-semibold text-nano-gray-900 mb-2 flex items-center">
                                <span className="text-semester-blue mr-2">🛡️</span> Compliance Check
                            </h3>
                            <label className="flex items-start cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={complianceChecked}
                                    onChange={(e) => setComplianceChecked(e.target.checked)}
                                    className="mt-1 mr-3 h-4 w-4 text-semester-blue rounded border-nano-gray-300 focus:ring-semester-blue"
                                />
                                <span className="text-sm text-nano-gray-600">
                                    I confirm that this request complies with the organisation's data protection policies.
                                    The candidate will be automatically contacted for consent before the referee is approached.
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!complianceChecked || Object.values(errors).some(e => e) || !selectedTemplateId}
                            className={!complianceChecked || !selectedTemplateId ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            Initiate Request
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
