import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Calendar, TrendingUp } from 'lucide-react';

interface SeasonalTimelineProps {
  availableYears: number[];
  availableMonths?: number[];
  currentYear: number;
  currentMonth?: number;
  onYearChange: (year: number) => void;
  onMonthChange?: (month: number | null) => void;
  observationCounts?: Record<string, number>; // "2023-06" -> count
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASONS = [
  { name: 'Winter', months: [12, 1, 2], color: '#93c5fd', icon: '❄️' },
  { name: 'Spring', months: [3, 4, 5], color: '#86efac', icon: '🌸' },
  { name: 'Summer', months: [6, 7, 8], color: '#fde047', icon: '☀️' },
  { name: 'Fall', months: [9, 10, 11], color: '#fdba74', icon: '🍂' },
];

const SeasonalTimeline: React.FC<SeasonalTimelineProps> = ({
  availableYears,
  currentYear,
  currentMonth,
  onYearChange,
  onMonthChange,
  observationCounts = {},
  isPlaying = false,
  onPlayingChange
}) => {
  const [playing, setPlaying] = useState(isPlaying);
  const [speed, setSpeed] = useState(1000); // ms per frame
  const [mode, setMode] = useState<'year' | 'month' | 'season'>('month');
  const [showStats, setShowStats] = useState(true);

  // Calculate stats for current selection
  const currentStats = React.useMemo(() => {
    if (mode === 'year') {
      const yearCounts = Object.entries(observationCounts)
        .filter(([key]) => key.startsWith(`${currentYear}-`))
        .reduce((sum, [, count]) => sum + count, 0);
      return yearCounts;
    } else if (currentMonth) {
      const key = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      return observationCounts[key] || 0;
    }
    return 0;
  }, [currentYear, currentMonth, mode, observationCounts]);

  // Get peak month for current year
  const peakMonth = React.useMemo(() => {
    let maxCount = 0;
    let peak = null;
    for (let m = 1; m <= 12; m++) {
      const key = `${currentYear}-${String(m).padStart(2, '0')}`;
      const count = observationCounts[key] || 0;
      if (count > maxCount) {
        maxCount = count;
        peak = m;
      }
    }
    return peak;
  }, [currentYear, observationCounts]);

  // Animation loop
  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      if (mode === 'month') {
        const nextMonth = (currentMonth || 1) + 1;
        if (nextMonth > 12) {
          // Move to next year
          const yearIdx = availableYears.indexOf(currentYear);
          if (yearIdx < availableYears.length - 1) {
            onYearChange(availableYears[yearIdx + 1]);
            onMonthChange?.(1);
          } else {
            // Loop back to start
            onYearChange(availableYears[0]);
            onMonthChange?.(1);
          }
        } else {
          onMonthChange?.(nextMonth);
        }
      } else if (mode === 'year') {
        const yearIdx = availableYears.indexOf(currentYear);
        if (yearIdx < availableYears.length - 1) {
          onYearChange(availableYears[yearIdx + 1]);
        } else {
          onYearChange(availableYears[0]);
        }
      } else if (mode === 'season') {
        // Cycle through seasons
        const currentSeason = SEASONS.find(s => s.months.includes(currentMonth || 1));
        const seasonIdx = currentSeason ? SEASONS.indexOf(currentSeason) : 0;
        const nextSeason = SEASONS[(seasonIdx + 1) % 4];
        onMonthChange?.(nextSeason.months[1]); // Middle month of season
        
        if (seasonIdx === 3) {
          // Winter wraps to next year
          const yearIdx = availableYears.indexOf(currentYear);
          if (yearIdx < availableYears.length - 1) {
            onYearChange(availableYears[yearIdx + 1]);
          } else {
            onYearChange(availableYears[0]);
          }
        }
      }
    }, speed);

    return () => clearInterval(interval);
  }, [playing, mode, speed, currentYear, currentMonth, availableYears, onYearChange, onMonthChange]);

  // Sync with parent
  useEffect(() => {
    setPlaying(isPlaying);
  }, [isPlaying]);

  const handlePlayPause = () => {
    const newPlaying = !playing;
    setPlaying(newPlaying);
    onPlayingChange?.(newPlaying);
  };

  const handleSkipBack = () => {
    if (mode === 'month') {
      const prevMonth = (currentMonth || 1) - 1;
      if (prevMonth < 1) {
        const yearIdx = availableYears.indexOf(currentYear);
        if (yearIdx > 0) {
          onYearChange(availableYears[yearIdx - 1]);
          onMonthChange?.(12);
        }
      } else {
        onMonthChange?.(prevMonth);
      }
    } else {
      const yearIdx = availableYears.indexOf(currentYear);
      if (yearIdx > 0) {
        onYearChange(availableYears[yearIdx - 1]);
      }
    }
  };

  const handleSkipForward = () => {
    if (mode === 'month') {
      const nextMonth = (currentMonth || 1) + 1;
      if (nextMonth > 12) {
        const yearIdx = availableYears.indexOf(currentYear);
        if (yearIdx < availableYears.length - 1) {
          onYearChange(availableYears[yearIdx + 1]);
          onMonthChange?.(1);
        }
      } else {
        onMonthChange?.(nextMonth);
      }
    } else {
      const yearIdx = availableYears.indexOf(currentYear);
      if (yearIdx < availableYears.length - 1) {
        onYearChange(availableYears[yearIdx + 1]);
      }
    }
  };

  const getCurrentSeason = () => {
    return SEASONS.find(s => s.months.includes(currentMonth || 1)) || SEASONS[0];
  };

  const season = getCurrentSeason();

  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: 300
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} color="#22c55e" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Time Travel</span>
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          <option value="month">By Month</option>
          <option value="year">By Year</option>
          <option value="season">By Season</option>
        </select>
      </div>

      {/* Current Display */}
      <div style={{
        textAlign: 'center',
        padding: '16px 0',
        background: `linear-gradient(135deg, ${season.color}40 0%, ${season.color}20 100%)`,
        borderRadius: 10,
        marginBottom: 12
      }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>{season.icon}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
          {mode === 'year' ? currentYear : `${MONTHS[(currentMonth || 1) - 1]} ${currentYear}`}
        </div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
          {season.name} Season
        </div>
        {showStats && (
          <div style={{ 
            marginTop: 8, 
            fontSize: 12, 
            color: '#22c55e',
            fontWeight: 600
          }}>
            <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />
            {currentStats.toLocaleString()} observations
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12
      }}>
        <button
          onClick={handleSkipBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#f3f4f6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <SkipBack size={16} />
        </button>
        
        <button
          onClick={handlePlayPause}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: playing ? '#ef4444' : '#22c55e',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
        </button>
        
        <button
          onClick={handleSkipForward}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#f3f4f6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Speed Control */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 4, textAlign: 'center' }}>
          Speed: {speed === 500 ? 'Fast' : speed === 1000 ? 'Normal' : 'Slow'}
        </div>
        <input
          type="range"
          min={500}
          max={2000}
          step={500}
          value={2500 - speed}
          onChange={(e) => setSpeed(2500 - Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* Month Pills (for month mode) */}
      {mode === 'month' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 4
        }}>
          {MONTHS.map((month, i) => {
            const monthNum = i + 1;
            const isSelected = currentMonth === monthNum;
            const key = `${currentYear}-${String(monthNum).padStart(2, '0')}`;
            const count = observationCounts[key] || 0;
            const hasData = count > 0;
            
            return (
              <button
                key={month}
                onClick={() => onMonthChange?.(monthNum)}
                style={{
                  padding: '6px 2px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: isSelected ? '#22c55e' : hasData ? '#dcfce7' : '#f9fafb',
                  color: isSelected ? 'white' : hasData ? '#166534' : '#9ca3af',
                  fontSize: 10,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {month}
              </button>
            );
          })}
        </div>
      )}

      {/* Year Slider */}
      <div style={{ marginTop: 12 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: 10,
          color: '#666',
          marginBottom: 4
        }}>
          <span>{availableYears[0]}</span>
          <span>{availableYears[availableYears.length - 1]}</span>
        </div>
        <input
          type="range"
          min={0}
          max={availableYears.length - 1}
          value={availableYears.indexOf(currentYear)}
          onChange={(e) => onYearChange(availableYears[Number(e.target.value)])}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* Peak Info */}
      {peakMonth && (
        <div style={{ 
          marginTop: 12, 
          padding: 10, 
          backgroundColor: '#fef3c7', 
          borderRadius: 8,
          fontSize: 12,
          textAlign: 'center'
        }}>
          <strong>🌟 Peak Activity:</strong> {MONTHS[peakMonth - 1]} {currentYear}
        </div>
      )}
    </div>
  );
};

export default SeasonalTimeline;
