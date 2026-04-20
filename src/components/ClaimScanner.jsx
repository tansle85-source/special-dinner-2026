import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';

const ClaimScanner = ({ onClaimSuccess }) => {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef(null);
  const cameraId = "reader";

  useEffect(() => {
    // We initialise but don't start until requested or mounted
    scannerRef.current = new Html5Qrcode(cameraId);
    startScanning();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.error(e));
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) return;
    setError('');
    setScannerActive(true);
    
    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          handleScan(decodedText);
        }
      );
    } catch (err) {
      console.error(err);
      setError("Could not start camera. Please ensure permissions are granted.");
      setScannerActive(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      setScannerActive(false);
    }
  };

  const handleScan = async (winnerId) => {
    // If we already have a result being processed, ignore
    if (loading || scanResult) return;

    setLoading(true);
    setError('');
    try {
      // Pause scanning visually by stopping the camera
      await stopScanning();
      
      const res = await axios.post('/api/draw/claim', { winnerId });
      setScanResult(res.data);
      if (onClaimSuccess) onClaimSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Scanning failed. Please check if this is a valid winner ID.");
      // Resume scanning on error
      startScanning();
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    startScanning();
  };

  return (
    <div className="claim-scanner-container">
      {!scanResult ? (
        <div className="scanner-active">
          <div id={cameraId} style={{ width: '100%', maxWidth: '500px', margin: '0 auto', overflow: 'hidden', borderRadius: '12px', background: '#000' }}></div>
          
          {!scannerActive && !loading && (
            <button className="modern-add-btn" onClick={startScanning} style={{ marginTop: '1rem' }}>
              Re-activate Camera
            </button>
          )}

          {error && (
            <div className="error-msg-box" style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px' }}>
               <p style={{ color: '#991b1b', fontWeight: 700, margin: 0 }}>⚠️ {error}</p>
            </div>
          )}
          
          {loading && (
            <div className="loading-overlay" style={{ marginTop: '1rem', fontWeight: 800, color: '#0a8276' }}>
               ⏳ Validating Claim...
            </div>
          )}
        </div>
      ) : (
        <div className="claim-success-card" style={{ textAlign: 'center', padding: '3rem 2rem', background: '#f0fdf4', borderRadius: '24px', border: '2px solid #22c55e', animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
          <div className="success-icon" style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>✅</div>
          <h2 style={{ color: '#166534', fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>SUCCESS!</h2>
          <p style={{ color: '#15803d', fontWeight: 700, fontSize: '1.1rem' }}>Prize Claimed Successfully</p>
          
          <div className="winner-claim-info" style={{ margin: '2.5rem 0', padding: '1.5rem', background: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Winner</label>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>{scanResult.name}</div>
            <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Prize</label>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0a8276' }}>{scanResult.prize}</div>
          </div>
          
          <button className="modern-add-btn" onClick={resetScanner} style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }}>
            SCAN NEXT WINNER
          </button>
        </div>
      )}

      <style>{`
        @keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        #reader__dashboard { display: none !important; }
        #reader__status_span { display: none !important; }
        video { border-radius: 12px; }
        .claim-scanner-container { padding: 2rem; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); min-height: 400px; display: flex; flex-direction: column; justify-content: center; }
      `}</style>
    </div>
  );
};

export default ClaimScanner;
