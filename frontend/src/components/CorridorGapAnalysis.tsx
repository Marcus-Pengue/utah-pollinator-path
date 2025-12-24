import React, { useState, useMemo } from 'react';
import { POLLINATOR_SPECIES } from '../config';
import { AlertTriangle, MapPin, Target, TrendingUp, Zap, Download, ChevronDown, ChevronUp, CheckCircle, XCircle, Navigation, Users, Leaf } from 'lucide-react';

interface Garden {
  id: string;
  name: string;
  lat: number;
  lng: number;
  score: number;
  plants?: string[];
}

interface GapZone {
  id: string;
  lat: number;
  lng: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  potentialConnections: number;
  nearbyGardens: string[];
  recommendedSize: string;
  estimatedImpact: number;
  targetSpecies: string[];
}

interface CorridorSegment {
  from: Garden;
  to: Garden;
  distance: number;
  status: 'connected' | 'weak' | 'broken';
  species: string[];
}

interface CorridorGapAnalysisProps {
  gardens: Garden[];
  corridors: CorridorSegment[];
  cityBounds?: [number, number, number, number];
  onSelectGap?: (gap: GapZone) => void;
  onExport?: (data: any) => void;
}

// Generate from central config
const SPECIES_RANGES = Object.fromEntries(
  POLLINATOR_SPECIES.map(s => [s.id, { range: s.flightRange, name: s.name, icon: s.icon }])
);

const PRIORITY_CONFIG = {
  critical: { color: '#dc2626', bg: '#fef2f2', label: 'Critical', score: 100 },
  high: { color: '#f59e0b', bg: '#fffbeb', label: 'High', score: 75 },
  medium: { color: '#3b82f6', bg: '#eff6ff', label: 'Medium', score: 50 },
  low: { color: '#22c55e', bg: '#f0fdf4', label: 'Low', score: 25 },
};

