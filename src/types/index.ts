export interface Request {
    requestId: string;
    candidateName: string;
    candidateEmail: string;
    refereeName: string;
    refereeEmail: string;
    status: 'Pending_Consent' | 'Consent_Given' | 'Sent' | 'Viewed' | 'Completed' | 'Sealed' | 'Flagged' | 'EXPIRED' | 'CONSENT_DECLINED' | 'PENDING_CONSENT' | 'CONSENT_GIVEN';
    consentStatus: boolean | string;
    consentTimestamp?: string;
    sentimentScore?: string;
    anomalyFlag: boolean;
    lastChaseDate?: string;
    token: string;
    candidateToken?: string;  // For consent link
    refereeToken?: string;     // For referee portal link
    createdAt?: string;
    responses?: Record<string, unknown>;  // Field responses including signatures
    referenceMethod?: 'structured' | 'upload' | 'decline';
    declineReason?: string;
    declineComment?: string;
    uploadedFile?: {
        name: string;
        size: number;
        type: string;
    };
    pdfUrl?: string;
    pdfFileId?: string;
    aiAnalysis?: {
        sentimentScore: string;
        summary: string[];
        anomalies: string[];
        timestamp: string;
    };
    archived?: boolean; // Archive flag for soft delete
}

// Signature response type for DocuSign-style signatures
export interface SignatureResponse {
    typedName: string;
    signedAt: string;           // ISO timestamp
    signatureDataUrl?: string;  // base64 PNG from canvas
}

export interface Template {
    templateId: string;
    name: string;
    structureJSON: TemplateField[];
    active: boolean;
}

export interface TemplateField {
    id: string;
    type: 'text' | 'textarea' | 'rating' | 'boolean' | 'date' | 'daterange' | 'signature' | 'email' | 'checkbox-group';
    label: string;
    description?: string; // Optional helper text for the question
    required: boolean;
    layout?: 'full' | 'half'; // Field width for desktop layouts
    options?: string[]; // Options for select/rating/checkbox-group
    conditional?: {
        field: string;
        value: unknown; // Can be array for "includes" logic
        required?: boolean;
    };
}


export interface AuditEvent {
    auditId: string;
    timestamp: string;
    actor: string;
    action: string;
    metadata: string;
}

export interface Config {
    adminEmail: string;
    reminderDays: number;
}

export interface RefereeManagement {
    entityId: string;
    emailDomain: string;
    type: 'Whitelist' | 'Blacklist';
    reason: string;
    addedBy: string;
}
