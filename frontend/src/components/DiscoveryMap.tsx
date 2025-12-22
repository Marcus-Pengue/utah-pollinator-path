import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import { Layers, Eye, EyeOff, Info, ChevronDown, ChevronUp, Clock, Thermometer } from 'lucide-react';
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
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [monarchStatus, setMonarchStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [climatePanelOpen, setClimatePanelOpen] = useState(false);
  const [daysBack, setDaysBack] = useState(90);

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

  const getMarkerColor = (feature: Feature): string => {
    const taxon = feature.properties.iconic_taxon;
    const filter = wildlifeFilters.find(f => f.id === taxon);
    if (filter) return filter.color;
    
    const layer = feature.properties.layer;
    const layerConfig = layers.find(l => l.id === layer);
    return layerConfig?.color || '#6b7280';
  };

  const getMarkerIcon = (feature: Feature): string => {
    const taxon = feature.properties.iconic_taxon;
    const filter = wildlifeFilters.find(f => f.id === taxon);
    if (filter) return filter.icon;
    
    const layer = feature.properties.layer;
    const layerConfig = layers.find(l => l.id === layer);
    return layerConfig?.icon || '📍';
  };

  const isFeatureVisible = (feature: Feature): boolean => {
    const source = feature.properties.source;
    const taxon = feature.properties.iconic_taxon;
    
    // Wildlife observations
    if (source === 'inaturalist' || source === 'gbif') {
      const filter = wildlifeFilters.find(f => f.id === taxon);
      return filter?.visible ?? true;
    }
    
    // Map layers
    const layer = feature.properties.layer;
    return layers.find(l => l.id === layer)?.visible ?? false;
  };

  const allFeatures = [...features, ...wildlifeFeatures];
  const visibleFeatures = allFeatures.filter(isFeatureVisible);

  // Stats by taxon
  const taxonStats = useMemo(() => {
    const stats: Record<string, number> = {};
    wildlifeFeatures.forEach(f => {
      const taxon = f.properties.iconic_taxon || 'Other';
      stats[taxon] = (stats[taxon] || 0) + 1;
    });
    return stats;
  }, [wildlifeFeatures]);

  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: visibleFeatures.map(f => ({
      type: 'Feature' as const,
      geometry: f.geometry,
      properties: { ...f.properties }
    }))
  }), [visibleFeatures]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['clusters']}
        onClick={(e: any) => {
          const features = e.features;
          if (features?.length > 0 && features[0].layer.id === 'clusters') {
            setViewState(prev => ({
              ...prev,
              latitude: features[0].geometry.coordinates[1],
              longitude: features[0].geometry.coordinates[0],
              zoom: prev.zoom + 2
            }));
          }
        }}
      >
        <NavigationControl position="bottom-right" />
        
        <Source
          id="wildlife"
          type="geojson"
          data={geojsonData}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer
            id="clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': ['step', ['get', 'point_count'], '#22c55e', 20, '#f59e0b', 100, '#ef4444'],
              'circle-radius': ['step', ['get', 'point_count'], 18, 20, 26, 100, 36],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff'
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 13
            }}
            paint={{ 'text-color': '#ffffff' }}
          />
        </Source>
        
        {viewState.zoom >= 12 && visibleFeatures.map((feature, idx) => (
          <Marker
            key={`marker-${feature.properties.id || idx}`}
            latitude={feature.geometry.coordinates[1]}
            longitude={feature.geometry.coordinates[0]}
            onClick={(e: any) => { e.originalEvent.stopPropagation(); setSelectedFeature(feature); }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              backgroundColor: getMarkerColor(feature),
              border: '2px solid white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, cursor: 'pointer',
            }}>
              {getMarkerIcon(feature)}
            </div>
          </Marker>
        ))}

        {selectedFeature && (
          <Popup
            latitude={selectedFeature.geometry.coordinates[1]}
            longitude={selectedFeature.geometry.coordinates[0]}
            onClose={() => setSelectedFeature(null)}
            closeButton closeOnClick={false} anchor="bottom" maxWidth="300px"
          >
            <div style={{ padding: 4 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600 }}>
                {selectedFeature.properties.name || selectedFeature.properties.species || 'Unknown'}
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
              {selectedFeature.properties.user && (
                <p style={{ margin: '3px 0', fontSize: 11, color: '#666' }}>👤 {selectedFeature.properties.user}</p>
              )}
              <p style={{ margin: '6px 0 0', fontSize: 10, color: '#999' }}>
                Source: {selectedFeature.properties.source || selectedFeature.properties.layer}
              </p>
              {selectedFeature.properties.url && (
                <a href={selectedFeature.properties.url} target="_blank" rel="noopener noreferrer" 
                   style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#2563eb' }}>
                  View details →
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

            {/* Stats */}
            <div style={{ marginTop: 12, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 6, fontSize: 11 }}>
              📍 <strong>{visibleFeatures.length.toLocaleString()}</strong> visible
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
