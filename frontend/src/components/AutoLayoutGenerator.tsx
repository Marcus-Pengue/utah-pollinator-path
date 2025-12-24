import React, { useState, useMemo } from 'react';
import { 
  PLANTS, 
  Plant, 
  getPlantsByWaterZone, 
  getPlantsByBloomMonth,
  getNativePlants,
  getHostPlants,
  getEarlySpringBloomers,
  getLateFallBloomers,
  calculateHabitatScore
} from '../config/plants';

interface LayoutConfig {
  width: number;
  height: number;
  sunExposure: 'full' | 'partial' | 'shade';
  optimizationMode: OptimizationMode;
  includeGathering: boolean;
  includePaths: boolean;
  maxLawnPercent: number;
}

type OptimizationMode = 
  | 'least-water'
  | 'most-points'
  | 'low-maintenance'
  | 'prettiest'
  | 'best-bees'
  | 'best-butterflies'
  | 'budget'
  | 'gap-filler';

interface PlacedPlant {
  plant: Plant;
  x: number;
  y: number;
  quantity: number;
}

interface GeneratedLayout {
  plants: PlacedPlant[];
  centralOpenShape: { x: number; y: number; width: number; height: number; material: string };
  gatheringAreas: { x: number; y: number; width: number; height: number }[];
  paths: { x1: number; y1: number; x2: number; y2: number }[];
  plantingBeds: { x: number; y: number; width: number; height: number }[];
  score: number;
  waterSavings: number;
  estimatedCost: number;
  bloomCoverage: number[];
}

const OPTIMIZATION_MODES: { id: OptimizationMode; name: string; icon: string; description: string }[] = [
  { id: 'least-water', name: 'Water Saver', icon: '💧', description: 'Minimizes water usage' },
  { id: 'most-points', name: 'Habitat Hero', icon: '🏆', description: 'Maximizes habitat score' },
  { id: 'low-maintenance', name: 'Easy Care', icon: '🛋️', description: 'Minimal maintenance needed' },
  { id: 'prettiest', name: 'Curb Appeal', icon: '🌈', description: 'Maximum color variety' },
  { id: 'best-bees', name: 'Bee Paradise', icon: '🐝', description: 'Optimized for native bees' },
  { id: 'best-butterflies', name: 'Butterfly Garden', icon: '🦋', description: 'Includes host plants' },
  { id: 'budget', name: 'Budget Friendly', icon: '💰', description: 'Lower cost options' },
  { id: 'gap-filler', name: 'Corridor Connector', icon: '🎯', description: 'Fills neighborhood gaps' },
];

