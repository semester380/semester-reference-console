import React, { useState } from 'react';
import { Button, Input } from './UI';

// Template definitions with full field information
const TEMPLATE_DEFINITIONS = {
    'standard-social-care': {
        name: 'Standard Social Care Reference',
        description: 'Full reference with employment details, ratings, safeguarding Q&A, consent, and declaration',
        sections: [
            {
                title: 'Employment Details',
                fields: [
                    { label: 'Date Started', type: 'date' },
                    { label: 'Date Ended', type: 'date' },
                    { label: 'Job Title', type: 'text' },
                    { label: 'Reason for Leaving', type: 'textarea' },
                    { label: 'Safeguarding concerns during employment?', type: 'yes/no' },
                    { label: 'Subject to disciplinary action?', type: 'yes/no' },
                ]
            },
            {
                title: 'Ratings & Attributes',
                fields: [
                    { label: 'Suitable for Role', type: 'rating' },
                    { label: 'Punctuality', type: 'rating' },
                    { label: 'Attitude to Work', type: 'rating' },
                    { label: 'Reliability', type: 'rating' },
                    { label: 'Honesty & Integrity', type: 'rating' },
                    { label: 'Initiative', type: 'rating' },
                    { label: 'Communication Skills', type: 'rating' },
                    { label: 'Further Information', type: 'textarea' },
                ]
            },
            {
                title: 'Safeguarding & Professional Judgement',
                fields: [
                    { label: 'Reservations about character/conduct?', type: 'yes/no' },
                    { label: 'Should NOT be employed with vulnerable persons?', type: 'yes/no' },
                    { label: 'Knowledge of Rehabilitation of Offenders Act?', type: 'yes/no' },
                ]
            },
            {
                title: 'Consent to Share',
                fields: [
                    { label: 'Happy to share with third-party clients?', type: 'yes/no' },
                ]
            },
            {
                title: 'Declaration',
                fields: [
                    { label: 'Full Name', type: 'text' },
                    { label: 'Position/Title', type: 'text' },
                    { label: 'Company', type: 'text' },
                    { label: 'Telephone', type: 'text' },
                    { label: 'Email', type: 'email' },
                    { label: 'Digital Signature', type: 'signature' },
                ]
            },
        ]
    },
    'basic-employment': {
        name: 'Basic Employment Reference',
        description: 'Simple employment verification with dates and job title',
        sections: [
            {
                title: 'Employment Verification',
                fields: [
                    { label: 'Date Started', type: 'date' },
                    { label: 'Date Ended', type: 'date' },
                    { label: 'Job Title', type: 'text' },
                    { label: 'Reason for Leaving', type: 'textarea' },
                    { label: 'Would you re-employ?', type: 'yes/no' },
                ]
            },
            {
                title: 'Confirmation',
                fields: [
                    { label: 'Referee Name', type: 'text' },
                    { label: 'Referee Position', type: 'text' },
                    { label: 'Company', type: 'text' },
                ]
            },
        ]
    },
    'character-reference': {
        name: 'Character Reference',
        description: 'Personal character reference for non-employment contexts',
        sections: [
            {
                title: 'Relationship',
                fields: [
                    { label: 'How do you know the candidate?', type: 'textarea' },
                    { label: 'How long have you known them?', type: 'text' },
                ]
            },
            {
                title: 'Character Assessment',
                fields: [
                    { label: 'Trustworthiness', type: 'rating' },
                    { label: 'Reliability', type: 'rating' },
                    { label: 'Communication', type: 'rating' },
                    { label: 'Character Summary', type: 'textarea' },
                ]
            },
            {
                title: 'Confirmation',
                fields: [
                    { label: 'Your Name', type: 'text' },
                    { label: 'Your Contact', type: 'text' },
                ]
            },
        ]
    },
};

type TemplateId = keyof typeof TEMPLATE_DEFINITIONS;

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

    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('standard-social-care');
    const [showPreview, setShowPreview] = useState(false);
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

    const templateInfo = TEMPLATE_DEFINITIONS[selectedTemplate];
    const fieldTypeEmoji: Record<string, string> = {
        'date': '📅',
        'text': '✏️',
        'textarea': '📝',
        'rating': '⭐',
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
                                    value={selectedTemplate}
                                    onChange={(e) => {
                                        setSelectedTemplate(e.target.value as TemplateId);
                                        setShowPreview(false);
                                    }}
                                    className="flex-1 px-3 py-2 border border-nano-gray-200 rounded-lg text-nano-gray-900 focus:ring-2 focus:ring-semester-blue focus:border-transparent"
                                >
                                    {Object.entries(TEMPLATE_DEFINITIONS).map(([id, template]) => (
                                        <option key={id} value={id}>
                                            {template.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showPreview
                                            ? 'bg-semester-blue text-white border-semester-blue'
                                            : 'bg-white text-semester-blue border-semester-blue hover:bg-semester-blue/10'
                                        }`}
                                >
                                    {showPreview ? '✕ Hide' : '👁 Preview'}
                                </button>
                            </div>
                            <p className="text-xs text-nano-gray-500 mt-1">
                                {templateInfo.description}
                            </p>
                        </div>

                        {/* Template Preview */}
                        {showPreview && (
                            <div className="bg-nano-gray-50 p-4 rounded-lg border border-nano-gray-200 mb-4">
                                <h3 className="text-sm font-semibold text-nano-gray-900 mb-3">
                                    📋 Template Preview: {templateInfo.name}
                                </h3>
                                <div className="space-y-3">
                                    {templateInfo.sections.map((section, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-md border border-nano-gray-100">
                                            <h4 className="text-xs font-semibold text-semester-blue uppercase tracking-wide mb-2">
                                                {section.title}
                                            </h4>
                                            <div className="grid grid-cols-2 gap-1">
                                                {section.fields.map((field, fIdx) => (
                                                    <div key={fIdx} className="text-xs text-nano-gray-600 flex items-center gap-1">
                                                        <span>{fieldTypeEmoji[field.type] || '•'}</span>
                                                        <span>{field.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
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
