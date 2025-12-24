import React, { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Calendar, MapPin, Download, ChevronDown, ChevronUp,
  PieChart, Activity, Target, Layers, FileText, Database, FlaskConical
} from 'lucide-react';

interface Observation {
  id: string;
  species: string;
  taxon: string;
  lat: number;
  lng: number;
  date: string;
  observer?: string;
}

interface AcademicAnalyticsProps {
  observations: Observation[];
  dateRange?: [Date, Date];
  selectedTaxa?: string[];
  onExport?: (data: any, format: string) => void;
}

// Statistical helper functions
const calculateMean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const calculateStdDev = (arr: number[]) => {
  if (arr.length < 2) return 0;
  const mean = calculateMean(arr);
  return Math.sqrt(arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (arr.length - 1));
};
const calculateMedian = (arr: number[]) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Diversity indices
const calculateShannonDiversity = (counts: number[]): number => {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return -counts.reduce((sum, n) => {
    if (n === 0) return sum;
    const p = n / total;
    return sum + p * Math.log(p);
  }, 0);
};

const calculateSimpsonDiversity = (counts: number[]): number => {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 1) return 0;
  const sumNiNi1 = counts.reduce((sum, n) => sum + n * (n - 1), 0);
  return 1 - sumNiNi1 / (total * (total - 1));
};

const calculatePielousEvenness = (counts: number[]): number => {
  const H = calculateShannonDiversity(counts);
  const S = counts.filter(c => c > 0).length;
  if (S <= 1) return 1;
  return H / Math.log(S);
};

// Spatial statistics
const calculateMoransI = (points: { lat: number; lng: number; value: number }[]): number => {
  if (points.length < 3) return 0;
  
  const n = points.length;
  const mean = calculateMean(points.map(p => p.value));
  
  let numerator = 0;
  let denominator = 0;
  let W = 0;
  
  for (let i = 0; i < n; i++) {
    denominator += Math.pow(points[i].value - mean, 2);
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const dist = Math.sqrt(
          Math.pow(points[i].lat - points[j].lat, 2) + 
          Math.pow(points[i].lng - points[j].lng, 2)
        );
        const w = 1 / (dist + 0.0001);
        W += w;
        numerator += w * (points[i].value - mean) * (points[j].value - mean);
      }
    }
  }
  
  if (denominator === 0 || W === 0) return 0;
  return (n / W) * (numerator / denominator);
};

