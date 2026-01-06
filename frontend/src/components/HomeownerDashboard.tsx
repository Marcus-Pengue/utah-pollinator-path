import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Sparkles, Droplets, DollarSign, Trophy, ArrowLeft, Flower2, Grid3X3, Users, Calendar, TrendingUp, Bell, ChevronRight, Star, Target, Loader2, Shield, MapPin } from 'lucide-react';

// Import components that work standalone
import AutoLayoutGenerator from './AutoLayoutGenerator';
import GardenLayoutPlanner from './GardenLayoutPlanner';
import BloomTracker from './BloomTracker';
import SmartIrrigationSync from './SmartIrrigationSync';
import RebateFinder from './RebateFinder';
import HabitatScoreCard from './HabitatScoreCard';
import VerificationSystem from './VerificationSystem';
import Leaderboard from './Leaderboard';
import GardenRegistration from './GardenRegistration';

type Tab = 'overview' | 'score' | 'verify' | 'register' | 'generate' | 'planner' | 'bloom' | 'water' | 'rebates' | 'achievements' | 'neighbors';

interface TabConfig {
  id: Tab;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'overview', name: 'My Garden', icon: <Home className="w-5 h-5" />, description: 'Dashboard overview' },
  { id: 'score', name: 'Habitat Score', icon: <Target className="w-5 h-5" />, description: 'Your detailed score' },
  { id: 'verify', name: 'Get Verified', icon: <Shield className="w-5 h-5" />, description: '$15 professional badge' },
  { id: 'register', name: 'Register Garden', icon: <MapPin className="w-5 h-5" />, description: 'Add to leaderboard' },
  { id: 'generate', name: 'AI Generator', icon: <Sparkles className="w-5 h-5" />, description: 'Auto-design your garden' },
  { id: 'planner', name: 'Layout Planner', icon: <Grid3X3 className="w-5 h-5" />, description: 'Drag-and-drop design' },
  { id: 'bloom', name: 'Bloom Tracker', icon: <Flower2 className="w-5 h-5" />, description: 'Track what\'s flowering' },
  { id: 'water', name: 'Irrigation', icon: <Droplets className="w-5 h-5" />, description: 'Smart watering schedule' },
  { id: 'rebates', name: 'Rebates', icon: <DollarSign className="w-5 h-5" />, description: 'Find savings programs' },
  { id: 'achievements', name: 'Achievements', icon: <Trophy className="w-5 h-5" />, description: 'Your badges & progress' },
  { id: 'neighbors', name: 'Neighbors', icon: <Users className="w-5 h-5" />, description: 'Connect & compete' },
];

// API response type
interface HabitatScore {
  overall_score: number;
  grade: string;
  factors: {
    pollinatorActivity: { score: number; max_score: number; recommendations: string[] };
    septemberGap: { score: number; max_score: number; recommendations: string[] };
    connectivity: { score: number; max_score: number; recommendations: string[] };
    speciesDiversity: { score: number; max_score: number; recommendations: string[] };
    bloomCoverage: { score: number; max_score: number; recommendations: string[] };
  };
  top_recommendations: string[];
  nearby_observations: number;
  unique_species: number;
}

