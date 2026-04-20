import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';

const ClaimScanner = ({ onClaimSuccess }) => {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scanner.render(
      async (decodedText) => {
        // decodedText should be the winnerId (UUID)
        handleScan(decodedText);
        scanner.clear(); // Stop scanning once we get a hit
      },
      (err) => {
        // Silent error for scanning frames
      }
    );

    return () => scanner.clear();
  }, []);

  const handleScan = async (winnerId) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/draw/claim', { winnerId });
      setScanResult(res.data);
      if (onClaimSuccess) onClaimSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Scanning failed. Please check if this is a valid winner ID.");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    window.location.reload(); // Simplest way to restart html5-qrcode
  };

  return (
    <div className="claim-scanner-container">
      {!scanResult ? (
        <div className="scanner-active">
          <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
          {error && <div className="error-msg" style={{ color: '#ef4444', marginTop: '1rem', fontWeight: 700 }}>{error}</div>}
          {loading && <div className="loading-spinner">Processing...</div>}
        </div>
      ) : (
        <div className="claim-success-card" style={{ textAlign: 'center', padding: '2rem', background: '#ecfdf5', borderRadius: '16px', border: '2px solid #10b981' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ color: '#065f46', fontSize: '2rem' }}>Prize Claimed!</h2>
          <div style={{ margin: '1.5rem 0' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{scanResult.name}</p>
            <p style={{ color: '#065f46', fontWeight: 600 }}>{scanResult.prize}</p>
          </div>
          <button className="modern-add-btn" onClick={resetScanner}>Scan Next Winner</button>
        </div>
      )}

      <style>{`
        #qr-reader { border: none !important; }
        #qr-reader__dashboard { display: none !important; }
        #qr-reader__status_span { display: none !important; }
        .claim-scanner-container { padding: 2rem; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  );
};

export default ClaimScanner;
