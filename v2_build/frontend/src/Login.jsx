
import React, { useState } from 'react';
import { callAction } from './lib/api';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Call Proxy -> GAS verifyStaff
        // Note: verifyStaff endpoint requires userEmail as payload
        const result = await callAction('verifyStaff', { userEmail: email }, email);

        if (result.success) {
            onLogin(result.user);
        } else {
            setError(result.error || 'Authentication failed');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    {/* Semester Logo Placeholder - 3 Dots */}
                    <div className="flex space-x-2">
                        <div className="w-4 h-4 rounded-full bg-[var(--color-primary)]"></div>
                        <div className="w-4 h-4 rounded-full bg-[var(--color-plum)]"></div>
                        <div className="w-4 h-4 rounded-full bg-[var(--color-pink)]"></div>
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Semester Reference Console</h1>
                <p className="text-gray-500 mt-2">Staff Access</p>
            </div>

            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                            placeholder="you@semester.co.uk"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Verifying...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
