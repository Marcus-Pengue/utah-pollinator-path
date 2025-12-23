import React from 'react';
import { Shield, Droplets, Leaf, Calendar } from 'lucide-react';
import { PublicGardenData, getPublicGardenName, getTierBadge } from './PrivacyUtils';

interface GardenPopupProps {
  garden: PublicGardenData;
}

const GardenPopup: React.FC<GardenPopupProps> = ({ garden }) => {
  const tierBadge = getTierBadge(garden.tier);
  
  return (
    <div style={{ minWidth: 200, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        marginBottom: 8
      }}>
        <span style={{ fontSize: 20 }}>{tierBadge.emoji}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {getPublicGardenName(garden)}
          </div>
          <div style={{ 
            fontSize: 11, 
            color: tierBadge.color,
            fontWeight: 500
          }}>
            {garden.tier}
          </div>
        </div>
      </div>

      {/* Score */}
      <div style={{
        backgroundColor: '#f0fdf4',
        padding: '8px 12px',
        borderRadius: 6,
        marginBottom: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: 12, color: '#166534' }}>Habitat Score</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>
          {garden.score}
        </span>
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        <span style={{
          fontSize: 10,
          padding: '3px 6px',
          backgroundColor: '#e0e7ff',
          borderRadius: 4,
          color: '#3730a3'
        }}>
          {garden.size} garden
        </span>
        <span style={{
          fontSize: 10,
          padding: '3px 6px',
          backgroundColor: '#dcfce7',
          borderRadius: 4,
          color: '#166534'
        }}>
          <Leaf size={10} style={{ display: 'inline', marginRight: 2 }} />
          {garden.plantCount} species
        </span>
        {garden.hasWater && (
          <span style={{
            fontSize: 10,
            padding: '3px 6px',
            backgroundColor: '#dbeafe',
            borderRadius: 4,
            color: '#1e40af'
          }}>
            <Droplets size={10} style={{ display: 'inline', marginRight: 2 }} />
            Water
          </span>
        )}
        {garden.isPesticideFree && (
          <span style={{
            fontSize: 10,
            padding: '3px 6px',
            backgroundColor: '#fef3c7',
            borderRadius: 4,
            color: '#92400e'
          }}>
            🚫 Pesticide-free
          </span>
        )}
        {garden.hasFallBloomers && (
          <span style={{
            fontSize: 10,
            padding: '3px 6px',
            backgroundColor: '#ffedd5',
            borderRadius: 4,
            color: '#9a3412'
          }}>
            🍂 Fall blooms
          </span>
        )}
      </div>

      {/* Observations */}
      {garden.observationCount > 0 && (
        <div style={{ 
          fontSize: 11, 
          color: '#666',
          marginBottom: 8
        }}>
          📊 {garden.observationCount} wildlife observations recorded
        </div>
      )}

      {/* Registration date */}
      <div style={{ 
        fontSize: 10, 
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
        <Calendar size={10} />
        Registered {garden.registeredMonth}
      </div>

      {/* Privacy badge */}
      <div style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid #eee',
        fontSize: 9,
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
        <Shield size={10} />
        Location approximate for privacy
      </div>
    </div>
  );
};

export default GardenPopup;
