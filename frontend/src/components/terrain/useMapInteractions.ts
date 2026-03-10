/**
 * useMapInteractions.ts
 * 
 * Hook pour gérer les interactions avec la map
 * - Click sur points
 * - Hover sur zones
 * - Drag & drop ménages (mouse + touch)
 */

import { useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import toast from 'react-hot-toast';

export const useMapInteractions = (
    readOnly: boolean,
    householdsRef: React.MutableRefObject<any[]>,
    onSelectRef: React.MutableRefObject<(h: any) => void>,
    onZoneClickRef: React.MutableRefObject<(coord: [number, number], zoom: number) => void>,
    onDropRef: React.MutableRefObject<(id: string, lat: number, lng: number) => void>
) => {
    const dragStateRef = useRef({ isDragging: false, draggedFeatureId: null as string | null });

    const setupInteractions = useCallback((map: maplibregl.Map) => {
        // Cursor pointer on hover
        const setupInteraction = (layerId: string) => {
            map.on('mouseenter', layerId, () => {
                if (!readOnly || ['clusters', 'grappes-layer', 'auto-grappes-fill'].includes(layerId)) {
                    map.getCanvas().style.cursor = 'pointer';
                }
            });
            map.on('mouseleave', layerId, () => map.getCanvas().style.cursor = '');
        };

        ['unclustered-points', 'grappes-layer', 'sous-grappes-layer', 'grappes-labels', 'auto-grappes-fill'].forEach(setupInteraction);

        // Auto-Grappes hover state
        let hoveredAutoGrappeId: string | number | null = null;
        map.on('mousemove', 'auto-grappes-fill', (e) => {
            if (e.features && e.features.length > 0) {
                if (hoveredAutoGrappeId !== null) {
                    map.setFeatureState(
                        { source: 'auto-grappes', id: hoveredAutoGrappeId },
                        { hover: false }
                    );
                }
                hoveredAutoGrappeId = e.features[0].id as string | number;
                map.setFeatureState(
                    { source: 'auto-grappes', id: hoveredAutoGrappeId },
                    { hover: true }
                );
            }
        });

        map.on('mouseleave', 'auto-grappes-fill', () => {
            if (hoveredAutoGrappeId !== null) {
                map.setFeatureState(
                    { source: 'auto-grappes', id: hoveredAutoGrappeId },
                    { hover: false }
                );
            }
            hoveredAutoGrappeId = null;
        });

        // ── DRAG & DROP (Mouse + Touch) ──
        const endDrag = (lngLat: maplibregl.LngLat | null) => {
            if (!dragStateRef.current.isDragging || !dragStateRef.current.draggedFeatureId) {
                if (!map.dragPan.isEnabled()) map.dragPan.enable();
                return;
            }

            const featureId = dragStateRef.current.draggedFeatureId;
            dragStateRef.current = { isDragging: false, draggedFeatureId: null };
            map.dragPan.enable();
            map.getCanvas().style.cursor = '';

            if (lngLat && onDropRef.current) {
                onDropRef.current(featureId, lngLat.lat, lngLat.lng);
                toast.success("Position mise à jour !");
            }

            const dragSource = map.getSource('drag-point') as maplibregl.GeoJSONSource;
            if (dragSource) {
                dragSource.setData({ type: 'FeatureCollection', features: [] } as any);
            }
        };

        // Mouse drag
        map.on('mousedown', 'unclustered-points', (e) => {
            if (readOnly) return;
            const feature = e.features?.[0];
            if (!feature) return;

            e.preventDefault();
            map.dragPan.disable();
            dragStateRef.current = { isDragging: true, draggedFeatureId: feature.properties.id };
            map.getCanvas().style.cursor = 'grabbing';
        });

        // Touch drag
        map.on('touchstart', 'unclustered-points', (e) => {
            if (readOnly) return;
            const feature = e.features?.[0];
            if (!feature) return;

            e.preventDefault();
            map.dragPan.disable();
            dragStateRef.current = { isDragging: true, draggedFeatureId: feature.properties.id };
            map.getCanvas().style.cursor = 'grabbing';
        });

        // Move callback
        map.on('mousemove', (e) => {
            if (!dragStateRef.current.isDragging || !dragStateRef.current.draggedFeatureId) return;

            const dragSource = map.getSource('drag-point') as maplibregl.GeoJSONSource;
            if (dragSource) {
                dragSource.setData({
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [e.lngLat.lng, e.lngLat.lat] },
                        properties: { id: dragStateRef.current.draggedFeatureId }
                    }]
                } as any);
            }
        });

        // Mouse up
        map.on('mouseup', (e) => endDrag(e.lngLat));

        // Touch end
        map.on('touchend', (e) => {
            if (!dragStateRef.current.isDragging) return;
            endDrag(e.lngLat);
        });

        // Safety: mouseleave during drag
        map.on('mouseleave', 'unclustered-points', () => {
            if (dragStateRef.current.isDragging) endDrag(null);
        });

        // ── CLICK HANDLERS ──
        map.on('click', 'unclustered-points', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                const h = householdsRef.current.find((item: any) => item.id === feature.properties.id);
                if (h) onSelectRef.current(h);
            }
        });

        map.on('click', 'grappes-layer', (e) => {
            const feature = e.features?.[0];
            if (feature && onZoneClickRef.current) {
                const coords = (feature.geometry as any).coordinates;
                onZoneClickRef.current([coords[1], coords[0]], 14);
            }
        });

        map.on('click', 'auto-grappes-fill', (e) => {
            const feature = e.features?.[0];
            if (feature && onZoneClickRef.current) {
                const centroidX = feature.properties?.centroidX;
                const centroidY = feature.properties?.centroidY;
                if (centroidX != null && centroidY != null) {
                    onZoneClickRef.current([centroidX, centroidY], 12);
                }
            }
        });
    }, [readOnly, householdsRef, onSelectRef, onZoneClickRef, onDropRef]);

    return { setupInteractions };
};
