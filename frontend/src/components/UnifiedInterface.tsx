import React, { useState } from 'react';
import {
  Layers, Filter, Download, MapPin, Leaf, Bug, Bird, TreeDeciduous,
  Target, Users, Trophy, Camera, Shield, BarChart3, FileText, Settings,
  ChevronDown, ChevronUp, Eye, EyeOff, Zap, Map, Grid3X3, Circle
} from 'lucide-react';
import ModeSelector, { AppMode } from './ModeSelector';
export type { AppMode };

interface UnifiedInterfaceProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  // Map controls
  showOpportunityZones: boolean;
  onToggleOpportunityZones: (show: boolean) => void;
  showGardens: boolean;
  onToggleGardens: (show: boolean) => void;
  showObservations: boolean;
  onToggleObservations: (show: boolean) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (show: boolean) => void;
  showGrid: boolean;
  onToggleGrid: (show: boolean) => void;
  showCorridors?: boolean;
  onToggleCorridors?: (show: boolean) => void;
  corridorSpecies?: string;
  onCorridorSpeciesChange?: (species: string) => void;
  // Taxa filters
  selectedTaxa: string[];
  onTaxaChange: (taxa: string[]) => void;
  // City filter
  selectedCity: string;
  cities: string[];
  onCityChange: (city: string) => void;
  // Year range
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  // Stats
  observationCount: number;
  userObservationCount?: number;
  gardenCount: number;
  // Actions
  onOpenLeaderboard: () => void;
  onOpenDashboard: () => void;
  onStartCapture: () => void;
  onRegisterGarden: () => void;
  onExportData: () => void;
  hasRegisteredGarden: boolean;
  // Compare mode
  compareMode?: boolean;
  onToggleCompare?: (enabled: boolean) => void;
  leftYearRange?: [number, number];
  rightYearRange?: [number, number];
  onLeftYearChange?: (range: [number, number]) => void;
  onRightYearChange?: (range: [number, number]) => void;
}

const TAXA = [
  { id: 'Insecta', label: 'Insects', icon: '🐝', color: '#f59e0b' },
  { id: 'Aves', label: 'Birds', icon: '🐦', color: '#3b82f6' },
  { id: 'Plantae', label: 'Plants', icon: '🌿', color: '#22c55e' },
  { id: 'Mammalia', label: 'Mammals', icon: '🦊', color: '#f97316' },
  { id: 'Reptilia', label: 'Reptiles', icon: '🦎', color: '#84cc16' },
  { id: 'Amphibia', label: 'Amphibians', icon: '🐸', color: '#06b6d4' },
  { id: 'Arachnida', label: 'Arachnids', icon: '🕷️', color: '#6b7280' },
  { id: 'Fungi', label: 'Fungi', icon: '🍄', color: '#a855f7' },
];

