# Testing & Validation Guide
## GEM_SAAS Architecture Implementation (Session: March 9, 2026)

---

## ✅ What's Ready to Test

### 1. **SyncProvider Context**
- ✅ Implemented in `frontend/src/contexts/SyncContext.tsx`
- ✅ Integrated in `main.tsx` (wraps entire app)
- ✅ Terrain.tsx uses context instead of local hook
- ✅ Auto-sync every 30s (only if pending changes)

**Test Steps:**
```bash
npm run dev:saas
```

1. Open DevTools → Console
2. Make a change (e.g., update household status)
3. Should see: `📤 Pushing 1 changes`
4. Then: `📥 Pulling household changes`
5. Then: `✅ [SYNC] Sync completed successfully`

**Expected Behavior:**
- No sync on page load (page is clean)
- Sync triggered automatically every 30s if changes exist
- Login page doesn't freeze (no sync on auth page)

---

### 2. **Supercluster Integration**
- ✅ Implemented in `frontend/src/components/terrain/MapLibreVectorMap.tsx`
- ✅ Utilities in `frontend/src/utils/clusteringUtils.ts`
- ✅ Initializes with all households
- ✅ Updates on map zoom/move

**Test Steps:**
1. Navigate to Terrain page
2. Open DevTools → Console
3. Should see: `📍 Supercluster initialized with XXXX households`
4. Zoom in/out on map
5. Points should cluster/uncluster smoothly (no lag)

**Expected Performance:**
- Initialization: <500ms for 50k points
- Zoom response: <100ms (vs 500ms+ with native clustering)
- No memory spike on zoom

---

### 3. **Memory Optimization & Diagnostics**
- ✅ MemoryDiagnostic component in bottom-right corner
- ✅ Shows real-time memory usage
- ✅ Red if >75%, green if <50%
- ✅ Click 💾 icon to toggle visibility

**Test Steps:**
1. Run `npm run dev:saas`
2. Open browser → Terrain page
3. Look for 💾 button in bottom-right corner
4. Click to show memory stats
5. Watch memory % as you interact with map

**Expected Values:**
- Idle: 100-200MB used
- With 10k households: 150-250MB
- With 50k households: 200-500MB
- Should NOT climb continuously (no memory leak)

---

## ⏳ What Needs Backend Implementation

### **Bbox API Endpoint**
**Status:** NOT YET IMPLEMENTED

**What's Needed:**
```typescript
GET /households?bbox=lng1,lat1,lng2,lat2&project_id=X&limit=5000
```

**Expected Response:**
```json
{
  "households": [
    { "id": "h1", "location": { "coordinates": [2.3, 48.8] }, ... },
    { "id": "h2", "location": { "coordinates": [2.31, 48.81] }, ... }
  ]
}
```

**PostGIS Query Example:**
```sql
SELECT * FROM households
WHERE "projectId" = $1
  AND ST_DWithin(
    location::geography,
    ST_MakeEnvelope($2, $3, $4, $5, 4326)::geography,
    0
  )
LIMIT $6;
```

---

## 🔧 How to Complete the Setup

### **Step 1: Implement Backend Endpoint**

Edit `backend/src/routes/households.ts`:

```typescript
import { Router } from 'express';

const router = Router();

// GET /households with optional bbox filter
router.get('/', async (req, res) => {
  const { bbox, project_id, limit = 5000 } = req.query;
  
  if (!bbox) {
    // Fallback: return all households for project
    const households = await prisma.household.findMany({
      where: { projectId: String(project_id) },
      take: parseInt(String(limit))
    });
    return res.json({ households });
  }
  
  try {
    const [lng1, lat1, lng2, lat2] = String(bbox)
      .split(',')
      .map(Number);
    
    // PostGIS spatial query
    const households = await prisma.$queryRaw`
      SELECT * FROM households
      WHERE "projectId" = ${String(project_id)}
        AND ST_DWithin(
          location::geography,
          ST_MakeEnvelope(${lng1}, ${lat1}, ${lng2}, ${lat2}, 4326)::geography,
          0
        )
      LIMIT ${parseInt(String(limit))};
    `;
    
    res.json({ households });
  } catch (error) {
    console.error('Bbox query failed:', error);
    res.status(500).json({ error: 'Failed to load households for bbox' });
  }
});

export default router;
```

### **Step 2: Verify PostGIS Setup**

Run this in PostgreSQL:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create spatial index for performance
CREATE INDEX idx_households_location_gist 
  ON households USING GIST (location);

