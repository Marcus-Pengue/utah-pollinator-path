/**
 * HabitatScoreCard.tsx
 * 
 * Beautiful display of the 5-factor habitat scoring system.
 * Connects to the Python scoring API.
 */

import React, { useState } from 'react';
import {
  Leaf, Droplets, Bug, Calendar, Network, 
  AlertTriangle, CheckCircle2, TrendingUp, MapPin,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface FactorScore {
  score: number;
  max_score: number;
  percentage: number;
  details: Record<string, any>;
  recommendations: string[];
}

interface HabitatScore {
  overall_score: number;
  max_score: number;
  grade: string;
  percentile?: number;
  factors: {
    pollinatorActivity: FactorScore;
    septemberGap: FactorScore;
    connectivity: FactorScore;
    speciesDiversity: FactorScore;
    bloomCoverage: FactorScore;
  };
  top_recommendations: string[];
  nearby_observations: number;
  unique_species: number;
  calculated_at: string;
  methodology_version: string;
}

interface HabitatScoreCardProps {
  latitude: number;
  longitude: number;
  address?: string;
  onScoreCalculated?: (score: HabitatScore) => void;
}

// =============================================================================
// FACTOR CONFIGURATION
// =============================================================================

const FACTOR_CONFIG = {
  septemberGap: {
    label: 'September Gap',
    icon: AlertTriangle,
    color: '#ef4444',
    bgColor: '#fef2f2',
    description: 'Critical late-season resource availability',
    priority: 1
  },
  pollinatorActivity: {
    label: 'Pollinator Activity',
    icon: Bug,
    color: '#f59e0b',
    bgColor: '#fffbeb',
    description: 'Observation density within 500m',
    priority: 2
  },
  connectivity: {
    label: 'Habitat Connectivity',
    icon: Network,
    color: '#06b6d4',
    bgColor: '#ecfeff',
    description: 'Connection to habitat network',
    priority: 3
  },
  speciesDiversity: {
    label: 'Species Diversity',
    icon: Leaf,
    color: '#22c55e',
    bgColor: '#f0fdf4',
    description: 'Unique species richness nearby',
    priority: 4
  },
  bloomCoverage: {
    label: 'Bloom Coverage',
    icon: Calendar,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    description: 'Seasonal continuity of resources',
    priority: 5
  }
};

// =============================================================================
// COMPONENTS
// =============================================================================

const GradeDisplay: React.FC<{ grade: string; score: number }> = ({ grade, score }) => {
  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#22c55e';
    if (grade.startsWith('B')) return '#84cc16';
    if (grade.startsWith('C')) return '#f59e0b';
    if (grade.startsWith('D')) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 24,
      background: `linear-gradient(135deg, ${getGradeColor(grade)}15, ${getGradeColor(grade)}05)`,
      borderRadius: 16,
      border: `2px solid ${getGradeColor(grade)}30`
    }}>
      <div style={{
        fontSize: 64,
        fontWeight: 800,
        color: getGradeColor(grade),
        lineHeight: 1
      }}>
        {grade}
      </div>
      <div style={{
        fontSize: 32,
        fontWeight: 600,
        color: '#374151',
        marginTop: 8
      }}>
        {score}/100
      </div>
      <div style={{
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4
      }}>
        Habitat Score
      </div>
    </div>
  );
};

