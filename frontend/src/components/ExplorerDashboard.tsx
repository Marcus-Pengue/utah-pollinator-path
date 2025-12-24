import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Camera, Search, Trophy, ArrowLeft, Calendar } from 'lucide-react';

// Only import DiscoveryMap which works standalone
import DiscoveryMap from './DiscoveryMap';

type Tab = 'map' | 'search' | 'capture' | 'leaderboard' | 'timeline';

interface TabConfig {
  id: Tab;
  name: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'map', name: 'Discovery Map', icon: <Map className="w-5 h-5" /> },
  { id: 'search', name: 'Species Search', icon: <Search className="w-5 h-5" /> },
  { id: 'capture', name: 'Capture', icon: <Camera className="w-5 h-5" /> },
  { id: 'timeline', name: 'Seasonal', icon: <Calendar className="w-5 h-5" /> },
  { id: 'leaderboard', name: 'Leaderboard', icon: <Trophy className="w-5 h-5" /> },
];

// Mock species data for search
const SPECIES_DATA = [
  { name: 'Western Monarch', scientific: 'Danaus plexippus', count: 234, icon: '🦋' },
  { name: 'Painted Lady', scientific: 'Vanessa cardui', count: 1847, icon: '🦋' },
  { name: 'Bumblebee', scientific: 'Bombus occidentalis', count: 3421, icon: '🐝' },
  { name: 'Black-chinned Hummingbird', scientific: 'Archilochus alexandri', count: 892, icon: '🐦' },
  { name: 'Showy Milkweed', scientific: 'Asclepias speciosa', count: 567, icon: '🌸' },
  { name: 'Sulfur Buckwheat', scientific: 'Eriogonum umbellatum', count: 2341, icon: '🌼' },
];

export default function ExplorerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSpecies = SPECIES_DATA.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.scientific.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'map':
        return (
          <div className="h-[calc(100vh-8rem)]">
            <DiscoveryMap />
          </div>
        );
      
      case 'search':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Species Search</h3>
              <input
                type="text"
                placeholder="Search species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg mb-6"
              />
              <div className="space-y-3">
                {filteredSpecies.map((species, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{species.icon}</span>
                      <div>
                        <div className="font-medium text-gray-800">{species.name}</div>
                        <div className="text-sm text-gray-500 italic">{species.scientific}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{species.count.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">observations</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'capture':
        return (
          <div className="max-w-2xl mx-auto p-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Capture Observation</h3>
              <div className="border-2 border-dashed rounded-xl p-12 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Take a photo of a plant or pollinator</p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  📷 Open Camera
                </button>
              </div>
              <div className="mt-6">
                <h4 className="font-medium text-gray-800 mb-3">Recent Captures</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">🖼️</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'leaderboard':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Community Leaderboard</h3>
              <div className="space-y-3">
                {[
                  { rank: 1, name: 'GardenGuru42', obs: 847, badge: '🥇' },
                  { rank: 2, name: 'PollinatorPal', obs: 623, badge: '🥈' },
                  { rank: 3, name: 'BeeWatcher', obs: 512, badge: '🥉' },
                  { rank: 4, name: 'NatureLover', obs: 445, badge: '' },
                  { rank: 5, name: 'WildflowerFan', obs: 398, badge: '' },
                  { rank: 12, name: 'You', obs: 23, badge: '⭐', highlight: true },
                ].map((user, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      user.highlight ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center font-bold text-gray-500">#{user.rank}</div>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{user.name} {user.badge}</div>
                        <div className="text-sm text-gray-500">{user.obs} observations</div>
                      </div>
                    </div>
                    {user.highlight && (
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">That's you!</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'timeline':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Seasonal Activity</h3>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { season: 'Spring', icon: '🌸', months: 'Mar-May', activity: 'High' },
                  { season: 'Summer', icon: '☀️', months: 'Jun-Aug', activity: 'Peak' },
                  { season: 'Fall', icon: '🍂', months: 'Sep-Nov', activity: 'Moderate' },
                  { season: 'Winter', icon: '❄️', months: 'Dec-Feb', activity: 'Low' },
                ].map((s, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="font-medium">{s.season}</div>
                    <div className="text-xs text-gray-500">{s.months}</div>
                    <div className={`text-xs mt-1 ${
                      s.activity === 'Peak' ? 'text-green-600' :
                      s.activity === 'High' ? 'text-blue-600' :
                      s.activity === 'Moderate' ? 'text-amber-600' :
                      'text-gray-400'
                    }`}>{s.activity}</div>
                  </div>
                ))}
              </div>
              <h4 className="font-medium text-gray-800 mb-3">Monthly Observations</h4>
              <div className="flex gap-1 h-32 items-end">
                {[12, 18, 45, 78, 92, 100, 95, 88, 65, 42, 25, 15].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐝</span>
                <span className="font-bold text-gray-900">BeehiveConnect</span>
                <span className="text-gray-400">|</span>
                <span className="text-blue-600 font-medium">Explorer</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              ))}
            </div>

            <div className="text-sm text-gray-500">
              574K+ observations
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-center ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div className="flex flex-col items-center">
                {tab.icon}
                <span className="text-xs mt-1">{tab.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className={activeTab === 'map' ? '' : 'pb-24 md:pb-6'}>
        {renderContent()}
      </main>
    </div>
  );
}
