import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import MapGL, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import { Layers, Eye, EyeOff, ChevronDown, ChevronUp, Play, Pause, Grid3X3, Calendar, GitCompare, Plus, Flower2, Download } from 'lucide-react';
import { api } from '../api/client';
import GardenRegistration from './GardenRegistration';
import SpeciesSearch from './SpeciesSearch';
import UnifiedControlPanel from './UnifiedControlPanel';
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

interface Garden {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: {
    id: string;
    name: string;
    size: string;
    plants: string[];
    features: string[];
    created: string;
  };
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
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Garden registration state
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [showGardens, setShowGardens] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [opportunityData, setOpportunityData] = useState<any>(null);
  const [showOpportunityZones, setShowOpportunityZones] = useState(true);
  const [minConnectivity, setMinConnectivity] = useState(0);
  const [minObservations, setMinObservations] = useState(0);
  const [registerMode, setRegisterMode] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [gardenSuccess, setGardenSuccess] = useState(false);

  // Species search state
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const availableYears = useMemo(() => Object.keys(yearStats).map(Number).sort((a, b) => a - b), [yearStats]);
  const minYear = availableYears[0] || 1871;
  const maxYear = availableYears[availableYears.length - 1] || 2025;

  const presets = [
    { id: '100years', name: '100 Years', left: [1920, 1930] as [number, number], right: [2020, 2025] as [number, number] },
    { id: '50years', name: '50 Years', left: [1970, 1980] as [number, number], right: [2020, 2025] as [number, number] },
    { id: 'inat', name: 'Pre/Post iNat', left: [2000, 2010] as [number, number], right: [2015, 2025] as [number, number] },
    { id: 'historic', name: 'Historic', left: [1900, 1950] as [number, number], right: [2000, 2025] as [number, number] },
    { id: 'decades', name: '2010s vs 2020s', left: [2010, 2019] as [number, number], right: [2020, 2025] as [number, number] },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setLeftYearRange(preset.left);
    setRightYearRange(preset.right);
    setActivePreset(preset.id);
  };

  // Load gardens
  useEffect(() => {
    const loadGardens = async () => {
      try {
        const res = await api.get('/api/gardens');
        setGardens(res.data.features || []);
      } catch (err) {
        console.log('Gardens not loaded:', err);
      }
    };
    loadGardens();
  }, []);

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

