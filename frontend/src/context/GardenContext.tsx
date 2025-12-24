// GardenContext.tsx - Shared state for garden layouts between components
// Place in: frontend/src/context/GardenContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PLANTS, Plant, getPlantById } from '../config/plants';

// Types for placed plants in the planner
export interface PlacedPlant {
  id: string;
  plantId: string;
  x: number;
  y: number;
  quantity: number;
}

// Types for garden zones/beds
export interface GardenZone {
  id: string;
  name: string;
  type: 'lawn' | 'planting-bed' | 'gathering' | 'path' | 'open-space';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

// The full garden layout
export interface GardenLayout {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  dimensions: { width: number; height: number };
  sunExposure: 'full' | 'partial' | 'shade';
  zones: GardenZone[];
  placedPlants: PlacedPlant[];
  generatedBy?: 'ai' | 'manual';
  optimizationMode?: string;
  metrics?: {
    habitatScore: number;
    waterSavings: number;
    estimatedCost: number;
    speciesCount: number;
    bloomCoverage: boolean[];
  };
}

// Generated layout from AI (simpler format before placement)
export interface GeneratedLayoutPlant {
  plantId: string;
  quantity: number;
  zone?: string;
}

export interface GeneratedLayout {
  plants: GeneratedLayoutPlant[];
  optimizationMode: string;
  dimensions: { width: number; height: number };
  sunExposure: 'full' | 'partial' | 'shade';
  metrics: {
    habitatScore: number;
    waterSavings: number;
    estimatedCost: number;
    speciesCount: number;
    bloomCoverage: boolean[];
  };
}

// Context type
interface GardenContextType {
  // Current layout being edited
  currentLayout: GardenLayout | null;
  setCurrentLayout: (layout: GardenLayout | null) => void;
  
  // Pending layout from generator (waiting to be edited in planner)
  pendingGeneratedLayout: GeneratedLayout | null;
  setPendingGeneratedLayout: (layout: GeneratedLayout | null) => void;
  
  // Saved layouts
  savedLayouts: GardenLayout[];
  saveLayout: (layout: GardenLayout) => void;
  deleteLayout: (id: string) => void;
  loadLayout: (id: string) => void;
  
  // Convert generated layout to full layout for planner
  convertGeneratedToPlanner: (generated: GeneratedLayout, name?: string) => GardenLayout;
  
