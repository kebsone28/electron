import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { db, syncData } from '../store/db';

export function useSync() {
    const [isSyncing, setIsSyncing] = useState(false);
    const isSyncingRef = useRef(false);
    const lastSyncRef = useRef(localStorage.getItem('last_sync_timestamp'));
    const [lastSync, setLastSyncState] = useState<string | null>(lastSyncRef.current);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');

    const sync = useCallback(async (isAuto = false) => {
        if (isSyncingRef.current) return;

        const token = localStorage.getItem('access_token');
        if (!token) return;

        isSyncingRef.current = true;
        setIsSyncing(true);
        setSyncStatus('syncing');

        try {
            // 1. PUSH local changes
            const projects = await db.projects.toArray();
            const households = await db.households.toArray();
            const zones = await db.zones.toArray();
            const teams = await db.teams.toArray();
            const inventory = await (db as any).inventory?.toArray() || [];
            const expenses = await (db as any).expenses?.toArray() || [];

            await apiClient.post('/sync/push', {
                timestamp: lastSyncRef.current,
                changes: {
                    projects,
                    households,
                    zones,
                    teams,
                    inventory,
                    expenses,
                    missions: await (db as any).missions?.toArray() || []
                }
            });

            // 2. PULL server changes
            const response = await apiClient.get('/sync/pull', {
                params: { since: lastSyncRef.current }
            });

            const { timestamp, changes } = response.data;

            // Apply changes to local Dexie
            if (changes.projects) await syncData('projects', changes.projects);
            if (changes.households) await syncData('households', changes.households);
            if (changes.zones) await syncData('zones', changes.zones);
            if (changes.teams) await syncData('teams', changes.teams);
            if (changes.inventory) await syncData('inventory', changes.inventory);
            if (changes.expenses) await syncData('expenses', changes.expenses);
            if (changes.missions) await syncData('missions', changes.missions);

            lastSyncRef.current = timestamp;
            setLastSyncState(timestamp);
            setSyncStatus('success');
            localStorage.setItem('last_sync_timestamp', timestamp);

            // LOG successful sync for the banner
            await db.sync_logs.add({
                timestamp: new Date(),
                action: `Synchronisation réussie (${changes.households?.length || 0} ménages)`,
                details: { timestamp, changes: Object.keys(changes) }
            });

            // Retour au statut idle après 3s pour l'UI
            setTimeout(() => setSyncStatus('idle'), 3000);

            return { success: true };
        } catch (error) {
            console.error('Sync failed:', error);
            setSyncStatus('error');
            if (!isAuto) throw error;
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, []); // Stable identity

    // Live Sync: Background sync every 5 minutes if browser is active
    useEffect(() => {
        const interval = setInterval(() => {
            if (navigator.onLine) {
                sync(true);
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [sync]);

    return {
        sync,
        isSyncing,
        lastSync,
        syncStatus
    };
}
