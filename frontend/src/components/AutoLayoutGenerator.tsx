// AutoLayoutGenerator.tsx - AI-powered garden layout generator with Planner integration
// Place in: frontend/src/components/AutoLayoutGenerator.tsx

import React, { useState, useCallback } from 'react';
import { 
  PLANTS, 
  Plant, 
  getEarlySpringBloomers, 
  getLateFallBloomers, 
  calculateHabitatScore 
} from '../config/plants';
import { useGarden, GeneratedLayout } from '../context/GardenContext';
import { PlantDetailModal } from './PlantDetailModal';

// Types
interface OptimizationMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  scoringFn: (plant: Plant) => number;
}

interface LayoutConfig {
  width: number;
  height: number;
  sunExposure: 'full' | 'partial' | 'shade';
  maxLawnPercent: number;
  includeGatheringArea: boolean;
  includePaths: boolean;
}

interface GeneratedPlantSelection {
  plantId: string;
  quantity: number;
  score: number;
}

// Props interface
interface AutoLayoutGeneratorProps {
  defaultMode?: string;  // 'gap-filler', 'most-points', etc.
}

// Helper to get pollinator value
const getPollinatorValue = (p: Plant): number => {
  return Math.round((p.nectarValue + p.pollenValue) / 2);
};

// Optimization modes
const OPTIMIZATION_MODES: OptimizationMode[] = [
  {
    id: 'least-water',
    name: 'Water Saver',
    icon: '💧',
    description: 'Minimize irrigation needs with Localscapes zones 0-2',
    scoringFn: (p: Plant) => (5 - p.localscapesZone) * 20 + (p.droughtTolerant ? 30 : 0) + getPollinatorValue(p),
  },
  {
    id: 'most-points',
    name: 'Max Habitat',
    icon: '🏆',
    description: 'Maximize pollinator habitat score for conservation impact',
    scoringFn: (p: Plant) => getPollinatorValue(p) * 10 + (p.hostPlant ? 30 : 0) + (p.utahNative ? 20 : 0),
  },
  {
    id: 'low-maintenance',
    name: 'Easy Care',
    icon: '🌿',
    description: 'Plants that thrive with minimal attention',
    scoringFn: (p: Plant) => {
      const maintScore = p.maintenanceLevel === 'very-low' ? 60 : p.maintenanceLevel === 'low' ? 40 : p.maintenanceLevel === 'moderate' ? 20 : 0;
      return maintScore + (p.droughtTolerant ? 30 : 0) + (p.deerResistant ? 10 : 0);
    },
  },
  {
    id: 'prettiest',
    name: 'Showstopper',
    icon: '✨',
    description: 'Maximum visual impact with diverse colors and textures',
    scoringFn: (p: Plant) => {
      const seasonScore = p.bloomMonths.length * 8;
      return seasonScore + getPollinatorValue(p) * 2 + (p.reblooms ? 20 : 0);
    },
  },
  {
    id: 'best-bees',
    name: 'Bee Paradise',
    icon: '🐝',
    description: 'Native bees, honeybees, and bumblebees will thrive',
    scoringFn: (p: Plant) => {
      const beeTypes = ['bees', 'honeybees', 'native bees', 'bumblebees', 'mason bees', 'leafcutter bees'];
      const beeCount = p.attractsPollinators.filter((pol: string) => 
        beeTypes.some(bt => pol.toLowerCase().includes(bt.replace('bees', '').replace(' ', '')))
      ).length;
      return beeCount * 25 + p.nectarValue * 5 + p.pollenValue * 5 + (p.utahNative ? 15 : 0);
    },
  },
  {
    id: 'best-butterflies',
    name: 'Butterfly Garden',
    icon: '🦋',
    description: 'Attract monarchs, swallowtails, and painted ladies',
    scoringFn: (p: Plant) => {
      const butterflyTypes = ['butterflies', 'monarchs', 'swallowtails', 'painted ladies'];
      const bflyCount = p.attractsPollinators.filter((pol: string) => 
        butterflyTypes.some(bt => pol.toLowerCase().includes(bt.split(' ')[0]))
      ).length;
      return bflyCount * 25 + (p.hostPlant ? 50 : 0) + p.nectarValue * 5 + (p.utahNative ? 10 : 0);
    },
  },
  {
    id: 'budget',
    name: 'Budget Friendly',
    icon: '💰',
    description: 'Great habitat value without breaking the bank',
    scoringFn: (p: Plant) => {
      const costScore = Math.max(0, 100 - p.estimatedCost * 5);
      return costScore + getPollinatorValue(p) * 5 + (p.growthRate === 'fast' ? 20 : 0);
    },
  },
  {
    id: 'gap-filler',
    name: 'Bloom All Season',
    icon: '🌸',
    description: 'Continuous flowers from March through October',
    scoringFn: (p: Plant) => {
      let score = getPollinatorValue(p) * 5;
      const hasEarlyBloom = p.bloomMonths.some((m: number) => m <= 4);
      const hasLateBloom = p.bloomMonths.some((m: number) => m >= 9);
      if (hasEarlyBloom) score += 30;
      if (hasLateBloom) score += 30;
      if (p.bloomMonths.length >= 4) score += 20;
      return score;
    },
  },
];

