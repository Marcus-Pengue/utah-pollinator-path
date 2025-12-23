import React, { useState } from 'react';
import { 
  Shield, ShieldCheck, Camera, Calendar, DollarSign, Users, 
  CheckCircle, Clock, MapPin, Leaf, Plus, X, Star, Drone
} from 'lucide-react';

interface VerificationSystemProps {
  gardenId: string;
  gardenName: string;
  currentTier: string;
  currentScore: number;
  verificationStatus: VerificationStatus;
  plants: PlantEntry[];
  onScheduleProfessional: (date: string, time: string) => void;
  onRequestCommunity: () => void;
  onAddNewPlant: (plant: NewPlantEntry) => void;
}

export interface VerificationStatus {
  level: 'unverified' | 'community' | 'professional';
  verifiedAt?: string;
  verifiedBy?: string;
  photos?: string[];
  nextVerificationDue?: string;
}

export interface PlantEntry {
  id: string;
  name: string;
  plantedDate: string;  // When user planted it
  isNewPlanting: boolean;  // Planted AFTER joining app
  verified: boolean;
  verifiedBy?: 'community' | 'professional';
  basePoints: number;
  verifiedPoints: number;  // Bonus when verified
  iNatObservationId?: string;  // Only for new plantings
}

export interface NewPlantEntry {
  species: string;
  quantity: number;
  plantedDate: string;
  photo?: string;
}

// Verification multipliers
const VERIFICATION_BONUSES = {
  unverified: 1.0,
  community: 1.25,    // 25% bonus
  professional: 1.5,  // 50% bonus
};

// Available time slots
const TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM', 
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
];

