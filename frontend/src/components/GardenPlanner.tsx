import React, { useState, useMemo } from 'react';
import { Leaf, Sun, Droplets, Calendar, ChevronDown, ChevronUp, Check, Plus, Sparkles, Bug, Bird, Flower2 } from 'lucide-react';

interface Plant {
  id: string;
  name: string;
  scientificName: string;
  type: 'flower' | 'shrub' | 'tree' | 'herb' | 'grass';
  bloomMonths: number[];
  pollinators: string[];
  waterNeeds: 'low' | 'medium' | 'high';
  sunNeeds: 'full' | 'partial' | 'shade';
  nativeToUtah: boolean;
  height: string;
  color: string;
  description: string;
}

interface GardenPlannerProps {
  existingPlants?: string[];
  nearbyObservations?: { taxon: string; count: number }[];
  onAddPlant?: (plant: Plant) => void;
}

// Utah native pollinator plants database
const UTAH_PLANTS: Plant[] = [
  // Spring bloomers (March-May)
  { id: 'p1', name: 'Desert Marigold', scientificName: 'Baileya multiradiata', type: 'flower', bloomMonths: [3,4,5,6], pollinators: ['Insecta', 'Lepidoptera'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '12-18"', color: '#fbbf24', description: 'Bright yellow flowers, extremely drought tolerant' },
  { id: 'p2', name: 'Utah Serviceberry', scientificName: 'Amelanchier utahensis', type: 'shrub', bloomMonths: [4,5], pollinators: ['Insecta', 'Aves'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '6-15\'', color: '#ffffff', description: 'White spring flowers, berries feed birds' },
  { id: 'p3', name: 'Golden Currant', scientificName: 'Ribes aureum', type: 'shrub', bloomMonths: [4,5], pollinators: ['Insecta', 'Aves'], waterNeeds: 'medium', sunNeeds: 'partial', nativeToUtah: true, height: '3-6\'', color: '#fcd34d', description: 'Fragrant yellow flowers, attracts hummingbirds' },
  
  // Early summer (June-July)
  { id: 'p4', name: 'Blanket Flower', scientificName: 'Gaillardia aristata', type: 'flower', bloomMonths: [6,7,8,9], pollinators: ['Insecta', 'Lepidoptera'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '18-24"', color: '#dc2626', description: 'Red and yellow daisy-like flowers, long blooming' },
  { id: 'p5', name: 'Rocky Mountain Penstemon', scientificName: 'Penstemon strictus', type: 'flower', bloomMonths: [5,6,7], pollinators: ['Insecta'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '24-30"', color: '#7c3aed', description: 'Deep purple-blue spikes, excellent for bees' },
  { id: 'p6', name: 'Scarlet Globemallow', scientificName: 'Sphaeralcea coccinea', type: 'flower', bloomMonths: [5,6,7,8], pollinators: ['Insecta'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '6-18"', color: '#f97316', description: 'Orange cup-shaped flowers, very drought tolerant' },
  { id: 'p7', name: 'Blue Flax', scientificName: 'Linum lewisii', type: 'flower', bloomMonths: [5,6,7], pollinators: ['Insecta'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '12-24"', color: '#3b82f6', description: 'Delicate sky-blue flowers, self-seeds easily' },
  
  // Mid-summer (July-August)
  { id: 'p8', name: 'Purple Coneflower', scientificName: 'Echinacea purpurea', type: 'flower', bloomMonths: [6,7,8,9], pollinators: ['Insecta', 'Lepidoptera', 'Aves'], waterNeeds: 'medium', sunNeeds: 'full', nativeToUtah: false, height: '24-36"', color: '#a855f7', description: 'Classic pollinator magnet, seeds feed birds' },
  { id: 'p9', name: 'Black-eyed Susan', scientificName: 'Rudbeckia hirta', type: 'flower', bloomMonths: [6,7,8,9], pollinators: ['Insecta', 'Lepidoptera'], waterNeeds: 'medium', sunNeeds: 'full', nativeToUtah: true, height: '24-36"', color: '#eab308', description: 'Cheerful yellow flowers with dark centers' },
  { id: 'p10', name: 'Butterfly Weed', scientificName: 'Asclepias tuberosa', type: 'flower', bloomMonths: [6,7,8], pollinators: ['Insecta', 'Lepidoptera'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: false, height: '18-24"', color: '#ea580c', description: 'Essential monarch butterfly host plant' },
  
  // Late summer/Fall (August-October)
  { id: 'p11', name: 'Rabbitbrush', scientificName: 'Ericameria nauseosa', type: 'shrub', bloomMonths: [8,9,10], pollinators: ['Insecta', 'Lepidoptera'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '3-6\'', color: '#facc15', description: 'Late-season yellow blooms, crucial fall nectar' },
  { id: 'p12', name: 'Showy Goldeneye', scientificName: 'Heliomeris multiflora', type: 'flower', bloomMonths: [7,8,9,10], pollinators: ['Insecta'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '24-36"', color: '#fbbf24', description: 'Abundant yellow flowers through fall' },
  { id: 'p13', name: 'Blue Sage', scientificName: 'Salvia azurea', type: 'flower', bloomMonths: [8,9,10], pollinators: ['Insecta'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: false, height: '36-48"', color: '#2563eb', description: 'Sky-blue spikes, late-season bee magnet' },
  
  // Multi-season
  { id: 'p14', name: 'Lavender', scientificName: 'Lavandula angustifolia', type: 'herb', bloomMonths: [6,7,8], pollinators: ['Insecta'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: false, height: '18-24"', color: '#8b5cf6', description: 'Fragrant purple spikes, bee favorite' },
  { id: 'p15', name: 'Catmint', scientificName: 'Nepeta x faassenii', type: 'flower', bloomMonths: [5,6,7,8,9], pollinators: ['Insecta'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: false, height: '12-18"', color: '#a78bfa', description: 'Long-blooming purple-blue, deer resistant' },
  { id: 'p16', name: 'Yarrow', scientificName: 'Achillea millefolium', type: 'flower', bloomMonths: [5,6,7,8,9], pollinators: ['Insecta', 'Lepidoptera'], waterNeeds: 'low', sunNeeds: 'full', nativeToUtah: true, height: '24-36"', color: '#fef3c7', description: 'Flat-topped clusters, many color varieties' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const GardenPlanner: React.FC<GardenPlannerProps> = ({ existingPlants = [], nearbyObservations = [], onAddPlant }) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedWater, setSelectedWater] = useState<string>('all');
  const [showNativeOnly, setShowNativeOnly] = useState(true);
  const [expandedPlant, setExpandedPlant] = useState<string | null>(null);
  const [addedPlants, setAddedPlants] = useState<string[]>(existingPlants);

  // Analyze bloom coverage
  const bloomCoverage = useMemo(() => {
    const coverage: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) coverage[m] = 0;
    
    addedPlants.forEach(plantId => {
      const plant = UTAH_PLANTS.find(p => p.id === plantId);
      if (plant) {
        plant.bloomMonths.forEach(m => coverage[m]++);
      }
    });
    return coverage;
  }, [addedPlants]);

  // Find gap months
  const gapMonths = useMemo(() => {
    const growingSeason = [3, 4, 5, 6, 7, 8, 9, 10]; // March-October
    return growingSeason.filter(m => bloomCoverage[m] === 0);
  }, [bloomCoverage]);

  // Recommend plants to fill gaps
  const recommendations = useMemo(() => {
    if (gapMonths.length === 0) return [];
    
    return UTAH_PLANTS
      .filter(p => !addedPlants.includes(p.id))
      .filter(p => p.bloomMonths.some(m => gapMonths.includes(m)))
      .filter(p => !showNativeOnly || p.nativeToUtah)
      .sort((a, b) => {
        // Prioritize plants that fill more gaps
        const aGaps = a.bloomMonths.filter(m => gapMonths.includes(m)).length;
        const bGaps = b.bloomMonths.filter(m => gapMonths.includes(m)).length;
        return bGaps - aGaps;
      })
      .slice(0, 5);
  }, [gapMonths, addedPlants, showNativeOnly]);

  // Filter plants
  const filteredPlants = useMemo(() => {
    return UTAH_PLANTS
      .filter(p => selectedType === 'all' || p.type === selectedType)
      .filter(p => selectedWater === 'all' || p.waterNeeds === selectedWater)
      .filter(p => !showNativeOnly || p.nativeToUtah);
  }, [selectedType, selectedWater, showNativeOnly]);

  const handleAddPlant = (plant: Plant) => {
    if (!addedPlants.includes(plant.id)) {
      setAddedPlants([...addedPlants, plant.id]);
      onAddPlant?.(plant);
    }
  };

  const handleRemovePlant = (plantId: string) => {
    setAddedPlants(addedPlants.filter(id => id !== plantId));
  };

  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flower2 size={24} color="#22c55e" />
          Garden Planner
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
          Build a pollinator-friendly garden with year-round blooms
        </p>
      </div>

      {/* Bloom Calendar */}
      <div style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={16} color="#22c55e" />
          Your Bloom Calendar
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {MONTHS.map((month, i) => {
            const count = bloomCoverage[i + 1] || 0;
            const isGrowingSeason = i >= 2 && i <= 9;
            return (
              <div
                key={month}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px 2px',
                  borderRadius: 6,
                  backgroundColor: count > 0 
                    ? `rgba(34, 197, 94, ${Math.min(0.2 + count * 0.15, 0.9)})` 
                    : isGrowingSeason ? '#fef2f2' : '#f3f4f6',
                  border: count === 0 && isGrowingSeason ? '2px dashed #fca5a5' : 'none'
                }}
              >
                <div style={{ fontSize: 10, color: '#666' }}>{month}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: count > 0 ? '#166534' : '#999' }}>
                  {count || '-'}
                </div>
              </div>
            );
          })}
        </div>
        {gapMonths.length > 0 && (
          <div style={{ marginTop: 12, padding: 10, backgroundColor: '#fef3c7', borderRadius: 8, fontSize: 12 }}>
            <strong>⚠️ Gap Alert:</strong> No blooms in {gapMonths.map(m => MONTHS[m - 1]).join(', ')}
          </div>
        )}
        {gapMonths.length === 0 && addedPlants.length > 0 && (
          <div style={{ marginTop: 12, padding: 10, backgroundColor: '#dcfce7', borderRadius: 8, fontSize: 12 }}>
            <strong>✅ Great coverage!</strong> You have blooms throughout the growing season
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} color="#f59e0b" />
            Recommended to Fill Gaps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommendations.map(plant => (
              <div
                key={plant.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: 'white',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
                onClick={() => handleAddPlant(plant)}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: plant.color, opacity: 0.8 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{plant.name}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>
                    Blooms: {plant.bloomMonths.map(m => MONTHS[m - 1]).join(', ')}
                  </div>
                </div>
                <Plus size={18} color="#22c55e" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Plants */}
      {addedPlants.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
            My Plants ({addedPlants.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {addedPlants.map(plantId => {
              const plant = UTAH_PLANTS.find(p => p.id === plantId);
              if (!plant) return null;
              return (
                <div
                  key={plantId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: 20,
                    fontSize: 12
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: plant.color }} />
                  {plant.name}
                  <button
                    onClick={() => handleRemovePlant(plantId)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#999' }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
        >
          <option value="all">All Types</option>
          <option value="flower">Flowers</option>
          <option value="shrub">Shrubs</option>
          <option value="herb">Herbs</option>
          <option value="grass">Grasses</option>
        </select>
        <select
          value={selectedWater}
          onChange={(e) => setSelectedWater(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
        >
          <option value="all">Any Water</option>
          <option value="low">Low Water</option>
          <option value="medium">Medium Water</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showNativeOnly}
            onChange={(e) => setShowNativeOnly(e.target.checked)}
          />
          Utah Native
        </label>
      </div>

      {/* Plant List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredPlants.map(plant => {
          const isAdded = addedPlants.includes(plant.id);
          const isExpanded = expandedPlant === plant.id;
          
          return (
            <div
              key={plant.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: isAdded ? '#f0fdf4' : 'white'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedPlant(isExpanded ? null : plant.id)}
              >
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  backgroundColor: plant.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18
                }}>
                  {plant.type === 'flower' ? '🌸' : plant.type === 'shrub' ? '🌿' : plant.type === 'herb' ? '🌱' : '🌾'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {plant.name}
                    {plant.nativeToUtah && <span style={{ marginLeft: 6, fontSize: 10, color: '#22c55e' }}>🌿 Native</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>{plant.scientificName}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isAdded && <Check size={18} color="#22c55e" />}
                  {isExpanded ? <ChevronUp size={18} color="#999" /> : <ChevronDown size={18} color="#999" />}
                </div>
              </div>
              
              {isExpanded && (
                <div style={{ padding: '0 12px 12px', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: 13, color: '#666', margin: '12px 0' }}>{plant.description}</p>
                  
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Sun size={14} color="#f59e0b" />
                      {plant.sunNeeds === 'full' ? 'Full Sun' : plant.sunNeeds === 'partial' ? 'Partial Shade' : 'Shade'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Droplets size={14} color="#3b82f6" />
                      {plant.waterNeeds === 'low' ? 'Low Water' : plant.waterNeeds === 'medium' ? 'Medium' : 'High'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Leaf size={14} color="#22c55e" />
                      {plant.height}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                    <strong>Blooms:</strong> {plant.bloomMonths.map(m => MONTHS[m - 1]).join(', ')}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    {plant.pollinators.includes('Insecta') && <span title="Attracts bees"><Bug size={16} color="#f59e0b" /></span>}
                    {plant.pollinators.includes('Lepidoptera') && <span title="Attracts butterflies">🦋</span>}
                    {plant.pollinators.includes('Aves') && <span title="Attracts birds"><Bird size={16} color="#3b82f6" /></span>}
                  </div>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); isAdded ? handleRemovePlant(plant.id) : handleAddPlant(plant); }}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: isAdded ? '#fee2e2' : '#22c55e',
                      color: isAdded ? '#dc2626' : 'white',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isAdded ? 'Remove from Garden' : 'Add to My Garden'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GardenPlanner;
