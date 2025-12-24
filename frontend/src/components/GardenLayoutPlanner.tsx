// GardenLayoutPlanner.tsx - Interactive drag-drop garden planner
// Place in: frontend/src/components/GardenLayoutPlanner.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PLANTS, Plant, getPlantById } from '../config/plants';
import { useGarden, PlacedPlant, GardenZone, GardenLayout } from '../context/GardenContext';
import { PlantDetailModal } from './PlantDetailModal';

// Tool modes
type ToolMode = 'select' | 'plant' | 'zone' | 'path' | 'eraser';

// Sidebar panel states
type SidePanel = 'plants' | 'zones' | 'saved' | null;

// Grid constants
const GRID_SIZE = 10; // 10px per grid cell
const SCALE_FACTOR = 2; // 2px per foot

// Props interface
interface GardenLayoutPlannerProps {
  existingPlants?: string[];
}

export function GardenLayoutPlanner(props: GardenLayoutPlannerProps = {}) {
  const { existingPlants = [] } = props;
  // Context
  const { 
    currentLayout, 
    setCurrentLayout, 
    savedLayouts, 
    saveLayout, 
    deleteLayout,
    pendingGeneratedLayout,
    setPendingGeneratedLayout,
    navigateToPlanner,
    setNavigateToPlanner,
    convertGeneratedToPlanner
  } = useGarden();

  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);

  // Tool state
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [sidePanel, setSidePanel] = useState<SidePanel>('plants');
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Plant detail modal
  const [modalPlant, setModalPlant] = useState<Plant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Plant search
  const [plantSearch, setPlantSearch] = useState('');

  // Initialize with pending generated layout if coming from generator
  useEffect(() => {
    if (navigateToPlanner && pendingGeneratedLayout) {
      const layout = convertGeneratedToPlanner(pendingGeneratedLayout);
      setCurrentLayout(layout);
      setPendingGeneratedLayout(null);
      setNavigateToPlanner(false);
    }
  }, [navigateToPlanner, pendingGeneratedLayout, convertGeneratedToPlanner, setCurrentLayout, setPendingGeneratedLayout, setNavigateToPlanner]);

  // Create new blank layout
  const createNewLayout = useCallback(() => {
    const newLayout: GardenLayout = {
      id: `layout-${Date.now()}`,
      name: 'New Garden Layout',
      createdAt: new Date(),
      updatedAt: new Date(),
      dimensions: { width: 50, height: 40 },
      sunExposure: 'full',
      zones: [],
      placedPlants: [],
      generatedBy: 'manual',
    };
    setCurrentLayout(newLayout);
  }, [setCurrentLayout]);

  // Handle canvas click for placing plants
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentLayout || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolMode === 'plant' && selectedPlantId) {
      const plant = getPlantById(selectedPlantId);
      if (!plant) return;

      const newPlant: PlacedPlant = {
        id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        plantId: selectedPlantId,
        x: Math.round(x / GRID_SIZE) * GRID_SIZE,
        y: Math.round(y / GRID_SIZE) * GRID_SIZE,
        quantity: 1,
      };

      setCurrentLayout({
        ...currentLayout,
        placedPlants: [...currentLayout.placedPlants, newPlant],
        updatedAt: new Date(),
      });
    } else if (toolMode === 'eraser') {
      // Find and remove plant at click location
      const clickedPlant = currentLayout.placedPlants.find((p: PlacedPlant) => {
        const plant = getPlantById(p.plantId);
        if (!plant) return false;
        const size = Math.max(plant.widthMax * 12, 12) * SCALE_FACTOR / 2;
        return Math.abs(p.x - x) < size && Math.abs(p.y - y) < size;
      });

      if (clickedPlant) {
        setCurrentLayout({
          ...currentLayout,
          placedPlants: currentLayout.placedPlants.filter((p: PlacedPlant) => p.id !== clickedPlant.id),
          updatedAt: new Date(),
        });
      }
    }
  }, [currentLayout, toolMode, selectedPlantId, setCurrentLayout]);

  // Handle plant drag start
  const handlePlantDragStart = (e: React.MouseEvent, plantPlacement: PlacedPlant) => {
    if (toolMode !== 'select') return;
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setSelectedItemId(plantPlacement.id);
    setDragOffset({
      x: e.clientX - rect.left - plantPlacement.x,
      y: e.clientY - rect.top - plantPlacement.y,
    });
  };

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selectedItemId || !currentLayout || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.round((e.clientX - rect.left - dragOffset.x) / GRID_SIZE) * GRID_SIZE;
    const newY = Math.round((e.clientY - rect.top - dragOffset.y) / GRID_SIZE) * GRID_SIZE;

    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(newX, currentLayout.dimensions.width * SCALE_FACTOR));
    const clampedY = Math.max(0, Math.min(newY, currentLayout.dimensions.height * SCALE_FACTOR));

    setCurrentLayout({
      ...currentLayout,
      placedPlants: currentLayout.placedPlants.map((p: PlacedPlant) => 
        p.id === selectedItemId ? { ...p, x: clampedX, y: clampedY } : p
      ),
    });
  }, [isDragging, selectedItemId, currentLayout, dragOffset, setCurrentLayout]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDragging && currentLayout) {
      setIsDragging(false);
      // Auto-save after drag
      saveLayout(currentLayout);
    }
  }, [isDragging, currentLayout, saveLayout]);

  // Filter plants for sidebar
  const filteredPlants = PLANTS.filter((p: Plant) => 
    p.commonName.toLowerCase().includes(plantSearch.toLowerCase()) ||
    p.scientificName.toLowerCase().includes(plantSearch.toLowerCase())
  );

  // Plant categories for grouping
  const plantCategories = Array.from(new Set(PLANTS.map((p: Plant) => p.category)));

  return (
    <div className="flex h-full bg-gray-100">
      {/* Toolbar */}
      <div className="w-16 bg-gray-800 text-white flex flex-col items-center py-4 gap-2">
        <button
          onClick={() => setToolMode('select')}
          className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-colors ${
            toolMode === 'select' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Select & Move"
        >
          👆
        </button>
        <button
          onClick={() => { setToolMode('plant'); setSidePanel('plants'); }}
          className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-colors ${
            toolMode === 'plant' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Add Plant"
        >
          🌱
        </button>
        <button
          onClick={() => setToolMode('eraser')}
          className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-colors ${
            toolMode === 'eraser' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Eraser"
        >
          🗑️
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setSidePanel(sidePanel === 'saved' ? null : 'saved')}
          className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-colors ${
            sidePanel === 'saved' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Saved Layouts"
        >
          📁
        </button>
        <button
          onClick={createNewLayout}
          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-xl"
          title="New Layout"
        >
          ➕
        </button>
      </div>

      {/* Side Panel */}
      {sidePanel && (
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          {sidePanel === 'plants' && (
            <>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800 mb-2">🌱 Plants</h3>
                <input
                  type="text"
                  value={plantSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlantSearch(e.target.value)}
                  placeholder="Search plants..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {plantCategories.map((category: string) => {
                  const categoryPlants = filteredPlants.filter((p: Plant) => p.category === category);
                  if (categoryPlants.length === 0) return null;
                  return (
                    <div key={category} className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                        {category}
                      </h4>
                      {categoryPlants.slice(0, 8).map((plant: Plant) => (
                        <button
                          key={plant.id}
                          onClick={() => { 
                            setSelectedPlantId(plant.id); 
                            setToolMode('plant'); 
                          }}
                          onDoubleClick={() => {
                            setModalPlant(plant);
                            setIsModalOpen(true);
                          }}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                            selectedPlantId === plant.id 
                              ? 'bg-green-100 border border-green-400' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <span className="text-xl">{plant.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {plant.commonName}
                            </div>
                            <div className="text-xs text-gray-500">
                              💧{plant.localscapesZone} • {plant.bloomMonths[0]}-{plant.bloomMonths[plant.bloomMonths.length-1]}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
                💡 Click to select, double-click for details
              </div>
            </>
          )}

          {sidePanel === 'saved' && (
            <>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800">📁 Saved Layouts</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {savedLayouts.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-sm">No saved layouts yet</p>
                  </div>
                ) : (
                  savedLayouts.map((layout: GardenLayout) => (
                    <div
                      key={layout.id}
                      className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                        currentLayout?.id === layout.id
                          ? 'bg-green-100 border border-green-400'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setCurrentLayout(layout)}
                    >
                      <div className="font-medium text-gray-800 text-sm">{layout.name}</div>
                      <div className="text-xs text-gray-500 flex justify-between mt-1">
                        <span>{layout.placedPlants.length} plants</span>
                        <span>{layout.generatedBy === 'ai' ? '🤖 AI' : '✋ Manual'}</span>
                      </div>
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteLayout(layout.id); }}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div>
            {currentLayout ? (
              <input
                type="text"
                value={currentLayout.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentLayout({ ...currentLayout, name: e.target.value })}
                className="text-lg font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-500 focus:outline-none px-1"
              />
            ) : (
              <h2 className="text-lg font-semibold text-gray-400">No layout selected</h2>
            )}
            {currentLayout?.generatedBy === 'ai' && (
              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                🤖 AI Generated
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {currentLayout && (
              <>
                <button
                  onClick={() => saveLayout(currentLayout)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  💾 Save
                </button>
                <button
                  onClick={() => {
                    const data = JSON.stringify(currentLayout, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${currentLayout.name.replace(/\s+/g, '-')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
                >
                  📥 Export
                </button>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-8 bg-gray-200">
          {currentLayout ? (
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="relative bg-gradient-to-b from-green-100 to-green-200 rounded-xl shadow-lg border-4 border-green-300"
              style={{
                width: currentLayout.dimensions.width * SCALE_FACTOR,
                height: currentLayout.dimensions.height * SCALE_FACTOR,
                cursor: toolMode === 'plant' ? 'crosshair' : toolMode === 'eraser' ? 'not-allowed' : 'default',
              }}
            >
              {/* Grid overlay */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #000 1px, transparent 1px),
                    linear-gradient(to bottom, #000 1px, transparent 1px)
                  `,
                  backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                }}
              />

              {/* Zones */}
              {currentLayout.zones.map((zone: GardenZone) => (
                <div
                  key={zone.id}
                  className="absolute rounded-lg border-2 border-dashed flex items-center justify-center text-xs font-medium"
                  style={{
                    left: zone.x,
                    top: zone.y,
                    width: zone.width,
                    height: zone.height,
                    backgroundColor: zone.color + '60',
                    borderColor: zone.color,
                  }}
                >
                  {zone.name}
                </div>
              ))}

              {/* Placed Plants */}
              {currentLayout.placedPlants.map((placement: PlacedPlant) => {
                const plant = getPlantById(placement.plantId);
                if (!plant) return null;
                const size = Math.max(plant.widthMax * 12, 24) * SCALE_FACTOR / 2;
                const isSelected = selectedItemId === placement.id;
                
                return (
                  <div
                    key={placement.id}
                    onMouseDown={(e: React.MouseEvent) => handlePlantDragStart(e, placement)}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (toolMode === 'select') {
                        setSelectedItemId(placement.id);
                      }
                    }}
                    onDoubleClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setModalPlant(plant);
                      setIsModalOpen(true);
                    }}
                    className={`absolute flex items-center justify-center rounded-full cursor-move transition-all ${
                      isSelected ? 'ring-4 ring-blue-400 ring-offset-2 z-10' : 'hover:ring-2 hover:ring-green-400'
                    }`}
                    style={{
                      left: placement.x - size / 2,
                      top: placement.y - size / 2,
                      width: size,
                      height: size,
                      backgroundColor: plant.color + '80',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                    title={`${plant.commonName} - Double-click for details`}
                  >
                    <span style={{ fontSize: size * 0.5 }}>{plant.icon}</span>
                  </div>
                );
              })}

              {/* Scale indicator */}
              <div className="absolute bottom-2 right-2 bg-white/80 px-2 py-1 rounded text-xs text-gray-600">
                {currentLayout.dimensions.width}′ × {currentLayout.dimensions.height}′
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🌻</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Garden Layout
                </h3>
                <p className="text-gray-500 mb-4">
                  Create a new layout or load a saved one
                </p>
                <button
                  onClick={createNewLayout}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
                >
                  ➕ Create New Layout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        {currentLayout && (
          <div className="bg-white border-t px-4 py-2 flex items-center justify-between text-sm text-gray-600">
            <div className="flex gap-4">
              <span>🌱 {currentLayout.placedPlants.length} plants</span>
              <span>📐 {currentLayout.dimensions.width}′ × {currentLayout.dimensions.height}′</span>
              <span>☀️ {currentLayout.sunExposure} sun</span>
            </div>
            <div className="flex gap-4">
              {currentLayout.metrics && (
                <>
                  <span>🏆 Score: {currentLayout.metrics.habitatScore}</span>
                  <span>💧 {currentLayout.metrics.waterSavings}% water saved</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Plant Detail Modal */}
      <PlantDetailModal
        plant={modalPlant}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        showAddButton={true}
        onAddToGarden={(plant: Plant, qty: number) => {
          if (!currentLayout) return;
          // Add to center of visible canvas
          for (let i = 0; i < qty; i++) {
            const newPlant: PlacedPlant = {
              id: `plant-${Date.now()}-${i}`,
              plantId: plant.id,
              x: (currentLayout.dimensions.width * SCALE_FACTOR / 2) + (i * 20),
              y: currentLayout.dimensions.height * SCALE_FACTOR / 2,
              quantity: 1,
            };
            setCurrentLayout({
              ...currentLayout,
              placedPlants: [...currentLayout.placedPlants, newPlant],
            });
          }
        }}
      />
    </div>
  );
}

export default GardenLayoutPlanner;
