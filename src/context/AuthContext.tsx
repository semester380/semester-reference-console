import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { runGAS } from '../lib/api';

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
                        return Promise.reject('Domain check failed');
                    }

                    console.log('[Auth] Domain check passed, calling verifyStaff...');

                    // Verify against backend Staff sheet
                    return runGAS('verifyStaff', { userEmail: email })
                        .then((result: any) => {
                            console.log('[Auth] verifyStaff SUCCESS, result:', result);

                            if (!result || !result.success) {
                                console.error('[Auth] Verification failed:', result?.error);
                                alert(`Not Authorized: ${result?.error || 'You are not listed in the Staff database.'}`);
                                googleLogout();
                                setIsLoading(false);
                                return Promise.reject(`Verification failed: ${result?.error || 'Not in Staff database.'}`);
                            }

                            const userData: User = {
                                email: result.user.email,
                                name: result.user.name,
                                picture,
                                role: result.user.role
                            };

                            console.log('[Auth] Setting user data:', userData);
                            setUser(userData);
                            localStorage.setItem('src_user', JSON.stringify(userData));
                            setIsLoading(false);
                            console.log('[Auth] Login complete!');
                        });
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
