import React, { useState } from 'react';
import { Download, Share2, FileText, Table, X, Check, Users, ExternalLink } from 'lucide-react';

interface QuickActionsProps {
  filteredCount: number;
  totalCount: number;
  gardenCount: number;
  wildlifeFeatures: any[];
  selectedSpecies: string | null;
  selectedCity: string | null;
  userGardenId?: string;
  onShowRecruitment?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  filteredCount,
  totalCount,
  gardenCount,
  wildlifeFeatures,
  selectedSpecies,
  selectedCity,
  userGardenId,
  onShowRecruitment
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const exportGeoJSON = () => {
    setDownloading(true);
    const data = {
      type: 'FeatureCollection',
      generated: new Date().toISOString(),
      source: 'Utah Pollinator Path',
      filters: { species: selectedSpecies, city: selectedCity },
      stats: { total: filteredCount, gardens: gardenCount },
      features: wildlifeFeatures,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utah-pollinator-path-${filteredCount}-observations.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
    setShowExportMenu(false);
  };

  const exportCSV = () => {
    setDownloading(true);
    const headers = ['species', 'common_name', 'latitude', 'longitude', 'year', 'month', 'taxon', 'source'];
    const rows = wildlifeFeatures.map(f => {
      const p = f.properties || {};
      const c = f.geometry?.coordinates || [0, 0];
      return [
        p.species || '',
        p.common_name || '',
        c[1] || '',
        c[0] || '',
        p.year || '',
        p.month || '',
        p.iconic_taxon || '',
        p.source || 'iNaturalist'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utah-pollinator-path-${filteredCount}-observations.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
    setShowExportMenu(false);
  };

  const downloadFullDataset = (format: 'json' | 'csv') => {
    const url = format === 'json' ? '/api/downloads/full-json' : '/api/downloads/full-csv';
    window.open(url, '_blank');
    setShowExportMenu(false);
  };

  const copyShareLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const nativeShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Utah Pollinator Path',
          text: 'Explore pollinator habitats along the Wasatch Front!',
          url: window.location.href,
        });
      } catch (e) { /* User cancelled */ }
    }
    setShowShareMenu(false);
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Explore pollinator habitats along Utah\'s Wasatch Front!')}&url=${encodeURIComponent(window.location.href)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;

  return (
    <>
      {/* Floating Action Buttons */}
      <div style={{
        position: 'absolute',
        bottom: 100,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 100
      }}>
        <button
          onClick={() => { setShowExportMenu(!showExportMenu); setShowShareMenu(false); }}
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none',
            backgroundColor: showExportMenu ? '#166534' : '#22c55e',
            color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
          title="Export Data"
        >
          <Download size={22} />
        </button>

        <button
          onClick={() => { setShowShareMenu(!showShareMenu); setShowExportMenu(false); }}
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none',
            backgroundColor: showShareMenu ? '#7c3aed' : '#8b5cf6',
            color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
          title="Share"
        >
          <Share2 size={22} />
        </button>

        {userGardenId && onShowRecruitment && (
          <button
            onClick={onShowRecruitment}
            style={{
              width: 48, height: 48, borderRadius: '50%', border: 'none',
              backgroundColor: '#f59e0b', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Invite Neighbors"
          >
            <Users size={22} />
          </button>
        )}
      </div>

      {/* Export Menu */}
      {showExportMenu && (
        <div style={{
          position: 'absolute', bottom: 160, right: 80,
          backgroundColor: 'white', borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          padding: 16, width: 280, zIndex: 101
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Export Data</h3>
            <button onClick={() => setShowExportMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} color="#666" />
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>
              CURRENT VIEW ({filteredCount.toLocaleString()} observations)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={exportGeoJSON} disabled={downloading} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #22c55e',
                backgroundColor: 'white', color: '#166534', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13
              }}>
                <FileText size={16} /> GeoJSON
              </button>
              <button onClick={exportCSV} disabled={downloading} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #22c55e',
                backgroundColor: 'white', color: '#166534', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13
              }}>
                <Table size={16} /> CSV
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 8 }}>
              FULL UTAH DATASET (311k observations)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => downloadFullDataset('json')} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                backgroundColor: '#22c55e', color: 'white', cursor: 'pointer', fontSize: 12
              }}>
                GeoJSON (~10MB)
              </button>
              <button onClick={() => downloadFullDataset('csv')} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                backgroundColor: '#22c55e', color: 'white', cursor: 'pointer', fontSize: 12
              }}>
                CSV (~5MB)
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#166534', marginTop: 8, textAlign: 'center' }}>
              For academic use: cite "Utah Pollinator Path"
            </div>
          </div>
        </div>
      )}

      {/* Share Menu */}
      {showShareMenu && (
        <div style={{
          position: 'absolute', bottom: 110, right: 80,
          backgroundColor: 'white', borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          padding: 16, width: 260, zIndex: 101
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Share</h3>
            <button onClick={() => setShowShareMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} color="#666" />
            </button>
          </div>

          <button onClick={copyShareLink} style={{
            width: '100%', padding: '12px', borderRadius: 8,
            border: '1px solid #8b5cf6',
            backgroundColor: copied ? '#8b5cf6' : 'white',
            color: copied ? 'white' : '#8b5cf6',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, fontSize: 14, marginBottom: 8
          }}>
            {copied ? <Check size={18} /> : <ExternalLink size={18} />}
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button onClick={nativeShare} style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              backgroundColor: '#8b5cf6', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, fontSize: 14, marginBottom: 8
            }}>
              <Share2 size={18} /> Share via...
            </button>
          )}

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Share on:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" style={{
                flex: 1, padding: '8px', borderRadius: 6, backgroundColor: '#1DA1F2',
                color: 'white', textDecoration: 'none', textAlign: 'center', fontSize: 12
              }}>
                Twitter
              </a>
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" style={{
                flex: 1, padding: '8px', borderRadius: 6, backgroundColor: '#4267B2',
                color: 'white', textDecoration: 'none', textAlign: 'center', fontSize: 12
              }}>
                Facebook
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickActions;
