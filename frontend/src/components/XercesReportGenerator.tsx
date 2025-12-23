import React, { useState } from 'react';
import { Download, FileText, ExternalLink, Check } from 'lucide-react';

interface GardenData {
  name: string;
  lat: number;
  lng: number;
  size: string;
  plants: string[];
  features: string[];
  score: number;
  tier: string;
  description?: string;
  email?: string;
}

interface XercesReportGeneratorProps {
  gardenData: GardenData;
  onClose: () => void;
}

const PLANT_INFO: Record<string, { name: string; season: string; native: boolean }> = {
  milkweed: { name: 'Milkweed (Asclepias spp.)', season: 'Summer', native: true },
  goldenrod: { name: 'Goldenrod (Solidago spp.)', season: 'Fall', native: true },
  aster: { name: 'Asters (Symphyotrichum spp.)', season: 'Fall', native: true },
  rabbitbrush: { name: 'Rabbitbrush (Chrysothamnus nauseosus)', season: 'Fall', native: true },
  agastache: { name: 'Agastache/Hyssop (Agastache spp.)', season: 'Summer-Fall', native: true },
  penstemon: { name: 'Penstemon (Penstemon spp.)', season: 'Spring-Summer', native: true },
  coneflower: { name: 'Coneflower (Echinacea spp.)', season: 'Summer', native: true },
  bee_balm: { name: 'Bee Balm (Monarda spp.)', season: 'Summer', native: false },
  lavender: { name: 'Lavender (Lavandula spp.)', season: 'Summer', native: false },
  sunflower: { name: 'Sunflower (Helianthus spp.)', season: 'Summer', native: false },
  salvia: { name: 'Salvia (Salvia spp.)', season: 'Summer', native: false },
  clover: { name: 'Clover (Trifolium spp.)', season: 'Spring-Summer', native: false },
  herbs: { name: 'Flowering Herbs', season: 'Summer', native: false },
};

const FEATURE_INFO: Record<string, string> = {
  water: 'Water source (shallow dish, birdbath)',
  bare_ground: 'Bare ground patches for ground-nesting bees',
  brush_pile: 'Brush or log pile for cavity nesters',
  bee_hotel: 'Bee hotel or nesting blocks',
  undisturbed: 'Undisturbed natural area',
  trees: 'Trees and/or shrubs',
  no_pesticides: 'Pesticide-free management',
  native_majority: '50%+ native plant species',
  mulch_leaves: 'Leaf litter or natural mulch',
};

