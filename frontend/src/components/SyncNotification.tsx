/**
 * SyncNotification.tsx
 * Shows a beautiful notification when changes are synced from the cloud
 * Displays: "X changements enregistrés par un utilisateur"
 * Subtitle: "Données synchronisées depuis le cloud"
 */

import React, { useEffect, useState } from 'react';
import { useSync } from '../contexts/SyncContext';
import toast from 'react-hot-toast';
import { Bell, CloudDownload } from 'lucide-react';
import logger from '../utils/logger';

export const SyncNotification: React.FC = () => {
    const { syncStatus, pendingChanges } = useSync();
    const [lastNotifiedCount, setLastNotifiedCount] = useState(0);

    useEffect(() => {
        // Show notification when sync completes and there were changes
        if (syncStatus === 'success' && pendingChanges > lastNotifiedCount) {
            const changesCount = pendingChanges - lastNotifiedCount || 1;
            
            toast.custom((t) => (
                <div className={`transform transition-all ${
                    t.visible ? 'animate-in slide-in-from-top-4 fade-in' : 'animate-out slide-out-to-top-4 fade-out'
                }`}>
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl px-6 py-4 shadow-2xl shadow-indigo-500/30 max-w-md border border-indigo-400/20 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur">
                                <CloudDownload className="w-6 h-6 text-white animate-bounce" />
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <p className="text-white font-black text-base tracking-tight">
                                    {changesCount} changement{changesCount > 1 ? 's' : ''} enregistré{changesCount > 1 ? 's' : ''} par un utilisateur
                                </p>
                                <p className="text-indigo-200 text-sm font-medium mt-0.5">
                                    Données synchronisées depuis le cloud.
                                </p>
                            </div>

                            {/* Bell icon accent */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5">
                                <Bell className="w-4 h-4 text-indigo-200" />
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-gradient-to-r from-indigo-300 to-purple-300 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            ), {
                position: 'top-center',
                duration: 5000  // Auto-dismiss in 5 seconds
            });

            setLastNotifiedCount(pendingChanges);
            logger.log(`📲 Sync notification shown: ${changesCount} changes`);
        }
    }, [syncStatus, pendingChanges, lastNotifiedCount]);

    // Also show notification when sync starts if pending changes exist
    useEffect(() => {
        if (syncStatus === 'syncing' && pendingChanges > 0) {
            logger.log(`🔄 Syncing ${pendingChanges} changes...`);
        }
    }, [syncStatus, pendingChanges]);

    return null; // This component only manages notifications via toast
};

export default SyncNotification;