const VerificationSystem: React.FC<VerificationSystemProps> = ({
  gardenId,
  gardenName,
  currentTier,
  currentScore,
  verificationStatus,
  plants,
  onScheduleProfessional,
  onRequestCommunity,
  onAddNewPlant
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'professional' | 'community' | 'plants'>('status');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [newPlant, setNewPlant] = useState<NewPlantEntry>({
    species: '',
    quantity: 1,
    plantedDate: new Date().toISOString().split('T')[0],
  });

  // Calculate verified score
  const verifiedScore = Math.round(currentScore * VERIFICATION_BONUSES[verificationStatus.level]);
  const bonusPoints = verifiedScore - currentScore;

  // Count plant stats
  const newPlantings = plants.filter(p => p.isNewPlanting);
  const verifiedPlants = plants.filter(p => p.verified);

  // Generate available dates (next 14 days, excluding Sundays)
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date;
  }).filter(d => d.getDay() !== 0); // Exclude Sundays

  const handleSchedule = () => {
    if (selectedDate && selectedTime) {
      onScheduleProfessional(selectedDate, selectedTime);
    }
  };

  const handleAddPlant = () => {
    if (newPlant.species) {
      onAddNewPlant(newPlant);
      setNewPlant({ species: '', quantity: 1, plantedDate: new Date().toISOString().split('T')[0] });
      setShowAddPlant(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        background: verificationStatus.level === 'professional' 
          ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
          : verificationStatus.level === 'community'
          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
          : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        padding: 20,
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {verificationStatus.level === 'professional' ? (
            <ShieldCheck size={32} />
          ) : verificationStatus.level === 'community' ? (
            <Shield size={32} />
          ) : (
            <Shield size={32} style={{ opacity: 0.5 }} />
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {verificationStatus.level === 'professional' ? 'Professionally Verified' :
               verificationStatus.level === 'community' ? 'Community Verified' :
               'Unverified Garden'}
            </h2>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {gardenName} • {currentTier}
            </div>
          </div>
        </div>

        {/* Score with bonus */}
        <div style={{
          marginTop: 16,
          display: 'flex',
          gap: 16
        }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '12px 20px',
            borderRadius: 12,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{verifiedScore}</div>
            <div style={{ fontSize: 11 }}>Verified Score</div>
          </div>
          {bonusPoints > 0 && (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '12px 20px',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>+{bonusPoints}</div>
              <div style={{ fontSize: 11 }}>Verification Bonus</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {[
          { id: 'status', label: 'Status', icon: Shield },
          { id: 'professional', label: 'Pro ($15)', icon: Star },
          { id: 'community', label: 'Community', icon: Users },
          { id: 'plants', label: 'Plants', icon: Leaf },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#f0fdf4' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #22c55e' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: activeTab === tab.id ? '#166534' : '#6b7280'
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: 16 }}>
        {/* Status Tab */}
        {activeTab === 'status' && (
          <div>
            {/* Verification Tiers */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Verification Levels</h4>
              
              {[
                { level: 'unverified', label: 'Unverified', bonus: '1.0x', desc: 'Base score only' },
                { level: 'community', label: 'Community Verified', bonus: '1.25x', desc: 'Verified by another gardener' },
                { level: 'professional', label: 'Professionally Verified', bonus: '1.5x', desc: 'On-site or drone verification' },
              ].map(tier => (
                <div
                  key={tier.level}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 8,
                    border: verificationStatus.level === tier.level ? '2px solid #22c55e' : '1px solid #e5e7eb',
                    backgroundColor: verificationStatus.level === tier.level ? '#f0fdf4' : 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {verificationStatus.level === tier.level && <CheckCircle size={14} color="#22c55e" style={{ marginRight: 6, display: 'inline' }} />}
                      {tier.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>{tier.desc}</div>
                  </div>
                  <div style={{
                    backgroundColor: tier.level === 'professional' ? '#fef3c7' : tier.level === 'community' ? '#dcfce7' : '#f3f4f6',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 700,
                    color: tier.level === 'professional' ? '#92400e' : tier.level === 'community' ? '#166534' : '#374151'
                  }}>
                    {tier.bonus}
                  </div>
                </div>
              ))}
            </div>

            {/* Current status details */}
            {verificationStatus.verifiedAt && (
              <div style={{
                backgroundColor: '#f9fafb',
                padding: 12,
                borderRadius: 8,
                fontSize: 12
              }}>
                <div style={{ marginBottom: 4 }}>
                  <strong>Verified:</strong> {new Date(verificationStatus.verifiedAt).toLocaleDateString()}
                </div>
                {verificationStatus.verifiedBy && (
                  <div><strong>By:</strong> {verificationStatus.verifiedBy}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Professional Verification Tab */}
        {activeTab === 'professional' && (
          <div>
            <div style={{
              backgroundColor: '#fef3c7',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Star size={24} color="#d97706" fill="#d97706" />
                <h3 style={{ margin: 0, fontSize: 16, color: '#92400e' }}>Professional Verification</h3>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
                Book an on-site visit or drone flyover to get your garden professionally verified 
                and earn a <strong>1.5x score multiplier</strong>.
              </p>
            </div>

            {/* Pricing */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              backgroundColor: '#f0fdf4',
              borderRadius: 8,
              marginBottom: 16
            }}>
              <DollarSign size={20} color="#166534" />
              <span style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>$15</span>
              <span style={{ fontSize: 13, color: '#166534' }}>one-time verification fee</span>
            </div>

            {/* What's included */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>What's Included:</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#374151' }}>
                <li style={{ marginBottom: 4 }}>On-site visit OR drone verification</li>
                <li style={{ marginBottom: 4 }}>Professional habitat assessment</li>
                <li style={{ marginBottom: 4 }}>Photo documentation</li>
                <li style={{ marginBottom: 4 }}>Personalized improvement tips</li>
                <li style={{ marginBottom: 4 }}>Official "Verified Habitat" badge</li>
                <li>1.5x permanent score multiplier</li>
              </ul>
            </div>

            {/* Date Selection */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                Select Date
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableDates.slice(0, 10).map(date => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = date.getDate();
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: selectedDate === dateStr ? '2px solid #22c55e' : '1px solid #ddd',
                        backgroundColor: selectedDate === dateStr ? '#f0fdf4' : 'white',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 10, color: '#666' }}>{dayName}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{dayNum}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Select Time
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TIME_SLOTS.map(time => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: selectedTime === time ? '2px solid #22c55e' : '1px solid #ddd',
                        backgroundColor: selectedTime === time ? '#f0fdf4' : 'white',
                        cursor: 'pointer',
                        fontSize: 13
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Book Button */}
            <button
              onClick={handleSchedule}
              disabled={!selectedDate || !selectedTime}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: selectedDate && selectedTime ? '#eab308' : '#d1d5db',
                color: selectedDate && selectedTime ? 'white' : '#9ca3af',
                fontSize: 15,
                fontWeight: 600,
                cursor: selectedDate && selectedTime ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Calendar size={18} />
              Book Verification - $15
            </button>

            <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 8 }}>
              Payment collected at time of visit • Wasatch Front area only
            </div>
          </div>
        )}

        {/* Community Verification Tab */}
        {activeTab === 'community' && (
          <div>
            <div style={{
              backgroundColor: '#f0fdf4',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Users size={24} color="#166534" />
                <h3 style={{ margin: 0, fontSize: 16, color: '#166534' }}>Community Verification</h3>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>
                Have another registered Utah Pollinator Path gardener visit and verify your garden.
                Earn a <strong>1.25x score multiplier</strong>.
              </p>
            </div>

            {/* How it works */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>How It Works:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { step: 1, text: 'Request verification from another gardener' },
                  { step: 2, text: 'They visit and photograph your garden' },
                  { step: 3, text: 'Photos are reviewed against your registration' },
                  { step: 4, text: 'Both gardens earn bonus points!' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 600,
                      flexShrink: 0
                    }}>
                      {item.step}
                    </div>
                    <div style={{ fontSize: 13, paddingTop: 4 }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div style={{
              backgroundColor: '#fef3c7',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12
            }}>
              <strong>🎁 Both gardeners benefit:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li>Verifier earns +25 community points</li>
                <li>Verified garden gets 1.25x multiplier</li>
                <li>Builds local pollinator network!</li>
              </ul>
            </div>

            <button
              onClick={onRequestCommunity}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Users size={18} />
              Request Community Verification
            </button>

            <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 8 }}>
              Free • Requires another registered gardener within 5 miles
            </div>
          </div>
        )}

        {/* Plants Tab */}
        {activeTab === 'plants' && (
          <div>
            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 16
            }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{plants.length}</div>
                <div style={{ fontSize: 11, color: '#166534' }}>Total Plants</div>
              </div>
              <div style={{ backgroundColor: '#dbeafe', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>{newPlantings.length}</div>
                <div style={{ fontSize: 11, color: '#1e40af' }}>New Plantings</div>
              </div>
            </div>

            {/* Explanation */}
            <div style={{
              backgroundColor: '#fef3c7',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
              color: '#92400e'
            }}>
              <strong>📋 Why track new plantings?</strong>
              <p style={{ margin: '8px 0 0' }}>
                Only plants added <strong>after</strong> registering can be submitted to iNaturalist 
                as new observations. Existing plants still count for your habitat score!
              </p>
            </div>

            {/* Add New Plant Button */}
            <button
              onClick={() => setShowAddPlant(true)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '2px dashed #22c55e',
                backgroundColor: 'white',
                color: '#166534',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 16
              }}
            >
              <Plus size={18} />
              Log New Planting
            </button>

            {/* Plant List */}
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {plants.map(plant => (
                <div
                  key={plant.id}
                  style={{
                    padding: 12,
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{plant.name}</span>
                      {plant.isNewPlanting && (
                        <span style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: 10
                        }}>
                          NEW
                        </span>
                      )}
                      {plant.verified && (
                        <CheckCircle size={14} color="#22c55e" />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>
                      Planted: {new Date(plant.plantedDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>
                      +{plant.verified ? plant.verifiedPoints : plant.basePoints}
                    </div>
                    <div style={{ fontSize: 10, color: '#666' }}>
                      {plant.verified ? 'verified' : 'base'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Plant Modal */}
      {showAddPlant && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 20
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            width: '100%',
            maxWidth: 360
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>🌱 Log New Planting</h3>
              <button onClick={() => setShowAddPlant(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Plant Species
              </label>
              <select
                value={newPlant.species}
                onChange={(e) => setNewPlant({ ...newPlant, species: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 14
                }}
              >
                <option value="">Select a plant...</option>
                <optgroup label="Fall Bloomers (High Priority)">
                  <option value="goldenrod">Goldenrod (Solidago)</option>
                  <option value="aster">Aster</option>
                  <option value="rabbitbrush">Rabbitbrush</option>
                  <option value="agastache">Agastache</option>
                </optgroup>
                <optgroup label="Native Perennials">
                  <option value="penstemon">Penstemon</option>
                  <option value="milkweed">Milkweed</option>
                  <option value="echinacea">Echinacea</option>
                  <option value="lupine">Lupine</option>
                  <option value="blanketflower">Blanketflower</option>
                  <option value="beebalm">Bee Balm</option>
                </optgroup>
                <optgroup label="Other Pollinator Plants">
                  <option value="lavender">Lavender</option>
                  <option value="catmint">Catmint</option>
                  <option value="sunflower">Sunflower</option>
                  <option value="salvia">Salvia</option>
                </optgroup>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Quantity Planted
              </label>
              <input
                type="number"
                min="1"
                value={newPlant.quantity}
                onChange={(e) => setNewPlant({ ...newPlant, quantity: parseInt(e.target.value) || 1 })}
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Date Planted
              </label>
              <input
                type="date"
                value={newPlant.plantedDate}
                onChange={(e) => setNewPlant({ ...newPlant, plantedDate: e.target.value })}
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

            <div style={{
              backgroundColor: '#f0fdf4',
              padding: 10,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 11,
              color: '#166534'
            }}>
              ✅ This planting can be submitted to iNaturalist as a new observation once verified.
            </div>

            <button
              onClick={handleAddPlant}
              disabled={!newPlant.species}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: newPlant.species ? '#22c55e' : '#d1d5db',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: newPlant.species ? 'pointer' : 'not-allowed'
              }}
            >
              Add Plant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationSystem;
