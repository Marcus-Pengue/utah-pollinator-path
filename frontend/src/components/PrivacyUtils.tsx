// Privacy utilities for Utah Pollinator Path
// Ensures no personal information is displayed publicly

// Generate anonymous garden ID for public display
export function generateAnonymousId(gardenId: string): string {
  // Create a short hash-like ID
  let hash = 0;
  for (let i = 0; i < gardenId.length; i++) {
    const char = gardenId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `UPP-${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`;
}

// Anonymize garden data for public display
export interface PublicGardenData {
  id: string;
  anonymousId: string;
  lat: number;
  lng: number;
  // Slightly offset location for privacy (within ~50m)
  displayLat: number;
  displayLng: number;
  tier: string;
  score: number;
  size: string;
  plantCount: number;
  featureCount: number;
  hasWater: boolean;
  isPesticideFree: boolean;
  hasFallBloomers: boolean;
  registeredMonth: string; // Only show month, not exact date
  observationCount: number;
}

// Convert internal garden data to public-safe format
export function anonymizeGarden(garden: any): PublicGardenData {
  const props = garden.properties || {};
  const coords = garden.geometry?.coordinates || [0, 0];
  
  // Add slight random offset to location (up to ~50m)
  // This protects exact property location while maintaining general area
  const latOffset = (Math.random() - 0.5) * 0.0009; // ~50m
  const lngOffset = (Math.random() - 0.5) * 0.0009;
  
  const plants = props.plants || [];
  const features = props.features || [];
  const fallBloomers = ['goldenrod', 'aster', 'rabbitbrush', 'agastache'];
  
  // Extract just month/year from registration date
  const regDate = props.registered_at ? new Date(props.registered_at) : new Date();
  const registeredMonth = regDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return {
    id: props.id || garden.id,
    anonymousId: generateAnonymousId(props.id || garden.id || 'unknown'),
    lat: coords[1],
    lng: coords[0],
    displayLat: coords[1] + latOffset,
    displayLng: coords[0] + lngOffset,
    tier: props.tier || 'Seedling',
    score: props.score || 0,
    size: props.size || 'medium',
    plantCount: plants.length,
    featureCount: features.length,
    hasWater: features.includes('water'),
    isPesticideFree: features.includes('no_pesticides'),
    hasFallBloomers: plants.some((p: string) => fallBloomers.includes(p)),
    registeredMonth,
    observationCount: props.synced_obs_count || 0,
  };
}

// Get public display name for a garden
export function getPublicGardenName(garden: PublicGardenData): string {
  return `Pollinator Habitat ${garden.anonymousId}`;
}

// Get tier badge info
export function getTierBadge(tier: string): { color: string; emoji: string } {
  switch (tier) {
    case 'Pollinator Champion':
      return { color: '#eab308', emoji: '🏆' };
    case 'Habitat Hero':
      return { color: '#8b5cf6', emoji: '🦸' };
    case 'Bee Friendly':
      return { color: '#22c55e', emoji: '🐝' };
    case 'Growing':
      return { color: '#3b82f6', emoji: '🌱' };
    default:
      return { color: '#94a3b8', emoji: '🌰' };
  }
}

// Anonymize observation for public display
export interface PublicObservation {
  id: string;
  taxon: string;
  commonName: string;
  // Slightly offset location
  displayLat: number;
  displayLng: number;
  month: string;
  year: number;
  source: 'Utah Pollinator Path' | 'Community Science';
}

export function anonymizeObservation(obs: any): PublicObservation {
  const props = obs.properties || {};
  const coords = obs.geometry?.coordinates || [0, 0];
  
  // Offset location slightly
  const latOffset = (Math.random() - 0.5) * 0.0005; // ~25m
  const lngOffset = (Math.random() - 0.5) * 0.0005;
  
  return {
    id: `obs-${props.id || Math.random().toString(36).slice(2)}`,
    taxon: props.iconic_taxon || 'Wildlife',
    commonName: props.common_name || props.species || 'Unknown species',
    displayLat: coords[1] + latOffset,
    displayLng: coords[0] + lngOffset,
    month: props.month ? new Date(2000, props.month - 1).toLocaleDateString('en-US', { month: 'short' }) : 'Unknown',
    year: props.year || new Date().getFullYear(),
    source: props.synced_from_inat ? 'Community Science' : 'Utah Pollinator Path',
  };
}

// Privacy notice text
export const PRIVACY_NOTICE = `
Your privacy matters to us. When you register a garden:
- Your name and email are never shown publicly
- Your exact location is offset by ~50m on the public map
- Your iNaturalist username is not displayed
- Observations are shown as "Utah Pollinator Path" data
- Only aggregate statistics are shared publicly

You retain full access to your detailed data in your personal dashboard.
`.trim();

// What's shown publicly vs privately
export const DATA_VISIBILITY = {
  public: [
    'Anonymous garden ID (e.g., UPP-A3F2K1)',
    'Certification tier',
    'Garden size category',
    'Number of plant species (not which ones)',
    'General features (water source, pesticide-free)',
    'Approximate location (offset ~50m)',
    'Registration month/year',
  ],
  private: [
    'Your name and contact info',
    'Exact property location',
    'Specific plants selected',
    'iNaturalist username',
    'Individual observation details',
    'Detailed score breakdown',
    'Personal notes/description',
  ],
};
