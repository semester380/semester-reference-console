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
                setUser(JSON.parse(storedUser));
            } catch (e) {
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

                const { email, name, picture } = userInfo.data;

                // Verify domain
                if (!email.endsWith('@semester.co.uk')) {
                    alert('Access restricted to @semester.co.uk accounts only.');
                    googleLogout();
                    setIsLoading(false);
                    return;
                }

                // Determine role (mock for now, ideally fetch from backend)
                // In a real app, we'd call an API to get the user's role from the Staff sheet
                // For now, we'll assume everyone is Admin or Recruiter based on email or default
                // We'll fetch the role from the backend in a future step if needed, 
                // but for now let's just set a default role or check a hardcoded list if we want.
                // Actually, the backend enforces roles. The frontend just needs to know for UI.
                // Let's assume 'Admin' for Rob and 'Recruiter' for others for UI purposes, 
                // or just 'Admin' for everyone for now to test.

                const role = email.startsWith('rob') ? 'Admin' : 'Recruiter';

                const userData: User = { email, name, picture, role };

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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
