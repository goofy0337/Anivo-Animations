import React, { useState, useEffect } from 'react';
import { projectAPI } from '../api/api';
import './Shop.css';

function Shop({ user, onBack, onPurchase }) {
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const coinKey = `coins_${user?.username || user?.id || 'guest'}`;
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem(coinKey);
    return saved ? parseInt(saved, 10) : 1000;
  });

  const shopItems = [
    { id: 'cube', name: 'Cube', price: 10, color: 0x00d4ff, icon: '🟦' },
    { id: 'sphere', name: 'Sphere', price: 15, color: 0x00ff00, icon: '🔵' },
    { id: 'cylinder', name: 'Cylinder', price: 12, color: 0xff00ff, icon: '🔶' },
    { id: 'torus', name: 'Torus', price: 20, color: 0xffff00, icon: '⭕' },
    { id: 'pyramid', name: 'Pyramid', price: 18, color: 0xff6b6b, icon: '🔺' },
    { id: 'rig', name: 'Rig/Skeleton', price: 50, color: 0x00ffff, icon: '🦴' },
    { id: 'sky', name: 'Sky', price: 30, color: 0x87ceeb, icon: '🌤️' },
  ];

  useEffect(() => {
    setItems(shopItems);
    // Load user inventory from localStorage
    const saved = localStorage.getItem('userInventory');
    if (saved) {
      setInventory(JSON.parse(saved));
    }
    // Ensure coin value is in sync if changed elsewhere
    const savedCoins = localStorage.getItem(coinKey);
    if (savedCoins) setCoins(parseInt(savedCoins, 10));
  }, []);

  const purchaseItem = (item) => {
    if (coins >= item.price) {
      const newCoins = coins - item.price;
      setCoins(newCoins);
      localStorage.setItem(coinKey, String(newCoins));
      const newInventory = [...inventory, item];
      setInventory(newInventory);
      localStorage.setItem('userInventory', JSON.stringify(newInventory));
      onPurchase(item);
      alert(`✅ Purchased ${item.name}!`);
    } else {
      alert('❌ Not enough coins!');
    }
  };

  const getPurchaseCount = (itemId) => {
    return inventory.filter(item => item.id === itemId).length;
  };

  return (
    <div className="shop-container">
      <div className="shop-header">
        <h2>🛍️ Block Shop</h2>
        <div className="coins-display">
          <span className="coin-icon">💰</span>
          <span className="coin-amount">{coins}</span>
        </div>
      </div>

      <div className="shop-grid">
        {items.map((item) => (
          <div key={item.id} className="shop-item">
            <div className="item-icon">{item.icon}</div>
            <h3>{item.name}</h3>
            <p className="item-price">💰 {item.price}</p>
            <p className="item-owned">
              Owned: <span className="owned-count">{getPurchaseCount(item.id)}</span>
            </p>
            <button
              className="btn-purchase"
              onClick={() => purchaseItem(item)}
              disabled={coins < item.price}
            >
              Buy
            </button>
          </div>
        ))}
      </div>

      <div className="shop-footer">
        <button className="btn-back" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}

export default Shop;