// Month names
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Water zone labels
const WATER_ZONES = ['None', 'Very Low', 'Low', 'Moderate', 'Regular'];

export const AutoLayoutGenerator: React.FC<AutoLayoutGeneratorProps> = ({ defaultMode }) => {
  // Find initial mode based on prop
  const initialMode = defaultMode 
    ? OPTIMIZATION_MODES.find(m => m.id === defaultMode) || OPTIMIZATION_MODES[0]
    : OPTIMIZATION_MODES[0];

  // Garden context for integration
  const { setPendingGeneratedLayout, setNavigateToPlanner, convertGeneratedToPlanner, saveLayout } = useGarden();

  const [config, setConfig] = useState<LayoutConfig>({
    width: 40,
    height: 30,
    sunExposure: 'full',
    maxLawnPercent: 20,
    includeGatheringArea: true,
    includePaths: true,
  });

  // Selected mode
  const [selectedMode, setSelectedMode] = useState<OptimizationMode>(initialMode);

  // Generated layout
  const [generatedPlants, setGeneratedPlants] = useState<GeneratedPlantSelection[]>([]);
  const [metrics, setMetrics] = useState<{
    habitatScore: number;
    waterSavings: number;
    estimatedCost: number;
    speciesCount: number;
    bloomCoverage: boolean[];
  } | null>(null);

  // Loading state
  const [isGenerating, setIsGenerating] = useState(false);

  // Plant detail modal
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter plants by sun exposure
  const filterBySun = useCallback((plantList: Plant[]): Plant[] => {
    return plantList.filter((p: Plant) => {
      if (config.sunExposure === 'full') {
        return p.sunNeeds === 'full' || p.sunNeeds === 'full-partial';
      } else if (config.sunExposure === 'partial') {
        return p.sunNeeds !== 'full';
      } else {
        return p.sunNeeds === 'shade' || p.sunNeeds === 'partial-shade';
      }
    });
  }, [config.sunExposure]);

  // Generate layout
  const generateLayout = useCallback(() => {
    console.log("Generate clicked, config:", config, "mode:", selectedMode.id);
    setIsGenerating(true);

    // Simulate AI processing delay
    setTimeout(() => {
      // Calculate planting area (excluding lawn)
      const totalArea = config.width * config.height;
      const lawnArea = totalArea * (config.maxLawnPercent / 100);
      const plantableArea = totalArea - lawnArea;

      // Target number of plants based on area (roughly 1 plant per 4 sq ft)
      const targetPlantCount = Math.floor(plantableArea / 4);

      // Score and sort all eligible plants
      const eligiblePlants = filterBySun(PLANTS);
      const scoredPlants = eligiblePlants.map((p: Plant) => ({
        plant: p,
        score: selectedMode.scoringFn(p),
      })).sort((a, b) => b.score - a.score);

      // Ensure seasonal coverage
      const earlySpring = filterBySun(getEarlySpringBloomers());
      const lateFall = filterBySun(getLateFallBloomers());

      // Select plants with diversity constraints
      const selected: GeneratedPlantSelection[] = [];
      const usedCategories = new Set<string>();
      const usedFamilies = new Set<string>();

      // Always include at least one early spring and one late fall bloomer
      if (earlySpring.length > 0) {
        const best = earlySpring.sort((a, b) => selectedMode.scoringFn(b) - selectedMode.scoringFn(a))[0];
        selected.push({ plantId: best.id, quantity: 3, score: selectedMode.scoringFn(best) });
        usedCategories.add(best.category);
        usedFamilies.add(best.family);
      }

      if (lateFall.length > 0) {
        const best = lateFall.sort((a, b) => selectedMode.scoringFn(b) - selectedMode.scoringFn(a))[0];
        if (!selected.find(s => s.plantId === best.id)) {
          selected.push({ plantId: best.id, quantity: 3, score: selectedMode.scoringFn(best) });
          usedCategories.add(best.category);
          usedFamilies.add(best.family);
        }
      }

      // Fill remaining slots with top-scored plants, ensuring diversity
      for (const { plant, score } of scoredPlants) {
        if (selected.length >= 15) break; // Max 15 species
        if (selected.find(s => s.plantId === plant.id)) continue;

        // Limit plants per family for diversity
        const familyCount = selected.filter(s => {
          const p = PLANTS.find((pl: Plant) => pl.id === s.plantId);
          return p?.family === plant.family;
        }).length;
        if (familyCount >= 2) continue;

        // Calculate quantity based on spread and size
        let qty = 3;
        if (plant.widthMax > 3) qty = 2;
        if (plant.growthRate === 'fast') qty = 2;
        if (plant.category === 'shrub') qty = 2;
        if (plant.category === 'groundcover') qty = 5;

        selected.push({ plantId: plant.id, quantity: qty, score });
        usedCategories.add(plant.category);
        usedFamilies.add(plant.family);
      }

      // Calculate metrics
      const selectedPlantObjects = selected.map(s => ({
        ...s,
        plant: PLANTS.find((p: Plant) => p.id === s.plantId)!,
      }));

      // Habitat score - pass plant IDs
      const habitatScore = calculateHabitatScore(selectedPlantObjects.map(s => s.plant.id));

      // Water savings (compared to lawn)
      const avgWaterZone = selectedPlantObjects.reduce((sum, s) => sum + s.plant.localscapesZone * s.quantity, 0) /
        selectedPlantObjects.reduce((sum, s) => sum + s.quantity, 0);
      const waterSavings = Math.round((1 - avgWaterZone / 4) * (1 - config.maxLawnPercent / 100) * 100);

      // Estimated cost
      const estimatedCost = selectedPlantObjects.reduce((sum, s) => {
        return sum + s.plant.estimatedCost * s.quantity;
      }, 0);

      // Bloom coverage by month
      const bloomCoverage = Array(12).fill(false);
      selectedPlantObjects.forEach(({ plant }) => {
        plant.bloomMonths.forEach((m: number) => {
          bloomCoverage[m - 1] = true;
        });
      });

      setGeneratedPlants(selected);
      setMetrics({
        habitatScore,
        waterSavings,
        estimatedCost: Math.round(estimatedCost),
        speciesCount: selected.length,
        bloomCoverage,
      });

      setIsGenerating(false);
    }, 1500);
  }, [config, selectedMode, filterBySun]);

  // Handle "Edit in Planner" - converts and navigates
  const handleEditInPlanner = useCallback(() => {
    if (!metrics) return;

    const generatedLayout: GeneratedLayout = {
      plants: generatedPlants.map(gp => ({
        plantId: gp.plantId,
        quantity: gp.quantity,
      })),
      optimizationMode: selectedMode.name,
      dimensions: { width: config.width, height: config.height },
      sunExposure: config.sunExposure,
      metrics,
    };

    // Convert to planner format and save
    const plannerLayout = convertGeneratedToPlanner(generatedLayout);
    saveLayout(plannerLayout);

    // Set navigation flag (parent component should react to this)
    setPendingGeneratedLayout(generatedLayout);
    setNavigateToPlanner(true);
  }, [generatedPlants, metrics, selectedMode, config, convertGeneratedToPlanner, saveLayout, setPendingGeneratedLayout, setNavigateToPlanner]);

  // Export plant list
  const handleExportList = useCallback(() => {
    const plantList = generatedPlants.map(gp => {
      const plant = PLANTS.find((p: Plant) => p.id === gp.plantId)!;
      return `${plant.commonName} (${plant.scientificName}) - Qty: ${gp.quantity}`;
    }).join('\n');

    const blob = new Blob([`Pollinator Garden Plant List\n${'='.repeat(40)}\n\n${plantList}\n\nTotal Species: ${generatedPlants.length}\nEstimated Cost: $${metrics?.estimatedCost || 0}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pollinator-garden-plants.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedPlants, metrics]);

  // Open plant detail modal
  const handlePlantClick = (plantId: string) => {
    const plant = PLANTS.find((p: Plant) => p.id === plantId);
    if (plant) {
      setSelectedPlant(plant);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">🌻</span>
          AI Garden Layout Generator
        </h2>
        <p className="text-green-100 mt-1">
          Create an optimized pollinator garden based on your goals
        </p>
      </div>

      <div className="p-6">
        {/* Configuration */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Left: Yard Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <span>📐</span> Yard Configuration
            </h3>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Width (ft)</label>
                <input
                  type="number"
                  value={config.width}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, width: parseInt(e.target.value) || 20 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  min={10}
                  max={200}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Depth (ft)</label>
                <input
                  type="number"
                  value={config.height}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, height: parseInt(e.target.value) || 20 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  min={10}
                  max={200}
                />
              </div>
            </div>

            {/* Sun Exposure */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sun Exposure</label>
              <div className="flex gap-2">
                {(['full', 'partial', 'shade'] as const).map(sun => (
                  <button
                    key={sun}
                    onClick={() => setConfig({ ...config, sunExposure: sun })}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      config.sunExposure === sun
                        ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {sun === 'full' && '☀️ Full Sun'}
                    {sun === 'partial' && '⛅ Partial'}
                    {sun === 'shade' && '🌳 Shade'}
                  </button>
                ))}
              </div>
            </div>

            {/* Lawn Percentage */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Max Lawn Area: {config.maxLawnPercent}%
              </label>
              <input
                type="range"
                value={config.maxLawnPercent}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, maxLawnPercent: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                min={0}
                max={35}
                step={5}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0% (No Lawn)</span>
                <span>35% (Max)</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeGatheringArea}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, includeGatheringArea: e.target.checked })}
                  className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-600">Include patio/gathering area</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includePaths}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, includePaths: e.target.checked })}
                  className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-600">Include paths</span>
              </label>
            </div>
          </div>

          {/* Right: Optimization Mode */}
          <div>
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <span>🎯</span> Optimization Goal
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {OPTIMIZATION_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedMode.id === mode.id
                      ? 'bg-green-50 border-green-500 ring-2 ring-green-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{mode.icon}</span>
                    <span className="font-medium text-gray-800">{mode.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateLayout}
          disabled={isGenerating}
          className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating Optimal Layout...
            </>
          ) : (
            <>
              <span className="text-xl">✨</span>
              Generate {selectedMode.name} Layout
            </>
          )}
        </button>

        {/* Results */}
        {metrics && generatedPlants.length > 0 && (
          <div className="mt-8 space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{metrics.habitatScore}</div>
                <div className="text-sm text-gray-600">Habitat Score</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{metrics.waterSavings}%</div>
                <div className="text-sm text-gray-600">Water Savings</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">${metrics.estimatedCost}</div>
                <div className="text-sm text-gray-600">Est. Cost</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{metrics.speciesCount}</div>
                <div className="text-sm text-gray-600">Plant Species</div>
              </div>
            </div>

            {/* Bloom Calendar */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">🌸 Bloom Coverage</h4>
              <div className="flex gap-1">
                {MONTHS.map((month, i) => (
                  <div
                    key={month}
                    className={`flex-1 py-2 rounded text-center text-xs font-medium ${
                      metrics.bloomCoverage[i]
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {month}
                    {metrics.bloomCoverage[i] && <div>🌸</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Plant List */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">🌱 Recommended Plants</h4>
              <div className="space-y-2">
                {generatedPlants.map(gp => {
                  const plant = PLANTS.find((p: Plant) => p.id === gp.plantId)!;
                  return (
                    <button
                      key={gp.plantId}
                      onClick={() => handlePlantClick(gp.plantId)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                    >
                      <span className="text-2xl">{plant.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 flex items-center gap-2">
                          {plant.commonName}
                          {plant.utahNative && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Native</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{plant.scientificName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">×{gp.quantity}</div>
                        <div className="text-xs text-gray-400">
                          💧 {WATER_ZONES[plant.localscapesZone]}
                        </div>
                      </div>
                      <div className="text-gray-300">
                        →
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button
                onClick={handleEditInPlanner}
                className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>✏️</span> Edit in Planner
              </button>
              <button
                onClick={() => window.open('https://conservationgardenpark.org/rebates', '_blank')}
                className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>💵</span> Check Rebates
              </button>
              <button
                onClick={handleExportList}
                className="flex-1 py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>📋</span> Export List
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plant Detail Modal */}
      <PlantDetailModal
        plant={selectedPlant}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        showAddButton={false}
      />
    </div>
  );
}

export default AutoLayoutGenerator;
