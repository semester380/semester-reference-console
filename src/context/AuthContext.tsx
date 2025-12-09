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
        onSuccess: async (tokenResponse) => {
            try {
                setIsLoading(true);
                // Fetch user info from Google
                const userInfo = await axios.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );

                const { email, picture } = userInfo.data;

                // Verify domain
                if (!email.endsWith('@semester.co.uk')) {
                    alert('Access restricted to @semester.co.uk accounts only.');
                    googleLogout();
                    setIsLoading(false);
                    return;
                }

                // Verify against backend Staff sheet
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = await runGAS('verifyStaff', { userEmail: email }) as any;

                if (!result.success) {
                    console.error('Staff verification failed:', result.error);
                    alert(`Not Authorized: ${result.error || 'You are not listed in the Staff database.'}`);
                    googleLogout();
                    setIsLoading(false);
                    return;
                }

                const userData: User = {
                    email: result.user.email,
                    name: result.user.name,
                    picture,
                    role: result.user.role
                };

                setUser(userData);
                localStorage.setItem('src_user', JSON.stringify(userData));
            } catch (error) {
                console.error('Login Failed:', error);
                alert('Login failed. Please try again.');
            } finally {
                setIsLoading(false);
            }
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
