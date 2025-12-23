import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Video, X, Check, Upload, Loader, Info, ChevronRight, Flower2, Bug, Maximize } from 'lucide-react';

interface ObservationCaptureProps {
  onCapture: (frames: CapturedFrame[], metadata: ObservationMetadata) => void;
  onCancel: () => void;
  propertyLat?: number;
  propertyLng?: number;
}

export interface CapturedFrame {
  dataUrl: string;
  timestamp: number; // 1-5 seconds
  isPrimary: boolean;
}

export interface ObservationMetadata {
  capturedAt: string;
  lat: number | null;
  lng: number | null;
  duration: number;
}

type CaptureStep = 'intro' | 'ready' | 'recording' | 'review' | 'uploading';

const TIPS = [
  { icon: '🎯', text: 'Get within 1-2 feet of the subject' },
  { icon: '☀️', text: 'Ensure good lighting (natural is best)' },
  { icon: '🖐️', text: 'Hold steady - the zoom does the work' },
  { icon: '🌸', text: 'Center the pollinator or flower' },
  { icon: '📸', text: 'Wait for the full 5 seconds' },
];

const ObservationCapture: React.FC<ObservationCaptureProps> = ({
  onCapture,
  onCancel,
  propertyLat,
  propertyLng
}) => {
  const [step, setStep] = useState<CaptureStep>('intro');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location not available')
      );
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setStep('ready');
      setError(null);
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      console.error('Camera error:', err);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  }, []);

  // Capture a single frame
  const captureFrame = useCallback((timestamp: number): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Calculate zoom crop (progressive zoom from 1x to 1.5x)
    const zoom = 1 + (timestamp / 5) * 0.5; // 1x at t=1, 1.5x at t=5
    const cropWidth = video.videoWidth / zoom;
    const cropHeight = video.videoHeight / zoom;
    const cropX = (video.videoWidth - cropWidth) / 2;
    const cropY = (video.videoHeight - cropHeight) / 2;

    // Draw zoomed frame
    ctx.drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,  // Source (cropped)
      0, 0, canvas.width, canvas.height      // Destination (full canvas)
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  // Start recording sequence
  const startRecording = useCallback(() => {
    setCountdown(3);
    
    // Countdown 3-2-1
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownInterval);
        setCountdown(null);
        beginCapture();
      }
    }, 1000);
  }, []);

  // Begin actual capture
  const beginCapture = useCallback(() => {
    setStep('recording');
    setRecordingProgress(0);
    setCapturedFrames([]);
    setZoomLevel(1);

    const frames: CapturedFrame[] = [];
    let elapsed = 0;

    recordingIntervalRef.current = setInterval(() => {
      elapsed += 0.1; // 100ms intervals for smooth progress
      setRecordingProgress(elapsed / 5);
      setZoomLevel(1 + (elapsed / 5) * 0.5);

      // Capture frame at each second mark
      if (Math.floor(elapsed * 10) % 10 === 0 && elapsed <= 5 && elapsed >= 1) {
        const timestamp = Math.floor(elapsed);
        const dataUrl = captureFrame(timestamp);
        if (dataUrl) {
          frames.push({
            dataUrl,
            timestamp,
            isPrimary: timestamp === 5
          });
        }
      }

      // End at 5 seconds
      if (elapsed >= 5) {
        clearInterval(recordingIntervalRef.current!);
        
        // Ensure we have the 5th frame
        const finalFrame = captureFrame(5);
        if (finalFrame && !frames.find(f => f.timestamp === 5)) {
          frames.push({
            dataUrl: finalFrame,
            timestamp: 5,
            isPrimary: true
          });
        }

        // Sort so frame 5 is first (best zoom for ID)
        const sortedFrames = frames.sort((a, b) => b.timestamp - a.timestamp);
        setCapturedFrames(sortedFrames);
        setStep('review');
        stopCamera();
      }
    }, 100);
  }, [captureFrame, stopCamera]);

  // Handle confirm upload
  const handleConfirm = useCallback(() => {
    const metadata: ObservationMetadata = {
      capturedAt: new Date().toISOString(),
      lat: currentLocation?.lat || propertyLat || null,
      lng: currentLocation?.lng || propertyLng || null,
      duration: 5
    };
    onCapture(capturedFrames, metadata);
  }, [capturedFrames, currentLocation, propertyLat, propertyLng, onCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={20} />
          Observation Capture
        </div>
        <button
          onClick={() => { stopCamera(); onCancel(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <X size={24} color="white" />
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Video Preview */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${zoomLevel})`,
            transition: 'transform 0.1s linear',
            display: step === 'ready' || step === 'recording' ? 'block' : 'none'
          }}
        />
        
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Intro Screen */}
        {step === 'intro' && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: '#111'
          }}>
            <div style={{ 
              width: 80, height: 80, 
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <Bug size={40} color="white" />
            </div>
            
            <h2 style={{ color: 'white', margin: '0 0 8px', textAlign: 'center' }}>
              Smart Observation Capture
            </h2>
            <p style={{ color: '#9ca3af', textAlign: 'center', margin: '0 0 24px', fontSize: 14 }}>
              5-second auto-zoom video captures multiple frames for better species identification
            </p>

            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 16,
              width: '100%',
              maxWidth: 320,
              marginBottom: 24
            }}>
              <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: 12, fontSize: 13 }}>
                📸 CAPTURE TIPS
              </div>
              {TIPS.map((tip, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  marginBottom: 8,
                  color: 'white',
                  fontSize: 13
                }}>
                  <span>{tip.icon}</span>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={startCamera}
              style={{
                padding: '16px 48px',
                borderRadius: 30,
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Camera size={20} />
              Start Camera
            </button>

            {error && (
              <div style={{ 
                color: '#ef4444', 
                marginTop: 16, 
                textAlign: 'center',
                fontSize: 14
              }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: 120, height: 120,
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
              fontWeight: 700,
              color: 'white',
              animation: 'pulse 1s ease-in-out'
            }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Recording Overlay */}
        {step === 'recording' && (
          <>
            {/* Zoom indicator */}
            <div style={{
              position: 'absolute',
              top: 16,
              left: 16,
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '8px 12px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'white',
              fontSize: 13
            }}>
              <Maximize size={16} />
              {zoomLevel.toFixed(1)}x
            </div>

            {/* Recording indicator */}
            <div style={{
              position: 'absolute',
              top: 16,
              right: 16,
              backgroundColor: '#ef4444',
              padding: '8px 12px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'white',
              fontSize: 13
            }}>
              <div style={{
                width: 8, height: 8,
                borderRadius: '50%',
                backgroundColor: 'white',
                animation: 'blink 1s infinite'
              }} />
              REC
            </div>

            {/* Progress bar */}
            <div style={{
              position: 'absolute',
              bottom: 100,
              left: 24,
              right: 24
            }}>
              <div style={{
                height: 6,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${recordingProgress * 100}%`,
                  backgroundColor: '#22c55e',
                  transition: 'width 0.1s linear'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                color: 'white',
                fontSize: 12
              }}>
                <span>0s</span>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>
                  {Math.floor(recordingProgress * 5)}s
                </span>
                <span>5s</span>
              </div>
            </div>

            {/* Frame indicators */}
            <div style={{
              position: 'absolute',
              bottom: 150,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 12
            }}>
              {[1, 2, 3, 4, 5].map(sec => (
                <div
                  key={sec}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: recordingProgress * 5 >= sec ? '#22c55e' : 'rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'background-color 0.3s'
                  }}
                >
                  {sec}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Review Screen */}
        {step === 'review' && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#111',
            padding: 16,
            overflowY: 'auto'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 16px' }}>
              📸 Captured Frames
            </h3>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
              Frame 5 (most zoomed) will be the primary photo for identification.
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
              marginBottom: 20
            }}>
              {capturedFrames.map((frame, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={frame.dataUrl}
                    alt={`Frame ${frame.timestamp}`}
                    style={{
                      width: '100%',
                      aspectRatio: '4/3',
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: frame.isPrimary ? '3px solid #22c55e' : '1px solid #333'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    backgroundColor: frame.isPrimary ? '#22c55e' : 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    {frame.isPrimary ? '★ Primary' : `${frame.timestamp}s`}
                  </div>
                </div>
              ))}
            </div>

            {currentLocation && (
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                color: 'white',
                fontSize: 12
              }}>
                📍 Location: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { startCamera(); setStep('ready'); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 10,
                  border: '1px solid #666',
                  backgroundColor: 'transparent',
                  color: 'white',
                  fontSize: 15,
                  cursor: 'pointer'
                }}
              >
                Retake
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Upload size={18} />
                Use These Photos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ready state - capture button */}
      {step === 'ready' && (
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={startRecording}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '4px solid white',
              backgroundColor: '#22c55e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <Video size={32} color="white" />
          </button>
        </div>
      )}

      {/* Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ObservationCapture;
