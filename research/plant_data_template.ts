// Template for Utah Native Plant Data
// Copy this structure for each plant researched

export interface PlantData {
  // === IDENTIFICATION ===
  id: string;                    // kebab-case: 'desert-marigold'
  commonName: string;            // 'Desert Marigold'
  scientificName: string;        // 'Baileya multiradiata'
  alternateNames?: string[];     // Other common names
  family: string;                // 'Asteraceae'
  
  // === CLASSIFICATION ===
  category: 'flower' | 'shrub' | 'tree' | 'groundcover' | 'grass' | 'succulent';
  utahNative: boolean;           // True if native to Utah
  nativeRange?: string;          // 'Great Basin, Mojave Desert'
  
  // === APPEARANCE ===
  icon: string;                  // Emoji: '🌼'
  color: string;                 // Foliage/general: '#F4A460'
  bloomColor: string;            // Flower color: 'yellow'
  bloomColors?: string[];        // If multiple: ['yellow', 'orange']
  foliageColor?: string;         // 'silver-green'
  
  // === SIZE & SPACING ===
  heightMin: number;             // Minimum height in feet
  heightMax: number;             // Maximum height in feet
  widthMin: number;              // Minimum spread in feet
  widthMax: number;              // Maximum spread in feet
  spacing: number;               // Recommended spacing in feet
  growthRate: 'slow' | 'moderate' | 'fast';
  
  // === GROWING CONDITIONS ===
  sunNeeds: 'full' | 'partial' | 'shade' | 'full-partial' | 'partial-shade';
  waterNeeds: 'very-low' | 'low' | 'medium' | 'high';
  soilType: string[];            // ['well-drained', 'sandy', 'rocky']
  soilPH?: string;               // '6.0-8.0'
  droughtTolerant: boolean;
  saltTolerant?: boolean;
  
  // === UTAH-SPECIFIC ===
  usdaZones: number[];           // [4, 5, 6, 7, 8]
  elevationMin: number;          // Minimum elevation in feet
  elevationMax: number;          // Maximum elevation in feet
  wasatchAdapted: boolean;       // Specifically good for Wasatch Front
  
  // === BLOOM & PHENOLOGY ===
  bloomMonths: number[];         // [4, 5, 6, 7, 8] = Apr-Aug
  bloomDuration: string;         // 'long', 'moderate', 'short'
  reblooms?: boolean;            // Blooms again if deadheaded
  fallColor?: string;            // Fall foliage color if notable
  winterInterest?: boolean;      // Evergreen or interesting structure
  
  // === POLLINATOR VALUE ===
  attractsPollinators: string[]; // ['bees', 'butterflies', 'hummingbirds', 'moths']
  specificPollinators?: string[]; // ['monarch butterfly', 'bumblebee', 'leafcutter bee']
  nectarValue: number;           // 1-5 scale
  pollenValue: number;           // 1-5 scale
  hostPlant?: string[];          // Larval host for: ['painted lady', 'monarch']
  
  // === WATER REQUIREMENTS ===
  gallonsPerWeek: number;        // Established plant, summer
  wateringFrequency: string;     // 'weekly', 'every 10-14 days', 'monthly'
  wateringNotes: string;         // 'Deep water monthly once established'
  establishmentPeriod: string;   // '1-2 years'
  
  // === MAINTENANCE ===
  maintenanceLevel: 'very-low' | 'low' | 'moderate' | 'high';
  maintenanceNotes?: string;     // 'Cut back in late winter'
  pruningNeeds?: string;         // 'Minimal', 'Annual cutback'
  pestResistant: boolean;
  deerResistant: boolean;
  rabbitResistant?: boolean;
  
  // === COMPANION PLANTING ===
  goodCompanions: string[];      // Plant IDs that grow well together
  badCompanions?: string[];      // Plant IDs to avoid
  companionNotes?: string;       // Why certain combinations work
  
  // === COST & AVAILABILITY ===
  estimatedCost: number;         // Average cost per plant in USD
  costRange?: string;            // '$8-15 for 1-gallon'
  availability: 'common' | 'moderate' | 'rare';
  utahNurseries?: string[];      // ['Wasatch Native Plants', 'Great Basin Natives']
  
  // === LANDSCAPING USE ===
  landscapeUses: string[];       // ['border', 'mass planting', 'container', 'rock garden']
  localscapesZone: 0 | 1 | 2 | 3 | 4; // Hydrozone: 0=none, 4=high water
  goodForParkStrip: boolean;     // Suitable for 'Flip Your Strip'
  goodForSlopes: boolean;        // Erosion control
  
  // === ADDITIONAL INFO ===
  wildlifeValue?: string[];      // ['seeds for birds', 'cover for lizards']
  culturalSignificance?: string; // Native American uses, etc.
  toxicity?: string;             // 'Non-toxic' or warnings
  notes?: string;                // Any other important info
  
  // === DATA QUALITY ===
  dataSource: string[];          // ['USU Extension', 'Conservation Garden Park']
  lastVerified: string;          // '2025-01-15'
  confidence: 'high' | 'medium' | 'low';
}