// Seasonal tips based on month
const getSeasonalTip = () => {
  const month = new Date().getMonth();
  const tips = [
    { month: 'January', icon: '❄️', tip: 'Plan your spring garden layout', action: 'Use AI Generator to plan', tab: 'generate' as Tab },
    { month: 'February', icon: '🌱', tip: 'Order native seeds before they sell out', action: 'Check recommended plants', tab: 'generate' as Tab },
    { month: 'March', icon: '🌸', tip: 'Start early spring bulbs indoors', action: 'View planting calendar', tab: 'bloom' as Tab },
    { month: 'April', icon: '🌷', tip: 'Plant early bloomers for hungry pollinators', action: 'Find early-bloom plants', tab: 'generate' as Tab },
    { month: 'May', icon: '🐝', tip: 'Add milkweed for monarch butterflies', action: 'Add to your plan', tab: 'planner' as Tab },
    { month: 'June', icon: '☀️', tip: 'Reduce watering - natives are drought-tolerant', action: 'Check irrigation schedule', tab: 'water' as Tab },
    { month: 'July', icon: '🦋', tip: 'Log butterfly sightings for community data', action: 'Open bloom tracker', tab: 'bloom' as Tab },
    { month: 'August', icon: '🌻', tip: 'Deadhead flowers to extend bloom season', action: 'Track your blooms', tab: 'bloom' as Tab },
    { month: 'September', icon: '🍂', tip: 'Plant fall asters for late-season nectar', action: 'Find fall bloomers', tab: 'generate' as Tab },
    { month: 'October', icon: '🎃', tip: 'Leave seed heads for overwintering birds', action: 'Learn more', tab: 'overview' as Tab },
    { month: 'November', icon: '🍁', tip: 'Apply for water rebates before year-end', action: 'Find rebates', tab: 'rebates' as Tab },
    { month: 'December', icon: '🎄', tip: 'Plan next year\'s pollinator corridor expansion', action: 'Use AI Generator', tab: 'generate' as Tab },
  ];
  return tips[month];
};

// Grade color helper
const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
  if (grade.startsWith('B')) return { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200' };
  if (grade.startsWith('C')) return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
  if (grade.startsWith('D')) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
  return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
};

