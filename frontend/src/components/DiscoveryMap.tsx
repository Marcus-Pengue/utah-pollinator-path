import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import MapGL, { Marker, Popup, NavigationControl, Source, Layer, MapRef } from 'react-map-gl';
import { Layers, Eye, EyeOff, ChevronDown, ChevronUp, Play, Pause, Grid3X3, Calendar, GitCompare } from 'lucide-react';
import { api } from '../api/client';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

interface Feature {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, any>;
}

interface GridCell {
  lat: number;
  lng: number;
  count: number;
  percentile: number;
  features: Feature[];
}

const WILDLIFE_FILTERS = [
  { id: 'Aves', name: 'Birds', icon: '🐦', color: '#3b82f6', visible: true },
  { id: 'Insecta', name: 'Insects', icon: '🦋', color: '#8b5cf6', visible: true },
  { id: 'Plantae', name: 'Plants', icon: '🌿', color: '#22c55e', visible: true },
  { id: 'Mammalia', name: 'Mammals', icon: '🦊', color: '#f97316', visible: true },
  { id: 'Fungi', name: 'Fungi', icon: '🍄', color: '#ef4444', visible: true },
  { id: 'Arachnida', name: 'Arachnids', icon: '🕷️', color: '#6b7280', visible: true },
  { id: 'Reptilia', name: 'Reptiles', icon: '🦎', color: '#84cc16', visible: true },
  { id: 'Amphibia', name: 'Amphibians', icon: '🐸', color: '#06b6d4', visible: true },
];

const SEASONS = [
  { id: 'spring', name: 'Spring', months: [3, 4, 5], icon: '🌸', color: '#ec4899' },
  { id: 'summer', name: 'Summer', months: [6, 7, 8], icon: '☀️', color: '#f59e0b' },
  { id: 'fall', name: 'Fall', months: [9, 10, 11], icon: '🍂', color: '#f97316' },
  { id: 'winter', name: 'Winter', months: [12, 1, 2], icon: '❄️', color: '#06b6d4' },
];

const GRID_SIZE = 0.012;

