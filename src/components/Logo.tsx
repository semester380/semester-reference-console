import React from 'react';

interface LogoProps {
    className?: string;
    variant?: 'full' | 'mark';
    inverted?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', variant = 'full', inverted = false }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill={inverted ? "#FFFFFF" : "#0052CC"} />
                <path d="M16 6C10.4772 6 6 10.4772 6 16C6 21.5228 10.4772 26 16 26V6Z" fill={inverted ? "#0052CC" : "#5E17EB"} />
                <circle cx="22" cy="10" r="3" fill="#FF0080" />
            </svg>
            {variant === 'full' && (
                <span className={`font-bold text-xl tracking-tight ${inverted ? 'text-white' : 'text-nano-gray-900'}`}>
                    Semester
                </span>
            )}
        </div>
    );
};
