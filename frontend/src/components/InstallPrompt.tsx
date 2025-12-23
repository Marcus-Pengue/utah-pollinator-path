import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS prompt after delay if not installed
    if (iOS && !standalone) {
      setTimeout(() => setShowPrompt(true), 10000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for a while
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Don't show if already installed or recently dismissed
  if (isStandalone) return null;
  
  const lastDismissed = localStorage.getItem('installPromptDismissed');
  if (lastDismissed && Date.now() - parseInt(lastDismissed) < 7 * 24 * 60 * 60 * 1000) {
    return null; // Don't show for 7 days after dismiss
  }

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 100,
      left: 16,
      right: 16,
      backgroundColor: 'white',
      borderRadius: 16,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: 16,
      zIndex: 1100,
      maxWidth: 400,
      margin: '0 auto'
    }}>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4
        }}
      >
        <X size={18} color="#666" />
      </button>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flexShrink: 0
        }}>
          🐝
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>
            Add to Home Screen
          </h4>
          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
            Quick access to log observations anytime you see a pollinator!
          </p>
        </div>
      </div>

      {isIOS ? (
        <div style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: '#f3f4f6',
          borderRadius: 8
        }}>
          <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
            <strong>To install on iOS:</strong>
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#4b5563' }}>
            <li style={{ marginBottom: 4 }}>
              Tap the <Share size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Share button
            </li>
            <li style={{ marginBottom: 4 }}>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add"</li>
          </ol>
        </div>
      ) : (
        <button
          onClick={handleInstall}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#22c55e',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <Download size={18} />
          Install App
        </button>
      )}

      <div style={{
        marginTop: 12,
        display: 'flex',
        gap: 8,
        fontSize: 11,
        color: '#9ca3af'
      }}>
        <Smartphone size={14} />
        Works offline • Fast access • No app store needed
      </div>
    </div>
  );
};

export default InstallPrompt;
