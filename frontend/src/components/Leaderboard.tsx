import React, { useState, useEffect } from 'react';
import {
  Trophy, Medal, Award, MapPin, Users, TrendingUp, Leaf,
  ChevronDown, ChevronUp, Crown, Star, Target, Flame, Filter
} from 'lucide-react';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  userGardenId?: string;
  gardens: GardenEntry[];
}

interface GardenEntry {
  id: string;
  anonymousId: string;
  city: string;
  neighborhood?: string;
  score: number;
  verifiedScore: number;
  tier: string;
  plantCount: number;
  nativePlantCount: number;
  fallBloomerCount: number;
  observationCount: number;
  referralCount: number;
  verificationLevel: 'unverified' | 'community' | 'professional';
  registeredAt: string;
  isCurrentUser?: boolean;
}

interface CityStats {
  city: string;
  totalGardens: number;
  totalScore: number;
  avgScore: number;
  totalObservations: number;
  verifiedCount: number;
  topTier: string;
}

interface ClusterStats {
  name: string;
  city: string;
  gardenCount: number;
  totalScore: number;
  radius: number; // meters
}

type TimeFilter = 'all' | 'month' | 'week';
type ViewMode = 'cities' | 'gardens' | 'clusters' | 'achievements';

const TIER_COLORS: Record<string, string> = {
  'Pollinator Champion': '#eab308',
  'Habitat Hero': '#8b5cf6',
  'Bee Friendly': '#22c55e',
  'Growing': '#3b82f6',
  'Seedling': '#94a3b8',
};

const TIER_ICONS: Record<string, string> = {
  'Pollinator Champion': '👑',
  'Habitat Hero': '🦸',
  'Bee Friendly': '🐝',
  'Growing': '🌱',
  'Seedling': '🌰',
};