const AcademicAnalytics: React.FC<AcademicAnalyticsProps> = ({
  observations,
  dateRange,
  selectedTaxa,
  onExport
}) => {
  const [activeTab, setActiveTab] = useState<'diversity' | 'temporal' | 'spatial' | 'phenology' | 'export'>('diversity');
  const [expandedSection, setExpandedSection] = useState<string>('summary');

  // Core statistics
  const stats = useMemo(() => {
    const speciesCounts: Record<string, number> = {};
    const taxonCounts: Record<string, number> = {};
    const monthCounts: Record<number, number> = {};
    const yearCounts: Record<number, number> = {};
    const observerCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    
    observations.forEach(obs => {
      // Species
      speciesCounts[obs.species] = (speciesCounts[obs.species] || 0) + 1;
      // Taxon
      taxonCounts[obs.taxon] = (taxonCounts[obs.taxon] || 0) + 1;
      // Date parsing
      const date = new Date(obs.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const dayKey = obs.date.split('T')[0];
      
      monthCounts[month] = (monthCounts[month] || 0) + 1;
      yearCounts[year] = (yearCounts[year] || 0) + 1;
      dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
      
      if (obs.observer) {
        observerCounts[obs.observer] = (observerCounts[obs.observer] || 0) + 1;
      }
    });

    const speciesCountsArr = Object.values(speciesCounts);
    const uniqueSpecies = Object.keys(speciesCounts).length;
    const totalObs = observations.length;

    return {
      totalObservations: totalObs,
      uniqueSpecies,
      speciesCounts,
      taxonCounts,
      monthCounts,
      yearCounts,
      dailyCounts,
      observerCounts,
      uniqueObservers: Object.keys(observerCounts).length,
      
      // Diversity indices
      shannonH: calculateShannonDiversity(speciesCountsArr),
      simpsonD: calculateSimpsonDiversity(speciesCountsArr),
      evenness: calculatePielousEvenness(speciesCountsArr),
      
      // Basic stats
      obsPerSpecies: totalObs / (uniqueSpecies || 1),
      singletons: speciesCountsArr.filter(c => c === 1).length,
      doubletons: speciesCountsArr.filter(c => c === 2).length,
    };
  }, [observations]);

  // Temporal trends
  const temporalAnalysis = useMemo(() => {
    const years = Object.keys(stats.yearCounts).map(Number).sort();
    const yearlyData = years.map(y => ({
      year: y,
      count: stats.yearCounts[y],
      species: new Set(observations.filter(o => new Date(o.date).getFullYear() === y).map(o => o.species)).size
    }));

    // Calculate trend (simple linear regression)
    if (yearlyData.length < 2) return { yearlyData, trend: 0, trendDirection: 'stable' as const };
    
    const xMean = calculateMean(yearlyData.map(d => d.year));
    const yMean = calculateMean(yearlyData.map(d => d.count));
    
    let numerator = 0;
    let denominator = 0;
    yearlyData.forEach(d => {
      numerator += (d.year - xMean) * (d.count - yMean);
      denominator += Math.pow(d.year - xMean, 2);
    });
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const percentChange = yMean !== 0 ? (slope / yMean) * 100 : 0;

    return {
      yearlyData,
      trend: slope,
      percentChange,
      trendDirection: slope > 0.5 ? 'increasing' as const : slope < -0.5 ? 'decreasing' as const : 'stable' as const
    };
  }, [observations, stats]);

  // Phenology analysis
  const phenologyAnalysis = useMemo(() => {
    const speciesMonths: Record<string, Set<number>> = {};
    const speciesFirstObs: Record<string, { month: number; day: number }> = {};
    const speciesLastObs: Record<string, { month: number; day: number }> = {};
    
    observations.forEach(obs => {
      const date = new Date(obs.date);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      if (!speciesMonths[obs.species]) speciesMonths[obs.species] = new Set();
      speciesMonths[obs.species].add(month);
      
      const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
      
      if (!speciesFirstObs[obs.species] || dayOfYear < speciesFirstObs[obs.species].day) {
        speciesFirstObs[obs.species] = { month, day: dayOfYear };
      }
      if (!speciesLastObs[obs.species] || dayOfYear > speciesLastObs[obs.species].day) {
        speciesLastObs[obs.species] = { month, day: dayOfYear };
      }
    });

    // Calculate peak months
    const monthTotals = Array(12).fill(0);
    observations.forEach(obs => {
      const month = new Date(obs.date).getMonth();
      monthTotals[month]++;
    });
    
    const peakMonth = monthTotals.indexOf(Math.max(...monthTotals)) + 1;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      speciesSeasonality: Object.entries(speciesMonths).map(([species, months]) => ({
        species,
        months: Array.from(months).sort((a, b) => a - b),
        seasonLength: months.size
      })).sort((a, b) => b.seasonLength - a.seasonLength),
      peakMonth,
      peakMonthName: monthNames[peakMonth - 1],
      monthlyDistribution: monthTotals.map((count, i) => ({ month: monthNames[i], count })),
      speciesFirstObs,
      speciesLastObs
    };
  }, [observations]);

  // Spatial analysis
  const spatialAnalysis = useMemo(() => {
    if (observations.length < 3) return { moransI: 0, clustering: 'insufficient data' };
    
    // Grid the area and count observations per cell
    const gridSize = 0.01; // ~1km cells
    const cellCounts: Record<string, { lat: number; lng: number; count: number }> = {};
    
    observations.forEach(obs => {
      const cellLat = Math.floor(obs.lat / gridSize) * gridSize;
      const cellLng = Math.floor(obs.lng / gridSize) * gridSize;
      const key = `${cellLat},${cellLng}`;
      
      if (!cellCounts[key]) {
        cellCounts[key] = { lat: cellLat, lng: cellLng, count: 0 };
      }
      cellCounts[key].count++;
    });

    const cells = Object.values(cellCounts).map(c => ({ ...c, value: c.count }));
    const moransI = calculateMoransI(cells);

    // Calculate centroid
    const centroid = {
      lat: calculateMean(observations.map(o => o.lat)),
      lng: calculateMean(observations.map(o => o.lng))
    };

    // Calculate spread (standard distance)
    const distances = observations.map(o => 
      Math.sqrt(Math.pow(o.lat - centroid.lat, 2) + Math.pow(o.lng - centroid.lng, 2))
    );
    const standardDistance = calculateStdDev(distances);

    return {
      moransI,
      clustering: moransI > 0.3 ? 'clustered' : moransI < -0.3 ? 'dispersed' : 'random',
      centroid,
      standardDistance,
      gridCells: cells.length,
      hotspots: cells.filter(c => c.count > calculateMean(cells.map(x => x.count)) + 2 * calculateStdDev(cells.map(x => x.count)))
    };
  }, [observations]);

  // Species accumulation curve data
  const accumulationCurve = useMemo(() => {
    const seenSpecies = new Set<string>();
    const curve: { n: number; species: number }[] = [];
    
    // Sample at regular intervals
    const step = Math.max(1, Math.floor(observations.length / 50));
    
    observations.forEach((obs, i) => {
      seenSpecies.add(obs.species);
      if (i % step === 0 || i === observations.length - 1) {
        curve.push({ n: i + 1, species: seenSpecies.size });
      }
    });

    return curve;
  }, [observations]);

  // Export functions
  const exportCSV = () => {
    const headers = ['id', 'species', 'taxon', 'latitude', 'longitude', 'date', 'observer'];
    const rows = observations.map(o => [
      o.id, o.species, o.taxon, o.lat, o.lng, o.date, o.observer || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pollinator-observations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDarwinCore = () => {
    const dwc = observations.map(o => ({
      occurrenceID: o.id,
      scientificName: o.species,
      higherClassification: o.taxon,
      decimalLatitude: o.lat,
      decimalLongitude: o.lng,
      eventDate: o.date,
      recordedBy: o.observer || 'Unknown',
      basisOfRecord: 'HumanObservation',
      institutionCode: 'UtahPollinatorPath'
    }));
    
    const json = JSON.stringify(dwc, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `darwin-core-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportStatsSummary = () => {
    const report = `
BIODIVERSITY STATISTICS REPORT
Utah Pollinator Path - Academic Analysis
Generated: ${new Date().toLocaleString()}

═══════════════════════════════════════════════════════
DATASET SUMMARY
═══════════════════════════════════════════════════════
Total Observations: ${stats.totalObservations.toLocaleString()}
Unique Species: ${stats.uniqueSpecies}
Unique Observers: ${stats.uniqueObservers}
Observations per Species (mean): ${stats.obsPerSpecies.toFixed(2)}
Singletons (species with 1 obs): ${stats.singletons}
Doubletons (species with 2 obs): ${stats.doubletons}

═══════════════════════════════════════════════════════
DIVERSITY INDICES
═══════════════════════════════════════════════════════
Shannon Diversity Index (H'): ${stats.shannonH.toFixed(4)}
  - Interpretation: ${stats.shannonH > 3 ? 'High' : stats.shannonH > 2 ? 'Moderate' : 'Low'} diversity

Simpson's Diversity Index (1-D): ${stats.simpsonD.toFixed(4)}
  - Probability that two randomly selected individuals are different species
  
Pielou's Evenness (J'): ${stats.evenness.toFixed(4)}
  - Range: 0 (one dominant species) to 1 (perfectly even)
  - Interpretation: ${stats.evenness > 0.8 ? 'Highly even' : stats.evenness > 0.5 ? 'Moderately even' : 'Uneven'} distribution

═══════════════════════════════════════════════════════
TEMPORAL ANALYSIS
═══════════════════════════════════════════════════════
Years Covered: ${temporalAnalysis.yearlyData.length > 0 ? `${temporalAnalysis.yearlyData[0].year} - ${temporalAnalysis.yearlyData[temporalAnalysis.yearlyData.length - 1].year}` : 'N/A'}
Trend Direction: ${temporalAnalysis.trendDirection.toUpperCase()}
Annual Change Rate: ${(temporalAnalysis.percentChange || 0).toFixed(2)}%

Yearly Breakdown:
${temporalAnalysis.yearlyData.map(d => `  ${d.year}: ${d.count.toLocaleString()} observations, ${d.species} species`).join('\n')}

═══════════════════════════════════════════════════════
PHENOLOGY
═══════════════════════════════════════════════════════
Peak Activity Month: ${phenologyAnalysis.peakMonthName}

Monthly Distribution:
${phenologyAnalysis.monthlyDistribution.map(m => `  ${m.month}: ${m.count.toLocaleString()}`).join('\n')}

Species with Longest Activity Periods:
${phenologyAnalysis.speciesSeasonality.slice(0, 10).map(s => 
  `  ${s.species}: ${s.seasonLength} months (${s.months.map(m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]).join(', ')})`
).join('\n')}

═══════════════════════════════════════════════════════
SPATIAL ANALYSIS
═══════════════════════════════════════════════════════
Moran's I: ${spatialAnalysis.moransI.toFixed(4)}
  - Interpretation: ${spatialAnalysis.clustering}
  - Values > 0 indicate clustering, < 0 indicate dispersion

Centroid: ${(spatialAnalysis.centroid?.lat || 0).toFixed(5)}, ${(spatialAnalysis.centroid?.lng || 0).toFixed(5)}
Standard Distance: ${((spatialAnalysis.standardDistance || 0) * 111).toFixed(2)} km
Grid Cells Occupied: ${spatialAnalysis.gridCells}
Hot Spots Identified: ${(spatialAnalysis.hotspots?.length || 0)}

═══════════════════════════════════════════════════════
TAXONOMIC BREAKDOWN
═══════════════════════════════════════════════════════
${Object.entries(stats.taxonCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([taxon, count]) => `${taxon}: ${count.toLocaleString()} (${((count/stats.totalObservations)*100).toFixed(1)}%)`)
  .join('\n')}

═══════════════════════════════════════════════════════
TOP 20 SPECIES BY OBSERVATION COUNT
═══════════════════════════════════════════════════════
${Object.entries(stats.speciesCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([species, count], i) => `${i+1}. ${species}: ${count.toLocaleString()}`)
  .join('\n')}

═══════════════════════════════════════════════════════
METHODOLOGY NOTES
═══════════════════════════════════════════════════════
- Shannon H' = -Σ(pi × ln(pi)) where pi is proportion of species i
- Simpson's D = 1 - Σ(ni(ni-1))/(N(N-1)) where ni is count of species i
- Moran's I calculated using inverse distance weighting on 1km grid cells
- Species accumulation curve based on observation order (consider randomization for publication)

Report generated by Utah Pollinator Path Academic Analytics
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biodiversity-stats-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'diversity', label: 'Diversity', icon: PieChart },
    { id: 'temporal', label: 'Temporal', icon: TrendingUp },
    { id: 'spatial', label: 'Spatial', icon: MapPin },
    { id: 'phenology', label: 'Phenology', icon: Calendar },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fefefe' }}>
      {/* Header */}
      <div style={{ padding: 16, background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FlaskConical size={24} />
          <div>
            <h3 style={{ margin: 0, fontWeight: 700 }}>Academic Analytics</h3>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
              {stats.totalObservations.toLocaleString()} observations • {stats.uniqueSpecies} species
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: activeTab === tab.id ? '#7c3aed' : '#666'
            }}
          >
            <tab.icon size={16} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Diversity Tab */}
        {activeTab === 'diversity' && (
          <div>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 16, backgroundColor: '#faf5ff', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#7c3aed' }}>{stats.shannonH.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#7c3aed' }}>Shannon H'</div>
              </div>
              <div style={{ padding: 16, backgroundColor: '#f0fdf4', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{stats.simpsonD.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#22c55e' }}>Simpson's D</div>
              </div>
              <div style={{ padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{stats.evenness.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#3b82f6' }}>Evenness J'</div>
              </div>
              <div style={{ padding: 16, backgroundColor: '#fef3c7', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{stats.uniqueSpecies}</div>
                <div style={{ fontSize: 11, color: '#d97706' }}>Species Richness</div>
              </div>
            </div>

            {/* Interpretation */}
            <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📊 Interpretation</div>
              <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Shannon H' = {stats.shannonH.toFixed(3)}</strong>: 
                  {stats.shannonH > 3 ? ' High diversity - rich species community with relatively even abundance.' :
                   stats.shannonH > 2 ? ' Moderate diversity - typical for semi-urban pollinator communities.' :
                   ' Lower diversity - may indicate habitat disturbance or early succession.'}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Simpson's D = {stats.simpsonD.toFixed(3)}</strong>: 
                  {stats.simpsonD > 0.8 ? ' Very high probability that two random individuals are different species.' :
                   stats.simpsonD > 0.5 ? ' Moderate dominance by common species.' :
                   ' Community dominated by few abundant species.'}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Evenness J' = {stats.evenness.toFixed(3)}</strong>: 
                  {stats.evenness > 0.8 ? ' Highly even distribution - no strongly dominant species.' :
                   stats.evenness > 0.5 ? ' Moderate evenness - some species more common than others.' :
                   ' Low evenness - few species dominate the community.'}
                </p>
              </div>
            </div>

            {/* Species Accumulation Preview */}
            <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📈 Species Accumulation</div>
              <div style={{ height: 100, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                {accumulationCurve.slice(0, 30).map((point, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      backgroundColor: '#7c3aed',
                      height: `${(point.species / stats.uniqueSpecies) * 100}%`,
                      borderRadius: '2px 2px 0 0',
                      minWidth: 4
                    }}
                    title={`${point.n} obs: ${point.species} species`}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', marginTop: 4 }}>
                <span>0 observations</span>
                <span>{stats.totalObservations.toLocaleString()} observations</span>
              </div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 8 }}>
                Singletons: {stats.singletons} ({((stats.singletons/stats.uniqueSpecies)*100).toFixed(1)}%) • 
                Doubletons: {stats.doubletons} ({((stats.doubletons/stats.uniqueSpecies)*100).toFixed(1)}%)
              </div>
            </div>
          </div>
        )}

        {/* Temporal Tab */}
        {activeTab === 'temporal' && (
          <div>
            {/* Trend Summary */}
            <div style={{ 
              padding: 16, 
              backgroundColor: temporalAnalysis.trendDirection === 'increasing' ? '#f0fdf4' : 
                              temporalAnalysis.trendDirection === 'decreasing' ? '#fef2f2' : '#f9fafb',
              borderRadius: 12, 
              marginBottom: 16,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Overall Trend</div>
              <div style={{ 
                fontSize: 24, 
                fontWeight: 700, 
                color: temporalAnalysis.trendDirection === 'increasing' ? '#22c55e' : 
                       temporalAnalysis.trendDirection === 'decreasing' ? '#ef4444' : '#6b7280'
              }}>
                {temporalAnalysis.trendDirection === 'increasing' ? '📈 Increasing' :
                 temporalAnalysis.trendDirection === 'decreasing' ? '📉 Decreasing' : '➡️ Stable'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {(temporalAnalysis.percentChange || 0) > 0 ? '+' : ''}{(temporalAnalysis.percentChange || 0).toFixed(1)}% per year
              </div>
            </div>

            {/* Yearly Chart */}
            <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Annual Observations</div>
              <div style={{ height: 150, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                {temporalAnalysis.yearlyData.map((d, i) => {
                  const maxCount = Math.max(...temporalAnalysis.yearlyData.map(x => x.count));
                  return (
                    <div key={d.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: 9, color: '#666', marginBottom: 2 }}>{d.count}</div>
                      <div
                        style={{
                          width: '100%',
                          backgroundColor: '#7c3aed',
                          height: `${(d.count / maxCount) * 120}px`,
                          borderRadius: '4px 4px 0 0',
                          minHeight: 4
                        }}
                      />
                      <div style={{ fontSize: 9, color: '#666', marginTop: 4, transform: 'rotate(-45deg)' }}>
                        {d.year.toString().slice(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Species per Year */}
            <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Species Detected per Year</div>
              {temporalAnalysis.yearlyData.slice(-10).map(d => (
                <div key={d.year} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, width: 40 }}>{d.year}</span>
                  <div style={{ flex: 1, height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${(d.species / stats.uniqueSpecies) * 100}%`,
                      backgroundColor: '#22c55e',
                      borderRadius: 4
                    }} />
                  </div>
                  <span style={{ fontSize: 11, width: 30, textAlign: 'right' }}>{d.species}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spatial Tab */}
        {activeTab === 'spatial' && (
          <div>
            {/* Moran's I */}
            <div style={{ 
              padding: 16, 
              backgroundColor: spatialAnalysis.clustering === 'clustered' ? '#fef3c7' : 
                              spatialAnalysis.clustering === 'dispersed' ? '#dbeafe' : '#f9fafb',
              borderRadius: 12, 
              marginBottom: 16,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Spatial Pattern</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#374151' }}>
                {spatialAnalysis.clustering === 'clustered' ? '🎯 Clustered' :
                 spatialAnalysis.clustering === 'dispersed' ? '🔀 Dispersed' : '🎲 Random'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Moran's I = {spatialAnalysis.moransI.toFixed(4)}
              </div>
            </div>

            {/* Spatial Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#666' }}>Grid Cells Occupied</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{spatialAnalysis.gridCells}</div>
              </div>
              <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#666' }}>Hot Spots</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{(spatialAnalysis.hotspots?.length || 0)}</div>
              </div>
              <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 10, color: '#666' }}>Standard Distance (spread)</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{((spatialAnalysis.standardDistance || 0) * 111).toFixed(2)} km</div>
              </div>
            </div>

            {/* Interpretation */}
            <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>🗺️ Spatial Interpretation</div>
              <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Moran's I</strong> measures spatial autocorrelation. Values range from -1 (dispersed) to +1 (clustered), with 0 indicating random distribution.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  Your value of <strong>{spatialAnalysis.moransI.toFixed(3)}</strong> indicates 
                  {spatialAnalysis.moransI > 0.3 ? ' significant clustering - observations tend to occur near other observations. This may reflect habitat patchiness or recorder bias.' :
                   spatialAnalysis.moransI < -0.3 ? ' significant dispersion - observations are more evenly spread than expected by chance.' :
                   ' near-random spatial distribution.'}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Hot spots</strong> are grid cells with observation counts more than 2 standard deviations above the mean.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Phenology Tab */}
        {activeTab === 'phenology' && (
          <div>
            {/* Peak Month */}
            <div style={{ padding: 16, backgroundColor: '#fef3c7', borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#92400e', marginBottom: 4 }}>Peak Activity</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{phenologyAnalysis.peakMonthName}</div>
            </div>

            {/* Monthly Distribution */}
            <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Monthly Distribution</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
                {phenologyAnalysis.monthlyDistribution.map((m, i) => {
                  const max = Math.max(...phenologyAnalysis.monthlyDistribution.map(x => x.count));
                  const height = max > 0 ? (m.count / max) * 100 : 0;
                  return (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '100%',
                          backgroundColor: i === phenologyAnalysis.peakMonth - 1 ? '#f59e0b' : '#fde68a',
                          height: `${height}%`,
                          borderRadius: '4px 4px 0 0',
                          minHeight: 2
                        }}
                      />
                      <div style={{ fontSize: 8, color: '#666', marginTop: 4 }}>{m.month}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Species Seasonality */}
            <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Species Activity Periods</div>
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                {phenologyAnalysis.speciesSeasonality.slice(0, 15).map(s => (
                  <div key={s.species} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{s.species}</div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {Array(12).fill(0).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: 8,
                            backgroundColor: s.months.includes(i + 1) ? '#22c55e' : '#e5e7eb',
                            borderRadius: 2
                          }}
                          title={['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
              Export your data and analysis results in various formats for further research.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={exportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Database size={24} color="#22c55e" />
                <div>
                  <div style={{ fontWeight: 600 }}>Export CSV</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Raw observation data for R, Python, Excel</div>
                </div>
              </button>

              <button
                onClick={exportDarwinCore}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Layers size={24} color="#3b82f6" />
                <div>
                  <div style={{ fontWeight: 600 }}>Darwin Core JSON</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Standard biodiversity data format for GBIF</div>
                </div>
              </button>

              <button
                onClick={exportStatsSummary}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <FileText size={24} color="#7c3aed" />
                <div>
                  <div style={{ fontWeight: 600 }}>Statistics Report</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Complete analysis with methodology notes</div>
                </div>
              </button>
            </div>

            {/* Citation */}
            <div style={{ marginTop: 24, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📝 Suggested Citation</div>
              <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', lineHeight: 1.6 }}>
                Utah Pollinator Path. ({new Date().getFullYear()}). Pollinator observation data from the Wasatch Front, Utah. 
                Retrieved {new Date().toLocaleDateString()} from Utah Pollinator Path platform.
                Dataset includes {stats.totalObservations.toLocaleString()} observations of {stats.uniqueSpecies} species.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicAnalytics;
