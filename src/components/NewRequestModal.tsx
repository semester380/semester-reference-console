import React, { useState } from 'react';
import { Button, Input } from './UI';

// Available templates
const TEMPLATES = [
    { id: 'standard-social-care', name: 'Standard Social Care Reference', description: 'Full reference with employment details, ratings, safeguarding Q&A, consent, and declaration' },
    { id: 'basic-employment', name: 'Basic Employment Reference', description: 'Simple employment verification with dates and job title' },
    { id: 'character-reference', name: 'Character Reference', description: 'Personal character reference for non-employment contexts' },
];

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

    const [selectedTemplate, setSelectedTemplate] = useState('standard-social-care');
    const [complianceChecked, setComplianceChecked] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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

        onSubmit({ ...formData, templateId: selectedTemplate });
        onClose();
    };

    const selectedTemplateInfo = TEMPLATES.find(t => t.id === selectedTemplate);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
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
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="w-full px-3 py-2 border border-nano-gray-200 rounded-lg text-nano-gray-900 focus:ring-2 focus:ring-semester-blue focus:border-transparent"
                            >
                                {TEMPLATES.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                            {selectedTemplateInfo && (
                                <p className="text-xs text-nano-gray-500 mt-1">
                                    {selectedTemplateInfo.description}
                                </p>
                            )}
                        </div>

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
                                    I confirm that this request complies with the organization's data protection policies.
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
                            disabled={!complianceChecked || Object.values(errors).some(e => e)}
                            className={!complianceChecked ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            Initiate Request
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