export default function HomeownerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [habitatScore, setHabitatScore] = useState<HabitatScore | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const seasonalTip = getSeasonalTip();

  // User's location - in production, get from user profile or geolocation
  const userLocation = {
    latitude: 40.6668,  // Murray, UT
    longitude: -111.8880,
    address: 'Murray, UT'
  };

  // Fetch habitat score on mount
  useEffect(() => {
    const fetchScore = async () => {
      setScoreLoading(true);
      setScoreError(null);
      
      try {
        const response = await fetch('http://localhost:8000/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            address: userLocation.address
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch score');
        }
        
        const data = await response.json();
        setHabitatScore(data);
      } catch (err) {
        console.error('Score fetch error:', err);
        setScoreError(err instanceof Error ? err.message : 'Unknown error');
        // Use fallback mock data if API fails
        setHabitatScore({
          overall_score: 73,
          grade: 'C',
          factors: {
            pollinatorActivity: { score: 15, max_score: 25, recommendations: [] },
            septemberGap: { score: 12, max_score: 30, recommendations: ['Plant late-blooming species'] },
            connectivity: { score: 16, max_score: 20, recommendations: [] },
            speciesDiversity: { score: 9, max_score: 15, recommendations: [] },
            bloomCoverage: { score: 6, max_score: 10, recommendations: [] },
          },
          top_recommendations: ['Plant late-blooming species for September'],
          nearby_observations: 47,
          unique_species: 12
        });
      } finally {
        setScoreLoading(false);
      }
    };
    
    fetchScore();
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/leaderboard?city=Murray');
        if (response.ok) {
          const data = await response.json();
          setLeaderboardData(data.gardens || []);
        }
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
      }
    };
    fetchLeaderboard();
  }, []);



  // Compute user data from real score when available
  const userData = {
    name: 'Marcus',
    plantsAdded: 12,
    waterSaved: 4700,
    speciesAttracted: habitatScore?.unique_species || 8,
    habitatScore: habitatScore?.overall_score || 0,
    grade: habitatScore?.grade || '-',
    rank: 2,
    totalNeighbors: 12,
  };

  const neighborLeaderboard = [
    { name: 'Sarah M.', score: 82, isYou: false },
    { name: 'You', score: userData.habitatScore, isYou: true },
    { name: 'James K.', score: 67, isYou: false },
    { name: 'Maria L.', score: 64, isYou: false },
    { name: 'David R.', score: 58, isYou: false },
  ].sort((a, b) => b.score - a.score);

  const nextBadge = {
    name: 'Water Wise II',
    icon: '💧',
    current: 4700,
    target: 5000,
    unit: 'gallons saved',
  };

  const bloomAlerts = [
    { plant: 'Firecracker Penstemon', status: 'blooming', emoji: '🌺' },
    { plant: 'Blue Flax', status: 'budding', emoji: '🌸' },
  ];

  // Score summary card for overview
  const ScoreSummaryCard = () => {
    if (scoreLoading) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-green-600 mr-2" />
          <span className="text-gray-600">Calculating your habitat score...</span>
        </div>
      );
    }

    const gradeColors = getGradeColor(userData.grade);
    const septemberScore = habitatScore?.factors.septemberGap;
    const hasSeptemberGap = septemberScore && septemberScore.score < 18;

    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-800">Habitat Score</h3>
          </div>
          <button
            onClick={() => setActiveTab('score')}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            View details →
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Score Circle */}
          <div className={`w-24 h-24 rounded-full ${gradeColors.bg} ${gradeColors.border} border-4 flex flex-col items-center justify-center`}>
            <span className={`text-3xl font-bold ${gradeColors.text}`}>{userData.grade}</span>
            <span className="text-sm text-gray-500">{Math.round(userData.habitatScore)}/100</span>
          </div>
          
          {/* Quick Factors */}
          <div className="flex-1 space-y-2">
            {habitatScore && Object.entries(habitatScore.factors).slice(0, 3).map(([key, factor]) => {
              const percentage = (factor.score / factor.max_score) * 100;
              const labels: Record<string, string> = {
                septemberGap: '🍂 September',
                pollinatorActivity: '🦋 Activity',
                connectivity: '🔗 Connectivity'
              };
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs w-24 text-gray-600">{labels[key] || key}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${percentage < 40 ? 'bg-red-400' : percentage < 70 ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{Math.round(percentage)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* September Gap Alert */}
        {hasSeptemberGap && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-lg">🚨</span>
              <div>
                <div className="font-medium text-red-800 text-sm">September Gap Detected</div>
                <div className="text-xs text-red-600 mt-1">
                  Your property lacks late-season blooms when pollinators need them most.
                </div>
                <button 
                  onClick={() => setActiveTab('generate')}
                  className="mt-2 text-xs font-medium text-red-700 hover:text-red-800"
                >
                  Get plant recommendations →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Recommendation */}
        {habitatScore?.top_recommendations[0] && !hasSeptemberGap && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800">{habitatScore.top_recommendations[0]}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Seasonal Action Card */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-green-100 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>This Week in {seasonalTip.month}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{seasonalTip.icon}</span>
                    <h3 className="text-xl font-semibold">{seasonalTip.tip}</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab(seasonalTip.tab)}
                    className="mt-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {seasonalTip.action}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Habitat Score Summary - NEW */}
            <ScoreSummaryCard />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-3xl mb-1">🌱</div>
                <div className="text-2xl font-bold text-gray-900">{userData.plantsAdded}</div>
                <div className="text-sm text-gray-500">Plants Added</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-3xl mb-1">💧</div>
                <div className="text-2xl font-bold text-blue-600">{Math.round(userData.waterSaved / 100)}%</div>
                <div className="text-sm text-gray-500">Water Saved</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-3xl mb-1">🦋</div>
                <div className="text-2xl font-bold text-purple-600">{userData.speciesAttracted}</div>
                <div className="text-sm text-gray-500">Species Nearby</div>
              </div>
              <div 
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab('score')}
              >
                <div className="text-3xl mb-1">🎯</div>
                <div className="text-2xl font-bold text-amber-600">
                  {scoreLoading ? '...' : userData.habitatScore}
                </div>
                <div className="text-sm text-gray-500">Habitat Score</div>
              </div>
            </div>

            {/* Bloom Alerts */}
            {bloomAlerts.length > 0 && (
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-5 h-5 text-pink-600" />
                  <h3 className="font-semibold text-pink-800">Bloom Alerts</h3>
                </div>
                <div className="space-y-2">
                  {bloomAlerts.map((alert, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{alert.emoji}</span>
                        <span className="font-medium text-gray-800">{alert.plant}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          alert.status === 'blooming' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {alert.status === 'blooming' ? '🌸 Blooming now!' : '🌱 Budding soon'}
                        </span>
                        <button
                          onClick={() => setActiveTab('bloom')}
                          className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                        >
                          Log it →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Neighborhood Leaderboard */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-gray-800">Your Neighborhood</h3>
                </div>
                <button
                  onClick={() => setActiveTab('neighbors')}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-2">
                {neighborLeaderboard.slice(0, 4).map((neighbor, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      neighbor.isYou ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-gray-200 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`font-medium ${neighbor.isYou ? 'text-green-700' : 'text-gray-800'}`}>
                        {neighbor.name}
                        {neighbor.isYou && <Star className="w-4 h-4 inline ml-1 text-green-500" />}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${neighbor.isYou ? 'text-green-600' : 'text-gray-600'}`}>
                        {Math.round(neighbor.score)}
                      </span>
                      <span className="text-gray-400 text-sm">pts</span>
                    </div>
                  </div>
                ))}
              </div>
              {userData.rank > 1 && neighborLeaderboard[0] && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {Math.round(neighborLeaderboard[0].score - userData.habitatScore)} points to reach #1!
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Next Badge Progress */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{nextBadge.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Next Badge: {nextBadge.name}</h3>
                    <p className="text-sm text-gray-500">
                      {nextBadge.target - nextBadge.current} more {nextBadge.unit} to go
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  All badges →
                </button>
              </div>
              <div className="relative">
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${(nextBadge.current / nextBadge.target) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-500">{nextBadge.current.toLocaleString()}</span>
                  <span className="font-medium text-blue-600">{Math.round((nextBadge.current / nextBadge.target) * 100)}%</span>
                  <span className="text-gray-500">{nextBadge.target.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveTab('score')}
                  className="p-4 bg-amber-50 hover:bg-amber-100 rounded-xl text-center transition-colors group"
                >
                  <Target className="w-6 h-6 text-amber-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-700">View Score</span>
                </button>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-xl text-center transition-colors group"
                >
                  <Sparkles className="w-6 h-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-700">AI Generator</span>
                </button>
                <button
                  onClick={() => setActiveTab('rebates')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-center transition-colors group"
                >
                  <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-700">Find Rebates</span>
                </button>
                <button
                  onClick={() => setActiveTab('bloom')}
                  className="p-4 bg-pink-50 hover:bg-pink-100 rounded-xl text-center transition-colors group"
                >
                  <Flower2 className="w-6 h-6 text-pink-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-700">Log Bloom</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { icon: '🎯', text: 'Habitat score calculated', time: 'Just now', points: '' },
                  { icon: '🌸', text: 'Logged bloom: Firecracker Penstemon', time: '2 hours ago', points: '+5' },
                  { icon: '🦋', text: 'Spotted: Painted Lady butterfly', time: '1 day ago', points: '+10' },
                  { icon: '💧', text: 'Watering schedule optimized', time: '2 days ago', points: '+3' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{activity.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{activity.text}</div>
                        <div className="text-xs text-gray-500">{activity.time}</div>
                      </div>
                    </div>
                    {activity.points && (
                      <span className="text-green-600 font-medium text-sm">{activity.points}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'score':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Your Habitat Score</h2>
              <p className="text-amber-100">
                Based on {habitatScore?.nearby_observations.toLocaleString() || 0} wildlife observations 
                within 500m of your property
              </p>
            </div>

            {/* Full Score Card */}
            <div className="flex justify-center">
              <HabitatScoreCard
                latitude={userLocation.latitude}
                longitude={userLocation.longitude}
                address={userLocation.address}
                onScoreCalculated={(score) => setHabitatScore(score as HabitatScore)}
              />
            </div>

            {/* What This Means */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">What This Means</h3>
              <div className="space-y-4 text-sm text-gray-600">
                <p>
                  Your habitat score is calculated using <strong>759,640 real wildlife observations</strong> from 
                  the GBIF database, covering Utah's Wasatch Front region.
                </p>
                <p>
                  The <strong>September Gap</strong> is the most important factor because research shows 
                  84.5% of Utah properties lack adequate late-season pollinator resources—this is when 
                  pollinators need food most to survive winter.
                </p>
                <p>
                  Improving your score helps create <strong>pollinator corridors</strong>—connected 
                  pathways of habitat that allow bees, butterflies, and birds to thrive.
                </p>
              </div>
              
              <button
                onClick={() => setActiveTab('generate')}
                className="mt-6 w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                🌱 Get Personalized Plant Recommendations
              </button>
            </div>
          </div>
        );
      
      
      case 'verify':
        return (
          <VerificationSystem
            gardenId="garden-001"
            gardenName="My Pollinator Garden"
            currentTier="bronze"
            currentScore={habitatScore?.overall_score || 0}
            verificationStatus={{
              level: 'unverified',
              nextVerificationDue: undefined
            }}
            plants={[
              { id: '1', name: 'Rabbitbrush', plantedDate: '2024-09-15', isNewPlanting: true, verified: false, basePoints: 10, verifiedPoints: 15 },
              { id: '2', name: 'Blue Flax', plantedDate: '2024-04-20', isNewPlanting: true, verified: false, basePoints: 8, verifiedPoints: 12 },
              { id: '3', name: 'Penstemon', plantedDate: '2024-05-10', isNewPlanting: true, verified: false, basePoints: 10, verifiedPoints: 15 },
            ]}
            onScheduleProfessional={(date, time) => console.log('Schedule:', date, time)}
            onRequestCommunity={() => console.log('Request community verification')}
            onAddNewPlant={(plant) => console.log('Add plant:', plant)}
          />
        );
      

      case 'register':
        return (
          <GardenRegistration
            lat={userLocation.latitude}
            lng={userLocation.longitude}
            onSubmit={async (data) => {
              try {
                const response = await fetch('http://localhost:8000/api/garden/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    lat: userLocation.latitude,
                    lng: userLocation.longitude,
                    plants: data.plants || [],
                    features: data.features || [],
                    size: data.size || 'medium',
                    score: data.score || 0,
                    name: data.name || 'My Garden'
                  })
                });
                if (response.ok) {
                  alert('Garden registered! Check the Neighbors tab to see your ranking.');
                  setActiveTab('neighbors');
                }
              } catch (err) {
                console.error('Registration error:', err);
              }
            }}
            onCancel={() => setActiveTab('overview')}
          />
        );
      
case 'generate':
        // Pass gap-filler mode if September score is low
        const septemberLow = (habitatScore?.factors?.septemberGap?.score ?? 100) < 18;
        return <AutoLayoutGenerator defaultMode={septemberLow ? 'gap-filler' : undefined} />;
      
      case 'planner':
        return <GardenLayoutPlanner />;
      
      case 'bloom':
        return <BloomTracker />;
      
      case 'water':
        return <SmartIrrigationSync />;
      
      case 'rebates':
        return <RebateFinder />;
      
      case 'achievements':
        return (
          <div className="space-y-6">
            {/* Progress Summary */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
              <h3 className="text-xl font-bold mb-2">Your Achievement Progress</h3>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-3xl font-bold">4</div>
                  <div className="text-amber-100">Badges Earned</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">8</div>
                  <div className="text-amber-100">Total Available</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">50%</div>
                  <div className="text-amber-100">Complete</div>
                </div>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">All Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '🌱', name: 'First Plant', desc: 'Added your first plant', earned: true, date: 'Dec 1' },
                  { icon: '🌸', name: 'Early Bloomer', desc: 'March-April blooms', earned: true, date: 'Dec 10' },
                  { icon: '💧', name: 'Water Wise', desc: 'Save 1000+ gallons', earned: true, date: 'Dec 15' },
                  { icon: '🦋', name: 'Butterfly Host', desc: 'Plant a host species', earned: true, date: 'Dec 20' },
                  { icon: '🐝', name: 'Bee Paradise', desc: '5+ bee species', earned: false, progress: 60 },
                  { icon: '🏆', name: 'Habitat Hero', desc: 'Score 80+', earned: false, progress: Math.round((userData.habitatScore / 80) * 100) },
                  { icon: '👥', name: 'Neighbor Network', desc: 'Connect with 3 neighbors', earned: false, progress: 33 },
                  { icon: '📸', name: 'Citizen Scientist', desc: '50 observations', earned: false, progress: 46 },
                ].map((badge, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl text-center transition-all ${
                      badge.earned 
                        ? 'bg-amber-50 border-2 border-amber-200 shadow-sm' 
                        : 'bg-gray-50 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className={`text-4xl mb-2 ${!badge.earned && 'grayscale'}`}>{badge.icon}</div>
                    <div className="font-medium text-gray-800">{badge.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{badge.desc}</div>
                    {badge.earned ? (
                      <div className="text-xs text-amber-600 font-medium">✓ Earned {badge.date}</div>
                    ) : (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(badge.progress || 0, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{badge.progress}%</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'neighbors':
        return (
          <div className="space-y-6">
            {/* Leaderboard Modal */}
            <Leaderboard
              isOpen={leaderboardOpen}
              onClose={() => setLeaderboardOpen(false)}
              userGardenId="garden-008"
              gardens={leaderboardData}
            />
            
            {/* Your Rank */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-green-100 text-sm">Your Rank in Murray</div>
                  <div className="text-4xl font-bold">#{leaderboardData.findIndex(g => g.isCurrentUser) + 1 || '?'}</div>
                  <div className="text-green-100">of {leaderboardData.length || '?'} gardeners</div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold">{Math.round(userData.habitatScore)}</div>
                  <div className="text-green-100">Habitat Score</div>
                </div>
              </div>
            </div>

            {/* View Full Leaderboard Button */}
            <button
              onClick={() => setLeaderboardOpen(true)}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              View Full City Leaderboard
            </button>

            {/* Top 5 Preview */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Gardeners in Murray</h3>
              <div className="space-y-3">
                {leaderboardData.slice(0, 5).map((garden, i) => (
                  <div 
                    key={garden.id} 
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      garden.isCurrentUser ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-gray-200 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {i <= 2 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                      </div>
                      <div>
                        <div className={`font-medium ${garden.isCurrentUser ? 'text-green-700' : 'text-gray-800'}`}>
                          {garden.anonymousId}
                          {garden.isCurrentUser && <span className="ml-2 text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">You</span>}
                        </div>
                        <div className="text-sm text-gray-500">
                          {garden.neighborhood} • {garden.plantCount} plants
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-800">{garden.score}</div>
                      <div className="text-xs text-gray-500">{garden.tier}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Challenge a Neighbor */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Challenge a Neighbor</h3>
              <p className="text-gray-600 mb-4">
                Compete to see who can improve their habitat score the most this month!
              </p>
              <button className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                🏆 Start a Challenge
              </button>
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
                <span className="text-green-600 font-medium">Homeowner</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">{userLocation.address}</div>
              {!scoreLoading && habitatScore && (
                <div className={`px-2 py-1 rounded-full text-xs font-bold ${getGradeColor(habitatScore.grade).bg} ${getGradeColor(habitatScore.grade).text}`}>
                  {habitatScore.grade}
                </div>
              )}
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-green-700">MP</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white border-r min-h-[calc(100vh-4rem)] hidden md:block">
          <div className="p-4 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-green-600' : 'text-gray-400'}>
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

        {/* Mobile Tab Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
          <div className="flex overflow-x-auto">
            {TABS.slice(0, 5).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[4rem] py-3 text-center ${
                  activeTab === tab.id ? 'text-green-600' : 'text-gray-400'
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
        <main className="flex-1 p-6 pb-24 md:pb-6">
          <div className="max-w-4xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
