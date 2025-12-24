import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import MapGL, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import { Layers, Eye, EyeOff, ChevronDown, ChevronUp, Play, Pause, Grid3X3, Calendar, GitCompare, Plus, Flower2, Download } from 'lucide-react';
import { api } from '../api/client';
import GardenRegistration from './GardenRegistration';

import ObservationCapture, { CapturedFrame, ObservationMetadata } from './ObservationCapture';
import INaturalistUpload from './iNaturalistUpload';

import UserDashboard from './UserDashboard';
import Leaderboard from './Leaderboard';
import AdminDashboard from './AdminDashboard';
import CorridorVisualization from './CorridorVisualization';
import CorridorGapAnalysis from './CorridorGapAnalysis';
import UnifiedInterface from './UnifiedInterface';
import { AppMode } from './ModeSelector';
import SpeciesSearch from './SpeciesSearch';

import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

interface Feature {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, any>;
}

interface GridCell {
  lat: number;
  lng: number;
  count: number;
  percentile: number;
  features: Feature[];
}

interface Garden {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: {
    id: string;
    name: string;
    size: string;
    plants: string[];
    features: string[];
    created: string;
  };
}

const WILDLIFE_FILTERS = [
  { id: 'Aves', name: 'Birds', icon: '🐦', color: '#3b82f6', visible: true },
  { id: 'Insecta', name: 'Insects', icon: '🦋', color: '#8b5cf6', visible: true },
  { id: 'Plantae', name: 'Plants', icon: '🌿', color: '#22c55e', visible: true },
  { id: 'Mammalia', name: 'Mammals', icon: '🦊', color: '#f97316', visible: true },
  { id: 'Fungi', name: 'Fungi', icon: '🍄', color: '#ef4444', visible: true },
  { id: 'Arachnida', name: 'Arachnids', icon: '🕷️', color: '#6b7280', visible: true },
  { id: 'Reptilia', name: 'Reptiles', icon: '🦎', color: '#84cc16', visible: true },
  { id: 'Amphibia', name: 'Amphibians', icon: '🐸', color: '#06b6d4', visible: true },
];

const SEASONS = [
  { id: 'spring', name: 'Spring', months: [3, 4, 5], icon: '🌸', color: '#ec4899' },
  { id: 'summer', name: 'Summer', months: [6, 7, 8], icon: '☀️', color: '#f59e0b' },
  { id: 'fall', name: 'Fall', months: [9, 10, 11], icon: '🍂', color: '#f97316' },
  { id: 'winter', name: 'Winter', months: [12, 1, 2], icon: '❄️', color: '#06b6d4' },
];

const GRID_SIZE = 0.012;


// City bounding boxes for filtering [minLng, minLat, maxLng, maxLat]
const CITY_BOUNDS: Record<string, [number, number, number, number]> = {
  'Salt Lake City': [-112.1, 40.65, -111.75, 40.85],
  'Murray': [-111.95, 40.62, -111.85, 40.72],
  'Sandy': [-111.92, 40.52, -111.80, 40.62],
  'West Valley City': [-112.1, 40.65, -111.95, 40.75],
  'Provo': [-111.75, 40.18, -111.60, 40.30],
  'Ogden': [-112.05, 41.18, -111.90, 41.28],
  'Draper': [-111.92, 40.48, -111.80, 40.56],
  'Taylorsville': [-112.0, 40.62, -111.90, 40.72],
};


