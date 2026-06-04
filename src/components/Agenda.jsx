import React from 'react';

const agenda = [
  {
    time: '5:00pm – 6:30pm',
    items: ['Registration'],
  },
  {
    time: '6:00pm',
    items: ['Ballroom doors open'],
  },
  {
    time: '6:30pm',
    items: ['LK1 grand entrance'],
  },
  {
    time: '6:35pm',
    items: [
      'Opening gimmick & emcee introduction',
      'Welcoming and opening speeches',
    ],
  },
  {
    time: '7:00pm',
    items: [
      'Dinner presentation by St. Giles Wembley Hotel',
      { bold: "Appreciation Award:", suffix: " Employee's Experience Category" },
      { plain: 'Lucky draw – ', italic: '1st draw' },
      'Employee performance 1',
      'Employee performance 2',
      { bold: "Appreciation Awards:", suffix: " Sports & Recreations Category" },
      { plain: 'Lucky draw – ', italic: '2nd draw' },
    ],
  },
  {
    time: '7:35pm',
    items: [
      'Games',
      { bold: "Appreciation Awards:", suffix: " Technical Category" },
      'Employee performance 3',
      'Employee performance 4',
    ],
  },
  {
    time: '8:00pm',
    items: [
      'Table draw & games',
      { bold: "Service Awards:", suffix: " 35 years & 25 years anniversary" },
      'Employee performance 5',
      'Employee performance 6',
    ],
  },
  {
    time: '8:35pm',
    items: [
      { plain: 'Lucky draw – ', italic: 'Top 5' },
      'Employee performance 7',
      'Employee performance 8',
      'Best Dress Awards',
    ],
  },
  {
    time: '9:10pm',
    items: [
      'Performance best costume & result announcement',
      { plain: 'Special montage – ', italic: 'behind the scenes' },
      'Organizing committee introduction',
      'Event survey via QR code',
    ],
  },
  {
    time: '9:40pm',
    items: [
      'Performance by all singers',
      'Group photo',
      { plain: 'Lucky draw – ', italic: 'Top 3' },
    ],
  },
  {
    time: '10:15pm',
    items: ['End'],
    isLast: true,
  },
];

const renderItem = (item, i) => {
  if (typeof item === 'string') {
    return (
      <div key={i} style={{ color: '#374151', fontSize: '0.92rem', lineHeight: 1.65, padding: '1px 0' }}>
        {item}
      </div>
    );
  }
  if (item.bold) {
    return (
      <div key={i} style={{ color: '#374151', fontSize: '0.92rem', lineHeight: 1.65, padding: '1px 0' }}>
        <strong style={{ color: '#111827' }}>{item.bold}</strong>{item.suffix}
      </div>
    );
  }
  if (item.italic) {
    return (
      <div key={i} style={{ color: '#374151', fontSize: '0.92rem', lineHeight: 1.65, padding: '1px 0' }}>
        {item.plain}<em style={{ fontStyle: 'italic', color: '#374151' }}>{item.italic}</em>
      </div>
    );
  }
  return null;
};

const Agenda = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .ag-row { display: flex; position: relative; }

        .ag-time {
          min-width: 108px;
          width: 108px;
          font-weight: 800;
          color: #0A8276;
          font-size: 0.82rem;
          padding: 1.05rem 0.75rem 1.05rem 0;
          line-height: 1.4;
          text-align: right;
          flex-shrink: 0;
        }

        .ag-spine {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 26px;
          flex-shrink: 0;
        }

        .ag-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #0A8276;
          border: 2px solid white;
          box-shadow: 0 0 0 2.5px #0A8276;
          margin-top: 1.15rem;
          z-index: 1;
          flex-shrink: 0;
        }

        .ag-line {
          flex: 1;
          width: 2px;
          background: linear-gradient(to bottom, #0A8276, #d1fae5);
          min-height: 8px;
        }

        .ag-content {
          flex: 1;
          padding: 0.85rem 0.5rem 0.85rem 0.6rem;
          border-bottom: 1px solid #f0f4f8;
        }

        .ag-row:last-child .ag-content { border-bottom: none; }
        .ag-row:last-child .ag-line { display: none; }

        @media (max-width: 380px) {
          .ag-time { min-width: 80px; width: 80px; font-size: 0.72rem; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A8276 0%, #0369a1 100%)',
        padding: '2.5rem 1.5rem 2.25rem',
        textAlign: 'center',
        color: 'white',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
        <h1 style={{
          fontSize: 'clamp(1.25rem, 5vw, 1.75rem)',
          fontWeight: 900,
          letterSpacing: '-0.5px',
          lineHeight: 1.2,
        }}>
          2026 Infineon Penang
        </h1>
        <p style={{
          fontWeight: 800,
          fontSize: '0.95rem',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          opacity: 0.9,
          marginTop: '0.3rem',
        }}>
          Appreciation Dinner
        </p>
        <div style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.18)',
          borderRadius: '30px',
          padding: '0.3rem 1.1rem',
          fontSize: '0.78rem',
          fontWeight: 700,
          marginTop: '0.75rem',
          letterSpacing: '1px',
        }}>
          Program Agenda
        </div>
      </div>

      {/* Timeline Card */}
      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '0.75rem 0.75rem 0.5rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          {agenda.map((block, idx) => (
            <div key={idx} className="ag-row">
              <div className="ag-time">{block.time}</div>
              <div className="ag-spine">
                <div
                  className="ag-dot"
                  style={{
                    background: block.isLast ? '#ef4444' : '#0A8276',
                    boxShadow: `0 0 0 2.5px ${block.isLast ? '#ef4444' : '#0A8276'}`,
                  }}
                />
                <div className="ag-line" />
              </div>
              <div className="ag-content">
                {block.items.map((item, i) => renderItem(item, i))}
              </div>
            </div>
          ))}
        </div>

        {/* Back button */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '0.85rem 2.5rem',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #0A8276, #0369a1)',
              color: 'white',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              boxShadow: '0 4px 16px rgba(10,130,118,0.3)',
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Agenda;
