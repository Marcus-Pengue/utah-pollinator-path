import React, { useState } from 'react';
import { FileText, CheckSquare, Square, Download, Calendar, ArrowLeft, ExternalLink, Copy, CheckCircle } from 'lucide-react';

interface RebateApplicationProps {
  rebate: {
    id: string;
    name: string;
    provider: string;
    amount: string;
    url: string;
    requirements: string[];
  };
  gardenData?: {
    name?: string;
    size?: string;
    plants?: string[];
  };
  onBack: () => void;
}

const RebateApplication: React.FC<RebateApplicationProps> = ({ rebate, gardenData, onBack }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    utilityAccount: '',
    currentSqFt: '',
    proposedSqFt: gardenData?.size?.match(/\d+/)?.[0] || '',
    startDate: '',
    completionDate: '',
    plantList: gardenData?.plants?.join(', ') || '',
    irrigationType: '',
    mulchType: '',
    notes: ''
  });

  const [checklist, setChecklist] = useState([
    { id: 'pre-approval', label: 'Submit pre-approval application', required: true, done: false },
    { id: 'before-photos', label: 'Take before photos', required: true, done: false },
    { id: 'measurements', label: 'Measure area accurately', required: true, done: false },
    { id: 'plant-list', label: 'Create plant list', required: true, done: false },
    { id: 'workshop', label: 'Attend required workshop', required: false, done: false },
    { id: 'after-photos', label: 'Take after photos', required: true, done: false },
    { id: 'receipts', label: 'Collect all receipts', required: true, done: false },
    { id: 'final-submit', label: 'Submit final application', required: true, done: false },
  ]);

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const generateText = () => {
    return `REBATE APPLICATION - ${rebate.name}
Provider: ${rebate.provider}
Date: ${new Date().toLocaleDateString()}

APPLICANT INFO:
Name: ${formData.fullName}
Email: ${formData.email}
Phone: ${formData.phone}
Address: ${formData.address}
Utility Account: ${formData.utilityAccount}

PROJECT DETAILS:
Current Lawn: ${formData.currentSqFt} sq ft
Converting: ${formData.proposedSqFt} sq ft
Start Date: ${formData.startDate}
Completion: ${formData.completionDate}

PLANTS: ${formData.plantList}
IRRIGATION: ${formData.irrigationType}
MULCH: ${formData.mulchType}

NOTES: ${formData.notes}

Apply at: ${rebate.url}`;
  };

  const copyText = () => {
    navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = () => {
    const blob = new Blob([generateText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rebate.id}-application.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps = ['Checklist', 'Your Info', 'Project', 'Export'];
  const requiredDone = checklist.filter(c => c.required && c.done).length;
  const requiredTotal = checklist.filter(c => c.required).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fefefe' }}>
      {/* Header */}
      <div style={{ padding: 16, background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginBottom: 8, fontSize: 13 }}>
          <ArrowLeft size={16} /> Back to Rebates
        </button>
        <h3 style={{ margin: 0, fontWeight: 700 }}>{rebate.name}</h3>
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>{rebate.provider}</p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', gap: 4 }}>
        {steps.map((step, i) => (
          <button key={step} onClick={() => setActiveStep(i)} style={{ flex: 1, padding: '8px 4px', border: 'none', backgroundColor: activeStep === i ? '#22c55e' : '#f3f4f6', color: activeStep === i ? 'white' : '#666', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {i + 1}. {step}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Checklist */}
        {activeStep === 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h4 style={{ margin: 0 }}>Application Checklist</h4>
              <span style={{ fontSize: 13, color: requiredDone === requiredTotal ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>{requiredDone}/{requiredTotal} required</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checklist.map(item => (
                <div key={item.id} onClick={() => toggleCheck(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: item.done ? '#f0fdf4' : 'white', borderRadius: 8, border: `1px solid ${item.done ? '#22c55e' : '#e5e7eb'}`, cursor: 'pointer' }}>
                  {item.done ? <CheckSquare size={20} color="#22c55e" /> : <Square size={20} color="#d1d5db" />}
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</span>
                  {item.required && <span style={{ fontSize: 9, color: '#ef4444', backgroundColor: '#fef2f2', padding: '1px 4px', borderRadius: 3, marginLeft: 'auto' }}>REQUIRED</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Info */}
        {activeStep === 1 && (
          <div>
            <h4 style={{ margin: '0 0 16px' }}>Your Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" placeholder="Full Name *" value={formData.fullName} onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              <input type="email" placeholder="Email *" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              <input type="text" placeholder="Address *" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              <input type="text" placeholder="Utility Account # (from water bill)" value={formData.utilityAccount} onChange={e => setFormData(p => ({ ...p, utilityAccount: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
            </div>
          </div>
        )}

        {/* Project */}
        {activeStep === 2 && (
          <div>
            <h4 style={{ margin: '0 0 16px' }}>Project Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="number" placeholder="Current lawn (sq ft)" value={formData.currentSqFt} onChange={e => setFormData(p => ({ ...p, currentSqFt: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
                <input type="number" placeholder="Converting (sq ft)" value={formData.proposedSqFt} onChange={e => setFormData(p => ({ ...p, proposedSqFt: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#666' }}>Start Date</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#666' }}>End Date</label>
                  <input type="date" value={formData.completionDate} onChange={e => setFormData(p => ({ ...p, completionDate: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
                </div>
              </div>
              <textarea placeholder="Plant list: Desert Marigold (3), Blue Flax (5)..." value={formData.plantList} onChange={e => setFormData(p => ({ ...p, plantList: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minHeight: 80 }} />
              <select value={formData.irrigationType} onChange={e => setFormData(p => ({ ...p, irrigationType: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
                <option value="">Select irrigation type</option>
                <option value="drip">Drip irrigation</option>
                <option value="bubbler">Bubbler</option>
                <option value="hand">Hand watering</option>
                <option value="none">No irrigation</option>
              </select>
              <select value={formData.mulchType} onChange={e => setFormData(p => ({ ...p, mulchType: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
                <option value="">Select mulch type</option>
                <option value="wood-chips">Wood chips</option>
                <option value="bark">Bark mulch</option>
                <option value="gravel">Gravel</option>
                <option value="groundcover">Living groundcover</option>
              </select>
              <textarea placeholder="Additional notes..." value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minHeight: 60 }} />
            </div>
          </div>
        )}

        {/* Export */}
        {activeStep === 3 && (
          <div>
            <h4 style={{ margin: '0 0 16px' }}>Export & Submit</h4>
            <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={20} color="#22c55e" />
                <span style={{ fontWeight: 600, color: '#166534' }}>{requiredDone}/{requiredTotal} checklist items complete</span>
              </div>
            </div>
            <pre style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, fontSize: 10, overflow: 'auto', maxHeight: 150, whiteSpace: 'pre-wrap', border: '1px solid #e5e7eb', marginBottom: 16 }}>{generateText()}</pre>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={copyText} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', backgroundColor: copied ? '#22c55e' : 'white', color: copied ? 'white' : '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button onClick={downloadText} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                <Download size={18} />
                Download as File
              </button>
              <a href={rebate.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                <ExternalLink size={18} />
                Go to Official Application
              </a>
            </div>
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              💡 Most programs require pre-approval BEFORE starting work. Keep all receipts!
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
        {activeStep > 0 && (
          <button onClick={() => setActiveStep(p => p - 1)} style={{ flex: 1, padding: '12px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Previous</button>
        )}
        {activeStep < steps.length - 1 && (
          <button onClick={() => setActiveStep(p => p + 1)} style={{ flex: 1, padding: '12px 16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Next</button>
        )}
      </div>
    </div>
  );
};

export default RebateApplication;
