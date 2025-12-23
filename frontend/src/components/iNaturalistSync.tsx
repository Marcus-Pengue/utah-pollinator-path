import React, { useState, useEffect } from 'react';
import { Search, Link2, RefreshCw, ExternalLink, Check, X, Camera, MapPin } from 'lucide-react';
import { api } from '../api/client';

interface INaturalistUser {
  id: number;
  login: string;
  name: string;
  icon: string;
  observations_count: number;
}

interface Observation {
  id: number;
  species: string;
  scientific_name: string;
  iconic_taxon: string;
  observed_on: string;
  place_guess: string;
  quality_grade: string;
  coordinates: [number, number];
  photo_url: string | null;
  url: string;
}

interface INaturalistSyncProps {
  gardenId: string;
  gardenLat?: number;
  gardenLng?: number;
  linkedUsername?: string;
  onSync: (observations: Observation[]) => void;
  onLink: (username: string, userId: number) => void;
}

const INaturalistSync: React.FC<INaturalistSyncProps> = ({
  gardenId, gardenLat, gardenLng, linkedUsername, onSync, onLink
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<INaturalistUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(1);

  useEffect(() => {
    if (linkedUsername) syncObservations(linkedUsername);
  }, [linkedUsername]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await api.get('/api/inaturalist/search?username=' + encodeURIComponent(searchQuery));
      setSearchResults(res.data.users || []);
    } catch (err) {
      setError('Failed to search users');
    }
    setSearching(false);
  };

  const linkAccount = async (user: INaturalistUser) => {
    try {
      await api.post('/api/gardens/' + gardenId + '/link-inaturalist', { username: user.login, user_id: user.id });
      onLink(user.login, user.id);
      setSearchResults([]);
      setSearchQuery('');
      syncObservations(user.login);
    } catch (err) {
      setError('Failed to link account');
    }
  };

  const syncObservations = async (username: string) => {
    setSyncing(true);
    setError(null);
    try {
      let url = '/api/inaturalist/observations?username=' + encodeURIComponent(username);
      if (gardenLat && gardenLng) url += '&lat=' + gardenLat + '&lng=' + gardenLng + '&radius=' + radius;
      const res = await api.get(url);
      setObservations(res.data.observations || []);
      onSync(res.data.observations || []);
    } catch (err) {
      setError('Failed to sync observations');
    }
    setSyncing(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#166534' }}>iNaturalist Sync</div>
          <div style={{ fontSize: 11, color: '#15803d' }}>{linkedUsername ? 'Linked to @' + linkedUsername : 'Connect your account'}</div>
        </div>
        {linkedUsername && <Check size={20} color="#22c55e" />}
      </div>

      {!linkedUsername && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Link your iNaturalist account to sync observations</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && searchUsers()} placeholder="Enter iNaturalist username" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
            <button onClick={searchUsers} disabled={searching} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer' }}>
              <Search size={16} />
            </button>
          </div>
          {searchResults.map(user => (
            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginTop: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>@{user.login}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{user.observations_count} observations</div>
              </div>
              <button onClick={() => linkAccount(user)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer' }}>
                <Link2 size={14} /> Link
              </button>
            </div>
          ))}
        </div>
      )}

      {linkedUsername && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
              <option value={0.5}>500m</option>
              <option value={1}>1 km</option>
              <option value={5}>5 km</option>
            </select>
            <button onClick={() => syncObservations(linkedUsername)} disabled={syncing} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}>
              <RefreshCw size={16} /> {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
          
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Your Observations ({observations.length})</div>
          
          {observations.length > 0 ? (
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              {observations.map(obs => (
                <a key={obs.id} href={obs.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: 'inherit' }}>
                  {obs.photo_url ? (
                    <img src={obs.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{obs.species}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{obs.observed_on}</div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 30, backgroundColor: '#f9fafb', borderRadius: 8 }}>
              <Camera size={32} color="#9ca3af" />
              <div style={{ color: '#666', marginTop: 8 }}>No observations found nearby</div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: 10, backgroundColor: '#fef2f2', borderRadius: 6, color: '#dc2626', fontSize: 12 }}>
          <X size={16} /> {error}
        </div>
      )}
    </div>
  );
};

export default INaturalistSync;
