// PlantDetailModal.tsx - Reusable plant detail modal for Generator, Planner, and Search
// Place in: frontend/src/components/PlantDetailModal.tsx

import React, { useState } from 'react';
import { Plant } from '../config/plants';

interface PlantDetailModalProps {
  plant: Plant | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToGarden?: (plant: Plant, quantity: number) => void;
  showAddButton?: boolean;
}

// Month names for bloom display
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Pollinator icons
const POLLINATOR_ICONS: Record<string, string> = {
  'bees': '🐝',
  'honeybees': '🐝',
  'native bees': '🐝',
  'bumblebees': '🐝',
  'mason bees': '🐝',
  'leafcutter bees': '🐝',
  'butterflies': '🦋',
  'monarchs': '🦋',
  'painted ladies': '🦋',
  'swallowtails': '🦋',
  'hummingbirds': '🐦',
  'moths': '🦋',
  'sphinx moths': '🦋',
  'beetles': '🪲',
  'flies': '🪰',
  'wasps': '🐝',
};

// Water zone descriptions
const WATER_ZONES: Record<number, { name: string; description: string; color: string }> = {
  0: { name: 'No Irrigation', description: 'Survives on rainfall alone after establishment', color: '#ef4444' },
  1: { name: 'Very Low', description: 'Deep watering once monthly in summer', color: '#f97316' },
  2: { name: 'Low', description: 'Deep watering every 2-3 weeks in summer', color: '#eab308' },
  3: { name: 'Moderate', description: 'Weekly watering in summer', color: '#22c55e' },
  4: { name: 'Regular', description: 'Consistent moisture needed', color: '#3b82f6' },
};

export function PlantDetailModal({ 
  plant, 
  isOpen, 
  onClose, 
  onAddToGarden,
  showAddButton = false 
}: PlantDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  if (!isOpen || !plant) return null;

  const waterZone = WATER_ZONES[plant.localscapesZone];
  
  // Calculate pollinator value from nectar + pollen
  const pollinatorValue = Math.round((plant.nectarValue + plant.pollenValue) / 2);

  const handleAddToGarden = () => {
    if (onAddToGarden) {
      onAddToGarden(plant, quantity);
      setQuantity(1);
      onClose();
    }
  };

  // Get unique pollinators with icons
  const pollinatorDisplay = plant.attractsPollinators.map((p: string) => ({
    name: p,
    icon: POLLINATOR_ICONS[p.toLowerCase()] || '🌸',
  }));

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          <div 
            className="h-32 rounded-t-2xl flex items-center justify-center"
            style={{ backgroundColor: plant.color + '40' }}
          >
            <span className="text-6xl">{plant.icon}</span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            ✕
          </button>
          {plant.utahNative && (
            <span className="absolute top-3 left-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
              🌿 Utah Native
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{plant.commonName}</h2>
            <p className="text-gray-500 italic">{plant.scientificName}</p>
            <p className="text-sm text-gray-400">{plant.family}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">💧</div>
              <div className="text-xs text-gray-500">Water Zone</div>
              <div 
                className="font-bold text-sm"
                style={{ color: waterZone.color }}
              >
                {waterZone.name}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">☀️</div>
              <div className="text-xs text-gray-500">Sun Needs</div>
              <div className="font-bold text-sm text-gray-700 capitalize">
                {plant.sunNeeds.replace('-', ' ')}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📏</div>
              <div className="text-xs text-gray-500">Mature Size</div>
              <div className="font-bold text-sm text-gray-700">
                {plant.heightMax}' tall
              </div>
            </div>
          </div>

          {/* Bloom Calendar */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">🌸 Bloom Season</h3>
            <div className="flex gap-1">
              {MONTHS.map((month, i) => {
                const monthNum = i + 1;
                const isBlooming = plant.bloomMonths.includes(monthNum);
                return (
                  <div
                    key={month}
                    className={`flex-1 py-2 rounded text-center text-xs ${
                      isBlooming 
                        ? 'bg-pink-100 text-pink-700 font-medium' 
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {month}
                    {isBlooming && <div className="text-xs">🌸</div>}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-4">
              <span className="text-sm text-gray-600">
                <strong>Color:</strong> {plant.bloomColor}
              </span>
              {plant.reblooms && (
                <span className="text-sm text-pink-600">
                  <strong>🔄 Reblooms!</strong>
                </span>
              )}
            </div>
          </div>

          {/* Pollinators Attracted */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">🐝 Pollinators Attracted</h3>
            <div className="flex flex-wrap gap-2">
              {pollinatorDisplay.map((p: { name: string; icon: string }, i: number) => (
                <span 
                  key={i}
                  className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm"
                >
                  {p.icon} {p.name}
                </span>
              ))}
            </div>
            {plant.hostPlant && plant.hostPlant.length > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded-lg text-sm text-green-700">
                🐛 <strong>Host Plant for:</strong> {plant.hostPlant.join(', ')}
              </div>
            )}
          </div>

          {/* Habitat Value */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">🏆 Habitat Value</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${(pollinatorValue / 10) * 100}%` }}
                />
              </div>
              <span className="font-bold text-green-600">{pollinatorValue}/10</span>
            </div>
            <div className="mt-2 flex gap-4 text-sm text-gray-600">
              <span>🍯 Nectar: {'★'.repeat(Math.ceil(plant.nectarValue / 2))}</span>
              <span>🌾 Pollen: {'★'.repeat(Math.ceil(plant.pollenValue / 2))}</span>
            </div>
          </div>

          {/* Growing Info */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">🌱 Growing Requirements</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Soil:</strong> {plant.soilType.join(', ')}</li>
                <li><strong>USDA Zones:</strong> {plant.usdaZones.join(', ')}</li>
                <li><strong>Drought Tolerant:</strong> {plant.droughtTolerant ? '✅ Yes' : '❌ No'}</li>
                <li><strong>Deer Resistant:</strong> {plant.deerResistant ? '✅ Yes' : '❌ No'}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">🔧 Maintenance</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Level:</strong> {plant.maintenanceLevel}</li>
                <li><strong>Growth:</strong> {plant.growthRate}</li>
                <li><strong>Best For:</strong> {plant.landscapeUses.slice(0, 3).join(', ')}</li>
              </ul>
            </div>
          </div>

          {/* Companion Plants */}
          {plant.goodCompanions && plant.goodCompanions.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">🤝 Good Companions</h3>
              <p className="text-sm text-gray-600">{plant.goodCompanions.join(', ')}</p>
            </div>
          )}

          {/* Where to Buy */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">🛒 Where to Buy</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-500">Estimated Cost:</p>
                <p className="font-semibold text-gray-700">
                  ~${plant.estimatedCost}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Available At:</p>
                <div className="flex flex-wrap gap-1">
                  {plant.utahNurseries.slice(0, 3).map((nursery: string, i: number) => (
                    <span 
                      key={i}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                    >
                      {nursery}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Planting Tips */}
          {plant.notes && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-700 mb-1">💡 Planting Tips</h3>
              <p className="text-sm text-blue-600">{plant.notes}</p>
            </div>
          )}

          {/* Add to Garden Button */}
          {showAddButton && onAddToGarden && (
            <div className="border-t pt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToGarden}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
              >
                Add {quantity} to Garden
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlantDetailModal;