const XercesReportGenerator: React.FC<XercesReportGeneratorProps> = ({ gardenData, onClose }) => {
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState<'html' | 'txt'>('html');

  const generateHTMLReport = () => {
    const plantRows = gardenData.plants.map(p => {
      const info = PLANT_INFO[p];
      if (!info) return '';
      return `<tr><td style="padding:8px;border:1px solid #ddd">${info.name}</td><td style="padding:8px;border:1px solid #ddd">${info.season}</td><td style="padding:8px;border:1px solid #ddd">${info.native ? 'Native' : 'Non-native'}</td></tr>`;
    }).join('');

    const featureItems = gardenData.features.map(f => {
      const info = FEATURE_INFO[f];
      return info ? `<li>${info}</li>` : '';
    }).join('');

    const nativeCount = gardenData.plants.filter(p => PLANT_INFO[p]?.native).length;
    const fallCount = gardenData.plants.filter(p => PLANT_INFO[p]?.season.includes('Fall')).length;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pollinator Habitat - ${gardenData.name}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px}h1{color:#166534;border-bottom:3px solid #22c55e}h2{color:#166534;margin-top:30px}.header{background:#f0fdf4;padding:15px;border-radius:8px;margin-bottom:20px}.score{background:linear-gradient(135deg,#ecfdf5,#d1fae5);padding:20px;border-radius:12px;text-align:center;margin:20px 0}.score-num{font-size:48px;font-weight:bold;color:#166534}.tier{font-size:24px;color:#15803d}table{width:100%;border-collapse:collapse;margin:15px 0}th{background:#166534;color:white;padding:10px;text-align:left}.section{background:#fafafa;padding:15px;border-radius:8px;margin:15px 0}.note{background:#fef3c7;padding:15px;border-radius:8px;border-left:4px solid #f59e0b;margin:20px 0}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#666}</style></head>
<body><h1>Pollinator Habitat Assessment Report</h1>
<div class="header"><strong>Site:</strong> ${gardenData.name}<br><strong>Location:</strong> ${gardenData.lat.toFixed(5)}N, ${Math.abs(gardenData.lng).toFixed(5)}W<br><strong>Size:</strong> ${gardenData.size}<br><strong>Date:</strong> ${new Date().toLocaleDateString()}<br><strong>Region:</strong> Wasatch Front, Utah</div>
<div class="score"><div class="score-num">${gardenData.score} points</div><div class="tier">${gardenData.tier}</div></div>
<h2>Score Breakdown</h2><div class="section"><p>Methodology based on Xerces Society guidelines.</p><table><tr><th>Category</th><th>Weight</th><th>Notes</th></tr><tr><td style="padding:8px;border:1px solid #ddd">Floral Resources</td><td style="padding:8px;border:1px solid #ddd">35%</td><td style="padding:8px;border:1px solid #ddd">${gardenData.plants.length} species</td></tr><tr><td style="padding:8px;border:1px solid #ddd">Nesting Sites</td><td style="padding:8px;border:1px solid #ddd">30%</td><td style="padding:8px;border:1px solid #ddd">${gardenData.features.length} features</td></tr><tr><td style="padding:8px;border:1px solid #ddd">Habitat Quality</td><td style="padding:8px;border:1px solid #ddd">15%</td><td style="padding:8px;border:1px solid #ddd">${gardenData.features.includes('no_pesticides') ? 'Pesticide-free' : ''}</td></tr><tr><td style="padding:8px;border:1px solid #ddd">Connectivity</td><td style="padding:8px;border:1px solid #ddd">20%</td><td style="padding:8px;border:1px solid #ddd">Location-based</td></tr></table></div>
<h2>Floral Resources</h2><div class="section"><p><strong>Total:</strong> ${gardenData.plants.length} | <strong>Native:</strong> ${nativeCount} | <strong>Fall Bloomers:</strong> ${fallCount}</p>${gardenData.plants.length > 0 ? `<table><tr><th>Species</th><th>Season</th><th>Origin</th></tr>${plantRows}</table>` : '<p>No plants selected</p>'}</div>
<h2>Habitat Features</h2><div class="section">${gardenData.features.length > 0 ? `<ul>${featureItems}</ul>` : '<p>No features selected</p>'}</div>
<div class="note"><strong>Xerces Society Submission</strong><br>Visit <a href="https://xerces.org/pollinator-conservation">xerces.org/pollinator-conservation</a> to:<br>1. Sign the Pollinator Protection Pledge<br>2. Register with Million Pollinator Garden Challenge<br>3. Explore Bee City USA certification</div>
<div class="footer"><p><strong>Utah Pollinator Path</strong> - utah-pollinator-path.onrender.com</p></div></body></html>`;
  };

  const generateTextReport = () => {
    const plantList = gardenData.plants.map(p => {
      const info = PLANT_INFO[p];
      return info ? `  - ${info.name} (${info.season})` : '';
    }).join('\n');

    const featureList = gardenData.features.map(f => {
      const info = FEATURE_INFO[f];
      return info ? `  - ${info}` : '';
    }).join('\n');

    return `POLLINATOR HABITAT ASSESSMENT
=============================
Site: ${gardenData.name}
Location: ${gardenData.lat.toFixed(5)}N, ${Math.abs(gardenData.lng).toFixed(5)}W
Size: ${gardenData.size}
Date: ${new Date().toLocaleDateString()}

SCORE: ${gardenData.score} points
TIER: ${gardenData.tier}

PLANTS (${gardenData.plants.length}):
${plantList || '  None selected'}

FEATURES:
${featureList || '  None selected'}

---
Visit xerces.org/pollinator-conservation to register
Generated by Utah Pollinator Path`;
  };

  const handleDownload = () => {
    setGenerating(true);
    setTimeout(() => {
      const content = format === 'html' ? generateHTMLReport() : generateTextReport();
      const filename = `pollinator-report-${gardenData.name.toLowerCase().replace(/\s+/g, '-')}.${format}`;
      const blob = new Blob([content], { type: format === 'html' ? 'text/html' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
    }, 300);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ backgroundColor: 'white', borderRadius: 16, maxWidth: 450, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={24} color="#166534" />
            <h2 style={{ margin: 0, fontSize: 18 }}>Generate Xerces Report</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#666' }}>x</button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#166534' }}>{gardenData.score} pts</div>
            <div style={{ color: '#15803d', fontWeight: 600 }}>{gardenData.tier}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{gardenData.name}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Report Format</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setFormat('html')} style={{ flex: 1, padding: 12, borderRadius: 8, border: format === 'html' ? '2px solid #166534' : '1px solid #ddd', background: format === 'html' ? '#f0fdf4' : 'white', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600 }}>HTML Report</div>
                <div style={{ fontSize: 11, color: '#666' }}>Printable</div>
              </button>
              <button onClick={() => setFormat('txt')} style={{ flex: 1, padding: 12, borderRadius: 8, border: format === 'txt' ? '2px solid #166534' : '1px solid #ddd', background: format === 'txt' ? '#f0fdf4' : 'white', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600 }}>Plain Text</div>
                <div style={{ fontSize: 11, color: '#666' }}>Copyable</div>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20, fontSize: 12, color: '#666' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Check size={14} color="#22c55e" /> Habitat score breakdown</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Check size={14} color="#22c55e" /> Plant species inventory</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Check size={14} color="#22c55e" /> Xerces submission links</div>
          </div>

          <button onClick={handleDownload} disabled={generating} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#166534', color: 'white', fontSize: 15, fontWeight: 600, cursor: generating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <Download size={18} />
            {generating ? 'Generating...' : 'Download Report'}
          </button>

          <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, fontSize: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#92400e' }}>Submit to Xerces Society</div>
            <a href="https://xerces.org/pollinator-conservation" target="_blank" rel="noopener noreferrer" style={{ color: '#92400e', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <ExternalLink size={12} /> Pollinator Protection Pledge
            </a>
            <a href="https://beecityusa.org" target="_blank" rel="noopener noreferrer" style={{ color: '#92400e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ExternalLink size={12} /> Bee City USA Program
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XercesReportGenerator;
