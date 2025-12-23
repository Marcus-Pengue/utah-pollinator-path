import React from 'react';
import { Building2, Home, GraduationCap, ChevronDown } from 'lucide-react';

export type AppMode = 'government' | 'homeowner' | 'academic';

interface ModeSelectorProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const MODES = [
  {
    id: 'government' as AppMode,
    label: 'Government',
    icon: Building2,
    color: '#1e40af',
    bgColor: '#dbeafe',
    description: 'City planning & conservation'
  },
  {
    id: 'homeowner' as AppMode,
    label: 'Homeowner',
    icon: Home,
    color: '#166534',
    bgColor: '#dcfce7',
    description: 'Register & manage gardens'
  },
  {
    id: 'academic' as AppMode,
    label: 'Academic',
    icon: GraduationCap,
    color: '#7c3aed',
    bgColor: '#ede9fe',
    description: 'Research & data export'
  }
];

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const currentModeData = MODES.find(m => m.id === currentMode)!;

  return (
    <div style={{ position: 'relative' }}>
      {/* Current Mode Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 12,
          border: `2px solid ${currentModeData.color}`,
          backgroundColor: currentModeData.bgColor,
          cursor: 'pointer',
          minWidth: 180
        }}
      >
        <currentModeData.icon size={20} color={currentModeData.color} />
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: currentModeData.color }}>
            {currentModeData.label}
          </div>
          <div style={{ fontSize: 10, color: currentModeData.color, opacity: 0.8 }}>
            {currentModeData.description}
          </div>
        </div>
        <ChevronDown 
          size={18} 
          color={currentModeData.color}
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 998
            }}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            backgroundColor: 'white',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            zIndex: 999,
            minWidth: 220
          }}>
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => { onModeChange(mode.id); setIsOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  border: 'none',
                  backgroundColor: currentMode === mode.id ? mode.bgColor : 'white',
                  cursor: 'pointer',
                  borderLeft: currentMode === mode.id ? `4px solid ${mode.color}` : '4px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <mode.icon size={22} color={mode.color} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: mode.color }}>
                    {mode.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>
                    {mode.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ModeSelector;
