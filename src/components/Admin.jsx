import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Admin = () => {
  const [employees, setEmployees] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [prizeUploadStatus, setPrizeUploadStatus] = useState('');
  
  const [selectedPrizeId, setSelectedPrizeId] = useState('');
  const [drawResult, setDrawResult] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('winners');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const empRes = await axios.get('/api/employees');
      setEmployees(empRes.data);
      
      const prizeRes = await axios.get('/api/prizes');
      const sortedPrizes = prizeRes.data.sort((a, b) => a.rank - b.rank);
      setPrizes(sortedPrizes);
    } catch (err) {
      console.error('Failed to fetch data');
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    const endpoint = type === 'employees' ? '/api/upload' : '/api/upload-prizes';
    const setStatus = type === 'employees' ? setUploadStatus : setPrizeUploadStatus;

    try {
      setLoading(true);
      setStatus('Uploading...');
      await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus('Upload successful!');
      fetchData();
    } catch (err) {
      setStatus('Upload failed. Ensure CSV format is correct.');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const conductDraw = async () => {
    if (!selectedPrizeId) {
      alert("Please select a prize first.");
      return;
    }
    setDrawing(true);
    setDrawResult(null);
    setTimeout(async () => {
      try {
        const res = await axios.post('/api/draw', { prizeId: selectedPrizeId });
        setDrawResult(res.data);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || "Draw failed.");
      } finally {
        setDrawing(false);
      }
    }, 1500);
  };

  const resetDraws = async () => {
    if (window.confirm('Are you sure you want to reset all draw results?')) {
      try {
        await axios.post('/api/reset-draw');
        fetchData();
        setDrawResult(null);
        alert('All draw results reset.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getDrawnCount = (prizeName) => {
    return employees.filter(e => e.won_prize === prizeName).length;
  };

  return (
    <div className="admin-container">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Lucky Draw Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your prizes and conduct draws</p>
        </div>
      </div>

      <div className="admin-panels">
        <div className="dashboard-card panel-card">
          <h2>Data Management</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Upload your Employee and Prize lists (CSV format).</p>
          
          <div className="upload-group">
            <label className="upload-label">
              {loading ? 'Processing...' : 'Upload Eligible Employees'}
              <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'employees')} disabled={loading} />
            </label>
            <div className="status-text">{uploadStatus}</div>
            <div className="stat-text">Total Employees: <strong>{employees.length}</strong></div>
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border)' }} />

          <div className="upload-group">
            <label className="upload-label" style={{ borderColor: 'var(--secondary-btn)', color: 'var(--secondary-btn)' }}>
              {loading ? 'Processing...' : 'Upload Prizes (Rank, Prize Name, Quantity)'}
              <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'prizes')} disabled={loading} />
            </label>
            <div className="status-text">{prizeUploadStatus}</div>
            <div className="stat-text">Total Prizes Configured: <strong>{prizes.length}</strong></div>
          </div>
          
          <button onClick={resetDraws} style={{ marginTop: '2rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #f87171', color: '#f87171', borderRadius: '8px', cursor: 'pointer' }}>
            Reset All Draw Results
          </button>
        </div>

        <div className="dashboard-card panel-card highlight-panel">
          <h2>Conduct Lucky Draw</h2>
          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Prize to Draw:</label>
            <select value={selectedPrizeId} onChange={(e) => setSelectedPrizeId(e.target.value)} className="select-input">
              <option value="">-- Choose Prize --</option>
              {prizes.map(p => {
                const drawnCount = getDrawnCount(p.name);
                const remaining = p.quantity - drawnCount;
                return (
                  <option key={p.id} value={p.id} disabled={remaining <= 0}>
                    {p.name} ({p.session}) - {remaining} left
                  </option>
                );
              })}
            </select>
          </div>
          <button className="btn giant-draw-btn" onClick={conductDraw} disabled={drawing || !selectedPrizeId}>
            {drawing ? 'Drawing...' : 'DRAW WINNER!'}
          </button>
          {drawResult && !drawing && (
            <div className="draw-result-box">
              <h3>🎉 Winner Selected! 🎉</h3>
              <div className="winner-name">{drawResult.winner.name}</div>
              <div className="winner-dept">{drawResult.winner.department}</div>
              <div className="winner-prize">Won: {drawResult.prize.name}</div>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-card" style={{ marginTop: '3rem', padding: '0' }}>
        <div className="card-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <button 
            className={`tab-btn ${activeTab === 'winners' ? 'active' : ''}`}
            onClick={() => setActiveTab('winners')}
            style={{ padding: '1rem 2rem', border: 'none', background: 'transparent', fontWeight: '700', cursor: 'pointer', borderBottom: activeTab === 'winners' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'winners' ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            Winner List
          </button>
          <button 
            className={`tab-btn ${activeTab === 'prizes' ? 'active' : ''}`}
            onClick={() => setActiveTab('prizes')}
            style={{ padding: '1rem 2rem', border: 'none', background: 'transparent', fontWeight: '700', cursor: 'pointer', borderBottom: activeTab === 'prizes' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'prizes' ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            Prize Inventory
          </button>
        </div>

        {activeTab === 'winners' ? (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Prize Won</th>
              </tr>
            </thead>
            <tbody>
              {employees.filter(e => e.won_prize).map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: '600' }}>{emp.name}</td>
                  <td>{emp.department}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: '700' }}>{emp.won_prize}</td>
                </tr>
              ))}
              {employees.filter(e => e.won_prize).length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No winners drawn yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>SESSION</th>
                <th>RANK</th>
                <th>PRIZE NAME</th>
                <th>TOTAL</th>
                <th>DRAWN</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {prizes.map(p => {
                const drawn = getDrawnCount(p.name);
                const isComplete = drawn >= p.quantity;
                return (
                  <tr key={p.id}>
                    <td>{p.session}</td>
                    <td>{p.rank}</td>
                    <td style={{ fontWeight: '600' }}>{p.name}</td>
                    <td>{p.quantity}</td>
                    <td>{drawn}</td>
                    <td>
                      <span className={`status-pill ${isComplete ? 'drawn' : 'pending'}`}>
                        {isComplete ? 'Fully Drawn' : `${p.quantity - drawn} Remaining`}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {prizes.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No prizes uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Admin;
