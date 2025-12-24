import React, { useMemo, useState } from 'react';
import { Source, Layer, Marker } from 'react-map-gl';

interface Garden {
  id: string;
  lat: number;
  lng: number;
  score: number;
  tier: string;
  plants?: string[];
}

interface Observation {
  lat: number;
  lng: number;
  taxon: string;
  species?: string;
}

interface CorridorVisualizationProps {
  gardens: Garden[];
  observations?: Observation[];
  maxDistance?: number;
  visible?: boolean;
  selectedSpecies?: string;
  onSelectGap?: (lat: number, lng: number) => void;
}

interface Connection {
  from: Garden;
  to: Garden;
  distance: number;
  strength: number;
}

interface GapZone {
  lat: number;
  lng: number;
  priority: number;
  potentialConnections: number;
  nearbyGardens: string[];
}

// Species-specific corridor colors and ranges
const SPECIES_CONFIG: Record<string, { color: string; range: number; icon: string; name: string }> = {
  all: { color: '#22c55e', range: 0.5, icon: '🦋', name: 'All Pollinators' },
  bee: { color: '#f59e0b', range: 0.3, icon: '🐝', name: 'Bees (300m range)' },
  butterfly: { color: '#ec4899', range: 0.8, icon: '🦋', name: 'Butterflies (800m range)' },
  hummingbird: { color: '#8b5cf6', range: 1.2, icon: '🐦', name: 'Hummingbirds (1.2km range)' },
  moth: { color: '#6366f1', range: 0.5, icon: '🦋', name: 'Moths (500m range)' },
};

