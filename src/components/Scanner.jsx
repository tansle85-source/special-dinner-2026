import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';

const Scanner = () => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const checkinBtnRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear scanner", error);
      });
    };
  }, []);

  // Handle Enter key for check-in
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && employee && !employee.checked_in) {
        handleCheckIn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [employee]);

  const onScanSuccess = async (decodedText) => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/employee/${decodedText}`);
      setEmployee(res.data);
      setMessage('');
    } catch (err) {
      console.error(err);
      setMessage('Employee not found or server error.');
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const onScanFailure = (error) => {
    // Silently ignore scan failures
  };

  const handleCheckIn = async () => {
    if (!employee || employee.checked_in) return;
    try {
      setLoading(true);
      const res = await axios.post(`http://localhost:5000/api/checkin/${employee.id}`);
      setEmployee(res.data.employee);
      setMessage('Check-in Successful!');
    } catch (err) {
      setMessage('Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner-layout">
      <div className="scanner-left">
        <div id="reader"></div>
        <div style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          Position the QR code within the frame
        </div>
      </div>

      <div className="scanner-right">
        {employee ? (
          <div className="glass-card">
            <div className="details-header">
              <h2>Employee Details {employee.checked_in && <span className="status-badge status-checked">CHECKED IN</span>}</h2>
            </div>
            
            <div className="details-row">
              <div className="label">Employee ID</div>
              <div className="value">{employee.id}</div>
            </div>
            
            <div className="details-row">
              <div className="label">Full Name</div>
              <div className="value">{employee.name}</div>
            </div>
            
            <div className="details-row">
              <div className="label">Department</div>
              <div className="value">{employee.department}</div>
            </div>
            
            <div className="details-row">
              <div className="label">Seating</div>
              <div className="value">{employee.seating}</div>
            </div>
            
            <div className="details-row">
              <div className="label">Email Address</div>
              <div className="value">{employee.email}</div>
            </div>

            {employee.checked_in ? (
              <div style={{ color: '#4ade80', fontWeight: '600', textAlign: 'center', marginTop: '1rem' }}>
                Arrival Time: {new Date(employee.checkin_time).toLocaleTimeString()}
              </div>
            ) : (
              <button 
                className="btn" 
                onClick={handleCheckIn} 
                disabled={loading}
                ref={checkinBtnRef}
              >
                {loading ? 'Processing...' : 'CHECK IN (Press Enter)'}
              </button>
            )}
            
            {message && <div style={{ marginTop: '1rem', textAlign: 'center', color: message.includes('Success') ? '#4ade80' : '#f87171' }}>{message}</div>}
          </div>
        ) : (
          <div className="glass-card" style={{ textAlign: 'center', color: var(--text-muted) }}>
            <h3>Waiting for Scan...</h3>
            <p>Please present your QR code to the camera.</p>
            {message && <div style={{ marginTop: '2rem', color: '#f87171' }}>{message}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
