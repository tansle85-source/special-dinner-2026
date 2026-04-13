import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const Admin = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setUploadStatus('Uploading...');
      await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus('Upload successful!');
      fetchEmployees();
    } catch (err) {
      setUploadStatus('Upload failed. Ensure CSV format is correct.');
    } finally {
      setLoading(false);
    }
  };

  const downloadAllQRCodes = async () => {
    if (employees.length === 0) return;
    setQrLoading(true);
    const zip = new JSZip();
    const qrFolder = zip.folder("Employee_QR_Codes");

    try {
      for (const emp of employees) {
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(emp.id, { 
          width: 500,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        
        // Extract base64 data
        const base64Data = qrDataUrl.split(',')[1];
        qrFolder.file(`${emp.id}_${emp.name.replace(/\s+/g, '_')}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Guest_QR_Codes.zip");
    } catch (err) {
      console.error("Failed to generate QR codes", err);
      alert("Error generating QR codes.");
    } finally {
      setQrLoading(false);
    }
  };

  const downloadSingleQR = async (emp) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(emp.id, { width: 500 });
      saveAs(qrDataUrl, `${emp.id}_QR.png`);
    } catch (err) {
      console.error(err);
    }
  };

  const checkedInCount = employees.filter(e => e.checked_in).length;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage guest list and download QR codes</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <button 
            className="btn" 
            style={{ background: '#3b82f6' }}
            onClick={downloadAllQRCodes}
            disabled={qrLoading || employees.length === 0}
          >
            {qrLoading ? 'Generating...' : 'Download All QR Codes (ZIP)'}
          </button>
          
          <div style={{ textAlign: 'right' }}>
            <label className="upload-label">
              {loading ? 'Processing...' : 'Upload CSV Data'}
              <input type="file" accept=".csv" onChange={handleFileUpload} disabled={loading} />
            </label>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: uploadStatus.includes('Success') ? '#4ade80' : '#f87171' }}>
              {uploadStatus}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div className="label">Total Guests</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{employees.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #4ade80' }}>
          <div className="label">Checked In</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4ade80' }}>{checkedInCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #fbbf24' }}>
          <div className="label">Attendance %</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fbbf24' }}>
            {employees.length > 0 ? Math.round((checkedInCount / employees.length) * 100) : 0}%
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Dietary Req.</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td>{emp.id}</td>
                <td>{emp.name}</td>
                <td>{emp.department}</td>
                <td style={{ fontWeight: '500', color: 'var(--primary)' }}>{emp.diet || '-'}</td>
                <td>
                  <span className={`status-badge ${emp.checked_in ? 'status-checked' : 'status-pending'}`}>
                    {emp.checked_in ? 'In' : 'Pending'}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => downloadSingleQR(emp)}
                    style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Get QR
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No guest data available. Please upload a CSV file.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;
