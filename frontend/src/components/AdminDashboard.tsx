import React, { useState, useEffect } from 'react';
import { 
  X, Shield, Leaf, MapPin, Users, MessageCircle, Download, 
  BarChart3, CheckCircle, XCircle, AlertTriangle, Eye, Trash2,
  RefreshCw, Search, Filter, Calendar, TrendingUp
} from 'lucide-react';
import { api } from '../api/client';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stats {
  totalGardens: number;
  totalObservations: number;
  pendingVerifications: number;
  messagesTotal: number;
  gardensThisWeek: number;
  observationsThisWeek: number;
}

interface Garden {
  id: string;
  anonymousId: string;
  city: string;
  score: number;
  tier: string;
  plantCount: number;
  verificationLevel: string;
  registeredAt: string;
  lat: number;
  lng: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
  flagged?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'gardens' | 'verifications' | 'messages' | 'export'>('overview');
  const [stats, setStats] = useState<Stats>({
    totalGardens: 0,
    totalObservations: 0,
    pendingVerifications: 0,
    messagesTotal: 0,
    gardensThisWeek: 0,
    observationsThisWeek: 0
  });
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const CORRECT_PASSWORD = 'xercesblue';

  useEffect(() => {
    if (authenticated) {
      loadStats();
      loadGardens();
      loadMessages();
    }
  }, [authenticated]);

