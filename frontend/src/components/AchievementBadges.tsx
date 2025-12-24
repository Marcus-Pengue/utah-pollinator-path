import React, { useState, useEffect } from 'react';
import { Trophy, Star, Lock, CheckCircle, Sparkles, Target, Flower2, Users, Camera, MapPin, Calendar, Zap } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'garden' | 'observations' | 'community' | 'seasonal' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
  secret?: boolean;
}

interface AchievementBadgesProps {
  userStats: {
    gardenScore?: number;
    plantCount?: number;
    observationCount?: number;
    speciesCount?: number;
    neighborCount?: number;
    messagesCount?: number;
    daysActive?: number;
    monthsWithObservations?: number;
    corridorConnections?: number;
  };
  onBadgeUnlock?: (badge: Badge) => void;
}

const TIER_COLORS = {
  bronze: { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  silver: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
  gold: { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
  platinum: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' },
};

const CATEGORY_ICONS = {
  garden: '🌻',
  observations: '📸',
  community: '🤝',
  seasonal: '🗓️',
  special: '✨',
};

const AchievementBadges: React.FC<AchievementBadgesProps> = ({ userStats, onBadgeUnlock }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  // Define all badges
  const badges: Badge[] = React.useMemo(() => [
    // Garden Badges
    {
      id: 'first-garden',
      name: 'Garden Starter',
      description: 'Register your first pollinator garden',
      icon: '🌱',
      category: 'garden',
      tier: 'bronze',
      requirement: 1,
      progress: userStats.gardenScore ? 1 : 0,
      unlocked: (userStats.gardenScore || 0) >= 1,
    },
    {
      id: 'plant-collector-10',
      name: 'Plant Collector',
      description: 'Add 10 plants to your garden',
      icon: '🌸',
      category: 'garden',
      tier: 'bronze',
      requirement: 10,
      progress: userStats.plantCount || 0,
      unlocked: (userStats.plantCount || 0) >= 10,
    },
    {
      id: 'plant-collector-25',
      name: 'Botanical Expert',
      description: 'Add 25 plants to your garden',
      icon: '🌺',
      category: 'garden',
      tier: 'silver',
      requirement: 25,
      progress: userStats.plantCount || 0,
      unlocked: (userStats.plantCount || 0) >= 25,
    },
    {
      id: 'garden-master',
      name: 'Garden Master',
      description: 'Achieve a garden score of 80+',
      icon: '🏆',
      category: 'garden',
      tier: 'gold',
      requirement: 80,
      progress: userStats.gardenScore || 0,
      unlocked: (userStats.gardenScore || 0) >= 80,
    },
    {
      id: 'pollinator-paradise',
      name: 'Pollinator Paradise',
      description: 'Achieve a perfect garden score of 100',
      icon: '👑',
      category: 'garden',
      tier: 'platinum',
      requirement: 100,
      progress: userStats.gardenScore || 0,
      unlocked: (userStats.gardenScore || 0) >= 100,
    },

    // Observation Badges
    {
      id: 'first-sighting',
      name: 'First Sighting',
      description: 'Record your first observation',
      icon: '👁️',
      category: 'observations',
      tier: 'bronze',
      requirement: 1,
      progress: userStats.observationCount || 0,
      unlocked: (userStats.observationCount || 0) >= 1,
    },
    {
      id: 'keen-observer-10',
      name: 'Keen Observer',
      description: 'Record 10 observations',
      icon: '📷',
      category: 'observations',
      tier: 'bronze',
      requirement: 10,
      progress: userStats.observationCount || 0,
      unlocked: (userStats.observationCount || 0) >= 10,
    },
    {
      id: 'wildlife-watcher-50',
      name: 'Wildlife Watcher',
      description: 'Record 50 observations',
      icon: '🔭',
      category: 'observations',
      tier: 'silver',
      requirement: 50,
      progress: userStats.observationCount || 0,
      unlocked: (userStats.observationCount || 0) >= 50,
    },
    {
      id: 'naturalist-100',
      name: 'Naturalist',
      description: 'Record 100 observations',
      icon: '🎓',
      category: 'observations',
      tier: 'gold',
      requirement: 100,
      progress: userStats.observationCount || 0,
      unlocked: (userStats.observationCount || 0) >= 100,
    },
    {
      id: 'species-hunter-10',
      name: 'Species Hunter',
      description: 'Observe 10 different species',
      icon: '🦋',
      category: 'observations',
      tier: 'bronze',
      requirement: 10,
      progress: userStats.speciesCount || 0,
      unlocked: (userStats.speciesCount || 0) >= 10,
    },
    {
      id: 'biodiversity-champion',
      name: 'Biodiversity Champion',
      description: 'Observe 50 different species',
      icon: '🌈',
      category: 'observations',
      tier: 'gold',
      requirement: 50,
      progress: userStats.speciesCount || 0,
      unlocked: (userStats.speciesCount || 0) >= 50,
    },

    // Community Badges
    {
      id: 'good-neighbor',
      name: 'Good Neighbor',
      description: 'Connect with your first neighbor',
      icon: '🏠',
      category: 'community',
      tier: 'bronze',
      requirement: 1,
      progress: userStats.neighborCount || 0,
      unlocked: (userStats.neighborCount || 0) >= 1,
    },
    {
      id: 'community-builder',
      name: 'Community Builder',
      description: 'Connect with 5 neighbors',
      icon: '🏘️',
      category: 'community',
      tier: 'silver',
      requirement: 5,
      progress: userStats.neighborCount || 0,
      unlocked: (userStats.neighborCount || 0) >= 5,
    },
    {
      id: 'neighborhood-hero',
      name: 'Neighborhood Hero',
      description: 'Connect with 10 neighbors',
      icon: '🦸',
      category: 'community',
      tier: 'gold',
      requirement: 10,
      progress: userStats.neighborCount || 0,
      unlocked: (userStats.neighborCount || 0) >= 10,
    },
    {
      id: 'corridor-connector',
      name: 'Corridor Connector',
      description: 'Your garden connects to 3+ others',
      icon: '🔗',
      category: 'community',
      tier: 'gold',
      requirement: 3,
      progress: userStats.corridorConnections || 0,
      unlocked: (userStats.corridorConnections || 0) >= 3,
    },

    // Seasonal Badges
    {
      id: 'spring-awakening',
      name: 'Spring Awakening',
      description: 'Record observations in March, April, and May',
      icon: '🌷',
      category: 'seasonal',
      tier: 'silver',
      requirement: 3,
      progress: Math.min(3, userStats.monthsWithObservations || 0),
      unlocked: (userStats.monthsWithObservations || 0) >= 3,
    },
    {
      id: 'year-round-observer',
      name: 'Year-Round Observer',
      description: 'Record observations in every season',
      icon: '🗓️',
      category: 'seasonal',
      tier: 'gold',
      requirement: 4,
      progress: Math.min(4, Math.floor((userStats.monthsWithObservations || 0) / 3)),
      unlocked: (userStats.monthsWithObservations || 0) >= 12,
    },
    {
      id: 'dedicated-tracker',
      name: 'Dedicated Tracker',
      description: 'Be active for 30 days',
      icon: '📅',
      category: 'seasonal',
      tier: 'silver',
      requirement: 30,
      progress: userStats.daysActive || 0,
      unlocked: (userStats.daysActive || 0) >= 30,
    },

    // Special Badges
    {
      id: 'early-adopter',
      name: 'Early Adopter',
      description: 'Join during the beta period',
      icon: '🚀',
      category: 'special',
      tier: 'platinum',
      requirement: 1,
      progress: 1, // Everyone gets this for now
      unlocked: true,
      secret: false,
    },
    {
      id: 'bee-friend',
      name: 'Bee Friend',
      description: 'Plant 5 bee-friendly flowers',
      icon: '🐝',
      category: 'special',
      tier: 'silver',
      requirement: 5,
      progress: Math.min(5, userStats.plantCount || 0),
      unlocked: (userStats.plantCount || 0) >= 5,
      secret: true,
    },
    {
      id: 'monarch-guardian',
      name: 'Monarch Guardian',
      description: 'Plant milkweed for monarchs',
      icon: '🦋',
      category: 'special',
      tier: 'gold',
      requirement: 1,
      progress: 0, // Would check for milkweed specifically
      unlocked: false,
      secret: true,
    },
  ], [userStats]);

  // Check for newly unlocked badges
  useEffect(() => {
    const previouslyUnlocked = JSON.parse(localStorage.getItem('unlockedBadges') || '[]');
    const currentlyUnlocked = badges.filter(b => b.unlocked).map(b => b.id);
    const newUnlocks = currentlyUnlocked.filter(id => !previouslyUnlocked.includes(id));
    
    if (newUnlocks.length > 0) {
      setNewlyUnlocked(newUnlocks);
      localStorage.setItem('unlockedBadges', JSON.stringify(currentlyUnlocked));
      
      newUnlocks.forEach(id => {
        const badge = badges.find(b => b.id === id);
        if (badge) onBadgeUnlock?.(badge);
      });
    }
  }, [badges, onBadgeUnlock]);

  // Filter badges
  const filteredBadges = badges.filter(badge => {
    if (showUnlockedOnly && !badge.unlocked) return false;
    if (selectedCategory !== 'all' && badge.category !== selectedCategory) return false;
    if (badge.secret && !badge.unlocked) return false;
    return true;
  });

  // Stats
  const totalBadges = badges.filter(b => !b.secret || b.unlocked).length;
  const unlockedBadges = badges.filter(b => b.unlocked).length;
  const progressPercent = Math.round((unlockedBadges / totalBadges) * 100);

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Trophy size={24} color="#f59e0b" />
          <h3 style={{ margin: 0, fontWeight: 700 }}>Achievements</h3>
        </div>
        
        {/* Progress Bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: 13,
            marginBottom: 6
          }}>
            <span style={{ color: '#666' }}>Progress</span>
            <span style={{ fontWeight: 600 }}>{unlockedBadges}/{totalBadges} ({progressPercent}%)</span>
          </div>
          <div style={{ 
            height: 8, 
            backgroundColor: '#e5e7eb', 
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #f59e0b 0%, #eab308 100%)',
              borderRadius: 4,
              transition: 'width 0.5s'
            }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 16,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '6px 12px',
            borderRadius: 20,
            border: 'none',
            backgroundColor: selectedCategory === 'all' ? '#f59e0b' : '#f3f4f6',
            color: selectedCategory === 'all' ? 'white' : '#666',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          All
        </button>
        {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: 'none',
              backgroundColor: selectedCategory === cat ? '#f59e0b' : '#f3f4f6',
              color: selectedCategory === cat ? 'white' : '#666',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {icon} {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Show Unlocked Only Toggle */}
      <label style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8, 
        marginBottom: 16,
        fontSize: 13,
        cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={showUnlockedOnly}
          onChange={(e) => setShowUnlockedOnly(e.target.checked)}
        />
        Show unlocked only
      </label>

      {/* Badge Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12
      }}>
        {filteredBadges.map(badge => {
          const tierColor = TIER_COLORS[badge.tier];
          const isNew = newlyUnlocked.includes(badge.id);
          
          return (
            <div
              key={badge.id}
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: badge.unlocked ? tierColor.bg : '#f9fafb',
                border: `2px solid ${badge.unlocked ? tierColor.border : '#e5e7eb'}`,
                textAlign: 'center',
                opacity: badge.unlocked ? 1 : 0.6,
                position: 'relative',
                transition: 'all 0.3s',
                animation: isNew ? 'badgePop 0.5s ease-out' : 'none'
              }}
            >
              {/* New Badge Indicator */}
              {isNew && (
                <div style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700
                }}>
                  NEW!
                </div>
              )}
              
              {/* Tier Badge */}
              <div style={{
                position: 'absolute',
                top: 8,
                left: 8,
                fontSize: 10,
                fontWeight: 700,
                color: tierColor.text,
                textTransform: 'uppercase'
              }}>
                {badge.tier}
              </div>

              {/* Icon */}
              <div style={{ 
                fontSize: 36, 
                marginBottom: 8,
                filter: badge.unlocked ? 'none' : 'grayscale(100%)'
              }}>
                {badge.unlocked ? badge.icon : '🔒'}
              </div>

              {/* Name */}
              <div style={{ 
                fontWeight: 700, 
                fontSize: 13,
                color: badge.unlocked ? tierColor.text : '#9ca3af',
                marginBottom: 4
              }}>
                {badge.name}
              </div>

              {/* Description */}
              <div style={{ 
                fontSize: 11, 
                color: '#666',
                marginBottom: 8,
                minHeight: 32
              }}>
                {badge.description}
              </div>

              {/* Progress */}
              {!badge.unlocked && (
                <div>
                  <div style={{ 
                    height: 4, 
                    backgroundColor: '#e5e7eb', 
                    borderRadius: 2,
                    overflow: 'hidden',
                    marginBottom: 4
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(100, (badge.progress / badge.requirement) * 100)}%`,
                      backgroundColor: '#f59e0b',
                      borderRadius: 2
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#999' }}>
                    {badge.progress}/{badge.requirement}
                  </div>
                </div>
              )}

              {/* Unlocked Checkmark */}
              {badge.unlocked && (
                <CheckCircle 
                  size={20} 
                  color={tierColor.border}
                  style={{ position: 'absolute', bottom: 8, right: 8 }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredBadges.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: 40, 
          color: '#666' 
        }}>
          <Lock size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
          <div>No badges found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters</div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes badgePop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AchievementBadges;
