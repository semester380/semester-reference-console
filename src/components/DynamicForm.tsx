import React, { useState } from 'react';
import { Button } from './UI';
import { SignaturePadField } from './SignaturePadField';
import type { TemplateField, SignatureResponse } from '../types';

interface DynamicFormProps {
    structure: TemplateField[];
    onSubmit: (responses: Record<string, unknown>) => void;
    isSubmitting?: boolean;
    previewMode?: 'mobile' | 'desktop';
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
    structure,
    onSubmit,
    isSubmitting = false,
    previewMode = 'desktop'
}) => {
    const [responses, setResponses] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (id: string, value: unknown) => {
        setResponses(prev => ({ ...prev, [id]: value }));
        if (errors[id]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting form...', responses);

        // Validate
        const newErrors: Record<string, string> = {};
        let isValid = true;

        structure.forEach(field => {
            const value = responses[field.id];
            console.log(`Validating field ${field.id} (${field.type}), required=${field.required}, value=`, value);

            if (field.required) {
                if (field.type === 'signature') {
                    // Validate signature: must have typed name and drawn signature
                    const sig = value as SignatureResponse;
                    if (!sig || !sig.typedName || !sig.signatureDataUrl) {
                        newErrors[field.id] = 'This field is required';
                        isValid = false;
                        console.log(`Field ${field.id} failed validation (signature)`);
                    }
                } else if (value === undefined || value === '') {
                    newErrors[field.id] = 'This field is required';
                    isValid = false;
                    console.log(`Field ${field.id} failed validation (empty)`);
                }
            }
        });

        if (!isValid) {
            console.log('Form is invalid:', newErrors);
            setErrors(newErrors);
            return;
        }

        console.log('Form is valid, calling onSubmit');
        onSubmit(responses);
    };

    const renderField = (field: TemplateField) => {
        const error = errors[field.id];
        const isDesktop = previewMode === 'desktop';
        const layout = field.layout || 'full';

        // Container wrapper based on layout
        const fieldWrapper = (children: React.ReactNode) => {
            if (!isDesktop || layout === 'full') {
                return <div key={field.id} className="mb-6">{children}</div>;
            }
            // Half-width fields will be handled by the grid in the render method
            return children;
        };

        const fieldContent = (() => {
            switch (field.type) {

                case 'text':
                case 'email':
                case 'textarea':
                    return (
                        <>
                            <label className="block text-sm font-semibold text-nano-gray-700 mb-2 tracking-wide">
                                {field.label} {field.required && <span className="text-status-error">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    className={`input ${error ? '!border-status-error focus:!ring-status-error/20' : ''} min-h-[120px]`}
                                    value={(responses[field.id] as string) || ''}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    placeholder="Type your answer here..."
                                    rows={5}
                                />
                            ) : (
                                <input
                                    type={field.type}
                                    className={`input ${error ? '!border-status-error focus:!ring-status-error/20' : ''} min-h-[52px]`}
                                    value={(responses[field.id] as string) || ''}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    placeholder={field.type === 'email' ? 'name@example.com' : 'Type your answer here...'}
                                />
                            )}
                            {error && <p className="mt-1 text-sm text-status-error">{error}</p>}
                        </>
                    );

                case 'rating':
                    return (
                        <>
                            <label className="block text-sm font-semibold text-nano-gray-700 mb-3 tracking-wide">
                                {field.label} {field.required && <span className="text-status-error">*</span>}
                            </label>
                            <div className="flex gap-3">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        onClick={() => handleChange(field.id, rating)}
                                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all transform hover:scale-105 active:scale-95
                    ${responses[field.id] === rating
                                                ? 'border-semester-blue bg-semester-blue text-white shadow-lg shadow-semester-blue/30'
                                                : 'border-nano-gray-200 text-nano-gray-500 hover:border-semester-blue hover:text-semester-blue bg-white'
                                            }`}
                                    >
                                        {rating}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-nano-gray-500 mt-1 max-w-[260px]">
                                <span>Poor</span>
                                <span>Excellent</span>
                            </div>
                            {error && <p className="mt-1 text-sm text-status-error">{error}</p>}
                        </>
                    );

                case 'boolean':
                    return (
                        <>
                            <label className="block text-sm font-semibold text-nano-gray-700 mb-3 tracking-wide">
                                {field.label} {field.required && <span className="text-status-error">*</span>}
                            </label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleChange(field.id, true)}
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98]
                   ${responses[field.id] === true
                                            ? 'border-status-success bg-status-success text-white shadow-lg shadow-status-success/30'
                                            : 'border-nano-gray-200 text-nano-gray-600 hover:border-status-success hover:text-status-success bg-white'
                                        }`}
                                >
                                    Yes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange(field.id, false)}
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98]
                   ${responses[field.id] === false
                                            ? 'border-status-error bg-status-error text-white shadow-lg shadow-status-error/30'
                                            : 'border-nano-gray-200 text-nano-gray-600 hover:border-status-error hover:text-status-error bg-white'
                                        }`}
                                >
                                    No
                                </button>
                            </div>
                            {error && <p className="mt-1 text-sm text-status-error">{error}</p>}
                        </>
                    );

                case 'date':
                    return (
                        <>
                            <label className="block text-sm font-semibold text-nano-gray-700 mb-2 tracking-wide">
                                {field.label} {field.required && <span className="text-status-error">*</span>}
                            </label>
                            <input
                                type="date"
                                className={`input ${error ? '!border-status-error focus:!ring-status-error/20' : ''}`}
                                value={(responses[field.id] as string) || ''}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                            />
                            {error && <p className="mt-1 text-sm text-status-error">{error}</p>}
                        </>
                    );

                case 'signature':
                    return (
                        <SignaturePadField
                            label={field.label}
                            required={field.required}
                            value={responses[field.id] as SignatureResponse}
                            onChange={(value) => handleChange(field.id, value)}
                            error={error}
                        />
                    );

                default:
                    return null;
            }
        })();

        return fieldWrapper(fieldContent);
    };

    // Group fields for desktop two-column layout
    const renderFields = () => {
        if (previewMode !== 'desktop') {
            // Mobile: stack everything
            return structure.map(renderField);
        }

        // Desktop: support two-column layout for half-width fields
        const rows: React.ReactNode[] = [];
        let i = 0;

        while (i < structure.length) {
            const current = structure[i];
            const currentLayout = current.layout || 'full';

            if (currentLayout === 'full') {
                // Full-width field
                rows.push(renderField(current));
                i++;
            } else {
                // Half-width field - check if next is also half-width
                const next = structure[i + 1];
                const nextLayout = next?.layout || 'full';

                if (next && nextLayout === 'half') {
                    // Render two half-width fields side by side
                    rows.push(
                        <div key={`row-${i}`} className="grid grid-cols-2 gap-6 mb-6">
                            <div>{renderField(current)}</div>
                            <div>{renderField(next)}</div>
                        </div>
                    );
                    i += 2;
                } else {
                    // Single half-width field on its own row
                    rows.push(
                        <div key={`row-${i}`} className="grid grid-cols-2 gap-6 mb-6">
                            <div>{renderField(current)}</div>
                            <div></div>
                        </div>
                    );
                    i++;
                }
            }
        }

        return rows;
    };

    return (
        <form onSubmit={handleSubmit}>
            {renderFields()}

            <div className="mt-8">
                <Button type="submit" disabled={isSubmitting} className="w-full py-4 text-lg">
                    {isSubmitting ? 'Submitting Reference...' : 'Submit Reference'}
                </Button>
            </div>
        </form>
    );
};
