// Utah city data - bounds, water districts, elevation
export interface CityConfig {
  id: string;
  name: string;
  bounds: [number, number, number, number]; // [west, south, east, north]
  center: [number, number]; // [lng, lat]
  waterDistrict: string;
  population: number;
  elevation: number; // feet
  usdaZone: number;
  avgPrecipitation: number; // inches/year
}

export const UTAH_CITIES: CityConfig[] = [
  {
    id: 'salt-lake-city',
    name: 'Salt Lake City',
    bounds: [-112.1, 40.7, -111.8, 40.85],
    center: [-111.891, 40.7608],
    waterDistrict: 'Salt Lake City Public Utilities',
    population: 200000,
    elevation: 4226,
    usdaZone: 6,
    avgPrecipitation: 16.5
  },
  {
    id: 'murray',
    name: 'Murray',
    bounds: [-111.93, 40.62, -111.85, 40.68],
    center: [-111.888, 40.6549],
    waterDistrict: 'Murray City',
    population: 50000,
    elevation: 4340,
    usdaZone: 6,
    avgPrecipitation: 17
  },
  {
    id: 'sandy',
    name: 'Sandy',
    bounds: [-111.92, 40.54, -111.8, 40.62],
    center: [-111.859, 40.5649],
    waterDistrict: 'Sandy City',
    population: 96000,
    elevation: 4520,
    usdaZone: 6,
    avgPrecipitation: 18
  },
  {
    id: 'west-valley-city',
    name: 'West Valley City',
    bounds: [-112.05, 40.65, -111.93, 40.73],
    center: [-111.994, 40.6916],
    waterDistrict: 'West Valley City',
    population: 140000,
    elevation: 4304,
    usdaZone: 6,
    avgPrecipitation: 15
  },
  {
    id: 'provo',
    name: 'Provo',
    bounds: [-111.72, 40.19, -111.6, 40.28],
    center: [-111.658, 40.2338],
    waterDistrict: 'Provo City',
    population: 115000,
    elevation: 4551,
    usdaZone: 6,
    avgPrecipitation: 19
  },
  {
    id: 'ogden',
    name: 'Ogden',
    bounds: [-112.02, 41.2, -111.9, 41.28],
    center: [-111.973, 41.223],
    waterDistrict: 'Weber Basin Water',
    population: 87000,
    elevation: 4300,
    usdaZone: 6,
    avgPrecipitation: 20
  },
  {
    id: 'draper',
    name: 'Draper',
    bounds: [-111.9, 40.46, -111.8, 40.54],
    center: [-111.864, 40.5246],
    waterDistrict: 'Draper City',
    population: 51000,
    elevation: 4505,
    usdaZone: 6,
    avgPrecipitation: 17
  },
  {
    id: 'taylorsville',
    name: 'Taylorsville',
    bounds: [-111.97, 40.64, -111.9, 40.69],
    center: [-111.939, 40.668],
    waterDistrict: 'Taylorsville-Bennion',
    population: 60000,
    elevation: 4340,
    usdaZone: 6,
    avgPrecipitation: 16
  }
];

export const getCityByName = (name: string) => UTAH_CITIES.find(c => c.name === name);
export const getCityById = (id: string) => UTAH_CITIES.find(c => c.id === id);
export const getCitiesInWaterDistrict = (district: string) => 
  UTAH_CITIES.filter(c => c.waterDistrict === district);
export const getAllCityNames = () => UTAH_CITIES.map(c => c.name);
