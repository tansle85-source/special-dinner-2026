import React from 'react';

const FoodMenu = () => {
  return (
    <div style={{ minHeight:'100vh', background:'#FFFFFF', fontFamily:"'Outfit',sans-serif", padding:'2rem' }}>
      <h1 style={{ textAlign:'center', fontWeight:900, marginBottom:'2rem', color:'#1D1D1D' }}>🍽️ Grand Dinner Menu</h1>
      <div style={{ maxWidth:'500px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'2rem' }}>
        
        <div className="menu-section">
          <h2 style={{ color:'#0A8276', fontSize:'1.2rem', fontWeight:900, textTransform:'uppercase', letterSpacing:'2px', marginBottom:'1rem', textAlign:'center' }}>Appetizer</h2>
          <p style={{ textAlign:'center', fontWeight:600, color:'#374151', lineHeight:1.6 }}>
            Luxury Trio Platter<br/>
            <span style={{ fontSize:'0.85rem', color:'#6b7280', fontWeight:400 }}>Smoked Salmon, Golden Spring Roll, Chilled Jellyfish</span>
          </p>
        </div>

        <div className="menu-section">
          <h2 style={{ color:'#0A8276', fontSize:'1.2rem', fontWeight:900, textTransform:'uppercase', letterSpacing:'2px', marginBottom:'1rem', textAlign:'center' }}>Soup</h2>
          <p style={{ textAlign:'center', fontWeight:600, color:'#374151', lineHeight:1.6 }}>
            Braised Seafood Treasure Soup<br/>
            <span style={{ fontSize:'0.85rem', color:'#6b7280', fontWeight:400 }}>With Crab Meat & Dried Scallops</span>
          </p>
        </div>

        <div className="menu-section">
          <h2 style={{ color:'#0A8276', fontSize:'1.2rem', fontWeight:900, textTransform:'uppercase', letterSpacing:'2px', marginBottom:'1rem', textAlign:'center' }}>Main Courses</h2>
          <p style={{ textAlign:'center', fontWeight:600, color:'#374151', lineHeight:1.6, marginBottom:'1.5rem' }}>
            Roasted Crispy Chicken with Prawn Crackers<br/>
            Steamed Sea Bass in Superior Soya Sauce<br/>
            Wok-Fried Tiger Prawns with Salted Egg Yolk<br/>
            Braised Abalone Mushroom with Broccoli<br/>
            Fragrant Lotus Leaf Rice
          </p>
        </div>

        <div className="menu-section">
          <h2 style={{ color:'#0A8276', fontSize:'1.2rem', fontWeight:900, textTransform:'uppercase', letterSpacing:'2px', marginBottom:'1rem', textAlign:'center' }}>Dessert</h2>
          <p style={{ textAlign:'center', fontWeight:600, color:'#374151', lineHeight:1.6 }}>
            Chilled Honeydew Sago with Pomelo<br/>
            Assorted Premium Chinese Pastries
          </p>
        </div>

      </div>
      <div style={{ textAlign:'center', marginTop:'3rem' }}>
        <button onClick={() => window.history.back()} style={{ padding:'0.8rem 2rem', borderRadius:'12px', border:'none', background:'#0A8276', color:'white', fontWeight:800, cursor:'pointer' }}>
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default FoodMenu;
