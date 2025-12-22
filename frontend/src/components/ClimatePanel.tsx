import React, { useState, useEffect } from 'react';
import { Thermometer, CloudRain, TrendingUp, Calendar } from 'lucide-react';
import { api } from '../api/client';

interface ClimateData {
  current?: {
    temperature_f: number;
    humidity_pct: number;
    wind_mph: number;
  };
  activity?: {
    score: number;
    activity_level: string;
    notes: string[];
  };
  trends?: {
    trend: string;
    yearly_data: Array<{
      year: number;
      avg_high: number;
      avg_low: number;
      total_precip: number;
    }>;
  };
}

const ClimatePanel: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const [data, setData] = useState<ClimateData>({});
  const [loading, setLoading] = useState(true);
  const [showTrends, setShowTrends] = useState(false);

  useEffect(() => {
    const fetchClimate = async () => {
      setLoading(true);
      try {
        const [currentRes, trendsRes] = await Promise.all([
          api.get('/api/climate/current', { params: { lat, lng } }),
          api.get('/api/climate/trends', { params: { lat, lng, years: 10 } })
        ]);
        
        setData({
          current: currentRes.data.weather?.current ? {
            temperature_f: currentRes.data.weather.current.temperature_2m,
            humidity_pct: currentRes.data.weather.current.relative_humidity_2m,
            wind_mph: currentRes.data.weather.current.wind_speed_10m,
          } : undefined,
          activity: currentRes.data.pollinator_activity,
          trends: trendsRes.data,
        });
      } catch (err) {
        console.error('Climate fetch error:', err);
      }
      setLoading(false);
    };
    
    fetchClimate();
  }, [lat, lng]);

  if (loading) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: '#666' }}>
        Loading climate data...
      </div>
    );
  }

  const { current, activity, trends } = data;

  return (
    <div style={{ padding: 12 }}>
      {/* Current Conditions */}
      {current && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 12, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Thermometer size={14} /> Current Conditions
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ backgroundColor: '#f0f9ff', padding: 8, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{Math.round(current.temperature_f)}°F</div>
              <div style={{ fontSize: 10, color: '#666' }}>Temperature</div>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', padding: 8, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{current.humidity_pct}%</div>
              <div style={{ fontSize: 10, color: '#666' }}>Humidity</div>
            </div>
          </div>
        </div>
      )}

      {/* Pollinator Activity */}
      {activity && (
        <div style={{ 
          marginBottom: 16, 
          padding: 10, 
          borderRadius: 8,
          backgroundColor: activity.activity_level === 'High' ? '#dcfce7' : 
                          activity.activity_level === 'Moderate' ? '#fef9c3' : '#fee2e2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🐝</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Pollinator Activity: {activity.activity_level}</span>
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>
            {activity.notes?.slice(0, 2).join(' • ')}
          </div>
        </div>
      )}

      {/* Climate Trends Toggle */}
      <button
        onClick={() => setShowTrends(!showTrends)}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: '#f3f4f6',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} />
          10-Year Climate Trend
        </span>
        <span>{showTrends ? '▲' : '▼'}</span>
      </button>

      {/* Trends Chart */}
      {showTrends && trends?.yearly_data && (
        <div style={{ marginTop: 12 }}>
          <div style={{ 
            fontSize: 11, 
            color: trends.trend === 'warming' ? '#dc2626' : trends.trend === 'cooling' ? '#2563eb' : '#666',
            marginBottom: 8,
            fontWeight: 500
          }}>
            Trend: {trends.trend === 'warming' ? '📈 Warming' : trends.trend === 'cooling' ? '📉 Cooling' : '➡️ Stable'}
          </div>
          
          {/* Simple bar chart */}
          <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 60 }}>
            {trends.yearly_data.slice(-10).map((year, i) => {
              const height = ((year.avg_high - 50) / 30) * 100; // Normalize to 50-80°F range
              return (
                <div key={year.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(10, height)}%`,
                      backgroundColor: year.avg_high > 65 ? '#ef4444' : year.avg_high > 60 ? '#f59e0b' : '#22c55e',
                      borderRadius: '2px 2px 0 0',
                    }}
                    title={`${year.year}: ${year.avg_high}°F avg high`}
                  />
                  <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>
                    {year.year.toString().slice(-2)}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>
            Average High Temperature (°F) by Year
          </div>
        </div>
      )}
    </div>
  );
};

export default ClimatePanel;