function createGrid(features: Feature[]): GridCell[] {
  const cellMap: Record<string, GridCell> = {};
  features.forEach(f => {
    const [lng, lat] = f.geometry.coordinates;
    const gridLat = Math.floor(lat / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gridLng = Math.floor(lng / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
    if (cellMap[key]) {
      cellMap[key].count++;
      cellMap[key].features.push(f);
    } else {
      cellMap[key] = { lat: gridLat, lng: gridLng, count: 1, percentile: 0, features: [f] };
    }
  });
  const cells = Object.values(cellMap);
  const counts = cells.map(c => c.count).sort((a, b) => a - b);
  cells.forEach(cell => {
    cell.percentile = counts.filter(c => c <= cell.count).length / counts.length;
  });
  return cells;
}

function getGridColor(p: number): string {
  if (p >= 0.95) return '#dc2626';
  if (p >= 0.85) return '#ea580c';
  if (p >= 0.70) return '#f59e0b';
  if (p >= 0.50) return '#84cc16';
  if (p >= 0.25) return '#22c55e';
  return '#86efac';
}

const DiscoveryMap: React.FC = () => {
  const [viewState, setViewState] = useState({ latitude: 40.666, longitude: -111.897, zoom: 10 });
  const [wildlifeFilters, setWildlifeFilters] = useState(WILDLIFE_FILTERS);
  const [wildlifeFeatures, setWildlifeFeatures] = useState<Feature[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [timelinePanelOpen, setTimelinePanelOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'points'>('grid');
  
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(800);
  const [yearStats, setYearStats] = useState<Record<string, number>>({});
  
  const [compareMode, setCompareMode] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [leftYearRange, setLeftYearRange] = useState<[number, number]>([2015, 2020]);
  const [rightYearRange, setRightYearRange] = useState<[number, number]>([2020, 2025]);
  const [isDragging, setIsDragging] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Garden registration state
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [showGardens, setShowGardens] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [opportunityData, setOpportunityData] = useState<any>(null);
  const [showOpportunityZones, setShowOpportunityZones] = useState(true);
  const [minConnectivity, setMinConnectivity] = useState(0);
  const [minObservations, setMinObservations] = useState(0);
  const [registerMode, setRegisterMode] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showObservationCapture, setShowObservationCapture] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [observationMetadata, setObservationMetadata] = useState<ObservationMetadata | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('homeowner');
  const [selectedTaxa, setSelectedTaxa] = useState<string[]>(['Insecta', 'Aves', 'Plantae', 'Mammalia', 'Reptilia', 'Amphibia', 'Arachnida', 'Fungi']);
  const [showLayers, setShowLayers] = useState({ observations: true, gardens: true, opportunityZones: true, heatmap: false, grid: false, corridors: false });
  const [corridorSpecies, setCorridorSpecies] = useState('all');
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);

  // Sync selectedTaxa with wildlifeFilters visibility
  useEffect(() => {
    setWildlifeFilters(prev => prev.map(f => ({
      ...f,
      visible: selectedTaxa.includes(f.id)
    })));
  }, [selectedTaxa]);

  // Sync showLayers with individual layer states
  useEffect(() => {
    setShowGardens(showLayers.gardens);
    setShowOpportunityZones(showLayers.opportunityZones);
  }, [showLayers.gardens, showLayers.opportunityZones]);



  const [controlsVisible, setControlsVisible] = useState(true);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminKeyPresses, setAdminKeyPresses] = useState<number[]>([]);

  const mapRef = useRef<any>(null);  // Sample leaderboard data (will be replaced with real API data)
  const sampleGardens = [
    { id: 'g1', anonymousId: 'A3F2K1', city: 'Salt Lake City', score: 245, verifiedScore: 367, tier: 'Pollinator Champion', plantCount: 12, nativePlantCount: 9, fallBloomerCount: 4, observationCount: 28, referralCount: 5, verificationLevel: 'professional' as const, registeredAt: '2025-10-15' },
    { id: 'g2', anonymousId: 'B7H9M2', city: 'Salt Lake City', score: 198, verifiedScore: 247, tier: 'Habitat Hero', plantCount: 10, nativePlantCount: 7, fallBloomerCount: 3, observationCount: 15, referralCount: 2, verificationLevel: 'community' as const, registeredAt: '2025-11-02' },
    { id: 'g3', anonymousId: 'C1D4N8', city: 'Murray', score: 187, verifiedScore: 187, tier: 'Habitat Hero', plantCount: 9, nativePlantCount: 6, fallBloomerCount: 2, observationCount: 22, referralCount: 3, verificationLevel: 'unverified' as const, registeredAt: '2025-11-10' },
    { id: 'g4', anonymousId: 'D9E2P5', city: 'Sandy', score: 156, verifiedScore: 195, tier: 'Bee Friendly', plantCount: 8, nativePlantCount: 5, fallBloomerCount: 3, observationCount: 11, referralCount: 1, verificationLevel: 'community' as const, registeredAt: '2025-11-20' },
    { id: 'g5', anonymousId: 'E4F7Q1', city: 'West Valley City', score: 142, verifiedScore: 142, tier: 'Bee Friendly', plantCount: 7, nativePlantCount: 4, fallBloomerCount: 2, observationCount: 8, referralCount: 0, verificationLevel: 'unverified' as const, registeredAt: '2025-11-25' },
    { id: 'g6', anonymousId: 'F2G8R3', city: 'Provo', score: 134, verifiedScore: 134, tier: 'Bee Friendly', plantCount: 6, nativePlantCount: 5, fallBloomerCount: 2, observationCount: 14, referralCount: 2, verificationLevel: 'unverified' as const, registeredAt: '2025-12-01' },
    { id: 'g7', anonymousId: 'G5H1S9', city: 'Salt Lake City', score: 128, verifiedScore: 160, tier: 'Growing', plantCount: 5, nativePlantCount: 3, fallBloomerCount: 1, observationCount: 6, referralCount: 1, verificationLevel: 'community' as const, registeredAt: '2025-12-05' },
    { id: 'g8', anonymousId: 'H8I3T6', city: 'Ogden', score: 115, verifiedScore: 115, tier: 'Growing', plantCount: 5, nativePlantCount: 3, fallBloomerCount: 1, observationCount: 9, referralCount: 0, verificationLevel: 'unverified' as const, registeredAt: '2025-12-08' },
    { id: 'g9', anonymousId: 'I1J6U2', city: 'Murray', score: 98, verifiedScore: 98, tier: 'Growing', plantCount: 4, nativePlantCount: 2, fallBloomerCount: 1, observationCount: 4, referralCount: 0, verificationLevel: 'unverified' as const, registeredAt: '2025-12-12' },
    { id: 'g10', anonymousId: 'J4K9V7', city: 'Draper', score: 87, verifiedScore: 87, tier: 'Seedling', plantCount: 3, nativePlantCount: 2, fallBloomerCount: 0, observationCount: 2, referralCount: 0, verificationLevel: 'unverified' as const, registeredAt: '2025-12-15' },
    { id: 'g11', anonymousId: 'K7L2W4', city: 'Salt Lake City', score: 76, verifiedScore: 76, tier: 'Seedling', plantCount: 3, nativePlantCount: 1, fallBloomerCount: 0, observationCount: 3, referralCount: 1, verificationLevel: 'unverified' as const, registeredAt: '2025-12-18' },
    { id: 'g12', anonymousId: 'L9M5X1', city: 'Taylorsville', score: 65, verifiedScore: 65, tier: 'Seedling', plantCount: 2, nativePlantCount: 1, fallBloomerCount: 0, observationCount: 1, referralCount: 0, verificationLevel: 'unverified' as const, registeredAt: '2025-12-20' },
  ];

  const [userGardenData, setUserGardenData] = useState<{
    lat?: number;
    lng?: number;
    plants: string[];
    features: string[];
    size: string;
    tier: string;
    isPesticideFree: boolean;
  } | null>(null);
  const [userObservations, setUserObservations] = useState<Feature[]>([]);

  // Check for referral code in URL
  
  // Keyboard shortcut to hide controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setControlsVisible(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  // Admin access: press 'x' 5 times within 2 seconds
  useEffect(() => {
    const handleAdminKey = (e: KeyboardEvent) => {
      if (e.key === 'x' || e.key === 'X') {
        const now = Date.now();
        setAdminKeyPresses(prev => {
          const recent = [...prev, now].filter(t => now - t < 2000);
          if (recent.length >= 5) {
            setShowAdminDashboard(true);
            return [];
          }
          return recent;
        });
      }
    };
    window.addEventListener('keydown', handleAdminKey);
    return () => window.removeEventListener('keydown', handleAdminKey);
  }, []);


  // Compute filtered observation count based on selected taxa
  const filteredObservationCount = useMemo(() => {
    if (!wildlifeFeatures) return 0;
    if (selectedTaxa.length === 0) return 0;
    if (selectedTaxa.length === 8) return wildlifeFeatures.length;
    return wildlifeFeatures.filter((f: Feature) => 
      selectedTaxa.includes(f.properties?.taxon)
    ).length;
  }, [wildlifeFeatures, selectedTaxa]);


  

  // === MAP LAYER CONTROLS ===
  // City filter - fly to selected city
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    
    const cityCoords: Record<string, [number, number, number]> = {
      'Salt Lake City': [-111.891, 40.7608, 11],
      'Murray': [-111.888, 40.6669, 12],
      'Sandy': [-111.8507, 40.5649, 12],
      'West Valley City': [-112.001, 40.6916, 12],
      'Provo': [-111.6585, 40.2338, 12],
      'Ogden': [-111.9738, 41.223, 12],
      'Draper': [-111.8638, 40.5246, 12],
      'Taylorsville': [-111.9388, 40.6677, 12],
    };
    
    if (selectedCity && cityCoords[selectedCity]) {
      const [lng, lat, zoom] = cityCoords[selectedCity];
      map.flyTo({ center: [lng, lat], zoom, duration: 1500 });
    }
  }, [selectedCity]);

  // Reset layer visibility when switching modes
  useEffect(() => {
    const modeDefaults: Record<AppMode, typeof showLayers> = {
      government: { observations: true, gardens: true, opportunityZones: true, heatmap: false, grid: false, corridors: false },
      homeowner: { observations: false, gardens: true, opportunityZones: true, heatmap: false, grid: false, corridors: false },
      academic: { observations: true, gardens: true, opportunityZones: true, heatmap: false, grid: false, corridors: false },
    };
    setShowLayers(modeDefaults[appMode]);
    // Also reset city filter when switching modes
    setSelectedCity('');
  }, [appMode]);

  // Sync observations layer toggle with taxa selection
  // Note: Taxa filters affect BOTH points and heatmap
  // Observations toggle only hides the points layer, not the heatmap
  useEffect(() => {
    if (!showLayers.observations && !showLayers.heatmap) {
      // Only clear taxa if BOTH observations and heatmap are off
      setSelectedTaxa([]);
    }
  }, [showLayers.observations, showLayers.heatmap]);

  // When all taxa are deselected, hide observations layer
  useEffect(() => {
    if (selectedTaxa.length === 0 && showLayers.observations) {
      // Keep layer state in sync - if no taxa selected, layer effectively hidden
      // But don't auto-hide, just let it show nothing
    }
  }, [selectedTaxa]);



  // Load observations near user's garden for homeowner mode
  useEffect(() => {
    if (appMode !== 'homeowner' || !userGardenData) {
      setUserObservations([]);
      return;
    }
    
    // Filter wildlifeFeatures to show only those near user's garden (500m radius)
    const gardenLat = userGardenData.lat || 0;
    const gardenLng = userGardenData.lng || 0;
    
    if (gardenLat && gardenLng && wildlifeFeatures.length > 0) {
      const nearbyObs = wildlifeFeatures.filter(f => {
        const [lng, lat] = f.geometry.coordinates;
        // Approximate 500m in degrees (~0.0045 for lat, ~0.005 for lng at this latitude)
        const latDiff = Math.abs(lat - gardenLat);
        const lngDiff = Math.abs(lng - gardenLng);
        return latDiff < 0.0045 && lngDiff < 0.006;
      });
      setUserObservations(nearbyObs);
    }
  }, [appMode, userGardenData, wildlifeFeatures]);






  

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      // Show a welcome message for referred users
      console.log('Referred by:', ref);
    }
  }, []);
  const [pendingLocation, setPendingLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [gardenSuccess, setGardenSuccess] = useState(false);

  // Species search state
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const availableYears = useMemo(() => Object.keys(yearStats).map(Number).sort((a, b) => a - b), [yearStats]);

  // Calculate observation counts by month for timeline
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    wildlifeFeatures.forEach(f => {
      const props = f.properties || {};
      const year = props.year;
      const month = props.month;
      if (year && month) {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [wildlifeFeatures]);
  const minYear = availableYears[0] || 1871;
  const maxYear = availableYears[availableYears.length - 1] || 2025;

  const presets = [
    { id: '100years', name: '100 Years', left: [1920, 1930] as [number, number], right: [2020, 2025] as [number, number] },
    { id: '50years', name: '50 Years', left: [1970, 1980] as [number, number], right: [2020, 2025] as [number, number] },
    { id: 'inat', name: 'Pre/Post iNat', left: [2000, 2010] as [number, number], right: [2015, 2025] as [number, number] },
    { id: 'historic', name: 'Historic', left: [1900, 1950] as [number, number], right: [2000, 2025] as [number, number] },
    { id: 'decades', name: '2010s vs 2020s', left: [2010, 2019] as [number, number], right: [2020, 2025] as [number, number] },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setLeftYearRange(preset.left);
    setRightYearRange(preset.right);
    setActivePreset(preset.id);
  };

  // Load gardens
  useEffect(() => {
    const loadGardens = async () => {
      try {
        const res = await api.get('/api/gardens');
        setGardens(res.data.features || []);
      } catch (err) {
        console.log('Gardens not loaded:', err);
      }
    };
    loadGardens();
  }, []);

  useEffect(() => {
    if (!playing || compareMode || availableYears.length === 0) return;
    const interval = setInterval(() => {
      setSelectedYear(prev => {
        const idx = prev ? availableYears.indexOf(prev) : -1;
        const next = (idx + 1) % availableYears.length;
        if (next === 0) { setPlaying(false); return null; }
        return availableYears[next];
      });
    }, playSpeed);
    return () => clearInterval(interval);
  }, [playing, availableYears, playSpeed, compareMode]);

  useEffect(() => {
    const loadCache = async () => {
      setLoading(true);
      setProgress('Loading 105k+ observations...');
      try {
        const res = await api.get('/api/wildlife/cached', { timeout: 120000 });
        setWildlifeFeatures(res.data.features || []);
        setYearStats(res.data.year_distribution || {});
        setProgress(`Loaded ${res.data.total?.toLocaleString()} observations`);
      } catch (err) {
        console.error('Cache load error:', err);
        setProgress('Error loading cache');
      }
      setLoading(false);
    };
    loadCache();
  }, []);

  const handleFlyTo = (lat: number, lng: number) => {
    setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 12 }));
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setSliderPosition(Math.max(5, Math.min(95, (x / rect.width) * 100)));
  }, [isDragging]);

  const handleMapClick = (e: any) => {
    if (registerMode && e.lngLat) {
      setPendingLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    }
  };

  const handleGardenSubmit = async (data: any) => {
    try {
      const res = await api.post('/api/gardens', data);
      if (res.data.success) {
        // Refresh gardens
        const gardensRes = await api.get('/api/gardens');
        setGardens(gardensRes.data.features || []);
        setPendingLocation(null);
        setRegisterMode(false);
        setGardenSuccess(true);
        setTimeout(() => setGardenSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to register garden:', err);
      alert('Failed to register garden. Please try again.');
    }
  };

  const toggleWildlife = (id: string) => setWildlifeFilters(p => p.map(l => l.id === id ? {...l, visible: !l.visible} : l));

  const filterByYear = (features: Feature[], yearRange: [number, number]) => {
    return features.filter(f => {
      const props = f.properties || {};
      // Get year from year property or observed_on date
      let year = props.year;
      let month = props.month;
      if (!year && props.observed_on) {
        const date = new Date(props.observed_on);
        year = date.getFullYear();
        month = date.getMonth() + 1;
      }
      if (!year) return true; // Include if no date info
      if (year < yearRange[0] || year > yearRange[1]) return false;
      if (selectedSeason) {
        const season = SEASONS.find(s => s.id === selectedSeason);
        if (season && month && !season.months.includes(month)) return false;
      }
      const taxon = props.iconic_taxon;
      const filter = wildlifeFilters.find(w => w.id === taxon);
      if (filter && !filter.visible) return false;
      // City bounds filter
      if (selectedCity && CITY_BOUNDS[selectedCity]) {
        const [minLng, minLat, maxLng, maxLat] = CITY_BOUNDS[selectedCity];
        const [lng, lat] = f.geometry.coordinates;
        if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return false;
      }
      return true;
    });
  };

  const filterAll = (features: Feature[]) => {
    return features.filter(f => {
      const props = f.properties || {};
      // Get year from year property or observed_on date
      let year = props.year;
      let month = props.month;
      if (!year && props.observed_on) {
        const date = new Date(props.observed_on);
        year = date.getFullYear();
        month = date.getMonth() + 1;
      }
      if (selectedYear && year !== selectedYear) return false;
      // Filter by selected month from timeline
      if (selectedMonth && month !== selectedMonth) return false;
      // Species filter
      if (selectedSpecies) {
        const name = (props.species || props.common_name || '').toLowerCase();
        if (name !== selectedSpecies) return false;
      }
      if (selectedSeason) {
        const season = SEASONS.find(s => s.id === selectedSeason);
        if (season && month && !season.months.includes(month)) return false;
      }
      const taxon = props.iconic_taxon;
      const filter = wildlifeFilters.find(w => w.id === taxon);
      if (filter && !filter.visible) return false;
      // City bounds filter
      if (selectedCity && CITY_BOUNDS[selectedCity]) {
        const [minLng, minLat, maxLng, maxLat] = CITY_BOUNDS[selectedCity];
        const [lng, lat] = f.geometry.coordinates;
        if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return false;
      }
      return true;
    });
  };

  const leftFeatures = useMemo(() => {
    if (compareMode) return filterByYear(wildlifeFeatures, leftYearRange);
    return filterAll(wildlifeFeatures);
  }, [wildlifeFeatures, leftYearRange, compareMode, selectedYear, selectedMonth, selectedSeason, wildlifeFilters, selectedCity]);
  
  const rightFeatures = useMemo(() => {
    if (compareMode) return filterByYear(wildlifeFeatures, rightYearRange);
    return [];
  }, [wildlifeFeatures, rightYearRange, compareMode, selectedSeason, wildlifeFilters, selectedCity]);

  const visibleFeatures = compareMode ? leftFeatures : leftFeatures;
  const gridCells = useMemo(() => createGrid(visibleFeatures), [visibleFeatures]);
  
  // Available cities from opportunity data
  const availableCities = useMemo(() => {
    if (!opportunityData?.features) return [];
    const cities = new Set<string>();
    opportunityData.features.forEach((f: any) => {
      if (f.properties?.nearest_location) cities.add(f.properties.nearest_location);
    });
    return Array.from(cities).sort();
  }, [opportunityData]);

  const taxonStats = useMemo(() => {
    const s: Record<string, number> = {};
    visibleFeatures.forEach(f => { const t = f.properties?.iconic_taxon || 'Other'; s[t] = (s[t] || 0) + 1; });
    return s;
  }, [visibleFeatures]);

  const leftHeatmap = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: leftFeatures.map(f => ({ type: 'Feature' as const, geometry: f.geometry, properties: {} }))
  }), [leftFeatures]);

  const rightHeatmap = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: rightFeatures.map(f => ({ type: 'Feature' as const, geometry: f.geometry, properties: {} }))
  }), [rightFeatures]);

  const leftTaxonStats = useMemo(() => {
    const s: Record<string, number> = {};
    leftFeatures.forEach(f => { const t = f.properties?.iconic_taxon || 'Other'; s[t] = (s[t] || 0) + 1; });
    return s;
  }, [leftFeatures]);

  const rightTaxonStats = useMemo(() => {
    const s: Record<string, number> = {};
    rightFeatures.forEach(f => { const t = f.properties?.iconic_taxon || 'Other'; s[t] = (s[t] || 0) + 1; });
    return s;
  }, [rightFeatures]);

  const heatmapPaint = {
    'heatmap-weight': 1,
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 15, 1.5] as any,
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 15, 13, 25] as any,
    'heatmap-opacity': 0.8,
  };

  // Filter handlers for FilterPanel
  const handleFilterChange = (key: string, value: any) => {
    switch (key) {
      case 'taxa':
        setWildlifeFilters(prev => prev.map(f => ({ ...f, visible: value[f.id] ?? f.visible })));
        break;
      case 'selectedYear': setSelectedYear(value); break;
      case 'selectedSeason': setSelectedSeason(value); break;
      case 'selectedSpecies': setSelectedSpecies(value); break;
      case 'selectedCity': setSelectedCity(value); break;
      case 'showOpportunityZones': setShowOpportunityZones(value); break;
      case 'showGardens': setShowGardens(value); break;
      case 'minConnectivity': setMinConnectivity(value); break;
      case 'minObservations': setMinObservations(value); break;
    }
  };

  const handleClearAllFilters = () => {
    setWildlifeFilters(WILDLIFE_FILTERS);
    setSelectedYear(null);
    setSelectedSeason(null);
    setSelectedSpecies(null);
    setSelectedCity(null);
  };

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'relative' }} onMouseMove={handleMouseMove} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
      
      {/* Left map */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', clipPath: compareMode ? `inset(0 ${100 - sliderPosition}% 0 0)` : 'none' }}>
        <MapGL ref={mapRef} 
          {...viewState} 
          onMove={e => setViewState(e.viewState)} 
          onClick={handleMapClick}
          mapStyle="mapbox://styles/mapbox/light-v11" 
          mapboxAccessToken={MAPBOX_TOKEN} 
          style={{ width: '100%', height: '100%', cursor: registerMode ? 'crosshair' : 'grab' }}
        >
          {!compareMode && <NavigationControl position="bottom-right" />}
          
          
            {/* Heatmap Layer - Observation Density */}
            {showLayers.heatmap && leftFeatures && leftFeatures.length > 0 && (
              <Source
                id="heatmap-source"
                type="geojson"
                data={{
                  type: 'FeatureCollection',
                  features: leftFeatures || []
                }}
              >
                <Layer
                  id="heatmap-layer"
                  type="heatmap"
                  paint={{
                    // Increase weight based on frequency/importance
                    'heatmap-weight': [
                      'interpolate',
                      ['linear'],
                      ['get', 'count'],
                      0, 0.1,
                      10, 1
                    ],
                    // Increase intensity as zoom level increases
                    'heatmap-intensity': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      0, 0.5,
                      9, 1,
                      12, 2
                    ],
                    // Color gradient from blue (low) to red (high)
                    'heatmap-color': [
                      'interpolate',
                      ['linear'],
                      ['heatmap-density'],
                      0, 'rgba(0, 0, 255, 0)',
                      0.1, 'rgba(65, 105, 225, 0.5)',
                      0.3, 'rgba(0, 255, 128, 0.6)',
                      0.5, 'rgba(255, 255, 0, 0.7)',
                      0.7, 'rgba(255, 165, 0, 0.8)',
                      1, 'rgba(255, 0, 0, 0.9)'
                    ],
                    // Radius increases with zoom
                    'heatmap-radius': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      0, 2,
                      8, 15,
                      12, 25,
                      15, 35
                    ],
                    // Fade out heatmap at high zoom to show points
                    'heatmap-opacity': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      12, 1,
                      15, 0.5,
                      17, 0
                    ]
                  }}
                />
              </Source>
            )}

            {/* Corridor Visualization */}
            {showLayers.corridors && gardens && (
              <CorridorVisualization
                gardens={gardens.map((g: any) => ({
                  id: g.properties?.id || String(Math.random()),
                  lat: g.geometry?.coordinates?.[1] || 0,
                  lng: g.geometry?.coordinates?.[0] || 0,
                  score: g.properties?.score || 50,
                  tier: g.properties?.tier || 'Seedling'
                }))}
                visible={showLayers.corridors}
                selectedSpecies={corridorSpecies}
                onSelectGap={(lat, lng) => {
                  setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
                }}
              />
            )}


            <Source id="heat-left" type="geojson" data={leftHeatmap}>
            <Layer id="heatmap-left" type="heatmap" paint={{
              ...heatmapPaint,
              'heatmap-color': compareMode 
                ? ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(59,130,246,0)', 0.2, 'rgba(96,165,250,0.4)', 0.5, 'rgba(59,130,246,0.6)', 0.8, 'rgba(37,99,235,0.8)', 1, 'rgba(29,78,216,1)'] as any
                : ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,255,0,0)', 0.2, 'rgba(134,239,172,0.4)', 0.4, 'rgba(34,197,94,0.5)', 0.6, 'rgba(250,204,21,0.6)', 0.8, 'rgba(249,115,22,0.7)', 1, 'rgba(220,38,38,0.8)'] as any,
            }} />
          </Source>
          
          {!compareMode && viewMode === 'grid' && viewState.zoom >= 11 && gridCells.map((c, i) => (
            <Marker key={i} latitude={c.lat} longitude={c.lng} onClick={e => { e.originalEvent.stopPropagation(); setSelectedCell(c); }}>
              <div style={{ minWidth: 22, padding: '2px 5px', borderRadius: 4, backgroundColor: getGridColor(c.percentile), border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 600, color: c.percentile >= 0.5 ? 'white' : '#1a1a1a', cursor: 'pointer', textAlign: 'center' }}>{c.count}</div>
            </Marker>
          ))}

          
            {/* User's nearby observations - Homeowner mode */}
            {appMode === 'homeowner' && userGardenData && userObservations.length > 0 && (
              <Source
                id="user-observations"
                type="geojson"
                data={{
                  type: 'FeatureCollection',
                  features: userObservations
                }}
              >
                <Layer
                  id="user-observations-layer"
                  type="circle"
                  paint={{
                    'circle-radius': 6,
                    'circle-color': '#f59e0b',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 0.9
                  }}
                />
              </Source>
            )}

            {/* User's garden marker - Homeowner mode */}
            {appMode === 'homeowner' && userGardenData && userGardenData.lat && userGardenData.lng && (
              <Marker
                latitude={userGardenData.lat}
                longitude={userGardenData.lng}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  border: '3px solid white',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20
                }}>
                  🏡
                </div>
              </Marker>
            )}

            {/* Garden markers */}
          {showGardens && !compareMode && gardens.map((g, i) => (
            <Marker 
              key={g.properties.id || i} 
              latitude={g.geometry.coordinates[1]} 
              longitude={g.geometry.coordinates[0]}
              onClick={e => { e.originalEvent.stopPropagation(); setSelectedGarden(g); }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16
              }}>
                🌻
              </div>
            </Marker>
          ))}


          {/* Pending location marker */}
          {pendingLocation && (
            <Marker latitude={pendingLocation.lat} longitude={pendingLocation.lng}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1s infinite',
                fontSize: 20
              }}>
                📍
              </div>
            </Marker>
          )}

          {selectedCell && (
            <Popup latitude={selectedCell.lat} longitude={selectedCell.lng} onClose={() => setSelectedCell(null)} anchor="bottom" maxWidth="280px">
              <div style={{ padding: 4 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 13 }}>{selectedCell.count.toLocaleString()} observations</h3>
                {Object.entries(selectedCell.features.reduce((a: Record<string,number>, f) => { const t = f.properties.iconic_taxon || 'Other'; a[t] = (a[t]||0)+1; return a; }, {}))
                  .sort((a,b) => b[1]-a[1]).slice(0, 6).map(([t, c]) => (
                    <div key={t} style={{ fontSize: 11, display: 'flex', gap: 4 }}>
                      <span>{WILDLIFE_FILTERS.find(w => w.id === t)?.icon}</span>
                      <span style={{ flex: 1 }}>{WILDLIFE_FILTERS.find(w => w.id === t)?.name || t}</span>
                      <span>{c.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </Popup>
          )}

          {/* Garden popup */}
          {selectedGarden && (
            <Popup 
              latitude={selectedGarden.geometry.coordinates[1]} 
              longitude={selectedGarden.geometry.coordinates[0]} 
              onClose={() => setSelectedGarden(null)} 
              anchor="bottom" 
              maxWidth="280px"
            >
              <div style={{ padding: 8 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flower2 size={16} color="#22c55e" />
                  {selectedGarden.properties.name}
                </h3>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                  {selectedGarden.properties.size} garden
                </div>
                {selectedGarden.properties.plants?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: '#888' }}>Plants:</div>
                    <div style={{ fontSize: 11 }}>{selectedGarden.properties.plants.join(', ')}</div>
                  </div>
                )}
                {selectedGarden.properties.features?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: '#888' }}>Features:</div>
                    <div style={{ fontSize: 11 }}>{selectedGarden.properties.features.join(', ')}</div>
                  </div>
                )}
              </div>
            </Popup>
          )}
        </MapGL>
      
      </div>

      {/* Right map */}
      {compareMode && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', clipPath: `inset(0 0 0 ${sliderPosition}%)` }}>
          <MapGL {...viewState} onMove={e => setViewState(e.viewState)} mapStyle="mapbox://styles/mapbox/light-v11" mapboxAccessToken={MAPBOX_TOKEN} style={{ width: '100%', height: '100%' }}>
            <NavigationControl position="bottom-right" />
            <Source id="heat-right" type="geojson" data={rightHeatmap}>
              <Layer id="heatmap-right" type="heatmap" paint={{
                ...heatmapPaint,
                'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(249,115,22,0)', 0.2, 'rgba(251,146,60,0.4)', 0.5, 'rgba(249,115,22,0.6)', 0.8, 'rgba(234,88,12,0.8)', 1, 'rgba(194,65,12,1)'] as any,
              }} />
            </Source>
          </MapGL>
      
        </div>
      )}

      {/* Slider handle */}
      {compareMode && (
        <div 
          style={{ position: 'absolute', top: 0, left: `${sliderPosition}%`, width: 6, height: '100%', backgroundColor: 'white', cursor: 'ew-resize', zIndex: 100, boxShadow: '0 0 15px rgba(0,0,0,0.4)', transform: 'translateX(-50%)' }}
          onMouseDown={() => setIsDragging(true)}
        >
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 44, height: 44, borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: '#666' }}>⟷</div>
        </div>
      )}

      {/* Compare labels */}
      {compareMode && (
        <>
          <div style={{ position: 'absolute', top: 100, left: `${sliderPosition / 2}%`, transform: 'translateX(-50%)', backgroundColor: 'rgba(59,130,246,0.95)', color: 'white', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 18, zIndex: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', textAlign: 'center', minWidth: 140 }}>
            {leftYearRange[0]} - {leftYearRange[1]}
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 400 }}>{leftFeatures.length.toLocaleString()} obs</div>
          </div>
          <div style={{ position: 'absolute', top: 100, left: `${sliderPosition + (100 - sliderPosition) / 2}%`, transform: 'translateX(-50%)', backgroundColor: 'rgba(234,88,12,0.95)', color: 'white', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 18, zIndex: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', textAlign: 'center', minWidth: 140 }}>
            {rightYearRange[0]} - {rightYearRange[1]}
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 400 }}>{rightFeatures.length.toLocaleString()} obs</div>
          </div>
        </>
      )}

      
      {/* Species Search - top center */}
      {!compareMode && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
          <SpeciesSearch
            features={wildlifeFeatures}
            onSelectSpecies={setSelectedSpecies}
            onFlyTo={handleFlyTo}
            selectedSpecies={selectedSpecies}
          />
        </div>
      )}

      {/* Register mode banner */}
      {registerMode && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#f59e0b',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          zIndex: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          📍 Click on the map to place your garden
          <button 
            onClick={() => setRegisterMode(false)}
            style={{ 
              padding: '4px 12px', 
              borderRadius: 6, 
              border: 'none', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              color: 'white', 
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Success message */}
      {gardenSuccess && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#22c55e',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          zIndex: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          🌻 Garden registered successfully! Thank you for supporting pollinators.
        </div>
      )}

      {/* Quick Download Button */}
      {!compareMode && (
        <button
          onClick={() => {
            const data = {
              type: 'FeatureCollection',
              generated: new Date().toISOString(),
              observations: leftFeatures.length,
              features: leftFeatures,
            };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `utah-pollinator-${leftFeatures.length}-obs.geojson`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 180,
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 200
          }}
        >
          <Download size={16} />
          Export
        </button>
      )}

      {/* Register Garden Button */}
      {!compareMode && !registerMode && (
        <button
          onClick={() => setRegisterMode(true)}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            backgroundColor: '#22c55e',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(34,197,94,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 200
          }}
        >
          <Plus size={18} />
          Register Garden
        </button>
      )}

      {/* Year overlay */}
      {!compareMode && selectedYear && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 50 }}>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.85)', color: 'white', padding: '16px 32px', borderRadius: 16, fontSize: 36, fontWeight: 700, textAlign: 'center' }}>
            {selectedYear}
            <div style={{ fontSize: 14, opacity: 0.7 }}>{visibleFeatures.length.toLocaleString()} observations</div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '8px 20px', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 16, zIndex: 200 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>🐝 Utah Pollinator Path</span>
        <span style={{ fontSize: 11, color: '#666' }}>📊 {wildlifeFeatures.length.toLocaleString()} obs</span>
        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>🌻 {gardens.length} gardens</span>
        {compareMode && <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 500 }}>🔀 Compare</span>}
      </div>

      {/* Quick Action Buttons (Export, Share) */}
      

      
      


      {/* Leaderboard Button */}
      <button
        onClick={() => setShowLeaderboard(true)}
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          padding: '10px 16px',
          borderRadius: 25,
          border: 'none',
          backgroundColor: '#f59e0b',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 500,
          fontWeight: 600,
          fontSize: 14
        }}
      >
        🏆 Leaderboard
      </button>

      {/* Leaderboard Modal */}
      <Leaderboard
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        userGardenId={userGardenData ? 'user_garden' : undefined}
        gardens={sampleGardens}
      />

      {/* User Dashboard */}
      <UserDashboard
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
        gardenData={userGardenData ? {
          id: 'user_garden',
          name: 'My Garden',
          lat: 0,
          lng: 0,
          size: userGardenData.size,
          plants: userGardenData.plants,
          features: userGardenData.features,
          score: 100,
          tier: userGardenData.tier,
          registeredAt: new Date().toISOString(),
          referralCode: 'ABC123',
          referralCount: 0,
          verification: { level: 'unverified' }
        } : null}
        observations={[]}
        onEditGarden={() => { setShowDashboard(false); setRegisterMode(true); }}
        onStartCapture={() => { setShowDashboard(false); setShowObservationCapture(true); }}
      onUpdateGarden={(data) => setUserGardenData(data)}
      />

      
      {/* Unified Interface */}
      {controlsVisible && (
        <UnifiedInterface
          mode={appMode}
          onModeChange={setAppMode}
          compareMode={compareMode}
          onToggleCompare={setCompareMode}
          leftYearRange={leftYearRange}
          rightYearRange={rightYearRange}
          onLeftYearChange={setLeftYearRange}
          onRightYearChange={setRightYearRange}
          showOpportunityZones={showLayers.opportunityZones}
          onToggleOpportunityZones={(show) => setShowLayers(prev => ({ ...prev, opportunityZones: show }))}
          showGardens={showLayers.gardens}
          onToggleGardens={(show) => setShowLayers(prev => ({ ...prev, gardens: show }))}
          showObservations={showLayers.observations}
          onToggleObservations={(show) => setShowLayers(prev => ({ ...prev, observations: show }))}
          showHeatmap={showLayers.heatmap}
          onToggleHeatmap={(show) => setShowLayers(prev => ({ ...prev, heatmap: show }))}
          showGrid={showLayers.grid}
          onToggleGrid={(show) => setShowLayers(prev => ({ ...prev, grid: show }))}
          showCorridors={showLayers.corridors}
          onToggleCorridors={(show) => setShowLayers(prev => ({ ...prev, corridors: show }))}
          corridorSpecies={corridorSpecies}
          onCorridorSpeciesChange={setCorridorSpecies}
          selectedTaxa={selectedTaxa || ['Insecta', 'Aves', 'Plantae', 'Mammalia', 'Reptilia', 'Amphibia', 'Arachnida', 'Fungi']}
          onTaxaChange={(taxa) => setSelectedTaxa(taxa)}
          selectedCity={selectedCity || ''}
          cities={['Salt Lake City', 'Murray', 'Sandy', 'West Valley City', 'Provo', 'Ogden', 'Draper', 'Taylorsville']}
          onCityChange={setSelectedCity}
          yearRange={[2000, 2025]}
          onYearRangeChange={() => {}}
          observationCount={filteredObservationCount}
          userObservationCount={userObservations.length}
          gardenCount={gardens?.length || 0}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenDashboard={() => setShowDashboard(true)}
          onStartCapture={() => setShowObservationCapture(true)}
          onRegisterGarden={() => setRegisterMode(true)}
          onExportData={() => {}}
          hasRegisteredGarden={!!userGardenData}
        
          availableYears={availableYears}
          currentYear={selectedYear}
          currentMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          isPlaying={playing}
          onPlayingChange={setPlaying}
        />
      )}

      {/* Leaderboard Modal */}
      <Leaderboard
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        userGardenId={userGardenData ? 'user_garden' : undefined}
        gardens={sampleGardens}
      />

      {/* Observation Capture Modal */}
      {showObservationCapture && (
        <ObservationCapture
          onCapture={(frames, metadata) => {
            setCapturedFrames(frames);
            setObservationMetadata(metadata);
            setShowObservationCapture(false);
            setShowUploadModal(true);
          }}
          onCancel={() => setShowObservationCapture(false)}
        />
      )}

      {/* iNaturalist Upload Modal */}
      {showUploadModal && observationMetadata && (
        <INaturalistUpload
          frames={capturedFrames}
          metadata={observationMetadata}
          gardenData={userGardenData || undefined}
          onComplete={(success) => {
            setShowUploadModal(false);
            setCapturedFrames([]);
            setObservationMetadata(null);
          }}
          onCancel={() => {
            setShowUploadModal(false);
            setCapturedFrames([]);
            setObservationMetadata(null);
          }}
        />
      )}

      {/* Garden Registration Modal */}
      {pendingLocation && (
        <GardenRegistration
          lat={pendingLocation.lat}
          lng={pendingLocation.lng}
          onSubmit={handleGardenSubmit}
          onCancel={() => { setPendingLocation(null); setRegisterMode(false); }}
          existingGardens={gardens.map(g => ({
            lat: g.geometry.coordinates[1],
            lng: g.geometry.coordinates[0]
          }))}
          opportunityZones={opportunityData?.features?.map((f: any) => ({
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
          })) || []}
          observations={wildlifeFeatures}
          referralCode={referralCode}
        />
      )}

      {/* Unified Control Panel */}
      
    
      {/* Admin Dashboard */}
      <AdminDashboard
        isOpen={showAdminDashboard}
        onClose={() => setShowAdminDashboard(false)}
      />
    </div>
  );
};

export default DiscoveryMap;
