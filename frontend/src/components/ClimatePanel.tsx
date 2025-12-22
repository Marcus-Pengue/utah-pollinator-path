import React, { useState, useEffect } from 'react';
import { Thermometer, TrendingUp } from 'lucide-react';
import { api } from '../api/client';

interface YearData {
  year: number;
  avg_high: number;
  avg_low: number;
  total_precip: number;
}

const ClimatePanel: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const [current, setCurrent] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [trends, setTrends] = useState<YearData[]>([]);
  const [trendDirection, setTrendDirection] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showTrends, setShowTrends] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const fetchCurrent = async () => {
      try {
        const res = await api.get('/api/climate/current', { 
          params: { lat, lng },
          timeout: 15000 
        });
        if (mounted && res.data) {
          if (res.data.weather?.current) {
            setCurrent({
              temperature_f: Math.round(res.data.weather.current.temperature_2m),
              humidity_pct: res.data.weather.current.relative_humidity_2m,
            });
          }
          if (res.data.pollinator_activity) {
            setActivity(res.data.pollinator_activity);
          }
        }
      } catch (err) {
        console.log('Current weather unavailable');
      }
      if (mounted) setLoading(false);
    };

    const fetchTrends = async () => {
      try {
        const res = await api.get('/api/climate/trends', { 
          params: { lat, lng, years: 10 },
          timeout: 30000
        });
        if (mounted && res.data?.yearly_data) {
          setTrends(res.data.yearly_data);
          setTrendDirection(res.data.trend || '');
        }
      } catch (err) {
        console.log('Climate trends unavailable');
      }
    };

    fetchCurrent();
    fetchTrends();

    return () => { mounted = false; };
  }, [lat, lng]);

  if (loading) {
    return <div style={{ padding: 16, fontSize: 12, color: '#666' }}>Loading climate...</div>;
  }

  return (
    <div style={{ padding: 12 }}>
      {current && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 11, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Thermometer size={12} /> Current Conditions
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ backgroundColor: '#f0f9ff', padding: 8, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{current.temperature_f}°F</div>
              <div style={{ fontSize: 9, color: '#666' }}>Temperature</div>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', padding: 8, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{current.humidity_pct}%</div>
              <div style={{ fontSize: 9, color: '#666' }}>Humidity</div>
            </div>
          </div>
        </div>
      )}

      {activity && (
        <div style={{ 
          marginBottom: 12, padding: 10, borderRadius: 8,
          backgroundColor: activity.activity_level === 'High' ? '#dcfce7' : 
                          activity.activity_level === 'Moderate' ? '#fef9c3' : '#fee2e2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>🐝</span>
            <span style={{ fontWeight: 600, fontSize: 12 }}>Pollinator Activity: {activity.activity_level}</span>
          </div>
          <div style={{ fontSize: 10, color: '#666' }}>
            {activity.notes?.slice(0, 2).join(' • ')}
          </div>
        </div>
      )}

      <button onClick={() => setShowTrends(!showTrends)} style={{
        width: '100%', padding: '8px 10px', backgroundColor: '#f3f4f6', border: 'none',
        borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', fontSize: 11, fontWeight: 500,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={12} /> 10-Year Climate Trend
        </span>
        <span>{showTrends ? '▲' : '▼'}</span>
      </button>

      {showTrends && (
        <div style={{ marginTop: 10 }}>
          {trends.length > 0 ? (
            <>
              <div style={{ 
                fontSize: 11, marginBottom: 8, fontWeight: 500,
                color: trendDirection === 'warming' ? '#dc2626' : trendDirection === 'cooling' ? '#2563eb' : '#666'
              }}>
                Trend: {trendDirection === 'warming' ? '📈 Warming' : trendDirection === 'cooling' ? '📉 Cooling' : '➡️ Stable'}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 50 }}>
                {trends.slice(-10).map((year) => {
                  const height = Math.max(10, ((year.avg_high - 55) / 20) * 100);
                  return (
                    <div key={year.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '100%', height: `${height}%`,
                          backgroundColor: year.avg_high > 65 ? '#ef4444' : year.avg_high > 62 ? '#f59e0b' : '#22c55e',
                          borderRadius: '2px 2px 0 0',
                        }}
                        title={`${year.year}: ${year.avg_high}°F`}
                      />
                      <div style={{ fontSize: 7, color: '#999', marginTop: 2 }}>
                        {year.year.toString().slice(-2)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, color: '#999', marginTop: 6, textAlign: 'center' }}>
                Avg High Temp (°F) by Year
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#999', padding: 8, textAlign: 'center' }}>
              Loading trend data...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClimatePanel;
