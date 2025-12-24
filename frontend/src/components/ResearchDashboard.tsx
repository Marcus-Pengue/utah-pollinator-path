import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BarChart3, Map, Download, Database, ArrowLeft, TrendingUp, Calendar, FileText } from 'lucide-react';

type Tab = 'analytics' | 'corridors' | 'phenology' | 'export';

interface TabConfig {
  id: Tab;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'analytics', name: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, description: 'Academic dashboard' },
  { id: 'corridors', name: 'Corridors', icon: <Map className="w-5 h-5" />, description: 'Network visualization' },
  { id: 'phenology', name: 'Phenology', icon: <Calendar className="w-5 h-5" />, description: 'Seasonal patterns' },
  { id: 'export', name: 'Data Export', icon: <Download className="w-5 h-5" />, description: 'Download datasets' },
];

const DATASETS = [
  { name: 'GBIF Observations (Wasatch Front)', records: '574,264', format: 'CSV, GeoJSON', size: '142 MB' },
  { name: 'Registered Gardens', records: '156', format: 'CSV, GeoJSON', size: '45 KB' },
  { name: 'Corridor Connections', records: '2,847', format: 'GeoJSON, GraphML', size: '8 MB' },
  { name: 'Species Occurrence Matrix', records: '2,847 × 156', format: 'CSV', size: '3 MB' },
  { name: 'Monthly Aggregates (2015-2025)', records: '120', format: 'CSV', size: '180 KB' },
];

const SPECIES_TRENDS = [
  { name: 'Western Monarch', trend: -34, status: 'Declining' },
  { name: 'Bumblebee spp.', trend: -12, status: 'Declining' },
  { name: 'Painted Lady', trend: +8, status: 'Stable' },
  { name: 'Hummingbirds', trend: +15, status: 'Increasing' },
  { name: 'Native Bees', trend: -5, status: 'Stable' },
];

