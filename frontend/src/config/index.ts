// Central config exports
export * from './plants';
export * from './rebates';
export * from './cities';
export * from './species';

// App-wide constants
export const APP_CONFIG = {
  name: 'Utah Pollinator Path',
  version: '1.0.0',
  apiUrl: process.env.REACT_APP_API_URL || 'https://utah-pollinator-path.onrender.com',
  mapboxToken: process.env.REACT_APP_MAPBOX_TOKEN || '',
  defaultCenter: [-111.891, 40.7608] as [number, number], // Salt Lake City
  defaultZoom: 11,
  maxObservationsPerLoad: 10000,
};

// Scoring weights (Xerces-based)
export const SCORING_CONFIG = {
  weights: {
    speciesRichness: 0.25,
    nativeRatio: 0.20,
    bloomCoverage: 0.20,
    nectarValue: 0.15,
    nestingHabitat: 0.10,
    pesticidesAvoidance: 0.10,
  },
  tiers: [
    { name: 'Seedling', minScore: 0, color: '#a1a1aa', icon: '🌱' },
    { name: 'Sprout', minScore: 30, color: '#22c55e', icon: '🌿' },
    { name: 'Bloomer', minScore: 50, color: '#3b82f6', icon: '🌸' },
    { name: 'Pollinator Champion', minScore: 75, color: '#f59e0b', icon: '🏆' },
    { name: 'Habitat Hero', minScore: 90, color: '#8b5cf6', icon: '⭐' },
  ],
};

// Re-export plant utilities
export {
  PLANTS,
  PLANT_COUNT,
  getPlantById,
  getPlantsByCategory,
  getPlantsByWaterZone,
  getPlantsByBloomMonth,
  getPlantsForPollinator,
  getHostPlants,
  getNativePlants,
  getEarlySpringBloomers,
  getLateFallBloomers,
  getLowestWaterPlants,
  getCompanions,
  calculateHabitatScore
} from './plants';
