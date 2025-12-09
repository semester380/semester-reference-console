import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

interface User {
    email: string;
    name: string;
    picture: string;
    role?: 'Admin' | 'Recruiter';
}

interface AuthContextType {
    user: User | null;
    login: () => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for persisted session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('src_user');
        if (storedUser) {
            try {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('src_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            console.log('[Auth] Google login success, token received');
            console.log('[Auth] VERSION: GLOBAL_CALLBACK_V2_VERIFIED'); // VERSION TAG
            setIsLoading(true);

            // Fetch user info from Google
            axios.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
            )
                .then((userInfo) => {
                    const { email, picture } = userInfo.data;
                    console.log('[Auth] User email from Google:', email);

                    // Verify domain
                    if (!email.endsWith('@semester.co.uk')) {
                        console.warn('[Auth] Domain check failed:', email);
                        alert('Access restricted to @semester.co.uk accounts only.');
                        googleLogout();
                        setIsLoading(false);
                        return;
                    }

                    console.log('[Auth] Domain check passed, initializing global callback...');

                    // Register global callback for verifyStaff response
                    const callbackId = `verifyStaffCallback_${Date.now()}`;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (window as any)[callbackId] = (response: any) => {
                        console.log('[Auth] GLOBAL CALLBACK EXECUTED!', response);

                        // Clean up
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        delete (window as any)[callbackId];

                        if (!response || !response.success) {
                            console.error('[Auth] Verification failed:', response?.error);
                            alert(`Not Authorized: ${response?.error || 'You are not listed in the Staff database.'}`);
                            googleLogout();
                            setIsLoading(false);
                            return;
                        }

                        const userData: User = {
                            email: response.user.email,
                            name: response.user.name,
                            picture,
                            role: response.user.role
                        };

                        console.log('[Auth] Setting user data:', userData);
                        setUser(userData);
                        localStorage.setItem('src_user', JSON.stringify(userData));
                        setIsLoading(false);
                        console.log('[Auth] Login complete!');
                    };

                    // Make JSONP request
                    const payload = {
                        action: 'verifyStaff',
                        adminKey: import.meta.env.VITE_ADMIN_API_KEY,
                        userEmail: email
                    };
                    const script = document.createElement('script');
                    // Hardcoded to v86 to ensure reliability (ignoring potentially stale Vercel envs)
                    const gasBaseUrl = 'https://script.google.com/macros/s/AKfycbygQsFXzjXNVCz2v5kPrvKfhPnveHuDy27T32nocxs39C1zqdJ53BHqOGPEpl-vj1EH/exec';

                    script.src = `${gasBaseUrl}?callback=${callbackId}&jsonPayload=${encodeURIComponent(JSON.stringify(payload))}`;
                    console.log('[Auth] Loading verifyStaff script with callback:', callbackId);

                    script.onerror = (err) => {
                        console.error('[Auth] Script load error:', err);
                        // Clean up
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        delete (window as any)[callbackId];
                        document.body.removeChild(script);

                        // Show error
                        alert('Connection to backend failed. Please try again or check your network.');
                        googleLogout();
                        setIsLoading(false);
                    };

                    document.body.appendChild(script);
                })
                .catch((error) => {
                    console.error('[Auth] Error in login flow:', error);
                    alert('Login failed. Please try again.');
                    googleLogout();
                    setIsLoading(false);
                });
        },
        onError: (error) => {
            console.error('Login Failed:', error);
            alert('Login failed. Please try again.');
            setIsLoading(false);
        }
    });

    const logout = () => {
        googleLogout();
        setUser(null);
        localStorage.removeItem('src_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
