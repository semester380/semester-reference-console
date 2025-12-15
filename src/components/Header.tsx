```typescript
import React from 'react';
import { Logo } from './Logo';

interface HeaderProps {
    user?: { name: string; email: string; role?: string } | null;
    onSignOut?: () => void;
    simple?: boolean; // For public portals (no nav)
    children?: React.ReactNode; // For extra actions like "New Request"
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut, simple = false, children }) => {
    return (
        <header className="bg-white border-b border-nano-gray-200 sticky top-0 z-40">
            {/* Top Brand Strip */}
            <div className="h-1 w-full bg-gradient-to-r from-semester-blue via-semester-plum to-semester-pink"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo Area */}
                    <div className="flex-shrink-0 flex items-center">
                        <a href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                            <Logo variant="full" />
                        </a>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-6">
                        {/* Custom Actions (e.g. Buttons) */}
                        {children}

                        {!simple && user && (
                            <>
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-semibold text-nano-gray-900">{user.name}</p>
                                    <p className="text-xs text-nano-gray-500">{user.email}</p>
                                </div>
                                <button 
                                    onClick={onSignOut}
                                    className="text-sm font-medium text-nano-gray-500 hover:text-semester-blue transition-colors"
                                >
                                    Sign Out
                                </button>
                            </>
                        )}
                        
                        {simple && (
                            <div className="text-xs text-nano-gray-400 font-medium tracking-wide uppercase hidden sm:block">
                                Secure Reference Portal
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
```