const CorridorVisualization: React.FC<CorridorVisualizationProps> = ({ 
  gardens, 
  observations = [],
  maxDistance = 0.5,
  visible = true,
  selectedSpecies = 'all',
  onSelectGap
}) => {
  const speciesConfig = SPECIES_CONFIG[selectedSpecies] || SPECIES_CONFIG.all;
  const effectiveRange = speciesConfig.range;

  // Calculate connections between nearby gardens
  const connections = useMemo(() => {
    const conns: Connection[] = [];
    
    for (let i = 0; i < gardens.length; i++) {
      for (let j = i + 1; j < gardens.length; j++) {
        const g1 = gardens[i];
        const g2 = gardens[j];
        
        const latDiff = Math.abs(g1.lat - g2.lat) * 111;
        const lngDiff = Math.abs(g1.lng - g2.lng) * 85;
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        if (distance <= effectiveRange) {
          const distanceScore = 1 - (distance / effectiveRange);
          const gardenScore = ((g1.score || 50) + (g2.score || 50)) / 200;
          const strength = distanceScore * 0.7 + gardenScore * 0.3;
          
          conns.push({ from: g1, to: g2, distance, strength });
        }
      }
    }
    
    return conns;
  }, [gardens, effectiveRange]);

  // Calculate corridor nodes with connectivity scores
  const corridorNodes = useMemo(() => {
    const nodeScores: Record<string, number> = {};
    const nodeConnections: Record<string, number> = {};
    
    gardens.forEach(g => {
      nodeScores[g.id] = 0;
      nodeConnections[g.id] = 0;
    });
    
    connections.forEach(conn => {
      nodeScores[conn.from.id] = (nodeScores[conn.from.id] || 0) + conn.strength;
      nodeScores[conn.to.id] = (nodeScores[conn.to.id] || 0) + conn.strength;
      nodeConnections[conn.from.id] = (nodeConnections[conn.from.id] || 0) + 1;
      nodeConnections[conn.to.id] = (nodeConnections[conn.to.id] || 0) + 1;
    });
    
    return gardens.map(g => ({
      ...g,
      connectivityScore: nodeScores[g.id] || 0,
      connectionCount: nodeConnections[g.id] || 0,
      isIsolated: nodeConnections[g.id] === 0,
      isHub: nodeConnections[g.id] >= 3
    }));
  }, [gardens, connections]);

  // Find gap zones - areas where a new garden would help most
  const gapZones = useMemo(() => {
    const gaps: GapZone[] = [];
    const isolatedGardens = corridorNodes.filter(n => n.isIsolated);
    
    // For each isolated garden, find the midpoint to nearest gardens
    isolatedGardens.forEach(isolated => {
      // Find nearest non-connected gardens
      const nearbyGardens = gardens
        .filter(g => g.id !== isolated.id)
        .map(g => {
          const latDiff = Math.abs(g.lat - isolated.lat) * 111;
          const lngDiff = Math.abs(g.lng - isolated.lng) * 85;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          return { garden: g, distance };
        })
        .filter(g => g.distance > effectiveRange && g.distance < effectiveRange * 3)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      
      if (nearbyGardens.length > 0) {
        // Calculate optimal gap fill position
        const avgLat = nearbyGardens.reduce((sum, g) => sum + (g.garden.lat + isolated.lat) / 2, 0) / nearbyGardens.length;
        const avgLng = nearbyGardens.reduce((sum, g) => sum + (g.garden.lng + isolated.lng) / 2, 0) / nearbyGardens.length;
        
        gaps.push({
          lat: avgLat,
          lng: avgLng,
          priority: nearbyGardens.length,
          potentialConnections: nearbyGardens.length + 1,
          nearbyGardens: [isolated.id, ...nearbyGardens.map(g => g.garden.id)]
        });
      }
    });
    
    return gaps;
  }, [corridorNodes, gardens, effectiveRange]);

  // GeoJSON for corridor lines with animation-ready properties
  const corridorLines = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: connections.map((conn, i) => ({
      type: 'Feature' as const,
      properties: {
        strength: conn.strength,
        distance: conn.distance,
        animationOffset: i * 0.1
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [conn.from.lng, conn.from.lat],
          [conn.to.lng, conn.to.lat]
        ]
      }
    }))
  }), [connections]);

  // GeoJSON for potential corridor lines (dashed, showing what could be)
  const potentialCorridors = useMemo(() => {
    const potentials: any[] = [];
    
    corridorNodes.filter(n => n.isIsolated).forEach(isolated => {
      gardens
        .filter(g => g.id !== isolated.id)
        .forEach(g => {
          const latDiff = Math.abs(g.lat - isolated.lat) * 111;
          const lngDiff = Math.abs(g.lng - isolated.lng) * 85;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          
          // Show potential if within 2x range
          if (distance > effectiveRange && distance < effectiveRange * 2) {
            potentials.push({
              type: 'Feature',
              properties: { 
                distance,
                gapSize: distance - effectiveRange
              },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [isolated.lng, isolated.lat],
                  [g.lng, g.lat]
                ]
              }
            });
          }
        });
    });
    
    return {
      type: 'FeatureCollection' as const,
      features: potentials
    };
  }, [corridorNodes, gardens, effectiveRange]);

  // Connectivity halos
  const connectivityNodes = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: corridorNodes.map(node => ({
      type: 'Feature' as const,
      properties: {
        id: node.id,
        score: node.connectivityScore,
        connections: node.connectionCount,
        isIsolated: node.isIsolated,
        isHub: node.isHub,
        tier: node.tier
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [node.lng, node.lat]
      }
    }))
  }), [corridorNodes]);

  // Gap opportunity zones
  const gapOpportunities = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: gapZones.map(gap => ({
      type: 'Feature' as const,
      properties: {
        priority: gap.priority,
        potentialConnections: gap.potentialConnections
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [gap.lng, gap.lat]
      }
    }))
  }), [gapZones]);

  // Network statistics
  const stats = useMemo(() => {
    const totalGardens = gardens.length;
    const connectedGardens = corridorNodes.filter(n => !n.isIsolated).length;
    const hubGardens = corridorNodes.filter(n => n.isHub).length;
    const isolatedGardens = corridorNodes.filter(n => n.isIsolated).length;
    const totalConnections = connections.length;
    const avgConnections = totalGardens > 0 ? (totalConnections * 2 / totalGardens).toFixed(1) : '0';
    
    return {
      totalGardens,
      connectedGardens,
      hubGardens,
      isolatedGardens,
      totalConnections,
      avgConnections,
      networkHealth: totalGardens > 0 ? Math.round((connectedGardens / totalGardens) * 100) : 0
    };
  }, [gardens, corridorNodes, connections]);

  if (!visible || gardens.length === 0) return null;

  return (
    <>
      {/* Potential corridor lines (what could be connected) */}
      <Source id="potential-corridors" type="geojson" data={potentialCorridors}>
        <Layer
          id="potential-corridors-layer"
          type="line"
          paint={{
            'line-color': '#ef4444',
            'line-width': 2,
            'line-dasharray': [4, 4],
            'line-opacity': 0.4
          }}
        />
      </Source>

      {/* Active corridor connection lines */}
      <Source id="corridor-lines" type="geojson" data={corridorLines}>
        <Layer
          id="corridor-glow"
          type="line"
          paint={{
            'line-color': speciesConfig.color,
            'line-width': [
              'interpolate',
              ['linear'],
              ['get', 'strength'],
              0, 8,
              0.5, 12,
              1, 18
            ],
            'line-opacity': 0.15,
            'line-blur': 3
          }}
        />
        <Layer
          id="corridor-lines-layer"
          type="line"
          paint={{
            'line-color': speciesConfig.color,
            'line-width': [
              'interpolate',
              ['linear'],
              ['get', 'strength'],
              0, 2,
              0.5, 3,
              1, 5
            ],
            'line-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'strength'],
              0, 0.4,
              0.5, 0.7,
              1, 1
            ]
          }}
        />
      </Source>

      {/* Hub gardens - larger glowing halos */}
      <Source id="hub-nodes" type="geojson" data={connectivityNodes}>
        <Layer
          id="hub-outer-glow"
          type="circle"
          filter={['==', ['get', 'isHub'], true]}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'connections'],
              3, 50,
              5, 70,
              10, 100
            ],
            'circle-color': speciesConfig.color,
            'circle-opacity': 0.08,
            'circle-blur': 1
          }}
        />
        <Layer
          id="hub-inner-glow"
          type="circle"
          filter={['==', ['get', 'isHub'], true]}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'connections'],
              3, 30,
              5, 40,
              10, 60
            ],
            'circle-color': speciesConfig.color,
            'circle-opacity': 0.15
          }}
        />
      </Source>

      {/* Connected garden halos */}
      <Source id="connected-nodes" type="geojson" data={connectivityNodes}>
        <Layer
          id="connected-halo"
          type="circle"
          filter={['all', ['!', ['get', 'isIsolated']], ['!', ['get', 'isHub']]]}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'score'],
              0, 20,
              2, 35,
              5, 50
            ],
            'circle-color': speciesConfig.color,
            'circle-opacity': 0.12
          }}
        />
      </Source>

      {/* Isolated garden warning circles */}
      <Source id="isolated-gardens" type="geojson" data={connectivityNodes}>
        <Layer
          id="isolated-pulse"
          type="circle"
          filter={['==', ['get', 'isIsolated'], true]}
          paint={{
            'circle-radius': 25,
            'circle-color': 'transparent',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ef4444',
            'circle-stroke-opacity': 0.6
          }}
        />
      </Source>

      {/* Gap opportunity markers */}
      <Source id="gap-opportunities" type="geojson" data={gapOpportunities}>
        <Layer
          id="gap-zone"
          type="circle"
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'priority'],
              1, 30,
              2, 40,
              3, 50
            ],
            'circle-color': '#fbbf24',
            'circle-opacity': 0.2,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#f59e0b',
            'circle-stroke-opacity': 0.8
          }}
        />
      </Source>

      {/* Gap opportunity markers with click handlers */}
      {gapZones.map((gap, i) => (
        <Marker
          key={`gap-${i}`}
          latitude={gap.lat}
          longitude={gap.lng}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSelectGap?.(gap.lat, gap.lng);
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#fbbf24',
              border: '3px solid #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.5)',
              animation: 'pulse 2s infinite',
              fontSize: 16
            }}
            title={`Plant a garden here to connect ${gap.potentialConnections} gardens!`}
          >
            ➕
          </div>
        </Marker>
      ))}

      {/* Hub markers */}
      {corridorNodes.filter(n => n.isHub).map((node, i) => (
        <Marker
          key={`hub-${node.id}`}
          latitude={node.lat}
          longitude={node.lng}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: speciesConfig.color,
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              fontSize: 12,
              color: 'white',
              fontWeight: 700
            }}
            title={`Hub garden with ${node.connectionCount} connections`}
          >
            ⭐
          </div>
        </Marker>
      ))}

      {/* Network stats overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 16,
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: 200,
          zIndex: 10
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{speciesConfig.icon}</span>
          <span>Corridor Network</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Network Health</span>
            <span style={{ 
              fontWeight: 600, 
              color: stats.networkHealth >= 70 ? '#22c55e' : stats.networkHealth >= 40 ? '#f59e0b' : '#ef4444' 
            }}>
              {stats.networkHealth}%
            </span>
          </div>
          
          <div style={{ 
            height: 6, 
            backgroundColor: '#e5e7eb', 
            borderRadius: 3, 
            overflow: 'hidden',
            marginBottom: 4
          }}>
            <div style={{ 
              height: '100%', 
              width: `${stats.networkHealth}%`,
              backgroundColor: stats.networkHealth >= 70 ? '#22c55e' : stats.networkHealth >= 40 ? '#f59e0b' : '#ef4444',
              transition: 'width 0.5s'
            }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Connected</span>
            <span style={{ fontWeight: 600, color: '#22c55e' }}>{stats.connectedGardens} gardens</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Hub Gardens</span>
            <span style={{ fontWeight: 600, color: speciesConfig.color }}>⭐ {stats.hubGardens}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Isolated</span>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>{stats.isolatedGardens} need help</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Corridors</span>
            <span style={{ fontWeight: 600 }}>{stats.totalConnections} active</span>
          </div>
          
          {gapZones.length > 0 && (
            <div style={{ 
              marginTop: 8, 
              padding: 10, 
              backgroundColor: '#fef3c7', 
              borderRadius: 8,
              fontSize: 12
            }}>
              <strong>🎯 {gapZones.length} gap{gapZones.length > 1 ? 's' : ''} identified!</strong>
              <div style={{ color: '#92400e', marginTop: 4 }}>
                Click ➕ markers to see where new gardens would help most
              </div>
            </div>
          )}
        </div>
        
        <div style={{ 
          marginTop: 12, 
          paddingTop: 12, 
          borderTop: '1px solid #e5e7eb',
          fontSize: 11,
          color: '#999'
        }}>
          {speciesConfig.name} • {(effectiveRange * 1000).toFixed(0)}m flight range
        </div>
      </div>
    </>
  );
};

export default CorridorVisualization;