  const handleFlyTo = (lat: number, lng: number) => {
    setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 12 }));
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setSliderPosition(Math.max(5, Math.min(95, (x / rect.width) * 100)));
  }, [isDragging]);

  const handleMapClick = (e: any) => {
    if (registerMode && e.lngLat) {
      setPendingLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    }
  };

  const handleGardenSubmit = async (data: any) => {
    try {
      const res = await api.post('/api/gardens', data);
      if (res.data.success) {
        // Refresh gardens
        const gardensRes = await api.get('/api/gardens');
        setGardens(gardensRes.data.features || []);
        setPendingLocation(null);
        setRegisterMode(false);
        setGardenSuccess(true);
        setTimeout(() => setGardenSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to register garden:', err);
      alert('Failed to register garden. Please try again.');
    }
  };

  const toggleWildlife = (id: string) => setWildlifeFilters(p => p.map(l => l.id === id ? {...l, visible: !l.visible} : l));

  const filterByYear = (features: Feature[], yearRange: [number, number]) => {
    return features.filter(f => {
      const props = f.properties || {};
      const year = props.year;
      const month = props.month;
      if (year && (year < yearRange[0] || year > yearRange[1])) return false;
      if (selectedSeason) {
        const season = SEASONS.find(s => s.id === selectedSeason);
        if (season && month && !season.months.includes(month)) return false;
      }
      const taxon = props.iconic_taxon;
      const filter = wildlifeFilters.find(w => w.id === taxon);
      if (filter && !filter.visible) return false;
      return true;
    });
  };

  const filterAll = (features: Feature[]) => {
    return features.filter(f => {
      const props = f.properties || {};
      const year = props.year;
      const month = props.month;
      if (selectedYear && year !== selectedYear) return false;
      // Species filter
      if (selectedSpecies) {
        const name = (props.species || props.common_name || '').toLowerCase();
        if (name !== selectedSpecies) return false;
      }
      if (selectedSeason) {
        const season = SEASONS.find(s => s.id === selectedSeason);
        if (season && month && !season.months.includes(month)) return false;
      }
      const taxon = props.iconic_taxon;
      const filter = wildlifeFilters.find(w => w.id === taxon);
      if (filter && !filter.visible) return false;
      return true;
    });
  };

  const leftFeatures = useMemo(() => {
    if (compareMode) return filterByYear(wildlifeFeatures, leftYearRange);
    return filterAll(wildlifeFeatures);
  }, [wildlifeFeatures, leftYearRange, compareMode, selectedYear, selectedSeason, wildlifeFilters]);
  
  const rightFeatures = useMemo(() => {
    if (compareMode) return filterByYear(wildlifeFeatures, rightYearRange);
    return [];
  }, [wildlifeFeatures, rightYearRange, compareMode, selectedSeason, wildlifeFilters]);

  const visibleFeatures = compareMode ? leftFeatures : leftFeatures;
  const gridCells = useMemo(() => createGrid(visibleFeatures), [visibleFeatures]);
  
  // Available cities from opportunity data
  const availableCities = useMemo(() => {
    if (!opportunityData?.features) return [];
    const cities = new Set<string>();
    opportunityData.features.forEach((f: any) => {
      if (f.properties?.nearest_location) cities.add(f.properties.nearest_location);
    });
    return Array.from(cities).sort();
  }, [opportunityData]);

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

  // Filter handlers for FilterPanel
  const handleFilterChange = (key: string, value: any) => {
    switch (key) {
      case 'taxa':
        setWildlifeFilters(prev => prev.map(f => ({ ...f, visible: value[f.id] ?? f.visible })));
        break;
      case 'selectedYear': setSelectedYear(value); break;
      case 'selectedSeason': setSelectedSeason(value); break;
      case 'selectedSpecies': setSelectedSpecies(value); break;
      case 'selectedCity': setSelectedCity(value); break;
      case 'showOpportunityZones': setShowOpportunityZones(value); break;
      case 'showGardens': setShowGardens(value); break;
      case 'minConnectivity': setMinConnectivity(value); break;
      case 'minObservations': setMinObservations(value); break;
    }
  };

  const handleClearAllFilters = () => {
    setWildlifeFilters(WILDLIFE_FILTERS);
    setSelectedYear(null);
    setSelectedSeason(null);
    setSelectedSpecies(null);
    setSelectedCity(null);
  };

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'relative' }} onMouseMove={handleMouseMove} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
      
      {/* Left map */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', clipPath: compareMode ? `inset(0 ${100 - sliderPosition}% 0 0)` : 'none' }}>
        <MapGL 
          {...viewState} 
          onMove={e => setViewState(e.viewState)} 
          onClick={handleMapClick}
          mapStyle="mapbox://styles/mapbox/light-v11" 
          mapboxAccessToken={MAPBOX_TOKEN} 
          style={{ width: '100%', height: '100%', cursor: registerMode ? 'crosshair' : 'grab' }}
        >
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

          {/* Garden markers */}
          {showGardens && !compareMode && gardens.map((g, i) => (
            <Marker 
              key={g.properties.id || i} 
              latitude={g.geometry.coordinates[1]} 
              longitude={g.geometry.coordinates[0]}
              onClick={e => { e.originalEvent.stopPropagation(); setSelectedGarden(g); }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16
              }}>
                🌻
              </div>
            </Marker>
          ))}

          {/* Pending location marker */}
          {pendingLocation && (
            <Marker latitude={pendingLocation.lat} longitude={pendingLocation.lng}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1s infinite',
                fontSize: 20
              }}>
                📍
              </div>
            </Marker>
          )}

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

          {/* Garden popup */}
          {selectedGarden && (
            <Popup 
              latitude={selectedGarden.geometry.coordinates[1]} 
              longitude={selectedGarden.geometry.coordinates[0]} 
              onClose={() => setSelectedGarden(null)} 
              anchor="bottom" 
              maxWidth="280px"
            >
              <div style={{ padding: 8 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flower2 size={16} color="#22c55e" />
                  {selectedGarden.properties.name}
                </h3>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                  {selectedGarden.properties.size} garden
                </div>
                {selectedGarden.properties.plants?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: '#888' }}>Plants:</div>
                    <div style={{ fontSize: 11 }}>{selectedGarden.properties.plants.join(', ')}</div>
                  </div>
                )}
                {selectedGarden.properties.features?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: '#888' }}>Features:</div>
                    <div style={{ fontSize: 11 }}>{selectedGarden.properties.features.join(', ')}</div>
                  </div>
                )}
              </div>
            </Popup>
          )}
        </MapGL>
      </div>

      {/* Right map */}
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

      {/* Compare labels */}
      {compareMode && (
        <>
          <div style={{ position: 'absolute', top: 100, left: `${sliderPosition / 2}%`, transform: 'translateX(-50%)', backgroundColor: 'rgba(59,130,246,0.95)', color: 'white', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 18, zIndex: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', textAlign: 'center', minWidth: 140 }}>
            {leftYearRange[0]} - {leftYearRange[1]}
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 400 }}>{leftFeatures.length.toLocaleString()} obs</div>
          </div>
          <div style={{ position: 'absolute', top: 100, left: `${sliderPosition + (100 - sliderPosition) / 2}%`, transform: 'translateX(-50%)', backgroundColor: 'rgba(234,88,12,0.95)', color: 'white', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 18, zIndex: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', textAlign: 'center', minWidth: 140 }}>
            {rightYearRange[0]} - {rightYearRange[1]}
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 400 }}>{rightFeatures.length.toLocaleString()} obs</div>
          </div>
        </>
      )}

      
      {/* Species Search - top center */}
      {!compareMode && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
          <SpeciesSearch
            features={wildlifeFeatures}
            onSelectSpecies={setSelectedSpecies}
            onFlyTo={handleFlyTo}
            selectedSpecies={selectedSpecies}
          />
        </div>
      )}

      {/* Register mode banner */}
      {registerMode && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#f59e0b',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          zIndex: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          📍 Click on the map to place your garden
          <button 
            onClick={() => setRegisterMode(false)}
            style={{ 
              padding: '4px 12px', 
              borderRadius: 6, 
              border: 'none', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              color: 'white', 
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Success message */}
      {gardenSuccess && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#22c55e',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          zIndex: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          🌻 Garden registered successfully! Thank you for supporting pollinators.
        </div>
      )}

      {/* Quick Download Button */}
      {!compareMode && (
        <button
          onClick={() => {
            const data = {
              type: 'FeatureCollection',
              generated: new Date().toISOString(),
              observations: leftFeatures.length,
              features: leftFeatures,
            };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `utah-pollinator-${leftFeatures.length}-obs.geojson`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 180,
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 200
          }}
        >
          <Download size={16} />
          Export
        </button>
      )}

      {/* Register Garden Button */}
      {!compareMode && !registerMode && (
        <button
          onClick={() => setRegisterMode(true)}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            backgroundColor: '#22c55e',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(34,197,94,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 200
          }}
        >
          <Plus size={18} />
          Register Garden
        </button>
      )}

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
        <span style={{ fontSize: 11, color: '#666' }}>📊 {wildlifeFeatures.length.toLocaleString()} obs</span>
        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>🌻 {gardens.length} gardens</span>
        {compareMode && <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 500 }}>🔀 Compare</span>}
      </div>

      {/* Garden Registration Modal */}
      {pendingLocation && (
        <GardenRegistration
          lat={pendingLocation.lat}
          lng={pendingLocation.lng}
          onSubmit={handleGardenSubmit}
          onCancel={() => { setPendingLocation(null); setRegisterMode(false); }}
        />
      )}

      {/* Unified Control Panel */}
      <UnifiedControlPanel
        wildlifeFilters={wildlifeFilters}
        gardens={gardens}
        opportunityData={opportunityData}
        wildlifeFeatures={wildlifeFeatures}
        filteredFeatures={leftFeatures}
        selectedYear={selectedYear}
        selectedSeason={selectedSeason}
        minYear={minYear}
        maxYear={maxYear}
        playing={playing}
        playSpeed={playSpeed}
        compareMode={compareMode}
        leftYearRange={leftYearRange}
        rightYearRange={rightYearRange}
        selectedSpecies={selectedSpecies}
        selectedCity={selectedCity}
        showOpportunityZones={showOpportunityZones}
        showGardens={showGardens}
        viewMode={viewMode}
        onToggleTaxon={toggleWildlife}
        onSetYear={setSelectedYear}
        onSetSeason={setSelectedSeason}
        onSetPlaying={setPlaying}
        onSetPlaySpeed={setPlaySpeed}
        onSetCompareMode={setCompareMode}
        onSetLeftYearRange={setLeftYearRange}
        onSetRightYearRange={setRightYearRange}
        onSetSpecies={setSelectedSpecies}
        onSetCity={setSelectedCity}
        onSetShowOpportunityZones={setShowOpportunityZones}
        onSetShowGardens={setShowGardens}
        onSetViewMode={setViewMode}
        onClearAll={handleClearAllFilters}
      />
    </div>
  );
};

export default DiscoveryMap;