export default function AutoLayoutGenerator() {
  const [config, setConfig] = useState<LayoutConfig>({
    width: 20,
    height: 30,
    sunExposure: 'full',
    optimizationMode: 'most-points',
    includeGathering: true,
    includePaths: true,
    maxLawnPercent: 35,
  });

  const [generatedLayout, setGeneratedLayout] = useState<GeneratedLayout | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Score plants based on optimization mode
  const scorePlant = (plant: Plant, mode: OptimizationMode, context: { colorsUsed: Set<string>; monthsCovered: Set<number> }): number => {
    switch (mode) {
      case 'least-water':
        const waterScore = { 'very-low': 100, 'low': 70, 'medium': 40, 'high': 10 }[plant.waterNeeds];
        return waterScore - (plant.gallonsPerWeek * 10);
      
      case 'most-points':
        const nectarScore = plant.nectarValue * 15;
        const pollenScore = plant.pollenValue * 15;
        const nativeBonus = plant.utahNative ? 25 : 0;
        const hostBonus = plant.hostPlant ? 20 : 0;
        return nectarScore + pollenScore + nativeBonus + hostBonus;
      
      case 'low-maintenance':
        const maintScore = { 'very-low': 100, 'low': 75, 'moderate': 40, 'high': 10 }[plant.maintenanceLevel];
        const nativeMaintBonus = plant.utahNative ? 20 : 0;
        return maintScore + nativeMaintBonus;
      
      case 'prettiest':
        const bloomLength = plant.bloomMonths.length * 8;
        const colorVariety = context.colorsUsed.has(plant.bloomColor) ? 0 : 30;
        const rebloomBonus = plant.reblooms ? 15 : 0;
        return bloomLength + colorVariety + rebloomBonus;
      
      case 'best-bees':
        const beeAttract = plant.attractsPollinators.includes('bees') ? 40 : 0;
        const beeNectar = plant.nectarValue * 12;
        const beePollen = plant.pollenValue * 12;
        const beeNative = plant.utahNative ? 20 : 0;
        return beeAttract + beeNectar + beePollen + beeNative;
      
      case 'best-butterflies':
        const butterflyAttract = plant.attractsPollinators.includes('butterflies') ? 30 : 0;
        const hostValue = plant.hostPlant ? plant.hostPlant.length * 20 : 0;
        const butterflyNectar = plant.nectarValue * 10;
        return butterflyAttract + hostValue + butterflyNectar;
      
      case 'budget':
        const costScore = Math.max(0, 50 - plant.estimatedCost * 2);
        const spreadBonus = plant.category === 'groundcover' ? 20 : 0;
        return costScore + spreadBonus;
      
      case 'gap-filler':
        // Prioritize early spring and late fall bloomers
        const earlySpring = plant.bloomMonths.some(m => m <= 4) ? 30 : 0;
        const lateFall = plant.bloomMonths.some(m => m >= 9) ? 30 : 0;
        const gapNative = plant.utahNative ? 25 : 0;
        const gapNectar = plant.nectarValue * 5;
        return earlySpring + lateFall + gapNative + gapNectar;
      
      default:
        return 50;
    }
  };

  // Filter plants by sun exposure
  const getCompatiblePlants = (): Plant[] => {
    return PLANTS.filter(plant => {
      if (config.sunExposure === 'full') {
        return plant.sunNeeds === 'full' || plant.sunNeeds === 'full-partial';
      } else if (config.sunExposure === 'partial') {
        return plant.sunNeeds !== 'shade';
      } else {
        return plant.sunNeeds === 'shade' || plant.sunNeeds === 'partial-shade' || plant.sunNeeds === 'partial';
      }
    });
  };

  // Generate the layout
  const generateLayout = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const compatiblePlants = getCompatiblePlants();
      const context = { colorsUsed: new Set<string>(), monthsCovered: new Set<number>() };
      
      // Score and sort plants
      const scoredPlants = compatiblePlants
        .map(plant => ({ plant, score: scorePlant(plant, config.optimizationMode, context) }))
        .sort((a, b) => b.score - a.score);
      
      // Calculate areas based on Localscapes principles
      const totalArea = config.width * config.height;
      const centralOpenArea = totalArea * (config.maxLawnPercent / 100);
      const gatheringArea = config.includeGathering ? totalArea * 0.15 : 0;
      const pathArea = config.includePaths ? totalArea * 0.05 : 0;
      const plantingArea = totalArea - centralOpenArea - gatheringArea - pathArea;
      
      // Create central open shape (Localscapes Step 1)
      const centralWidth = Math.sqrt(centralOpenArea * (config.width / config.height));
      const centralHeight = centralOpenArea / centralWidth;
      const centralOpenShape = {
        x: (config.width - centralWidth) / 2,
        y: (config.height - centralHeight) / 2,
        width: centralWidth,
        height: centralHeight,
        material: config.maxLawnPercent > 20 ? 'lawn' : 'creeping-thyme'
      };
      
      // Create gathering areas (Localscapes Step 2)
      const gatheringAreas: { x: number; y: number; width: number; height: number }[] = [];
      if (config.includeGathering) {
        gatheringAreas.push({
          x: 0,
          y: 0,
          width: Math.min(8, config.width * 0.4),
          height: Math.min(10, config.height * 0.33)
        });
      }
      
      // Create paths (Localscapes Step 4)
      const paths: { x1: number; y1: number; x2: number; y2: number }[] = [];
      if (config.includePaths) {
        // Main path from house to central area
        paths.push({
          x1: config.width / 2,
          y1: 0,
          x2: config.width / 2,
          y2: centralOpenShape.y
        });
      }
      
      // Select plants for planting beds
      const selectedPlants: PlacedPlant[] = [];
      const plantBudget = plantingArea;
      let usedArea = 0;
      
      // Ensure bloom coverage across seasons
      const ensureSeasonalCoverage = (plants: typeof scoredPlants) => {
        const result: typeof scoredPlants = [];
        
        // Must have early spring bloomer
        const earlySpring = plants.find(p => p.plant.bloomMonths.includes(3) || p.plant.bloomMonths.includes(4));
        if (earlySpring) result.push(earlySpring);
        
        // Must have late fall bloomer
        const lateFall = plants.find(p => p.plant.bloomMonths.includes(10) || p.plant.bloomMonths.includes(11));
        if (lateFall) result.push(lateFall);
        
        // Must have summer bloomer
        const summer = plants.find(p => p.plant.bloomMonths.includes(7));
        if (summer) result.push(summer);
        
        // Add remaining high scorers
        const remaining = plants.filter(p => !result.includes(p));
        return [...result, ...remaining];
      };
      
      const prioritizedPlants = ensureSeasonalCoverage(scoredPlants);
      
      for (const { plant } of prioritizedPlants) {
        if (usedArea >= plantBudget) break;
        
        const plantArea = plant.spacing * plant.spacing;
        const maxQuantity = Math.floor((plantBudget - usedArea) / plantArea);
        const quantity = Math.min(maxQuantity, plant.category === 'groundcover' ? 5 : 3);
        
        if (quantity > 0) {
          selectedPlants.push({
            plant,
            x: Math.random() * (config.width - plant.spacing),
            y: Math.random() * (config.height - plant.spacing),
            quantity
          });
          usedArea += plantArea * quantity;
          context.colorsUsed.add(plant.bloomColor);
          plant.bloomMonths.forEach(m => context.monthsCovered.add(m));
        }
      }
      
      // Calculate planting bed areas
      const plantingBeds = [
        { x: 0, y: centralOpenShape.y + centralOpenShape.height, width: config.width, height: config.height - (centralOpenShape.y + centralOpenShape.height) - 2 },
        { x: 0, y: 2, width: centralOpenShape.x - 1, height: config.height - 4 },
        { x: centralOpenShape.x + centralOpenShape.width + 1, y: 2, width: config.width - centralOpenShape.x - centralOpenShape.width - 1, height: config.height - 4 }
      ].filter(bed => bed.width > 0 && bed.height > 0);
      
      // Calculate metrics
      const plantIds = selectedPlants.map(sp => sp.plant.id);
      const score = calculateHabitatScore(plantIds);
      
      const waterSavings = Math.round(
        (1 - (config.maxLawnPercent / 100)) * 50 + 
        selectedPlants.reduce((sum, sp) => sum + (4 - sp.plant.localscapesZone) * 5, 0) / selectedPlants.length
      );
      
      const estimatedCost = selectedPlants.reduce(
        (sum, sp) => sum + sp.plant.estimatedCost * sp.quantity, 
        0
      );
      
      const bloomCoverage = Array.from({ length: 12 }, (_, i) => 
        selectedPlants.filter(sp => sp.plant.bloomMonths.includes(i + 1)).length
      );
      
      setGeneratedLayout({
        plants: selectedPlants,
        centralOpenShape,
        gatheringAreas,
        paths,
        plantingBeds,
        score,
        waterSavings,
        estimatedCost,
        bloomCoverage
      });
      
      setIsGenerating(false);
    }, 500);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🐝</span>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Smart Garden Generator</h2>
          <p className="text-gray-600">Localscapes-based pollinator habitat design</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Yard Dimensions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Yard Dimensions</h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm text-gray-600">Width (ft)</label>
              <input
                type="number"
                value={config.width}
                onChange={(e) => setConfig({ ...config, width: Number(e.target.value) })}
                className="w-24 px-3 py-2 border rounded-lg"
                min={10}
                max={100}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Depth (ft)</label>
              <input
                type="number"
                value={config.height}
                onChange={(e) => setConfig({ ...config, height: Number(e.target.value) })}
                className="w-24 px-3 py-2 border rounded-lg"
                min={10}
                max={100}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Sun Exposure</label>
            <select
              value={config.sunExposure}
              onChange={(e) => setConfig({ ...config, sunExposure: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="full">Full Sun (6+ hours)</option>
              <option value="partial">Partial Sun (3-6 hours)</option>
              <option value="shade">Shade (less than 3 hours)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Max Lawn: {config.maxLawnPercent}%
            </label>
            <input
              type="range"
              value={config.maxLawnPercent}
              onChange={(e) => setConfig({ ...config, maxLawnPercent: Number(e.target.value) })}
              className="w-full"
              min={0}
              max={35}
              step={5}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>No lawn</span>
              <span>Localscapes max (35%)</span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Localscapes Elements</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includeGathering}
              onChange={(e) => setConfig({ ...config, includeGathering: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Include Gathering Area (patio/seating)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includePaths}
              onChange={(e) => setConfig({ ...config, includePaths: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Include Paths (stepping stones)</span>
          </label>
        </div>
      </div>

      {/* Optimization Mode Selection */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">Choose Your Priority</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {OPTIMIZATION_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setConfig({ ...config, optimizationMode: mode.id })}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.optimizationMode === mode.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{mode.icon}</div>
              <div className="font-medium text-sm">{mode.name}</div>
              <div className="text-xs text-gray-500">{mode.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateLayout}
        disabled={isGenerating}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating...
          </span>
        ) : (
          '🌱 Generate My Garden'
        )}
      </button>

      {/* Generated Layout Results */}
      {generatedLayout && (
        <div className="mt-8 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{generatedLayout.score}</div>
              <div className="text-sm text-gray-600">Habitat Score</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{generatedLayout.waterSavings}%</div>
              <div className="text-sm text-gray-600">Water Savings</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">${generatedLayout.estimatedCost}</div>
              <div className="text-sm text-gray-600">Est. Plant Cost</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{generatedLayout.plants.length}</div>
              <div className="text-sm text-gray-600">Plant Species</div>
            </div>
          </div>

          {/* Bloom Calendar */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Bloom Coverage</h4>
            <div className="flex gap-1">
              {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((month, i) => (
                <div
                  key={month}
                  className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium ${
                    generatedLayout.bloomCoverage[i] > 0
                      ? generatedLayout.bloomCoverage[i] >= 3
                        ? 'bg-green-500 text-white'
                        : 'bg-green-300 text-green-900'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  title={`${generatedLayout.bloomCoverage[i]} plants blooming`}
                >
                  {month}
                </div>
              ))}
            </div>
          </div>

          {/* Plant List */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Recommended Plants</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {generatedLayout.plants.map(({ plant, quantity }) => (
                <div
                  key={plant.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-2xl">{plant.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{plant.commonName}</div>
                    <div className="text-xs text-gray-500">
                      {plant.utahNative && '🌿 Native • '}
                      Zone {plant.localscapesZone} • 
                      {plant.bloomMonths.length > 0 && ` Blooms ${plant.bloomMonths[0]}-${plant.bloomMonths[plant.bloomMonths.length - 1]}`}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700">×{quantity}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              📐 Edit in Planner
            </button>
            <button className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
              💰 Check Rebates
            </button>
            <button className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
              📋 Export List
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
