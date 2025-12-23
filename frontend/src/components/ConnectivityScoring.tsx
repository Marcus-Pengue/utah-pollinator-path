// Connectivity scoring utilities for garden registration
// Based on Xerces 500m buffer recommendation for pollinator assessment

export interface GardenLocation {
  lat: number;
  lng: number;
}

export interface ConnectivityResult {
  score: number;
  bonusPoints: number;
  nearestGardenDistance: number | null;
  nearestOpportunityZoneDistance: number | null;
  gardensWithin500m: number;
  observationsWithin500m: number;
  fillsGap: boolean;
  details: string[];
}

// Haversine formula for distance in meters
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Check if observation is within property radius (500m default)
export function isWithinPropertyRadius(
  propertyLat: number, 
  propertyLng: number, 
  obsLat: number, 
  obsLng: number, 
  radiusMeters: number = 500
): boolean {
  const distance = calculateDistance(propertyLat, propertyLng, obsLat, obsLng);
  return distance <= radiusMeters;
}

// Filter observations to only those within property radius
export function filterObservationsToProperty(
  propertyLat: number,
  propertyLng: number,
  observations: any[],
  radiusMeters: number = 500
): any[] {
  return observations.filter(obs => {
    const coords = obs.geometry?.coordinates;
    if (!coords || coords.length < 2) return false;
    return isWithinPropertyRadius(propertyLat, propertyLng, coords[1], coords[0], radiusMeters);
  });
}

// Calculate connectivity score for a new garden location
export function calculateConnectivityScore(
  newGarden: GardenLocation,
  existingGardens: GardenLocation[],
  opportunityZones: GardenLocation[],
  observations: any[]
): ConnectivityResult {
  const details: string[] = [];
  let bonusPoints = 0;

  // 1. Find nearest existing garden
  let nearestGardenDistance: number | null = null;
  if (existingGardens.length > 0) {
    nearestGardenDistance = Math.min(
      ...existingGardens.map(g => 
        calculateDistance(newGarden.lat, newGarden.lng, g.lat, g.lng)
      )
    );
  }

  // 2. Count gardens within 500m (pollinator foraging range)
  const gardensWithin500m = existingGardens.filter(g => {
    const dist = calculateDistance(newGarden.lat, newGarden.lng, g.lat, g.lng);
    return dist <= 500 && dist > 0;
  }).length;

  // 3. Find nearest opportunity zone
  let nearestOpportunityZoneDistance: number | null = null;
  if (opportunityZones.length > 0) {
    nearestOpportunityZoneDistance = Math.min(
      ...opportunityZones.map(oz => 
        calculateDistance(newGarden.lat, newGarden.lng, oz.lat, oz.lng)
      )
    );
  }

  // 4. Count property observations (within 500m)
  const observationsWithin500m = filterObservationsToProperty(
    newGarden.lat, 
    newGarden.lng, 
    observations, 
    500
  ).length;

  // 5. Calculate bonus points based on connectivity

  // Bonus for being in or near an opportunity zone (high priority area)
  if (nearestOpportunityZoneDistance !== null) {
    if (nearestOpportunityZoneDistance <= 100) {
      bonusPoints += 50;
      details.push('🎯 In high-priority opportunity zone (+50)');
    } else if (nearestOpportunityZoneDistance <= 250) {
      bonusPoints += 35;
      details.push('🎯 Near opportunity zone (+35)');
    } else if (nearestOpportunityZoneDistance <= 500) {
      bonusPoints += 20;
      details.push('🎯 Within 500m of opportunity zone (+20)');
    }
  }

  // Bonus for connecting to existing gardens (network effect)
  if (gardensWithin500m >= 3) {
    bonusPoints += 30;
    details.push(`🔗 Strong network: ${gardensWithin500m} gardens nearby (+30)`);
  } else if (gardensWithin500m >= 1) {
    bonusPoints += 15;
    details.push(`🔗 Connected to ${gardensWithin500m} nearby garden(s) (+15)`);
  }

  // Bonus for "filling a gap" - nearest garden is far but opportunity zone is close
  const fillsGap = (
    (nearestGardenDistance === null || nearestGardenDistance > 750) &&
    (nearestOpportunityZoneDistance !== null && nearestOpportunityZoneDistance <= 500)
  );
  
  if (fillsGap) {
    bonusPoints += 40;
    details.push('🌉 Gap filler bonus: Creates new corridor connection (+40)');
  }

  // Bonus for existing wildlife observations (indicates good habitat potential)
  if (observationsWithin500m >= 50) {
    bonusPoints += 25;
    details.push(`📊 High biodiversity area: ${observationsWithin500m} observations (+25)`);
  } else if (observationsWithin500m >= 20) {
    bonusPoints += 15;
    details.push(`📊 Active wildlife area: ${observationsWithin500m} observations (+15)`);
  } else if (observationsWithin500m >= 5) {
    bonusPoints += 5;
    details.push(`📊 Some wildlife activity: ${observationsWithin500m} observations (+5)`);
  }

  // Pioneer bonus - first garden in an area (>1km from any other)
  if (nearestGardenDistance === null || nearestGardenDistance > 1000) {
    bonusPoints += 20;
    details.push('🚀 Pioneer bonus: First garden in this area (+20)');
  }

  // Calculate total connectivity score (0-100 scale for the 20% weight)
  const score = Math.min(100, bonusPoints * 2);

  return {
    score,
    bonusPoints,
    nearestGardenDistance,
    nearestOpportunityZoneDistance,
    gardensWithin500m,
    observationsWithin500m,
    fillsGap,
    details
  };
}

// Get property-specific observation stats
export function getPropertyObservationStats(
  propertyLat: number,
  propertyLng: number,
  observations: any[],
  radiusMeters: number = 500
): {
  total: number;
  byTaxon: Record<string, number>;
  byYear: Record<number, number>;
  species: string[];
} {
  const propertyObs = filterObservationsToProperty(
    propertyLat, propertyLng, observations, radiusMeters
  );

  const byTaxon: Record<string, number> = {};
  const byYear: Record<number, number> = {};
  const speciesSet = new Set<string>();

  propertyObs.forEach(obs => {
    const taxon = obs.properties?.iconic_taxon || 'Unknown';
    byTaxon[taxon] = (byTaxon[taxon] || 0) + 1;

    const year = obs.properties?.year;
    if (year) {
      byYear[year] = (byYear[year] || 0) + 1;
    }

    const species = obs.properties?.species;
    if (species) {
      speciesSet.add(species);
    }
  });

  return {
    total: propertyObs.length,
    byTaxon,
    byYear,
    species: Array.from(speciesSet)
  };
}
