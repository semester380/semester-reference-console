/**
 * Shared UI Components for SRC
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    children,
    className = '',
    ...props
}) => {
    const baseClass = variant === 'primary'
        ? 'btn-primary'
        : variant === 'secondary'
            ? 'btn-secondary'
            : 'btn-ghost';

    return (
        <button className={`${baseClass} ${className}`} {...props}>
            {children}
        </button>
    );
};

interface CardProps {
    children: React.ReactNode;
    hover?: boolean;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, hover = false, className = '', onClick }) => {
    const baseClass = hover ? 'card-hover' : 'card';

    return (
        <div className={`${baseClass} ${className}`} onClick={onClick}>
            {children}
        </div>
    );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-nano-gray-700 mb-2">
                    {label}
                </label>
            )}
            <input className={`input ${error ? 'border-status-error' : ''} ${className}`} {...props} />
            {error && (
                <p className="mt-1 text-sm text-status-error">{error}</p>
            )}
        </div>
    );
};

interface BadgeProps {
    variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
    children: React.ReactNode;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
    const baseClassName = variant === 'default' ? 'badge-info' : `badge-${variant}`;

    return (
        <span className={`${baseClassName} ${className}`}>
            {children}
        </span>
    );
};

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md' }) => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';

    return (
        <div className="flex items-center justify-center">
            <div className={`${sizeClass} border-4 border-nano-gray-200 border-t-semester-blue rounded-full animate-spin`}></div>
        </div>
    );
};
