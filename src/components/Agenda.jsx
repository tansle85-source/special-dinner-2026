import React from 'react';

const Agenda = () => {
  return (
    <div style={{ minHeight:'100vh', background:'#FFFFFF', fontFamily:"'Outfit',sans-serif", padding:'2rem' }}>
      <h1 style={{ textAlign:'center', fontWeight:900, marginBottom:'2rem', color:'#1D1D1D' }}>📅 Event Agenda</h1>
      <div style={{ maxWidth:'500px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.5rem' }}>
        {[
          { time: '6:30 PM', event: 'Guest Arrival & Registration' },
          { time: '7:00 PM', event: 'Opening Performance' },
          { time: '7:15 PM', event: 'Welcome Speech by Management' },
          { time: '7:30 PM', event: 'Dinner Commencement' },
          { time: '8:15 PM', event: 'Lucky Draw Session 1' },
          { time: '8:45 PM', event: 'Stage Games & Interaction' },
          { time: '9:15 PM', event: 'Lucky Draw Grand Prize' },
          { time: '9:45 PM', event: 'Best Dress Award Announcement' },
          { time: '10:00 PM', event: 'Closing & Photography' },
        ].map((item, i) => (
          <div key={i} style={{ display:'flex', gap:'1.5rem', alignItems:'center', borderBottom:'1.5px dashed #e5e7eb', paddingBottom:'1rem' }}>
            <div style={{ fontWeight:900, color:'#0A8276', minWidth:'85px', fontSize:'1.1rem' }}>{item.time}</div>
            <div style={{ fontWeight:600, color:'#374151' }}>{item.event}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign:'center', marginTop:'3rem' }}>
        <button onClick={() => window.history.back()} style={{ padding:'0.8rem 2rem', borderRadius:'12px', border:'none', background:'#0A8276', color:'white', fontWeight:800, cursor:'pointer' }}>
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default Agenda;
