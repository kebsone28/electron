import React, { createContext, useContext, useState } from 'react';
import type { User, UserRole } from '../utils/types';

interface AuthContextType {
    user: User | null;
    login: (email: string, role: string, name: string, organization?: string, id?: string, accessToken?: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('access_token');
        if (storedUser && token) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                console.error('Failed to parse stored user', e);
                localStorage.removeItem('user');
                localStorage.removeItem('access_token');
                return null;
            }
        }
        return null;
    });

    const login = (email: string, role: string, name: string, organization?: string, id?: string, accessToken?: string) => {
        const newUser: User = {
            id: id || 'temp-id-' + Date.now(),
            email,
            role: role as UserRole,
            name,
            organization,
        };

        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
        }
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
