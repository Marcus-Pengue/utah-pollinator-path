import React, { useState, useMemo } from 'react';
import { Users, Share2, Copy, Check, Mail, Gift, MapPin, Trophy, ChevronDown, ChevronUp } from 'lucide-react';

interface NeighborRecruitmentProps {
  gardenId: string;
  gardenName: string;
  gardenLat: number;
  gardenLng: number;
  referralCode: string;
  referralCount: number;
  neighborGardens: NeighborGarden[];
  onInviteSent?: (method: string) => void;
}

interface NeighborGarden {
  anonymousId: string;
  distance: number; // meters
  tier: string;
  score: number;
  isReferral: boolean; // Did this garden owner recruit them?
}

// Referral bonus structure
const REFERRAL_BONUSES = {
  firstNeighbor: 50,      // First neighbor recruited
  perNeighbor: 25,        // Each additional neighbor
  clusterBonus: 100,      // 5+ gardens within 500m
  streetBonus: 75,        // 3+ gardens on same street
  championReferred: 50,   // Referred garden reaches "Champion" tier
};

const NeighborRecruitment: React.FC<NeighborRecruitmentProps> = ({
  gardenId,
  gardenName,
  gardenLat,
  gardenLng,
  referralCode,
  referralCount,
  neighborGardens,
  onInviteSent
}) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailsSent, setEmailsSent] = useState<string[]>([]);
  const [showNeighbors, setShowNeighbors] = useState(false);

  // Generate invite link
  const inviteLink = `https://utah-pollinator-path.onrender.com/?ref=${referralCode}`;
  
  // Calculate referral stats
  const referralStats = useMemo(() => {
    const referredGardens = neighborGardens.filter(g => g.isReferral);
    const gardensWithin500m = neighborGardens.filter(g => g.distance <= 500);
    const hasCluster = gardensWithin500m.length >= 5;
    
    let totalBonus = 0;
    if (referredGardens.length > 0) {
      totalBonus += REFERRAL_BONUSES.firstNeighbor;
      totalBonus += (referredGardens.length - 1) * REFERRAL_BONUSES.perNeighbor;
    }
    if (hasCluster) {
      totalBonus += REFERRAL_BONUSES.clusterBonus;
    }
    const championsReferred = referredGardens.filter(g => g.tier === 'Pollinator Champion').length;
    totalBonus += championsReferred * REFERRAL_BONUSES.championReferred;

    return {
      referredCount: referredGardens.length,
      gardensNearby: gardensWithin500m.length,
      hasCluster,
      totalBonus,
      championsReferred,
    };
  }, [neighborGardens]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onInviteSent?.('copy');
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = inviteLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Utah Pollinator Path!',
          text: `I registered my pollinator garden and earned ${referralStats.totalBonus} points! Join me in creating pollinator corridors across Utah.`,
          url: inviteLink,
        });
        onInviteSent?.('native');
      } catch (err) {
        // User cancelled or error
      }
    }
  };

  const sendEmailInvite = () => {
    if (!emailInput.trim()) return;
    
    const subject = encodeURIComponent('Join me on Utah Pollinator Path! 🦋');
    const body = encodeURIComponent(`Hi neighbor!

I just registered my pollinator garden on Utah Pollinator Path - a community project to create wildlife corridors across the Wasatch Front.

Did you know that 84.5% of pollinators face a nectar shortage in September? By planting fall-blooming natives like goldenrod and asters, we can help Utah's 900+ native bee species thrive.

Join me and register your garden:
${inviteLink}

It only takes 2 minutes, and you'll:
✓ Get a habitat score based on Xerces Society methodology
✓ See wildlife observations near your property
✓ Connect to the neighborhood pollinator network
✓ Earn bonus points for having neighbors nearby!

Let's build a pollinator corridor on our street! 🌻🐝

- Your neighbor`);
    
    window.open(`mailto:${emailInput}?subject=${subject}&body=${body}`);
    setEmailsSent([...emailsSent, emailInput]);
    setEmailInput('');
    onInviteSent?.('email');
  };

  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case 'Pollinator Champion': return '🏆';
      case 'Habitat Hero': return '🦸';
      case 'Bee Friendly': return '🐝';
      case 'Growing': return '🌱';
      default: return '🌰';
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        padding: 16,
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={24} />
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Grow Your Pollinator Network</h3>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
              Invite neighbors to multiply your impact
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Stats Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 8,
          marginBottom: 16
        }}>
          <div style={{
            backgroundColor: '#f5f3ff',
            padding: 12,
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>
              {referralStats.referredCount}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Neighbors Recruited</div>
          </div>
          <div style={{
            backgroundColor: '#ecfdf5',
            padding: 12,
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>
              {referralStats.gardensNearby}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Gardens Within 500m</div>
          </div>
          <div style={{
            backgroundColor: '#fef3c7',
            padding: 12,
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>
              +{referralStats.totalBonus}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Bonus Points</div>
          </div>
        </div>

        {/* Cluster Progress */}
        {referralStats.gardensNearby < 5 && (
          <div style={{
            backgroundColor: '#f0f9ff',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', marginBottom: 6 }}>
              🎯 Cluster Bonus Progress
            </div>
            <div style={{ 
              height: 8, 
              backgroundColor: '#e0f2fe', 
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 4
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (referralStats.gardensNearby / 5) * 100)}%`,
                backgroundColor: '#0284c7',
                borderRadius: 4,
                transition: 'width 0.3s'
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#0369a1' }}>
              {5 - referralStats.gardensNearby} more gardens needed for +{REFERRAL_BONUSES.clusterBonus} cluster bonus!
            </div>
          </div>
        )}

        {referralStats.hasCluster && (
          <div style={{
            backgroundColor: '#dcfce7',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Trophy size={20} color="#15803d" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                Pollinator Cluster Achieved! 🎉
              </div>
              <div style={{ fontSize: 11, color: '#166534' }}>
                5+ gardens within 500m creates optimal habitat connectivity
              </div>
            </div>
          </div>
        )}

        {/* Share Section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Share Your Invite Link
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: 8,
            marginBottom: 8
          }}>
            <div style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: '#f3f4f6',
              borderRadius: 8,
              fontSize: 12,
              color: '#374151',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {inviteLink}
            </div>
            <button
              onClick={copyLink}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: copied ? '#22c55e' : '#8b5cf6',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background-color 0.2s'
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Native Share (mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={shareNative}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #8b5cf6',
                backgroundColor: 'white',
                color: '#8b5cf6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 8
              }}
            >
              <Share2 size={18} />
              Share via...
            </button>
          )}
        </div>

        {/* Email Invite */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            <Mail size={14} style={{ display: 'inline', marginRight: 4 }} />
            Email a Neighbor
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="neighbor@email.com"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14
              }}
            />
            <button
              onClick={sendEmailInvite}
              disabled={!emailInput.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: emailInput.trim() ? '#8b5cf6' : '#d1d5db',
                color: 'white',
                cursor: emailInput.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 500
              }}
            >
              Send
            </button>
          </div>
          {emailsSent.length > 0 && (
            <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
              ✓ Invites sent to: {emailsSent.join(', ')}
            </div>
          )}
        </div>

        {/* Referral Bonuses Info */}
        <div 
          style={{ 
            backgroundColor: '#faf5ff',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 16
          }}
        >
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              width: '100%',
              padding: 12,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gift size={16} color="#7c3aed" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
                Referral Bonus Structure
              </span>
            </div>
            {showDetails ? <ChevronUp size={16} color="#7c3aed" /> : <ChevronDown size={16} color="#7c3aed" />}
          </button>
          
          {showDetails && (
            <div style={{ padding: '0 12px 12px', fontSize: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>First neighbor recruited</span>
                  <span style={{ fontWeight: 600, color: '#7c3aed' }}>+{REFERRAL_BONUSES.firstNeighbor} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Each additional neighbor</span>
                  <span style={{ fontWeight: 600, color: '#7c3aed' }}>+{REFERRAL_BONUSES.perNeighbor} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>5+ gardens cluster bonus</span>
                  <span style={{ fontWeight: 600, color: '#7c3aed' }}>+{REFERRAL_BONUSES.clusterBonus} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Referred garden reaches Champion</span>
                  <span style={{ fontWeight: 600, color: '#7c3aed' }}>+{REFERRAL_BONUSES.championReferred} pts</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nearby Gardens List */}
        {neighborGardens.length > 0 && (
          <div>
            <button
              onClick={() => setShowNeighbors(!showNeighbors)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} color="#6b7280" />
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  Nearby Gardens ({neighborGardens.length})
                </span>
              </div>
              {showNeighbors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showNeighbors && (
              <div style={{ 
                marginTop: 8, 
                maxHeight: 200, 
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: 8
              }}>
                {neighborGardens
                  .sort((a, b) => a.distance - b.distance)
                  .map((garden, i) => (
                    <div
                      key={garden.anonymousId}
                      style={{
                        padding: 10,
                        borderBottom: i < neighborGardens.length - 1 ? '1px solid #f3f4f6' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>
                          {getTierEmoji(garden.tier)} Habitat {garden.anonymousId}
                          {garden.isReferral && (
                            <span style={{
                              marginLeft: 6,
                              fontSize: 9,
                              padding: '2px 4px',
                              backgroundColor: '#ddd6fe',
                              color: '#7c3aed',
                              borderRadius: 4
                            }}>
                              YOUR REFERRAL
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>
                          {garden.distance < 1000 
                            ? `${Math.round(garden.distance)}m away`
                            : `${(garden.distance / 1000).toFixed(1)}km away`
                          }
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600,
                        color: '#059669'
                      }}>
                        {garden.score} pts
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {neighborGardens.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 20,
            backgroundColor: '#f9fafb',
            borderRadius: 8
          }}>
            <Users size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              No gardens nearby yet
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              Be the first to start a pollinator cluster in your neighborhood!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NeighborRecruitment;
