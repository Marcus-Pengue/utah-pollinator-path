// Utah rebate programs - easy to update when URLs/amounts change
export interface RebateProgram {
  id: string;
  name: string;
  provider: string;
  type: 'water' | 'plant' | 'landscape' | 'equipment';
  description: string;
  amount: string;
  maxAmount?: number;
  ratePerSqFt?: number;
  requirements: string[];
  eligibleAreas: string[];
  url: string;
  phone?: string;
  popular?: boolean;
  active: boolean;
  lastVerified: string; // ISO date
}

export const REBATE_PROGRAMS: RebateProgram[] = [
  {
    id: 'slc-flip-strip',
    name: 'Flip Your Strip',
    provider: 'Salt Lake City',
    type: 'landscape',
    description: 'Convert park strips to water-wise landscaping',
    amount: '$1.25 per sq ft',
    maxAmount: 1250,
    ratePerSqFt: 1.25,
    requirements: [
      'Salt Lake City water customer',
      'Park strip conversion only',
      'Use approved plant list',
      'Pre-approval required'
    ],
    eligibleAreas: ['Salt Lake City'],
    url: 'https://www.slc.gov/utilities/conservation/flip-your-strip/',
    phone: '801-483-6900',
    popular: true,
    active: true,
    lastVerified: '2024-12-01'
  },
  {
    id: 'jvwcd-localscapes',
    name: 'Localscapes Rebate',
    provider: 'Jordan Valley Water',
    type: 'landscape',
    description: 'Transform your yard with water-wise design principles',
    amount: '$1.00 per sq ft',
    maxAmount: 3000,
    ratePerSqFt: 1.00,
    requirements: [
      'Jordan Valley Water customer',
      'Complete Localscapes workshop',
      'Minimum 100 sq ft',
      'Pre-approval required'
    ],
    eligibleAreas: ['West Jordan', 'South Jordan', 'Herriman', 'Riverton', 'Bluffdale'],
    url: 'https://jvwcd.org/rebates',
    phone: '801-565-4300',
    popular: true,
    active: true,
    lastVerified: '2024-12-01'
  },
  {
    id: 'weber-turf',
    name: 'Turf Replacement Program',
    provider: 'Weber Basin Water',
    type: 'landscape',
    description: 'Replace grass with water-efficient landscaping',
    amount: '$1.50 per sq ft',
    maxAmount: 3000,
    ratePerSqFt: 1.50,
    requirements: [
      'Weber Basin Water customer',
      'Minimum 200 sq ft',
      'Must remove existing turf',
      'Plant from approved list'
    ],
    eligibleAreas: ['Ogden', 'Layton', 'Farmington', 'Kaysville', 'Bountiful'],
    url: 'https://weberbasin.com/Conservation/Rebates',
    phone: '801-771-1677',
    active: true,
    lastVerified: '2024-12-01'
  },
  {
    id: 'slc-smart-controller',
    name: 'Smart Irrigation Controller',
    provider: 'Salt Lake City',
    type: 'equipment',
    description: 'Rebate for WaterSense certified smart controllers',
    amount: 'Up to $150',
    maxAmount: 150,
    requirements: [
      'Salt Lake City water customer',
      'WaterSense certified controller',
      'Professional installation recommended',
      'Submit receipt within 60 days'
    ],
    eligibleAreas: ['Salt Lake City'],
    url: 'https://www.slc.gov/utilities/conservation/',
    phone: '801-483-6900',
    active: true,
    lastVerified: '2024-12-01'
  },
  {
    id: 'conservation-garden',
    name: 'Conservation Garden Park Classes',
    provider: 'Jordan Valley Water',
    type: 'plant',
    description: 'Free classes on water-wise gardening with free plants',
    amount: 'FREE classes + free plants',
    requirements: [
      'Register online',
      'Attend class in person',
      'Limited spots available'
    ],
    eligibleAreas: ['Salt Lake Valley'],
    url: 'https://conservationgardenpark.org/',
    phone: '801-256-4400',
    popular: true,
    active: true,
    lastVerified: '2024-12-01'
  },
  {
    id: 'slow-the-flow',
    name: 'Slow the Flow',
    provider: 'Utah Division of Water Resources',
    type: 'water',
    description: 'Free landscape water check and recommendations',
    amount: 'FREE consultation',
    requirements: [
      'Utah resident',
      'Schedule appointment online'
    ],
    eligibleAreas: ['Statewide'],
    url: 'https://slowtheflow.org/',
    phone: '877-728-3420',
    active: true,
    lastVerified: '2024-12-01'
  },
  {
    id: 'treeutah',
    name: 'Community Tree Program',
    provider: 'TreeUtah',
    type: 'plant',
    description: 'Low-cost trees for Utah residents',
    amount: 'Free - $25 per tree',
    requirements: [
      'Utah resident',
      'Pick up at designated events',
      'Plant within 48 hours'
    ],
    eligibleAreas: ['Statewide'],
    url: 'https://treeutah.org/',
    active: true,
    lastVerified: '2024-12-01'
  },
  {
    id: 'usda-pollinator',
    name: 'Utah Pollinator Habitat Program',
    provider: 'USDA NRCS',
    type: 'plant',
    description: 'Cost-share for establishing pollinator habitat',
    amount: 'Up to 75% cost-share',
    maxAmount: 5000,
    requirements: [
      'Agricultural land or rural property',
      'Minimum 1/4 acre',
      'Follow NRCS planting guidelines',
      'Multi-year commitment'
    ],
    eligibleAreas: ['Statewide (rural)'],
    url: 'https://www.nrcs.usda.gov/programs-initiatives/eqip-environmental-quality-incentives',
    phone: '801-524-4550',
    active: true,
    lastVerified: '2024-12-01'
  }
];

export const getRebatesByType = (type: RebateProgram['type']) => 
  REBATE_PROGRAMS.filter(r => r.type === type && r.active);

export const getRebatesForCity = (city: string) =>
  REBATE_PROGRAMS.filter(r => 
    r.active && (r.eligibleAreas.includes(city) || r.eligibleAreas.includes('Statewide'))
  );

export const getMaxPotentialSavings = () =>
  REBATE_PROGRAMS.filter(r => r.active && r.maxAmount).reduce((sum, r) => sum + (r.maxAmount || 0), 0);
