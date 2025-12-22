import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
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

// Grid size in degrees (~1km at this latitude)
const GRID_SIZE = 0.009; // ~1km

function createGrid(features: Feature[], gridSize: number): GridCell[] {
  const cells: Map<string, GridCell> = new Map();
  
  features.forEach(f => {
    const lat = f.geometry.coordinates[1];
    const lng = f.geometry.coordinates[0];
    
    // Snap to grid
    const gridLat = Math.floor(lat / gridSize) * gridSize + gridSize / 2;
    const gridLng = Math.floor(lng / gridSize) * gridSize + gridSize / 2;
    const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
    
    if (cells.has(key)) {
      const cell = cells.get(key)!;
      cell.count++;
      cell.features.push(f);
    } else {
      cells.set(key, {
        lat: gridLat,
        lng: gridLng,
        count: 1,
        features: [f],
      });
    }
  });
  
  return Array.from(cells.values());
}

function getGridColor(count: number): string {
  if (count >= 50) return '#dc2626'; // red
  if (count >= 30) return '#ea580c'; // orange
  if (count >= 20) return '#f59e0b'; // amber
  if (count >= 10) return '#84cc16'; // lime
  if (count >= 5) return '#22c55e';  // green
  return '#86efac'; // light green
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
      console.error('Failed to fetch map data:', err);
    }
  }, [layers]);

  const fetchWildlifeData = useCallback(async () => {
    setLoading(true);
    const allFeatures: Feature[] = [];
    const seenIds = new Set<string>();
    
    for (let i = 0; i < QUERY_POINTS.length; i++) {
      const point = QUERY_POINTS[i];
      setLoadingProgress(`Loading ${point.name}... (${i + 1}/${QUERY_POINTS.length})`);
      
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
        console.error(`Failed to fetch ${point.name}:`, err);
      }
    }
    
    setLoading(false);
    setLoadingProgress('');
  }, [daysBack]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchWildlifeData(); }, [fetchWildlifeData]);

  const toggleLayer = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const toggleWildlifeFilter = (id: string) => {
    setWildlifeFilters(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const isFeatureVisible = (feature: Feature): boolean => {
    const source = feature.properties.source;
    const taxon = feature.properties.iconic_taxon;
    
    if (source === 'inaturalist' || source === 'gbif') {
      const filter = wildlifeFilters.find(f => f.id === taxon);
      return filter?.visible ?? true;
    }
    
    const layer = feature.properties.layer;
    return layers.find(l => l.id === layer)?.visible ?? false;
  };

  const getMarkerIcon = (feature: Feature): string => {
    const taxon = feature.properties.iconic_taxon;
    const filter = WILDLIFE_FILTERS.find(f => f.id === taxon);
    if (filter) return filter.icon;
    const layer = feature.properties.layer;
    const layerConfig = layers.find(l => l.id === layer);
    return layerConfig?.icon || '📍';
  };

  const allFeatures = [...features, ...wildlifeFeatures];
  const visibleFeatures = allFeatures.filter(isFeatureVisible);

  // Create grid from visible features
  const gridCells = useMemo(() => {
    return createGrid(visibleFeatures, GRID_SIZE);
  }, [visibleFeatures]);

  // Stats by taxon
  const taxonStats = useMemo(() => {
    const stats: Record<string, number> = {};
    wildlifeFeatures.forEach(f => {
      const taxon = f.properties.iconic_taxon || 'Other';
      stats[taxon] = (stats[taxon] || 0) + 1;
    });
    return stats;
  }, [wildlifeFeatures]);

  // GeoJSON for heatmap
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
      <Map
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        
        {/* Heatmap layer */}
        {viewMode === 'grid' && (
          <Source id="heatmap-source" type="geojson" data={heatmapData}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': 1,
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 1, 15, 3],
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(0, 255, 0, 0)',
                  0.1, 'rgba(134, 239, 172, 0.4)',
                  0.3, 'rgba(34, 197, 94, 0.6)',
                  0.5, 'rgba(132, 204, 22, 0.7)',
                  0.7, 'rgba(245, 158, 11, 0.8)',
                  0.9, 'rgba(234, 88, 12, 0.9)',
                  1, 'rgba(220, 38, 38, 1)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 15, 12, 25, 15, 35],
                'heatmap-opacity': 0.8,
              }}
            />
          </Source>
        )}
        
        {/* Grid cells overlay */}
        {viewMode === 'grid' && viewState.zoom >= 11 && gridCells.map((cell, idx) => (
          <Marker
            key={`grid-${idx}`}
            latitude={cell.lat}
            longitude={cell.lng}
            onClick={(e: any) => { e.originalEvent.stopPropagation(); setSelectedCell(cell); }}
          >
            <div
              style={{
                width: Math.max(24, Math.min(50, 20 + cell.count)),
                height: Math.max(24, Math.min(50, 20 + cell.count)),
                borderRadius: 4,
                backgroundColor: getGridColor(cell.count),
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: cell.count >= 100 ? 10 : 11,
                fontWeight: 600,
                color: cell.count >= 20 ? 'white' : '#1a1a1a',
                cursor: 'pointer',
              }}
            >
              {cell.count}
            </div>
          </Marker>
        ))}

        {/* Individual points mode */}
        {viewMode === 'points' && viewState.zoom >= 12 && visibleFeatures.slice(0, 500).map((feature, idx) => (
          <Marker
            key={`point-${feature.properties.id || idx}`}
            latitude={feature.geometry.coordinates[1]}
            longitude={feature.geometry.coordinates[0]}
            onClick={(e: any) => { e.originalEvent.stopPropagation(); setSelectedFeature(feature); }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              backgroundColor: WILDLIFE_FILTERS.find(f => f.id === feature.properties.iconic_taxon)?.color || '#6b7280',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, cursor: 'pointer',
            }}>
              {getMarkerIcon(feature)}
            </div>
          </Marker>
        ))}

        {/* Grid Cell Popup */}
        {selectedCell && (
          <Popup
            latitude={selectedCell.lat}
            longitude={selectedCell.lng}
            onClose={() => setSelectedCell(null)}
            closeButton closeOnClick={false} anchor="bottom" maxWidth="320px"
          >
            <div style={{ padding: 4, maxHeight: 300, overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>
                📍 {selectedCell.count} observations in this area
              </h3>
              
              {/* Taxon breakdown */}
              <div style={{ marginBottom: 10 }}>
                {Object.entries(
                  selectedCell.features.reduce((acc: Record<string, number>, f) => {
                    const taxon = f.properties.iconic_taxon || 'Other';
                    acc[taxon] = (acc[taxon] || 0) + 1;
                    return acc;
                  }, {})
                ).sort((a, b) => b[1] - a[1]).map(([taxon, count]) => {
                  const filter = WILDLIFE_FILTERS.find(f => f.id === taxon);
                  return (
                    <div key={taxon} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 3 }}>
                      <span>{filter?.icon || '📍'}</span>
                      <span style={{ flex: 1 }}>{filter?.name || taxon}</span>
                      <span style={{ fontWeight: 500 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Recent observations */}
              <h4 style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Recent observations:</h4>
              {selectedCell.features.slice(0, 5).map((f, i) => (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, 
                  padding: '4px 0', borderBottom: i < 4 ? '1px solid #eee' : 'none',
                  fontSize: 11
                }}>
                  {f.properties.photo_url && (
                    <img src={f.properties.photo_url} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.properties.species || 'Unknown'}
                    </div>
                    <div style={{ color: '#999', fontSize: 10 }}>{f.properties.observed_on}</div>
                  </div>
                </div>
              ))}
              
              {selectedCell.count > 5 && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
                  +{selectedCell.count - 5} more observations
                </div>
              )}
            </div>
          </Popup>
        )}

        {/* Single Feature Popup */}
        {selectedFeature && (
          <Popup
            latitude={selectedFeature.geometry.coordinates[1]}
            longitude={selectedFeature.geometry.coordinates[0]}
            onClose={() => setSelectedFeature(null)}
            closeButton closeOnClick={false} anchor="bottom" maxWidth="300px"
          >
            <div style={{ padding: 4 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600 }}>
                {selectedFeature.properties.species || 'Unknown'}
              </h3>
              {selectedFeature.properties.scientific_name && (
                <p style={{ margin: '0 0 6px', fontSize: 12, fontStyle: 'italic', color: '#666' }}>
                  {selectedFeature.properties.scientific_name}
                </p>
              )}
              {selectedFeature.properties.photo_url && (
                <img src={selectedFeature.properties.photo_url} alt="" style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />
              )}
              {selectedFeature.properties.observed_on && (
                <p style={{ margin: '3px 0', fontSize: 11, color: '#666' }}>📅 {selectedFeature.properties.observed_on}</p>
              )}
              {selectedFeature.properties.url && (
                <a href={selectedFeature.properties.url} target="_blank" rel="noopener noreferrer" 
                   style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#2563eb' }}>
                  View on iNaturalist →
                </a>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Layer Panel */}
      <div style={{
        position: 'absolute', top: 16, left: 16, backgroundColor: 'white', borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: 260, maxHeight: 'calc(100vh - 120px)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
        }} onClick={() => setLayerPanelOpen(!layerPanelOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Layers & Filters</span>
          </div>
          {layerPanelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {layerPanelOpen && (
          <div style={{ overflowY: 'auto', padding: 10 }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none',
                  backgroundColor: viewMode === 'grid' ? '#22c55e' : '#f3f4f6',
                  color: viewMode === 'grid' ? 'white' : '#666',
                  cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                }}
              >
                <Grid3X3 size={14} /> Grid
              </button>
              <button
                onClick={() => setViewMode('points')}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none',
                  backgroundColor: viewMode === 'points' ? '#22c55e' : '#f3f4f6',
                  color: viewMode === 'points' ? 'white' : '#666',
                  cursor: 'pointer', fontSize: 11, fontWeight: 500,
                }}
              >
                📍 Points
              </button>
            </div>
          
            {/* Map Layers */}
            <h4 style={{ fontSize: 10, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Map Layers</h4>
            {layers.map(layer => (
              <div key={layer.id} style={{
                display: 'flex', alignItems: 'center', padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                backgroundColor: layer.visible ? `${layer.color}18` : 'transparent', marginBottom: 2,
              }} onClick={() => toggleLayer(layer.id)}>
                <span style={{ fontSize: 14, marginRight: 8 }}>{layer.icon}</span>
                <span style={{ flex: 1, fontSize: 12 }}>{layer.name}</span>
                {layer.visible ? <Eye size={14} color={layer.color} /> : <EyeOff size={14} color="#bbb" />}
              </div>
            ))}

            {/* Wildlife Filters */}
            <h4 style={{ fontSize: 10, color: '#6b7280', margin: '12px 0 6px', textTransform: 'uppercase' }}>
              Wildlife ({wildlifeFeatures.length.toLocaleString()})
            </h4>
            {wildlifeFilters.map(filter => (
              <div key={filter.id} style={{
                display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                backgroundColor: filter.visible ? `${filter.color}18` : 'transparent', marginBottom: 2,
              }} onClick={() => toggleWildlifeFilter(filter.id)}>
                <span style={{ fontSize: 13, marginRight: 8 }}>{filter.icon}</span>
                <span style={{ flex: 1, fontSize: 11 }}>{filter.name}</span>
                <span style={{ fontSize: 10, color: '#999', marginRight: 6 }}>{taxonStats[filter.id] || 0}</span>
                {filter.visible ? <Eye size={13} color={filter.color} /> : <EyeOff size={13} color="#bbb" />}
              </div>
            ))}

            {/* Legend */}
            {viewMode === 'grid' && (
              <div style={{ marginTop: 12, padding: 10, backgroundColor: '#f9fafb', borderRadius: 6 }}>
                <h4 style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>DENSITY</h4>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[
                    { color: '#86efac', label: '1-4' },
                    { color: '#22c55e', label: '5-9' },
                    { color: '#84cc16', label: '10-19' },
                    { color: '#f59e0b', label: '20-29' },
                    { color: '#ea580c', label: '30-49' },
                    { color: '#dc2626', label: '50+' },
                  ].map(l => (
                    <div key={l.color} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: '100%', height: 8, backgroundColor: l.color, borderRadius: 2 }} />
                      <div style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{l.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{ marginTop: 12, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 6, fontSize: 11 }}>
              📍 <strong>{visibleFeatures.length.toLocaleString()}</strong> observations
              {viewMode === 'grid' && <span> in <strong>{gridCells.length}</strong> cells</span>}
              {loading && <div style={{ color: '#666', marginTop: 4 }}>{loadingProgress || 'Loading...'}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div style={{
        position: 'absolute', top: 16, right: 16, backgroundColor: 'white', borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: 280, overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
        }} onClick={() => setInfoPanelOpen(!infoPanelOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Utah Pollinator Path</span>
          </div>
          {infoPanelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {infoPanelOpen && (
          <div style={{ padding: 12 }}>
            {monarchStatus && (
              <div style={{ padding: 10, backgroundColor: '#fef3c7', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>🦋</span>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>Monarch Status</span>
                </div>
                <p style={{ fontSize: 11, margin: 0, color: '#92400e' }}>{monarchStatus.utah_note}</p>
              </div>
            )}
            
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              <div>🌳 <strong>{features.filter(f => f.properties.layer === 'parks').length}</strong> parks</div>
              <div>🦋 <strong>{features.filter(f => f.properties.layer === 'waystations').length}</strong> waystations</div>
              <div>📸 <strong>{wildlifeFeatures.length.toLocaleString()}</strong> wildlife observations</div>
            </div>
          </div>
        )}
        
        {/* Climate Panel Toggle */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          backgroundColor: climatePanelOpen ? '#f0f9ff' : 'white',
        }} onClick={() => setClimatePanelOpen(!climatePanelOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Thermometer size={16} color="#2563eb" />
            <span style={{ fontWeight: 500, fontSize: 13 }}>Climate Data</span>
          </div>
          {climatePanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        
        {climatePanelOpen && (
          <ClimatePanel lat={viewState.latitude} lng={viewState.longitude} />
        )}
      </div>

      {/* Time Filter */}
      <div style={{
        position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)',
        backgroundColor: 'white', padding: '8px 14px', borderRadius: 10,
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        <Clock size={14} color="#666" />
        {[
          { label: '30d', days: 30 },
          { label: '90d', days: 90 },
          { label: '1yr', days: 365 },
          { label: 'All', days: 1825 },
        ].map(p => (
          <button
            key={p.days}
            onClick={() => setDaysBack(p.days)}
            style={{
              padding: '4px 10px', borderRadius: 5, border: 'none',
              backgroundColor: daysBack === p.days ? '#22c55e' : '#f0f0f0',
              color: daysBack === p.days ? 'white' : '#444',
              cursor: 'pointer', fontSize: 11, fontWeight: 500,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        backgroundColor: 'white', padding: '8px 22px', borderRadius: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 14, fontWeight: 500,
      }}>
        🐝 Utah Pollinator Path
      </div>
    </div>
  );
};

export default DiscoveryMap;
