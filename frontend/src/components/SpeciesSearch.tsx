import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

interface Feature {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, any>;
}

interface SpeciesSearchProps {
  features: Feature[];
  onSelectSpecies: (species: string | null) => void;
  onFlyTo: (lat: number, lng: number) => void;
  selectedSpecies: string | null;
}

const getTaxonIcon = (taxon: string) => {
  const icons: Record<string, string> = {
    'Aves': '🐦', 'Insecta': '🦋', 'Plantae': '🌿', 'Mammalia': '🦊',
    'Fungi': '🍄', 'Arachnida': '🕷️', 'Reptilia': '🦎', 'Amphibia': '🐸',
  };
  return icons[taxon] || '📍';
};

const SpeciesSearch: React.FC<SpeciesSearchProps> = ({ features, onSelectSpecies, onFlyTo, selectedSpecies }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const speciesIndex = useMemo(() => {
    const index: Record<string, { count: number; scientific: string; taxon: string; coords: [number, number][] }> = {};
    features.forEach(f => {
      const props = f.properties || {};
      const name = props.species || props.common_name;
      if (!name) return;
      const key = name.toLowerCase();
      if (!index[key]) {
        index[key] = { count: 0, scientific: props.scientific_name || '', taxon: props.iconic_taxon || 'Unknown', coords: [] };
      }
      index[key].count++;
      index[key].coords.push(f.geometry.coordinates as [number, number]);
    });
    return index;
  }, [features]);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return Object.entries(speciesIndex)
      .filter(([name, data]) => name.includes(q) || data.scientific.toLowerCase().includes(q))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([name, data]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), ...data }));
  }, [query, speciesIndex]);

  const handleSelect = (species: string, coords: [number, number][]) => {
    onSelectSpecies(species.toLowerCase());
    setIsOpen(false);
    if (coords.length > 0) {
      const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      onFlyTo(avgLat, avgLng);
    }
  };

  const clearSelection = () => { onSelectSpecies(null); setQuery(''); };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', padding: '8px 12px', width: 280 }}>
        <Search size={18} color="#888" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search species (Monarch, Milkweed...)"
          style={{ flex: 1, border: 'none', outline: 'none', padding: '4px 10px', fontSize: 13, backgroundColor: 'transparent' }}
        />
        {(query || selectedSpecies) && (
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={16} color="#888" />
          </button>
        )}
      </div>

      {selectedSpecies && (
        <div style={{ marginTop: 8, padding: '6px 12px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>{getTaxonIcon(speciesIndex[selectedSpecies]?.taxon || '')}</span>
          <span>{selectedSpecies.charAt(0).toUpperCase() + selectedSpecies.slice(1)}</span>
          <span style={{ opacity: 0.8 }}>({speciesIndex[selectedSpecies]?.count || 0})</span>
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <X size={14} color="white" />
          </button>
        </div>
      )}

      {isOpen && query.length >= 2 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxHeight: 400, overflowY: 'auto', zIndex: 1000 }}>
          {results.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#888', fontSize: 13 }}>No species found</div>
          ) : (
            results.map((r, i) => (
              <div
                key={i}
                onClick={() => handleSelect(r.name, r.coords)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid #eee' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                <span style={{ fontSize: 20 }}>{getTaxonIcon(r.taxon)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</div>
                  {r.scientific && <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>{r.scientific}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8b5cf6' }}>{r.count.toLocaleString()}</div>
                  <div style={{ fontSize: 9, color: '#888' }}>obs</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isOpen && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setIsOpen(false)} />}
    </div>
  );
};

export default SpeciesSearch;
