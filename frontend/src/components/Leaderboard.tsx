import React, { useState, useEffect } from 'react';

interface CityStats {
  city: string;
  gardensRegistered: number;
  opportunityZones: number;
  coveragePercent: number;
  placeholderScore: number; // Unvalidated - placeholder only
}

interface LeaderboardProps {
  gardens: any[];
  opportunityData: any;
  onCityClick?: (city: string) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ gardens, opportunityData, onCityClick }) => {
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [sortBy, setSortBy] = useState<'gardens' | 'coverage' | 'score'>('gardens');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!opportunityData?.features) return;

    // Count opportunity zones per city
    const cityOpportunities: Record<string, number> = {};
    opportunityData.features.forEach((f: any) => {
      const city = f.properties?.nearest_location || 'Unknown';
      cityOpportunities[city] = (cityOpportunities[city] || 0) + 1;
    });

    // Count gardens per city (approximate by finding nearest city)
    const cityGardens: Record<string, number> = {};
    gardens.forEach((g: any) => {
      // Simple assignment - in production would use actual geocoding
      const city = g.properties?.city || findNearestCity(g, opportunityData);
      cityGardens[city] = (cityGardens[city] || 0) + 1;
    });

    // Build stats array
    const stats: CityStats[] = Object.keys(cityOpportunities).map(city => {
      const zones = cityOpportunities[city];
      const registered = cityGardens[city] || 0;
      const coverage = zones > 0 ? Math.min((registered / zones) * 100, 100) : 0;
      
      // PLACEHOLDER SCORE - NOT VALIDATED
      // This is a simple formula for demo purposes only
      const placeholderScore = Math.round(
        (registered * 10) + (coverage * 0.5) + Math.random() * 5
      );

      return {
        city,
        gardensRegistered: registered,
        opportunityZones: zones,
        coveragePercent: Math.round(coverage * 10) / 10,
        placeholderScore
      };
    });

    // Sort
    stats.sort((a, b) => {
      if (sortBy === 'gardens') return b.gardensRegistered - a.gardensRegistered;
      if (sortBy === 'coverage') return b.coveragePercent - a.coveragePercent;
      return b.placeholderScore - a.placeholderScore;
    });

    setCityStats(stats);
  }, [gardens, opportunityData, sortBy]);

  const findNearestCity = (garden: any, opData: any): string => {
    // Simplified - just return first city or Unknown
    // In production, calculate actual distance
    if (!garden.geometry?.coordinates) return 'Unknown';
    const [lon, lat] = garden.geometry.coordinates;
    
    let nearest = 'Unknown';
    let minDist = Infinity;
    
    opData.features?.slice(0, 50).forEach((f: any) => {
      const [fLon, fLat] = f.geometry.coordinates;
      const dist = Math.sqrt((lon - fLon) ** 2 + (lat - fLat) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = f.properties?.nearest_location || 'Unknown';
      }
    });
    
    return nearest;
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 50) return '#22c55e';
    if (percent >= 25) return '#eab308';
    if (percent >= 10) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{
      position: 'absolute',
      top: 80,
      right: 10,
      width: 320,
      maxHeight: isExpanded ? '70vh' : 'auto',
      background: 'white',
      borderRadius: 8,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      zIndex: 1000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div 
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>🏆 Community Leaderboard</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>Cities competing for pollinators</div>
        </div>
        <span style={{ fontSize: 18 }}>{isExpanded ? '▼' : '▲'}</span>
      </div>

      {isExpanded && (
        <>
          {/* Warning Banner */}
          <div style={{
            padding: '8px 12px',
            background: '#fef3c7',
            borderBottom: '1px solid #fcd34d',
            fontSize: 11,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            ⚠️ <span><strong>Preview Mode:</strong> Scores are placeholders. Model validation in progress.</span>
          </div>

          {/* Sort Controls */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: 8,
            fontSize: 12
          }}>
            <span style={{ color: '#6b7280' }}>Sort:</span>
            {(['gardens', 'coverage', 'score'] as const).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: 'none',
                  background: sortBy === key ? '#059669' : '#f3f4f6',
                  color: sortBy === key ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: sortBy === key ? 600 : 400
                }}
              >
                {key === 'gardens' ? 'Gardens' : key === 'coverage' ? 'Coverage' : 'Score*'}
              </button>
            ))}
          </div>

          {/* Leaderboard List */}
          <div style={{ 
            overflowY: 'auto', 
            flex: 1,
            maxHeight: 'calc(70vh - 160px)'
          }}>
            {cityStats.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                Loading city data...
              </div>
            ) : (
              cityStats.map((city, index) => (
                <div
                  key={city.city}
                  onClick={() => onCityClick?.(city.city)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: onCityClick ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                    background: index < 3 ? `rgba(5, 150, 105, ${0.08 - index * 0.02})` : 'white'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = index < 3 ? `rgba(5, 150, 105, ${0.08 - index * 0.02})` : 'white'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: index < 3 ? 18 : 14, minWidth: 28 }}>
                        {getMedalEmoji(index)}
                      </span>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{city.city}</span>
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: '#059669',
                      fontWeight: 600,
                      background: '#ecfdf5',
                      padding: '2px 8px',
                      borderRadius: 4
                    }}>
                      {city.gardensRegistered} 🌱
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ marginLeft: 36 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: '#6b7280',
                      marginBottom: 3
                    }}>
                      <span>{city.gardensRegistered} / {city.opportunityZones} zones</span>
                      <span>{city.coveragePercent}%</span>
                    </div>
                    <div style={{
                      height: 6,
                      background: '#e5e7eb',
                      borderRadius: 3,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(city.coveragePercent, 100)}%`,
                        background: getProgressColor(city.coveragePercent),
                        borderRadius: 3,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '8px 12px',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            fontSize: 10,
            color: '#9ca3af',
            textAlign: 'center'
          }}>
            *Score methodology under development • Data updates daily
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
