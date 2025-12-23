import React, { useState, useMemo } from 'react';
import XercesReportGenerator from './XercesReportGenerator';
import { 
  calculateConnectivityScore, 
  getPropertyObservationStats,
  ConnectivityResult 
} from './ConnectivityScoring';
import INaturalistSync, { SyncedObservation } from './INaturalistSync';
import { PRIVACY_NOTICE, DATA_VISIBILITY } from './PrivacyUtils';
import { X, Flower2, Droplets, Home, TreeDeciduous, Check, Star, Award, Info } from 'lucide-react';

interface GardenRegistrationProps {
  lat: number;
  lng: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  existingGardens?: { lat: number; lng: number }[];
  opportunityZones?: { lat: number; lng: number }[];
  observations?: any[];
  referralCode?: string;
}

// Xerces-based scoring weights
const SCORING_WEIGHTS = {
  floralResources: 0.35,  // 35%
  nestingSites: 0.30,     // 30%
  connectivity: 0.20,     // 20% (calculated separately based on location)
  habitatQuality: 0.15,   // 15%
};

// Plants with point values - fall bloomers get 1.5x multiplier per Xerces research
const PLANT_OPTIONS = [
  { id: 'milkweed', name: 'Milkweed', icon: '🌸', desc: 'Essential for monarchs', points: 15, native: true, season: 'summer' },
  { id: 'goldenrod', name: 'Goldenrod', icon: '💛', desc: 'Critical fall food', points: 20, native: true, season: 'fall', priority: true },
  { id: 'aster', name: 'Asters', icon: '⭐', desc: 'Fall blooms', points: 18, native: true, season: 'fall', priority: true },
  { id: 'rabbitbrush', name: 'Rabbitbrush', icon: '🌾', desc: 'Utah native fall bloomer', points: 20, native: true, season: 'fall', priority: true },
  { id: 'agastache', name: 'Agastache', icon: '💜', desc: 'Blooms June-October', points: 18, native: true, season: 'summer-fall' },
  { id: 'penstemon', name: 'Penstemon', icon: '🔴', desc: 'Utah native', points: 15, native: true, season: 'spring-summer' },
  { id: 'coneflower', name: 'Coneflower', icon: '🌺', desc: 'Native perennial', points: 12, native: true, season: 'summer' },
  { id: 'bee_balm', name: 'Bee Balm', icon: '🌷', desc: 'Hummingbirds too', points: 12, native: false, season: 'summer' },
  { id: 'lavender', name: 'Lavender', icon: '💐', desc: 'Bees love it', points: 8, native: false, season: 'summer' },
  { id: 'sunflower', name: 'Sunflowers', icon: '🌻', desc: 'Seeds & pollen', points: 10, native: false, season: 'summer' },
  { id: 'salvia', name: 'Salvia', icon: '💙', desc: 'Long blooming', points: 10, native: false, season: 'summer' },
  { id: 'clover', name: 'Clover', icon: '🍀', desc: 'Ground cover', points: 6, native: false, season: 'spring-summer' },
  { id: 'herbs', name: 'Flowering Herbs', icon: '🌿', desc: 'Basil, mint, thyme', points: 5, native: false, season: 'summer' },
];

// Features with point values based on Xerces nesting/habitat criteria
const FEATURE_OPTIONS = [
  { id: 'water', name: 'Water Source', icon: <Droplets size={16} />, points: 25, category: 'nesting', desc: 'Shallow water for bees' },
  { id: 'bare_ground', name: 'Bare Ground Patches', icon: '🏜️', points: 20, category: 'nesting', desc: '70% of bees nest in ground' },
  { id: 'brush_pile', name: 'Brush/Log Pile', icon: '🪵', points: 15, category: 'nesting', desc: 'Cavity nesting sites' },
  { id: 'bee_hotel', name: 'Bee Hotel', icon: '🏨', points: 12, category: 'nesting', desc: 'Solitary bee nesting' },
  { id: 'undisturbed', name: 'Undisturbed Area', icon: '🌾', points: 18, category: 'nesting', desc: 'Left wild year-round' },
  { id: 'trees', name: 'Trees/Shrubs', icon: <TreeDeciduous size={16} />, points: 15, category: 'habitat', desc: 'Shelter & nesting' },
  { id: 'no_pesticides', name: 'Pesticide-Free', icon: '🚫', points: 30, category: 'habitat', desc: 'Critical for pollinator health' },
  { id: 'native_majority', name: '50%+ Native Plants', icon: '🏔️', points: 25, category: 'habitat', desc: 'Adapted to local pollinators' },
  { id: 'mulch_leaves', name: 'Leaf Litter/Mulch', icon: '🍂', points: 10, category: 'nesting', desc: 'Overwintering habitat' },
];

