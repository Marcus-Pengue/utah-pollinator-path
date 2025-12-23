import React, { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Calendar, MapPin, Leaf, Target, Sliders } from 'lucide-react';

interface FilterConfig {
  // Taxa
  taxa: Record<string, boolean>;
  // Time
  yearRange: [number, number] | null;
  selectedYear: number | null;
  selectedSeason: string | null;
  // Species
  selectedSpecies: string | null;
  // Location
  selectedCity: string | null;
  // Layers
  showOpportunityZones: boolean;
  showGardens: boolean;
  // Advanced
  minConnectivity: number;
  minObservations: number;
}

interface FilterPanelProps {
  filters: FilterConfig;
  onFilterChange: (key: keyof FilterConfig, value: any) => void;
  onClearAll: () => void;
  availableTaxa: { id: string; name: string; icon: string; color: string }[];
  availableCities: string[];
  availableYears: number[];
  totalObservations: number;
  filteredObservations: number;
}

const SEASONS = [
  { id: 'spring', name: 'Spring', icon: '🌸' },
  { id: 'summer', name: 'Summer', icon: '☀️' },
  { id: 'fall', name: 'Fall', icon: '🍂' },
  { id: 'winter', name: 'Winter', icon: '❄️' },
];

const TIME_PRESETS = [
  { id: 'all', name: 'All Time', range: null },
  { id: 'recent', name: 'Last 5 Years', range: [2020, 2025] as [number, number] },
  { id: 'decade', name: '2010s', range: [2010, 2019] as [number, number] },
  { id: 'historic', name: 'Pre-2000', range: [1871, 1999] as [number, number] },
];

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onClearAll,
  availableTaxa,
  availableCities,
  availableYears,
  totalObservations,
  filteredObservations,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'taxa' | 'time' | 'location' | 'layers'>('taxa');

  // Count active filters
  const activeFilterCount = [
    Object.values(filters.taxa).some(v => !v),
    filters.yearRange !== null,
    filters.selectedYear !== null,
    filters.selectedSeason !== null,
    filters.selectedSpecies !== null,
    filters.selectedCity !== null,
    filters.minConnectivity > 0,
    filters.minObservations > 0,
  ].filter(Boolean).length;

  // Get active filter chips
  const getActiveChips = () => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (filters.selectedSpecies) {
      chips.push({
        key: 'species',
        label: `🔍 ${filters.selectedSpecies}`,
        onRemove: () => onFilterChange('selectedSpecies', null),
      });
    }

    if (filters.selectedCity) {
      chips.push({
        key: 'city',
        label: `📍 ${filters.selectedCity}`,
        onRemove: () => onFilterChange('selectedCity', null),
      });
    }

    if (filters.selectedYear) {
      chips.push({
        key: 'year',
        label: `📅 ${filters.selectedYear}`,
        onRemove: () => onFilterChange('selectedYear', null),
      });
    }

    if (filters.yearRange) {
      chips.push({
        key: 'yearRange',
        label: `📅 ${filters.yearRange[0]}-${filters.yearRange[1]}`,
        onRemove: () => onFilterChange('yearRange', null),
      });
    }

    if (filters.selectedSeason) {
      const season = SEASONS.find(s => s.id === filters.selectedSeason);
      chips.push({
        key: 'season',
        label: `${season?.icon} ${season?.name}`,
        onRemove: () => onFilterChange('selectedSeason', null),
      });
    }

    // Hidden taxa
    const hiddenTaxa = availableTaxa.filter(t => !filters.taxa[t.id]);
    if (hiddenTaxa.length > 0 && hiddenTaxa.length < availableTaxa.length) {
      chips.push({
        key: 'taxa',
        label: `👁️ ${availableTaxa.length - hiddenTaxa.length}/${availableTaxa.length} taxa`,
        onRemove: () => {
          const allVisible: Record<string, boolean> = {};
          availableTaxa.forEach(t => allVisible[t.id] = true);
          onFilterChange('taxa', allVisible);
        },
      });
    }

    return chips;
  };

  const chips = getActiveChips();

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      width: 320,
      background: 'white',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      overflow: 'hidden',
      maxHeight: isExpanded ? '80vh' : 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Filter size={18} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Filters</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {filteredObservations.toLocaleString()} / {totalObservations.toLocaleString()} observations
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeFilterCount > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
            }}>
              {activeFilterCount} active
            </span>
          )}
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Active Filter Chips */}
          {chips.length > 0 && (
            <div style={{
              padding: '8px 12px',
              background: '#f0f9ff',
              borderBottom: '1px solid #e0f2fe',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              {chips.map(chip => (
                <span
                  key={chip.key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    background: 'white',
                    border: '1px solid #bfdbfe',
                    borderRadius: 16,
                    fontSize: 11,
                    color: '#1e40af',
                  }}
                >
                  {chip.label}
                  <X
                    size={12}
                    style={{ cursor: 'pointer', opacity: 0.6 }}
                    onClick={(e) => { e.stopPropagation(); chip.onRemove(); }}
                  />
                </span>
              ))}
              {chips.length > 1 && (
                <button
                  onClick={onClearAll}
                  style={{
                    padding: '4px 8px',
                    background: '#fee2e2',
                    border: 'none',
                    borderRadius: 16,
                    fontSize: 11,
                    color: '#991b1b',
                    cursor: 'pointer',
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
          }}>
            {[
              { id: 'taxa', icon: <Leaf size={14} />, label: 'Taxa' },
              { id: 'time', icon: <Calendar size={14} />, label: 'Time' },
              { id: 'location', icon: <MapPin size={14} />, label: 'Location' },
              { id: 'layers', icon: <Target size={14} />, label: 'Layers' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  border: 'none',
                  background: activeTab === tab.id ? '#eff6ff' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: activeTab === tab.id ? '#1d4ed8' : '#6b7280',
                  fontSize: 11,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '12px', maxHeight: 300, overflowY: 'auto' }}>
            {/* Taxa Tab */}
            {activeTab === 'taxa' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Toggle wildlife types</span>
                  <button
                    onClick={() => {
                      const allSame = Object.values(filters.taxa).every(v => v === Object.values(filters.taxa)[0]);
                      const newValue = allSame && Object.values(filters.taxa)[0];
                      const updated: Record<string, boolean> = {};
                      availableTaxa.forEach(t => updated[t.id] = !newValue);
                      onFilterChange('taxa', updated);
                    }}
                    style={{
                      fontSize: 11,
                      color: '#3b82f6',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Toggle All
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {availableTaxa.map(taxon => (
                    <button
                      key={taxon.id}
                      onClick={() => {
                        const updated = { ...filters.taxa, [taxon.id]: !filters.taxa[taxon.id] };
                        onFilterChange('taxa', updated);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: filters.taxa[taxon.id] ? `2px solid ${taxon.color}` : '2px solid #e5e7eb',
                        background: filters.taxa[taxon.id] ? `${taxon.color}15` : '#f9fafb',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: filters.taxa[taxon.id] ? '#1f2937' : '#9ca3af',
                        opacity: filters.taxa[taxon.id] ? 1 : 0.6,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{taxon.icon}</span>
                      {taxon.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Tab */}
            {activeTab === 'time' && (
              <div>
                {/* Quick Presets */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Quick Select</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TIME_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onFilterChange('yearRange', preset.range);
                          onFilterChange('selectedYear', null);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: JSON.stringify(filters.yearRange) === JSON.stringify(preset.range) 
                            ? '#3b82f6' : '#f3f4f6',
                          color: JSON.stringify(filters.yearRange) === JSON.stringify(preset.range)
                            ? 'white' : '#374151',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Season Filter */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Season</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {SEASONS.map(season => (
                      <button
                        key={season.id}
                        onClick={() => onFilterChange('selectedSeason', 
                          filters.selectedSeason === season.id ? null : season.id
                        )}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: 6,
                          border: 'none',
                          background: filters.selectedSeason === season.id ? '#3b82f6' : '#f3f4f6',
                          color: filters.selectedSeason === season.id ? 'white' : '#374151',
                          fontSize: 11,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 16 }}>{season.icon}</div>
                        {season.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Year Selector */}
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Specific Year</div>
                  <select
                    value={filters.selectedYear || ''}
                    onChange={(e) => {
                      const year = e.target.value ? parseInt(e.target.value) : null;
                      onFilterChange('selectedYear', year);
                      if (year) onFilterChange('yearRange', null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Any Year</option>
                    {availableYears.slice().reverse().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Filter by City</div>
                <select
                  value={filters.selectedCity || ''}
                  onChange={(e) => onFilterChange('selectedCity', e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 13,
                    cursor: 'pointer',
                    marginBottom: 12,
                  }}
                >
                  <option value="">All Cities</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>

                {filters.selectedSpecies && (
                  <div style={{
                    padding: '10px 12px',
                    background: '#f0fdf4',
                    borderRadius: 8,
                    border: '1px solid #bbf7d0',
                  }}>
                    <div style={{ fontSize: 11, color: '#166534', marginBottom: 4 }}>Active Species Filter</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{filters.selectedSpecies}</span>
                      <button
                        onClick={() => onFilterChange('selectedSpecies', null)}
                        style={{
                          padding: '4px 8px',
                          background: '#166534',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Layers Tab */}
            {activeTab === 'layers' && (
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Map Layers</div>
                
                {/* Opportunity Zones Toggle */}
                <div
                  onClick={() => onFilterChange('showOpportunityZones', !filters.showOpportunityZones)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: filters.showOpportunityZones ? '#fef2f2' : '#f9fafb',
                    border: filters.showOpportunityZones ? '1px solid #fca5a5' : '1px solid #e5e7eb',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Opportunity Zones</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>Priority planting areas</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      background: '#fef3c7',
                      color: '#92400e',
                      borderRadius: 4,
                    }}>
                      Preview
                    </span>
                    <div style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      background: filters.showOpportunityZones ? '#ef4444' : '#d1d5db',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 2,
                        left: filters.showOpportunityZones ? 18 : 2,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Gardens Toggle */}
                <div
                  onClick={() => onFilterChange('showGardens', !filters.showGardens)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: filters.showGardens ? '#f0fdf4' : '#f9fafb',
                    border: filters.showGardens ? '1px solid #86efac' : '1px solid #e5e7eb',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🌻</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Registered Gardens</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>Community habitats</div>
                    </div>
                  </div>
                  <div style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: filters.showGardens ? '#22c55e' : '#d1d5db',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: 2,
                      left: filters.showGardens ? 18 : 2,
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <div
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: '#f9fafb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={14} color="#6b7280" />
              <span style={{ fontSize: 12, color: '#6b7280' }}>Advanced Filters</span>
            </div>
            {showAdvanced ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
          </div>

          {/* Advanced Filters Content */}
          {showAdvanced && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
              {/* Minimum Connectivity */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Min Connectivity Index*</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{filters.minConnectivity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.minConnectivity}
                  onChange={(e) => onFilterChange('minConnectivity', parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Minimum Observations */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Min Observations per Cell</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{filters.minObservations}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={filters.minObservations}
                  onChange={(e) => onFilterChange('minObservations', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                *Connectivity index is unvalidated placeholder data
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FilterPanel;
