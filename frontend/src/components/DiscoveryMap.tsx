import React, { useState, useEffect, useMemo } from 'react';
import MapGL, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import { Layers, Eye, EyeOff, Info, ChevronDown, ChevronUp, Clock, Grid3X3, Play, Pause } from 'lucide-react';
import { api } from '../api/client';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

interface Feature {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, any>;
}

interface LayerConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  visible: boolean;
}

interface GridCell {
  lat: number;
  lng: number;
  count: number;
  percentile: number;
  features: Feature[];
}

const DEFAULT_LAYERS: LayerConfig[] = [
  { id: 'parks', name: 'Parks', icon: '🌳', color: '#16a34a', visible: true },
  { id: 'waystations', name: 'Waystations', icon: '🦋', color: '#f97316', visible: true },
];

const WILDLIFE_FILTERS: LayerConfig[] = [
  { id: 'Aves', name: 'Birds', icon: '🐦', color: '#3b82f6', visible: true },
  { id: 'Insecta', name: 'Insects', icon: '🦋', color: '#8b5cf6', visible: true },
  { id: 'Plantae', name: 'Plants', icon: '🌿', color: '#22c55e', visible: true },
  { id: 'Mammalia', name: 'Mammals', icon: '🦊', color: '#f97316', visible: true },
  { id: 'Fungi', name: 'Fungi', icon: '🍄', color: '#ef4444', visible: true },
  { id: 'Arachnida', name: 'Arachnids', icon: '🕷️', color: '#6b7280', visible: true },
  { id: 'Reptilia', name: 'Reptiles', icon: '🦎', color: '#84cc16', visible: true },
  { id: 'Amphibia', name: 'Amphibians', icon: '🐸', color: '#06b6d4', visible: true },
];

const QUERY_POINTS = [
  { lat: 40.666, lng: -111.897, name: 'Murray' },
  { lat: 40.760, lng: -111.891, name: 'SLC' },
  { lat: 40.700, lng: -111.850, name: 'Millcreek' },
  { lat: 40.720, lng: -111.930, name: 'Taylorsville' },
  { lat: 40.570, lng: -111.895, name: 'South Jordan' },
  { lat: 40.525, lng: -111.860, name: 'Draper' },
  { lat: 40.480, lng: -111.890, name: 'Lehi' },
  { lat: 40.600, lng: -111.830, name: 'Sandy' },
  { lat: 40.850, lng: -111.900, name: 'North SLC' },
  { lat: 40.890, lng: -111.880, name: 'Bountiful' },
  { lat: 40.950, lng: -111.900, name: 'Farmington' },
  { lat: 41.000, lng: -111.920, name: 'Kaysville' },
  { lat: 40.760, lng: -111.780, name: 'University' },
  { lat: 40.666, lng: -111.750, name: 'Cottonwood' },
  { lat: 40.620, lng: -111.780, name: 'Sandy East' },
  { lat: 40.800, lng: -111.750, name: 'Emigration' },
  { lat: 40.666, lng: -112.000, name: 'West Valley' },
  { lat: 40.720, lng: -112.030, name: 'Magna' },
  { lat: 40.600, lng: -111.980, name: 'West Jordan' },
  { lat: 40.780, lng: -112.000, name: 'Rose Park' },
];

const GRID_SIZE = 0.009;