// Size multipliers
const SIZE_MULTIPLIERS = {
  small: 1.0,    // < 100 sq ft
  medium: 1.5,   // 100-500 sq ft
  large: 2.0,    // 500+ sq ft
};

// Seasonal coverage bonus
const SEASONAL_BONUS = {
  spring: 10,
  summer: 10,
  fall: 25,  // Extra points for fall (84.5% September deficit)
  winter: 5,
};

const GardenRegistration: React.FC<GardenRegistrationProps> = ({ 
  lat, lng, onSubmit, onCancel,
  existingGardens = [],
  opportunityZones = [],
  observations = [],
  referralCode = ''
}) => {
  const [name, setName] = useState('');
  const [size, setSize] = useState('medium');
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [showConnectivityDetails, setShowConnectivityDetails] = useState(false);
  const [syncedObservations, setSyncedObservations] = useState<SyncedObservation[]>([]);
  const [inatUsername, setInatUsername] = useState('');
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  // Calculate connectivity score based on location
  const connectivityScore = useMemo(() => {
    return calculateConnectivityScore(
      { lat, lng },
      existingGardens,
      opportunityZones,
      observations
    );
  }, [lat, lng, existingGardens, opportunityZones, observations]);

  // Get property-specific observation stats
  const propertyStats = useMemo(() => {
    return getPropertyObservationStats(lat, lng, observations, 500);
  }, [lat, lng, observations]);
  const [showScoreDetails, setShowScoreDetails] = useState(false);

  const togglePlant = (id: string) => {
    setSelectedPlants(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  // Calculate score based on Xerces methodology
  const scoreDetails = useMemo(() => {
    // Floral resources score
    let floralScore = 0;
    let nativeCount = 0;
    let fallBloomerCount = 0;
    const seasons = new Set<string>();
    
    selectedPlants.forEach(plantId => {
      const plant = PLANT_OPTIONS.find(p => p.id === plantId);
      if (plant) {
        floralScore += plant.points;
        if (plant.native) nativeCount++;
        if (plant.season.includes('fall')) fallBloomerCount++;
        plant.season.split('-').forEach(s => seasons.add(s));
      }
    });

    // Diversity bonus
    const diversityBonus = Math.min(selectedPlants.length * 3, 30);
    floralScore += diversityBonus;

    // Fall bloomer bonus (critical for September deficit)
    const fallBonus = fallBloomerCount >= 3 ? 40 : fallBloomerCount * 10;
    floralScore += fallBonus;

    // Nesting score
    let nestingScore = 0;
    selectedFeatures.filter(f => {
      const feature = FEATURE_OPTIONS.find(fo => fo.id === f);
      return feature?.category === 'nesting';
    }).forEach(f => {
      const feature = FEATURE_OPTIONS.find(fo => fo.id === f);
      if (feature) nestingScore += feature.points;
    });

    // Habitat quality score
    let habitatScore = 0;
    selectedFeatures.filter(f => {
      const feature = FEATURE_OPTIONS.find(fo => fo.id === f);
      return feature?.category === 'habitat';
    }).forEach(f => {
      const feature = FEATURE_OPTIONS.find(fo => fo.id === f);
      if (feature) habitatScore += feature.points;
    });

    // Native plant percentage bonus
    if (selectedPlants.length > 0) {
      const nativePercent = nativeCount / selectedPlants.length;
      if (nativePercent >= 0.75) habitatScore += 25;
      else if (nativePercent >= 0.5) habitatScore += 15;
    }

    // Seasonal coverage bonus
    let seasonalBonus = 0;
    seasons.forEach(s => {
      seasonalBonus += SEASONAL_BONUS[s as keyof typeof SEASONAL_BONUS] || 0;
    });

    // Apply size multiplier
    const sizeMultiplier = SIZE_MULTIPLIERS[size as keyof typeof SIZE_MULTIPLIERS];

    // Calculate weighted total (before size multiplier)
    const rawScore = (
      floralScore * SCORING_WEIGHTS.floralResources +
      nestingScore * SCORING_WEIGHTS.nestingSites +
      habitatScore * SCORING_WEIGHTS.habitatQuality +
      seasonalBonus
    );

    // Add connectivity bonus (20% weight)
    const connectivityBonus = Math.round(connectivityScore.bonusPoints * SCORING_WEIGHTS.connectivity);
    
    // Add iNaturalist observation bonus
    let inatBonus = 0;
    if (syncedObservations.length > 0) {
      inatBonus += Math.min(syncedObservations.length * 2, 30); // Base points
      const uniqueSpecies = new Set(syncedObservations.map(o => o.species)).size;
      if (uniqueSpecies >= 10) inatBonus += 15;
      else if (uniqueSpecies >= 5) inatBonus += 8;
      const researchGrade = syncedObservations.filter(o => o.quality_grade === 'research').length;
      if (researchGrade >= 5) inatBonus += 10;
    }
    
    const totalScore = Math.round((rawScore * sizeMultiplier) + connectivityBonus + inatBonus);

    // Determine tier
    let tier = 'Seedling';
    let tierColor = '#94a3b8';
    if (totalScore >= 200) { tier = 'Pollinator Champion'; tierColor = '#eab308'; }
    else if (totalScore >= 150) { tier = 'Habitat Hero'; tierColor = '#8b5cf6'; }
    else if (totalScore >= 100) { tier = 'Bee Friendly'; tierColor = '#22c55e'; }
    else if (totalScore >= 50) { tier = 'Growing'; tierColor = '#3b82f6'; }

    return {
      floralScore: Math.round(floralScore * SCORING_WEIGHTS.floralResources),
      nestingScore: Math.round(nestingScore * SCORING_WEIGHTS.nestingSites),
      habitatScore: Math.round(habitatScore * SCORING_WEIGHTS.habitatQuality),
      connectivityBonus: Math.round(connectivityScore.bonusPoints * SCORING_WEIGHTS.connectivity),
      inatBonus: syncedObservations.length > 0 ? Math.min(syncedObservations.length * 2, 30) + (new Set(syncedObservations.map(o => o.species)).size >= 10 ? 15 : new Set(syncedObservations.map(o => o.species)).size >= 5 ? 8 : 0) : 0,
      syncedObsCount: syncedObservations.length,
      seasonalBonus,
      fallBonus,
      diversityBonus,
      sizeMultiplier,
      totalScore,
      tier,
      tierColor,
      fallBloomerCount,
      nativeCount,
      seasonsCovered: seasons.size,
    };
  }, [selectedPlants, selectedFeatures, size]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const gardenData = {
      lat,
      lng,
      name: name || 'My Pollinator Garden',
      size,
      plants: selectedPlants,
      features: selectedFeatures,
      description,
      email,
      score: scoreDetails.totalScore,
      tier: scoreDetails.tier,
      inat_username: inatUsername,
      synced_observations: syncedObservations.map(o => o.inat_id),
      synced_obs_count: syncedObservations.length,
      referral_code: referralCode,
    };
    await onSubmit(gardenData);
    setSubmittedData(gardenData);
    setSubmitting(false);
    setShowReportGenerator(true);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        maxWidth: 560,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flower2 size={24} color="#22c55e" />
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Register Your Garden</h2>
              <div style={{ fontSize: 11, color: '#666' }}>Xerces Society Scoring System</div>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={24} color="#666" />
          </button>
        </div>

        {/* Live Score Display */}
        <div style={{
          background: `linear-gradient(135deg, ${scoreDetails.tierColor}15 0%, ${scoreDetails.tierColor}30 100%)`,
          padding: '16px 20px',
          borderBottom: `3px solid ${scoreDetails.tierColor}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>HABITAT SCORE</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: scoreDetails.tierColor }}>
                  {scoreDetails.totalScore}
                </span>
                <span style={{ fontSize: 14, color: '#666' }}>points</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                color: scoreDetails.tierColor,
                fontWeight: 600,
                fontSize: 16
              }}>
                <Award size={20} />
                {scoreDetails.tier}
              </div>
              <button 
                onClick={() => setShowScoreDetails(!showScoreDetails)}
                style={{ 
                  fontSize: 11, 
                  color: '#666', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {showScoreDetails ? 'Hide details' : 'See breakdown'}
              </button>
            </div>
          </div>

          {/* Score Breakdown */}
          {showScoreDetails && (
            <div style={{ 
              marginTop: 12, 
              padding: 12, 
              backgroundColor: 'white', 
              borderRadius: 8,
              fontSize: 12
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>🌸 Floral Resources: <strong>{scoreDetails.floralScore}</strong></div>
                <div>🏠 Nesting Sites: <strong>{scoreDetails.nestingScore}</strong></div>
                <div>🌿 Habitat Quality: <strong>{scoreDetails.habitatScore}</strong></div>
                <div>📅 Seasonal Coverage: <strong>+{scoreDetails.seasonalBonus}</strong></div>
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #eee' }}>
                <div>📐 Size multiplier: <strong>{scoreDetails.sizeMultiplier}x</strong></div>
                {scoreDetails.fallBloomerCount >= 1 && (
                  <div style={{ color: '#ea580c' }}>
                    🍂 Fall bloomer bonus: <strong>+{scoreDetails.fallBonus}</strong> 
                    <span style={{ fontSize: 10, marginLeft: 4 }}>(addressing Sept. nectar deficit)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 20 }}>
          {/* Location */}
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 12,
            fontSize: 13,
            color: '#166534'
          }}>
            📍 Location: {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>

          {/* Connectivity & Property Stats */}
          <div style={{ 
            backgroundColor: '#eff6ff', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 20,
            border: '1px solid #bfdbfe'
          }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => setShowConnectivityDetails(!showConnectivityDetails)}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>
                  🔗 Connectivity Bonus: +{scoreDetails.connectivityBonus} pts
                </div>
                <div style={{ fontSize: 11, color: '#3b82f6' }}>
                  {propertyStats.total} wildlife observations within 500m of your property
                </div>
              </div>
              <span style={{ color: '#3b82f6' }}>{showConnectivityDetails ? '▲' : '▼'}</span>
            </div>

            {showConnectivityDetails && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #bfdbfe' }}>
                {/* Connectivity Details */}
                <div style={{ fontSize: 11, marginBottom: 8 }}>
                  {connectivityScore.details.map((detail, i) => (
                    <div key={i} style={{ color: '#1e40af', marginBottom: 2 }}>{detail}</div>
                  ))}
                  {connectivityScore.details.length === 0 && (
                    <div style={{ color: '#6b7280' }}>No connectivity bonuses yet</div>
                  )}
                </div>

                {/* Property Observation Stats */}
                {propertyStats.total > 0 && (
                  <div style={{ 
                    backgroundColor: 'white', 
                    padding: 8, 
                    borderRadius: 6,
                    marginTop: 8
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      YOUR PROPERTY'S WILDLIFE (500m radius)
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(propertyStats.byTaxon).map(([taxon, count]) => (
                        <span 
                          key={taxon}
                          style={{ 
                            fontSize: 10, 
                            padding: '2px 6px', 
                            backgroundColor: '#e0e7ff', 
                            borderRadius: 4,
                            color: '#3730a3'
                          }}
                        >
                          {taxon}: {count}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                      {propertyStats.species.length} unique species observed
                    </div>
                  </div>
                )}

                {/* Proximity info */}
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 8 }}>
                  {connectivityScore.nearestGardenDistance !== null && (
                    <div>📍 Nearest garden: {Math.round(connectivityScore.nearestGardenDistance)}m away</div>
                  )}
                  {connectivityScore.nearestOpportunityZoneDistance !== null && (
                    <div>🎯 Nearest priority zone: {Math.round(connectivityScore.nearestOpportunityZoneDistance)}m away</div>
                  )}
                  <div>🏡 Gardens within 500m: {connectivityScore.gardensWithin500m}</div>
                </div>

                <div style={{ 
                  fontSize: 9, 
                  color: '#9ca3af', 
                  marginTop: 8,
                  fontStyle: 'italic'
                }}>
                  Only observations within 500m of your property count toward your garden score.
                  This ensures fair scoring based on your actual habitat contribution.
                </div>
              </div>
            )}
          </div>

          {/* iNaturalist Sync */}
          <INaturalistSync
            propertyLat={lat}
            propertyLng={lng}
            radiusMeters={500}
            onSyncComplete={(obs: SyncedObservation[]) => setSyncedObservations(obs)}
            existingObservations={syncedObservations}
          />

          {/* Garden Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Garden Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Pollinator Paradise"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Size */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Garden Size <span style={{ fontWeight: 400, color: '#666' }}>(affects score multiplier)</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'small', label: 'Small', desc: '< 100 sq ft', mult: '1x' },
                { id: 'medium', label: 'Medium', desc: '100-500 sq ft', mult: '1.5x' },
                { id: 'large', label: 'Large', desc: '500+ sq ft', mult: '2x' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: size === s.id ? '2px solid #22c55e' : '1px solid #ddd',
                    backgroundColor: size === s.id ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>{s.desc}</div>
                  <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>{s.mult}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Priority Fall Plants */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              <span style={{ color: '#ea580c' }}>🍂 Priority: Fall Bloomers</span>
              <span style={{ fontWeight: 400, color: '#666', marginLeft: 8 }}>
                (84.5% September nectar deficit in Utah)
              </span>
            </label>
            <div style={{ 
              backgroundColor: '#fff7ed', 
              padding: 8, 
              borderRadius: 8, 
              marginBottom: 8,
              fontSize: 11,
              color: '#9a3412',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Info size={14} />
              Fall blooming plants earn bonus points - select 3+ for maximum benefit!
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLANT_OPTIONS.filter(p => p.season.includes('fall')).map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlant(p.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 20,
                    border: selectedPlants.includes(p.id) ? '2px solid #ea580c' : '1px solid #fed7aa',
                    backgroundColor: selectedPlants.includes(p.id) ? '#fff7ed' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12
                  }}
                  title={p.desc}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                  <span style={{ 
                    fontSize: 9, 
                    backgroundColor: '#fdba74', 
                    color: '#9a3412',
                    padding: '1px 4px', 
                    borderRadius: 4 
                  }}>
                    +{p.points}
                  </span>
                  {selectedPlants.includes(p.id) && <Check size={12} color="#ea580c" />}
                </button>
              ))}
            </div>
          </div>

          {/* Other Plants */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              🌸 Other Pollinator Plants
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLANT_OPTIONS.filter(p => !p.season.includes('fall')).map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlant(p.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: selectedPlants.includes(p.id) ? '2px solid #22c55e' : '1px solid #ddd',
                    backgroundColor: selectedPlants.includes(p.id) ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12
                  }}
                  title={p.desc}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                  {p.native && <span style={{ fontSize: 9, color: '#166534' }}>native</span>}
                  <span style={{ fontSize: 9, color: '#22c55e' }}>+{p.points}</span>
                  {selectedPlants.includes(p.id) && <Check size={12} color="#22c55e" />}
                </button>
              ))}
            </div>
          </div>

          {/* Features - Nesting */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              🏠 Nesting Resources <span style={{ fontWeight: 400, color: '#666' }}>(30% of score)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FEATURE_OPTIONS.filter(f => f.category === 'nesting').map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFeature(f.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 20,
                    border: selectedFeatures.includes(f.id) ? '2px solid #8b5cf6' : '1px solid #ddd',
                    backgroundColor: selectedFeatures.includes(f.id) ? '#f5f3ff' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12
                  }}
                  title={f.desc}
                >
                  <span>{typeof f.icon === 'string' ? f.icon : f.icon}</span>
                  <span>{f.name}</span>
                  <span style={{ fontSize: 9, color: '#8b5cf6' }}>+{f.points}</span>
                  {selectedFeatures.includes(f.id) && <Check size={12} color="#8b5cf6" />}
                </button>
              ))}
            </div>
          </div>

          {/* Features - Habitat */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              🌿 Habitat Quality <span style={{ fontWeight: 400, color: '#666' }}>(15% of score)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FEATURE_OPTIONS.filter(f => f.category === 'habitat').map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFeature(f.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 20,
                    border: selectedFeatures.includes(f.id) ? '2px solid #059669' : '1px solid #ddd',
                    backgroundColor: selectedFeatures.includes(f.id) ? '#ecfdf5' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12
                  }}
                  title={f.desc}
                >
                  <span>{typeof f.icon === 'string' ? f.icon : f.icon}</span>
                  <span>{f.name}</span>
                  <span style={{ fontSize: 9, color: '#059669' }}>+{f.points}</span>
                  {selectedFeatures.includes(f.id) && <Check size={12} color="#059669" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Description <span style={{ fontWeight: 400, color: '#666' }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell us about your garden..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Email <span style={{ fontWeight: 400, color: '#666' }}>(optional - for updates)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="gardener@example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Tier Progress */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 16 
          }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>CERTIFICATION TIERS</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { name: 'Seedling', min: 0, color: '#94a3b8' },
                { name: 'Growing', min: 50, color: '#3b82f6' },
                { name: 'Bee Friendly', min: 100, color: '#22c55e' },
                { name: 'Habitat Hero', min: 150, color: '#8b5cf6' },
                { name: 'Champion', min: 200, color: '#eab308' },
              ].map((tier, i) => (
                <div 
                  key={tier.name}
                  style={{ 
                    flex: 1,
                    padding: '6px 4px',
                    backgroundColor: scoreDetails.totalScore >= tier.min ? tier.color : '#e2e8f0',
                    borderRadius: 4,
                    textAlign: 'center',
                    fontSize: 9,
                    color: scoreDetails.totalScore >= tier.min ? 'white' : '#94a3b8',
                    fontWeight: scoreDetails.tier === tier.name ? 700 : 400,
                  }}
                >
                  {tier.name}
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Notice */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16
          }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🔒</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
                  Your Privacy is Protected
                </span>
              </div>
              <span style={{ color: '#0369a1', fontSize: 12 }}>
                {showPrivacyInfo ? '▲' : '▼'}
              </span>
            </div>

            {showPrivacyInfo && (
              <div style={{ marginTop: 12, fontSize: 11 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                    ✓ Shown Publicly (Anonymous):
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: '#374151' }}>
                    {DATA_VISIBILITY.public.map((item, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
                    ✗ Never Shared:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: '#374151' }}>
                    {DATA_VISIBILITY.private.map((item, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ 
                  marginTop: 8, 
                  paddingTop: 8, 
                  borderTop: '1px solid #bae6fd',
                  color: '#0369a1',
                  fontStyle: 'italic'
                }}>
                  Your exact location is offset by ~50m on public maps.
                  Gardens appear as "Pollinator Habitat UPP-XXXX" to others.
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: scoreDetails.tierColor,
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Award size={20} />
            {submitting ? 'Registering...' : `Register as ${scoreDetails.tier} (${scoreDetails.totalScore} pts)`}
          </button>

          <p style={{ 
            textAlign: 'center', 
            fontSize: 11, 
            color: '#888', 
            marginTop: 12 
          }}>
            Scoring based on Xerces Society habitat assessment methodology 🦋
          </p>
        </div>
      </div>

      {/* Xerces Report Generator Modal */}
      {showReportGenerator && submittedData && (
        <XercesReportGenerator
          gardenData={submittedData}
          onClose={() => {
            setShowReportGenerator(false);
            onCancel(); // Close the whole registration modal
          }}
        />
      )}
    </div>
  );
};

export default GardenRegistration;
