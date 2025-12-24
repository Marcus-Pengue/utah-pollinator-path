import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Map, Building2, GraduationCap, Leaf, Users, TrendingUp, Droplets, ChevronRight, Sparkles } from 'lucide-react';

interface ModeCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  features: string[];
  route: string;
}

const MODES: ModeCard[] = [
  {
    id: 'homeowner',
    title: 'Homeowner',
    subtitle: 'Transform Your Yard',
    description: 'Design a water-wise pollinator garden, track your plants, find rebates, and connect with neighbors.',
    icon: <Home className="w-8 h-8" />,
    color: 'text-green-600',
    bgGradient: 'from-green-500 to-emerald-600',
    features: [
      'AI Garden Layout Generator',
      'Drag-and-Drop Planner',
      'Rebate Finder ($2,000+ available)',
      'Bloom Tracker',
      'Smart Irrigation Sync',
      'Neighbor Challenges'
    ],
    route: '/homeowner'
  },
  {
    id: 'explorer',
    title: 'Explorer',
    subtitle: 'Discover Wildlife',
    description: 'Explore 500,000+ observations, contribute sightings, and see what species live in your area.',
    icon: <Map className="w-8 h-8" />,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500 to-indigo-600',
    features: [
      'Interactive Species Map',
      '574K+ Observations',
      'Photo Capture & Upload',
      'Species Identification',
      'Seasonal Trends',
      'Community Leaderboard'
    ],
    route: '/explorer'
  },
  {
    id: 'government',
    title: 'Government',
    subtitle: 'Plan & Prioritize',
    description: 'Identify priority zones, analyze corridor gaps, generate reports, and track city-wide progress.',
    icon: <Building2 className="w-8 h-8" />,
    color: 'text-amber-600',
    bgGradient: 'from-amber-500 to-orange-600',
    features: [
      'Priority Zone Analysis',
      'Corridor Gap Mapping',
      'Cost-Benefit Reports',
      'Grant Application Generator',
      'Multi-City Comparison',
      'ROI Calculator'
    ],
    route: '/government'
  },
  {
    id: 'research',
    title: 'Research',
    subtitle: 'Analyze Data',
    description: 'Access academic analytics, export datasets, visualize corridors, and track conservation metrics.',
    icon: <GraduationCap className="w-8 h-8" />,
    color: 'text-purple-600',
    bgGradient: 'from-purple-500 to-violet-600',
    features: [
      'Academic Analytics Dashboard',
      'Species Trend Analysis',
      'Corridor Visualization',
      'Data Export (CSV/GeoJSON)',
      'Phenology Charts',
      'Biodiversity Metrics'
    ],
    route: '/research'
  }
];

const STATS = [
  { label: 'Observations', value: '574K+', icon: <Leaf className="w-5 h-5" /> },
  { label: 'Species Tracked', value: '2,847', icon: <Sparkles className="w-5 h-5" /> },
  { label: 'Gardens Registered', value: '156', icon: <Home className="w-5 h-5" /> },
  { label: 'Water Saved (gal/yr)', value: '2.4M', icon: <Droplets className="w-5 h-5" /> },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          {/* Logo & Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-4xl">🐝</span>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-3">
              BeehiveConnect
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Building pollinator corridors through community gardens across Utah's Wasatch Front
            </p>
            <p className="text-sm text-amber-600 font-medium mt-2">
              🌿 Connecting Utah's Pollinators, One Garden at a Time
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-8 mb-16">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm">
                <span className="text-green-600">{stat.icon}</span>
                <span className="font-bold text-gray-900">{stat.value}</span>
                <span className="text-gray-500 text-sm">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Mode Selection */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Choose Your Path</h2>
            <p className="text-gray-600">Select how you'd like to contribute to Utah's pollinator network</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => navigate(mode.route)}
                onMouseEnter={() => setHoveredMode(mode.id)}
                onMouseLeave={() => setHoveredMode(null)}
                className={`relative group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-left ${
                  hoveredMode === mode.id ? 'scale-105 -translate-y-1' : ''
                }`}
              >
                {/* Gradient Header */}
                <div className={`bg-gradient-to-r ${mode.bgGradient} p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    {mode.icon}
                    <ChevronRight className={`w-5 h-5 transition-transform ${hoveredMode === mode.id ? 'translate-x-1' : ''}`} />
                  </div>
                  <h3 className="text-2xl font-bold mt-3">{mode.title}</h3>
                  <p className="text-white/80 text-sm">{mode.subtitle}</p>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4">{mode.description}</p>
                  
                  <div className="space-y-2">
                    {mode.features.slice(0, 4).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${mode.bgGradient}`} />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {mode.features.length > 4 && (
                      <div className="text-xs text-gray-400 pl-3.5">
                        +{mode.features.length - 4} more features
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover Effect Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-r ${mode.bgGradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Why BeehiveConnect Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why BeehiveConnect?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Utah's pollinators face habitat fragmentation. By connecting gardens into corridors, 
              we create pathways for bees, butterflies, and hummingbirds to thrive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Droplets className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Save Water</h3>
              <p className="text-gray-600">
                Native plants use 50-75% less water than traditional lawns. 
                Access $2,000+ in rebates for water-wise landscaping.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Communities</h3>
              <p className="text-gray-600">
                Join neighbors in creating habitat corridors. Track your neighborhood's 
                progress and compete on the leaderboard.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Impact</h3>
              <p className="text-gray-600">
                See real-time data on species recovery. Your garden contributes to 
                city-wide biodiversity metrics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Start?</h2>
          <p className="text-green-100 mb-6 max-w-xl mx-auto">
            Most homeowners start with the AI Garden Generator - get a custom plant list 
            optimized for your yard in under 2 minutes.
          </p>
          <button
            onClick={() => navigate('/homeowner')}
            className="bg-white text-green-600 px-8 py-3 rounded-full font-semibold hover:bg-green-50 transition-colors shadow-lg"
          >
            🌱 Design My Garden
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐝</span>
              <span className="font-semibold text-white">BeehiveConnect</span>
            </div>
            <div className="text-sm">
              Data: GBIF • USU Extension • Conservation Garden Park • Xerces Society
            </div>
            <div className="text-sm">
              © 2025 BeehiveConnect • Murray, Utah
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
