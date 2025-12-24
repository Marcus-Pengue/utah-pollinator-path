import React, { useState, useMemo } from 'react';
import { Flower2, Calendar, MapPin, Sun, ChevronLeft, ChevronRight, Eye, Bell, Sparkles } from 'lucide-react';

interface BloomingPlant {
  id: string;
  name: string;
  scientificName: string;
  bloomMonths: number[];
  peakMonths: number[];
  color: string;
  pollinators: string[];
  locations: string[];
  nativeToUtah: boolean;
  description: string;
  observationCount?: number;
}

interface BloomTrackerProps {
  currentMonth?: number;
  userCity?: string;
  observations?: Array<{ species: string; month: number; count: number }>;
  onPlantSelect?: (plant: BloomingPlant) => void;
}

// Utah native pollinator plants with bloom data
const BLOOM_DATABASE: BloomingPlant[] = [
  // Early Spring (March-April)
  { id: 'b1', name: 'Sagebrush Buttercup', scientificName: 'Ranunculus glaberrimus', bloomMonths: [3, 4], peakMonths: [3], color: '#fde047', pollinators: ['bee', 'fly'], locations: ['foothills', 'valleys'], nativeToUtah: true, description: 'One of the first wildflowers to bloom' },
  { id: 'b2', name: 'Spring Beauty', scientificName: 'Claytonia lanceolata', bloomMonths: [3, 4, 5], peakMonths: [4], color: '#fce7f3', pollinators: ['bee', 'butterfly'], locations: ['mountains', 'foothills'], nativeToUtah: true, description: 'Delicate pink-striped petals' },
  
  // Late Spring (April-May)
  { id: 'b3', name: 'Utah Serviceberry', scientificName: 'Amelanchier utahensis', bloomMonths: [4, 5], peakMonths: [4, 5], color: '#ffffff', pollinators: ['bee', 'butterfly'], locations: ['foothills', 'canyons'], nativeToUtah: true, description: 'White flower clusters, produces berries' },
  { id: 'b4', name: 'Golden Currant', scientificName: 'Ribes aureum', bloomMonths: [4, 5], peakMonths: [4], color: '#fcd34d', pollinators: ['bee', 'hummingbird'], locations: ['riparian', 'gardens'], nativeToUtah: true, description: 'Fragrant yellow flowers attract hummingbirds' },
  { id: 'b5', name: 'Arrowleaf Balsamroot', scientificName: 'Balsamorhiza sagittata', bloomMonths: [4, 5, 6], peakMonths: [5], color: '#facc15', pollinators: ['bee', 'butterfly'], locations: ['foothills', 'meadows'], nativeToUtah: true, description: 'Iconic yellow sunflower-like blooms' },
  
  // Early Summer (May-June)
  { id: 'b6', name: 'Rocky Mountain Penstemon', scientificName: 'Penstemon strictus', bloomMonths: [5, 6, 7], peakMonths: [6], color: '#7c3aed', pollinators: ['bee', 'hummingbird'], locations: ['foothills', 'gardens'], nativeToUtah: true, description: 'Deep purple-blue spikes, bee favorite' },
  { id: 'b7', name: 'Scarlet Gilia', scientificName: 'Ipomopsis aggregata', bloomMonths: [5, 6, 7, 8], peakMonths: [6, 7], color: '#dc2626', pollinators: ['hummingbird', 'moth'], locations: ['foothills', 'mountains'], nativeToUtah: true, description: 'Bright red trumpets for hummingbirds' },
  { id: 'b8', name: 'Blue Flax', scientificName: 'Linum lewisii', bloomMonths: [5, 6, 7], peakMonths: [6], color: '#3b82f6', pollinators: ['bee'], locations: ['meadows', 'gardens'], nativeToUtah: true, description: 'Delicate sky-blue flowers' },
  { id: 'b9', name: 'Sego Lily', scientificName: 'Calochortus nuttallii', bloomMonths: [5, 6, 7], peakMonths: [6], color: '#fefce8', pollinators: ['bee', 'butterfly'], locations: ['foothills', 'valleys'], nativeToUtah: true, description: 'Utah state flower!' },
  
  // Mid Summer (June-July)
  { id: 'b10', name: 'Blanket Flower', scientificName: 'Gaillardia aristata', bloomMonths: [6, 7, 8, 9], peakMonths: [7], color: '#dc2626', pollinators: ['bee', 'butterfly'], locations: ['meadows', 'gardens'], nativeToUtah: true, description: 'Red and yellow daisy-like blooms' },
  { id: 'b11', name: 'Scarlet Globemallow', scientificName: 'Sphaeralcea coccinea', bloomMonths: [5, 6, 7, 8], peakMonths: [6, 7], color: '#f97316', pollinators: ['bee'], locations: ['valleys', 'roadsides'], nativeToUtah: true, description: 'Orange cup-shaped flowers' },
  { id: 'b12', name: 'Palmer Penstemon', scientificName: 'Penstemon palmeri', bloomMonths: [5, 6, 7], peakMonths: [6], color: '#f9a8d4', pollinators: ['bee', 'hummingbird'], locations: ['foothills', 'washes'], nativeToUtah: true, description: 'Fragrant pink flowers' },
  
  // Late Summer (July-August)
  { id: 'b13', name: 'Purple Coneflower', scientificName: 'Echinacea purpurea', bloomMonths: [6, 7, 8, 9], peakMonths: [7, 8], color: '#a855f7', pollinators: ['bee', 'butterfly'], locations: ['gardens'], nativeToUtah: false, description: 'Classic pollinator magnet' },
  { id: 'b14', name: 'Black-eyed Susan', scientificName: 'Rudbeckia hirta', bloomMonths: [6, 7, 8, 9], peakMonths: [7, 8], color: '#eab308', pollinators: ['bee', 'butterfly'], locations: ['meadows', 'gardens'], nativeToUtah: true, description: 'Cheerful yellow with dark centers' },
  { id: 'b15', name: 'Butterfly Weed', scientificName: 'Asclepias tuberosa', bloomMonths: [6, 7, 8], peakMonths: [7], color: '#ea580c', pollinators: ['butterfly', 'bee'], locations: ['gardens', 'meadows'], nativeToUtah: false, description: 'Essential monarch host plant' },
  { id: 'b16', name: 'Bee Balm', scientificName: 'Monarda fistulosa', bloomMonths: [6, 7, 8], peakMonths: [7], color: '#c084fc', pollinators: ['bee', 'hummingbird', 'butterfly'], locations: ['meadows', 'gardens'], nativeToUtah: true, description: 'Lavender pompom flowers' },
  
  // Late Summer/Fall (August-October)
  { id: 'b17', name: 'Rabbitbrush', scientificName: 'Ericameria nauseosa', bloomMonths: [8, 9, 10], peakMonths: [9], color: '#facc15', pollinators: ['bee', 'butterfly'], locations: ['valleys', 'roadsides'], nativeToUtah: true, description: 'Critical late-season nectar source' },
  { id: 'b18', name: 'Showy Goldeneye', scientificName: 'Heliomeris multiflora', bloomMonths: [7, 8, 9, 10], peakMonths: [8, 9], color: '#fbbf24', pollinators: ['bee', 'butterfly'], locations: ['foothills', 'gardens'], nativeToUtah: true, description: 'Abundant yellow flowers' },
  { id: 'b19', name: 'Blue Sage', scientificName: 'Salvia azurea', bloomMonths: [8, 9, 10], peakMonths: [9], color: '#2563eb', pollinators: ['bee', 'butterfly'], locations: ['gardens'], nativeToUtah: false, description: 'Late-season bee magnet' },
  { id: 'b20', name: 'Goldenrod', scientificName: 'Solidago spp.', bloomMonths: [8, 9, 10], peakMonths: [9], color: '#fcd34d', pollinators: ['bee', 'butterfly', 'fly'], locations: ['meadows', 'roadsides'], nativeToUtah: true, description: 'Fall pollinator favorite' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const POLLINATOR_ICONS: Record<string, string> = {
  bee: '🐝',
  butterfly: '🦋',
  hummingbird: '🐦',
  moth: '🦋',
  fly: '🪰'
};

const BloomTracker: React.FC<BloomTrackerProps> = ({ 
  currentMonth = new Date().getMonth() + 1,
  userCity,
  observations = [],
  onPlantSelect
}) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [filterPollinator, setFilterPollinator] = useState<string>('all');
  const [showNativeOnly, setShowNativeOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'current' | 'calendar' | 'upcoming'>('current');

  // Get plants blooming in selected month
  const bloomingNow = useMemo(() => {
    return BLOOM_DATABASE
      .filter(p => p.bloomMonths.includes(selectedMonth))
      .filter(p => filterPollinator === 'all' || p.pollinators.includes(filterPollinator))
      .filter(p => !showNativeOnly || p.nativeToUtah)
      .sort((a, b) => {
        // Sort by peak month match first
        const aIsPeak = a.peakMonths.includes(selectedMonth) ? 1 : 0;
        const bIsPeak = b.peakMonths.includes(selectedMonth) ? 1 : 0;
        return bIsPeak - aIsPeak;
      });
  }, [selectedMonth, filterPollinator, showNativeOnly]);

  // Get upcoming blooms (next 2 months)
  const upcomingBlooms = useMemo(() => {
    const next1 = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const next2 = next1 === 12 ? 1 : next1 + 1;
    
    return BLOOM_DATABASE
      .filter(p => !p.bloomMonths.includes(selectedMonth))
      .filter(p => p.bloomMonths.includes(next1) || p.bloomMonths.includes(next2))
      .filter(p => filterPollinator === 'all' || p.pollinators.includes(filterPollinator))
      .filter(p => !showNativeOnly || p.nativeToUtah)
      .map(p => ({
        ...p,
        startsIn: p.bloomMonths.includes(next1) ? 1 : 2
      }))
      .sort((a, b) => a.startsIn - b.startsIn);
  }, [selectedMonth, filterPollinator, showNativeOnly]);

  // Peak blooms this month
  const peakBlooms = bloomingNow.filter(p => p.peakMonths.includes(selectedMonth));

  // Calendar view data
  const calendarData = useMemo(() => {
    return MONTHS.map((month, i) => {
      const monthNum = i + 1;
      const plants = BLOOM_DATABASE.filter(p => p.bloomMonths.includes(monthNum));
      const peakPlants = BLOOM_DATABASE.filter(p => p.peakMonths.includes(monthNum));
      return {
        month,
        monthNum,
        totalBlooming: plants.length,
        peakBlooming: peakPlants.length,
        isCurrentMonth: monthNum === currentMonth,
        isSelected: monthNum === selectedMonth,
        isGrowingSeason: monthNum >= 3 && monthNum <= 10
      };
    });
  }, [currentMonth, selectedMonth]);

  const navigateMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    if (newMonth > 12) newMonth = 1;
    if (newMonth < 1) newMonth = 12;
    setSelectedMonth(newMonth);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fefefe' }}>
      {/* Header */}
      <div style={{ 
        padding: 16, 
        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Flower2 size={24} />
          <h3 style={{ margin: 0, fontWeight: 700 }}>Bloom Tracker</h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
          See what's blooming now and plan your pollinator garden
        </p>
      </div>

      {/* Month Navigator */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#f0fdf4',
        borderBottom: '1px solid #dcfce7'
      }}>
        <button 
          onClick={() => navigateMonth(-1)}
          style={{ 
            border: 'none', 
            background: 'none', 
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            display: 'flex'
          }}
        >
          <ChevronLeft size={20} color="#16a34a" />
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#166534' }}>
            {FULL_MONTHS[selectedMonth - 1]}
          </div>
          <div style={{ fontSize: 12, color: '#22c55e' }}>
            {bloomingNow.length} species blooming • {peakBlooms.length} at peak
          </div>
        </div>
        
        <button 
          onClick={() => navigateMonth(1)}
          style={{ 
            border: 'none', 
            background: 'none', 
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            display: 'flex'
          }}
        >
          <ChevronRight size={20} color="#16a34a" />
        </button>
      </div>

      {/* View Mode Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        {[
          { id: 'current', label: 'Now Blooming', icon: Flower2 },
          { id: 'upcoming', label: 'Coming Soon', icon: Bell },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewMode === tab.id ? 'white' : '#f9fafb',
              borderBottom: viewMode === tab.id ? '2px solid #22c55e' : '2px solid transparent',
              color: viewMode === tab.id ? '#166534' : '#666',
              fontWeight: viewMode === tab.id ? 600 : 400,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ 
        padding: '10px 16px', 
        display: 'flex', 
        gap: 8, 
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap'
      }}>
        <select
          value={filterPollinator}
          onChange={(e) => setFilterPollinator(e.target.value)}
          style={{ 
            padding: '6px 10px', 
            borderRadius: 6, 
            border: '1px solid #ddd', 
            fontSize: 12,
            backgroundColor: 'white'
          }}
        >
          <option value="all">All Pollinators</option>
          <option value="bee">🐝 Bees</option>
          <option value="butterfly">🦋 Butterflies</option>
          <option value="hummingbird">🐦 Hummingbirds</option>
          <option value="moth">🌙 Moths</option>
        </select>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4, 
          fontSize: 12,
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={showNativeOnly}
            onChange={(e) => setShowNativeOnly(e.target.checked)}
          />
          Utah Native Only
        </label>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Current Blooms View */}
        {viewMode === 'current' && (
          <div>
            {/* Peak Blooms Highlight */}
            {peakBlooms.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  marginBottom: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#166534'
                }}>
                  <Sparkles size={16} color="#f59e0b" />
                  Peak Blooming Now
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {peakBlooms.slice(0, 5).map(plant => (
                    <div
                      key={plant.id}
                      onClick={() => onPlantSelect?.(plant)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        backgroundColor: '#fef3c7',
                        borderRadius: 20,
                        fontSize: 12,
                        cursor: 'pointer',
                        border: '1px solid #fcd34d'
                      }}
                    >
                      <div style={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: plant.color 
                      }} />
                      {plant.name}
                      <span>⭐</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Blooming Plants */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bloomingNow.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 40, 
                  color: '#666' 
                }}>
                  <Flower2 size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
                  <div>No blooms match your filters</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting the month or filters</div>
                </div>
              ) : (
                bloomingNow.map(plant => (
                  <div
                    key={plant.id}
                    onClick={() => onPlantSelect?.(plant)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 12,
                      backgroundColor: 'white',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      backgroundColor: plant.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                      border: plant.peakMonths.includes(selectedMonth) ? '3px solid #f59e0b' : 'none'
                    }}>
                      🌸
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {plant.name}
                        {plant.nativeToUtah && (
                          <span style={{ 
                            fontSize: 9, 
                            backgroundColor: '#dcfce7', 
                            color: '#166534',
                            padding: '2px 6px',
                            borderRadius: 4
                          }}>
                            NATIVE
                          </span>
                        )}
                        {plant.peakMonths.includes(selectedMonth) && (
                          <span style={{ fontSize: 12 }}>⭐</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                        {plant.scientificName}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        {plant.description}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        gap: 8, 
                        marginTop: 8,
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ fontSize: 11, color: '#888' }}>
                          Attracts: {plant.pollinators.map(p => POLLINATOR_ICONS[p] || p).join(' ')}
                        </div>
                        <div style={{ fontSize: 11, color: '#888' }}>
                          📍 {plant.locations.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Upcoming Blooms View */}
        {viewMode === 'upcoming' && (
          <div>
            {upcomingBlooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                <Bell size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
                <div>All plants matching your filters are already blooming!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingBlooms.map(plant => (
                  <div
                    key={plant.id}
                    onClick={() => onPlantSelect?.(plant)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      backgroundColor: 'white',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: plant.color,
                      opacity: 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18
                    }}>
                      🌱
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {plant.name}
                        {plant.nativeToUtah && (
                          <span style={{ 
                            fontSize: 9, 
                            backgroundColor: '#dcfce7', 
                            color: '#166534',
                            padding: '2px 6px',
                            borderRadius: 4,
                            marginLeft: 6
                          }}>
                            NATIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#666' }}>
                        Starts blooming in {plant.startsIn} month{plant.startsIn > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#fef3c7',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#92400e'
                    }}>
                      {MONTHS[plant.bloomMonths[0] - 1]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: 8,
              marginBottom: 20
            }}>
              {calendarData.map(data => (
                <div
                  key={data.month}
                  onClick={() => setSelectedMonth(data.monthNum)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: data.isSelected ? '#22c55e' : data.isGrowingSeason ? '#f0fdf4' : '#f9fafb',
                    border: data.isCurrentMonth ? '2px solid #22c55e' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 600,
                    color: data.isSelected ? 'white' : '#374151'
                  }}>
                    {data.month}
                  </div>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 700,
                    color: data.isSelected ? 'white' : '#22c55e'
                  }}>
                    {data.totalBlooming}
                  </div>
                  <div style={{ 
                    fontSize: 10, 
                    color: data.isSelected ? 'rgba(255,255,255,0.8)' : '#666' 
                  }}>
                    {data.peakBlooming} peak
                  </div>
                </div>
              ))}
            </div>

            {/* Season Guide */}
            <div style={{ 
              backgroundColor: '#fef3c7', 
              borderRadius: 10, 
              padding: 14 
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
                🌻 Utah Bloom Seasons
              </div>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                <div><strong>Early Spring (Mar-Apr):</strong> Buttercups, Spring Beauty</div>
                <div><strong>Late Spring (Apr-May):</strong> Serviceberry, Balsamroot, Sego Lily</div>
                <div><strong>Summer (Jun-Aug):</strong> Penstemons, Coneflowers, Bee Balm</div>
                <div><strong>Fall (Sep-Oct):</strong> Rabbitbrush, Goldenrod</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Tip */}
      <div style={{ 
        padding: 12, 
        backgroundColor: '#f0fdf4', 
        borderTop: '1px solid #dcfce7',
        fontSize: 12,
        color: '#166534',
        textAlign: 'center'
      }}>
        💡 Tip: Plant species from each season to support pollinators year-round
      </div>
    </div>
  );
};

export default BloomTracker;
