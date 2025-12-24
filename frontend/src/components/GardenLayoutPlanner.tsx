import React, { useState, useRef, useCallback } from 'react';
import { Flower2, Trees, Droplets, Sun, Cloud, Move, Trash2, RotateCcw, Download, ZoomIn, ZoomOut, Grid, Info, Shrub } from 'lucide-react';

interface PlantType {
  id: string;
  name: string;
  icon: string;
  color: string;
  width: number; // feet
  height: number; // feet
  spacing: number; // feet between plants
  sunNeeds: 'full' | 'partial' | 'shade';
  waterNeeds: 'low' | 'medium' | 'high';
  category: 'flower' | 'shrub' | 'tree' | 'groundcover';
  blooms?: string;
}

interface PlacedPlant {
  id: string;
  plantType: PlantType;
  x: number; // grid position
  y: number;
  rotation: number;
}

interface GardenZone {
  id: string;
  type: 'full-sun' | 'partial-shade' | 'full-shade' | 'wet' | 'dry';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GardenLayoutPlannerProps {
  onSave?: (layout: any) => void;
  existingPlants?: string[];
}

const PLANT_PALETTE: PlantType[] = [
  // Flowers
  { id: 'desert-marigold', name: 'Desert Marigold', icon: '🌼', color: '#fbbf24', width: 1.5, height: 1, spacing: 1.5, sunNeeds: 'full', waterNeeds: 'low', category: 'flower', blooms: 'Mar-Nov' },
  { id: 'blue-flax', name: 'Blue Flax', icon: '💙', color: '#3b82f6', width: 1, height: 1.5, spacing: 1, sunNeeds: 'full', waterNeeds: 'low', category: 'flower', blooms: 'May-Jul' },
  { id: 'penstemon', name: 'Penstemon', icon: '🌺', color: '#ec4899', width: 1.5, height: 2, spacing: 1.5, sunNeeds: 'full', waterNeeds: 'low', category: 'flower', blooms: 'May-Jul' },
  { id: 'blanket-flower', name: 'Blanket Flower', icon: '🔴', color: '#ef4444', width: 1.5, height: 1.5, spacing: 1, sunNeeds: 'full', waterNeeds: 'low', category: 'flower', blooms: 'Jun-Sep' },
  { id: 'black-eyed-susan', name: 'Black-eyed Susan', icon: '🌻', color: '#f59e0b', width: 2, height: 2, spacing: 1.5, sunNeeds: 'full', waterNeeds: 'medium', category: 'flower', blooms: 'Jun-Oct' },
  { id: 'coneflower', name: 'Purple Coneflower', icon: '💜', color: '#a855f7', width: 2, height: 3, spacing: 1.5, sunNeeds: 'full', waterNeeds: 'low', category: 'flower', blooms: 'Jun-Aug' },
  { id: 'bee-balm', name: 'Bee Balm', icon: '🔮', color: '#dc2626', width: 2, height: 3, spacing: 2, sunNeeds: 'full', waterNeeds: 'medium', category: 'flower', blooms: 'Jul-Sep' },
  { id: 'goldenrod', name: 'Goldenrod', icon: '💛', color: '#eab308', width: 2, height: 3, spacing: 2, sunNeeds: 'full', waterNeeds: 'low', category: 'flower', blooms: 'Aug-Oct' },
  
  // Shrubs
  { id: 'rabbitbrush', name: 'Rabbitbrush', icon: '🌿', color: '#84cc16', width: 4, height: 4, spacing: 4, sunNeeds: 'full', waterNeeds: 'low', category: 'shrub', blooms: 'Aug-Oct' },
  { id: 'apache-plume', name: 'Apache Plume', icon: '🤍', color: '#f5f5f4', width: 4, height: 5, spacing: 4, sunNeeds: 'full', waterNeeds: 'low', category: 'shrub', blooms: 'May-Oct' },
  { id: 'fernbush', name: 'Fernbush', icon: '🌲', color: '#65a30d', width: 4, height: 5, spacing: 4, sunNeeds: 'partial', waterNeeds: 'low', category: 'shrub', blooms: 'Jun-Aug' },
  { id: 'red-twig-dogwood', name: 'Red Twig Dogwood', icon: '🔴', color: '#b91c1c', width: 6, height: 8, spacing: 5, sunNeeds: 'partial', waterNeeds: 'medium', category: 'shrub' },
  
  // Groundcovers
  { id: 'creeping-thyme', name: 'Creeping Thyme', icon: '🌱', color: '#86efac', width: 1, height: 0.25, spacing: 1, sunNeeds: 'full', waterNeeds: 'low', category: 'groundcover', blooms: 'Jun-Jul' },
  { id: 'sedum', name: 'Sedum', icon: '🪴', color: '#22c55e', width: 1.5, height: 0.5, spacing: 1, sunNeeds: 'full', waterNeeds: 'low', category: 'groundcover', blooms: 'Aug-Sep' },
  
  // Trees
  { id: 'desert-willow', name: 'Desert Willow', icon: '🌳', color: '#16a34a', width: 15, height: 25, spacing: 15, sunNeeds: 'full', waterNeeds: 'low', category: 'tree', blooms: 'May-Sep' },
  { id: 'serviceberry', name: 'Serviceberry', icon: '🌳', color: '#15803d', width: 12, height: 15, spacing: 10, sunNeeds: 'partial', waterNeeds: 'medium', category: 'tree', blooms: 'Apr-May' },
];

const ZONE_COLORS = {
  'full-sun': { bg: '#fef3c7', border: '#f59e0b', label: 'Full Sun' },
  'partial-shade': { bg: '#dbeafe', border: '#3b82f6', label: 'Partial Shade' },
  'full-shade': { bg: '#e5e7eb', border: '#6b7280', label: 'Full Shade' },
  'wet': { bg: '#cffafe', border: '#06b6d4', label: 'Wet Area' },
  'dry': { bg: '#fef2f2', border: '#ef4444', label: 'Dry Area' },
};

const GardenLayoutPlanner: React.FC<GardenLayoutPlannerProps> = ({ onSave, existingPlants }) => {
  const [gardenWidth, setGardenWidth] = useState(20); // feet
  const [gardenHeight, setGardenHeight] = useState(15); // feet
  const [cellSize, setCellSize] = useState(30); // pixels per foot
  const [placedPlants, setPlacedPlants] = useState<PlacedPlant[]>([]);
  const [zones, setZones] = useState<GardenZone[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [selectedPlaced, setSelectedPlaced] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showSpacing, setShowSpacing] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('flower');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const filteredPlants = PLANT_PALETTE.filter(p => p.category === activeCategory);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !selectedPlant) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    if (x >= 0 && x < gardenWidth && y >= 0 && y < gardenHeight) {
      const newPlant: PlacedPlant = {
        id: `plant-${Date.now()}`,
        plantType: selectedPlant,
        x,
        y,
        rotation: 0
      };
      setPlacedPlants(prev => [...prev, newPlant]);
    }
  }, [selectedPlant, cellSize, gardenWidth, gardenHeight]);

  const handlePlantDragStart = (e: React.MouseEvent, plantId: string) => {
    e.stopPropagation();
    setSelectedPlaced(plantId);
    setIsDragging(true);
    const plant = placedPlants.find(p => p.id === plantId);
    if (plant && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - plant.x * cellSize,
        y: e.clientY - rect.top - plant.y * cellSize
      });
    }
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedPlaced || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - dragOffset.x) / cellSize);
    const y = Math.floor((e.clientY - rect.top - dragOffset.y) / cellSize);
    
    setPlacedPlants(prev => prev.map(p => 
      p.id === selectedPlaced ? { ...p, x: Math.max(0, Math.min(gardenWidth - 1, x)), y: Math.max(0, Math.min(gardenHeight - 1, y)) } : p
    ));
  }, [isDragging, selectedPlaced, cellSize, gardenWidth, gardenHeight, dragOffset]);

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const deletePlant = (id: string) => {
    setPlacedPlants(prev => prev.filter(p => p.id !== id));
    setSelectedPlaced(null);
  };

  const clearAll = () => {
    if (window.confirm('Clear all plants from the garden?')) {
      setPlacedPlants([]);
      setZones([]);
    }
  };

  const exportLayout = () => {
    const layout = {
      dimensions: { width: gardenWidth, height: gardenHeight },
      plants: placedPlants.map(p => ({
        name: p.plantType.name,
        x: p.x,
        y: p.y,
        spacing: p.plantType.spacing
      })),
      zones,
      plantList: placedPlants.reduce((acc, p) => {
        const existing = acc.find(a => a.name === p.plantType.name);
        if (existing) existing.count++;
        else acc.push({ name: p.plantType.name, count: 1 });
        return acc;
      }, [] as { name: string; count: number }[])
    };
    
    const text = `GARDEN LAYOUT PLAN
Generated: ${new Date().toLocaleDateString()}

DIMENSIONS: ${gardenWidth}' x ${gardenHeight}' (${gardenWidth * gardenHeight} sq ft)

PLANT LIST:
${layout.plantList.map(p => `  - ${p.name}: ${p.count}`).join('\n')}

TOTAL PLANTS: ${placedPlants.length}

PLACEMENT (x, y in feet from top-left):
${layout.plants.map(p => `  - ${p.name} at (${p.x}', ${p.y}')`).join('\n')}
`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'garden-layout.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const plantCounts = placedPlants.reduce((acc, p) => {
    acc[p.plantType.name] = (acc[p.plantType.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fefefe' }}>
      {/* Header */}
      <div style={{ padding: 12, background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Grid size={20} />
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Garden Layout Planner</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCellSize(s => Math.min(50, s + 5))} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, padding: '4px 8px', color: 'white', cursor: 'pointer' }}>
              <ZoomIn size={16} />
            </button>
            <button onClick={() => setCellSize(s => Math.max(15, s - 5))} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, padding: '4px 8px', color: 'white', cursor: 'pointer' }}>
              <ZoomOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: 8, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Size:</span>
          <input type="number" value={gardenWidth} onChange={e => setGardenWidth(Number(e.target.value))} style={{ width: 40, padding: '4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }} />
          <span style={{ fontSize: 11 }}>x</span>
          <input type="number" value={gardenHeight} onChange={e => setGardenHeight(Number(e.target.value))} style={{ width: 40, padding: '4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }} />
          <span style={{ fontSize: 11, color: '#666' }}>ft</span>
        </div>
        <div style={{ height: 20, width: 1, backgroundColor: '#ddd' }} />
        <button onClick={() => setShowGrid(!showGrid)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: showGrid ? '#22c55e' : '#f3f4f6', color: showGrid ? 'white' : '#666', fontSize: 11, cursor: 'pointer' }}>Grid</button>
        <button onClick={() => setShowSpacing(!showSpacing)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: showSpacing ? '#22c55e' : '#f3f4f6', color: showSpacing ? 'white' : '#666', fontSize: 11, cursor: 'pointer' }}>Spacing</button>
        <div style={{ height: 20, width: 1, backgroundColor: '#ddd' }} />
        <button onClick={clearAll} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RotateCcw size={12} /> Clear
        </button>
        <button onClick={exportLayout} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#dbeafe', color: '#2563eb', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Download size={12} /> Export
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Plant Palette */}
        <div style={{ width: 140, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          {/* Categories */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {[
              { id: 'flower', icon: '🌸', label: 'Flowers' },
              { id: 'shrub', icon: '🌿', label: 'Shrubs' },
              { id: 'groundcover', icon: '🌱', label: 'Ground' },
              { id: 'tree', icon: '🌳', label: 'Trees' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  flex: 1,
                  padding: '6px 2px',
                  border: 'none',
                  backgroundColor: activeCategory === cat.id ? '#f0fdf4' : 'white',
                  borderBottom: activeCategory === cat.id ? '2px solid #22c55e' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: 14
                }}
                title={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>
          
          {/* Plants */}
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredPlants.map(plant => (
                <div
                  key={plant.id}
                  onClick={() => setSelectedPlant(selectedPlant?.id === plant.id ? null : plant)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: `2px solid ${selectedPlant?.id === plant.id ? '#22c55e' : '#e5e7eb'}`,
                    backgroundColor: selectedPlant?.id === plant.id ? '#f0fdf4' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{plant.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>{plant.name}</div>
                      <div style={{ fontSize: 9, color: '#666' }}>{plant.width}'×{plant.height}'</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Selected Plant Info */}
          {selectedPlant && (
            <div style={{ padding: 8, borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedPlant.name}</div>
              <div>☀️ {selectedPlant.sunNeeds}</div>
              <div>💧 {selectedPlant.waterNeeds}</div>
              <div>↔️ {selectedPlant.spacing}' spacing</div>
              {selectedPlant.blooms && <div>🌸 {selectedPlant.blooms}</div>}
              <div style={{ marginTop: 6, color: '#22c55e', fontWeight: 600 }}>Click on garden to place</div>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, backgroundColor: '#f9fafb' }}>
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              width: gardenWidth * cellSize,
              height: gardenHeight * cellSize,
              backgroundColor: '#c7ddb5',
              border: '3px solid #7c9c6b',
              borderRadius: 4,
              position: 'relative',
              backgroundImage: showGrid ? `
                linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
              ` : 'none',
              backgroundSize: `${cellSize}px ${cellSize}px`,
              cursor: selectedPlant ? 'crosshair' : 'default'
            }}
          >
            {/* Zones */}
            {zones.map(zone => {
              const zoneStyle = ZONE_COLORS[zone.type];
              return (
                <div
                  key={zone.id}
                  style={{
                    position: 'absolute',
                    left: zone.x * cellSize,
                    top: zone.y * cellSize,
                    width: zone.width * cellSize,
                    height: zone.height * cellSize,
                    backgroundColor: zoneStyle.bg,
                    border: `2px dashed ${zoneStyle.border}`,
                    borderRadius: 4,
                    opacity: 0.7
                  }}
                />
              );
            })}

            {/* Placed Plants */}
            {placedPlants.map(plant => {
              const size = Math.max(plant.plantType.width, plant.plantType.height) * cellSize * 0.8;
              const isSelected = selectedPlaced === plant.id;
              
              return (
                <div
                  key={plant.id}
                  onMouseDown={(e) => handlePlantDragStart(e, plant.id)}
                  onClick={(e) => { e.stopPropagation(); setSelectedPlaced(isSelected ? null : plant.id); }}
                  style={{
                    position: 'absolute',
                    left: plant.x * cellSize + (cellSize - size) / 2,
                    top: plant.y * cellSize + (cellSize - size) / 2,
                    width: size,
                    height: size,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'move',
                    zIndex: isSelected ? 100 : 10,
                    transform: `rotate(${plant.rotation}deg)`
                  }}
                >
                  {/* Spacing circle */}
                  {showSpacing && (
                    <div style={{
                      position: 'absolute',
                      width: plant.plantType.spacing * cellSize * 2,
                      height: plant.plantType.spacing * cellSize * 2,
                      borderRadius: '50%',
                      border: `2px dashed ${isSelected ? '#22c55e' : 'rgba(0,0,0,0.2)'}`,
                      backgroundColor: isSelected ? 'rgba(34,197,94,0.1)' : 'transparent'
                    }} />
                  )}
                  
                  {/* Plant icon */}
                  <div style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: plant.plantType.color,
                    border: `3px solid ${isSelected ? '#22c55e' : 'rgba(0,0,0,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: size * 0.5,
                    boxShadow: isSelected ? '0 0 0 3px rgba(34,197,94,0.3)' : '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {plant.plantType.icon}
                  </div>
                  
                  {/* Delete button */}
                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePlant(plant.id); }}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Scale indicator */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: cellSize * 5, height: 4, backgroundColor: '#666', borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: '#666' }}>5 feet</span>
          </div>
        </div>

        {/* Plant List */}
        <div style={{ width: 160, borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 8, borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 12 }}>
            Plant List ({placedPlants.length})
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {Object.entries(plantCounts).length === 0 ? (
              <div style={{ fontSize: 11, color: '#666', textAlign: 'center', padding: 20 }}>
                No plants yet.<br />Select a plant and click to place.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(plantCounts).map(([name, count]) => {
                  const plant = PLANT_PALETTE.find(p => p.name === name);
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 6, backgroundColor: '#f9fafb', borderRadius: 6, fontSize: 11 }}>
                      <span>{plant?.icon}</span>
                      <span style={{ flex: 1 }}>{name}</span>
                      <span style={{ fontWeight: 600, color: '#22c55e' }}>×{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Summary */}
          {placedPlants.length > 0 && (
            <div style={{ padding: 8, borderTop: '1px solid #e5e7eb', backgroundColor: '#f0fdf4', fontSize: 10 }}>
              <div><strong>Garden:</strong> {gardenWidth}' × {gardenHeight}'</div>
              <div><strong>Area:</strong> {gardenWidth * gardenHeight} sq ft</div>
              <div><strong>Plants:</strong> {placedPlants.length}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GardenLayoutPlanner;
