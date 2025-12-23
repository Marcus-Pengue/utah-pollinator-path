import React, { useState } from 'react';
import { Camera, X, MapPin, Leaf, Info } from 'lucide-react';

interface QuickObservationProps {
  onStartCapture: () => void;
  hasRegisteredGarden: boolean;
  gardenTier?: string;
}

const QuickObservation: React.FC<QuickObservationProps> = ({
  onStartCapture,
  hasRegisteredGarden,
  gardenTier
}) => {
  const [showTip, setShowTip] = useState(false);

  return (
    <>
      {/* Main Floating Action Button - Always Visible */}
      <button
        onClick={onStartCapture}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px 32px',
          borderRadius: 50,
          border: 'none',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
          zIndex: 1000,
          animation: 'gentle-pulse 3s ease-in-out infinite'
        }}
      >
        <Camera size={22} />
        Log Observation
      </button>

      {/* Context indicator */}
      {hasRegisteredGarden && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(22, 101, 52, 0.9)',
          color: 'white',
          padding: '6px 14px',
          borderRadius: 20,
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 999
        }}>
          <Leaf size={12} />
          {gardenTier} habitat context will be included
        </div>
      )}

      {/* Help tip */}
      <button
        onClick={() => setShowTip(!showTip)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        <Info size={18} />
      </button>

      {/* Tip Modal */}
      {showTip && (
        <div style={{
          position: 'fixed',
          bottom: 70,
          right: 20,
          width: 280,
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          padding: 16,
          zIndex: 1001
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>📸 How to Log Observations</h4>
            <button onClick={() => setShowTip(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#374151' }}>
            <li style={{ marginBottom: 8 }}>Tap <strong>"Log Observation"</strong></li>
            <li style={{ marginBottom: 8 }}>Get within 1-2 feet of the pollinator</li>
            <li style={{ marginBottom: 8 }}>Hold steady for 5 seconds</li>
            <li style={{ marginBottom: 8 }}>Review & upload to iNaturalist</li>
          </ol>

          <div style={{
            marginTop: 12,
            padding: 10,
            backgroundColor: '#fef3c7',
            borderRadius: 8,
            fontSize: 11,
            color: '#92400e'
          }}>
            💡 <strong>Pro tip:</strong> The camera auto-zooms to capture detail. 
            Just center your subject and hold still!
          </div>

          {!hasRegisteredGarden && (
            <div style={{
              marginTop: 12,
              padding: 10,
              backgroundColor: '#f0fdf4',
              borderRadius: 8,
              fontSize: 11,
              color: '#166534'
            }}>
              🌱 <strong>Register your garden</strong> to automatically include 
              habitat context with every observation!
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes gentle-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 4px 30px rgba(245, 158, 11, 0.6); }
        }
      `}</style>
    </>
  );
};

export default QuickObservation;
