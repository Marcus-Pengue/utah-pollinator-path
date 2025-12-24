import React, { useState, useMemo } from 'react';
import { REBATE_PROGRAMS, RebateProgram } from '../config';
import RebateApplication from './RebateApplication';
import { DollarSign, Droplets, Leaf, ExternalLink, MapPin, CheckCircle, ChevronDown, ChevronUp, Calculator, AlertCircle } from 'lucide-react';

export interface Rebate {
  id: string;
  name: string;
  provider: string;
  type: 'water' | 'plant' | 'landscape' | 'equipment';
  description: string;
  amount: string;
  maxAmount?: number;
  requirements: string[];
  eligibleAreas: string[];
  url: string;
  phone?: string;
  popular?: boolean;
}

interface RebateFinderProps {
  userCity?: string;
  gardenSize?: string;
}

const UTAH_REBATES: Rebate[] = [
  {
    id: 'slc-flip-strip',
    name: 'Flip Your Strip',
    provider: 'Salt Lake City Public Utilities',
    type: 'landscape',
    description: 'Convert park strips from grass to water-wise landscaping. Get $1.25 per square foot.',
    amount: '$1.25/sq ft',
    maxAmount: 1250,
    requirements: ['Salt Lake City water customer', 'Park strip at least 100 sq ft', 'Pre-approval required'],
    eligibleAreas: ['Salt Lake City'],
    url: 'https://www.slc.gov/utilities/conservation/flip-your-strip/',
    phone: '801-483-6860',
    popular: true
  },
  {
    id: 'jordan-valley-localscapes',
    name: 'Localscapes Rebate',
    provider: 'Jordan Valley Water Conservancy District',
    type: 'landscape',
    description: 'Up to $1.00 per square foot for converting lawn to water-efficient landscaping.',
    amount: 'Up to $1.00/sq ft',
    maxAmount: 3000,
    requirements: ['Jordan Valley service area', 'Complete workshop first', 'Minimum 200 sq ft'],
    eligibleAreas: ['West Jordan', 'South Jordan', 'Riverton', 'Herriman', 'Sandy', 'Murray', 'Taylorsville', 'West Valley City'],
    url: 'https://jvwcd.org/rebates',
    popular: true
  },
  {
    id: 'weber-basin-turf',
    name: 'Turf Replacement Rebate',
    provider: 'Weber Basin Water Conservancy District',
    type: 'landscape',
    description: 'Replace grass with water-wise landscaping and receive up to $1.50 per square foot.',
    amount: 'Up to $1.50/sq ft',
    maxAmount: 3000,
    requirements: ['Weber Basin service area', 'Minimum 100 sq ft', 'Attend workshop'],
    eligibleAreas: ['Ogden', 'Layton', 'Kaysville', 'Farmington', 'Bountiful'],
    url: 'https://weberbasin.com/Conservation/Rebates'
  },
  {
    id: 'slc-smart-controller',
    name: 'Smart Irrigation Controller Rebate',
    provider: 'Salt Lake City Public Utilities',
    type: 'equipment',
    description: 'Get up to $150 back for a WaterSense-labeled smart irrigation controller.',
    amount: 'Up to $150',
    maxAmount: 150,
    requirements: ['Salt Lake City water customer', 'WaterSense certified controller'],
    eligibleAreas: ['Salt Lake City'],
    url: 'https://www.slc.gov/utilities/conservation/rebates/',
    popular: true
  },
  {
    id: 'conservation-garden-park',
    name: 'Conservation Garden Park Classes',
    provider: 'Jordan Valley Water',
    type: 'plant',
    description: 'Free workshops on water-wise gardening. Attendees often receive free plants.',
    amount: 'FREE + free plants',
    requirements: ['Registration required', 'Classes fill quickly'],
    eligibleAreas: ['All Utah residents'],
    url: 'https://conservationgardenpark.org/',
    popular: true
  },
  {
    id: 'slow-drain-utah',
    name: 'Slow the Flow',
    provider: 'Utah Division of Water Resources',
    type: 'water',
    description: 'Free landscape consultations and resources for water conservation.',
    amount: 'FREE consultation',
    requirements: ['Utah resident'],
    eligibleAreas: ['Statewide'],
    url: 'https://slowtheflow.org/',
    popular: true
  },
  {
    id: 'tree-utah',
    name: 'Community Tree Program',
    provider: 'TreeUtah',
    type: 'plant',
    description: 'Free and discounted trees for Utah residents. Many native species available.',
    amount: 'Free-$25 per tree',
    requirements: ['Utah resident', 'Agree to plant and maintain'],
    eligibleAreas: ['Statewide'],
    url: 'https://treeutah.org/'
  },
  {
    id: 'pollinator-pathway',
    name: 'Utah Pollinator Habitat Program',
    provider: 'Utah Department of Agriculture',
    type: 'plant',
    description: 'Cost-share program for establishing pollinator habitat. Up to 75% cost-share.',
    amount: 'Up to 75% cost-share',
    maxAmount: 5000,
    requirements: ['Minimum 1/4 acre', 'Use approved seed mixes', 'Maintain for 5 years'],
    eligibleAreas: ['Statewide - rural focus'],
    url: 'https://ag.utah.gov/'
  }
];

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  water: { icon: Droplets, color: '#3b82f6', label: 'Water Conservation' },
  plant: { icon: Leaf, color: '#22c55e', label: 'Native Plants' },
  landscape: { icon: MapPin, color: '#f59e0b', label: 'Landscape Conversion' },
  equipment: { icon: Calculator, color: '#8b5cf6', label: 'Equipment' }
};