const Leaderboard: React.FC<LeaderboardProps> = ({
  isOpen,
  onClose,
  userGardenId,
  gardens
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cities');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  if (!isOpen) return null;

  // Filter by time
  const filteredGardens = gardens.filter(g => {
    if (timeFilter === 'all') return true;
    const regDate = new Date(g.registeredAt);
    const now = new Date();
    if (timeFilter === 'month') {
      return regDate >= new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return regDate >= weekAgo;
    }
    return true;
  });

  // Calculate city stats
  const cityStats: CityStats[] = Object.entries(
    filteredGardens.reduce((acc, g) => {
      if (!acc[g.city]) {
        acc[g.city] = {
          city: g.city,
          totalGardens: 0,
          totalScore: 0,
          totalObservations: 0,
          verifiedCount: 0,
          tiers: {} as Record<string, number>
        };
      }
      acc[g.city].totalGardens++;
      acc[g.city].totalScore += g.verifiedScore;
      acc[g.city].totalObservations += g.observationCount;
      if (g.verificationLevel !== 'unverified') acc[g.city].verifiedCount++;
      acc[g.city].tiers[g.tier] = (acc[g.city].tiers[g.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, any>)
  ).map(([city, data]) => ({
    city,
    totalGardens: data.totalGardens,
    totalScore: data.totalScore,
    avgScore: Math.round(data.totalScore / data.totalGardens),
    totalObservations: data.totalObservations,
    verifiedCount: data.verifiedCount,
    topTier: Object.entries(data.tiers).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'Seedling'
  })).sort((a, b) => b.totalScore - a.totalScore);

  // Rank individual gardens
  const rankedGardens = [...filteredGardens]
    .sort((a, b) => b.verifiedScore - a.verifiedScore)
    .map((g, i) => ({ ...g, rank: i + 1 }));

  // Find user's rank
  const userRank = userGardenId 
    ? rankedGardens.findIndex(g => g.id === userGardenId) + 1
    : null;

  // Calculate totals
  const totalGardens = filteredGardens.length;
  const totalScore = filteredGardens.reduce((sum, g) => sum + g.verifiedScore, 0);
  const totalObservations = filteredGardens.reduce((sum, g) => sum + g.observationCount, 0);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: '#fbbf24', label: '1st' };
    if (rank === 2) return { icon: '🥈', color: '#94a3b8', label: '2nd' };
    if (rank === 3) return { icon: '🥉', color: '#cd7f32', label: '3rd' };
    if (rank <= 10) return { icon: '🏅', color: '#22c55e', label: `#${rank}` };
    return { icon: '', color: '#6b7280', label: `#${rank}` };
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16
    }}>
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: 20,
        width: '100%',
        maxWidth: 500,
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: 20,
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Trophy size={28} />
                Leaderboard
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                Utah Pollinator Path Rankings
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                color: 'white',
                fontSize: 18
              }}
            >
              ✕
            </button>
          </div>

          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 16
          }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 10,
              borderRadius: 10,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{totalGardens}</div>
              <div style={{ fontSize: 10 }}>Gardens</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 10,
              borderRadius: 10,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{totalScore.toLocaleString()}</div>
              <div style={{ fontSize: 10 }}>Total Score</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 10,
              borderRadius: 10,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{totalObservations}</div>
              <div style={{ fontSize: 10 }}>Observations</div>
            </div>
          </div>

          {/* User Rank */}
          {userRank && (
            <div style={{
              marginTop: 12,
              backgroundColor: 'rgba(255,255,255,0.95)',
              padding: 10,
              borderRadius: 10,
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
              <span style={{ fontSize: 20 }}>{getRankBadge(userRank).icon || '📍'}</span>
              <span style={{ fontWeight: 600 }}>Your Rank: #{userRank} of {totalGardens}</span>
            </div>
          )}
        </div>

        {/* View Mode Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {[
            { id: 'cities', label: 'Cities', icon: MapPin },
            { id: 'gardens', label: 'Gardens', icon: Leaf },
            { id: 'achievements', label: 'Records', icon: Star },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                backgroundColor: viewMode === tab.id ? '#fff7ed' : 'transparent',
                borderBottom: viewMode === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: viewMode === tab.id ? 600 : 400,
                color: viewMode === tab.id ? '#d97706' : '#6b7280'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Time Filter */}
        <div style={{
          padding: '8px 16px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: 8
        }}>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'month', label: 'This Month' },
            { id: 'week', label: 'This Week' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setTimeFilter(filter.id as TimeFilter)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: 'none',
                backgroundColor: timeFilter === filter.id ? '#f59e0b' : '#f3f4f6',
                color: timeFilter === filter.id ? 'white' : '#374151',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* Cities View */}
          {viewMode === 'cities' && (
            <div>
              {cityStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                  No gardens registered yet
                </div>
              ) : (
                cityStats.map((city, index) => {
                  const badge = getRankBadge(index + 1);
                  const isExpanded = expandedCity === city.city;
                  const cityGardens = rankedGardens.filter(g => g.city === city.city);
                  
                  return (
                    <div
                      key={city.city}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: 12,
                        marginBottom: 12,
                        overflow: 'hidden',
                        border: index < 3 ? `2px solid ${badge.color}` : '1px solid #e5e7eb'
                      }}
                    >
                      <button
                        onClick={() => setExpandedCity(isExpanded ? null : city.city)}
                        style={{
                          width: '100%',
                          padding: 14,
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          textAlign: 'left'
                        }}
                      >
                        {/* Rank */}
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: index < 3 ? badge.color : '#f3f4f6',
                          color: index < 3 ? 'white' : '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: index < 3 ? 18 : 14,
                          fontWeight: 700
                        }}>
                          {index < 3 ? badge.icon : index + 1}
                        </div>

                        {/* City Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{city.city}</div>
                          <div style={{ fontSize: 12, color: '#666', display: 'flex', gap: 12 }}>
                            <span>{city.totalGardens} gardens</span>
                            <span>{city.verifiedCount} verified</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
                            {city.totalScore.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 10, color: '#666' }}>total pts</div>
                        </div>

                        {/* Expand */}
                        {isExpanded ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                      </button>

                      {/* Expanded City Details */}
                      {isExpanded && (
                        <div style={{
                          borderTop: '1px solid #e5e7eb',
                          padding: 14,
                          backgroundColor: '#f9fafb'
                        }}>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)', 
                            gap: 8,
                            marginBottom: 12
                          }}>
                            <div style={{ backgroundColor: 'white', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{city.avgScore}</div>
                              <div style={{ fontSize: 10, color: '#666' }}>Avg Score</div>
                            </div>
                            <div style={{ backgroundColor: 'white', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{city.totalObservations}</div>
                              <div style={{ fontSize: 10, color: '#666' }}>Observations</div>
                            </div>
                            <div style={{ backgroundColor: 'white', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                              <div style={{ fontSize: 16 }}>{TIER_ICONS[city.topTier]}</div>
                              <div style={{ fontSize: 10, color: '#666' }}>Top Tier</div>
                            </div>
                          </div>

                          {/* Top gardens in city */}
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Top Gardens:</div>
                          {cityGardens.slice(0, 5).map((g, i) => (
                            <div
                              key={g.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: i < 4 ? '1px solid #e5e7eb' : 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>{TIER_ICONS[g.tier]}</span>
                                <span style={{ fontSize: 13 }}>Habitat {g.anonymousId}</span>
                                {g.verificationLevel !== 'unverified' && (
                                  <span style={{
                                    fontSize: 9,
                                    padding: '2px 6px',
                                    backgroundColor: g.verificationLevel === 'professional' ? '#fef3c7' : '#dcfce7',
                                    borderRadius: 10,
                                    color: g.verificationLevel === 'professional' ? '#92400e' : '#166534'
                                  }}>
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span style={{ fontWeight: 600, color: '#f59e0b' }}>{g.verifiedScore}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Gardens View */}
          {viewMode === 'gardens' && (
            <div>
              {rankedGardens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                  No gardens registered yet
                </div>
              ) : (
                rankedGardens.slice(0, 50).map((garden) => {
                  const badge = getRankBadge(garden.rank);
                  const isUser = garden.id === userGardenId;

                  return (
                    <div
                      key={garden.id}
                      style={{
                        backgroundColor: isUser ? '#fff7ed' : 'white',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 8,
                        border: isUser ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      {/* Rank */}
                      <div style={{
                        width: 32,
                        textAlign: 'center',
                        fontWeight: 700,
                        color: badge.color
                      }}>
                        {garden.rank <= 3 ? (
                          <span style={{ fontSize: 20 }}>{badge.icon}</span>
                        ) : (
                          <span style={{ fontSize: 14 }}>#{garden.rank}</span>
                        )}
                      </div>

                      {/* Garden Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{TIER_ICONS[garden.tier]}</span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {isUser ? '⭐ You' : `Habitat ${garden.anonymousId}`}
                          </span>
                          {garden.verificationLevel !== 'unverified' && (
                            <span style={{
                              fontSize: 9,
                              padding: '2px 6px',
                              backgroundColor: garden.verificationLevel === 'professional' ? '#fef3c7' : '#dcfce7',
                              borderRadius: 10,
                              color: garden.verificationLevel === 'professional' ? '#92400e' : '#166534'
                            }}>
                              {garden.verificationLevel === 'professional' ? '⭐ PRO' : '✓'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#666', display: 'flex', gap: 8, marginTop: 2 }}>
                          <span>{garden.city}</span>
                          <span>•</span>
                          <span>{garden.plantCount} plants</span>
                          <span>•</span>
                          <span>{garden.observationCount} obs</span>
                        </div>
                      </div>

                      {/* Score */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
                          {garden.verifiedScore}
                        </div>
                        {garden.verificationLevel !== 'unverified' && garden.verifiedScore > garden.score && (
                          <div style={{ fontSize: 9, color: '#22c55e' }}>
                            +{garden.verifiedScore - garden.score} verified
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Achievements/Records View */}
          {viewMode === 'achievements' && (
            <div>
              {/* Records */}
              {[
                {
                  title: '👑 Highest Score',
                  garden: rankedGardens[0],
                  value: rankedGardens[0]?.verifiedScore,
                  suffix: 'pts'
                },
                {
                  title: '🌿 Most Plants',
                  garden: [...filteredGardens].sort((a, b) => b.plantCount - a.plantCount)[0],
                  value: [...filteredGardens].sort((a, b) => b.plantCount - a.plantCount)[0]?.plantCount,
                  suffix: 'species'
                },
                {
                  title: '🍂 Fall Bloomer Champion',
                  garden: [...filteredGardens].sort((a, b) => b.fallBloomerCount - a.fallBloomerCount)[0],
                  value: [...filteredGardens].sort((a, b) => b.fallBloomerCount - a.fallBloomerCount)[0]?.fallBloomerCount,
                  suffix: 'fall species'
                },
                {
                  title: '📸 Most Observations',
                  garden: [...filteredGardens].sort((a, b) => b.observationCount - a.observationCount)[0],
                  value: [...filteredGardens].sort((a, b) => b.observationCount - a.observationCount)[0]?.observationCount,
                  suffix: 'observations'
                },
                {
                  title: '👥 Top Recruiter',
                  garden: [...filteredGardens].sort((a, b) => b.referralCount - a.referralCount)[0],
                  value: [...filteredGardens].sort((a, b) => b.referralCount - a.referralCount)[0]?.referralCount,
                  suffix: 'referrals'
                },
                {
                  title: '🌱 Native Plant Leader',
                  garden: [...filteredGardens].sort((a, b) => b.nativePlantCount - a.nativePlantCount)[0],
                  value: [...filteredGardens].sort((a, b) => b.nativePlantCount - a.nativePlantCount)[0]?.nativePlantCount,
                  suffix: 'native species'
                },
              ].map((record, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                    {record.title}
                  </div>
                  {record.garden ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{TIER_ICONS[record.garden.tier]}</span>
                        <div>
                          <div style={{ fontWeight: 500 }}>Habitat {record.garden.anonymousId}</div>
                          <div style={{ fontSize: 11, color: '#666' }}>{record.garden.city}</div>
                        </div>
                      </div>
                      <div style={{
                        backgroundColor: '#fef3c7',
                        padding: '8px 14px',
                        borderRadius: 20,
                        fontWeight: 700,
                        color: '#92400e'
                      }}>
                        {record.value} {record.suffix}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#666', fontSize: 13 }}>No data yet</div>
                  )}
                </div>
              ))}

              {/* Community Goals */}
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #bbf7d0',
                marginTop: 20
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={16} />
                  Community Goals
                </h4>
                
                {[
                  { label: '100 Gardens', current: totalGardens, target: 100 },
                  { label: '10,000 Total Score', current: totalScore, target: 10000 },
                  { label: '500 Observations', current: totalObservations, target: 500 },
                ].map((goal, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{goal.label}</span>
                      <span style={{ fontWeight: 600 }}>{goal.current.toLocaleString()} / {goal.target.toLocaleString()}</span>
                    </div>
                    <div style={{
                      height: 8,
                      backgroundColor: '#dcfce7',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, (goal.current / goal.target) * 100)}%`,
                        backgroundColor: '#22c55e',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
