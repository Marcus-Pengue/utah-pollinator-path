import React, { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle, ExternalLink, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { CapturedFrame, ObservationMetadata } from './ObservationCapture';
import { generateHabitatNotes, generateQuickNotes, GardenFeatures } from './HabitatNotes';

interface iNaturalistUploadProps {
  frames: CapturedFrame[];
  metadata: ObservationMetadata;
  gardenData?: GardenFeatures;  // Pass registered garden data
  onComplete: (success: boolean, inatId?: string) => void;
  onCancel: () => void;
}

const INaturalistUpload: React.FC<iNaturalistUploadProps> = ({
  frames,
  metadata,
  gardenData,
  onComplete,
  onCancel
}) => {
  const [species, setSpecies] = useState('');
  const [notes, setNotes] = useState('');
  const [includeHabitat, setIncludeHabitat] = useState(true);
  const [showHabitatPreview, setShowHabitatPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate habitat notes when garden data is available
  const habitatNotes = gardenData ? generateHabitatNotes(gardenData) : '';
  const quickNotes = gardenData ? generateQuickNotes(gardenData) : '';

  // Pre-fill with quick notes if garden data exists
  useEffect(() => {
    if (gardenData && includeHabitat) {
      setNotes(quickNotes);
    }
  }, [gardenData, includeHabitat, quickNotes]);

  const handleUpload = async () => {
    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 1; i <= 5; i++) {
        await new Promise(r => setTimeout(r, 300));
        setUploadProgress(i * 20);
      }

      // Build final notes
      let finalNotes = notes;
      if (includeHabitat && gardenData) {
        finalNotes = habitatNotes + (notes ? '\n\nOBSERVER NOTES:\n' + notes : '');
      }

      // Open iNaturalist with pre-filled data
      const inatUrl = new URL('https://www.inaturalist.org/observations/new');
      if (metadata.lat && metadata.lng) {
        inatUrl.searchParams.set('lat', metadata.lat.toString());
        inatUrl.searchParams.set('lng', metadata.lng.toString());
      }
      if (species) {
        inatUrl.searchParams.set('taxon_name', species);
      }
      if (finalNotes) {
        inatUrl.searchParams.set('description', finalNotes);
      }
      
      // Download images
      frames.forEach((frame, i) => {
        const link = document.createElement('a');
        link.href = frame.dataUrl;
        link.download = `observation-${i + 1}${frame.isPrimary ? '-primary' : ''}.jpg`;
        link.click();
      });

      setUploading(false);
      
      alert(
        `Photos saved with habitat context!\n\n` +
        `1. Photos downloaded to your device\n` +
        `2. Click OK to open iNaturalist\n` +
        `3. Upload the downloaded photos (primary photo first)\n` +
        `4. Habitat notes are pre-filled!\n` +
        `5. Submit your observation!`
      );
      
      window.open(inatUrl.toString(), '_blank');
      onComplete(true);

    } catch (err) {
      setError('Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      zIndex: 2001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        maxWidth: 420,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          padding: 16,
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 1
        }}>
          <img 
            src="https://static.inaturalist.org/sites/1-logo.svg" 
            alt="iNaturalist"
            style={{ height: 24 }}
          />
          <h3 style={{ margin: 0, fontSize: 16 }}>Upload to iNaturalist</h3>
        </div>

        <div style={{ padding: 16 }}>
          {/* Preview */}
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            marginBottom: 16,
            overflowX: 'auto',
            padding: '4px 0'
          }}>
            {frames.map((frame, i) => (
              <img
                key={i}
                src={frame.dataUrl}
                alt={`Frame ${i + 1}`}
                style={{
                  width: 60,
                  height: 60,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: frame.isPrimary ? '2px solid #22c55e' : '1px solid #ddd',
                  flexShrink: 0
                }}
              />
            ))}
          </div>

          {/* Species guess */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              What did you observe? (optional)
            </label>
            <input
              type="text"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="e.g., Monarch butterfly, Goldenrod"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Habitat Context Toggle */}
          {gardenData && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              marginBottom: 16,
              overflow: 'hidden'
            }}>
              <div 
                style={{
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="includeHabitat"
                    checked={includeHabitat}
                    onChange={(e) => setIncludeHabitat(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <label htmlFor="includeHabitat" style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
                    Include Habitat Context
                  </label>
                </div>
                <button
                  onClick={() => setShowHabitatPreview(!showHabitatPreview)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12
                  }}
                >
                  Preview {showHabitatPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {showHabitatPreview && (
                <div style={{
                  borderTop: '1px solid #bbf7d0',
                  padding: 12,
                  backgroundColor: '#f9fff9'
                }}>
                  <div style={{ fontSize: 11, color: '#166534', marginBottom: 8, fontWeight: 600 }}>
                    This will be added to your observation notes:
                  </div>
                  <pre style={{
                    fontSize: 10,
                    color: '#374151',
                    backgroundColor: 'white',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    maxHeight: 200,
                    overflowY: 'auto'
                  }}>
                    {habitatNotes}
                  </pre>
                </div>
              )}

              {!showHabitatPreview && includeHabitat && (
                <div style={{
                  padding: '0 12px 12px',
                  fontSize: 11,
                  color: '#166534'
                }}>
                  ✓ {gardenData.tier} • {gardenData.plants.length} plant species • 
                  {gardenData.features.includes('no_pesticides') ? ' Pesticide-free' : ''}
                  {gardenData.features.includes('bare_ground') ? ' • Ground-nesting habitat' : ''}
                  {gardenData.features.includes('water') ? ' • Water source' : ''}
                </div>
              )}
            </div>
          )}

          {/* No garden data notice */}
          {!gardenData && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fde047',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 12,
              color: '#92400e'
            }}>
              💡 <strong>Tip:</strong> Register your garden to automatically include habitat context 
              (nesting features, plant species, pesticide-free status) with every observation!
            </div>
          )}

          {/* Additional Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Behavior observed, weather conditions, etc..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Location */}
          {metadata.lat && metadata.lng && (
            <div style={{
              backgroundColor: '#f0f9ff',
              padding: 10,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
              color: '#0369a1'
            }}>
              📍 Location: {metadata.lat.toFixed(5)}, {metadata.lng.toFixed(5)}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                height: 6,
                backgroundColor: '#e5e7eb',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${uploadProgress}%`,
                  backgroundColor: '#22c55e',
                  transition: 'width 0.3s'
                }} />
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 6, textAlign: 'center' }}>
                Preparing upload...
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              padding: 10,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onCancel}
              disabled={uploading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#74ac00',
                color: 'white',
                fontWeight: 600,
                cursor: uploading ? 'wait' : 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              {uploading ? (
                <>
                  <Loader size={16} className="spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ExternalLink size={16} />
                  Open iNaturalist
                </>
              )}
            </button>
          </div>

          <div style={{ 
            marginTop: 12, 
            fontSize: 11, 
            color: '#666', 
            textAlign: 'center' 
          }}>
            Photos download, then iNaturalist opens with habitat notes pre-filled
          </div>
        </div>
      </div>
    </div>
  );
};

export default INaturalistUpload;