const UnifiedInterface: React.FC<UnifiedInterfaceProps> = (props) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    layers: true,
    taxa: false,
    filters: false,
    actions: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Mode-specific features
  const modeFeatures = {
    government: {
      showOpportunityZones: true,
      showHeatmap: true,
      showGrid: true,
      showLeaderboard: true,
      showExport: true,
      showRegister: false,
      showCapture: false,
      showDashboard: false,
      primaryColor: '#1e40af',
      accentColor: '#dbeafe'
    },
    homeowner: {
      showOpportunityZones: true,
      showHeatmap: false,
      showGrid: false,
      showLeaderboard: true,
      showExport: false,
      showRegister: true,
      showCapture: true,
      showDashboard: true,
      primaryColor: '#166534',
      accentColor: '#dcfce7'
    },
    academic: {
      showOpportunityZones: true,
      showHeatmap: true,
      showGrid: true,
      showLeaderboard: true,
      showExport: true,
      showRegister: false,
      showCapture: false,
      showDashboard: false,
      primaryColor: '#7c3aed',
      accentColor: '#ede9fe'
    }
  };

  const features = modeFeatures[props.mode];

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: 16,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxHeight: 'calc(100vh - 120px)',
      width: 260
    }}>
      {/* Mode Selector */}
      <ModeSelector 
        currentMode={props.mode} 
        onModeChange={props.onModeChange} 
      />

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '10px 12px',
        backgroundColor: 'white',
        borderRadius: 10,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: features.primaryColor }}>
            {props.mode === 'homeowner' && props.userObservationCount !== undefined 
              ? props.userObservationCount.toLocaleString()
              : props.observationCount.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: '#666' }}>
            {props.mode === 'homeowner' ? 'My Observations' : 'Observations'}
          </div>
        </div>
        <div style={{ width: 1, backgroundColor: '#e5e7eb' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: features.primaryColor }}>
            {props.gardenCount}
          </div>
          <div style={{ fontSize: 9, color: '#666' }}>Gardens</div>
        </div>
      </div>

      {/* Control Panel */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: 12,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        overflowY: 'auto'
      }}>
        {/* Map Layers Section */}
        <div>
          <button
            onClick={() => toggleSection('layers')}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              backgroundColor: expandedSections.layers ? features.accentColor : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} color={features.primaryColor} />
              <span style={{ fontWeight: 600, fontSize: 13, color: features.primaryColor }}>Map Layers</span>
            </div>
            {expandedSections.layers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expandedSections.layers && (
            <div style={{ padding: 12 }}>
              {/* Observations */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={props.showObservations}
                  onChange={(e) => {
                    props.onToggleObservations(e.target.checked);
                    // When turning off observations, clear taxa
                    if (!e.target.checked) {
                      props.onTaxaChange([]);
                    }
                  }}
                  style={{ width: 16, height: 16 }}
                />
                <Circle size={14} color="#f59e0b" fill="#f59e0b" />
                <span style={{ fontSize: 13 }}>Wildlife Observations</span>
              </label>

              {/* Gardens */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={props.showGardens}
                  onChange={(e) => props.onToggleGardens(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <Leaf size={14} color="#22c55e" />
                <span style={{ fontSize: 13 }}>Registered Gardens</span>
              </label>

              {/* Opportunity Zones */}
              {features.showOpportunityZones && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={props.showOpportunityZones}
                    onChange={(e) => props.onToggleOpportunityZones(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <Target size={14} color="#ef4444" />
                  <span style={{ fontSize: 13 }}>Opportunity Zones</span>
                </label>
              )}

              {/* Heatmap - Gov & Academic */}
              {features.showHeatmap && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={props.showHeatmap}
                    onChange={(e) => props.onToggleHeatmap(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <Zap size={14} color="#8b5cf6" />
                  <span style={{ fontSize: 13 }}>Density Heatmap</span>
                </label>
              )}

              {/* Grid - Gov & Academic */}
              {features.showGrid && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={props.showGrid}
                    onChange={(e) => props.onToggleGrid(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <Grid3X3 size={14} color="#6b7280" />
                  <span style={{ fontSize: 13 }}>Analysis Grid</span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Corridors - Government/Academic only */}
        {(props.mode === 'government' || props.mode === 'academic') && props.onToggleCorridors && (
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={props.showCorridors || false}
                onChange={(e) => props.onToggleCorridors?.(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: features.primaryColor }}
              />
              <span style={{ fontSize: 13 }}>🔗 Pollinator Corridors</span>
            </label>
            {props.showCorridors && props.onCorridorSpeciesChange && (
              <select
                value={props.corridorSpecies || 'all'}
                onChange={(e) => props.onCorridorSpeciesChange?.(e.target.value)}
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 12,
                  backgroundColor: 'white',
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                <option value="all">🦋 All Pollinators (500m)</option>
                <option value="bee">🐝 Bees (300m range)</option>
                <option value="butterfly">🦋 Butterflies (800m range)</option>
                <option value="hummingbird">🐦 Hummingbirds (1.2km range)</option>
                <option value="moth">🌙 Moths (500m range)</option>
              </select>
            )}
          </div>
        )}

        {/* Taxa Filters Section */}
        <div>
          <button
            onClick={() => toggleSection('taxa')}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              backgroundColor: expandedSections.taxa ? features.accentColor : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bug size={16} color={features.primaryColor} />
              <span style={{ fontWeight: 600, fontSize: 13, color: features.primaryColor }}>Taxa Filter</span>
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                backgroundColor: features.accentColor,
                borderRadius: 10,
                color: features.primaryColor
              }}>
                {props.selectedTaxa.length}/{TAXA.length}
              </span>
            </div>
            {expandedSections.taxa ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expandedSections.taxa && (
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <button
                  onClick={() => {
                    props.onTaxaChange(TAXA.map(t => t.id));
                    // Ensure observations layer is on when selecting taxa
                    if (!props.showObservations) {
                      props.onToggleObservations(true);
                    }
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={() => props.onTaxaChange([])}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Clear All
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {TAXA.map(taxon => {
                  const isSelected = props.selectedTaxa.includes(taxon.id);
                  return (
                    <button
                      key={taxon.id}
                      onClick={() => {
                        if (isSelected) {
                          props.onTaxaChange(props.selectedTaxa.filter(t => t !== taxon.id));
                        } else {
                          props.onTaxaChange([...props.selectedTaxa, taxon.id]);
                        }
                      }}
                      style={{
                        padding: '8px',
                        border: isSelected ? `2px solid ${taxon.color}` : '1px solid #e5e7eb',
                        borderRadius: 8,
                        backgroundColor: isSelected ? `${taxon.color}15` : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11
                      }}
                    >
                      <span>{taxon.icon}</span>
                      <span style={{ color: isSelected ? taxon.color : '#374151' }}>{taxon.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Location & Time Filters */}
        <div>
          <button
            onClick={() => toggleSection('filters')}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              backgroundColor: expandedSections.filters ? features.accentColor : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={16} color={features.primaryColor} />
              <span style={{ fontWeight: 600, fontSize: 13, color: features.primaryColor }}>Filters</span>
            </div>
            {expandedSections.filters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expandedSections.filters && (
            <div style={{ padding: 12 }}>
              {/* City Filter */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#666' }}>
                  City
                </label>
                <select
                  value={props.selectedCity}
                  onChange={(e) => props.onCityChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 13
                  }}
                >
                  <option value="">All Cities</option>
                  {props.cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Year Range */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#666' }}>
                  Year Range: {props.yearRange[0]} - {props.yearRange[1]}
                </label>
                <input
                  type="range"
                  min={2000}
                  max={2025}
                  value={props.yearRange[0]}
                  onChange={(e) => props.onYearRangeChange([parseInt(e.target.value), props.yearRange[1]])}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Compare Mode - Government & Academic only */}
        {(props.mode === 'government' || props.mode === 'academic') && props.onToggleCompare && (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: 10, 
            padding: 12,
            marginBottom: 12,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: props.compareMode ? 12 : 0
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>📊 Compare Years</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={props.compareMode || false}
                  onChange={(e) => props.onToggleCompare?.(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 12 }}>Enable</span>
              </label>
            </div>
            
            {props.compareMode && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 4 }}>Left Map</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="number"
                      min={2000}
                      max={2025}
                      value={props.leftYearRange?.[0] || 2000}
                      onChange={(e) => props.onLeftYearChange?.([Number(e.target.value), props.leftYearRange?.[1] || 2020])}
                      style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
                    />
                    <span style={{ color: '#999' }}>-</span>
                    <input
                      type="number"
                      min={2000}
                      max={2025}
                      value={props.leftYearRange?.[1] || 2020}
                      onChange={(e) => props.onLeftYearChange?.([props.leftYearRange?.[0] || 2000, Number(e.target.value)])}
                      style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 4 }}>Right Map</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="number"
                      min={2000}
                      max={2025}
                      value={props.rightYearRange?.[0] || 2021}
                      onChange={(e) => props.onRightYearChange?.([Number(e.target.value), props.rightYearRange?.[1] || 2025])}
                      style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
                    />
                    <span style={{ color: '#999' }}>-</span>
                    <input
                      type="number"
                      min={2000}
                      max={2025}
                      value={props.rightYearRange?.[1] || 2025}
                      onChange={(e) => props.onRightYearChange?.([props.rightYearRange?.[0] || 2021, Number(e.target.value)])}
                      style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Section */}
        <div>
          <button
            onClick={() => toggleSection('actions')}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              backgroundColor: expandedSections.actions ? features.accentColor : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color={features.primaryColor} />
              <span style={{ fontWeight: 600, fontSize: 13, color: features.primaryColor }}>Actions</span>
            </div>
            {expandedSections.actions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expandedSections.actions && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Leaderboard */}
              {features.showLeaderboard && (
                <button
                  onClick={props.onOpenLeaderboard}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  <Trophy size={16} />
                  Leaderboard
                </button>
              )}

              {/* Register Garden - Homeowner */}
              {features.showRegister && !props.hasRegisteredGarden && (
                <button
                  onClick={props.onRegisterGarden}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  <Leaf size={16} />
                  Register Garden
                </button>
              )}

              {/* My Dashboard - Homeowner */}
              {features.showDashboard && (
                <button
                  onClick={props.onOpenDashboard}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  <BarChart3 size={16} />
                  My Dashboard
                </button>
              )}

              {/* Log Observation - Homeowner */}
              {features.showCapture && (
                <button
                  onClick={props.onStartCapture}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: '2px solid #f59e0b',
                    backgroundColor: 'white',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  <Camera size={16} />
                  Log Observation
                </button>
              )}

              {/* Export Data - Gov & Academic */}
              {features.showExport && (
                <button
                  onClick={props.onExportData}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: `2px solid ${features.primaryColor}`,
                    backgroundColor: 'white',
                    color: features.primaryColor,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  <Download size={16} />
                  Export Data
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      <div style={{
        fontSize: 10,
        color: '#9ca3af',
        textAlign: 'center',
        padding: '4px 0'
      }}>
        Press <kbd style={{ 
          padding: '2px 6px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: 4,
          fontFamily: 'monospace'
        }}>H</kbd> to hide controls
      </div>
    </div>
  );
};

export default UnifiedInterface;
