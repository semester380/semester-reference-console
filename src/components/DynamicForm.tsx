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
    // Defensive check
    if (!structure || !Array.isArray(structure)) {
        console.warn('DynamicForm received invalid structure:', structure);
        return <div className="p-4 text-red-500">Error: Invalid form structure.</div>;
    }

    const [responses, setResponses] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (id: string, value: unknown) => {
        setResponses(prev => {
            const next = { ...prev, [id]: value };

            // Auto-clear dependent fields if condition is no longer met
            structure.forEach(f => {
                if (f.conditional && f.conditional.field === id) {
                    if (value !== f.conditional.value) {
                        delete next[f.id];
                        // Also clear error if any
                        if (errors[f.id]) {
                            setErrors(e => {
                                const newErrors = { ...e };
                                delete newErrors[f.id];
                                return newErrors;
                            });
                        }
                    }
                }
            });

            return next;
        });

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

            // Check conditional logic
            let isVisible = true;
            if (field.conditional) {
                const parentValue = responses[field.conditional.field];
                if (parentValue !== field.conditional.value) {
                    isVisible = false;
                }
            }

            // Only validate if visible
            if (isVisible && field.required) {
                if (field.type === 'signature') {
                    // Validate signature: must have typed name and drawn signature
                    const sig = value as SignatureResponse;
                    if (value && (!sig.typedName || !sig.signatureDataUrl)) {
                        // If value exists but incomplete sig
                        newErrors[field.id] = 'This field is required';
                        isValid = false;
                    } else if (!value) {
                        newErrors[field.id] = 'This field is required';
                        isValid = false;
                    }
                } else if (value === undefined || value === '') {
                    newErrors[field.id] = 'This field is required';
                    isValid = false;
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

        // Check Visibility
        const isVisible = (() => {
            if (!field.conditional) return true;
            const parentValue = responses[field.conditional.field];

            // Handle array parent values (e.g. checkbox-group)
            if (Array.isArray(parentValue)) {
                return parentValue.includes(field.conditional.value);
            }
            return parentValue === field.conditional.value;
        })();

        if (!isVisible) return null;

        // Container wrapper based on layout
        const fieldWrapper = (children: React.ReactNode) => {
            if (!isDesktop || layout === 'full') {
                return <div key={field.id} className="mb-6 animate-fade-in">{children}</div>;
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
                                {field.label} {field.required && <span className="text-status-error">*</span>} {field.description && <span className="text-xs font-normal text-nano-gray-500 ml-2">({field.description})</span>}
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
                                    type={field.type === 'email' ? 'email' : 'text'}
                                    className={`input ${error ? '!border-status-error focus:!ring-status-error/20' : ''} min-h-[52px]`}
                                    value={(responses[field.id] as string) || ''}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    placeholder={field.type === 'email' ? 'name@example.com' : 'Type your answer here...'}
                                />
                            )}
                            {error && <p className="mt-1 text-sm text-status-error">{error}</p>}
                        </>
                    );

                case 'checkbox-group':
                    const currentValues = (responses[field.id] as string[]) || [];
                    const handleCheck = (opt: string) => {
                        if (currentValues.includes(opt)) {
                            handleChange(field.id, currentValues.filter(v => v !== opt));
                        } else {
                            handleChange(field.id, [...currentValues, opt]);
                        }
                    };
                    return (
                        <>
                            <label className="block text-sm font-semibold text-nano-gray-700 mb-3 tracking-wide">
                                {field.label} {field.required && <span className="text-status-error">*</span>}
                            </label>
                            <div className="flex flex-col gap-2">
                                {(Array.isArray(field.options) ? field.options : []).map((opt) => (
                                    <label key={opt} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-nano-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-semester-blue rounded border-nano-gray-300 focus:ring-semester-blue"
                                            checked={currentValues.includes(opt)}
                                            onChange={() => handleCheck(opt)}
                                        />
                                        <span className="text-gray-700">{opt}</span>
                                    </label>
                                ))}
                            </div>
                            {error && <p className="mt-1 text-sm text-status-error">{error}</p>}
                        </>
                    );

                case 'rating':
                    const options = Array.isArray(field.options) ? field.options : null;
                    const isCustomScale = !!options;
                    const scale = options || [1, 2, 3, 4, 5];

                    return (
                        <>
                            <label className="block text-sm font-semibold text-nano-gray-700 mb-3 tracking-wide">
                                {field.label} {field.required && <span className="text-status-error">*</span>}
                            </label>
                            {field.description && <p className="text-xs text-gray-500 mb-2 whitespace-pre-wrap">{field.description}</p>}

                            <div className={`flex flex-wrap gap-3 ${isCustomScale ? 'flex-col sm:flex-row' : ''}`}>
                                {scale.map((rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        onClick={() => handleChange(field.id, rating)}
                                        className={`${isCustomScale
                                            ? 'px-4 py-3 rounded-lg border text-sm font-medium'
                                            : 'w-12 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-bold'} 
                                            transition-all transform hover:scale-105 active:scale-95
                                            ${responses[field.id] === rating
                                                ? 'border-semester-blue bg-semester-blue text-white shadow-lg shadow-semester-blue/30'
                                                : 'border-nano-gray-200 text-nano-gray-500 hover:border-semester-blue hover:text-semester-blue bg-white'
                                            }`}
                                    >
                                        {rating}
                                    </button>
                                ))}
                            </div>
                            {!isCustomScale && (
                                <div className="flex justify-between text-xs text-nano-gray-500 mt-1 max-w-[260px]">
                                    <span>Poor</span>
                                    <span>Excellent</span>
                                </div>
                            )}
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
