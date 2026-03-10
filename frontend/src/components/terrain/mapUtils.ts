/**
 * mapUtils.ts
 * 
 * Utility functions for map operations:
 * - Icon loading
 * - Data validation
 * - Coordinate helpers
 */

import maplibregl from 'maplibre-gl';
import { STATUS_COLOR, getStatusColor, getIconForStatus, ICON_SVGS, createIconDataURI } from './mapConfig';

export const loadMapImages = async (map: maplibregl.Map) => {
    // Guard: ensure map and style are ready
    if (!map || !map.isStyleLoaded?.()) {
        console.warn('❌ Map or style not ready for image loading');
        return;
    }

    const statuses = Object.keys(STATUS_COLOR);
    statuses.push('default');

    await Promise.all(statuses.map(status => {
        return new Promise((resolve) => {
            const color = getStatusColor(status);
            const iconType = getIconForStatus(status);
            const svgContent = ICON_SVGS[iconType as keyof typeof ICON_SVGS] || ICON_SVGS['dot'];
            const dataUri = createIconDataURI(svgContent, color);

            const img = new Image();
            img.onload = () => {
                // ✅ Double-check map still exists and has required methods
                if (map && map.hasImage && map.addImage) {
                    if (!map.hasImage(`icon-${status}`)) {
                        map.addImage(`icon-${status}`, img);
                    }
                }
                resolve(null);
            };
            img.onerror = () => {
                console.warn(`⚠️ Failed to load image for status: ${status}`);
                resolve(null);
            };
            img.src = dataUri;
        });
    }));
};

/**
 * Hash function for deep GeoJSON comparison
 * Used for memoization to detect changes
 */
export const hashGeoJSON = (data: any): string => {
    if (!data) return '';
    try {
        const json = JSON.stringify(data);
        // Simple hash for quick comparison
        let hash = 0;
        for (let i = 0; i < json.length; i++) {
            const char = json.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    } catch {
        return '';
    }
};

/**
 * Validate household location coordinates
 */
export const isValidCoordinate = (coords: any): coords is [number, number] => {
    return Array.isArray(coords) &&
        coords.length === 2 &&
        coords[0] != null &&
        coords[1] != null &&
        !isNaN(Number(coords[0])) &&
        !isNaN(Number(coords[1]));
};

/**
 * Apply jitter to duplicate coordinates using golden angle spiral
 */
export const applyJitter = (coordinates: [number, number], index: number): [number, number] => {
    if (index === 0) return coordinates;
    
    const JITTER_STEP = 0.00005; // ~5m per step
    const angle = (index * 137.5 * Math.PI) / 180; // golden angle
    const radius = JITTER_STEP * Math.sqrt(index);
    
    return [
        coordinates[0] + radius * Math.cos(angle),
        coordinates[1] + radius * Math.sin(angle)
    ];
};