  const handleLogin = () => {
    if (password === CORRECT_PASSWORD) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPassword('');
    }
  };

  const loadStats = async () => {
    try {
      const [gardensRes, wildlifeRes, messagesRes] = await Promise.all([
        api.get('/api/gardens'),
        api.get('/api/wildlife/cached'),
        api.get('/api/messages?garden_id=admin_all')
      ]);
      
      const gardenFeatures = gardensRes.data?.features || [];
      const observations = wildlifeRes.data?.features || [];
      const msgs = messagesRes.data?.messages || [];
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      setStats({
        totalGardens: gardenFeatures.length,
        totalObservations: observations.length,
        pendingVerifications: gardenFeatures.filter((g: any) => 
          g.properties?.verification?.status === 'pending'
        ).length,
        messagesTotal: msgs.length,
        gardensThisWeek: gardenFeatures.filter((g: any) => 
          new Date(g.properties?.registeredAt) > oneWeekAgo
        ).length,
        observationsThisWeek: observations.filter((o: any) => 
          new Date(o.properties?.observed_on) > oneWeekAgo
        ).length
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadGardens = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/gardens');
      const features = res.data?.features || [];
      setGardens(features.map((f: any) => ({
        id: f.properties?.id || '',
        anonymousId: f.properties?.anonymousId || '',
        city: f.properties?.city || 'Unknown',
        score: f.properties?.score || 0,
        tier: f.properties?.tier || 'Seedling',
        plantCount: f.properties?.plants?.length || 0,
        verificationLevel: f.properties?.verification?.level || 'unverified',
        registeredAt: f.properties?.registeredAt || '',
        lat: f.geometry?.coordinates?.[1] || 0,
        lng: f.geometry?.coordinates?.[0] || 0
      })));
    } catch (err) {
      console.error('Failed to load gardens:', err);
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    try {
      const res = await api.get('/api/messages?garden_id=admin_all');
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const exportData = async (format: 'csv' | 'geojson', type: 'gardens' | 'observations') => {
    try {
      const endpoint = type === 'gardens' ? '/api/gardens' : '/api/wildlife/cached';
      const res = await api.get(endpoint);
      
      let data: string;
      let filename: string;
      let mimeType: string;
      
      if (format === 'geojson') {
        data = JSON.stringify(res.data, null, 2);
        filename = `${type}_${new Date().toISOString().split('T')[0]}.geojson`;
        mimeType = 'application/json';
      } else {
        // Convert to CSV
        const features = res.data?.features || [];
        if (features.length === 0) {
          alert('No data to export');
          return;
        }
        
        const headers = Object.keys(features[0].properties || {});
        const rows = features.map((f: any) => 
          headers.map(h => JSON.stringify(f.properties?.[h] ?? '')).join(',')
        );
        data = [headers.join(','), ...rows].join('\n');
        filename = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }
      
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed');
    }
  };

  const deleteGarden = async (gardenId: string) => {
    if (!window.confirm('Are you sure you want to delete this garden?')) return;
    try {
      await api.delete(`/api/gardens/${gardenId}`);
      loadGardens();
      loadStats();
    } catch (err) {
      console.error('Failed to delete garden:', err);
    }
  };

  const filteredGardens = gardens.filter(g => {
    if (searchQuery && !g.anonymousId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCity && g.city !== filterCity) return false;
    return true;
  });

  const cities = Array.from(new Set(gardens.map(g => g.city))).sort();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#0a0a0a', color: 'white', borderRadius: 16,
        width: '95%', maxWidth: 1200, height: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={24} color="#dc2626" />
            <span style={{ fontSize: 20, fontWeight: 700 }}>Admin Dashboard</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#999" />
          </button>
        </div>

        {!authenticated ? (
          /* Login Form */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <Shield size={48} color="#dc2626" style={{ marginBottom: 20 }} />
              <h2 style={{ margin: '0 0 20px', fontWeight: 600 }}>Admin Access</h2>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter password"
                style={{
                  padding: '12px 16px', borderRadius: 8, border: `2px solid ${passwordError ? '#ef4444' : '#333'}`,
                  backgroundColor: '#1a1a1a', color: 'white', fontSize: 16, width: 250,
                  outline: 'none'
                }}
                autoFocus
              />
              {passwordError && (
                <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>
                  Incorrect password
                </div>
              )}
              <button
                onClick={handleLogin}
                style={{
                  display: 'block', width: '100%', marginTop: 16, padding: '12px 24px',
                  borderRadius: 8, border: 'none', backgroundColor: '#dc2626', color: '#0a0a0a',
                  fontSize: 16, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Login
              </button>
            </div>
          </div>
        ) : (
          /* Dashboard Content */
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333', backgroundColor: '#1a1a1a' }}>
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'gardens', label: 'Gardens', icon: Leaf },
                { id: 'verifications', label: 'Verifications', icon: CheckCircle },
                { id: 'messages', label: 'Messages', icon: MessageCircle },
                { id: 'export', label: 'Export', icon: Download },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '14px 24px', border: 'none', cursor: 'pointer',
                    backgroundColor: activeTab === tab.id ? '#0a0a0a' : 'transparent',
                    color: activeTab === tab.id ? '#dc2626' : '#999',
                    borderBottom: activeTab === tab.id ? '2px solid #dc2626' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 14
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
              {activeTab === 'overview' && (
                <div>
                  <h3 style={{ margin: '0 0 20px', color: '#dc2626' }}>System Overview</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {[
                      { label: 'Total Gardens', value: stats.totalGardens, icon: Leaf, color: '#22c55e' },
                      { label: 'Total Observations', value: stats.totalObservations.toLocaleString(), icon: Eye, color: '#3b82f6' },
                      { label: 'Pending Verifications', value: stats.pendingVerifications, icon: AlertTriangle, color: '#dc2626' },
                      { label: 'Total Messages', value: stats.messagesTotal, icon: MessageCircle, color: '#8b5cf6' },
                      { label: 'Gardens This Week', value: stats.gardensThisWeek, icon: TrendingUp, color: '#22c55e' },
                      { label: 'Obs This Week', value: stats.observationsThisWeek.toLocaleString(), icon: Calendar, color: '#3b82f6' },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20,
                        border: '1px solid #333'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <stat.icon size={20} color={stat.color} />
                          <span style={{ color: '#999', fontSize: 13 }}>{stat.label}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => { loadStats(); loadGardens(); loadMessages(); }}
                    style={{
                      marginTop: 20, padding: '10px 20px', borderRadius: 8,
                      border: '1px solid #333', backgroundColor: 'transparent',
                      color: '#999', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: 8
                    }}
                  >
                    <RefreshCw size={16} /> Refresh Data
                  </button>
                </div>
              )}

              {activeTab === 'gardens' && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Search size={16} color="#666" style={{ position: 'absolute', left: 12, top: 12 }} />
                      <input
                        type="text"
                        placeholder="Search by ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8,
                          border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white'
                        }}
                      />
                    </div>
                    <select
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      style={{
                        padding: '10px 16px', borderRadius: 8, border: '1px solid #333',
                        backgroundColor: '#1a1a1a', color: 'white'
                      }}
                    >
                      <option value="">All Cities</option>
                      {cities.map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </div>

                  <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#111111' }}>
                          <th style={{ padding: 12, textAlign: 'left', color: '#999', fontSize: 12 }}>ID</th>
                          <th style={{ padding: 12, textAlign: 'left', color: '#999', fontSize: 12 }}>City</th>
                          <th style={{ padding: 12, textAlign: 'left', color: '#999', fontSize: 12 }}>Score</th>
                          <th style={{ padding: 12, textAlign: 'left', color: '#999', fontSize: 12 }}>Tier</th>
                          <th style={{ padding: 12, textAlign: 'left', color: '#999', fontSize: 12 }}>Plants</th>
                          <th style={{ padding: 12, textAlign: 'left', color: '#999', fontSize: 12 }}>Verified</th>
                          <th style={{ padding: 12, textAlign: 'left', color: '#999', fontSize: 12 }}>Registered</th>
                          <th style={{ padding: 12, textAlign: 'left', color: '#999', fontSize: 12 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</td></tr>
                        ) : filteredGardens.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#666' }}>No gardens found</td></tr>
                        ) : filteredGardens.map(garden => (
                          <tr key={garden.id} style={{ borderTop: '1px solid #333' }}>
                            <td style={{ padding: 12, fontFamily: 'monospace' }}>{garden.anonymousId}</td>
                            <td style={{ padding: 12 }}>{garden.city}</td>
                            <td style={{ padding: 12, color: '#22c55e' }}>{garden.score}</td>
                            <td style={{ padding: 12 }}>{garden.tier}</td>
                            <td style={{ padding: 12 }}>{garden.plantCount}</td>
                            <td style={{ padding: 12 }}>
                              {garden.verificationLevel === 'professional' ? (
                                <CheckCircle size={16} color="#22c55e" />
                              ) : garden.verificationLevel === 'community' ? (
                                <CheckCircle size={16} color="#3b82f6" />
                              ) : (
                                <XCircle size={16} color="#666" />
                              )}
                            </td>
                            <td style={{ padding: 12, fontSize: 12, color: '#999' }}>
                              {new Date(garden.registeredAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: 12 }}>
                              <button
                                onClick={() => deleteGarden(garden.id)}
                                style={{
                                  padding: '6px 10px', borderRadius: 4, border: 'none',
                                  backgroundColor: '#7f1d1d', color: 'white', cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'verifications' && (
                <div>
                  <h3 style={{ margin: '0 0 20px', color: '#dc2626' }}>Pending Verifications</h3>
                  {gardens.filter(g => g.verificationLevel === 'pending').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
                      <CheckCircle size={48} color="#22c55e" style={{ marginBottom: 16 }} />
                      <div>No pending verifications</div>
                    </div>
                  ) : (
                    <div>
                      {gardens.filter(g => g.verificationLevel === 'pending').map(garden => (
                        <div key={garden.id} style={{
                          backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16,
                          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>Garden {garden.anonymousId}</div>
                            <div style={{ fontSize: 13, color: '#999' }}>{garden.city} • Score: {garden.score}</div>
                          </div>
                          <button style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer' }}>
                            Approve
                          </button>
                          <button style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#7f1d1d', color: 'white', cursor: 'pointer' }}>
                            Reject
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div>
                  <h3 style={{ margin: '0 0 20px', color: '#dc2626' }}>Recent Messages</h3>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
                      <MessageCircle size={48} style={{ marginBottom: 16 }} />
                      <div>No messages yet</div>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
                      {messages.slice(0, 50).map(msg => (
                        <div key={msg.id} style={{ padding: 16, borderBottom: '1px solid #333' }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12 }}>
                            <span style={{ color: '#22c55e' }}>{msg.from.slice(0, 6)}</span>
                            <span style={{ color: '#666' }}>→</span>
                            <span style={{ color: '#3b82f6' }}>{msg.to.slice(0, 6)}</span>
                            <span style={{ color: '#666', marginLeft: 'auto' }}>
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ color: '#ccc' }}>{msg.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'export' && (
                <div>
                  <h3 style={{ margin: '0 0 20px', color: '#dc2626' }}>Export Data</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24 }}>
                      <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Leaf size={20} color="#22c55e" /> Gardens
                      </h4>
                      <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>
                        Export all registered pollinator gardens with scores, plants, and locations.
                      </p>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => exportData('csv', 'gardens')} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                          CSV
                        </button>
                        <button onClick={() => exportData('geojson', 'gardens')} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                          GeoJSON
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24 }}>
                      <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Eye size={20} color="#3b82f6" /> Observations
                      </h4>
                      <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>
                        Export wildlife observations with species, locations, and dates.
                      </p>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => exportData('csv', 'observations')} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                          CSV
                        </button>
                        <button onClick={() => exportData('geojson', 'observations')} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                          GeoJSON
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
