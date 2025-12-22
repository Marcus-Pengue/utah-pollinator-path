import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MapGL, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import { Layers, Eye, EyeOff, Info, ChevronDown, ChevronUp, Clock, Thermometer, Grid3X3 } from 'lucide-react';
import { api } from '../api/client';
import ClimatePanel from './ClimatePanel';
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
  { id: 'parks', name: 'Parks & Green Spaces', icon: '🌳', color: '#16a34a', visible: true },
  { id: 'nurseries', name: 'Native Plant Nurseries', icon: '🪴', color: '#84cc16', visible: true },
  { id: 'waystations', name: 'Monarch Waystations', icon: '🦋', color: '#f97316', visible: true },
  { id: 'bee_cities', name: 'Bee City Communities', icon: '🐝', color: '#eab308', visible: true },
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
  { lat: 40.570, lng: -111.895, name: 'South Jordan' },
  { lat: 40.850, lng: -111.900, name: 'North SLC' },
  { lat: 40.666, lng: -111.750, name: 'Cottonwood' },
  { lat: 40.666, lng: -112.050, name: 'West Valley' },
];

const GRID_SIZE = 0.009; // ~1km

function createGrid(features: Feature[], gridSize: number): GridCell[] {
  const cellMap: Record<string, GridCell> = {};
  
  features.forEach(f => {
    const lat = f.geometry.coordinates[1];
    const lng = f.geometry.coordinates[0];
    const gridLat = Math.floor(lat / gridSize) * gridSize + gridSize / 2;
    const gridLng = Math.floor(lng / gridSize) * gridSize + gridSize / 2;
    const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
    
    if (cellMap[key]) {
      cellMap[key].count++;
      cellMap[key].features.push(f);
    } else {
      cellMap[key] = { lat: gridLat, lng: gridLng, count: 1, percentile: 0, features: [f] };
    }
  });
  
  // Calculate relative percentiles
  const cells = Object.values(cellMap);
  const counts = cells.map(c => c.count).sort((a, b) => a - b);
  
  cells.forEach(cell => {
    const rank = counts.filter(c => c <= cell.count).length;
    cell.percentile = rank / counts.length;
  });
  
  return cells;
}

function getGridColor(percentile: number): string {
  if (percentile >= 0.95) return '#dc2626'; // top 5%
  if (percentile >= 0.85) return '#ea580c'; // top 15%
  if (percentile >= 0.70) return '#f59e0b'; // top 30%
  if (percentile >= 0.50) return '#84cc16'; // top 50%
  if (percentile >= 0.25) return '#22c55e'; // top 75%
  return '#86efac'; // bottom 25%
}

