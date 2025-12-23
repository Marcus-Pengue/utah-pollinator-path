// Generate habitat context notes from garden registration data

export interface GardenFeatures {
  plants: string[];
  features: string[];
  size: string;
  tier: string;
  isPesticideFree: boolean;
}

// Map feature IDs to descriptive habitat notes
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  // Nesting features
  bare_ground: '🪨 Contains bare ground patches (ground-nesting bee habitat)',
  brush_pile: '🪵 Brush/log pile present (cavity-nesting habitat)',
  bee_hotel: '🏠 Bee hotel installed',
  undisturbed: '🌿 Undisturbed vegetation areas maintained',
  leaf_litter: '🍂 Leaf litter/natural mulch retained',
  
  // Water & resources
  water: '💧 Water source available',
  mud_source: '🟤 Mud source for mason bees',
  
  // Habitat quality
  no_pesticides: '🚫 Pesticide-free habitat',
  native_majority: '🌱 >50% native plants',
  trees_shrubs: '🌳 Trees/shrubs provide structure',
};

// Map plant IDs to bloom info
const PLANT_INFO: Record<string, { name: string; bloom: string; native: boolean }> = {
  // Spring
  penstemon: { name: 'Penstemon', bloom: 'Spring-Summer', native: true },
  phacelia: { name: 'Phacelia', bloom: 'Spring-Summer', native: true },
  lupine: { name: 'Lupine', bloom: 'Spring-Summer', native: true },
  
  // Summer
  milkweed: { name: 'Milkweed', bloom: 'Summer', native: true },
  echinacea: { name: 'Echinacea', bloom: 'Summer', native: true },
  sunflower: { name: 'Sunflower', bloom: 'Summer', native: true },
  blanketflower: { name: 'Blanketflower', bloom: 'Summer', native: true },
  beebalm: { name: 'Bee Balm', bloom: 'Summer', native: true },
  
  // Fall (critical!)
  goldenrod: { name: 'Goldenrod', bloom: 'Fall', native: true },
  aster: { name: 'Aster', bloom: 'Fall', native: true },
  rabbitbrush: { name: 'Rabbitbrush', bloom: 'Fall', native: true },
  agastache: { name: 'Agastache', bloom: 'Summer-Fall', native: true },
  
  // Season-long
  lavender: { name: 'Lavender', bloom: 'Summer', native: false },
  catmint: { name: 'Catmint', bloom: 'Spring-Fall', native: false },
  salvia: { name: 'Salvia', bloom: 'Summer-Fall', native: true },
  buckwheat: { name: 'Buckwheat', bloom: 'Summer-Fall', native: true },
};

export function generateHabitatNotes(garden: GardenFeatures): string {
  const notes: string[] = [];
  
  // Header
  notes.push('📍 HABITAT CONTEXT (Utah Pollinator Path)');
  notes.push('─'.repeat(40));
  
  // Garden tier and size
  notes.push(`🏆 ${garden.tier} Garden (${garden.size})`);
  notes.push('');
  
  // Nesting/habitat features
  const featureNotes = garden.features
    .map(f => FEATURE_DESCRIPTIONS[f])
    .filter(Boolean);
  
  if (featureNotes.length > 0) {
    notes.push('HABITAT FEATURES:');
    featureNotes.forEach(note => notes.push(`  ${note}`));
    notes.push('');
  }
  
  // Plant resources by bloom season
  const plantsByBloom: Record<string, string[]> = {
    'Spring': [],
    'Summer': [],
    'Fall': [],
    'Spring-Summer': [],
    'Summer-Fall': [],
    'Spring-Fall': [],
  };
  
  garden.plants.forEach(plantId => {
    const info = PLANT_INFO[plantId];
    if (info) {
      const label = info.native ? info.name : `${info.name} (non-native)`;
      if (plantsByBloom[info.bloom]) {
        plantsByBloom[info.bloom].push(label);
      }
    }
  });
  
  // Check for fall bloomers
  const hasFallBloomers = garden.plants.some(p => 
    ['goldenrod', 'aster', 'rabbitbrush', 'agastache'].includes(p)
  );
  
  const plantSummary = Object.entries(plantsByBloom)
    .filter(([_, plants]) => plants.length > 0)
    .map(([season, plants]) => `${season}: ${plants.join(', ')}`)
    .join('; ');
  
  if (plantSummary) {
    notes.push('FLORAL RESOURCES:');
    notes.push(`  ${plantSummary}`);
    if (hasFallBloomers) {
      notes.push('  🍂 Fall nectar sources present (critical Sept resource)');
    }
    notes.push('');
  }
  
  // Pesticide status
  if (garden.isPesticideFree) {
    notes.push('✅ PESTICIDE-FREE HABITAT');
  }
  
  // Footer
  notes.push('');
  notes.push('─'.repeat(40));
  notes.push('Observed via Utah Pollinator Path');
  notes.push('https://utah-pollinator-path.onrender.com');
  
  return notes.join('\n');
}

// Generate shorter version for observation notes
export function generateQuickNotes(garden: GardenFeatures): string {
  const tags: string[] = [];
  
  // Key features
  if (garden.features.includes('bare_ground')) tags.push('ground-nesting habitat');
  if (garden.features.includes('brush_pile')) tags.push('cavity-nesting habitat');
  if (garden.features.includes('water')) tags.push('water source');
  if (garden.features.includes('no_pesticides')) tags.push('pesticide-free');
  
  // Fall bloomers
  const fallPlants = garden.plants.filter(p => 
    ['goldenrod', 'aster', 'rabbitbrush', 'agastache'].includes(p)
  );
  if (fallPlants.length > 0) {
    tags.push(`fall nectar: ${fallPlants.join(', ')}`);
  }
  
  // Native count
  const nativeCount = garden.plants.filter(p => PLANT_INFO[p]?.native).length;
  if (nativeCount > 0) {
    tags.push(`${nativeCount} native species`);
  }
  
  return `🐝 ${garden.tier} habitat | ${tags.join(' • ')} | via Utah Pollinator Path`;
}

export default { generateHabitatNotes, generateQuickNotes };
