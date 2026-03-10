import React from 'react';
import Sidebar from '../components/Sidebar';
import SyncAlertBanner from '../components/SyncAlertBanner';
import { useTheme } from '../context/ThemeContext';
import { useWebSockets } from '../hooks/useWebSockets';
import CommandPalette from '../components/CommandPalette';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { isDarkMode } = useTheme();
    useWebSockets();

    return (
        <div className={`h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-dark-bg text-dark-text' : 'bg-surface text-text'}`}>
            <CommandPalette />
            <Sidebar />
            <main className="flex-1 overflow-hidden relative flex flex-col">
                <SyncAlertBanner />
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
