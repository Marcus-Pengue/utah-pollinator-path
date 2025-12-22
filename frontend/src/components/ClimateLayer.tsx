import React, { useState, useEffect } from 'react';
import { Source, Layer } from 'react-map-gl';
import { api } from '../api/client';

interface ClimateLayerProps {
  visible: boolean;
  year?: number;
}

interface YearlyData {
  year: number;
  avg_high: number;
  avg_low: number;
  total_precip: number;
}

const ClimateLayer: React.FC<ClimateLayerProps> = ({ visible, year }) => {
  const [trendData, setTrendData] = useState<YearlyData[]>([]);
  
  useEffect(() => {
    if (visible) {
      api.get('/api/climate/trends', { params: { lat: 40.666, lng: -111.897, years: 20 } })
        .then(res => setTrendData(res.data.yearly_data || []))
        .catch(err => console.error('Climate trend error:', err));
    }
  }, [visible]);
  
  if (!visible || trendData.length === 0) return null;
  
  // Create a simple temperature anomaly visualization
  // This would be expanded to show actual grid data
  
  return null; // Placeholder - actual implementation would render heatmap
};

export default ClimateLayer;