const DiscoveryMap: React.FC = () => {
  const [viewState, setViewState] = useState({
    latitude: 40.666,
    longitude: -111.897,
    zoom: 10
  });
  
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [wildlifeFilters, setWildlifeFilters] = useState(WILDLIFE_FILTERS);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [wildlifeFeatures, setWildlifeFeatures] = useState<Feature[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [monarchStatus, setMonarchStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [climatePanelOpen, setClimatePanelOpen] = useState(false);
  const [daysBack, setDaysBack] = useState(90);
  const [viewMode, setViewMode] = useState<'grid' | 'points'>('grid');

  const fetchData = useCallback(async () => {
    try {
      const visibleLayers = layers.filter(l => l.visible).map(l => l.id).join(',');
      const [mapRes, monarchRes] = await Promise.all([
        api.get('/api/map/unified', { params: { layers: visibleLayers } }),
        api.get('/api/map/monarch-status')
      ]);
      setFeatures(mapRes.data.features || []);
      setMonarchStatus(monarchRes.data);
    } catch (err) {
      console.error('Map data error:', err);
    }
  }, [layers]);

  const fetchWildlifeData = useCallback(async () => {
    setLoading(true);
    const allFeatures: Feature[] = [];
    const seenIds = new Set<string>();
    
    for (let i = 0; i < QUERY_POINTS.length; i++) {
      const point = QUERY_POINTS[i];
      setLoadingProgress(`${point.name} (${i + 1}/${QUERY_POINTS.length})`);
      
      try {
        const res = await api.get('/api/wildlife/unified', {
          params: { lat: point.lat, lng: point.lng, radius: 40, taxon: 'all', days: daysBack }
        });
        
        (res.data.features || []).forEach((f: Feature) => {
          const id = f.properties.id || `${f.geometry.coordinates[0].toFixed(5)}-${f.geometry.coordinates[1].toFixed(5)}`;
          if (!seenIds.has(String(id))) {
            seenIds.add(String(id));
            allFeatures.push(f);
          }
        });
        
        setWildlifeFeatures([...allFeatures]);
      } catch (err) {
        console.error(`Error ${point.name}:`, err);
      }
    }
    
    setLoading(false);
    setLoadingProgress('');
  }, [daysBack]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchWildlifeData(); }, [fetchWildlifeData]);

  const toggleLayer = (id: string) => setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  const toggleWildlifeFilter = (id: string) => setWildlifeFilters(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));

  const isFeatureVisible = (feature: Feature): boolean => {
    const source = feature.properties.source;
    const taxon = feature.properties.iconic_taxon;
    if (source === 'inaturalist' || source === 'gbif') {
      return wildlifeFilters.find(f => f.id === taxon)?.visible ?? true;
    }
    return layers.find(l => l.id === feature.properties.layer)?.visible ?? false;
  };

  const getMarkerIcon = (feature: Feature): string => {
    const filter = WILDLIFE_FILTERS.find(f => f.id === feature.properties.iconic_taxon);
    if (filter) return filter.icon;
    return layers.find(l => l.id === feature.properties.layer)?.icon || '📍';
  };

  const allFeatures = [...features, ...wildlifeFeatures];
  const visibleFeatures = allFeatures.filter(isFeatureVisible);
  const gridCells = useMemo(() => createGrid(visibleFeatures, GRID_SIZE), [visibleFeatures]);

  const taxonStats = useMemo(() => {
    const stats: Record<string, number> = {};
    wildlifeFeatures.forEach(f => {
      const taxon = f.properties.iconic_taxon || 'Other';
      stats[taxon] = (stats[taxon] || 0) + 1;
    });
    return stats;
  }, [wildlifeFeatures]);

  const heatmapData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: visibleFeatures.map(f => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: f.geometry.coordinates },
      properties: { mag: 1 }
    }))
  }), [visibleFeatures]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <MapGL
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        
        {/* Heatmap */}
        {viewMode === 'grid' && (
          <Source id="heatmap" type="geojson" data={heatmapData}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': 1,
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 15, 2],
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(0,255,0,0)',
                  0.2, 'rgba(134,239,172,0.4)',
                  0.4, 'rgba(34,197,94,0.5)',
                  0.6, 'rgba(250,204,21,0.6)',
                  0.8, 'rgba(249,115,22,0.7)',
                  1, 'rgba(220,38,38,0.8)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 20, 13, 30],
                'heatmap-opacity': 0.7,
              }}
            />
          </Source>
        )}
        
        {/* Grid cells at higher zoom */}
        {viewMode === 'grid' && viewState.zoom >= 11 && gridCells.map((cell, idx) => (
          <Marker
            key={`grid-${idx}`}
            latitude={cell.lat}
            longitude={cell.lng}
            onClick={(e: any) => { e.originalEvent.stopPropagation(); setSelectedCell(cell); }}
          >
            <div style={{
              minWidth: 24, padding: '2px 6px', borderRadius: 4,
              backgroundColor: getGridColor(cell.percentile),
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              fontSize: 11, fontWeight: 600,
              color: cell.percentile >= 0.5 ? 'white' : '#1a1a1a',
              cursor: 'pointer', textAlign: 'center',
            }}>
              {cell.count}
            </div>
          </Marker>
        ))}

        {/* Individual points */}
        {viewMode === 'points' && viewState.zoom >= 11 && visibleFeatures.slice(0, 500).map((feature, idx) => (
          <Marker
            key={`pt-${feature.properties.id || idx}`}
            latitude={feature.geometry.coordinates[1]}
            longitude={feature.geometry.coordinates[0]}
            onClick={(e: any) => { e.originalEvent.stopPropagation(); setSelectedFeature(feature); }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              backgroundColor: WILDLIFE_FILTERS.find(f => f.id === feature.properties.iconic_taxon)?.color || '#666',
              border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, cursor: 'pointer',
            }}>
              {getMarkerIcon(feature)}
            </div>
          </Marker>
        ))}

        {/* Grid Popup */}
        {selectedCell && (
          <Popup latitude={selectedCell.lat} longitude={selectedCell.lng}
            onClose={() => setSelectedCell(null)} closeButton anchor="bottom" maxWidth="300px">
            <div style={{ padding: 4, maxHeight: 250, overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>
                {selectedCell.count} observations
                <span style={{ fontSize: 11, color: '#666', fontWeight: 400 }}> (top {Math.round((1-selectedCell.percentile)*100)}%)</span>
              </h3>
              {Object.entries(
                selectedCell.features.reduce((acc: Record<string, number>, f) => {
                  const t = f.properties.iconic_taxon || 'Other';
                  acc[t] = (acc[t] || 0) + 1;
                  return acc;
                }, {})
              ).sort((a, b) => b[1] - a[1]).map(([taxon, count]) => {
                const filter = WILDLIFE_FILTERS.find(f => f.id === taxon);
                return (
                  <div key={taxon} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 2 }}>
                    <span>{filter?.icon || '📍'}</span>
                    <span style={{ flex: 1 }}>{filter?.name || taxon}</span>
                    <span style={{ fontWeight: 500 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </Popup>
        )}

        {/* Feature Popup */}
        {selectedFeature && (
          <Popup latitude={selectedFeature.geometry.coordinates[1]} longitude={selectedFeature.geometry.coordinates[0]}
            onClose={() => setSelectedFeature(null)} closeButton anchor="bottom" maxWidth="280px">
            <div style={{ padding: 4 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>
                {selectedFeature.properties.species || 'Unknown'}
              </h3>
              {selectedFeature.properties.photo_url && (
                <img src={selectedFeature.properties.photo_url} alt="" style={{ width: '100%', borderRadius: 6, margin: '6px 0' }} />
              )}
              {selectedFeature.properties.observed_on && (
                <p style={{ margin: 2, fontSize: 11, color: '#666' }}>📅 {selectedFeature.properties.observed_on}</p>
              )}
              {selectedFeature.properties.url && (
                <a href={selectedFeature.properties.url} target="_blank" rel="noopener noreferrer"
                   style={{ fontSize: 11, color: '#2563eb' }}>View on iNaturalist →</a>
              )}
            </div>
          </Popup>
        )}
      </MapGL>

      {/* Layer Panel */}
      <div style={{
        position: 'absolute', top: 16, left: 16, backgroundColor: 'white', borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: 250, maxHeight: 'calc(100vh - 120px)', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setLayerPanelOpen(!layerPanelOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} /><span style={{ fontWeight: 600, fontSize: 14 }}>Layers</span>
          </div>
          {layerPanelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {layerPanelOpen && (
          <div style={{ overflowY: 'auto', padding: 10, maxHeight: 'calc(100vh - 200px)' }}>
            {/* View Toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              <button onClick={() => setViewMode('grid')} style={{
                flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none',
                backgroundColor: viewMode === 'grid' ? '#22c55e' : '#f3f4f6',
                color: viewMode === 'grid' ? 'white' : '#666', cursor: 'pointer', fontSize: 11, fontWeight: 500,
              }}><Grid3X3 size={12} style={{ marginRight: 4 }} />Grid</button>
              <button onClick={() => setViewMode('points')} style={{
                flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none',
                backgroundColor: viewMode === 'points' ? '#22c55e' : '#f3f4f6',
                color: viewMode === 'points' ? 'white' : '#666', cursor: 'pointer', fontSize: 11, fontWeight: 500,
              }}>📍 Points</button>
            </div>

            <h4 style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>MAP LAYERS</h4>
            {layers.map(layer => (
              <div key={layer.id} onClick={() => toggleLayer(layer.id)} style={{
                display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                backgroundColor: layer.visible ? `${layer.color}15` : 'transparent', marginBottom: 2,
              }}>
                <span style={{ fontSize: 13, marginRight: 8 }}>{layer.icon}</span>
                <span style={{ flex: 1, fontSize: 11 }}>{layer.name}</span>
                {layer.visible ? <Eye size={13} color={layer.color} /> : <EyeOff size={13} color="#ccc" />}
              </div>
            ))}

            <h4 style={{ fontSize: 10, color: '#888', margin: '10px 0 6px' }}>WILDLIFE ({wildlifeFeatures.length.toLocaleString()})</h4>
            {wildlifeFilters.map(filter => (
              <div key={filter.id} onClick={() => toggleWildlifeFilter(filter.id)} style={{
                display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                backgroundColor: filter.visible ? `${filter.color}15` : 'transparent', marginBottom: 2,
              }}>
                <span style={{ fontSize: 12, marginRight: 6 }}>{filter.icon}</span>
                <span style={{ flex: 1, fontSize: 11 }}>{filter.name}</span>
                <span style={{ fontSize: 10, color: '#999', marginRight: 4 }}>{taxonStats[filter.id] || 0}</span>
                {filter.visible ? <Eye size={12} color={filter.color} /> : <EyeOff size={12} color="#ccc" />}
              </div>
            ))}

            {/* Legend */}
            <div style={{ marginTop: 10, padding: 8, backgroundColor: '#f9fafb', borderRadius: 6 }}>
              <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>RELATIVE DENSITY</div>
              <div style={{ display: 'flex', gap: 2 }}>
                {['#86efac', '#22c55e', '#84cc16', '#f59e0b', '#ea580c', '#dc2626'].map((c, i) => (
                  <div key={c} style={{ flex: 1, height: 6, backgroundColor: c, borderRadius: 1 }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#999', marginTop: 2 }}>
                <span>Low</span><span>High</span>
              </div>
            </div>

            <div style={{ marginTop: 10, padding: 8, backgroundColor: '#f3f4f6', borderRadius: 6, fontSize: 11 }}>
              📍 <strong>{visibleFeatures.length.toLocaleString()}</strong> visible
              {loading && <div style={{ color: '#666', marginTop: 2 }}>{loadingProgress}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'white', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: 260, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setInfoPanelOpen(!infoPanelOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} /><span style={{ fontWeight: 600, fontSize: 14 }}>Utah Pollinator Path</span>
          </div>
          {infoPanelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        {infoPanelOpen && (
          <div style={{ padding: 12 }}>
            {monarchStatus && (
              <div style={{ padding: 10, backgroundColor: '#fef3c7', borderRadius: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🦋</span>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>Monarch: {monarchStatus.status}</span>
                </div>
                <p style={{ fontSize: 11, margin: '4px 0 0', color: '#92400e' }}>{monarchStatus.utah_note}</p>
              </div>
            )}
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div>🌳 <strong>{features.filter(f => f.properties.layer === 'parks').length}</strong> parks</div>
              <div>🦋 <strong>{features.filter(f => f.properties.layer === 'waystations').length}</strong> waystations</div>
              <div>📸 <strong>{wildlifeFeatures.length.toLocaleString()}</strong> observations</div>
            </div>
          </div>
        )}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: climatePanelOpen ? '#f0f9ff' : 'white' }}
          onClick={() => setClimatePanelOpen(!climatePanelOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Thermometer size={16} color="#2563eb" /><span style={{ fontWeight: 500, fontSize: 12 }}>Climate</span>
          </div>
          {climatePanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
        {climatePanelOpen && <ClimatePanel lat={viewState.latitude} lng={viewState.longitude} />}
      </div>

      {/* Time Filter */}
      <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '6px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', display: 'flex', gap: 4, alignItems: 'center' }}>
        <Clock size={12} color="#666" />
        {[{ label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: '1yr', days: 365 }, { label: 'All', days: 1825 }].map(p => (
          <button key={p.days} onClick={() => setDaysBack(p.days)} style={{
            padding: '3px 8px', borderRadius: 4, border: 'none',
            backgroundColor: daysBack === p.days ? '#22c55e' : '#f0f0f0',
            color: daysBack === p.days ? 'white' : '#555', cursor: 'pointer', fontSize: 10, fontWeight: 500,
          }}>{p.label}</button>
        ))}
      </div>

      {/* Title */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '6px 18px', borderRadius: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', fontSize: 13, fontWeight: 500 }}>
        🐝 Utah Pollinator Path
      </div>
    </div>
  );
};

export default DiscoveryMap;
