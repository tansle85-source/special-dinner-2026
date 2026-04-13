import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Admin = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const checkedInCount = employees.filter(e => e.checked_in).length;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage guest list and check-in status</p>
        </div>
        
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
              <th>Seating</th>
              <th>Status</th>
              <th>Check-in Time</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td>{emp.id}</td>
                <td>{emp.name}</td>
                <td>{emp.department}</td>
                <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{emp.seating}</td>
                <td>
                  <span className={`status-badge ${emp.checked_in ? 'status-checked' : 'status-pending'}`}>
                    {emp.checked_in ? 'Checked In' : 'Pending'}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {emp.checkin_time ? new Date(emp.checkin_time).toLocaleTimeString() : '-'}
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