-- Test a query
SELECT COUNT(*) FROM households
WHERE ST_DWithin(
  location::geography,
  ST_MakeEnvelope(2.3, 48.8, 2.4, 48.9, 4326)::geography,
  0
);
```

### **Step 3: Enable Viewport Loading**

Edit `frontend/src/components/terrain/MapLibreVectorMap.tsx`:

1. Find the `useViewportLoading` hook call (around line 130-140)
2. Change `enabled: false` to `enabled: true`
3. Ensure `projectId` is passed from component props
4. Add to map mount handler:

```typescript
map.on('moveend', () => {
  const bounds = map.getBounds();
  updateViewport({
    lng1: bounds.getWest(),
    lat1: bounds.getSouth(),
    lng2: bounds.getEast(),
    lat2: bounds.getNorth()
  });
  
  // Debug log
  console.log(`📍 Viewport bounds: lng1=${bounds.getWest()}...`);
});
```

---

## 🧪 Test Checklist

### **Before Bbox Endpoint**
- [ ] Supercluster initializes (console log)
- [ ] Map zoom/move works smoothly
- [ ] No memory leak (memory stable)
- [ ] MemoryDiagnostic shows realistic numbers
- [ ] Sync works (desktop mode only, not login)
- [ ] Build passes TypeScript (except pre-existing errors)

### **After Bbox Endpoint**
- [ ] GET /households?bbox=... returns correct data
- [ ] PostGIS query is fast (<100ms for 50k data)
- [ ] Viewport loading enabled in MapLibreVectorMap
- [ ] Console shows "Loading households for viewport"
- [ ] Map displays only visible households
- [ ] Zoom/pan smoothly updates visible set
- [ ] Network tab shows bbox requests (not all households)

### **Performance Validation**
- [ ] 50k households load in <3 seconds
- [ ] Memory stays <500MB with 50k points
- [ ] Frame rate >30fps while panning
- [ ] Zoom response time <100ms
- [ ] No "Cannot read properties of null" errors
- [ ] Mobile responsive (touch gestures work)

---

## 🚀 Performance Benchmarks

### **Expected Improvements**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Startup Memory** | 150MB | 150MB | Same (static) |
| **50k Points Memory** | OOM (crash) | 400-500MB | ✅ 10x better |
| **Clustering Time** | 800ms+ | 80ms | ✅ 10x faster |
| **Network (All Points)** | ~50MB | N/A | N/A |
| **Network (Viewport)** | N/A | ~500KB | ✅ 95% less |
| **Login Load Time** | 3-5s (sync) | <500ms | ✅ 10x faster |
| **Map Pan FPS** | 12-15 fps | 45-60 fps | ✅ 3-4x better |

---

## 🐛 Debugging Tips

### **If Supercluster Not Initializing**
```javascript
// In browser console:
const { supercluster } = window;
console.log('Supercluster:', supercluster);
// Should show Supercluster instance, not null
```

### **If Bbox Endpoint Not Working**
```bash
# Test curl:
curl "http://localhost:3001/households?bbox=2.3,48.8,2.4,48.9&project_id=123&limit=100"

# Check backend logs for SQL errors
# Verify PostGIS extension is enabled
```

### **If Memory Still Growing**
```javascript
// In console, check what's in IndexedDB:
(await db.households.count()); // Should be max 10k
(await db.syncOutbox.count()); // Should be small
```

### **If Sync Not Triggering**
```javascript
// In console:
import { db } from './store/db';
(await db.syncOutbox.count()); // Check pending
// Should show count > 0 for sync to trigger
```

---

## 📊 Files to Monitor

| File | Purpose | Status |
|------|---------|--------|
| `SyncContext.tsx` | Centralized sync | ✅ Ready |
| `clusteringUtils.ts` | Supercluster utilities | ✅ Ready |
| `MapLibreVectorMap.tsx` | Map component | ✅ Supercluster integrated |
| `useViewportLoading.ts` | Viewport hook | ✅ Ready (disabled) |
| `MemoryDiagnostic.tsx` | Memory monitor UI | ✅ Ready |
| `households.ts` (routes) | Bbox endpoint | ⏳ NEEDED |

---

## 🎯 Next Session Priority

1. **MUST DO:**
   - [ ] Implement GET /households bbox endpoint
   - [ ] Test PostGIS spatial query
   - [ ] Enable viewport loading in MapLibreVectorMap
   - [ ] Validate with 50k household dataset

2. **SHOULD DO:**
   - [ ] Add cluster visualization layer
   - [ ] Performance benchmarking
   - [ ] Mobile testing
   - [ ] Error handling edge cases

3. **NICE TO HAVE:**
   - [ ] Vector Tiles (MVT) for 1M+ points
   - [ ] S2-cell based loading
   - [ ] Real-time sync improvements
   - [ ] Offline-first refinements

---

## 📞 Quick Reference

```typescript
// Test Supercluster
const { superclusterRef } = mapRef.current;
if (superclusterRef?.current) {
  const clusters = superclusterRef.current.getClusters([2.2, 48.7, 2.5, 48.9], 10);
  console.log('Clusters:', clusters);
}

// Test Sync
import { useSync } from './contexts/SyncContext';
const { sync, isSyncing } = useSync();
await sync();

// Test Memory
import { getMemoryStats } from './utils/memoryOptimizer';
console.log(getMemoryStats());

// Test Viewport Bounds
const bounds = map.getBounds();
console.log(`Bounds: ${bounds.getWest()}, ${bounds.getSouth()}, ${bounds.getEast()}, ${bounds.getNorth()}`);
```

---

**Created:** March 9, 2026  
**Session Status:** ✅ Phases 2-4 Complete, Awaiting Backend + API Testing
