import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { CheckCircle, Loader2, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface FaceVerificationProps {
  mode: 'register' | 'verify';
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const FaceVerification: React.FC<FaceVerificationProps> = ({ mode, token, onSuccess, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState<string>('Loading facial recognition models...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        setStatus('Models loaded. Starting camera...');
        startCamera();
      } catch (err) {
        console.error("Error loading models", err);
        setError('Failed to load facial recognition models. Make sure they exist in /public/models.');
      }
    };
    loadModels();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("Camera video playback was interrupted or prevented:", err);
          });
        }
      }
      streamRef.current = stream;
      setStatus(mode === 'register' ? 'Look directly at the camera to register your face.' : 'Verifying your identity...');
      
      // Give camera time to warm up before starting detection loops
      setTimeout(() => detectFaceLoop(), 1000);
    } catch (err) {
      console.error(err);
      setError('Camera access denied or unavailable.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const detectFaceLoop = async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

    if (isProcessing) return; // Prevent overlapping calls
    setIsProcessing(true);

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        if (mode === 'register') {
          await handleRegistration(detection.descriptor);
          return; // Stop loop on success
        } else {
          const success = await handleVerification(detection.descriptor);
          if (success) return; // Stop loop on success
        }
      } else {
        setStatus('No face detected. Please face the camera directly.');
      }
    } catch (err) {
      console.error(err);
    }

    setIsProcessing(false);
    setTimeout(() => detectFaceLoop(), 500); // Check every 500ms
  };

  const handleRegistration = async (descriptor: Float32Array) => {
    setStatus('Registering face...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/student/register-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ descriptor: Array.from(descriptor) })
      });
      if (!res.ok) throw new Error('Registration failed');
      
      setStatus('Face registered successfully!');
      stopCamera();
      setTimeout(onSuccess, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save face descriptor.');
      setIsProcessing(false);
    }
  };

  const handleVerification = async (liveDescriptor: Float32Array) => {
    setStatus('Analyzing face...');
    try {
      // Fetch stored descriptor
      const res = await fetch(`${API_BASE_URL}/api/auth/student/face-descriptor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not fetch stored face descriptor.');
      
      const data = await res.json();
      const storedDescriptor = new Float32Array(data.descriptor);
      
      // Calculate Euclidean distance (threshold usually 0.6)
      const distance = faceapi.euclideanDistance(liveDescriptor, storedDescriptor);
      
      if (distance < 0.5) {
        setStatus('Identity verified!');
        stopCamera();
        setTimeout(onSuccess, 1000);
        return true;
      } else {
        setStatus(`Face mismatch (Distance: ${distance.toFixed(2)}). Try again.`);
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Verification error.');
      return false;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '350px', aspectRatio: '1/1', background: '#000', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--accent)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
        <video 
          ref={videoRef} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
          muted playsInline 
        />
        
        {(!modelsLoaded || error) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: 'white' }}>
            {error ? <ShieldAlert size={40} color="var(--danger)" /> : <Loader2 size={40} className="spin-anim" />}
          </div>
        )}

        {status === 'Identity verified!' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.5)', color: 'white' }}>
            <CheckCircle size={60} />
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.95rem', fontWeight: 500, color: error ? 'var(--danger)' : 'var(--text-primary)', marginBottom: '1.5rem' }}>
        {error || status}
      </p>

      <button className="btn btn-secondary" onClick={onCancel} style={{ width: '100%', justifyContent: 'center' }}>
        Cancel
      </button>

      <style>{`
        .spin-anim { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};
