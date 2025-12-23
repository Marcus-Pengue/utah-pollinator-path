import React, { useState } from 'react';
import { X, Flower2, Droplets, Home, TreeDeciduous, Check } from 'lucide-react';

interface GardenRegistrationProps {
  lat: number;
  lng: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const PLANT_OPTIONS = [
  { id: 'milkweed', name: 'Milkweed', icon: '🌸', desc: 'Essential for monarchs' },
  { id: 'lavender', name: 'Lavender', icon: '💜', desc: 'Bees love it' },
  { id: 'sunflower', name: 'Sunflowers', icon: '🌻', desc: 'Seeds & pollen' },
  { id: 'coneflower', name: 'Coneflower', icon: '🌺', desc: 'Native perennial' },
  { id: 'bee_balm', name: 'Bee Balm', icon: '🌷', desc: 'Hummingbirds too' },
  { id: 'salvia', name: 'Salvia', icon: '💙', desc: 'Long blooming' },
  { id: 'aster', name: 'Asters', icon: '⭐', desc: 'Fall blooms' },
  { id: 'goldenrod', name: 'Goldenrod', icon: '💛', desc: 'Late season food' },
  { id: 'clover', name: 'Clover', icon: '🍀', desc: 'Ground cover' },
  { id: 'herbs', name: 'Herbs', icon: '🌿', desc: 'Basil, mint, thyme' },
];

const FEATURE_OPTIONS = [
  { id: 'water', name: 'Water Source', icon: <Droplets size={16} /> },
  { id: 'nesting', name: 'Nesting Sites', icon: <Home size={16} /> },
  { id: 'trees', name: 'Trees/Shrubs', icon: <TreeDeciduous size={16} /> },
  { id: 'no_pesticides', name: 'Pesticide-Free', icon: '🚫' },
  { id: 'native', name: 'Native Plants', icon: '🏔️' },
];

const GardenRegistration: React.FC<GardenRegistrationProps> = ({ lat, lng, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [size, setSize] = useState('small');
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const togglePlant = (id: string) => {
    setSelectedPlants(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({
      lat,
      lng,
      name: name || 'My Pollinator Garden',
      size,
      plants: selectedPlants,
      features: selectedFeatures,
      description,
      email
    });
    setSubmitting(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        maxWidth: 500,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flower2 size={24} color="#22c55e" />
            <h2 style={{ margin: 0, fontSize: 18 }}>Register Your Garden</h2>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={24} color="#666" />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Location */}
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 20,
            fontSize: 13,
            color: '#166534'
          }}>
            📍 Location: {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>

          {/* Garden Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Garden Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Pollinator Paradise"
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

          {/* Size */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Garden Size
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'small', label: 'Small', desc: '< 100 sq ft' },
                { id: 'medium', label: 'Medium', desc: '100-500 sq ft' },
                { id: 'large', label: 'Large', desc: '500+ sq ft' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: size === s.id ? '2px solid #22c55e' : '1px solid #ddd',
                    backgroundColor: size === s.id ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Plants */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              What's growing? <span style={{ fontWeight: 400, color: '#666' }}>(select all that apply)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLANT_OPTIONS.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlant(p.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: selectedPlants.includes(p.id) ? '2px solid #22c55e' : '1px solid #ddd',
                    backgroundColor: selectedPlants.includes(p.id) ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12
                  }}
                  title={p.desc}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                  {selectedPlants.includes(p.id) && <Check size={12} color="#22c55e" />}
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Garden Features
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FEATURE_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFeature(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: selectedFeatures.includes(f.id) ? '2px solid #8b5cf6' : '1px solid #ddd',
                    backgroundColor: selectedFeatures.includes(f.id) ? '#f5f3ff' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12
                  }}
                >
                  <span>{typeof f.icon === 'string' ? f.icon : f.icon}</span>
                  <span>{f.name}</span>
                  {selectedFeatures.includes(f.id) && <Check size={12} color="#8b5cf6" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Description <span style={{ fontWeight: 400, color: '#666' }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell us about your garden..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Email <span style={{ fontWeight: 400, color: '#666' }}>(optional - for updates)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="gardener@example.com"
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

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#22c55e',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Flower2 size={20} />
            {submitting ? 'Registering...' : 'Register Garden'}
          </button>

          <p style={{ 
            textAlign: 'center', 
            fontSize: 11, 
            color: '#888', 
            marginTop: 12 
          }}>
            Your garden will appear on the map and help track the pollinator corridor! 🦋
          </p>
        </div>
      </div>
    </div>
  );
};

export default GardenRegistration;
