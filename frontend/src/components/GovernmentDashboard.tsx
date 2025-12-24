import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Map, Target, FileText, DollarSign, ArrowLeft, TrendingUp, Download, BarChart3, Users, Droplets } from 'lucide-react';

type Tab = 'overview' | 'gaps' | 'corridors' | 'reports' | 'grants';

interface TabConfig {
  id: Tab;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'overview', name: 'Dashboard', icon: <Building2 className="w-5 h-5" />, description: 'City overview' },
  { id: 'gaps', name: 'Gap Analysis', icon: <Target className="w-5 h-5" />, description: 'Find priority zones' },
  { id: 'corridors', name: 'Corridors', icon: <Map className="w-5 h-5" />, description: 'Visualize connections' },
  { id: 'reports', name: 'Reports', icon: <FileText className="w-5 h-5" />, description: 'Generate documents' },
  { id: 'grants', name: 'Grants', icon: <DollarSign className="w-5 h-5" />, description: 'Application help' },
];

const CITY_STATS = [
  { city: 'Murray', gardens: 45, coverage: 23, score: 67, trend: '+8%' },
  { city: 'Salt Lake City', gardens: 89, coverage: 18, score: 54, trend: '+12%' },
  { city: 'Sandy', gardens: 34, coverage: 15, score: 48, trend: '+5%' },
  { city: 'West Valley', gardens: 28, coverage: 12, score: 41, trend: '+3%' },
  { city: 'Draper', gardens: 22, coverage: 19, score: 52, trend: '+7%' },
  { city: 'Taylorsville', gardens: 31, coverage: 14, score: 45, trend: '+4%' },
];

const PRIORITY_ZONES = [
  { id: 1, name: 'Murray Park Corridor', priority: 'High', gap: 'Early Spring Blooms', potential: 847 },
  { id: 2, name: 'Fashion Place Transit', priority: 'High', gap: 'Host Plants', potential: 623 },
  { id: 3, name: 'Wheeler Farm Buffer', priority: 'Medium', gap: 'Late Fall Nectar', potential: 512 },
  { id: 4, name: 'Jordan River Trail', priority: 'Medium', gap: 'Native Grasses', potential: 445 },
  { id: 5, name: 'Cottonwood Creek', priority: 'Low', gap: 'Shrub Layer', potential: 234 },
];