const RebateFinder: React.FC<RebateFinderProps> = ({ userCity, gardenSize }) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedRebate, setExpandedRebate] = useState<string | null>(null);
  const [sqftInput, setSqftInput] = useState<number>(500);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedRebateForApplication, setSelectedRebateForApplication] = useState<Rebate | null>(null);

  const filteredRebates = useMemo(() => {
    return UTAH_REBATES.filter(rebate => {
      if (selectedType !== 'all' && rebate.type !== selectedType) return false;
      return true;
    });
  }, [selectedType]);

  const potentialSavings = useMemo(() => {
    let total = 0;
    filteredRebates.forEach(r => {
      if (r.maxAmount) total += r.maxAmount;
    });
    return total;
  }, [filteredRebates]);

  const landscapeSavings = useMemo(() => {
    const landscapeRebates = filteredRebates.filter(r => r.type === 'landscape');
    let maxPerSqFt = 0;
    landscapeRebates.forEach(r => {
      const match = r.amount.match(/\$?([\d.]+)/);
      if (match) {
        const rate = parseFloat(match[1]);
        if (rate > maxPerSqFt) maxPerSqFt = rate;
      }
    });
    return maxPerSqFt * sqftInput;
  }, [filteredRebates, sqftInput]);

  // If viewing application, show that instead
  if (selectedRebateForApplication) {
    return (
      <RebateApplication
        rebate={selectedRebateForApplication}
        gardenData={undefined}
        onBack={() => setSelectedRebateForApplication(null)}
      />
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fefefe' }}>
      <div style={{ padding: 16, background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <DollarSign size={24} />
          <h3 style={{ margin: 0, fontWeight: 700 }}>Rebate Finder</h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>Find rebates for your pollinator garden</p>
      </div>

      <div style={{ padding: 12, background: 'linear-gradient(90deg, #fef3c7, #fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <DollarSign size={20} color="#92400e" />
        <span style={{ fontWeight: 600, color: '#92400e' }}>Up to ${potentialSavings.toLocaleString()} in potential savings!</span>
      </div>

      <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedType('all')} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', backgroundColor: selectedType === 'all' ? '#22c55e' : '#f3f4f6', color: selectedType === 'all' ? 'white' : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            All ({UTAH_REBATES.length})
          </button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            const count = UTAH_REBATES.filter(r => r.type === type).length;
            const IconComp = config.icon;
            return (
              <button key={type} onClick={() => setSelectedType(type)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', backgroundColor: selectedType === type ? config.color : '#f3f4f6', color: selectedType === type ? 'white' : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconComp size={14} />
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={() => setShowCalculator(!showCalculator)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: 'none', backgroundColor: '#f0fdf4', cursor: 'pointer', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={16} color="#16a34a" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Savings Calculator</span>
        </div>
        {showCalculator ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showCalculator && (
        <div style={{ padding: 16, backgroundColor: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Square feet to convert:</label>
          <input type="number" value={sqftInput} onChange={(e) => setSqftInput(Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 12 }} />
          <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '2px solid #22c55e' }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Estimated landscape rebate:</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>${landscapeSavings.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Based on {sqftInput.toLocaleString()} sq ft</div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {filteredRebates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <AlertCircle size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
            <div>No rebates found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredRebates.map(rebate => {
              const config = TYPE_CONFIG[rebate.type];
              const isExpanded = expandedRebate === rebate.id;
              const IconComp = config.icon;
              
              return (
                <div key={rebate.id} style={{ backgroundColor: 'white', borderRadius: 12, border: rebate.popular ? `2px solid ${config.color}` : '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div onClick={() => setExpandedRebate(isExpanded ? null : rebate.id)} style={{ padding: 14, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${config.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComp size={20} color={config.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{rebate.name}</span>
                        {rebate.popular && <span style={{ fontSize: 9, backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>POPULAR</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{rebate.provider}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: config.color, marginTop: 6 }}>{rebate.amount}</div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} color="#999" /> : <ChevronDown size={20} color="#999" />}
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f3f4f6' }}>
                      <p style={{ fontSize: 13, color: '#444', lineHeight: 1.5, margin: '12px 0' }}>{rebate.description}</p>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Requirements:</div>
                        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#666' }}>
                          {rebate.requirements.map((req, i) => <li key={i} style={{ marginBottom: 4 }}>{req}</li>)}
                        </ul>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Eligible Areas:</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {rebate.eligibleAreas.map((area, i) => <span key={i} style={{ fontSize: 11, backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>{area}</span>)}
                        </div>
                      </div>
                      <a href={rebate.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', backgroundColor: config.color, color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                        <ExternalLink size={14} />
                        Learn More
                      </a>
                      {rebate.phone && <div style={{ marginTop: 10, fontSize: 12, color: '#666', textAlign: 'center' }}>Questions? Call {rebate.phone}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderTop: '1px solid #dcfce7', fontSize: 12, color: '#166534', textAlign: 'center' }}>
        💡 Tip: Many programs require pre-approval before starting work
      </div>
    </div>
  );
};

export default RebateFinder;
