import React, { useState, useEffect, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { Layers, Eye, EyeOff, Info, ChevronDown, ChevronUp } from 'lucide-react';
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

const DEFAULT_LAYERS: LayerConfig[] = [
  { id: 'participation', name: 'Pollinator Gardens', icon: '🌻', color: '#22c55e', visible: true },
  { id: 'parks', name: 'Parks & Green Spaces', icon: '🌳', color: '#16a34a', visible: true },
  { id: 'nurseries', name: 'Native Plant Nurseries', icon: '🪴', color: '#84cc16', visible: true },
  { id: 'waystations', name: 'Monarch Waystations', icon: '🦋', color: '#f97316', visible: true },
  { id: 'bee_cities', name: 'Bee City Communities', icon: '🐝', color: '#eab308', visible: true },
  { id: 'priority', name: 'Priority Areas', icon: '📍', color: '#ef4444', visible: false },
];

const WILDLIFE_LAYERS: LayerConfig[] = [
  { id: 'inaturalist', name: 'iNaturalist', icon: '📸', color: '#74ac00', visible: true },
  { id: 'motus', name: 'Motus Stations', icon: '📡', color: '#9333ea', visible: true },
];

const DiscoveryMap: React.FC = () => {
  const [viewState, setViewState] = useState({
    latitude: 40.666,
    longitude: -111.897,
    zoom: 10
  });
  
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [wildlifeLayers, setWildlifeLayers] = useState(WILDLIFE_LAYERS);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [wildlifeFeatures, setWildlifeFeatures] = useState<Feature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [monarchStatus, setMonarchStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [layers]);

  const fetchWildlifeData = useCallback(async () => {
    if (!wildlifeLayers.some(l => l.visible)) {
      setWildlifeFeatures([]);
      return;
    }
    try {
      const res = await api.get('/api/wildlife/unified', {
        params: { lat: viewState.latitude, lng: viewState.longitude, radius: 50, taxon: 'all' }
      });
      setWildlifeFeatures(res.data.features || []);
    } catch (err) {
      console.error('Failed to fetch wildlife:', err);
    }
  }, [viewState.latitude, viewState.longitude, wildlifeLayers]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const timer = setTimeout(fetchWildlifeData, 500);
    return () => clearTimeout(timer);
  }, [fetchWildlifeData]);

  const toggleLayer = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const toggleWildlifeLayer = (id: string) => {
    setWildlifeLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const getMarkerColor = (feature: Feature): string => {
    const source = feature.properties.source;
    if (source === 'inaturalist') return '#74ac00';
    if (source === 'gbif') return '#0066cc';
    if (source === 'ebird') return '#0073e6';
    const layer = feature.properties.layer;
    const config = [...layers, ...wildlifeLayers].find(l => l.id === layer);
    return config?.color || '#6b7280';
  };

  const getMarkerIcon = (feature: Feature): string => {
    const source = feature.properties.source;
    const taxon = feature.properties.iconic_taxon;
    
    if (source === 'inaturalist' || source === 'gbif') {
      if (taxon === 'Aves') return '🐦';
      if (taxon === 'Insecta') return '🦋';
      if (taxon === 'Mammalia') return '🦊';
      if (taxon === 'Reptilia') return '🦎';
      if (taxon === 'Amphibia') return '🐸';
      if (taxon === 'Plantae') return '🌿';
      if (taxon === 'Fungi') return '🍄';
      if (taxon === 'Arachnida') return '🕷️';
      return '📸';
    }
    
    const layer = feature.properties.layer;
    const config = [...layers, ...wildlifeLayers].find(l => l.id === layer);
    return config?.icon || '📍';
  };

  const isFeatureVisible = (feature: Feature): boolean => {
    const layer = feature.properties.layer;
    const source = feature.properties.source;
    if (source === 'inaturalist' || source === 'gbif' || source === 'ebird') {
      return wildlifeLayers.find(l => l.id === 'inaturalist')?.visible || false;
    }
    return layers.find(l => l.id === layer)?.visible || false;
  };

  const allFeatures = [...features, ...wildlifeFeatures];
  const visibleFeatures = allFeatures.filter(isFeatureVisible);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        
        {visibleFeatures.map((feature, idx) => (
          <Marker
            key={`${feature.properties.layer || feature.properties.source}-${idx}`}
            latitude={feature.geometry.coordinates[1]}
            longitude={feature.geometry.coordinates[0]}
            onClick={(e: any) => { e.originalEvent.stopPropagation(); setSelectedFeature(feature); }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: getMarkerColor(feature),
              border: '2px solid white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, cursor: 'pointer',
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
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
            maxWidth="320px"
          >
            <div style={{ padding: 4 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>
                {selectedFeature.properties.name || selectedFeature.properties.species || selectedFeature.properties.layer}
              </h3>
              
              {selectedFeature.properties.scientific_name && (
                <p style={{ margin: '0 0 8px', fontSize: 13, fontStyle: 'italic', color: '#666' }}>
                  {selectedFeature.properties.scientific_name}
                </p>
              )}
              
              {selectedFeature.properties.photo_url && (
                <img 
                  src={selectedFeature.properties.photo_url} 
                  alt={selectedFeature.properties.species || ''} 
                  style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} 
                />
              )}
              
              {selectedFeature.properties.observed_on && (
                <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>
                  📅 {selectedFeature.properties.observed_on}
                </p>
              )}
              
              {selectedFeature.properties.user && (
                <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>
                  👤 {selectedFeature.properties.user}
                </p>
              )}
              
              {selectedFeature.properties.type && (
                <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>
                  📍 {selectedFeature.properties.type}
                </p>
              )}
              
              {selectedFeature.properties.acres && (
                <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>
                  📐 {selectedFeature.properties.acres} acres
                </p>
              )}
              
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#999' }}>
                Source: {selectedFeature.properties.source || selectedFeature.properties.layer}
              </p>
              
              {selectedFeature.properties.url && (
                <a 
                  href={selectedFeature.properties.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ display: 'block', marginTop: 8, fontSize: 13, color: '#2563eb' }}
                >
                  View on iNaturalist →
                </a>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Layer Panel */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        backgroundColor: 'white', borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        width: 260, maxHeight: 'calc(100vh - 100px)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
        }} onClick={() => setLayerPanelOpen(!layerPanelOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={20} />
            <span style={{ fontWeight: 600 }}>Map Layers</span>
          </div>
          {layerPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {layerPanelOpen && (
          <div style={{ overflowY: 'auto', padding: 12 }}>
            <h4 style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Program Data</h4>
            {layers.map(layer => (
              <div key={layer.id} style={{
                display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                backgroundColor: layer.visible ? `${layer.color}20` : 'transparent', marginBottom: 4,
              }} onClick={() => toggleLayer(layer.id)}>
                <span style={{ fontSize: 16, marginRight: 10 }}>{layer.icon}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{layer.name}</span>
                {layer.visible ? <Eye size={16} color={layer.color} /> : <EyeOff size={16} color="#9ca3af" />}
              </div>
            ))}

            <h4 style={{ fontSize: 11, color: '#6b7280', margin: '16px 0 8px', textTransform: 'uppercase' }}>Wildlife Data</h4>
            {wildlifeLayers.map(layer => (
              <div key={layer.id} style={{
                display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                backgroundColor: layer.visible ? `${layer.color}20` : 'transparent', marginBottom: 4,
              }} onClick={() => toggleWildlifeLayer(layer.id)}>
                <span style={{ fontSize: 16, marginRight: 10 }}>{layer.icon}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{layer.name}</span>
                {layer.visible ? <Eye size={16} color={layer.color} /> : <EyeOff size={16} color="#9ca3af" />}
              </div>
            ))}

            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8, fontSize: 12 }}>
              📍 {visibleFeatures.length} features visible
              {loading && <span style={{ color: '#6b7280' }}> · Loading...</span>}
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        backgroundColor: 'white', borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: 280, overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
        }} onClick={() => setInfoPanelOpen(!infoPanelOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={20} />
            <span style={{ fontWeight: 600 }}>Utah Pollinator Path</span>
          </div>
          {infoPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {infoPanelOpen && (
          <div style={{ padding: 16 }}>
            {monarchStatus && (
              <div style={{ padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>🦋</span>
                  <span style={{ fontWeight: 600 }}>Monarch Status</span>
                </div>
                <p style={{ fontSize: 13, margin: 0, color: '#92400e' }}>{monarchStatus.utah_note}</p>
                <p style={{ fontSize: 12, margin: '8px 0 0', color: '#a16207' }}>💡 {monarchStatus.action}</p>
              </div>
            )}
            
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              <div>🌻 <strong>Gardens:</strong> {features.filter(f => f.properties.layer === 'participation').length}</div>
              <div>🦋 <strong>Waystations:</strong> {features.filter(f => f.properties.layer === 'waystations').length}</div>
              <div>🌳 <strong>Parks:</strong> {features.filter(f => f.properties.layer === 'parks').length}</div>
              <div>📸 <strong>Wildlife obs:</strong> {wildlifeFeatures.length}</div>
            </div>
            
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>DATA SOURCES</h4>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                📸 iNaturalist · 🔬 GBIF · 📡 Motus<br/>
                🗺️ Utah SGID · 🦋 MonarchWatch
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Title Bar */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        backgroundColor: 'white', padding: '10px 28px', borderRadius: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 15, fontWeight: 500,
      }}>
        🐝 Utah Pollinator Path — Discovery Map
      </div>
    </div>
  );
};

export default DiscoveryMap;
