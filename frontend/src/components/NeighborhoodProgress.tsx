import React, { useState, useEffect } from 'react';

interface NeighborhoodData {
  name: string;
  gardens: number;
  opportunities: number;
  avgConnectivity: number;
  topNeed: string;
}

interface NeighborhoodProgressProps {
  gardens: any[];
  opportunityData: any;
  selectedCity?: string;
  onSelectCity?: (city: string | null) => void;
}

const NeighborhoodProgress: React.FC<NeighborhoodProgressProps> = ({
  gardens,
  opportunityData,
  selectedCity,
  onSelectCity
}) => {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodData[]>([]);
  const [totalStats, setTotalStats] = useState({ gardens: 0, opportunities: 0, cities: 0 });
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!opportunityData?.features) return;

    // Aggregate by city
    const cityData: Record<string, {
      opportunities: number;
      totalConnectivity: number;
      gardens: number;
    }> = {};

    opportunityData.features.forEach((f: any) => {
      const city = f.properties?.nearest_location || 'Unknown';
      if (!cityData[city]) {
        cityData[city] = { opportunities: 0, totalConnectivity: 0, gardens: 0 };
      }
      cityData[city].opportunities++;
      cityData[city].totalConnectivity += parseFloat(f.properties?.connectivity_index || '0');
    });

    // Add garden counts (simplified - just count total for demo)
    gardens.forEach((g: any) => {
      const city = g.properties?.city;
      if (city && cityData[city]) {
        cityData[city].gardens++;
      }
    });

    // Convert to array
    const neighborhoodList: NeighborhoodData[] = Object.entries(cityData)
      .map(([name, data]) => ({
        name,
        gardens: data.gardens,
        opportunities: data.opportunities,
        avgConnectivity: data.opportunities > 0 
          ? Math.round((data.totalConnectivity / data.opportunities) * 100) / 100
          : 0,
        topNeed: getTopNeed(data.opportunities - data.gardens)
      }))
      .sort((a, b) => b.opportunities - a.opportunities);

    setNeighborhoods(neighborhoodList);
    setTotalStats({
      gardens: gardens.length,
      opportunities: opportunityData.features.length,
      cities: neighborhoodList.length
    });
  }, [gardens, opportunityData]);

  const getTopNeed = (gap: number): string => {
    // Placeholder - would use actual seasonal data
    const needs = ['Late-season nectar', 'Milkweed', 'Native shrubs', 'Early bloomers'];
    return needs[Math.abs(gap) % needs.length];
  };

  const getStatusColor = (gardens: number, opportunities: number) => {
    const ratio = gardens / Math.max(opportunities, 1);
    if (ratio >= 0.5) return { bg: '#dcfce7', text: '#166534', label: 'Strong' };
    if (ratio >= 0.25) return { bg: '#fef9c3', text: '#854d0e', label: 'Growing' };
    if (ratio >= 0.1) return { bg: '#ffedd5', text: '#9a3412', label: 'Emerging' };
    return { bg: '#fee2e2', text: '#991b1b', label: 'Needs Help' };
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 30,
      left: 10,
      width: 340,
      maxHeight: isExpanded ? '50vh' : 'auto',
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
          background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          color: 'white',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>📊 Neighborhood Progress</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {totalStats.gardens} gardens • {totalStats.opportunities} opportunity zones • {totalStats.cities} cities
            </div>
          </div>
          <span style={{ fontSize: 18 }}>{isExpanded ? '▼' : '▲'}</span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Warning */}
          <div style={{
            padding: '6px 12px',
            background: '#fef3c7',
            fontSize: 10,
            color: '#92400e',
            borderBottom: '1px solid #fcd34d'
          }}>
            ⚠️ Preview data - connectivity scores are unvalidated placeholders
          </div>

          {/* Filter indicator */}
          {selectedCity && (
            <div style={{
              padding: '8px 12px',
              background: '#ede9fe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12
            }}>
              <span>Filtered: <strong>{selectedCity}</strong></span>
              <button
                onClick={() => onSelectCity?.(null)}
                style={{
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                Clear
              </button>
            </div>
          )}

          {/* City List */}
          <div style={{ 
            overflowY: 'auto', 
            flex: 1,
            maxHeight: 'calc(50vh - 140px)'
          }}>
            {neighborhoods
              .filter(n => !selectedCity || n.name === selectedCity)
              .map(neighborhood => {
                const status = getStatusColor(neighborhood.gardens, neighborhood.opportunities);
                const progressPercent = Math.min(
                  (neighborhood.gardens / Math.max(neighborhood.opportunities, 1)) * 100,
                  100
                );

                return (
                  <div
                    key={neighborhood.name}
                    onClick={() => onSelectCity?.(neighborhood.name)}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    {/* City name and status */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: 8
                    }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{neighborhood.name}</span>
                      <span style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: status.bg,
                        color: status.text,
                        fontWeight: 500
                      }}>
                        {status.label}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 8,
                      marginBottom: 8,
                      fontSize: 11
                    }}>
                      <div style={{ textAlign: 'center', padding: '4px', background: '#f0fdf4', borderRadius: 4 }}>
                        <div style={{ fontWeight: 600, color: '#166534' }}>{neighborhood.gardens}</div>
                        <div style={{ color: '#6b7280', fontSize: 10 }}>Gardens</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '4px', background: '#fef3c7', borderRadius: 4 }}>
                        <div style={{ fontWeight: 600, color: '#92400e' }}>{neighborhood.opportunities}</div>
                        <div style={{ color: '#6b7280', fontSize: 10 }}>Opp. Zones</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '4px', background: '#ede9fe', borderRadius: 4 }}>
                        <div style={{ fontWeight: 600, color: '#6d28d9' }}>{neighborhood.avgConnectivity}*</div>
                        <div style={{ color: '#6b7280', fontSize: 10 }}>Connect.</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: 10,
                        color: '#6b7280',
                        marginBottom: 2
                      }}>
                        <span>Coverage Progress</span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <div style={{
                        height: 4,
                        background: '#e5e7eb',
                        borderRadius: 2,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${progressPercent}%`,
                          background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                          borderRadius: 2
                        }} />
                      </div>
                    </div>

                    {/* Top need */}
                    <div style={{
                      marginTop: 6,
                      fontSize: 10,
                      color: '#6b7280'
                    }}>
                      🌸 Top need: <span style={{ color: '#7c3aed' }}>{neighborhood.topNeed}</span>
                    </div>
                  </div>
                );
              })}
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
            *Connectivity index methodology under peer review
          </div>
        </>
      )}
    </div>
  );
};

export default NeighborhoodProgress;
