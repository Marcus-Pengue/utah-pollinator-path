import React, { useState, useEffect } from 'react';
import { Users, MapPin, Send, MessageCircle, ChevronRight, Shield, Leaf, X, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';

interface NearbyGarden {
  id: string;
  anonymousId: string;
  distance: number;
  tier: string;
  score: number;
  plantCount: number;
  verified: boolean;
  registeredAt: string;
  city: string;
  approxLat: number;
  approxLng: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NeighborDiscoveryProps {
  gardenId: string;
  gardenLat: number;
  gardenLng: number;
  isDiscoverable: boolean;
  onToggleDiscoverable: (value: boolean) => void;
}

const TIER_COLORS: Record<string, string> = {
  'Seedling': '#a3e635',
  'Sprout': '#22c55e',
  'Blooming': '#3b82f6',
  'Thriving': '#8b5cf6',
  'Champion': '#f59e0b',
};

const NeighborDiscovery: React.FC<NeighborDiscoveryProps> = ({
  gardenId, gardenLat, gardenLng, isDiscoverable, onToggleDiscoverable
}) => {
  const [nearbyGardens, setNearbyGardens] = useState<NearbyGarden[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNeighbor, setSelectedNeighbor] = useState<NearbyGarden | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'nearby' | 'messages'>('nearby');
  const [radius, setRadius] = useState(2);

  useEffect(() => {
    loadNearbyGardens();
    loadMessages();
  }, [gardenId, radius]);

  const loadNearbyGardens = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/gardens/nearby?lat=${gardenLat}&lng=${gardenLng}&radius=${radius}&exclude=${gardenId}`);
      setNearbyGardens(res.data.gardens || []);
    } catch (err) {
      console.error('Failed to load nearby gardens:', err);
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    try {
      const res = await api.get(`/api/messages?garden_id=${gardenId}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!selectedNeighbor || !newMessage.trim()) return;
    setSending(true);
    try {
      await api.post('/api/messages', {
        from: gardenId,
        to: selectedNeighbor.id,
        message: newMessage.trim()
      });
      setNewMessage('');
      loadMessages();
      setSelectedNeighbor(null);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
    setSending(false);
  };

  const unreadCount = messages.filter(m => m.to === gardenId && !m.read).length;

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with privacy toggle */}
      <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} color="#22c55e" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>Neighbor Network</span>
          </div>
          <button
            onClick={() => onToggleDiscoverable(!isDiscoverable)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 6, border: 'none',
              backgroundColor: isDiscoverable ? '#dcfce7' : '#f3f4f6',
              color: isDiscoverable ? '#166534' : '#666',
              cursor: 'pointer', fontSize: 12
            }}
          >
            {isDiscoverable ? <Eye size={14} /> : <EyeOff size={14} />}
            {isDiscoverable ? 'Visible' : 'Hidden'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>
          {isDiscoverable 
            ? 'Your garden is visible to nearby neighbors (anonymous ID only)'
            : 'Your garden is hidden from neighbor discovery'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('nearby')}
          style={{
            flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
            backgroundColor: activeTab === 'nearby' ? 'white' : '#f9fafb',
            borderBottom: activeTab === 'nearby' ? '2px solid #22c55e' : '2px solid transparent',
            fontWeight: activeTab === 'nearby' ? 600 : 400,
            color: activeTab === 'nearby' ? '#22c55e' : '#666'
          }}
        >
          <MapPin size={14} style={{ display: 'inline', marginRight: 6 }} />
          Nearby ({nearbyGardens.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          style={{
            flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
            backgroundColor: activeTab === 'messages' ? 'white' : '#f9fafb',
            borderBottom: activeTab === 'messages' ? '2px solid #22c55e' : '2px solid transparent',
            fontWeight: activeTab === 'messages' ? 600 : 400,
            color: activeTab === 'messages' ? '#22c55e' : '#666',
            position: 'relative'
          }}
        >
          <MessageCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
          Messages
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 8, right: 20,
              backgroundColor: '#ef4444', color: 'white',
              borderRadius: '50%', width: 18, height: 18,
              fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'nearby' && (
          <div>
            {/* Radius selector */}
            <div style={{ padding: 12, backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: 11, color: '#666', marginRight: 8 }}>Search radius:</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
              >
                <option value={0.5}>500m</option>
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
              </select>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</div>
            ) : nearbyGardens.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Users size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
                <div style={{ color: '#666', marginBottom: 4 }}>No neighbors found nearby</div>
                <div style={{ fontSize: 12, color: '#999' }}>Try increasing the search radius</div>
              </div>
            ) : (
              <div>
                {nearbyGardens.map(garden => (
                  <div
                    key={garden.id}
                    style={{
                      padding: 12, borderBottom: '1px solid #f3f4f6',
                      display: 'flex', alignItems: 'center', gap: 12
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      backgroundColor: TIER_COLORS[garden.tier] || '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: 14
                    }}>
                      {garden.anonymousId.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Garden {garden.anonymousId}</span>
                        {garden.verified && <Shield size={12} color="#3b82f6" />}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{formatDistance(garden.distance)} away</span>
                        <span>•</span>
                        <span style={{ color: TIER_COLORS[garden.tier] }}>{garden.tier}</span>
                        <span>•</span>
                        <span><Leaf size={10} style={{ display: 'inline' }} /> {garden.plantCount}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNeighbor(garden)}
                      style={{
                        padding: '8px 12px', borderRadius: 6, border: 'none',
                        backgroundColor: '#22c55e', color: 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
                      }}
                    >
                      <Send size={12} /> Message
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            {messages.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <MessageCircle size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
                <div style={{ color: '#666' }}>No messages yet</div>
                <div style={{ fontSize: 12, color: '#999' }}>Start a conversation with a neighbor!</div>
              </div>
            ) : (
              <div>
                {messages.map(msg => {
                  const isIncoming = msg.to === gardenId;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        padding: 12, borderBottom: '1px solid #f3f4f6',
                        backgroundColor: !msg.read && isIncoming ? '#f0fdf4' : 'white'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: 10,
                          backgroundColor: isIncoming ? '#dcfce7' : '#e0e7ff',
                          color: isIncoming ? '#166534' : '#3730a3'
                        }}>
                          {isIncoming ? 'From' : 'To'}: {isIncoming ? msg.from.slice(0, 6).toUpperCase() : msg.to.slice(0, 6).toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, color: '#999' }}>{formatTime(msg.timestamp)}</span>
                        {!msg.read && isIncoming && (
                          <span style={{
                            padding: '2px 6px', borderRadius: 4, fontSize: 9,
                            backgroundColor: '#fef3c7', color: '#92400e'
                          }}>New</span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, color: '#374151' }}>{msg.message}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message compose modal */}
      {selectedNeighbor && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 400,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: 16, borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>Message to Garden {selectedNeighbor.anonymousId}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{formatDistance(selectedNeighbor.distance)} away</div>
              </div>
              <button onClick={() => setSelectedNeighbor(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} color="#666" />
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Introduce yourself, share tips, or coordinate planting..."
                maxLength={500}
                style={{
                  width: '100%', height: 120, padding: 12, borderRadius: 8,
                  border: '1px solid #ddd', fontSize: 14, resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ fontSize: 11, color: '#999', textAlign: 'right', marginTop: 4 }}>
                {newMessage.length}/500
              </div>
              <div style={{ 
                marginTop: 12, padding: 10, backgroundColor: '#fef3c7', 
                borderRadius: 8, fontSize: 11, color: '#92400e' 
              }}>
                <strong>Privacy note:</strong> Your message will be sent anonymously using your garden ID only.
              </div>
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12 }}>
              <button
                onClick={() => setSelectedNeighbor(null)}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd',
                  backgroundColor: 'white', cursor: 'pointer', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, border: 'none',
                  backgroundColor: '#22c55e', color: 'white', cursor: 'pointer',
                  fontWeight: 600, opacity: !newMessage.trim() || sending ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <Send size={16} />
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeighborDiscovery;
