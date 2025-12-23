import React, { useState, useEffect } from 'react';
import INaturalistSync from './INaturalistSync';
import NeighborDiscovery from './NeighborDiscovery';
import {
  User, Leaf, Bug, Users, TrendingUp, Award, MapPin, Calendar,
  ChevronRight, Settings, LogOut, Shield, Camera, Edit, Share2,
  BarChart3, Target, Zap, Crown
} from 'lucide-react';
import VerificationSystem, { VerificationStatus, PlantEntry } from './VerificationSystem';
import NeighborRecruitment from './NeighborRecruitment';

interface UserDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  gardenData: GardenData | null;
  observations: SyncedObservation[];
  onEditGarden: () => void;
  onStartCapture: () => void;
  onUpdateGarden?: (data: any) => void;
}

interface GardenData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  size: string;
  plants: string[];
  features: string[];
  score: number;
  tier: string;
  registeredAt: string;
  verification?: VerificationStatus;
  referralCode: string;
  referralCount: number;
  plantLog?: PlantEntry[];
}

interface SyncedObservation {
  id: string;
  species: string;
  common_name: string;
  observed_on: string;
  taxon: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  target?: number;
}

const UserDashboard: React.FC<UserDashboardProps> = ({
  isOpen,
  onClose,
  gardenData,
  observations,
  onEditGarden,
  onStartCapture
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'verification' | 'observations' | 'network' | 'achievements'>('overview');

  if (!isOpen) return null;

  // Calculate stats
  const verifiedScore = gardenData?.verification?.level === 'professional'
    ? Math.round((gardenData?.score || 0) * 1.5)
    : gardenData?.verification?.level === 'community'
    ? Math.round((gardenData?.score || 0) * 1.25)
    : gardenData?.score || 0;

  const daysActive = gardenData?.registeredAt
    ? Math.floor((Date.now() - new Date(gardenData.registeredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const nativePlantCount = (gardenData?.plants || []).filter(p =>
    ['penstemon', 'milkweed', 'goldenrod', 'aster', 'rabbitbrush', 'lupine', 'echinacea', 'blanketflower', 'beebalm', 'phacelia', 'buckwheat', 'agastache', 'salvia'].includes(p)
  ).length;

  const fallBloomerCount = (gardenData?.plants || []).filter(p =>
    ['goldenrod', 'aster', 'rabbitbrush', 'agastache'].includes(p)
  ).length;

  // Generate achievements
  const achievements: Achievement[] = [
    {
      id: 'first_garden',
      name: 'Garden Starter',
      description: 'Register your first pollinator garden',
      icon: '🌱',
      earned: !!gardenData,
      earnedAt: gardenData?.registeredAt
    },
    {
      id: 'fall_hero',
      name: 'Fall Nectar Hero',
      description: 'Plant 3+ fall blooming species',
      icon: '🍂',
      earned: fallBloomerCount >= 3,
      progress: fallBloomerCount,
      target: 3
    },
    {
      id: 'native_champion',
      name: 'Native Champion',
      description: 'Plant 5+ native species',
      icon: '🏆',
      earned: nativePlantCount >= 5,
      progress: nativePlantCount,
      target: 5
    },
    {
      id: 'observer',
      name: 'Wildlife Observer',
      description: 'Log 10 observations',
      icon: '📸',
      earned: observations.length >= 10,
      progress: observations.length,
      target: 10
    },
    {
      id: 'recruiter',
      name: 'Network Builder',
      description: 'Recruit 3 neighbors',
      icon: '👥',
      earned: (gardenData?.referralCount || 0) >= 3,
      progress: gardenData?.referralCount || 0,
      target: 3
    },
    {
      id: 'verified',
      name: 'Verified Habitat',
      description: 'Get your garden verified',
      icon: '✅',
      earned: !!gardenData?.verification?.level && gardenData.verification.level !== 'unverified'
    },
    {
      id: 'pro_verified',
      name: 'Pro Certified',
      description: 'Get professional verification',
      icon: '⭐',
      earned: gardenData?.verification?.level === 'professional'
    },
    {
      id: 'bee_friendly',
      name: 'Bee Friendly',
      description: 'Reach Bee Friendly tier',
      icon: '🐝',
      earned: ['Bee Friendly', 'Habitat Hero', 'Pollinator Champion'].includes(gardenData?.tier || '')
    },
    {
      id: 'champion',
      name: 'Pollinator Champion',
      description: 'Reach the highest tier',
      icon: '👑',
      earned: gardenData?.tier === 'Pollinator Champion'
    },
    {
      id: 'pesticide_free',
      name: 'Chemical Free',
      description: 'Maintain pesticide-free garden',
      icon: '🚫',
      earned: (gardenData?.features || []).includes('no_pesticides')
    }
  ];

  const earnedAchievements = achievements.filter(a => a.earned);
  const inProgressAchievements = achievements.filter(a => !a.earned && a.progress !== undefined);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{ flex: 1 }}
      />

      {/* Drawer */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#f9fafb',
        height: '100%',
        overflowY: 'auto',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          padding: 20,
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>
                {gardenData?.name || 'My Garden'}
              </h2>
              <div style={{ fontSize: 13, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} />
                {gardenData ? `${gardenData.lat.toFixed(4)}, ${gardenData.lng.toFixed(4)}` : 'Not registered'}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                color: 'white'
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Stats */}
          {gardenData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 16
            }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 12,
                borderRadius: 10,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{verifiedScore}</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>Score</div>
              </div>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 12,
                borderRadius: 10,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{observations.length}</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>Observations</div>
              </div>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 12,
                borderRadius: 10,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{gardenData.referralCount}</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>Referrals</div>
              </div>
            </div>
          )}

          {/* Tier Badge */}
          {gardenData && (
            <div style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#166534',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                {gardenData.tier === 'Pollinator Champion' ? '👑' :
                 gardenData.tier === 'Habitat Hero' ? '🦸' :
                 gardenData.tier === 'Bee Friendly' ? '🐝' :
                 gardenData.tier === 'Growing' ? '🌱' : '🌰'}
                {gardenData.tier}
              </div>
              {gardenData.verification?.level && gardenData.verification.level !== 'unverified' && (
                <div style={{
                  backgroundColor: gardenData.verification.level === 'professional' ? '#fbbf24' : 'rgba(255,255,255,0.9)',
                  color: gardenData.verification.level === 'professional' ? '#78350f' : '#166534',
                  padding: '6px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Shield size={12} />
                  {gardenData.verification.level === 'professional' ? '1.5x' : '1.25x'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'verification', label: 'Verify', icon: Shield },
            { id: 'observations', label: 'Obs', icon: Camera },
            { id: 'network', label: 'Network', icon: Users },
            { id: 'achievements', label: 'Awards', icon: Award },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                backgroundColor: activeSection === tab.id ? '#f0fdf4' : 'transparent',
                borderBottom: activeSection === tab.id ? '2px solid #22c55e' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: activeSection === tab.id ? '#166534' : '#6b7280',
                minWidth: 60
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          {/* No Garden State */}
          {!gardenData && (
            <div style={{
              textAlign: 'center',
              padding: 40
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌻</div>
              <h3 style={{ margin: '0 0 8px' }}>No Garden Registered</h3>
              <p style={{ color: '#666', marginBottom: 20 }}>
                Register your garden to track your impact and earn achievements!
              </p>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Register Garden
              </button>
            </div>
          )}

          {/* Overview Section */}
          {gardenData && activeSection === 'overview' && (
            <div>
              {/* Quick Actions */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                marginBottom: 20
              }}>
                <button
                  onClick={onStartCapture}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: 'none',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Camera size={24} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Log Observation</span>
                </button>
                <button
                  onClick={onEditGarden}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Edit size={24} color="#666" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Edit Garden</span>
                </button>
              </div>

              {/* Score Breakdown */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={16} color="#22c55e" />
                  Score Breakdown
                </h4>
                
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>Base Score</span>
                    <span style={{ fontWeight: 600 }}>{gardenData.score}</span>
                  </div>
                  {gardenData.verification?.level && gardenData.verification.level !== 'unverified' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: '#22c55e' }}>
                      <span>Verification Bonus ({gardenData.verification.level === 'professional' ? '1.5x' : '1.25x'})</span>
                      <span style={{ fontWeight: 600 }}>+{verifiedScore - gardenData.score}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                    <span style={{ fontWeight: 600 }}>Total</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{verifiedScore}</span>
                  </div>
                </div>
              </div>

              {/* Garden Stats */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Leaf size={16} color="#22c55e" />
                  Garden Stats
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <div style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>{gardenData.plants.length}</div>
                    <div style={{ fontSize: 11, color: '#166534' }}>Plant Species</div>
                  </div>
                  <div style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>{fallBloomerCount}</div>
                    <div style={{ fontSize: 11, color: '#92400e' }}>Fall Bloomers</div>
                  </div>
                  <div style={{ backgroundColor: '#dbeafe', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1e40af' }}>{nativePlantCount}</div>
                    <div style={{ fontSize: 11, color: '#1e40af' }}>Native Plants</div>
                  </div>
                  <div style={{ backgroundColor: '#f3e8ff', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>{daysActive}</div>
                    <div style={{ fontSize: 11, color: '#7c3aed' }}>Days Active</div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 16
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Habitat Features</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {gardenData.features.map(f => (
                    <span key={f} style={{
                      padding: '6px 12px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: 20,
                      fontSize: 12,
                      color: '#166534'
                    }}>
                      {f === 'water' ? '💧 Water' :
                       f === 'no_pesticides' ? '🚫 Pesticide-free' :
                       f === 'bare_ground' ? '🪨 Bare ground' :
                       f === 'brush_pile' ? '🪵 Brush pile' :
                       f === 'bee_hotel' ? '🏠 Bee hotel' :
                       f === 'undisturbed' ? '🌿 Undisturbed' :
                       f === 'leaf_litter' ? '🍂 Leaf litter' : f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Verification Section */}
          {gardenData && activeSection === 'verification' && (
            <VerificationSystem
              gardenId={gardenData.id}
              gardenName={gardenData.name}
              currentTier={gardenData.tier}
              currentScore={gardenData.score}
              verificationStatus={gardenData.verification || { level: 'unverified' }}
              plants={gardenData.plantLog || []}
              onScheduleProfessional={(date, time) => {
                console.log('Schedule:', date, time);
                alert(`Verification scheduled for ${date} at ${time}. You will receive a confirmation email.`);
              }}
              onRequestCommunity={() => {
                console.log('Request community verification');
                alert('Verification request sent to nearby gardeners!');
              }}
              onAddNewPlant={(plant) => {
                console.log('Add plant:', plant);
              }}
            />
          )}

          {/* Observations Section */}
          {gardenData && activeSection === 'observations' && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Your Observations</h3>
                <button
                  onClick={onStartCapture}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Camera size={14} />
                  New
                </button>
              </div>

              {observations.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 40,
                  backgroundColor: 'white',
                  borderRadius: 12
                }}>
                  <Camera size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
                  <p style={{ color: '#666', margin: 0 }}>No observations yet</p>
                  <p style={{ color: '#9ca3af', fontSize: 12, margin: '8px 0 0' }}>
                    Tap "Log Observation" when you spot a pollinator!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {observations.map(obs => (
                    <div
                      key={obs.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: 10,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{obs.common_name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {obs.taxon} • {new Date(obs.observed_on).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: 20,
                        fontSize: 11,
                        color: '#166534'
                      }}>
                        {obs.taxon === 'Insecta' ? '🐝' : obs.taxon === 'Aves' ? '🐦' : '🌿'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Network Section */}
          {gardenData && activeSection === 'network' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <NeighborDiscovery
                  gardenId={gardenData.id}
                  gardenLat={gardenData.lat}
                  gardenLng={gardenData.lng}
                  isDiscoverable={true}
                  onToggleDiscoverable={(value) => console.log('Toggle discoverable:', value)}
                />
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Invite Neighbors</h4>
              </div>
              <NeighborRecruitment
              gardenId={gardenData.id}
              gardenName={gardenData.name}
              gardenLat={gardenData.lat}
              gardenLng={gardenData.lng}
              referralCode={gardenData.referralCode}
              referralCount={gardenData.referralCount}
              neighborGardens={[]}
              />
            </>
          )}

          {/* Achievements Section */}
          {gardenData && activeSection === 'achievements' && (
            <div>
              {/* Earned */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#166534' }}>
                  🏆 Earned ({earnedAchievements.length}/{achievements.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {earnedAchievements.map(a => (
                    <div
                      key={a.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: 10,
                        padding: 12,
                        border: '2px solid #22c55e'
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{a.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>{a.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* In Progress */}
              {inProgressAchievements.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#666' }}>
                    🎯 In Progress
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {inProgressAchievements.map(a => (
                      <div
                        key={a.id}
                        style={{
                          backgroundColor: 'white',
                          borderRadius: 10,
                          padding: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 24 }}>{a.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                            <div style={{ fontSize: 10, color: '#666' }}>{a.description}</div>
                            <div style={{
                              marginTop: 6,
                              height: 6,
                              backgroundColor: '#e5e7eb',
                              borderRadius: 3,
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${((a.progress || 0) / (a.target || 1)) * 100}%`,
                                backgroundColor: '#22c55e'
                              }} />
                            </div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                              {a.progress}/{a.target}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