const FactorBar: React.FC<{
  factorKey: string;
  factor: FactorScore;
  expanded: boolean;
  onToggle: () => void;
}> = ({ factorKey, factor, expanded, onToggle }) => {
  const config = FACTOR_CONFIG[factorKey as keyof typeof FACTOR_CONFIG];
  if (!config) return null;

  const Icon = config.icon;
  const percentage = (factor.score / factor.max_score) * 100;

  return (
    <div style={{
      marginBottom: 12,
      backgroundColor: 'white',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
      boxShadow: expanded ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
      transition: 'box-shadow 0.2s'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '14px 16px',
          border: 'none',
          backgroundColor: expanded ? config.bgColor : 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          transition: 'background-color 0.2s'
        }}
      >
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: config.bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} color={config.color} />
        </div>

        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {config.label}
            {factorKey === 'septemberGap' && factor.score < 18 && (
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderRadius: 4,
                fontWeight: 700
              }}>
                PRIORITY
              </span>
            )}
          </div>
          
          {/* Progress bar */}
          <div style={{
            marginTop: 6,
            height: 6,
            backgroundColor: '#e5e7eb',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: config.color,
              borderRadius: 3,
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>

        <div style={{
          textAlign: 'right',
          minWidth: 50
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: config.color
          }}>
            {factor.score}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>
            /{factor.max_score}
          </div>
        </div>

        {expanded ? (
          <ChevronUp size={18} color="#9ca3af" />
        ) : (
          <ChevronDown size={18} color="#9ca3af" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          padding: '0 16px 16px',
          backgroundColor: config.bgColor
        }}>
          <div style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 12
          }}>
            {config.description}
          </div>

          {/* Details */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12
          }}>
            {Object.entries(factor.details).map(([key, value]) => {
              // Skip complex objects and arrays for simple display
              if (typeof value === 'object' && value !== null) {
                if (key === 'monthly_breakdown') {
                  return (
                    <div key={key} style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                        Monthly Activity:
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {Object.entries(value as Record<string, number>).map(([month, count]) => (
                          <div
                            key={month}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 4,
                              backgroundColor: count > 0 ? config.color : '#e5e7eb',
                              opacity: count > 0 ? Math.min(0.3 + (count / 50), 1) : 0.3,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 8,
                              color: count > 0 ? 'white' : '#9ca3af',
                              fontWeight: 600
                            }}
                            title={`${month}: ${count} observations`}
                          >
                            {month.slice(0, 1)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (Array.isArray(value) && value.length > 0) {
                  return (
                    <div key={key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      padding: '4px 0',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <span style={{ color: '#6b7280' }}>
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span style={{ fontWeight: 500, color: '#374151' }}>
                        {value.slice(0, 3).join(', ')}
                        {value.length > 3 && ` +${value.length - 3} more`}
                      </span>
                    </div>
                  );
                }
                return null;
              }
              return (
                <div key={key} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  padding: '4px 0',
                  borderBottom: '1px solid #f3f4f6'
                }}>
                  <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          {factor.recommendations.length > 0 && (
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#6b7280',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Recommendations
              </div>
              {factor.recommendations.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 12,
                    color: '#374151',
                    padding: '6px 0'
                  }}
                >
                  <TrendingUp size={14} color={config.color} style={{ marginTop: 2, flexShrink: 0 }} />
                  {rec}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const HabitatScoreCard: React.FC<HabitatScoreCardProps> = ({
  latitude,
  longitude,
  address,
  onScoreCalculated
}) => {
  const [score, setScore] = useState<HabitatScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFactor, setExpandedFactor] = useState<string | null>('septemberGap');

  const calculateScore = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, address })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate score');
      }

      const data: HabitatScore = await response.json();
      setScore(data);
      onScoreCalculated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate on mount or when coordinates change
  React.useEffect(() => {
    if (latitude && longitude) {
      calculateScore();
    }
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid #e5e7eb',
          borderTopColor: '#22c55e',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ color: '#6b7280' }}>Analyzing habitat quality...</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          Checking {(759640).toLocaleString()} observations
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 24,
        backgroundColor: '#fef2f2',
        borderRadius: 16,
        border: '1px solid #fecaca',
        textAlign: 'center'
      }}>
        <AlertTriangle size={32} color="#dc2626" style={{ marginBottom: 8 }} />
        <div style={{ color: '#dc2626', fontWeight: 600 }}>Error calculating score</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{error}</div>
        <button
          onClick={calculateScore}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!score) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        border: '2px dashed #d1d5db'
      }}>
        <MapPin size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
        <div style={{ color: '#6b7280' }}>Enter a location to see habitat score</div>
      </div>
    );
  }

  // Sort factors by priority
  const sortedFactors = Object.entries(score.factors)
    .sort(([a], [b]) => {
      const aConfig = FACTOR_CONFIG[a as keyof typeof FACTOR_CONFIG];
      const bConfig = FACTOR_CONFIG[b as keyof typeof FACTOR_CONFIG];
      return (aConfig?.priority || 99) - (bConfig?.priority || 99);
    });

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: 20,
      padding: 24,
      maxWidth: 420
    }}>
      {/* Header with location */}
      {address && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          color: '#6b7280',
          fontSize: 13
        }}>
          <MapPin size={16} />
          {address}
        </div>
      )}

      {/* Grade display */}
      <GradeDisplay grade={score.grade} score={score.overall_score} />

      {/* Quick stats */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 16,
        marginBottom: 20
      }}>
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: 10,
          padding: 12,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
            {score.nearby_observations}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Observations</div>
        </div>
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: 10,
          padding: 12,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
            {score.unique_species}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Species</div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#374151',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          Score Breakdown
          <Info size={14} color="#9ca3af" />
        </div>

        {sortedFactors.map(([key, factor]) => (
          <FactorBar
            key={key}
            factorKey={key}
            factor={factor}
            expanded={expandedFactor === key}
            onToggle={() => setExpandedFactor(expandedFactor === key ? null : key)}
          />
        ))}
      </div>

      {/* Top recommendations */}
      {score.top_recommendations.length > 0 && (
        <div style={{
          backgroundColor: '#fef3c7',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #fcd34d'
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#92400e',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <TrendingUp size={16} />
            Top Actions to Improve
          </div>
          {score.top_recommendations.map((rec, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                fontSize: 13,
                color: '#78350f',
                padding: '6px 0',
                borderTop: i > 0 ? '1px solid #fde68a' : 'none'
              }}
            >
              <CheckCircle2 size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
              {rec}
            </div>
          ))}
        </div>
      )}

      {/* Methodology link */}
      <div style={{
        marginTop: 16,
        textAlign: 'center',
        fontSize: 11,
        color: '#9ca3af'
      }}>
        Methodology v{score.methodology_version} •{' '}
        <a href="/methodology" style={{ color: '#6b7280' }}>Learn more</a>
      </div>
    </div>
  );
};

export default HabitatScoreCard;