export default function GovernmentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedCity, setSelectedCity] = useState('Murray');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* City Selector */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Select Municipality</h3>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  {CITY_STATS.map(c => (
                    <option key={c.city} value={c.city}>{c.city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Registered Gardens</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">156</div>
                <div className="text-sm text-green-600">+12 this month</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Target className="w-5 h-5" />
                  <span className="text-sm font-medium">Corridor Coverage</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">23%</div>
                <div className="text-sm text-gray-500">of priority zones</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Species Observed</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">847</div>
                <div className="text-sm text-green-600">+34 since last year</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Rebates Distributed</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">$127K</div>
                <div className="text-sm text-gray-500">this fiscal year</div>
              </div>
            </div>

            {/* City Comparison */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">City Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">City</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Gardens</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Coverage</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Habitat Score</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CITY_STATS.map((city) => (
                      <tr key={city.city} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{city.city}</td>
                        <td className="py-3 px-4 text-right">{city.gardens}</td>
                        <td className="py-3 px-4 text-right">{city.coverage}%</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            city.score >= 60 ? 'bg-green-100 text-green-700' :
                            city.score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {city.score}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-green-600">{city.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('gaps')}
                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <Target className="w-6 h-6 text-amber-600 mb-2" />
                <div className="font-medium text-gray-800">Priority Zones</div>
                <div className="text-sm text-gray-500">Find high-impact areas</div>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <FileText className="w-6 h-6 text-blue-600 mb-2" />
                <div className="font-medium text-gray-800">Generate Report</div>
                <div className="text-sm text-gray-500">Council-ready docs</div>
              </button>
              <button
                onClick={() => setActiveTab('grants')}
                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <DollarSign className="w-6 h-6 text-green-600 mb-2" />
                <div className="font-medium text-gray-800">Grant Helper</div>
                <div className="text-sm text-gray-500">Application assistance</div>
              </button>
              <button className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left">
                <Download className="w-6 h-6 text-purple-600 mb-2" />
                <div className="font-medium text-gray-800">Export Data</div>
                <div className="text-sm text-gray-500">CSV, GeoJSON, PDF</div>
              </button>
            </div>

            {/* ROI Summary */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Estimated Annual ROI</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold">$2.4M</div>
                  <div className="text-amber-100">Water Savings</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">$890K</div>
                  <div className="text-amber-100">Stormwater Reduction</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">$340K</div>
                  <div className="text-amber-100">Ecosystem Services</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'gaps':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Corridor Gap Analysis</h3>
              <p className="text-gray-600 mb-6">
                Priority zones identified based on connectivity potential, existing habitat gaps, and community engagement opportunities.
              </p>
              
              {/* Priority Zones List */}
              <div className="space-y-4">
                {PRIORITY_ZONES.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        zone.priority === 'High' ? 'bg-red-500' :
                        zone.priority === 'Medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`} />
                      <div>
                        <div className="font-medium text-gray-800">{zone.name}</div>
                        <div className="text-sm text-gray-500">Gap: {zone.gap}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-600">{zone.potential}</div>
                      <div className="text-xs text-gray-500">potential score</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gap Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-xl p-4">
                <h4 className="font-medium text-red-800 mb-2">🌸 Early Spring Gap</h4>
                <p className="text-sm text-red-700">Only 23% of priority zones have March-April blooming plants</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <h4 className="font-medium text-amber-800 mb-2">🦋 Host Plant Gap</h4>
                <p className="text-sm text-amber-700">Milkweed coverage at 34% of recommended density</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2">🍂 Late Fall Gap</h4>
                <p className="text-sm text-blue-700">Oct-Nov nectar sources below threshold in 67% of zones</p>
              </div>
            </div>
          </div>
        );
      
      case 'corridors':
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Corridor Visualization</h3>
            <p className="text-gray-600 mb-6">
              Interactive map showing existing and potential pollinator corridors.
            </p>
            <div className="aspect-video bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Map className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-gray-600">Corridor map visualization</p>
                <p className="text-sm text-gray-500">Connecting 156 gardens across 6 cities</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">23</div>
                <div className="text-sm text-gray-600">Active Corridors</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">47</div>
                <div className="text-sm text-gray-600">Potential Links</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">89%</div>
                <div className="text-sm text-gray-600">Network Coverage</div>
              </div>
            </div>
          </div>
        );
      
      case 'reports':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Generator</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <button className="p-4 border-2 border-dashed rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-colors">
                  <BarChart3 className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <div className="font-medium">Monthly Summary</div>
                  <div className="text-sm text-gray-500">Quick stats overview</div>
                </button>
                <button className="p-4 border-2 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="font-medium">Council Presentation</div>
                  <div className="text-sm text-gray-500">Formal report with ROI</div>
                </button>
                <button className="p-4 border-2 border-dashed rounded-xl hover:border-green-400 hover:bg-green-50 transition-colors">
                  <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="font-medium">Priority Assessment</div>
                  <div className="text-sm text-gray-500">Zone-by-zone analysis</div>
                </button>
                <button className="p-4 border-2 border-dashed rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors">
                  <Droplets className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="font-medium">Water Impact Report</div>
                  <div className="text-sm text-gray-500">Conservation metrics</div>
                </button>
                <button className="p-4 border-2 border-dashed rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-colors">
                  <Users className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                  <div className="font-medium">Community Engagement</div>
                  <div className="text-sm text-gray-500">Participation stats</div>
                </button>
                <button className="p-4 border-2 border-dashed rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-colors">
                  <TrendingUp className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <div className="font-medium">Year-over-Year</div>
                  <div className="text-sm text-gray-500">Progress comparison</div>
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'grants':
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Grant Application Assistant</h3>
            <p className="text-gray-600 mb-6">
              Generate data-backed sections for common pollinator conservation grants.
            </p>
            <div className="space-y-4">
              {[
                { name: 'EPA Environmental Education Grants', deadline: 'Mar 15, 2025', amount: '$50K-$100K' },
                { name: 'NFWF Monarch Conservation Fund', deadline: 'Apr 1, 2025', amount: '$25K-$75K' },
                { name: 'USDA Urban Agriculture Grant', deadline: 'May 30, 2025', amount: '$100K-$500K' },
                { name: 'Xerces Society Habitat Grants', deadline: 'Rolling', amount: '$5K-$25K' },
              ].map((grant) => (
                <div key={grant.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-800">{grant.name}</div>
                    <div className="text-sm text-gray-500">Deadline: {grant.deadline} • {grant.amount}</div>
                  </div>
                  <button className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-medium hover:bg-amber-200">
                    Generate Section
                  </button>
                </div>
              ))}
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
                <span className="text-amber-600 font-medium">Government</span>
              </div>
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
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-amber-600' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <div>
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs text-gray-400">{tab.description}</div>
                </div>
              </button>
            ))}
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
