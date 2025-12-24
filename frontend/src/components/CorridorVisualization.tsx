import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl';

interface Garden {
  id: string;
  lat: number;
  lng: number;
  score: number;
  tier: string;
}

interface CorridorVisualizationProps {
  gardens: Garden[];
  maxDistance?: number; // km
  visible?: boolean;
}

interface Connection {
  from: Garden;
  to: Garden;
  distance: number;
  strength: number;
}

const CorridorVisualization: React.FC<CorridorVisualizationProps> = ({ 
  gardens, 
  maxDistance = 0.5, // 500m default - typical pollinator flight range
  visible = true 
}) => {
  
  // Calculate connections between nearby gardens
  const connections = useMemo(() => {
    const conns: Connection[] = [];
    
    for (let i = 0; i < gardens.length; i++) {
      for (let j = i + 1; j < gardens.length; j++) {
        const g1 = gardens[i];
        const g2 = gardens[j];
        
        // Calculate distance in km
        const latDiff = Math.abs(g1.lat - g2.lat) * 111;
        const lngDiff = Math.abs(g1.lng - g2.lng) * 85; // ~40° latitude
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        if (distance <= maxDistance) {
          // Strength based on distance (closer = stronger) and garden scores
          const distanceScore = 1 - (distance / maxDistance);
          const gardenScore = ((g1.score || 50) + (g2.score || 50)) / 200;
          const strength = distanceScore * 0.7 + gardenScore * 0.3;
          
          conns.push({ from: g1, to: g2, distance, strength });
        }
      }
    }
    
    return conns;
  }, [gardens, maxDistance]);

  // Calculate corridor nodes (gardens with connectivity score)
  const corridorNodes = useMemo(() => {
    const nodeScores: Record<string, number> = {};
    
    gardens.forEach(g => {
      nodeScores[g.id] = 0;
    });
    
    connections.forEach(conn => {
      nodeScores[conn.from.id] = (nodeScores[conn.from.id] || 0) + conn.strength;
      nodeScores[conn.to.id] = (nodeScores[conn.to.id] || 0) + conn.strength;
    });
    
    return gardens.map(g => ({
      ...g,
      connectivityScore: nodeScores[g.id] || 0,
      isIsolated: nodeScores[g.id] === 0
    }));
  }, [gardens, connections]);

  // GeoJSON for corridor lines
  const corridorLines = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: connections.map(conn => ({
      type: 'Feature' as const,
      properties: {
        strength: conn.strength,
        distance: conn.distance
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

  // GeoJSON for connectivity nodes
  const connectivityNodes = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: corridorNodes.map(node => ({
      type: 'Feature' as const,
      properties: {
        id: node.id,
        score: node.connectivityScore,
        isIsolated: node.isIsolated,
        tier: node.tier
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [node.lng, node.lat]
      }
    }))
  }), [corridorNodes]);

  // Identify gap areas (large areas with no gardens)
  const gapAreas = useMemo(() => {
    // Simple gap detection - find isolated gardens
    const isolated = corridorNodes.filter(n => n.isIsolated);
    return {
      type: 'FeatureCollection' as const,
      features: isolated.map(node => ({
        type: 'Feature' as const,
        properties: { radius: maxDistance * 1000 },
        geometry: {
          type: 'Point' as const,
          coordinates: [node.lng, node.lat]
        }
      }))
    };
  }, [corridorNodes, maxDistance]);

  if (!visible || gardens.length === 0) return null;

  return (
    <>
      {/* Corridor connection lines */}
      <Source id="corridor-lines" type="geojson" data={corridorLines}>
        <Layer
          id="corridor-lines-layer"
          type="line"
          paint={{
            'line-color': [
              'interpolate',
              ['linear'],
              ['get', 'strength'],
              0, 'rgba(34, 197, 94, 0.2)',
              0.3, 'rgba(34, 197, 94, 0.4)',
              0.6, 'rgba(34, 197, 94, 0.6)',
              1, 'rgba(34, 197, 94, 0.9)'
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['get', 'strength'],
              0, 1,
              0.5, 2,
              1, 4
            ],
            'line-dasharray': [2, 1]
          }}
        />
      </Source>

      {/* Connectivity halos around well-connected gardens */}
      <Source id="connectivity-nodes" type="geojson" data={connectivityNodes}>
        <Layer
          id="connectivity-halo"
          type="circle"
          filter={['!', ['get', 'isIsolated']]}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'score'],
              0, 15,
              2, 25,
              5, 40
            ],
            'circle-color': 'rgba(34, 197, 94, 0.15)',
            'circle-stroke-width': 0
          }}
        />
      </Source>

      {/* Isolated garden warning markers */}
      <Source id="isolated-gardens" type="geojson" data={gapAreas}>
        <Layer
          id="isolated-warning"
          type="circle"
          paint={{
            'circle-radius': 20,
            'circle-color': 'rgba(239, 68, 68, 0.2)',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ef4444'
          }}
        />
      </Source>
    </>
  );
};

export default CorridorVisualization;
