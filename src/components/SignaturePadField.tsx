import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import type { SignatureResponse } from '../types';

interface SignaturePadFieldProps {
    label: string;
    required?: boolean;
    value?: SignatureResponse;
    onChange: (value: SignatureResponse) => void;
    error?: string;
}

export const SignaturePadField: React.FC<SignaturePadFieldProps> = ({
    label,
    required = false,
    value,
    onChange,
    error
}) => {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [typedName, setTypedName] = useState(value?.typedName || '');
    const [hasDrawn, setHasDrawn] = useState(false);
    const [signedAt, setSignedAt] = useState(value?.signedAt || '');

    useEffect(() => {
        // Load existing signature if provided
        if (value?.signatureDataUrl && sigCanvas.current) {
            sigCanvas.current.fromDataURL(value.signatureDataUrl);
            // We don't need to setHasDrawn here as it's for user interaction tracking
        }
    }, [value?.signatureDataUrl]);

    const handleEnd = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            setHasDrawn(true);
            updateSignature(true);
        }
    };

    const updateSignature = (isDrawnOverride?: boolean) => {
        if (!sigCanvas.current) return;

        const dataUrl = sigCanvas.current.toDataURL();
        const timestamp = signedAt || new Date().toISOString();

        if (!signedAt) {
            setSignedAt(timestamp);
        }

        const isDrawn = isDrawnOverride !== undefined ? isDrawnOverride : hasDrawn;

        onChange({
            typedName,
            signedAt: timestamp,
            signatureDataUrl: isDrawn ? dataUrl : undefined
        });
    };

    const handleTypedNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setTypedName(newName);

        onChange({
            typedName: newName,
            signedAt: signedAt || new Date().toISOString(),
            signatureDataUrl: hasDrawn && sigCanvas.current ? sigCanvas.current.toDataURL() : undefined
        });
    };

    const handleClear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
            setHasDrawn(false);
            onChange({
                typedName,
                signedAt: signedAt || new Date().toISOString(),
                signatureDataUrl: undefined
            });
        }
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-nano-gray-700 mb-3">
                {label} {required && <span className="text-status-error">*</span>}
            </label>

            <div className="bg-nano-gray-50 border-2 border-nano-gray-300 rounded-lg p-6">
                {/* Typed Name Input */}
                <div className="mb-4">
                    <label className="block text-xs font-medium text-nano-gray-600 mb-2">
                        Type your full legal name
                    </label>
                    <input
                        type="text"
                        className={`w-full px-4 py-3 rounded-lg border ${error && !typedName
                            ? 'border-status-error focus:ring-status-error'
                            : 'border-nano-gray-300 focus:ring-semester-blue'
                            } focus:outline-none focus:ring-2 transition-all text-center font-serif text-lg`}
                        value={typedName}
                        onChange={handleTypedNameChange}
                        placeholder="Your Full Name"
                    />
                </div>

                {/* Signature Canvas */}
                <div className="mb-4">
                    <label className="block text-xs font-medium text-nano-gray-600 mb-2">
                        Draw your signature
                    </label>
                    <div className={`bg-white border-2 ${error && !hasDrawn
                        ? 'border-status-error'
                        : hasDrawn
                            ? 'border-status-success shadow-sm'
                            : 'border-nano-gray-300'
                        } rounded-lg overflow-hidden relative transition-all duration-300`}>
                        <SignatureCanvas
                            ref={sigCanvas}
                            canvasProps={{
                                className: 'w-full h-40 md:h-48 cursor-crosshair',
                                style: { touchAction: 'none' }
                            }}
                            onEnd={handleEnd}
                            backgroundColor="white"
                        />
                        {!hasDrawn && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-nano-gray-400 text-sm">
                                    ✍️ Sign here with your mouse or finger
                                </span>
                            </div>
                        )}
                        {hasDrawn && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full shadow-sm text-xs font-bold text-status-success animate-in fade-in zoom-in">
                                <span>✓</span> Captured
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={!hasDrawn && !typedName}
                            className={`text-sm flex items-center gap-1 transition-colors px-2 py-1 rounded-md
                                ${hasDrawn || typedName
                                    ? 'text-status-error hover:bg-status-error/10 cursor-pointer'
                                    : 'text-nano-gray-300 cursor-not-allowed'}`}
                        >
                            🗑️ Clear signature
                        </button>
                        {signedAt && (
                            <span className="text-xs text-nano-gray-500 font-mono">
                                Signed: {formatDate(signedAt)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Legal Notice */}
                <div className="bg-semester-blue/5 border border-semester-blue/20 rounded-lg p-3">
                    <p className="text-xs text-nano-gray-700 leading-relaxed">
                        <strong>Legal Declaration:</strong> By signing above, you confirm that this reference is accurate to the best of your knowledge and that you have the authority to provide this information.
                    </p>
                </div>
            </div>

            {/* Error Messages */}
            {error && (
                <div className="mt-2 space-y-1">
                    {!typedName && (
                        <p className="text-sm text-status-error">Please type your full legal name</p>
                    )}
                    {!hasDrawn && (
                        <p className="text-sm text-status-error">Please draw your signature above</p>
                    )}
                </div>
            )}
        </div>
    );
};
