import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../store/db';
import apiClient from '../api/client';
import logger from '../utils/logger';
import * as safeStorage from '../utils/safeStorage';
import { useAuth } from '../contexts/AuthContext';

export function useOfflineSync() {
    const { user } = useAuth();
    const pendingItems = useLiveQuery(() => db.syncOutbox.where({ status: 'pending' }).toArray());
    const syncInProgressRef = useRef(false);
    const lastSyncRef = useRef<number>(0);

    useEffect(() => {
        // Only run if user is authenticated
        if (!user) return;

        const syncData = async () => {
            // Prevent concurrent syncs
            if (syncInProgressRef.current) return;

            const token = safeStorage.getItem('access_token');
            if (!navigator.onLine || !pendingItems || pendingItems.length === 0 || !token) return;

            syncInProgressRef.current = true;

            logger.log(`🔄 [SYNC] Tentative de synchronisation de ${pendingItems.length} éléments...`);

            try {
                for (const item of pendingItems) {
                    try {
                        // On tente d'utiliser l'apiClient pour renvoyer la requête
                        await apiClient({
                            method: item.method,
                            url: item.endpoint,
                            data: item.payload,
                        });

                        // Si succès, on supprime de l'outbox
                        await db.syncOutbox.delete(item.id!);
                        logger.log(`✅ [SYNC] Élément synchronisé : ${item.action}`);
                    } catch (error: any) {
                        logger.error(`❌ [SYNC] Échec pour ${item.action} :`, error);

                        // Si c'est une erreur 4xx (sauf 429), on considère que c'est une erreur de donnée et on marque en "failed"
                        if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
                            await db.syncOutbox.update(item.id!, {
                                status: 'failed',
                                retryCount: (item.retryCount || 0) + 1
                            });
                        }
                        // Si c'est une erreur 500 ou réseau, on laisse en "pending" pour la prochaine tentative
                    }
                }
            } finally {
                syncInProgressRef.current = false;
                lastSyncRef.current = Date.now();
            }
        };

        // Sync on network online event
        const handleOnline = () => {
            syncData();
        };

        window.addEventListener('online', handleOnline);

        // Sync immediately if online and has pending items
        if (navigator.onLine && pendingItems?.length) {
            syncData();
        }

        return () => window.removeEventListener('online', handleOnline);
    }, [user, pendingItems]);

    return {
        pendingCount: pendingItems?.length || 0
    };
}


