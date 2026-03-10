/**
 * useMapClustering.ts
 * 
 * Hook pour gérer la mise à jour des clusters
 * - Mise à jour sur zoom + pan (moveend + zoomend)
 * - Utilise Supercluster pour performance
 */

import { useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import Supercluster from 'supercluster';
import { getClustersForZoom } from '../../utils/clusteringUtils';
import logger from '../../utils/logger';

export const useMapClustering = (clustererRef: React.MutableRefObject<Supercluster | null>) => {
    const clusterUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const updateClusterDisplay = useCallback((map: maplibregl.Map) => {
        if (!map.isStyleLoaded() || !clustererRef.current) return;

        try {
            const zoom = Math.round(map.getZoom());
            const bounds = map.getBounds();
            const bbox: [number, number, number, number] = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
            const clustersGeoJSON = getClustersForZoom(clustererRef.current, bbox, zoom);
            (map.getSource('supercluster-generated') as any)?.setData(clustersGeoJSON);
            logger.log(`🔶 Updated clusters for zoom ${zoom}`);
        } catch (error) {
            logger.error('Failed to update Supercluster clusters:', error);
        }
    }, [clustererRef]);

    const setupClusteringEvents = useCallback((map: maplibregl.Map) => {
        const handleViewportChange = () => {
            if (clusterUpdateTimeoutRef.current) clearTimeout(clusterUpdateTimeoutRef.current);
            clusterUpdateTimeoutRef.current = setTimeout(() => updateClusterDisplay(map), 100);
        };

        // Update on zoom
        map.on('zoomend', handleViewportChange);

        // Update on pan (critical for cluster sync)
        map.on('moveend', handleViewportChange);

        return () => {
            map.off('zoomend', handleViewportChange);
            map.off('moveend', handleViewportChange);
            if (clusterUpdateTimeoutRef.current) clearTimeout(clusterUpdateTimeoutRef.current);
        };
    }, [updateClusterDisplay]);

    return { setupClusteringEvents, updateClusterDisplay };
};