export default function ResearchDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('analytics');

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Total Observations</div>
                <div className="text-2xl font-bold text-gray-900">574,264</div>
                <div className="text-xs text-green-600">+12,847 this year</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Species Documented</div>
                <div className="text-2xl font-bold text-gray-900">2,847</div>
                <div className="text-xs text-green-600">+34 new species</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Research Grade</div>
                <div className="text-2xl font-bold text-gray-900">67%</div>
                <div className="text-xs text-gray-500">of observations</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Date Range</div>
                <div className="text-2xl font-bold text-gray-900">25 yrs</div>
                <div className="text-xs text-gray-500">2000 - 2025</div>
              </div>
            </div>

            {/* Species Trends */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Species Population Trends (10-year)</h3>
              <div className="space-y-3">
                {SPECIES_TRENDS.map((species, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-800">{species.name}</div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        species.status === 'Declining' ? 'bg-red-100 text-red-700' :
                        species.status === 'Increasing' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {species.status}
                      </span>
                      <span className={`font-bold ${species.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {species.trend > 0 ? '+' : ''}{species.trend}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observation Density */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Observation Density by Taxonomic Class</h3>
              <div className="space-y-4">
                {[
                  { class: 'Insecta', count: 234567, pct: 41 },
                  { class: 'Plantae', count: 189234, pct: 33 },
                  { class: 'Aves', count: 89456, pct: 16 },
                  { class: 'Mammalia', count: 34567, pct: 6 },
                  { class: 'Other', count: 26440, pct: 4 },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{item.class}</span>
                      <span className="text-gray-500">{item.count.toLocaleString()} ({item.pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Biodiversity Index */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Biodiversity Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold">3.42</div>
                  <div className="text-purple-200">Shannon Index</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">0.89</div>
                  <div className="text-purple-200">Simpson's Diversity</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">847</div>
                  <div className="text-purple-200">Species Richness</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'corridors':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Corridor Network Analysis</h3>
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center mb-6">
                <div className="text-center">
                  <Map className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Network graph visualization</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">156</div>
                  <div className="text-sm text-gray-600">Nodes (Gardens)</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">847</div>
                  <div className="text-sm text-gray-600">Edges (Connections)</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">0.67</div>
                  <div className="text-sm text-gray-600">Clustering Coefficient</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">4.2</div>
                  <div className="text-sm text-gray-600">Avg Path Length</div>
                </div>
              </div>
            </div>

            {/* Connectivity Analysis */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Connectivity Analysis</h3>
              <p className="text-gray-600 mb-4">
                Graph-theoretic analysis of pollinator movement potential through the garden network.
              </p>
              <div className="space-y-3">
                {[
                  { metric: 'Network Diameter', value: '12.4 km', desc: 'Maximum shortest path between any two gardens' },
                  { metric: 'Betweenness Centrality', value: '0.34', desc: 'Avg. importance of gardens as corridor bridges' },
                  { metric: 'Component Count', value: '3', desc: 'Disconnected subnetworks identified' },
                  { metric: 'Critical Gaps', value: '7', desc: 'High-priority connection opportunities' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">{item.metric}</div>
                      <div className="text-sm text-gray-500">{item.desc}</div>
                    </div>
                    <div className="text-xl font-bold text-purple-600">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'phenology':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Phenology Analysis</h3>
              <p className="text-gray-600 mb-6">
                Explore seasonal patterns in pollinator activity and bloom timing across the Wasatch Front.
              </p>
              
              {/* Phenology charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Pollinator Activity by Month</h4>
                  <div className="flex gap-1 h-32 items-end">
                    {[5, 15, 35, 65, 85, 100, 95, 88, 60, 35, 15, 5].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-purple-500 rounded-t"
                          style={{ height: `${h}%` }}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">First/Last Observation Shift</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">First bee observation</span>
                      <span className="text-green-600 font-medium">8 days earlier</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last butterfly observation</span>
                      <span className="text-green-600 font-medium">12 days later</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Peak activity window</span>
                      <span className="text-amber-600 font-medium">Shifted 5 days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Findings */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Findings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="font-medium text-gray-800">Earlier Spring Activity</div>
                  <div className="text-sm text-gray-600">
                    First bee observations averaging 8 days earlier than 2015 baseline
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-amber-600 mb-2" />
                  <div className="font-medium text-gray-800">Extended Season</div>
                  <div className="text-sm text-gray-600">
                    Monarch migration window extended by 12 days over past decade
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <Database className="w-6 h-6 text-green-600 mb-2" />
                  <div className="font-medium text-gray-800">Gap Identified</div>
                  <div className="text-sm text-gray-600">
                    March bloom coverage at only 23% - critical early spring gap
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'export':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Data Export</h3>
              <p className="text-gray-600 mb-6">
                Download datasets for academic research. All data is CC-BY-NC licensed.
                Please cite: "BeehiveConnect Pollinator Database, 2025"
              </p>

              <div className="space-y-4">
                {DATASETS.map((dataset) => (
                  <div key={dataset.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <Database className="w-8 h-8 text-purple-500" />
                      <div>
                        <div className="font-medium text-gray-800">{dataset.name}</div>
                        <div className="text-sm text-gray-500">
                          {dataset.records} records • {dataset.format} • {dataset.size}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                        Preview
                      </button>
                      <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* API Access */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">API Access</h3>
              <p className="text-gray-600 mb-4">
                Programmatic access available for research institutions.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
                <div className="text-gray-500"># Example: Fetch observations for a bounding box</div>
                <div>curl "https://api.beehiveconnect.org/v1/observations" \</div>
                <div className="pl-4">-H "Authorization: Bearer YOUR_API_KEY" \</div>
                <div className="pl-4">-d "bbox=-112.1,40.5,-111.7,40.9" \</div>
                <div className="pl-4">-d "taxon=Insecta" \</div>
                <div className="pl-4">-d "format=geojson"</div>
              </div>
              <button className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200">
                Request API Key
              </button>
            </div>

            {/* Citation */}
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Citation</h3>
              <p className="text-purple-700 font-mono text-sm">
                BeehiveConnect. (2025). Wasatch Front Pollinator Observation Database [Data set]. 
                https://beehiveconnect.org/data
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                <span className="text-purple-600 font-medium">Research</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              574K observations • 2,847 species
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white border-r min-h-[calc(100vh-4rem)] hidden md:block">
          <div className="p-4 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-purple-600' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <div>
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs text-gray-400">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="p-4 border-t">
            <div className="text-xs font-medium text-gray-500 mb-3">DATABASE STATS</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Observations</span>
                <span className="font-medium">574,264</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Species</span>
                <span className="font-medium">2,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date Range</span>
                <span className="font-medium">2000-2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium">Dec 24, 2025</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
