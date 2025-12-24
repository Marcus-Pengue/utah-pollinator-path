// Pollinator species data and flight ranges
export interface PollinatorSpecies {
  id: string;
  name: string;
  icon: string;
  flightRange: number; // meters
  peakHours: [number, number]; // 24hr format
  activeMonths: number[];
  color: string;
  description: string;
}

export const POLLINATOR_SPECIES: PollinatorSpecies[] = [
  {
    id: 'bee',
    name: 'Native Bees',
    icon: '🐝',
    flightRange: 300,
    peakHours: [9, 16],
    activeMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    color: '#f59e0b',
    description: 'Mason bees, bumble bees, sweat bees and other native species'
  },
  {
    id: 'butterfly',
    name: 'Butterflies',
    icon: '🦋',
    flightRange: 800,
    peakHours: [10, 15],
    activeMonths: [4, 5, 6, 7, 8, 9],
    color: '#f97316',
    description: 'Monarchs, painted ladies, swallowtails'
  },
  {
    id: 'hummingbird',
    name: 'Hummingbirds',
    icon: '🐦',
    flightRange: 1200,
    peakHours: [7, 11],
    activeMonths: [4, 5, 6, 7, 8, 9],
    color: '#22c55e',
    description: 'Black-chinned and broad-tailed hummingbirds'
  },
  {
    id: 'moth',
    name: 'Moths',
    icon: '🦋',
    flightRange: 500,
    peakHours: [19, 23],
    activeMonths: [5, 6, 7, 8, 9],
    color: '#8b5cf6',
    description: 'Sphinx moths, hawk moths (nocturnal pollinators)'
  }
];

export const TAXA_CATEGORIES = [
  { id: 'Insecta', label: 'Insects', icon: '🐝', color: '#f59e0b' },
  { id: 'Aves', label: 'Birds', icon: '🐦', color: '#3b82f6' },
  { id: 'Plantae', label: 'Plants', icon: '🌿', color: '#22c55e' },
  { id: 'Mammalia', label: 'Mammals', icon: '🦊', color: '#f97316' },
  { id: 'Reptilia', label: 'Reptiles', icon: '🦎', color: '#84cc16' },
  { id: 'Amphibia', label: 'Amphibians', icon: '🐸', color: '#06b6d4' },
  { id: 'Arachnida', label: 'Arachnids', icon: '🕷️', color: '#6b7280' },
  { id: 'Fungi', label: 'Fungi', icon: '🍄', color: '#a855f7' },
];

export const getSpeciesById = (id: string) => POLLINATOR_SPECIES.find(s => s.id === id);
export const getSpeciesFlightRange = (id: string) => getSpeciesById(id)?.flightRange || 500;