function createGrid(features: Feature[]): GridCell[] {
  const cellMap: Record<string, GridCell> = {};
  features.forEach(f => {
    const lat = f.geometry.coordinates[1];
    const lng = f.geometry.coordinates[0];
    const gridLat = Math.floor(lat / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gridLng = Math.floor(lng / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
    if (cellMap[key]) {
      cellMap[key].count++;
      cellMap[key].features.push(f);
    } else {
      cellMap[key] = { lat: gridLat, lng: gridLng, count: 1, percentile: 0, features: [f] };
    }
  });
  const cells = Object.values(cellMap);
  const counts = cells.map(c => c.count).sort((a, b) => a - b);
  cells.forEach(cell => {
    cell.percentile = counts.filter(c => c <= cell.count).length / counts.length;
  });
  return cells;
}

function getGridColor(p: number): string {
  if (p >= 0.95) return '#dc2626';
  if (p >= 0.85) return '#ea580c';
  if (p >= 0.70) return '#f59e0b';
  if (p >= 0.50) return '#84cc16';
  if (p >= 0.25) return '#22c55e';
  return '#86efac';
}

const DiscoveryMap: React.FC = () => {
  const [viewState, setViewState] = useState({ latitude: 40.666, longitude: -111.897, zoom: 10 });
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [wildlifeFilters, setWildlifeFilters] = useState(WILDLIFE_FILTERS);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [wildlifeFeatures, setWildlifeFeatures] = useState<Feature[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [monarchStatus, setMonarchStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'points'>('grid');
  
  // Timeline state
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [yearStats, setYearStats] = useState<Record<number, number>>({});

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    wildlifeFeatures.forEach(f => {
      const y = f.properties.year;
      if (y && y >= 2010) years.add(y);
    });
    return Array.from(years).sort();
  }, [wildlifeFeatures]);

  // Animation effect
  useEffect(() => {
    if (!playing || availableYears.length === 0) return;
    
    const interval = setInterval(() => {
      setYearFilter(prev => {
        const currentIdx = prev ? availableYears.indexOf(prev) : -1;
        const nextIdx = (currentIdx + 1) % availableYears.length;
        if (nextIdx === 0) setPlaying(false);
        return availableYears[nextIdx];
      });
    }, 1500);
    
    return () => clearInterval(interval);
  }, [playing, availableYears]);

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const [mapRes, monarchRes] = await Promise.all([
          api.get('/api/map/unified', { params: { layers: layers.filter(l => l.visible).map(l => l.id).join(',') } }),
          api.get('/api/map/monarch-status')
        ]);
        setFeatures(mapRes.data.features || []);
        setMonarchStatus(monarchRes.data);
      } catch (e) { console.error(e); }
    };
    fetchMap();
  }, [layers]);

  useEffect(() => {
    const fetchWildlife = async () => {
      setLoading(true);
      const all: Feature[] = [];
      const seen = new Set<string>();
      const yearCounts: Record<number, number> = {};
      
      for (let i = 0; i < QUERY_POINTS.length; i++) {
        const pt = QUERY_POINTS[i];
        setProgress(`${pt.name} (${i+1}/${QUERY_POINTS.length})`);
        try {
          const res = await api.get('/api/wildlife/unified', {
            params: { lat: pt.lat, lng: pt.lng, radius: 35, days: 1825 } // 5 years
          });
          
          // Collect year stats
          if (res.data.year_distribution) {
            Object.entries(res.data.year_distribution).forEach(([y, c]) => {
              yearCounts[parseInt(y)] = (yearCounts[parseInt(y)] || 0) + (c as number);
            });
          }
          
          (res.data.features || []).forEach((f: Feature) => {
            const id = String(f.properties.id);
            if (!seen.has(id)) { seen.add(id); all.push(f); }
          });
          setWildlifeFeatures([...all]);
          setYearStats({...yearCounts});
        } catch (e) { console.error(`${pt.name}:`, e); }
        await new Promise(r => setTimeout(r, 250));
      }
      setLoading(false);
      setProgress('');
    };
    fetchWildlife();
  }, []);

  const toggleLayer = (id: string) => setLayers(p => p.map(l => l.id === id ? {...l, visible: !l.visible} : l));
  const toggleWildlife = (id: string) => setWildlifeFilters(p => p.map(l => l.id === id ? {...l, visible: !l.visible} : l));

  const isVisible = (f: Feature) => {
    // Year filter
    if (yearFilter && f.properties.year !== yearFilter) return false;
    
    if (f.properties.source === 'inaturalist' || f.properties.source === 'gbif') {
      return wildlifeFilters.find(w => w.id === f.properties.iconic_taxon)?.visible ?? true;
    }
    return layers.find(l => l.id === f.properties.layer)?.visible ?? false;
  };

  const visibleFeatures = [...features, ...wildlifeFeatures].filter(isVisible);
  const gridCells = useMemo(() => createGrid(visibleFeatures), [visibleFeatures]);
  
  const taxonStats = useMemo(() => {
    const s: Record<string,number> = {};
    wildlifeFeatures.filter(f => !yearFilter || f.properties.year === yearFilter).forEach(f => { 
      const t = f.properties.iconic_taxon || 'Other'; 
      s[t] = (s[t]||0)+1; 
    });
    return s;
  }, [wildlifeFeatures, yearFilter]);

  const heatmapData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: visibleFeatures.map(f => ({ type: 'Feature' as const, geometry: f.geometry, properties: {} }))
  }), [visibleFeatures]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <MapGL {...viewState} onMove={e => setViewState(e.viewState)} mapStyle="mapbox://styles/mapbox/light-v11" mapboxAccessToken={MAPBOX_TOKEN} style={{ width: '100%', height: '100%' }}>
        <NavigationControl position="bottom-right" />
        
        {viewMode === 'grid' && (
          <Source id="heat" type="geojson" data={heatmapData}>
            <Layer id="heatmap" type="heatmap" paint={{
              'heatmap-weight': 1,
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 15, 2],
              'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,255,0,0)', 0.2, 'rgba(134,239,172,0.4)', 0.4, 'rgba(34,197,94,0.5)', 0.6, 'rgba(250,204,21,0.6)', 0.8, 'rgba(249,115,22,0.7)', 1, 'rgba(220,38,38,0.8)'],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 20, 13, 30],
              'heatmap-opacity': 0.7,
            }} />
          </Source>
        )}
        
        {viewMode === 'grid' && viewState.zoom >= 11 && gridCells.map((c, i) => (
          <Marker key={i} latitude={c.lat} longitude={c.lng} onClick={e => { e.originalEvent.stopPropagation(); setSelectedCell(c); }}>
            <div style={{ minWidth: 22, padding: '2px 5px', borderRadius: 4, backgroundColor: getGridColor(c.percentile), border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 600, color: c.percentile >= 0.5 ? 'white' : '#1a1a1a', cursor: 'pointer', textAlign: 'center' }}>{c.count}</div>
          </Marker>
        ))}

        {viewMode === 'points' && viewState.zoom >= 11 && visibleFeatures.slice(0, 500).map((f, i) => (
          <Marker key={i} latitude={f.geometry.coordinates[1]} longitude={f.geometry.coordinates[0]} onClick={e => { e.originalEvent.stopPropagation(); setSelectedFeature(f); }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: WILDLIFE_FILTERS.find(w => w.id === f.properties.iconic_taxon)?.color || '#666', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, cursor: 'pointer' }}>
              {WILDLIFE_FILTERS.find(w => w.id === f.properties.iconic_taxon)?.icon || '📍'}
            </div>
          </Marker>
        ))}

        {selectedCell && (
          <Popup latitude={selectedCell.lat} longitude={selectedCell.lng} onClose={() => setSelectedCell(null)} anchor="bottom" maxWidth="280px">
            <div style={{ padding: 4 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 13 }}>{selectedCell.count} observations {yearFilter && `(${yearFilter})`}</h3>
              {Object.entries(selectedCell.features.reduce((a: Record<string,number>, f) => { const t = f.properties.iconic_taxon || 'Other'; a[t] = (a[t]||0)+1; return a; }, {}))
                .sort((a,b) => b[1]-a[1]).slice(0, 6).map(([t, c]) => (
                  <div key={t} style={{ fontSize: 11, display: 'flex', gap: 4 }}>
                    <span>{WILDLIFE_FILTERS.find(w => w.id === t)?.icon}</span>
                    <span style={{ flex: 1 }}>{WILDLIFE_FILTERS.find(w => w.id === t)?.name || t}</span>
                    <span>{c}</span>
                  </div>
                ))}
            </div>
          </Popup>
        )}

        {selectedFeature && (
          <Popup latitude={selectedFeature.geometry.coordinates[1]} longitude={selectedFeature.geometry.coordinates[0]} onClose={() => setSelectedFeature(null)} anchor="bottom" maxWidth="260px">
            <div style={{ padding: 4 }}>
              <h3 style={{ margin: 0, fontSize: 13 }}>{selectedFeature.properties.species || 'Unknown'}</h3>
              {selectedFeature.properties.photo_url && <img src={selectedFeature.properties.photo_url} alt="" style={{ width: '100%', borderRadius: 4, margin: '6px 0' }} />}
              {selectedFeature.properties.observed_on && <p style={{ margin: 2, fontSize: 10, color: '#666' }}>📅 {selectedFeature.properties.observed_on}</p>}
              {selectedFeature.properties.source && <p style={{ margin: 2, fontSize: 9, color: '#999' }}>Source: {selectedFeature.properties.source}</p>}
              {selectedFeature.properties.url && <a href={selectedFeature.properties.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#2563eb' }}>View →</a>}
            </div>
          </Popup>
        )}
      </MapGL>

      {/* Layers Panel */}
      <div style={{ position: 'absolute', top: 16, left: 16, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', width: 240, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setLayerPanelOpen(!layerPanelOpen)}>
          <span style={{ fontWeight: 600, fontSize: 13 }}><Layers size={16} style={{ marginRight: 6 }} />Layers</span>
          {layerPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {layerPanelOpen && (
          <div style={{ padding: 10, maxHeight: 350, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <button onClick={() => setViewMode('grid')} style={{ flex: 1, padding: 4, borderRadius: 4, border: 'none', backgroundColor: viewMode === 'grid' ? '#22c55e' : '#eee', color: viewMode === 'grid' ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}><Grid3X3 size={10} /> Grid</button>
              <button onClick={() => setViewMode('points')} style={{ flex: 1, padding: 4, borderRadius: 4, border: 'none', backgroundColor: viewMode === 'points' ? '#22c55e' : '#eee', color: viewMode === 'points' ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}>📍 Points</button>
            </div>
            
            <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>MAP</div>
            {layers.map(l => (
              <div key={l.id} onClick={() => toggleLayer(l.id)} style={{ display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 4, cursor: 'pointer', backgroundColor: l.visible ? `${l.color}15` : 'transparent', marginBottom: 2 }}>
                <span style={{ marginRight: 6 }}>{l.icon}</span>
                <span style={{ flex: 1, fontSize: 11 }}>{l.name}</span>
                {l.visible ? <Eye size={12} color={l.color} /> : <EyeOff size={12} color="#ccc" />}
              </div>
            ))}
            
            <div style={{ fontSize: 9, color: '#888', margin: '8px 0 4px' }}>WILDLIFE ({wildlifeFeatures.length.toLocaleString()})</div>
            {wildlifeFilters.map(w => (
              <div key={w.id} onClick={() => toggleWildlife(w.id)} style={{ display: 'flex', alignItems: 'center', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', backgroundColor: w.visible ? `${w.color}15` : 'transparent', marginBottom: 2 }}>
                <span style={{ marginRight: 5, fontSize: 11 }}>{w.icon}</span>
                <span style={{ flex: 1, fontSize: 10 }}>{w.name}</span>
                <span style={{ fontSize: 9, color: '#999', marginRight: 4 }}>{taxonStats[w.id] || 0}</span>
                {w.visible ? <Eye size={11} color={w.color} /> : <EyeOff size={11} color="#ccc" />}
              </div>
            ))}
            
            <div style={{ marginTop: 8, padding: 6, backgroundColor: '#f5f5f5', borderRadius: 4, fontSize: 10 }}>
              📍 <strong>{visibleFeatures.length.toLocaleString()}</strong> visible
              {loading && <div style={{ color: '#888' }}>{progress}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', width: 240, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setInfoPanelOpen(!infoPanelOpen)}>
          <span style={{ fontWeight: 600, fontSize: 13 }}><Info size={16} style={{ marginRight: 6 }} />Utah Pollinator Path</span>
          {infoPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {infoPanelOpen && (
          <div style={{ padding: 10 }}>
            {monarchStatus && (
              <div style={{ padding: 8, backgroundColor: '#fef3c7', borderRadius: 6, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>🦋 {monarchStatus.status}</div>
                <div style={{ fontSize: 10, color: '#92400e' }}>{monarchStatus.utah_note}</div>
              </div>
            )}
            <div style={{ fontSize: 11, marginBottom: 8 }}>
              <div>🌳 {features.filter(f => f.properties.layer === 'parks').length} parks</div>
              <div>🦋 {features.filter(f => f.properties.layer === 'waystations').length} waystations</div>
              <div>📸 {wildlifeFeatures.length.toLocaleString()} total observations</div>
            </div>
            
            {/* Year distribution chart */}
            {availableYears.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>OBSERVATIONS BY YEAR</div>
                <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 40 }}>
                  {availableYears.map(y => {
                    const count = yearStats[y] || 0;
                    const max = Math.max(...Object.values(yearStats));
                    const height = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: `${Math.max(4, height)}%`, backgroundColor: yearFilter === y ? '#2563eb' : '#22c55e', borderRadius: 2, cursor: 'pointer' }} onClick={() => setYearFilter(yearFilter === y ? null : y)} title={`${y}: ${count}`} />
                        <div style={{ fontSize: 7, color: yearFilter === y ? '#2563eb' : '#999', marginTop: 2 }}>{y.toString().slice(-2)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline Control */}
      <div style={{ position: 'absolute', bottom: 55, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '8px 16px', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setPlaying(!playing)} style={{ padding: 4, border: 'none', backgroundColor: playing ? '#ef4444' : '#22c55e', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {playing ? <Pause size={14} color="white" /> : <Play size={14} color="white" />}
        </button>
        
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => setYearFilter(null)} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: !yearFilter ? '#2563eb' : '#eee', color: !yearFilter ? 'white' : '#666', cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>All</button>
          {availableYears.slice(-6).map(y => (
            <button key={y} onClick={() => setYearFilter(y)} style={{ padding: '3px 6px', borderRadius: 4, border: 'none', backgroundColor: yearFilter === y ? '#2563eb' : '#eee', color: yearFilter === y ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}>{y}</button>
          ))}
        </div>
        
        {yearFilter && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>{yearFilter}</span>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '5px 16px', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', fontSize: 12 }}>🐝 Utah Pollinator Path</div>
    </div>
  );
};

export default DiscoveryMap;
