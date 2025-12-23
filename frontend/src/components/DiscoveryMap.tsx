import React, { useState, useEffect, useMemo } from 'react';
import MapGL, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import { Layers, Eye, EyeOff, Info, ChevronDown, ChevronUp, Play, Pause, Grid3X3 } from 'lucide-react';
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

const GRID_SIZE = 0.012; // Slightly larger grid for more data

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
  const [yearRange, setYearRange] = useState<[number, number]>([2015, 2025]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [yearStats, setYearStats] = useState<Record<string, number>>({});

  // Load cached wildlife data
  useEffect(() => {
    const loadCache = async () => {
      setLoading(true);
      setProgress('Loading 100k+ observations...');
      
      try {
        const res = await api.get('/api/wildlife/cached', { timeout: 120000 });
        setWildlifeFeatures(res.data.features || []);
        setYearStats(res.data.year_distribution || {});
        
        // Set year range from data
        const years = Object.keys(res.data.year_distribution || {}).map(Number).filter(y => y > 1900);
        if (years.length > 0) {
          setYearRange([Math.min(...years), Math.max(...years)]);
        }
        
        setProgress(`Loaded ${res.data.total?.toLocaleString()} observations`);
      } catch (err) {
        console.error('Cache load error:', err);
        setProgress('Error loading cache');
      }
      
      setLoading(false);
    };
    loadCache();
  }, []);

  // Load map features
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

  // Animation effect
  useEffect(() => {
    if (!playing) return;
    const years = Object.keys(yearStats).map(Number).filter(y => y >= yearRange[0] && y <= yearRange[1]).sort();
    if (years.length === 0) return;
    
    const interval = setInterval(() => {
      setSelectedYear(prev => {
        const idx = prev ? years.indexOf(prev) : -1;
        const next = (idx + 1) % years.length;
        if (next === 0) setPlaying(false);
        return years[next];
      });
    }, 800);
    
    return () => clearInterval(interval);
  }, [playing, yearStats, yearRange]);

  const toggleLayer = (id: string) => setLayers(p => p.map(l => l.id === id ? {...l, visible: !l.visible} : l));
  const toggleWildlife = (id: string) => setWildlifeFilters(p => p.map(l => l.id === id ? {...l, visible: !l.visible} : l));

  // Filter features by year and taxon
  const visibleFeatures = useMemo(() => {
    return [...features, ...wildlifeFeatures].filter(f => {
      // Year filter
      const year = f.properties?.year;
      if (selectedYear && year !== selectedYear) return false;
      if (!selectedYear && year && (year < yearRange[0] || year > yearRange[1])) return false;
      
      // Taxon filter
      if (f.properties?.source === 'inaturalist' || f.properties?.source === 'gbif') {
        return wildlifeFilters.find(w => w.id === f.properties.iconic_taxon)?.visible ?? true;
      }
      return layers.find(l => l.id === f.properties.layer)?.visible ?? false;
    });
  }, [features, wildlifeFeatures, selectedYear, yearRange, wildlifeFilters, layers]);

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

  // Get decade markers for timeline
  const decades = useMemo(() => {
    const d = [];
    for (let y = Math.ceil(yearRange[0] / 10) * 10; y <= yearRange[1]; y += 10) {
      d.push(y);
    }
    return d;
  }, [yearRange]);

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
              <p style={{ margin: 2, fontSize: 9, color: '#999' }}>Source: {selectedFeature.properties.source} {selectedFeature.properties.institution && `(${selectedFeature.properties.institution})`}</p>
            </div>
          </Popup>
        )}
      </MapGL>

      {/* Layers Panel */}
      <div style={{ position: 'absolute', top: 16, left: 16, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', width: 220, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setLayerPanelOpen(!layerPanelOpen)}>
          <span style={{ fontWeight: 600, fontSize: 13 }}><Layers size={16} style={{ marginRight: 6 }} />Layers</span>
          {layerPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {layerPanelOpen && (
          <div style={{ padding: 10, maxHeight: 320, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <button onClick={() => setViewMode('grid')} style={{ flex: 1, padding: 4, borderRadius: 4, border: 'none', backgroundColor: viewMode === 'grid' ? '#22c55e' : '#eee', color: viewMode === 'grid' ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}><Grid3X3 size={10} /> Grid</button>
              <button onClick={() => setViewMode('points')} style={{ flex: 1, padding: 4, borderRadius: 4, border: 'none', backgroundColor: viewMode === 'points' ? '#22c55e' : '#eee', color: viewMode === 'points' ? 'white' : '#666', cursor: 'pointer', fontSize: 10 }}>📍 Points</button>
            </div>
            
            <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>WILDLIFE ({visibleFeatures.length.toLocaleString()})</div>
            {wildlifeFilters.map(w => (
              <div key={w.id} onClick={() => toggleWildlife(w.id)} style={{ display: 'flex', alignItems: 'center', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', backgroundColor: w.visible ? `${w.color}15` : 'transparent', marginBottom: 2 }}>
                <span style={{ marginRight: 5, fontSize: 11 }}>{w.icon}</span>
                <span style={{ flex: 1, fontSize: 10 }}>{w.name}</span>
                <span style={{ fontSize: 9, color: '#999', marginRight: 4 }}>{(taxonStats[w.id] || 0).toLocaleString()}</span>
                {w.visible ? <Eye size={11} color={w.color} /> : <EyeOff size={11} color="#ccc" />}
              </div>
            ))}
            
            <div style={{ marginTop: 8, padding: 6, backgroundColor: '#f5f5f5', borderRadius: 4, fontSize: 10 }}>
              {loading ? <div style={{ color: '#888' }}>{progress}</div> : <span>📍 <strong>{visibleFeatures.length.toLocaleString()}</strong> visible</span>}
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', width: 260, overflow: 'hidden' }}>
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
              <div>📊 <strong>{wildlifeFeatures.length.toLocaleString()}</strong> total observations</div>
              <div>📅 Data from <strong>{yearRange[0]}</strong> to <strong>{yearRange[1]}</strong></div>
              <div>🔬 Sources: iNaturalist, GBIF</div>
            </div>
            
            {/* Year distribution mini chart */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>OBSERVATIONS BY YEAR</div>
              <div style={{ display: 'flex', alignItems: 'end', gap: 1, height: 40 }}>
                {Object.entries(yearStats)
                  .filter(([y]) => parseInt(y) >= 2010)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([year, count]) => {
                    const max = Math.max(...Object.entries(yearStats).filter(([y]) => parseInt(y) >= 2010).map(([,c]) => c as number));
                    const height = max > 0 ? ((count as number) / max) * 100 : 0;
                    const isSelected = selectedYear === parseInt(year);
                    return (
                      <div key={year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div 
                          style={{ width: '100%', height: `${Math.max(4, height)}%`, backgroundColor: isSelected ? '#2563eb' : '#22c55e', borderRadius: 1, cursor: 'pointer' }} 
                          onClick={() => setSelectedYear(isSelected ? null : parseInt(year))}
                          title={`${year}: ${(count as number).toLocaleString()}`}
                        />
                      </div>
                    );
                  })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#999', marginTop: 2 }}>
                <span>2010</span>
                <span>2025</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Control */}
      <div style={{ position: 'absolute', bottom: 55, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '10px 16px', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', minWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={() => setPlaying(!playing)} style={{ padding: 6, border: 'none', backgroundColor: playing ? '#ef4444' : '#22c55e', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {playing ? <Pause size={14} color="white" /> : <Play size={14} color="white" />}
          </button>
          
          <span style={{ fontSize: 11, color: '#666' }}>Year:</span>
          <input
            type="range"
            min={yearRange[0]}
            max={yearRange[1]}
            value={selectedYear || yearRange[1]}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', minWidth: 40 }}>{selectedYear || 'All'}</span>
          
          <button onClick={() => setSelectedYear(null)} style={{ padding: '4px 8px', border: 'none', backgroundColor: !selectedYear ? '#2563eb' : '#eee', color: !selectedYear ? 'white' : '#666', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>All Years</button>
        </div>
        
        {/* Decade markers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#999' }}>
          {decades.map(d => (
            <span key={d} style={{ cursor: 'pointer' }} onClick={() => setSelectedYear(d)}>{d}</span>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '5px 16px', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', fontSize: 12 }}>🐝 Utah Pollinator Path • {visibleFeatures.length.toLocaleString()} observations</div>
    </div>
  );
};

export default DiscoveryMap;