function createGrid(features: Feature[]): GridCell[] {
  const cellMap: Record<string, GridCell> = {};
  features.forEach(f => {
    const [lng, lat] = f.geometry.coordinates;
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

const COMPARISON_PRESETS = [
  { name: '100 Years', left: [1920, 1930], right: [2020, 2025] },
  { name: '50 Years', left: [1970, 1980], right: [2020, 2025] },
  { name: 'Pre/Post iNat', left: [2000, 2010], right: [2015, 2025] },
  { name: 'Historic', left: [1900, 1950], right: [2000, 2025] },
  { name: '2010s vs 2020s', left: [2010, 2019], right: [2020, 2025] },
];

const DiscoveryMap: React.FC = () => {
  const [viewState, setViewState] = useState({ latitude: 40.666, longitude: -111.897, zoom: 10 });
  const [wildlifeFilters, setWildlifeFilters] = useState(WILDLIFE_FILTERS);
  const [wildlifeFeatures, setWildlifeFeatures] = useState<Feature[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [timelinePanelOpen, setTimelinePanelOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'points'>('grid');
  
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(800);
  const [yearStats, setYearStats] = useState<Record<string, number>>({});
  
  const [compareMode, setCompareMode] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [leftYearRange, setLeftYearRange] = useState<[number, number]>([1920, 1930]);
  const [rightYearRange, setRightYearRange] = useState<[number, number]>([2020, 2025]);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => Object.keys(yearStats).map(Number).sort((a, b) => a - b), [yearStats]);
  const minYear = availableYears[0] || 1871;
  const maxYear = availableYears[availableYears.length - 1] || 2025;

  useEffect(() => {
    if (!playing || compareMode || availableYears.length === 0) return;
    const interval = setInterval(() => {
      setSelectedYear(prev => {
        const idx = prev ? availableYears.indexOf(prev) : -1;
        const next = (idx + 1) % availableYears.length;
        if (next === 0) { setPlaying(false); return null; }
        return availableYears[next];
      });
    }, playSpeed);
    return () => clearInterval(interval);
  }, [playing, availableYears, playSpeed, compareMode]);

  useEffect(() => {
    const loadCache = async () => {
      setLoading(true);
      setProgress('Loading 105k+ observations...');
      try {
        const res = await api.get('/api/wildlife/cached', { timeout: 120000 });
        setWildlifeFeatures(res.data.features || []);
        setYearStats(res.data.year_distribution || {});
        setProgress(`Loaded ${res.data.total?.toLocaleString()} observations`);
      } catch (err) {
        console.error('Cache load error:', err);
        setProgress('Error loading cache');
      }
      setLoading(false);
    };
    loadCache();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setSliderPosition(Math.max(5, Math.min(95, (x / rect.width) * 100)));
  }, [isDragging]);

  const toggleWildlife = (id: string) => setWildlifeFilters(p => p.map(l => l.id === id ? {...l, visible: !l.visible} : l));

  const filterFeatures = useCallback((features: Feature[], yearRange?: [number, number]) => {
    return features.filter(f => {
      const props = f.properties || {};
      const year = props.year;
      const month = props.month;
      if (yearRange && year && (year < yearRange[0] || year > yearRange[1])) return false;
      if (!compareMode && selectedYear && year !== selectedYear) return false;
      if (selectedSeason) {
        const season = SEASONS.find(s => s.id === selectedSeason);
        if (season && month && !season.months.includes(month)) return false;
      }
      const taxon = props.iconic_taxon;
      const filter = wildlifeFilters.find(w => w.id === taxon);
      if (filter && !filter.visible) return false;
      return true;
    });
  }, [compareMode, selectedYear, selectedSeason, wildlifeFilters]);

  const leftFeatures = useMemo(() => compareMode ? filterFeatures(wildlifeFeatures, leftYearRange) : filterFeatures(wildlifeFeatures), [wildlifeFeatures, leftYearRange, compareMode, filterFeatures]);
  const rightFeatures = useMemo(() => compareMode ? filterFeatures(wildlifeFeatures, rightYearRange) : [], [wildlifeFeatures, rightYearRange, compareMode, filterFeatures]);
  const visibleFeatures = compareMode ? leftFeatures : leftFeatures;
  const gridCells = useMemo(() => createGrid(visibleFeatures), [visibleFeatures]);
  
  const taxonStats = useMemo(() => {
    const s: Record<string, number> = {};
    visibleFeatures.forEach(f => { const t = f.properties?.iconic_taxon || 'Other'; s[t] = (s[t] || 0) + 1; });
    return s;
  }, [visibleFeatures]);

  const leftHeatmap = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: leftFeatures.map(f => ({ type: 'Feature' as const, geometry: f.geometry, properties: {} }))
  }), [leftFeatures]);

  const rightHeatmap = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: rightFeatures.map(f => ({ type: 'Feature' as const, geometry: f.geometry, properties: {} }))
  }), [rightFeatures]);

  const leftTaxonStats = useMemo(() => {
    const s: Record<string, number> = {};
    leftFeatures.forEach(f => { const t = f.properties?.iconic_taxon || 'Other'; s[t] = (s[t] || 0) + 1; });
    return s;
  }, [leftFeatures]);

  const rightTaxonStats = useMemo(() => {
    const s: Record<string, number> = {};
    rightFeatures.forEach(f => { const t = f.properties?.iconic_taxon || 'Other'; s[t] = (s[t] || 0) + 1; });
    return s;
  }, [rightFeatures]);

  const heatmapPaint = {
    'heatmap-weight': 1,
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 15, 1.5] as any,
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 15, 13, 25] as any,
    'heatmap-opacity': 0.8,
  };

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'relative' }} onMouseMove={handleMouseMove} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
      
      {/* Main Map (or Left map in compare mode) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', clipPath: compareMode ? `inset(0 ${100 - sliderPosition}% 0 0)` : 'none' }}>
        <MapGL {...viewState} onMove={e => setViewState(e.viewState)} mapStyle="mapbox://styles/mapbox/light-v11" mapboxAccessToken={MAPBOX_TOKEN} style={{ width: '100%', height: '100%' }}>
          {!compareMode && <NavigationControl position="bottom-right" />}
          
          <Source id="heat-left" type="geojson" data={leftHeatmap}>
            <Layer id="heatmap-left" type="heatmap" paint={{
              ...heatmapPaint,
              'heatmap-color': compareMode 
                ? ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(59,130,246,0)', 0.2, 'rgba(96,165,250,0.4)', 0.5, 'rgba(59,130,246,0.6)', 0.8, 'rgba(37,99,235,0.8)', 1, 'rgba(29,78,216,1)'] as any
                : ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,255,0,0)', 0.2, 'rgba(134,239,172,0.4)', 0.4, 'rgba(34,197,94,0.5)', 0.6, 'rgba(250,204,21,0.6)', 0.8, 'rgba(249,115,22,0.7)', 1, 'rgba(220,38,38,0.8)'] as any,
            }} />
          </Source>
          
          {!compareMode && viewMode === 'grid' && viewState.zoom >= 11 && gridCells.map((c, i) => (
            <Marker key={i} latitude={c.lat} longitude={c.lng} onClick={e => { e.originalEvent.stopPropagation(); setSelectedCell(c); }}>
              <div style={{ minWidth: 22, padding: '2px 5px', borderRadius: 4, backgroundColor: getGridColor(c.percentile), border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 600, color: c.percentile >= 0.5 ? 'white' : '#1a1a1a', cursor: 'pointer', textAlign: 'center' }}>{c.count}</div>
            </Marker>
          ))}

          {selectedCell && (
            <Popup latitude={selectedCell.lat} longitude={selectedCell.lng} onClose={() => setSelectedCell(null)} anchor="bottom" maxWidth="280px">
              <div style={{ padding: 4 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 13 }}>{selectedCell.count.toLocaleString()} observations</h3>
                {Object.entries(selectedCell.features.reduce((a: Record<string,number>, f) => { const t = f.properties.iconic_taxon || 'Other'; a[t] = (a[t]||0)+1; return a; }, {}))
                  .sort((a,b) => b[1]-a[1]).slice(0, 6).map(([t, c]) => (
                    <div key={t} style={{ fontSize: 11, display: 'flex', gap: 4 }}>
                      <span>{WILDLIFE_FILTERS.find(w => w.id === t)?.icon}</span>
                      <span style={{ flex: 1 }}>{WILDLIFE_FILTERS.find(w => w.id === t)?.name || t}</span>
                      <span>{c.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </Popup>
          )}
        </MapGL>
      </div>

      {/* Right map in compare mode */}
      {compareMode && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', clipPath: `inset(0 0 0 ${sliderPosition}%)` }}>
          <MapGL {...viewState} onMove={e => setViewState(e.viewState)} mapStyle="mapbox://styles/mapbox/light-v11" mapboxAccessToken={MAPBOX_TOKEN} style={{ width: '100%', height: '100%' }}>
            <NavigationControl position="bottom-right" />
            
            <Source id="heat-right" type="geojson" data={rightHeatmap}>
              <Layer id="heatmap-right" type="heatmap" paint={{
                ...heatmapPaint,
                'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(249,115,22,0)', 0.2, 'rgba(251,146,60,0.4)', 0.5, 'rgba(249,115,22,0.6)', 0.8, 'rgba(234,88,12,0.8)', 1, 'rgba(194,65,12,1)'] as any,
              }} />
            </Source>
          </MapGL>
        </div>
      )}

      {/* Slider handle */}
      {compareMode && (
        <div 
          style={{ position: 'absolute', top: 0, left: `${sliderPosition}%`, width: 6, height: '100%', backgroundColor: 'white', cursor: 'ew-resize', zIndex: 100, boxShadow: '0 0 15px rgba(0,0,0,0.4)', transform: 'translateX(-50%)' }}
          onMouseDown={() => setIsDragging(true)}
        >
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 44, height: 44, borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: '#666' }}>⟷</div>
        </div>
      )}

      {/* Year labels in compare mode */}
      {compareMode && (
        <>
          <div style={{ position: 'absolute', top: 80, left: 250, backgroundColor: 'rgba(59,130,246,0.95)', color: 'white', padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 16, zIndex: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            {leftYearRange[0]} - {leftYearRange[1]}
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 400 }}>{leftFeatures.length.toLocaleString()} observations</div>
          </div>
          <div style={{ position: 'absolute', top: 80, right: 320, backgroundColor: 'rgba(234,88,12,0.95)', color: 'white', padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 16, zIndex: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            {rightYearRange[0]} - {rightYearRange[1]}
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 400 }}>{rightFeatures.length.toLocaleString()} observations</div>
          </div>
        </>
      )}

      {/* Layers Panel */}
      <div style={{ position: 'absolute', top: 16, left: 16, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', width: 220, overflow: 'hidden', zIndex: 200 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setLayerPanelOpen(!layerPanelOpen)}>
          <span style={{ fontWeight: 600, fontSize: 13 }}><Layers size={16} style={{ marginRight: 6 }} />Species</span>
          {layerPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {layerPanelOpen && (
          <div style={{ padding: 10, maxHeight: 280, overflowY: 'auto' }}>
            {!compareMode && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <button onClick={() => setViewMode('grid')} style={{ flex: 1, padding: 4, borderRadius: 4, border: 'none', backgroundColor: viewMode === 'grid' ? '#22c55e' : '#eee', color: viewMode === 'grid' ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}><Grid3X3 size={10} /> Grid</button>
                <button onClick={() => setViewMode('points')} style={{ flex: 1, padding: 4, borderRadius: 4, border: 'none', backgroundColor: viewMode === 'points' ? '#22c55e' : '#eee', color: viewMode === 'points' ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}>📍 Points</button>
              </div>
            )}
            
            {wildlifeFilters.map(w => (
              <div key={w.id} onClick={() => toggleWildlife(w.id)} style={{ display: 'flex', alignItems: 'center', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', backgroundColor: w.visible ? `${w.color}15` : 'transparent', marginBottom: 2 }}>
                <span style={{ marginRight: 5, fontSize: 11 }}>{w.icon}</span>
                <span style={{ flex: 1, fontSize: 10 }}>{w.name}</span>
                <span style={{ fontSize: 9, color: '#999', marginRight: 4 }}>{(taxonStats[w.id] || 0).toLocaleString()}</span>
                {w.visible ? <Eye size={11} color={w.color} /> : <EyeOff size={11} color="#ccc" />}
              </div>
            ))}
            
            <div style={{ marginTop: 8, padding: 6, backgroundColor: '#f5f5f5', borderRadius: 4, fontSize: 10 }}>
              {loading ? <span style={{ color: '#888' }}>{progress}</span> : <span>📍 <strong>{visibleFeatures.length.toLocaleString()}</strong> visible</span>}
            </div>
          </div>
        )}
      </div>

      {/* Timeline/Compare Panel */}
      <div style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', width: 300, overflow: 'hidden', zIndex: 200 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setTimelinePanelOpen(!timelinePanelOpen)}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {compareMode ? <><GitCompare size={16} style={{ marginRight: 6 }} />Compare</> : <><Calendar size={16} style={{ marginRight: 6 }} />Timeline</>}
          </span>
          {timelinePanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {timelinePanelOpen && (
          <div style={{ padding: 10 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <button onClick={() => setCompareMode(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', backgroundColor: !compareMode ? '#22c55e' : '#eee', color: !compareMode ? 'white' : '#666', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                <Calendar size={12} /> Timeline
              </button>
              <button onClick={() => setCompareMode(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', backgroundColor: compareMode ? '#2563eb' : '#eee', color: compareMode ? 'white' : '#666', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                <GitCompare size={12} /> Compare
              </button>
            </div>
            
            {compareMode ? (
              <>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>PRESETS</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {COMPARISON_PRESETS.map(p => (
                      <button key={p.name} onClick={() => { setLeftYearRange(p.left as [number, number]); setRightYearRange(p.right as [number, number]); }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#eee', color: '#666', cursor: 'pointer', fontSize: 9 }}>{p.name}</button>
                    ))}
                  </div>
                </div>
                
                <div style={{ marginBottom: 8, padding: 8, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 6, border: '2px solid #3b82f6' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#2563eb', marginBottom: 4 }}>🔵 Left: {leftYearRange[0]} - {leftYearRange[1]}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" min={minYear} max={maxYear} value={leftYearRange[0]} onChange={e => setLeftYearRange([parseInt(e.target.value) || minYear, leftYearRange[1]])} style={{ flex: 1, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 11 }} />
                    <input type="number" min={minYear} max={maxYear} value={leftYearRange[1]} onChange={e => setLeftYearRange([leftYearRange[0], parseInt(e.target.value) || maxYear])} style={{ flex: 1, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 11 }} />
                  </div>
                </div>
                
                <div style={{ marginBottom: 8, padding: 8, backgroundColor: 'rgba(234,88,12,0.1)', borderRadius: 6, border: '2px solid #ea580c' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#ea580c', marginBottom: 4 }}>🟠 Right: {rightYearRange[0]} - {rightYearRange[1]}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" min={minYear} max={maxYear} value={rightYearRange[0]} onChange={e => setRightYearRange([parseInt(e.target.value) || minYear, rightYearRange[1]])} style={{ flex: 1, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 11 }} />
                    <input type="number" min={minYear} max={maxYear} value={rightYearRange[1]} onChange={e => setRightYearRange([rightYearRange[0], parseInt(e.target.value) || maxYear])} style={{ flex: 1, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 11 }} />
                  </div>
                </div>
                
                <div style={{ backgroundColor: '#f5f5f5', borderRadius: 6, padding: 8 }}>
                  <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>BY TAXON</div>
                  {WILDLIFE_FILTERS.slice(0, 4).map(w => {
                    const left = leftTaxonStats[w.id] || 0;
                    const right = rightTaxonStats[w.id] || 0;
                    const change = left > 0 ? Math.round(((right - left) / left) * 100) : (right > 0 ? 100 : 0);
                    return (
                      <div key={w.id} style={{ display: 'flex', alignItems: 'center', fontSize: 10, marginBottom: 2 }}>
                        <span style={{ marginRight: 4 }}>{w.icon}</span>
                        <span style={{ flex: 1 }}>{w.name}</span>
                        <span style={{ color: '#3b82f6', width: 35, textAlign: 'right', fontSize: 9 }}>{left.toLocaleString()}</span>
                        <span style={{ margin: '0 2px', color: '#ccc' }}>→</span>
                        <span style={{ color: '#ea580c', width: 35, fontSize: 9 }}>{right.toLocaleString()}</span>
                        <span style={{ width: 40, textAlign: 'right', color: change > 0 ? '#22c55e' : change < 0 ? '#ef4444' : '#999', fontWeight: 600, fontSize: 9 }}>
                          {change > 0 ? '+' : ''}{change}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>SEASON</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setSelectedSeason(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: !selectedSeason ? '#22c55e' : '#eee', color: !selectedSeason ? 'white' : '#666', cursor: 'pointer', fontSize: 9 }}>All</button>
                    {SEASONS.map(s => (
                      <button key={s.id} onClick={() => setSelectedSeason(selectedSeason === s.id ? null : s.id)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: selectedSeason === s.id ? s.color : '#eee', color: selectedSeason === s.id ? 'white' : '#666', cursor: 'pointer', fontSize: 9 }}>{s.icon}</button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>YEAR: <span style={{ color: '#2563eb', fontWeight: 600 }}>{selectedYear || 'All'}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setPlaying(!playing)} style={{ padding: 6, border: 'none', backgroundColor: playing ? '#ef4444' : '#22c55e', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
                      {playing ? <Pause size={12} color="white" /> : <Play size={12} color="white" />}
                    </button>
                    <input type="range" min={minYear} max={maxYear} value={selectedYear || maxYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ flex: 1 }} />
                    <button onClick={() => setSelectedYear(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#eee', color: '#666', cursor: 'pointer', fontSize: 9 }}>All</button>
                  </div>
                </div>
                
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: '#888' }}>Speed:</span>
                  {[{ label: '0.5x', ms: 1500 }, { label: '1x', ms: 800 }, { label: '2x', ms: 400 }].map(s => (
                    <button key={s.label} onClick={() => setPlaySpeed(s.ms)} style={{ padding: '2px 6px', borderRadius: 3, border: 'none', backgroundColor: playSpeed === s.ms ? '#2563eb' : '#eee', color: playSpeed === s.ms ? 'white' : '#666', cursor: 'pointer', fontSize: 8 }}>{s.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Year overlay */}
      {!compareMode && selectedYear && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 50 }}>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.85)', color: 'white', padding: '16px 32px', borderRadius: 16, fontSize: 36, fontWeight: 700, textAlign: 'center' }}>
            {selectedYear}
            <div style={{ fontSize: 14, opacity: 0.7 }}>{visibleFeatures.length.toLocaleString()} observations</div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '8px 20px', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 16, zIndex: 200 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>🐝 Utah Pollinator Path</span>
        <span style={{ fontSize: 11, color: '#666' }}>📊 {wildlifeFeatures.length.toLocaleString()} total</span>
        <span style={{ fontSize: 11, color: '#666' }}>📅 1871-2025</span>
        {compareMode && <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 500 }}>🔀 Compare Mode</span>}
      </div>
    </div>
  );
};

export default DiscoveryMap;
