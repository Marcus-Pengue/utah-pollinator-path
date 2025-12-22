import axios from 'axios';

const API_BASE = 'https://utah-pollinator-path.onrender.com';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,  // Increased timeout for larger queries
});

// Fetch wildlife with custom days
export const fetchWildlife = (lat: number, lng: number, radius = 30, days = 365) =>
  api.get('/api/wildlife/unified', { params: { lat, lng, radius, taxon: 'all', days } });
