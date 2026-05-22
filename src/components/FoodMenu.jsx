import React, { useState } from 'react';

const FoodMenu = () => {
  const [activeTab, setActiveTab] = useState('non-vege');

  const nonVegeMenu = [
    {
      category: "Appetizer",
      icon: "🥗",
      title: "Four Season Hot & Cold Combinations",
      items: [
        "Baked Scallop with Ebiko Mayo",
        "Crispy Fried Homemade Chicken Lobak",
        "Marinated Hotate Scallop with Cucumber and Black Fungus Szechuan Style",
        "Salmon Gravlax with Citrus"
      ]
    },
    {
      category: "Soup",
      icon: "🥣",
      title: "Seafood Chowder Soup",
      items: [
        "Served with Warm Soft Roll"
      ]
    },
    {
      category: "Poultry",
      icon: "🍗",
      title: "Crispy Fried Boneless Chicken",
      items: [
        "Served with Mint Jelly Dips and Almond Flakes"
      ]
    },
    {
      category: "Fish",
      icon: "🐟",
      title: "Steamed Red Lion Fish",
      items: [
        "Served with Thai Lemon Sauce"
      ]
    },
    {
      category: "Vegetables",
      icon: "🥦",
      title: "Braised Assorted Mushrooms",
      items: [
        "Carrots and Japanese Bean Puff with Broccoli"
      ]
    },
    {
      category: "Prawns",
      icon: "🍤",
      title: "Wok-fried King Prawns",
      items: [
        "Tossed in Nanyang Sauce"
      ]
    },
    {
      category: "Rice",
      icon: "🍚",
      title: "Tom Yum Fried Rice",
      items: [
        "With Chicken and Pineapple"
      ]
    },
    {
      category: "Dessert",
      icon: "🍨",
      title: "Chilled Honeydew Melon Puree and Sago",
      items: [
        "Served with Ice Cream"
      ]
    }
  ];

  const vegeMenu = [
    {
      category: "Appetizer",
      icon: "🥗",
      title: "Four Season Hot & Cold Combinations",
      items: [
        "Golden Fried Yam Deli",
        "Stir Fried Veg Three Layer Roasted with Dry Chilli",
        "Crispy Fried Yam Roll",
        "Mango Kerabu with Cashew Nut"
      ]
    },
    {
      category: "Soup",
      icon: "🥣",
      title: "Vegetarian Sweet Corn Cream Soup",
      items: [
        "Served with Warm Soft Roll"
      ]
    },
    {
      category: "Poultry",
      icon: "🥦",
      title: "Veg Drumstick",
      items: [
        "Served with Mint Jelly Dips"
      ]
    },
    {
      category: "Fish",
      icon: "🌱",
      title: "Veg Fish Salmon",
      items: [
        "Served with Sweet and Sour Sauce"
      ]
    },
    {
      category: "Vegetables",
      icon: "🥦",
      title: "Braised Flower Mushroom & Bái Ling Mushroom",
      items: [
        "Japanese Bean Puff with Green Vegetable"
      ]
    },
    {
      category: "Prawns",
      icon: "🍤",
      title: "Crispy Fried Noodle Veg Prawn",
      items: [
        "Tossed with Oat"
      ]
    },
    {
      category: "Rice",
      icon: "🍚",
      title: "Vegetarian Tom Yum Fried Rice",
      items: [
        "With Pineapple"
      ]
    },
    {
      category: "Dessert",
      icon: "🍨",
      title: "Chilled Honeydew Melon Puree and Sago",
      items: [
        "Served with Ice Cream"
      ]
    }
  ];

  const currentMenu = activeTab === 'non-vege' ? nonVegeMenu : vegeMenu;

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9', fontFamily: "'Outfit', sans-serif", padding: '2rem 1rem' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .menu-container {
          max-width: 540px;
          margin: 0 auto;
        }

        .tab-button {
          flex: 1;
          padding: 0.8rem 1rem;
          font-size: 0.95rem;
          font-weight: 800;
          border: none;
          background: transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          color: #6B7280;
        }

        .tab-button.active {
          background: #FFFFFF;
          color: #0A8276;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .menu-card {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          margin-bottom: 1.25rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .menu-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
        }

        .category-badge {
          background: rgba(10, 130, 118, 0.08);
          color: #0A8276;
          padding: 0.25rem 0.75rem;
          border-radius: 30px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          display: inline-block;
          margin-bottom: 0.5rem;
        }

        .category-badge.vege {
          background: rgba(5, 150, 105, 0.08);
          color: #059669;
        }

        .item-list {
          margin-top: 0.5rem;
          padding-left: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .item-bullet {
          color: #4B5563;
          font-size: 0.88rem;
          font-weight: 500;
          position: relative;
          list-style-type: none;
        }

        .item-bullet::before {
          content: "•";
          color: #0A8276;
          font-weight: bold;
          display: inline-block;
          width: 1em;
          margin-left: -1em;
        }

        .item-bullet.vege::before {
          color: #059669;
        }
      `}</style>

      <div className="menu-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🍽️</div>
          <h1 style={{ fontWeight: 900, color: '#111827', fontSize: '2.2rem', letterSpacing: '-0.5px' }}>
            Grand Dinner Menu
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.88rem', marginTop: '0.25rem', fontWeight: 500 }}>
            Enjoy the curated cuisines of our Appreciation Night 2026
          </p>
        </div>

        {/* Custom Tab Switcher */}
        <div style={{
          background: '#EAEAE9',
          padding: '4px',
          borderRadius: '16px',
          display: 'flex',
          gap: '4px',
          marginBottom: '2rem'
        }}>
          <button
            className={`tab-button ${activeTab === 'non-vege' ? 'active' : ''}`}
            onClick={() => setActiveTab('non-vege')}
          >
            🍖 Non-Vegetarian
          </button>
          <button
            className={`tab-button ${activeTab === 'vege' ? 'active' : ''}`}
            onClick={() => setActiveTab('vege')}
            style={activeTab === 'vege' ? { color: '#059669' } : {}}
          >
            🥗 Vegetarian
          </button>
        </div>

        {/* Menu Cards */}
        <div>
          {currentMenu.map((course, idx) => (
            <div key={idx} className="menu-card">
              <div style={{
                fontSize: '2rem',
                background: activeTab === 'non-vege' ? 'rgba(10, 130, 118, 0.06)' : 'rgba(5, 150, 105, 0.06)',
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {course.icon}
              </div>
              <div style={{ flex: 1 }}>
                <span className={`category-badge ${activeTab === 'vege' ? 'vege' : ''}`}>
                  {course.category}
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1F2937', lineHeight: 1.3 }}>
                  {course.title}
                </h3>
                
                {course.items.length > 0 && (
                  <ul className="item-list">
                    {course.items.map((item, itemIdx) => (
                      <li key={itemIdx} className={`item-bullet ${activeTab === 'vege' ? 'vege' : ''}`}>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem', marginBottom: '2rem' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '0.8rem 2.5rem',
              borderRadius: '14px',
              border: 'none',
              background: activeTab === 'non-vege' ? '#0A8276' : '#059669',
              color: 'white',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: activeTab === 'non-vege' ? '0 4px 14px rgba(10, 130, 118, 0.2)' : '0 4px 14px rgba(5, 150, 105, 0.2)',
              transition: 'transform 0.2s ease, background 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodMenu;
