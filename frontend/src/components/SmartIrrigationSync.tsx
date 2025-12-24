import React, { useState, useMemo } from 'react';
import { 
  Droplets, Wifi, WifiOff, Settings, Calendar, Sun, Cloud, CloudRain,
  Leaf, Clock, TrendingDown, CheckCircle, AlertTriangle, RefreshCw,
  Zap, ThermometerSun, Wind, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';

interface Plant {
  id: string;
  name: string;
  waterNeeds: 'low' | 'medium' | 'high';
  rootDepth: 'shallow' | 'medium' | 'deep';
}

interface IrrigationZone {
  id: string;
  name: string;
  plants: Plant[];
  currentSchedule?: {
    days: string[];
    startTime: string;
    duration: number; // minutes
  };
  soilType: 'clay' | 'loam' | 'sand';
  sunExposure: 'full' | 'partial' | 'shade';
}

interface WeatherData {
  temp: number;
  humidity: number;
  precipitation: number;
  wind: number;
  forecast: { day: string; high: number; precip: number }[];
}

interface SmartIrrigationSyncProps {
  gardenPlants?: Plant[];
  gardenSize?: number;
  onSave?: (settings: any) => void;
}

// Utah native plant water requirements (gallons per week per plant)
const PLANT_WATER_NEEDS: Record<string, { gallons: number; frequency: string; notes: string }> = {
  'Desert Marigold': { gallons: 0.5, frequency: 'Every 10-14 days', notes: 'Drought tolerant once established' },
  'Blue Flax': { gallons: 0.5, frequency: 'Every 10-14 days', notes: 'Very drought tolerant' },
  'Penstemon': { gallons: 1, frequency: 'Weekly', notes: 'Moderate water, good drainage' },
  'Blanket Flower': { gallons: 0.5, frequency: 'Every 10-14 days', notes: 'Thrives on neglect' },
  'Black-eyed Susan': { gallons: 1.5, frequency: 'Twice weekly', notes: 'Moderate water needs' },
  'Purple Coneflower': { gallons: 1, frequency: 'Weekly', notes: 'Drought tolerant once established' },
  'Bee Balm': { gallons: 2, frequency: 'Twice weekly', notes: 'Prefers consistent moisture' },
  'Goldenrod': { gallons: 0.5, frequency: 'Every 10-14 days', notes: 'Very drought tolerant' },
  'Rabbitbrush': { gallons: 0.25, frequency: 'Monthly once established', notes: 'Extremely drought tolerant' },
  'Apache Plume': { gallons: 0.5, frequency: 'Every 2 weeks', notes: 'Low water once established' },
  'Fernbush': { gallons: 1, frequency: 'Weekly', notes: 'Moderate water' },
  'Creeping Thyme': { gallons: 0.5, frequency: 'Weekly', notes: 'Low water groundcover' },
  'Sedum': { gallons: 0.25, frequency: 'Every 2 weeks', notes: 'Succulent, very low water' },
  'Desert Willow': { gallons: 2, frequency: 'Weekly deep soak', notes: 'Deep watering encourages deep roots' },
  'Serviceberry': { gallons: 2, frequency: 'Weekly', notes: 'Moderate water' },
};

const CONTROLLERS = [
  { id: 'rachio', name: 'Rachio', icon: '💧', color: '#00a4e4', connected: false },
  { id: 'rainmachine', name: 'RainMachine', icon: '🌧️', color: '#2ecc71', connected: false },
  { id: 'orbit', name: 'Orbit B-hyve', icon: '🐝', color: '#f39c12', connected: false },
  { id: 'hunter', name: 'Hunter Hydrawise', icon: '🎯', color: '#e74c3c', connected: false },
  { id: 'rainbird', name: 'Rain Bird', icon: '🐦', color: '#3498db', connected: false },
];

const SmartIrrigationSync: React.FC<SmartIrrigationSyncProps> = ({
  gardenPlants = [],
  gardenSize = 200,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'schedule' | 'savings' | 'pollinator'>('connect');
  const [connectedController, setConnectedController] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [zones, setZones] = useState<IrrigationZone[]>([
    {
      id: 'zone1',
      name: 'Pollinator Garden',
      plants: gardenPlants.length > 0 ? gardenPlants : [
        { id: '1', name: 'Desert Marigold', waterNeeds: 'low', rootDepth: 'shallow' },
        { id: '2', name: 'Blue Flax', waterNeeds: 'low', rootDepth: 'medium' },
        { id: '3', name: 'Penstemon', waterNeeds: 'medium', rootDepth: 'medium' },
      ],
      currentSchedule: { days: ['Mon', 'Wed', 'Fri'], startTime: '06:00', duration: 15 },
      soilType: 'loam',
      sunExposure: 'full'
    }
  ]);
  const [pollinatorMode, setPollinatorMode] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string>('recommendations');

  // Simulated weather data for Salt Lake City
  const weather: WeatherData = {
    temp: 85,
    humidity: 25,
    precipitation: 0,
    wind: 8,
    forecast: [
      { day: 'Today', high: 85, precip: 0 },
      { day: 'Tomorrow', high: 88, precip: 0 },
      { day: 'Wed', high: 90, precip: 10 },
      { day: 'Thu', high: 87, precip: 20 },
      { day: 'Fri', high: 82, precip: 5 },
    ]
  };

  // Calculate water recommendations
  const waterRecommendations = useMemo(() => {
    const recommendations: { plant: string; current: number; recommended: number; savings: number }[] = [];
    
    zones.forEach(zone => {
      zone.plants.forEach(plant => {
        const needs = PLANT_WATER_NEEDS[plant.name];
        if (needs) {
          // Current schedule assumes 15 min, 3x/week = ~2 gallons per plant
          const currentUsage = (zone.currentSchedule?.duration || 15) * (zone.currentSchedule?.days.length || 3) * 0.044;
          const recommended = needs.gallons;
          recommendations.push({
            plant: plant.name,
            current: currentUsage,
            recommended,
            savings: Math.max(0, currentUsage - recommended)
          });
        }
      });
    });
    
    return recommendations;
  }, [zones]);

  const totalSavings = useMemo(() => {
    const weeklyGallons = waterRecommendations.reduce((sum, r) => sum + r.savings, 0);
    const monthlyGallons = weeklyGallons * 4;
    const yearlyGallons = weeklyGallons * 52;
    const yearlyCost = yearlyGallons * 0.004; // ~$4 per 1000 gallons in Utah
    
    return { weeklyGallons, monthlyGallons, yearlyGallons, yearlyCost };
  }, [waterRecommendations]);

  // Pollinator-friendly schedule
  const pollinatorSchedule = useMemo(() => {
    // Avoid watering during peak pollinator hours (10am-4pm)
    // Best times: early morning (5-7am) or evening (7-9pm)
    return {
      bestTime: '6:00 AM',
      avoidStart: '10:00 AM',
      avoidEnd: '4:00 PM',
      reason: 'Pollinators are most active mid-morning to mid-afternoon. Early morning watering allows foliage to dry before peak activity.',
      tips: [
        'Water at soil level to keep flowers dry for pollinators',
        'Avoid wetting blooms directly - bees need dry landing pads',
        'Morning watering reduces fungal disease risk',
        'Deep, infrequent watering encourages deep roots'
      ]
    };
  }, []);

  const connectController = (controllerId: string) => {
    setIsConnecting(true);
    // Simulate connection
    setTimeout(() => {
      setConnectedController(controllerId);
      setIsConnecting(false);
    }, 2000);
  };

  const tabs = [
    { id: 'connect', label: 'Connect', icon: Wifi },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'savings', label: 'Savings', icon: TrendingDown },
    { id: 'pollinator', label: 'Pollinator', icon: Leaf },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fefefe' }}>
      {/* Header */}
      <div style={{ padding: 16, background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Droplets size={24} />
          <div>
            <h3 style={{ margin: 0, fontWeight: 700 }}>Smart Irrigation Sync</h3>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
              {connectedController 
                ? `Connected to ${CONTROLLERS.find(c => c.id === connectedController)?.name}`
                : 'Connect your smart controller'}
            </p>
          </div>
        </div>
      </div>

      {/* Weather Banner */}
      <div style={{ padding: '10px 16px', backgroundColor: '#f0f9ff', borderBottom: '1px solid #e0f2fe', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ThermometerSun size={16} color="#f59e0b" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{weather.temp}°F</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Droplets size={16} color="#3b82f6" />
          <span style={{ fontSize: 13 }}>{weather.humidity}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wind size={16} color="#6b7280" />
          <span style={{ fontSize: 13 }}>{weather.wind} mph</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#0369a1' }}>
          Salt Lake City
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'white' : '#f9fafb',
              borderBottom: activeTab === tab.id ? '2px solid #0ea5e9' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: activeTab === tab.id ? '#0ea5e9' : '#666'
            }}
          >
            <tab.icon size={16} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Connect Tab */}
        {activeTab === 'connect' && (
          <div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              Connect your smart irrigation controller to sync watering schedules with your pollinator garden.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CONTROLLERS.map(controller => (
                <div
                  key={controller.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 16,
                    backgroundColor: connectedController === controller.id ? '#f0fdf4' : 'white',
                    border: `2px solid ${connectedController === controller.id ? '#22c55e' : '#e5e7eb'}`,
                    borderRadius: 12,
                    cursor: 'pointer'
                  }}
                  onClick={() => !connectedController && connectController(controller.id)}
                >
                  <div style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 12, 
                    backgroundColor: controller.color + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24
                  }}>
                    {controller.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{controller.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {connectedController === controller.id ? 'Connected' : 'Tap to connect'}
                    </div>
                  </div>
                  {connectedController === controller.id ? (
                    <CheckCircle size={24} color="#22c55e" />
                  ) : isConnecting ? (
                    <RefreshCw size={20} color="#666" className="animate-spin" />
                  ) : (
                    <Wifi size={20} color="#d1d5db" />
                  )}
                </div>
              ))}
            </div>

            {!connectedController && (
              <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                  💡 Don't have a smart controller?
                </div>
                <div style={{ fontSize: 11, color: '#92400e' }}>
                  You can still use our watering recommendations manually. Smart controllers like Rachio qualify for Utah rebates up to $150!
                </div>
              </div>
            )}

            {connectedController && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => setConnectedController(null)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Disconnect Controller
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            {/* Current Schedule */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} />
                Current Schedule
              </div>
              {zones.map(zone => (
                <div key={zone.id} style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{zone.name}</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div
                        key={day}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: zone.currentSchedule?.days.includes(day) ? '#0ea5e9' : '#e5e7eb',
                          color: zone.currentSchedule?.days.includes(day) ? 'white' : '#666',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 600
                        }}
                      >
                        {day.slice(0, 1)}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>⏰ {zone.currentSchedule?.startTime}</span>
                    <span>⏱️ {zone.currentSchedule?.duration} min</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Optimized Schedule */}
            <div 
              style={{ 
                padding: 16, 
                backgroundColor: '#f0fdf4', 
                borderRadius: 12, 
                border: '2px solid #22c55e' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Zap size={18} color="#22c55e" />
                <span style={{ fontWeight: 700, color: '#166534' }}>Recommended Schedule</span>
              </div>
              
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['Tue', 'Sat'].map(day => (
                  <div
                    key={day}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              <div style={{ fontSize: 13, color: '#166534', marginBottom: 8 }}>
                <strong>6:00 AM</strong> • 20 minutes • Deep soak
              </div>
              
              <div style={{ fontSize: 11, color: '#166534' }}>
                Utah native plants thrive with less frequent, deeper watering. This schedule saves water while promoting healthy root growth.
              </div>

              {connectedController && (
                <button
                  style={{
                    marginTop: 12,
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Apply to {CONTROLLERS.find(c => c.id === connectedController)?.name}
                </button>
              )}
            </div>

            {/* Weather Adjustment */}
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#eff6ff', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>
                🌤️ 5-Day Forecast Adjustment
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {weather.forecast.map(day => (
                  <div key={day.day} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#666' }}>{day.day}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{day.high}°</div>
                    {day.precip > 0 && (
                      <div style={{ fontSize: 10, color: '#3b82f6' }}>💧{day.precip}%</div>
                    )}
                  </div>
                ))}
              </div>
              {weather.forecast.some(d => d.precip > 15) && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#1e40af' }}>
                  💡 Rain expected Thursday - consider skipping watering
                </div>
              )}
            </div>
          </div>
        )}

        {/* Savings Tab */}
        {activeTab === 'savings' && (
          <div>
            {/* Savings Summary */}
            <div style={{ 
              padding: 20, 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
              borderRadius: 16, 
              color: 'white',
              textAlign: 'center',
              marginBottom: 16
            }}>
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Estimated Annual Savings</div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>${totalSavings.yearlyCost.toFixed(0)}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>{totalSavings.yearlyGallons.toLocaleString()} gallons</div>
            </div>

            {/* Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>{totalSavings.weeklyGallons.toFixed(1)}</div>
                <div style={{ fontSize: 10, color: '#166534' }}>gal/week</div>
              </div>
              <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>{totalSavings.monthlyGallons.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: '#166534' }}>gal/month</div>
              </div>
              <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>{totalSavings.yearlyGallons.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#166534' }}>gal/year</div>
              </div>
            </div>

            {/* Per-Plant Breakdown */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Plant Water Needs</div>
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                {waterRecommendations.map((rec, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '8px 12px',
                    backgroundColor: i % 2 === 0 ? '#f9fafb' : 'white',
                    borderRadius: 6
                  }}>
                    <span style={{ flex: 1, fontSize: 12 }}>{rec.plant}</span>
                    <span style={{ fontSize: 11, color: '#ef4444', textDecoration: 'line-through' }}>
                      {rec.current.toFixed(1)}g
                    </span>
                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                      {rec.recommended.toFixed(1)}g
                    </span>
                    <span style={{ 
                      fontSize: 10, 
                      backgroundColor: '#dcfce7', 
                      color: '#166534',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}>
                      -{(rec.savings * 100 / rec.current || 0).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Utah Context */}
            <div style={{ padding: 12, backgroundColor: '#fef3c7', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                🏜️ Why This Matters in Utah
              </div>
              <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
                Utah is the 2nd driest state and outdoor watering accounts for 60% of residential use. 
                Native plants need 50-75% less water than traditional lawns once established.
              </div>
            </div>
          </div>
        )}

        {/* Pollinator Tab */}
        {activeTab === 'pollinator' && (
          <div>
            {/* Pollinator Mode Toggle */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: 16,
              backgroundColor: pollinatorMode ? '#f0fdf4' : '#f9fafb',
              borderRadius: 12,
              marginBottom: 16
            }}>
              <div>
                <div style={{ fontWeight: 600, color: pollinatorMode ? '#166534' : '#374151' }}>
                  🐝 Pollinator-Friendly Mode
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Avoid watering during peak pollinator activity
                </div>
              </div>
              <button
                onClick={() => setPollinatorMode(!pollinatorMode)}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: pollinatorMode ? '#22c55e' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  position: 'absolute',
                  top: 2,
                  left: pollinatorMode ? 24 : 2,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>

            {/* Schedule Visualization */}
            <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Daily Watering Windows</div>
              <div style={{ display: 'flex', height: 40, borderRadius: 8, overflow: 'hidden' }}>
                {/* 5-10am: Good */}
                <div style={{ flex: 5, backgroundColor: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>✓ Best</span>
                </div>
                {/* 10am-4pm: Avoid */}
                <div style={{ flex: 6, backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>🐝 Avoid</span>
                </div>
                {/* 4-8pm: OK */}
                <div style={{ flex: 4, backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>OK</span>
                </div>
                {/* 8pm-5am: Not ideal */}
                <div style={{ flex: 9, backgroundColor: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>Night</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666', marginTop: 4 }}>
                <span>5am</span>
                <span>10am</span>
                <span>4pm</span>
                <span>8pm</span>
                <span>12am</span>
              </div>
            </div>

            {/* Tips */}
            <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 8 }}>
                🌸 Pollinator-Friendly Watering Tips
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#166534', lineHeight: 1.8 }}>
                {pollinatorSchedule.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>

            {/* Why It Matters */}
            <div style={{ padding: 12, backgroundColor: '#fef3c7', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                Why Timing Matters
              </div>
              <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
                Wet flowers can damage pollen, making it difficult for bees to collect. 
                Water droplets on petals can also act as lenses, potentially burning delicate flower parts in direct sunlight.
                Watering in early morning gives plants time to dry before pollinators become active.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartIrrigationSync;
