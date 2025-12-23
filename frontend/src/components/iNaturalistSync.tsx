import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertCircle, ExternalLink, Leaf, Bug, Bird } from 'lucide-react';
import { isWithinPropertyRadius } from './ConnectivityScoring';

interface iNaturalistSyncProps {
  propertyLat: number;
  propertyLng: number;
  radiusMeters?: number;
  onSyncComplete: (observations: SyncedObservation[]) => void;
  existingObservations?: SyncedObservation[];
}

export interface SyncedObservation {
  id: string;
  inat_id: number;
  species: string;
  common_name: string;
  taxon: string;
  observed_on: string;
  lat: number;
  lng: number;
  photo_url?: string;
  distance_from_property: number;
  quality_grade: string;
}

const TAXON_ICONS: Record<string, React.ReactNode> = {
  Plantae: <Leaf size={14} color="#22c55e" />,
  Insecta: <Bug size={14} color="#f59e0b" />,
  Aves: <Bird size={14} color="#3b82f6" />,
  Mammalia: '🦊',
  Reptilia: '🦎',
  Amphibia: '🐸',
  Fungi: '🍄',
  Arachnida: '🕷️',
};

const iNaturalistSync: React.FC<iNaturalistSyncProps> = ({
  propertyLat,
  propertyLng,
  radiusMeters = 500,
  onSyncComplete,
  existingObservations = []
}) => {
  const [username, setUsername] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedObs, setSyncedObs] = useState<SyncedObservation[]>(existingObservations);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [withinRadius, setWithinRadius] = useState(0);

  // Calculate distance helper
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const syncFromiNaturalist = async () => {
    if (!username.trim()) {
      setError('Please enter your iNaturalist username');
      return;
    }

    setSyncing(true);
    setError(null);
    setShowResults(false);

    try {
      // Fetch user's observations from iNaturalist API
      // We search within a bounding box around the property to limit results
      const boxSize = 0.01; // ~1km box
      const params = new URLSearchParams({
        user_login: username.trim(),
        swlat: (propertyLat - boxSize).toString(),
        swlng: (propertyLng - boxSize).toString(),
        nelat: (propertyLat + boxSize).toString(),
        nelng: (propertyLng + boxSize).toString(),
        per_page: '200',
        order_by: 'observed_on',
        order: 'desc',
      });

      const response = await fetch(
        `https://api.inaturalist.org/v1/observations?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from iNaturalist');
      }

      const data = await response.json();
      const allObs = data.results || [];
      setTotalFound(allObs.length);

      // Filter to only observations within the property radius
      const validObs: SyncedObservation[] = [];

      for (const obs of allObs) {
        if (!obs.location) continue;

        const [lat, lng] = obs.location.split(',').map(Number);
        const distance = getDistance(propertyLat, propertyLng, lat, lng);

        if (distance <= radiusMeters) {
          validObs.push({
            id: `inat_sync_${obs.id}`,
            inat_id: obs.id,
            species: obs.taxon?.name || 'Unknown',
            common_name: obs.taxon?.preferred_common_name || obs.taxon?.name || 'Unknown',
            taxon: obs.taxon?.iconic_taxon_name || 'Unknown',
            observed_on: obs.observed_on || obs.created_at,
            lat,
            lng,
            photo_url: obs.photos?.[0]?.url?.replace('square', 'small'),
            distance_from_property: Math.round(distance),
            quality_grade: obs.quality_grade,
          });
        }
      }

      setWithinRadius(validObs.length);
      setSyncedObs(validObs);
      setLastSync(new Date().toISOString());
      setShowResults(true);
      onSyncComplete(validObs);

    } catch (err: any) {
      setError(err.message || 'Failed to sync with iNaturalist');
    } finally {
      setSyncing(false);
    }
  };

  // Calculate bonus points from synced observations
  const calculateObservationBonus = (): number => {
    if (syncedObs.length === 0) return 0;

    let bonus = 0;
    const taxonCounts: Record<string, number> = {};
    const speciesSet = new Set<string>();

    syncedObs.forEach(obs => {
      taxonCounts[obs.taxon] = (taxonCounts[obs.taxon] || 0) + 1;
      speciesSet.add(obs.species);
    });

    // Points per observation (capped)
    bonus += Math.min(syncedObs.length * 2, 30);

    // Diversity bonus
    const taxonDiversity = Object.keys(taxonCounts).length;
    if (taxonDiversity >= 5) bonus += 20;
    else if (taxonDiversity >= 3) bonus += 10;

    // Species richness bonus
    if (speciesSet.size >= 20) bonus += 25;
    else if (speciesSet.size >= 10) bonus += 15;
    else if (speciesSet.size >= 5) bonus += 5;

    // Research grade bonus
    const researchGrade = syncedObs.filter(o => o.quality_grade === 'research').length;
    if (researchGrade >= 10) bonus += 15;
    else if (researchGrade >= 5) bonus += 8;

    return bonus;
  };

  const observationBonus = calculateObservationBonus();

  return (
    <div style={{
      backgroundColor: '#fefce8',
      border: '1px solid #fde047',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <img 
          src="https://static.inaturalist.org/sites/1-logo.svg" 
          alt="iNaturalist" 
          style={{ height: 20 }}
        />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Sync Your Observations</span>
      </div>

      <p style={{ fontSize: 12, color: '#713f12', marginBottom: 12 }}>
        Link your iNaturalist account to get credit for wildlife observations 
        within {radiusMeters}m of your property. Only <strong>your observations</strong> near 
        your registered garden location will count.
      </p>

      {/* Username Input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your iNaturalist username"
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #fde047',
            fontSize: 14,
          }}
        />
        <button
          onClick={syncFromiNaturalist}
          disabled={syncing}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#84cc16',
            color: 'white',
            fontWeight: 600,
            cursor: syncing ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={16} className={syncing ? 'spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12
        }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Sync Results */}
      {showResults && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 8
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
              <Check size={14} style={{ display: 'inline', marginRight: 4 }} />
              Sync Complete!
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>
              {new Date(lastSync!).toLocaleString()}
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: 8,
            marginBottom: 12
          }}>
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              padding: 8, 
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>
                {withinRadius}
              </div>
              <div style={{ fontSize: 10, color: '#166534' }}>
                Within {radiusMeters}m
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#fef3c7', 
              padding: 8, 
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>
                +{observationBonus}
              </div>
              <div style={{ fontSize: 10, color: '#92400e' }}>
                Bonus Points
              </div>
            </div>
          </div>

          {totalFound > withinRadius && (
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
              ℹ️ {totalFound - withinRadius} observations were outside the {radiusMeters}m radius 
              and not counted.
            </div>
          )}

          {/* Observation List */}
          {syncedObs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                Your Property Observations:
              </div>
              <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                {syncedObs.slice(0, 10).map((obs, i) => (
                  <div 
                    key={obs.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 0',
                      borderBottom: i < syncedObs.length - 1 ? '1px solid #eee' : 'none'
                    }}
                  >
                    {obs.photo_url && (
                      <img 
                        src={obs.photo_url} 
                        alt={obs.common_name}
                        style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: 4,
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 12, 
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {TAXON_ICONS[obs.taxon] || '🌿'} {obs.common_name}
                      </div>
                      <div style={{ fontSize: 10, color: '#666' }}>
                        {obs.distance_from_property}m away • {obs.observed_on?.split('T')[0]}
                      </div>
                    </div>
                    {obs.quality_grade === 'research' && (
                      <span style={{
                        fontSize: 8,
                        padding: '2px 4px',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        borderRadius: 4
                      }}>
                        RG
                      </span>
                    )}
                  </div>
                ))}
                {syncedObs.length > 10 && (
                  <div style={{ fontSize: 11, color: '#666', padding: '8px 0' }}>
                    + {syncedObs.length - 10} more observations
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Link to create iNat account */}
      <div style={{ fontSize: 11, color: '#713f12' }}>
        Don't have an account?{' '}
        <a 
          href="https://www.inaturalist.org/signup" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#84cc16', display: 'inline-flex', alignItems: 'center', gap: 2 }}
        >
          Create one on iNaturalist <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
};

export default iNaturalistSync;
