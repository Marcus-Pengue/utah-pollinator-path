import axios from 'axios';

const API_BASE = 'https://utah-pollinator-path.onrender.com';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});
