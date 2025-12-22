import React from 'react';

interface TimeSliderProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const TimeSlider: React.FC<TimeSliderProps> = ({ startDate, endDate, onChange }) => {
  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last year', days: 365 },
    { label: 'All time', days: 3650 },
  ];

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 70,
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'white',
      padding: '12px 20px',
      borderRadius: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      gap: 8,
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 13, color: '#666', marginRight: 8 }}>🕐 Time:</span>
      {presets.map(p => (
        <button
          key={p.days}
          onClick={() => setPreset(p.days)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#f3f4f6',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

export default TimeSlider;