  // Quick navigation
  navigateToPlanner: boolean;
  setNavigateToPlanner: (navigate: boolean) => void;
}

const GardenContext = createContext<GardenContextType | null>(null);

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Local storage key
const STORAGE_KEY = 'pollinator-garden-layouts';

export function GardenProvider({ children }: { children: ReactNode }) {
  const [currentLayout, setCurrentLayout] = useState<GardenLayout | null>(null);
  const [pendingGeneratedLayout, setPendingGeneratedLayout] = useState<GeneratedLayout | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<GardenLayout[]>([]);
  const [navigateToPlanner, setNavigateToPlanner] = useState(false);

  // Load saved layouts from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const layouts = parsed.map((l: any) => ({
          ...l,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        }));
        setSavedLayouts(layouts);
      }
    } catch (e) {
      console.error('Failed to load saved layouts:', e);
    }
  }, []);

  // Save to localStorage whenever savedLayouts changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayouts));
    } catch (e) {
      console.error('Failed to save layouts:', e);
    }
  }, [savedLayouts]);

  // Save a layout
  const saveLayout = (layout: GardenLayout) => {
    const updated = {
      ...layout,
      updatedAt: new Date(),
    };
    setSavedLayouts(prev => {
      const existing = prev.findIndex(l => l.id === layout.id);
      if (existing >= 0) {
        const newLayouts = [...prev];
        newLayouts[existing] = updated;
        return newLayouts;
      }
      return [...prev, updated];
    });
    setCurrentLayout(updated);
  };

  // Delete a layout
  const deleteLayout = (id: string) => {
    setSavedLayouts(prev => prev.filter(l => l.id !== id));
    if (currentLayout?.id === id) {
      setCurrentLayout(null);
    }
  };

  // Load a layout for editing
  const loadLayout = (id: string) => {
    const layout = savedLayouts.find(l => l.id === id);
    if (layout) {
      setCurrentLayout(layout);
    }
  };

  // Convert generated layout to full planner layout
  const convertGeneratedToPlanner = (generated: GeneratedLayout, name?: string): GardenLayout => {
    const { width, height } = generated.dimensions;
    
    // Create default zones based on Localscapes principles
    const zones: GardenZone[] = [
      // Central open space (activity zone)
      {
        id: generateId(),
        name: 'Activity Zone',
        type: 'open-space',
        x: width * 0.3,
        y: height * 0.3,
        width: width * 0.4,
        height: height * 0.4,
        color: '#e8f5e9',
      },
      // Planting beds around perimeter
      {
        id: generateId(),
        name: 'Front Bed',
        type: 'planting-bed',
        x: 0,
        y: 0,
        width: width,
        height: height * 0.2,
        color: '#a5d6a7',
      },
      {
        id: generateId(),
        name: 'Back Bed',
        type: 'planting-bed',
        x: 0,
        y: height * 0.8,
        width: width,
        height: height * 0.2,
        color: '#a5d6a7',
      },
      {
        id: generateId(),
        name: 'Left Bed',
        type: 'planting-bed',
        x: 0,
        y: height * 0.2,
        width: width * 0.2,
        height: height * 0.6,
        color: '#81c784',
      },
      {
        id: generateId(),
        name: 'Right Bed',
        type: 'planting-bed',
        x: width * 0.8,
        y: height * 0.2,
        width: width * 0.2,
        height: height * 0.6,
        color: '#81c784',
      },
    ];

    // Place plants in beds with smart positioning
    const placedPlants: PlacedPlant[] = [];
    const plantingBeds = zones.filter(z => z.type === 'planting-bed');
    
    let bedIndex = 0;
    generated.plants.forEach((genPlant) => {
      const plant = getPlantById(genPlant.plantId);
      if (!plant) return;

      // Cycle through planting beds
      const bed = plantingBeds[bedIndex % plantingBeds.length];
      bedIndex++;

      // Calculate position within bed (spread out based on quantity)
      for (let q = 0; q < genPlant.quantity; q++) {
        const offsetX = (q % 3) * (bed.width / 3) + bed.width / 6;
        const offsetY = Math.floor(q / 3) * (bed.height / 2) + bed.height / 4;
        
        placedPlants.push({
          id: generateId(),
          plantId: genPlant.plantId,
          x: bed.x + offsetX,
          y: bed.y + offsetY,
          quantity: 1,
        });
      }
    });

    return {
      id: generateId(),
      name: name || `AI Generated Layout (${generated.optimizationMode})`,
      createdAt: new Date(),
      updatedAt: new Date(),
      dimensions: generated.dimensions,
      sunExposure: generated.sunExposure,
      zones,
      placedPlants,
      generatedBy: 'ai',
      optimizationMode: generated.optimizationMode,
      metrics: generated.metrics,
    };
  };

  return (
    <GardenContext.Provider
      value={{
        currentLayout,
        setCurrentLayout,
        pendingGeneratedLayout,
        setPendingGeneratedLayout,
        savedLayouts,
        saveLayout,
        deleteLayout,
        loadLayout,
        convertGeneratedToPlanner,
        navigateToPlanner,
        setNavigateToPlanner,
      }}
    >
      {children}
    </GardenContext.Provider>
  );
}

// Hook to use garden context
export function useGarden() {
  const context = useContext(GardenContext);
  if (!context) {
    throw new Error('useGarden must be used within a GardenProvider');
  }
  return context;
}

export default GardenContext;
