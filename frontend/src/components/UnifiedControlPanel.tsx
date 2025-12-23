import React, { useState, useEffect } from 'react';
import { 
  Filter, X, ChevronDown, ChevronUp, Calendar, MapPin, 
  Layers, Trophy, BarChart3, Play, Pause, GitCompare,
  Eye, EyeOff, Keyboard, Download
} from 'lucide-react';

interface UnifiedControlPanelProps {
  // Data
  wildlifeFilters: { id: string; name: string; icon: string; color: string; visible: boolean }[];
  gardens: any[];
  opportunityData: any;
  wildlifeFeatures: any[];
  filteredFeatures: any[];
  
  // Time state
  selectedYear: number | null;
  selectedSeason: string | null;
  minYear: number;
  maxYear: number;
  playing: boolean;
  playSpeed: number;
  compareMode: boolean;
  leftYearRange: [number, number];
  rightYearRange: [number, number];
  
  // Filter state
  selectedSpecies: string | null;
  selectedCity: string | null;
  showOpportunityZones: boolean;
  showGardens: boolean;
  viewMode: 'grid' | 'points';
  
  // Setters
  onToggleTaxon: (id: string) => void;
  onSetYear: (year: number | null) => void;
  onSetSeason: (season: string | null) => void;
  onSetPlaying: (playing: boolean) => void;
  onSetPlaySpeed: (speed: number) => void;
  onSetCompareMode: (mode: boolean) => void;
  onSetLeftYearRange: (range: [number, number]) => void;
  onSetRightYearRange: (range: [number, number]) => void;
  onSetSpecies: (species: string | null) => void;
  onSetCity: (city: string | null) => void;
  onSetShowOpportunityZones: (show: boolean) => void;
  onSetShowGardens: (show: boolean) => void;
  onSetViewMode: (mode: 'grid' | 'points') => void;
  onClearAll: () => void;
}

const SEASONS = [
  { id: 'spring', name: 'Spring', icon: '🌸', months: [3, 4, 5] },
  { id: 'summer', name: 'Summer', icon: '☀️', months: [6, 7, 8] },
  { id: 'fall', name: 'Fall', icon: '🍂', months: [9, 10, 11] },
  { id: 'winter', name: 'Winter', icon: '❄️', months: [12, 1, 2] },
];

