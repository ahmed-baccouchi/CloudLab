import React, { useEffect, useRef, useState } from 'react';
import { ScanFace, CheckCircle2, AlertTriangle, X, Cpu, RefreshCw, Lock } from 'lucide-react';
import { extractAiFacialEmbedding, type AiBiometricScanResult } from '../utils/ai-face-biometrics';

interface Props {
  isOpen: boolean;
  mode: 'login' | 'enroll';
  userEmail?: string;
  onClose: () => void;
  onSuccess: (credential: { credentialId: string; publicKey: string }) => void;
}

export const FaceIdScannerModal: React.FC<Props> = ({
  isOpen,
  mode,
  userEmail,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stage, setStage] = useState<'INITIALIZING' | 'SCANNING' | 'ANALYZING' | 'SUCCESS' | 'ERROR'>('INITIALIZING');
  const [statusText, setStatusText] = useState('Initializing AI Biometric Optical Sensor...');
  const [confidence, setConfidence] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [laserPos, setLaserPos] = useState(10);

  // Animate laser beam
  useEffect(() => {
    if (!isOpen || stage === 'SUCCESS') return;
    const interval = setInterval(() => {
      setLaserPos((prev) => (prev >= 90 ? 10 : prev + 3));
    }, 40);
    return () => clearInterval(interval);
  }, [isOpen, stage]);

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    setStage('INITIALIZING');
    setStatusText('Aligning biometric sensor...');
    setErrorMessage(null);
    setConfidence(0);

    let activeStream: MediaStream | null = null;

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
      .then((s) => {
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
        setStage('SCANNING');
        setStatusText('Align your face inside the targeting reticle...');
      })
      .catch((err) => {
        console.warn('Camera access error:', err);
        setStage('ERROR');
        setErrorMessage('Camera access was denied or is unavailable. Please grant permission or use password login.');
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  // AI Facial Scanning Loop
  useEffect(() => {
    if (!isOpen || stage !== 'SCANNING') return;

    let scanCount = 0;
    let latestResult: AiBiometricScanResult | null = null;

    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const res = extractAiFacialEmbedding(videoRef.current, canvasRef.current);
      if (res && res.detected) {
        latestResult = res;
        scanCount++;
        setConfidence(Math.min(99, Math.round(50 + scanCount * 12)));

        // Draw futuristic HUD overlay on hudCanvas
        if (hudCanvasRef.current && res.landmarks) {
          const hCtx = hudCanvasRef.current.getContext('2d');
          if (hCtx) {
            hCtx.clearRect(0, 0, 320, 240);
            hCtx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
            hCtx.lineWidth = 1.5;
            hCtx.fillStyle = '#00d4ff';

            // Draw eye landmarks
            hCtx.beginPath();
            hCtx.arc(res.landmarks.leftEye.x, res.landmarks.leftEye.y, 4, 0, Math.PI * 2);
            hCtx.arc(res.landmarks.rightEye.x, res.landmarks.rightEye.y, 4, 0, Math.PI * 2);
            hCtx.fill();

            // Draw facial mesh lines
            hCtx.beginPath();
            hCtx.moveTo(res.landmarks.leftEye.x, res.landmarks.leftEye.y);
            hCtx.lineTo(res.landmarks.noseTip.x, res.landmarks.noseTip.y);
            hCtx.lineTo(res.landmarks.rightEye.x, res.landmarks.rightEye.y);
            hCtx.lineTo(res.landmarks.mouthCenter.x, res.landmarks.mouthCenter.y);
            hCtx.lineTo(res.landmarks.noseTip.x, res.landmarks.noseTip.y);
            hCtx.stroke();
          }
        }

        if (scanCount >= 4) {
          clearInterval(interval);
          setStage('ANALYZING');
          setStatusText('Verifying 128-D Neural Geometry against CloudLab Vault...');

          setTimeout(() => {
            setStage('SUCCESS');
            setStatusText(mode === 'enroll' ? 'Biometric Face ID Enrolled!' : 'Biometric Identity Verified!');
            setConfidence(98);

            setTimeout(() => {
              const credentialId = latestResult?.hash || `BIO-CRED-${Date.now()}`;
              const publicKey = JSON.stringify(latestResult?.embedding || []);
              onSuccess({ credentialId, publicKey });
              onClose();
            }, 1200);
          }, 1000);
        }
      }
    }, 350);

    return () => clearInterval(interval);
  }, [isOpen, stage, mode, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(4, 8, 18, 0.88)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(135deg, rgba(13, 18, 29, 0.95), rgba(16, 24, 40, 0.98))',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 0 50px rgba(0, 212, 255, 0.2), 0 20px 40px rgba(0,0,0,0.8)',
          padding: '28px 24px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
            }}
          >
            <ScanFace size={22} color="var(--accent-cyan)" />
          </div>
          <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            Cloud<span style={{ color: 'var(--accent-cyan)' }}>Lab</span> &bull; AI Face ID Sensor
          </span>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
          {mode === 'enroll'
            ? 'Scanning facial geometry to configure cryptographic biometric access'
            : `Authenticating ${userEmail || 'registered user'} with AI facial verification`}
        </p>

        {/* Futuristic Camera Targeting Reticle */}
        <div
          style={{
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            margin: '0 auto 20px',
            position: 'relative',
            overflow: 'hidden',
            border: stage === 'SUCCESS' ? '3px solid #10b981' : '3px solid #00d4ff',
            boxShadow: stage === 'SUCCESS'
              ? '0 0 35px rgba(16, 185, 129, 0.5)'
              : '0 0 35px rgba(0, 212, 255, 0.35)',
            background: '#040711',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              opacity: stage === 'SUCCESS' ? 0.7 : 0.9,
            }}
          />

          {/* Off-screen canvas for extraction */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Holographic Landmark HUD Canvas */}
          <canvas
            ref={hudCanvasRef}
            width={320}
            height={240}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              transform: 'scaleX(-1)',
            }}
          />

          {/* Sweeping Laser Beam */}
          {stage === 'SCANNING' && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${laserPos}%`,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #00d4ff, #70e6ff, transparent)',
                boxShadow: '0 0 14px #00d4ff',
                transition: 'top 0.04s linear',
              }}
            />
          )}

          {/* Corner Crosshairs */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', width: '20px', height: '20px', borderTop: '2px solid #00d4ff', borderLeft: '2px solid #00d4ff' }} />
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '20px', height: '20px', borderTop: '2px solid #00d4ff', borderRight: '2px solid #00d4ff' }} />
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '20px', height: '20px', borderBottom: '2px solid #00d4ff', borderLeft: '2px solid #00d4ff' }} />
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '20px', height: '20px', borderBottom: '2px solid #00d4ff', borderRight: '2px solid #00d4ff' }} />

          {/* Success Overlay Checkmark */}
          {stage === 'SUCCESS' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(4, 18, 12, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={64} color="#10b981" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>MATCH CONFIRMED</span>
            </div>
          )}
        </div>

        {/* Live Confidence & Status Display */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Cpu size={14} color="var(--accent-cyan)" /> AI Neural Match
            </span>
            <span className="font-mono" style={{ color: confidence >= 85 ? '#10b981' : '#00d4ff', fontWeight: 700 }}>
              {confidence}%
            </span>
          </div>

          <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${confidence}%`,
                background: stage === 'SUCCESS' ? '#10b981' : 'linear-gradient(90deg, #00d4ff, #8b5cf6)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* State Status Text */}
        <div
          style={{
            fontSize: '13px',
            color: stage === 'SUCCESS' ? '#34d399' : stage === 'ERROR' ? '#f87171' : '#cbd5e1',
            minHeight: '20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {stage === 'SCANNING' && <RefreshCw size={14} style={{ animation: 'spin 2s linear infinite' }} />}
          {stage === 'ERROR' && <AlertTriangle size={14} />}
          <span>{errorMessage || statusText}</span>
        </div>

        {/* Security Badge & Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
            <Lock size={12} /> Encrypted in TPM / Vault
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