const CorridorGapAnalysis: React.FC<CorridorGapAnalysisProps> = ({
  gardens,
  corridors,
  cityBounds,
  onSelectGap,
  onExport
}) => {
  const [expandedSection, setExpandedSection] = useState<string>('gaps');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('butterfly');
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);

  // Calculate network statistics
  const networkStats = useMemo(() => {
    const totalGardens = gardens.length;
    const connectedGardens = new Set<string>();
    let totalConnections = 0;
    let weakConnections = 0;
    let brokenConnections = 0;

    corridors.forEach(c => {
      connectedGardens.add(c.from.id);
      connectedGardens.add(c.to.id);
      totalConnections++;
      if (c.status === 'weak') weakConnections++;
      if (c.status === 'broken') brokenConnections++;
    });

    const isolatedGardens = gardens.filter(g => !connectedGardens.has(g.id));
    const connectivity = totalGardens > 0 ? (connectedGardens.size / totalGardens) * 100 : 0;

    // Calculate hub gardens (3+ connections)
    const connectionCounts: Record<string, number> = {};
    corridors.forEach(c => {
      connectionCounts[c.from.id] = (connectionCounts[c.from.id] || 0) + 1;
      connectionCounts[c.to.id] = (connectionCounts[c.to.id] || 0) + 1;
    });
    const hubs = Object.entries(connectionCounts).filter(([_, count]) => count >= 3);

    return {
      totalGardens,
      connectedGardens: connectedGardens.size,
      isolatedGardens,
      connectivity,
      totalConnections,
      weakConnections,
      brokenConnections,
      hubs: hubs.length,
      avgConnections: totalGardens > 0 ? totalConnections / totalGardens : 0
    };
  }, [gardens, corridors]);

  // Identify gap zones
  const gapZones = useMemo(() => {
    const gaps: GapZone[] = [];
    const speciesRange = SPECIES_RANGES[selectedSpecies as keyof typeof SPECIES_RANGES]?.range || 800;
    
    // Find isolated gardens and recommend nearby locations
    networkStats.isolatedGardens.forEach((garden, idx) => {
      // Find potential connection points
      const nearbyGardens = gardens.filter(g => {
        if (g.id === garden.id) return false;
        const dist = calculateDistance(garden.lat, garden.lng, g.lat, g.lng);
        return dist < speciesRange * 3; // Within 3x range
      });

      if (nearbyGardens.length > 0) {
        // Recommend midpoint between isolated garden and nearest cluster
        const nearest = nearbyGardens[0];
        const midLat = (garden.lat + nearest.lat) / 2;
        const midLng = (garden.lng + nearest.lng) / 2;

        gaps.push({
          id: `gap-isolated-${idx}`,
          lat: midLat,
          lng: midLng,
          priority: 'critical',
          reason: `Connect isolated garden "${garden.name}" to network`,
          potentialConnections: nearbyGardens.length + 1,
          nearbyGardens: [garden.name, ...nearbyGardens.slice(0, 3).map(g => g.name)],
          recommendedSize: 'Medium (200-500 sq ft)',
          estimatedImpact: 85,
          targetSpecies: [SPECIES_RANGES[selectedSpecies as keyof typeof SPECIES_RANGES]?.name || 'Pollinators']
        });
      }
    });

    // Find weak corridor segments that need strengthening
    corridors.filter(c => c.status === 'weak').forEach((corridor, idx) => {
      const midLat = (corridor.from.lat + corridor.to.lat) / 2;
      const midLng = (corridor.from.lng + corridor.to.lng) / 2;

      gaps.push({
        id: `gap-weak-${idx}`,
        lat: midLat,
        lng: midLng,
        priority: 'high',
        reason: `Strengthen weak corridor between "${corridor.from.name}" and "${corridor.to.name}"`,
        potentialConnections: 2,
        nearbyGardens: [corridor.from.name, corridor.to.name],
        recommendedSize: 'Small (100-200 sq ft)',
        estimatedImpact: 65,
        targetSpecies: corridor.species
      });
    });

    // Find broken corridors
    corridors.filter(c => c.status === 'broken').forEach((corridor, idx) => {
      const midLat = (corridor.from.lat + corridor.to.lat) / 2;
      const midLng = (corridor.from.lng + corridor.to.lng) / 2;

      gaps.push({
        id: `gap-broken-${idx}`,
        lat: midLat,
        lng: midLng,
        priority: 'critical',
        reason: `Repair broken corridor - distance exceeds ${selectedSpecies} range`,
        potentialConnections: 2,
        nearbyGardens: [corridor.from.name, corridor.to.name],
        recommendedSize: 'Medium (200-500 sq ft)',
        estimatedImpact: 90,
        targetSpecies: corridor.species
      });
    });

    // Find coverage gaps in grid
    if (gardens.length > 0) {
      const gridSize = speciesRange / 111000; // Convert meters to degrees (approx)
      const bounds = cityBounds || calculateBounds(gardens);
      
      for (let lat = bounds[1]; lat < bounds[3]; lat += gridSize * 2) {
        for (let lng = bounds[0]; lng < bounds[2]; lng += gridSize * 2) {
          const nearbyCount = gardens.filter(g => 
            calculateDistance(lat, lng, g.lat, g.lng) < speciesRange
          ).length;

          if (nearbyCount === 0) {
            // Check if there are gardens nearby but just out of range
            const nearbyOutOfRange = gardens.filter(g =>
              calculateDistance(lat, lng, g.lat, g.lng) < speciesRange * 2
            );

            if (nearbyOutOfRange.length >= 2) {
              gaps.push({
                id: `gap-coverage-${lat.toFixed(4)}-${lng.toFixed(4)}`,
                lat,
                lng,
                priority: nearbyOutOfRange.length >= 3 ? 'high' : 'medium',
                reason: 'Coverage gap - no gardens within pollinator flight range',
                potentialConnections: nearbyOutOfRange.length,
                nearbyGardens: nearbyOutOfRange.slice(0, 4).map(g => g.name),
                recommendedSize: nearbyOutOfRange.length >= 3 ? 'Large (500+ sq ft)' : 'Medium (200-500 sq ft)',
                estimatedImpact: 40 + nearbyOutOfRange.length * 10,
                targetSpecies: [SPECIES_RANGES[selectedSpecies as keyof typeof SPECIES_RANGES]?.name || 'Pollinators']
              });
            }
          }
        }
      }
    }

    // Sort by priority and impact
    return gaps.sort((a, b) => {
      const priorityDiff = PRIORITY_CONFIG[a.priority].score - PRIORITY_CONFIG[b.priority].score;
      if (priorityDiff !== 0) return priorityDiff * -1;
      return b.estimatedImpact - a.estimatedImpact;
    }).slice(0, 20); // Limit to top 20
  }, [gardens, corridors, networkStats, selectedSpecies, cityBounds]);

  // Calculate impact if all gaps were filled
  const projectedImpact = useMemo(() => {
    const criticalCount = gapZones.filter(g => g.priority === 'critical').length;
    const highCount = gapZones.filter(g => g.priority === 'high').length;
    
    return {
      connectivityIncrease: Math.min(100, networkStats.connectivity + criticalCount * 8 + highCount * 4),
      newConnections: gapZones.reduce((sum, g) => sum + g.potentialConnections, 0),
      isolatedResolved: networkStats.isolatedGardens.length
    };
  }, [gapZones, networkStats]);

  const filteredGaps = showOnlyActionable 
    ? gapZones.filter(g => g.priority === 'critical' || g.priority === 'high')
    : gapZones;

  const exportAnalysis = () => {
    const report = `CORRIDOR GAP ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}
Species Focus: ${SPECIES_RANGES[selectedSpecies as keyof typeof SPECIES_RANGES]?.name}

═══════════════════════════════════════════════════════
NETWORK HEALTH SUMMARY
═══════════════════════════════════════════════════════
Total Gardens: ${networkStats.totalGardens}
Connected Gardens: ${networkStats.connectedGardens}
Isolated Gardens: ${networkStats.isolatedGardens.length}
Network Connectivity: ${networkStats.connectivity.toFixed(1)}%
Total Corridors: ${networkStats.totalConnections}
Weak Corridors: ${networkStats.weakConnections}
Broken Corridors: ${networkStats.brokenConnections}
Hub Gardens (3+ connections): ${networkStats.hubs}

═══════════════════════════════════════════════════════
GAP ANALYSIS - ${gapZones.length} PRIORITY ZONES IDENTIFIED
═══════════════════════════════════════════════════════
${gapZones.map((gap, i) => `
${i + 1}. [${gap.priority.toUpperCase()}] ${gap.reason}
   Location: ${gap.lat.toFixed(5)}, ${gap.lng.toFixed(5)}
   Potential Connections: ${gap.potentialConnections}
   Nearby Gardens: ${gap.nearbyGardens.join(', ')}
   Recommended Size: ${gap.recommendedSize}
   Estimated Impact: ${gap.estimatedImpact}%
`).join('')}

═══════════════════════════════════════════════════════
PROJECTED IMPACT (IF ALL GAPS FILLED)
═══════════════════════════════════════════════════════
Connectivity Increase: ${networkStats.connectivity.toFixed(1)}% → ${projectedImpact.connectivityIncrease.toFixed(1)}%
New Connections Created: ${projectedImpact.newConnections}
Isolated Gardens Resolved: ${projectedImpact.isolatedResolved}

═══════════════════════════════════════════════════════
RECOMMENDATIONS
═══════════════════════════════════════════════════════
1. Prioritize CRITICAL gaps to connect isolated gardens
2. Focus on areas with 3+ potential connections for maximum ROI
3. Coordinate with landowners in identified gap zones
4. Consider public spaces (parks, schools) for new pollinator gardens
5. Target ${SPECIES_RANGES[selectedSpecies as keyof typeof SPECIES_RANGES]?.range}m spacing for ${selectedSpecies} corridors
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corridor-gap-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (onExport) onExport({ stats: networkStats, gaps: gapZones, projected: projectedImpact });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fefefe' }}>
      {/* Header */}
      <div style={{ padding: 16, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Target size={24} />
          <h3 style={{ margin: 0, fontWeight: 700 }}>Corridor Gap Analysis</h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
          Identify priority areas for new pollinator habitat
        </p>
      </div>

      {/* Species Selector */}
      <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(SPECIES_RANGES).map(([key, species]) => (
          <button
            key={key}
            onClick={() => setSelectedSpecies(key)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: 'none',
              backgroundColor: selectedSpecies === key ? '#3b82f6' : '#f3f4f6',
              color: selectedSpecies === key ? 'white' : '#666',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>{species.icon}</span>
            {species.name} ({species.range}m)
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Network Health Section */}
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'health' ? '' : 'health')}
            style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', backgroundColor: 'white', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="#3b82f6" />
              <span style={{ fontWeight: 600 }}>Network Health</span>
              <span style={{
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: networkStats.connectivity > 70 ? '#dcfce7' : networkStats.connectivity > 40 ? '#fef3c7' : '#fef2f2',
                color: networkStats.connectivity > 70 ? '#166534' : networkStats.connectivity > 40 ? '#92400e' : '#dc2626'
              }}>
                {networkStats.connectivity.toFixed(0)}% Connected
              </span>
            </div>
            {expandedSection === 'health' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {expandedSection === 'health' && (
            <div style={{ padding: '0 12px 12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{networkStats.connectedGardens}</div>
                  <div style={{ fontSize: 11, color: '#166534' }}>Connected Gardens</div>
                </div>
                <div style={{ padding: 12, backgroundColor: networkStats.isolatedGardens.length > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: networkStats.isolatedGardens.length > 0 ? '#dc2626' : '#166534' }}>{networkStats.isolatedGardens.length}</div>
                  <div style={{ fontSize: 11, color: networkStats.isolatedGardens.length > 0 ? '#dc2626' : '#166534' }}>Isolated Gardens</div>
                </div>
                <div style={{ padding: 12, backgroundColor: '#eff6ff', borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>{networkStats.hubs}</div>
                  <div style={{ fontSize: 11, color: '#1e40af' }}>Hub Gardens</div>
                </div>
                <div style={{ padding: 12, backgroundColor: networkStats.weakConnections > 0 ? '#fffbeb' : '#f0fdf4', borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: networkStats.weakConnections > 0 ? '#92400e' : '#166534' }}>{networkStats.weakConnections}</div>
                  <div style={{ fontSize: 11, color: networkStats.weakConnections > 0 ? '#92400e' : '#166534' }}>Weak Corridors</div>
                </div>
              </div>
              
              {/* Isolated Gardens List */}
              {networkStats.isolatedGardens.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#dc2626' }}>
                    <XCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Isolated Gardens:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {networkStats.isolatedGardens.map(g => (
                      <span key={g.id} style={{ fontSize: 11, backgroundColor: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 4 }}>
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gap Zones Section */}
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'gaps' ? '' : 'gaps')}
            style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', backgroundColor: 'white', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <span style={{ fontWeight: 600 }}>Priority Gap Zones</span>
              <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, backgroundColor: '#fef3c7', color: '#92400e' }}>
                {gapZones.length} identified
              </span>
            </div>
            {expandedSection === 'gaps' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {expandedSection === 'gaps' && (
            <div style={{ padding: '0 12px 12px' }}>
              {/* Filter */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showOnlyActionable}
                    onChange={() => setShowOnlyActionable(!showOnlyActionable)}
                  />
                  Show only Critical & High priority
                </label>
              </div>

              {/* Gap List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredGaps.map((gap, idx) => {
                  const config = PRIORITY_CONFIG[gap.priority];
                  return (
                    <div
                      key={gap.id}
                      onClick={() => onSelectGap?.(gap)}
                      style={{
                        padding: 12,
                        backgroundColor: config.bg,
                        borderRadius: 8,
                        border: `1px solid ${config.color}40`,
                        cursor: onSelectGap ? 'pointer' : 'default'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: config.color,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: config.color,
                              color: 'white'
                            }}>
                              {config.label.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 11, color: '#666' }}>
                              Impact: {gap.estimatedImpact}%
                            </span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{gap.reason}</div>
                          <div style={{ fontSize: 11, color: '#666' }}>
                            <div>📍 {gap.lat.toFixed(5)}, {gap.lng.toFixed(5)}</div>
                            <div>🔗 {gap.potentialConnections} potential connections</div>
                            <div>📐 {gap.recommendedSize}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {gap.nearbyGardens.map(name => (
                                <span key={name} style={{ fontSize: 10, backgroundColor: 'white', padding: '1px 4px', borderRadius: 3 }}>{name}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Projected Impact Section */}
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'impact' ? '' : 'impact')}
            style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', backgroundColor: 'white', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="#22c55e" />
              <span style={{ fontWeight: 600 }}>Projected Impact</span>
            </div>
            {expandedSection === 'impact' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {expandedSection === 'impact' && (
            <div style={{ padding: '0 12px 12px' }}>
              <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#166534', marginBottom: 8 }}>If all {gapZones.length} gap zones are filled:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>
                      {networkStats.connectivity.toFixed(0)}% → {projectedImpact.connectivityIncrease.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 10, color: '#166534' }}>Connectivity</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>+{projectedImpact.newConnections}</div>
                    <div style={{ fontSize: 10, color: '#166534' }}>New Connections</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>{projectedImpact.isolatedResolved}</div>
                    <div style={{ fontSize: 10, color: '#166534' }}>Gardens Connected</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                * Projections based on {SPECIES_RANGES[selectedSpecies as keyof typeof SPECIES_RANGES]?.name} flight range of {SPECIES_RANGES[selectedSpecies as keyof typeof SPECIES_RANGES]?.range}m
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
        <button
          onClick={exportAnalysis}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Download size={16} />
          Export Report
        </button>
      </div>
    </div>
  );
};

// Helper functions
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateBounds(gardens: Garden[]): [number, number, number, number] {
  if (gardens.length === 0) return [-112.1, 40.5, -111.7, 40.9];
  
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  gardens.forEach(g => {
    if (g.lng < minLng) minLng = g.lng;
    if (g.lat < minLat) minLat = g.lat;
    if (g.lng > maxLng) maxLng = g.lng;
    if (g.lat > maxLat) maxLat = g.lat;
  });
  
  return [minLng, minLat, maxLng, maxLat];
}

export default CorridorGapAnalysis;