const UnifiedControlPanel: React.FC<UnifiedControlPanelProps> = (props) => {
  const [isVisible, setIsVisible] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>('taxa');
  const [isMinimized, setIsMinimized] = useState(false);

  // Keyboard shortcut: H to hide/show
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setIsVisible(v => !v);
      }
      if (e.key === 'Escape') {
        setIsMinimized(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get city stats from opportunity data
  const cityStats = React.useMemo(() => {
    if (!props.opportunityData?.features) return [];
    const stats: Record<string, { zones: number; gardens: number }> = {};
    
    props.opportunityData.features.forEach((f: any) => {
      const city = f.properties?.nearest_location || 'Unknown';
      if (!stats[city]) stats[city] = { zones: 0, gardens: 0 };
      stats[city].zones++;
    });
    
    props.gardens.forEach((g: any) => {
      const city = g.properties?.city || 'Unknown';
      if (stats[city]) stats[city].gardens++;
    });
    
    return Object.entries(stats)
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.zones - a.zones);
  }, [props.opportunityData, props.gardens]);

  const activeFilterCount = [
    props.wildlifeFilters.some(f => !f.visible),
    props.selectedYear !== null,
    props.selectedSeason !== null,
    props.selectedSpecies !== null,
    props.selectedCity !== null,
  ].filter(Boolean).length;

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '10px 16px',
          background: 'white',
          border: 'none',
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <Filter size={16} />
        Controls
        {activeFilterCount > 0 && (
          <span style={{
            background: '#3b82f6',
            color: 'white',
            padding: '2px 6px',
            borderRadius: 10,
            fontSize: 10,
          }}>
            {activeFilterCount}
          </span>
        )}
        <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>[H]</span>
      </button>
    );
  }

  const renderSection = (id: string, icon: React.ReactNode, title: string, content: React.ReactNode) => {
    const isActive = activeSection === id;
    return (
      <div style={{ borderBottom: '1px solid #f0f0f0' }}>
        <div
          onClick={() => setActiveSection(isActive ? null : id)}
          style={{
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: isActive ? '#f8fafc' : 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}>
            {icon}
            {title}
          </div>
          {isActive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
        {isActive && (
          <div style={{ padding: '8px 12px 12px', background: '#fafafa' }}>
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      width: isMinimized ? 'auto' : 300,
      background: 'white',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      overflow: 'hidden',
      maxHeight: isMinimized ? 'auto' : '85vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            🐝 Utah Pollinator Path
          </div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
            {props.filteredFeatures.length.toLocaleString()} / {props.wildlifeFeatures.length.toLocaleString()} observations
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 4,
              padding: '4px 8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: 10,
            }}
          >
            {isMinimized ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 4,
              padding: '4px 8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: 10,
            }}
          >
            [H]
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Active Filters Bar */}
          {(props.selectedSpecies || props.selectedCity || props.selectedYear || props.selectedSeason) && (
            <div style={{
              padding: '6px 12px',
              background: '#ecfdf5',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              alignItems: 'center',
            }}>
              {props.selectedSpecies && (
                <span style={{ fontSize: 10, background: 'white', padding: '2px 6px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔍 {props.selectedSpecies}
                  <X size={10} style={{ cursor: 'pointer' }} onClick={() => props.onSetSpecies(null)} />
                </span>
              )}
              {props.selectedCity && (
                <span style={{ fontSize: 10, background: 'white', padding: '2px 6px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📍 {props.selectedCity}
                  <X size={10} style={{ cursor: 'pointer' }} onClick={() => props.onSetCity(null)} />
                </span>
              )}
              {props.selectedYear && (
                <span style={{ fontSize: 10, background: 'white', padding: '2px 6px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📅 {props.selectedYear}
                  <X size={10} style={{ cursor: 'pointer' }} onClick={() => props.onSetYear(null)} />
                </span>
              )}
              {props.selectedSeason && (
                <span style={{ fontSize: 10, background: 'white', padding: '2px 6px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {SEASONS.find(s => s.id === props.selectedSeason)?.icon}
                  <X size={10} style={{ cursor: 'pointer' }} onClick={() => props.onSetSeason(null)} />
                </span>
              )}
              <button
                onClick={props.onClearAll}
                style={{ fontSize: 9, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Scrollable Content */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Taxa Section */}
            {renderSection('taxa', <Layers size={14} />, 'Wildlife Types', (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#666' }}>Toggle visibility</span>
                  <button
                    onClick={() => {
                      const allVisible = props.wildlifeFilters.every(f => f.visible);
                      props.wildlifeFilters.forEach(f => props.onToggleTaxon(f.id));
                    }}
                    style={{ fontSize: 9, color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Toggle All
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {props.wildlifeFilters.map(taxon => (
                    <button
                      key={taxon.id}
                      onClick={() => props.onToggleTaxon(taxon.id)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: taxon.visible ? `2px solid ${taxon.color}` : '2px solid #e5e7eb',
                        background: taxon.visible ? `${taxon.color}15` : '#f9fafb',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        opacity: taxon.visible ? 1 : 0.5,
                      }}
                    >
                      <span>{taxon.icon}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{taxon.name}</span>
                      {taxon.visible ? <Eye size={10} color={taxon.color} /> : <EyeOff size={10} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Time Section */}
            {renderSection('time', <Calendar size={14} />, 'Timeline', (
              <div>
                {/* Season buttons */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Season</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => props.onSetSeason(null)}
                      style={{
                        flex: 1, padding: '6px 4px', borderRadius: 4, border: 'none',
                        background: !props.selectedSeason ? '#059669' : '#f0f0f0',
                        color: !props.selectedSeason ? 'white' : '#666',
                        cursor: 'pointer', fontSize: 10,
                      }}
                    >
                      All
                    </button>
                    {SEASONS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => props.onSetSeason(props.selectedSeason === s.id ? null : s.id)}
                        style={{
                          flex: 1, padding: '6px 4px', borderRadius: 4, border: 'none',
                          background: props.selectedSeason === s.id ? '#059669' : '#f0f0f0',
                          color: props.selectedSeason === s.id ? 'white' : '#666',
                          cursor: 'pointer', fontSize: 12,
                        }}
                      >
                        {s.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Year slider */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
                    Year: <strong>{props.selectedYear || 'All'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => props.onSetPlaying(!props.playing)}
                      style={{
                        padding: 6, border: 'none',
                        background: props.playing ? '#ef4444' : '#059669',
                        borderRadius: 4, cursor: 'pointer',
                      }}
                    >
                      {props.playing ? <Pause size={12} color="white" /> : <Play size={12} color="white" />}
                    </button>
                    <input
                      type="range"
                      min={props.minYear}
                      max={props.maxYear}
                      value={props.selectedYear || props.maxYear}
                      onChange={e => props.onSetYear(parseInt(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => props.onSetYear(null)}
                      style={{
                        padding: '4px 8px', borderRadius: 4, border: 'none',
                        background: '#f0f0f0', color: '#666', cursor: 'pointer', fontSize: 9,
                      }}
                    >
                      All
                    </button>
                  </div>
                </div>

                {/* Compare mode toggle */}
                <button
                  onClick={() => props.onSetCompareMode(!props.compareMode)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 6, border: 'none',
                    background: props.compareMode ? '#2563eb' : '#f0f0f0',
                    color: props.compareMode ? 'white' : '#666',
                    cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <GitCompare size={14} />
                  Compare Mode {props.compareMode ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}

            {/* Layers Section */}
            {renderSection('layers', <Eye size={14} />, 'Map Layers', (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => props.onSetViewMode('grid')}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 6, border: 'none',
                      background: props.viewMode === 'grid' ? '#059669' : '#f0f0f0',
                      color: props.viewMode === 'grid' ? 'white' : '#666',
                      cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => props.onSetViewMode('points')}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 6, border: 'none',
                      background: props.viewMode === 'points' ? '#059669' : '#f0f0f0',
                      color: props.viewMode === 'points' ? 'white' : '#666',
                      cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    Points
                  </button>
                </div>

                {/* Layer toggles */}
                {[
                  { key: 'zones', label: 'Opportunity Zones', icon: '🎯', active: props.showOpportunityZones, toggle: props.onSetShowOpportunityZones, badge: 'Preview' },
                  { key: 'gardens', label: 'Registered Gardens', icon: '🌻', active: props.showGardens, toggle: props.onSetShowGardens, count: props.gardens.length },
                ].map(layer => (
                  <div
                    key={layer.key}
                    onClick={() => layer.toggle(!layer.active)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '8px 10px',
                      background: layer.active ? '#ecfdf5' : '#f9fafb',
                      borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                      border: layer.active ? '1px solid #86efac' : '1px solid #e5e7eb',
                    }}
                  >
                    <span style={{ marginRight: 8, fontSize: 16 }}>{layer.icon}</span>
                    <span style={{ flex: 1, fontSize: 12 }}>{layer.label}</span>
                    {layer.badge && (
                      <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, marginRight: 6 }}>
                        {layer.badge}
                      </span>
                    )}
                    {layer.count !== undefined && (
                      <span style={{ fontSize: 10, color: '#059669', marginRight: 6 }}>{layer.count}</span>
                    )}
                    {layer.active ? <Eye size={12} color="#059669" /> : <EyeOff size={12} color="#999" />}
                  </div>
                ))}
              </div>
            ))}

            {/* Leaderboard Section */}
            {renderSection('leaderboard', <Trophy size={14} />, 'City Leaderboard', (
              <div>
                <div style={{ fontSize: 9, color: '#92400e', background: '#fef3c7', padding: '4px 8px', borderRadius: 4, marginBottom: 8 }}>
                  ⚠️ Placeholder scores - model unvalidated
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {cityStats.slice(0, 10).map((city, i) => (
                    <div
                      key={city.city}
                      onClick={() => props.onSetCity(props.selectedCity === city.city ? null : city.city)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '6px 8px',
                        background: props.selectedCity === city.city ? '#ecfdf5' : 'transparent',
                        borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                      }}
                    >
                      <span style={{ width: 20, fontSize: 12 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span style={{ flex: 1, fontSize: 11 }}>{city.city}</span>
                      <span style={{ fontSize: 10, color: '#059669' }}>{city.gardens} 🌱</span>
                      <span style={{ fontSize: 9, color: '#999', marginLeft: 8 }}>{city.zones} zones</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Export Section */}
            {renderSection('export', <Download size={14} />, 'Export Data', (
              <div>
                {/* Current Filtered View */}
                <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>
                  Current Filtered View
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <button
                    onClick={() => {
                      const data = {
                        type: 'FeatureCollection',
                        generated: new Date().toISOString(),
                        filter: { species: props.selectedSpecies, city: props.selectedCity, year: props.selectedYear, season: props.selectedSeason },
                        features: props.filteredFeatures,
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `utah-pollinator-${props.filteredFeatures.length}-obs.geojson`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                  >
                    <Download size={14} />
                    <span>GeoJSON</span>
                    <span style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>{props.filteredFeatures.length.toLocaleString()}</span>
                  </button>
                  <button
                    onClick={() => {
                      const headers = ['species', 'common_name', 'latitude', 'longitude', 'year', 'month', 'source', 'taxon'];
                      const rows = props.filteredFeatures.map((f: any) => [
                        f.properties?.species || '', f.properties?.common_name || '',
                        f.geometry?.coordinates?.[1] || '', f.geometry?.coordinates?.[0] || '',
                        f.properties?.year || '', f.properties?.month || '',
                        f.properties?.source || '', f.properties?.iconic_taxon || '',
                      ].join(','));
                      const csv = [headers.join(','), ...rows].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `utah-pollinator-${props.filteredFeatures.length}-obs.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                  >
                    <Download size={14} />
                    <span>CSV</span>
                    <span style={{ fontSize: 9, color: '#666' }}>Spreadsheet</span>
                  </button>
                </div>

                {/* Full Utah Dataset */}
                <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>
                  Full Utah Dataset (311,039 obs)
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#166534', marginBottom: 8 }}>
                    Complete statewide data for research & government use
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => window.open('https://utah-pollinator-path.onrender.com/api/downloads/full-json', '_blank')}
                      style={{ flex: 1, padding: '10px 8px', borderRadius: 6, border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                    >
                      <Download size={14} />
                      <span>GeoJSON.gz</span>
                      <span style={{ fontSize: 9, opacity: 0.8 }}>~25 MB</span>
                    </button>
                    <button
                      onClick={() => window.open('https://utah-pollinator-path.onrender.com/api/downloads/full-csv', '_blank')}
                      style={{ flex: 1, padding: '10px 8px', borderRadius: 6, border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                    >
                      <Download size={14} />
                      <span>CSV.gz</span>
                      <span style={{ fontSize: 9, opacity: 0.8 }}>~8 MB</span>
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }}>
                  📊 Sources: iNaturalist (2016-2025) + GBIF (1871-2025)<br/>
                  🔬 For academic use: cite "Utah Pollinator Path"
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '8px 12px',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            fontSize: 10,
            color: '#9ca3af',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Press [H] to hide</span>
            <span>🌻 {props.gardens.length} gardens registered</span>
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedControlPanel;
