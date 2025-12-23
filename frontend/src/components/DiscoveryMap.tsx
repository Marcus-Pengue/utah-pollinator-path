import React, { useState, useEffect, useMemo } from 'react';
import MapGL, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import { Layers, Eye, EyeOff, Info, ChevronDown, ChevronUp, Play, Pause, Grid3X3, Calendar, TrendingUp } from 'lucide-react';
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

const ERAS = [
  { id: 'all', name: 'All Time', range: [1871, 2025] },
  { id: 'historic', name: 'Historic (1871-1950)', range: [1871, 1950] },
  { id: 'modern', name: 'Modern (1951-2010)', range: [1951, 2010] },
  { id: 'recent', name: 'Recent (2011-2025)', range: [2011, 2025] },
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

const DiscoveryMap: React.FC = () => {
  const [viewState, setViewState] = useState({ latitude: 40.666, longitude: -111.897, zoom: 10 });
  const [wildlifeFilters, setWildlifeFilters] = useState(WILDLIFE_FILTERS);
  const [wildlifeFeatures, setWildlifeFeatures] = useState<Feature[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [timelinePanelOpen, setTimelinePanelOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'points'>('grid');
  
  // Timeline state
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedEra, setSelectedEra] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(800);
  const [yearStats, setYearStats] = useState<Record<string, number>>({});
  const [monthStats, setMonthStats] = useState<Record<string, number>>({});

  // Get era range
  const eraRange = useMemo(() => {
    const era = ERAS.find(e => e.id === selectedEra);
    return era?.range || [1871, 2025];
  }, [selectedEra]);

  // Get years in current era
  const eraYears = useMemo(() => {
    return Object.keys(yearStats)
      .map(Number)
      .filter(y => y >= eraRange[0] && y <= eraRange[1])
      .sort((a, b) => a - b);
  }, [yearStats, eraRange]);

  // Animation effect
  useEffect(() => {
    if (!playing || eraYears.length === 0) return;
    
    const interval = setInterval(() => {
      setSelectedYear(prev => {
        const idx = prev ? eraYears.indexOf(prev) : -1;
        const next = (idx + 1) % eraYears.length;
        if (next === 0) {
          setPlaying(false);
          return null;
        }
        return eraYears[next];
      });
    }, playSpeed);
    
    return () => clearInterval(interval);
  }, [playing, eraYears, playSpeed]);

  // Load cached wildlife data
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

  // Calculate month stats from visible features
  useEffect(() => {
    const stats: Record<string, number> = {};
    wildlifeFeatures.forEach(f => {
      const m = f.properties?.month;
      if (m) stats[m] = (stats[m] || 0) + 1;
    });
    setMonthStats(stats);
  }, [wildlifeFeatures]);

  const toggleWildlife = (id: string) => setWildlifeFilters(p => p.map(l => l.id === id ? {...l, visible: !l.visible} : l));

  // Filter features
  const visibleFeatures = useMemo(() => {
    return wildlifeFeatures.filter(f => {
      const props = f.properties || {};
      const year = props.year;
      const month = props.month;
      
      // Year/Era filter
      if (selectedYear && year !== selectedYear) return false;
      if (!selectedYear && year && (year < eraRange[0] || year > eraRange[1])) return false;
      
      // Season filter
      if (selectedSeason) {
        const season = SEASONS.find(s => s.id === selectedSeason);
        if (season && month && !season.months.includes(month)) return false;
      }
      
      // Taxon filter
      const taxon = props.iconic_taxon;
      const filter = wildlifeFilters.find(w => w.id === taxon);
      if (filter && !filter.visible) return false;
      
      return true;
    });
  }, [wildlifeFeatures, selectedYear, eraRange, selectedSeason, wildlifeFilters]);

  const gridCells = useMemo(() => createGrid(visibleFeatures), [visibleFeatures]);
  
  const taxonStats = useMemo(() => {
    const s: Record<string, number> = {};
    visibleFeatures.forEach(f => {
      const t = f.properties?.iconic_taxon || 'Other';
      s[t] = (s[t] || 0) + 1;
    });
    return s;
  }, [visibleFeatures]);

  const heatmapData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: visibleFeatures.map(f => ({ type: 'Feature' as const, geometry: f.geometry, properties: {} }))
  }), [visibleFeatures]);

  // Calculate decade totals for visualization
  const decadeTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    Object.entries(yearStats).forEach(([year, count]) => {
      const decade = Math.floor(parseInt(year) / 10) * 10;
      totals[decade] = (totals[decade] || 0) + (count as number);
    });
    return totals;
  }, [yearStats]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <MapGL {...viewState} onMove={e => setViewState(e.viewState)} mapStyle="mapbox://styles/mapbox/light-v11" mapboxAccessToken={MAPBOX_TOKEN} style={{ width: '100%', height: '100%' }}>
        <NavigationControl position="bottom-right" />
        
        {viewMode === 'grid' && (
          <Source id="heat" type="geojson" data={heatmapData}>
            <Layer id="heatmap" type="heatmap" paint={{
              'heatmap-weight': 1,
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 15, 1.5],
              'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,255,0,0)', 0.2, 'rgba(134,239,172,0.4)', 0.4, 'rgba(34,197,94,0.5)', 0.6, 'rgba(250,204,21,0.6)', 0.8, 'rgba(249,115,22,0.7)', 1, 'rgba(220,38,38,0.8)'],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 15, 13, 25],
              'heatmap-opacity': 0.7,
            }} />
          </Source>
        )}
        
        {viewMode === 'grid' && viewState.zoom >= 11 && gridCells.map((c, i) => (
          <Marker key={i} latitude={c.lat} longitude={c.lng} onClick={e => { e.originalEvent.stopPropagation(); setSelectedCell(c); }}>
            <div style={{ minWidth: 22, padding: '2px 5px', borderRadius: 4, backgroundColor: getGridColor(c.percentile), border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 600, color: c.percentile >= 0.5 ? 'white' : '#1a1a1a', cursor: 'pointer', textAlign: 'center' }}>{c.count}</div>
          </Marker>
        ))}

        {viewMode === 'points' && viewState.zoom >= 12 && visibleFeatures.slice(0, 300).map((f, i) => (
          <Marker key={i} latitude={f.geometry.coordinates[1]} longitude={f.geometry.coordinates[0]} onClick={e => { e.originalEvent.stopPropagation(); setSelectedFeature(f); }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: WILDLIFE_FILTERS.find(w => w.id === f.properties.iconic_taxon)?.color || '#666', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer' }}>
              {WILDLIFE_FILTERS.find(w => w.id === f.properties.iconic_taxon)?.icon || '📍'}
            </div>
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

        {selectedFeature && (
          <Popup latitude={selectedFeature.geometry.coordinates[1]} longitude={selectedFeature.geometry.coordinates[0]} onClose={() => setSelectedFeature(null)} anchor="bottom" maxWidth="260px">
            <div style={{ padding: 4 }}>
              <h3 style={{ margin: 0, fontSize: 13 }}>{selectedFeature.properties.species || 'Unknown'}</h3>
              <p style={{ margin: '2px 0', fontSize: 10, color: '#666', fontStyle: 'italic' }}>{selectedFeature.properties.scientific_name}</p>
              {selectedFeature.properties.photo_url && <img src={selectedFeature.properties.photo_url} alt="" style={{ width: '100%', borderRadius: 4, margin: '6px 0' }} />}
              {selectedFeature.properties.observed_on && <p style={{ margin: 2, fontSize: 10, color: '#666' }}>📅 {selectedFeature.properties.observed_on}</p>}
              <p style={{ margin: 2, fontSize: 9, color: '#999' }}>Source: {selectedFeature.properties.source}</p>
            </div>
          </Popup>
        )}
      </MapGL>

      {/* Layers Panel */}
      <div style={{ position: 'absolute', top: 16, left: 16, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', width: 220, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setLayerPanelOpen(!layerPanelOpen)}>
          <span style={{ fontWeight: 600, fontSize: 13 }}><Layers size={16} style={{ marginRight: 6 }} />Species</span>
          {layerPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {layerPanelOpen && (
          <div style={{ padding: 10, maxHeight: 300, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <button onClick={() => setViewMode('grid')} style={{ flex: 1, padding: 4, borderRadius: 4, border: 'none', backgroundColor: viewMode === 'grid' ? '#22c55e' : '#eee', color: viewMode === 'grid' ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}><Grid3X3 size={10} /> Grid</button>
              <button onClick={() => setViewMode('points')} style={{ flex: 1, padding: 4, borderRadius: 4, border: 'none', backgroundColor: viewMode === 'points' ? '#22c55e' : '#eee', color: viewMode === 'points' ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}>📍 Points</button>
            </div>
            
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

      {/* Timeline Panel */}
      <div style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', width: 280, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setTimelinePanelOpen(!timelinePanelOpen)}>
          <span style={{ fontWeight: 600, fontSize: 13 }}><Calendar size={16} style={{ marginRight: 6 }} />Timeline</span>
          {timelinePanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {timelinePanelOpen && (
          <div style={{ padding: 10 }}>
            {/* Era selector */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>ERA</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ERAS.map(era => (
                  <button key={era.id} onClick={() => { setSelectedEra(era.id); setSelectedYear(null); }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: selectedEra === era.id ? '#2563eb' : '#eee', color: selectedEra === era.id ? 'white' : '#666', cursor: 'pointer', fontSize: 9 }}>{era.name.split(' ')[0]}</button>
                ))}
              </div>
            </div>
            
            {/* Decade chart */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>OBSERVATIONS BY DECADE</div>
              <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 50 }}>
                {Object.entries(decadeTotals)
                  .filter(([d]) => parseInt(d) >= eraRange[0] && parseInt(d) <= eraRange[1])
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([decade, count]) => {
                    const max = Math.max(...Object.entries(decadeTotals).filter(([d]) => parseInt(d) >= eraRange[0]).map(([,c]) => c as number));
                    const height = max > 0 ? ((count as number) / max) * 100 : 0;
                    const isActive = selectedYear && Math.floor(selectedYear / 10) * 10 === parseInt(decade);
                    return (
                      <div key={decade} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div 
                          style={{ width: '100%', height: `${Math.max(4, height)}%`, backgroundColor: isActive ? '#2563eb' : '#22c55e', borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s' }} 
                          onClick={() => setSelectedYear(parseInt(decade))}
                          title={`${decade}s: ${(count as number).toLocaleString()}`}
                        />
                        <div style={{ fontSize: 7, color: '#999', marginTop: 2 }}>{decade.slice(-2)}s</div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {/* Season filter */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>SEASON</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setSelectedSeason(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: !selectedSeason ? '#22c55e' : '#eee', color: !selectedSeason ? 'white' : '#666', cursor: 'pointer', fontSize: 9 }}>All</button>
                {SEASONS.map(s => (
                  <button key={s.id} onClick={() => setSelectedSeason(selectedSeason === s.id ? null : s.id)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: selectedSeason === s.id ? s.color : '#eee', color: selectedSeason === s.id ? 'white' : '#666', cursor: 'pointer', fontSize: 9 }}>{s.icon}</button>
                ))}
              </div>
            </div>
            
            {/* Year slider */}
            <div>
              <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>YEAR: <span style={{ color: '#2563eb', fontWeight: 600 }}>{selectedYear || 'All'}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setPlaying(!playing)} style={{ padding: 6, border: 'none', backgroundColor: playing ? '#ef4444' : '#22c55e', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
                  {playing ? <Pause size={12} color="white" /> : <Play size={12} color="white" />}
                </button>
                <input
                  type="range"
                  min={eraRange[0]}
                  max={eraRange[1]}
                  value={selectedYear || eraRange[1]}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button onClick={() => setSelectedYear(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#eee', color: '#666', cursor: 'pointer', fontSize: 9 }}>Reset</button>
              </div>
            </div>
            
            {/* Speed control */}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#888' }}>Speed:</span>
              {[{ label: '0.5x', ms: 1500 }, { label: '1x', ms: 800 }, { label: '2x', ms: 400 }].map(s => (
                <button key={s.label} onClick={() => setPlaySpeed(s.ms)} style={{ padding: '2px 6px', borderRadius: 3, border: 'none', backgroundColor: playSpeed === s.ms ? '#2563eb' : '#eee', color: playSpeed === s.ms ? 'white' : '#666', cursor: 'pointer', fontSize: 8 }}>{s.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Current selection display */}
      {(selectedYear || selectedSeason) && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '12px 24px', borderRadius: 12, fontSize: 24, fontWeight: 700, textAlign: 'center' }}>
            {selectedYear && <div>{selectedYear}</div>}
            {selectedSeason && <div style={{ fontSize: 14, opacity: 0.8 }}>{SEASONS.find(s => s.id === selectedSeason)?.icon} {SEASONS.find(s => s.id === selectedSeason)?.name}</div>}
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{visibleFeatures.length.toLocaleString()} observations</div>
          </div>
        </div>
      )}

      {/* Bottom info bar */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '8px 20px', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>🐝 Utah Pollinator Path</span>
        <span style={{ fontSize: 11, color: '#666' }}>📊 {wildlifeFeatures.length.toLocaleString()} total</span>
        <span style={{ fontSize: 11, color: '#666' }}>📅 1871-2025</span>
        <span style={{ fontSize: 11, color: '#888' }}>iNaturalist + GBIF</span>
      </div>
    </div>
  );
};

export default DiscoveryMap;
