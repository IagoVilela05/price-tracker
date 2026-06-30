import React from 'react';

export default function Header({ isScanning, onSync, statusText, currentTab, setCurrentTab, onAddClick }) {
  return (
    <header className="app-header">
      <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="logo-icon-wrapper" style={{ background: 'transparent', width: 'auto', height: 'auto', boxShadow: 'none', padding: 0 }}>
          <svg viewBox="0 0 100 100" width="38" height="38" style={{ display: 'block' }}>
            <circle cx="50" cy="50" r="48" fill="var(--accent-primary)" />
            <rect x="36" y="45" width="10" height="25" rx="3" fill="#fff" />
            <rect x="54" y="32" width="10" height="38" rx="3" fill="#fff" />
            <path d="M28 65 C 40 32, 60 22, 72 38" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h1 className="app-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px', lineHeight: '1.2' }}>
            PriceTracker
          </h1>
          <p className="app-subtitle" style={{ margin: '2px 0 0 0' }}>Monitoramento Inteligente de Produtos</p>
        </div>
      </div>
      
      <nav className="app-nav">
        <button 
          onClick={() => setCurrentTab('dashboard')} 
          className={`nav-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-chart-pie"></i> Painel Geral
        </button>
        <button 
          onClick={() => setCurrentTab('watchlist')} 
          className={`nav-btn ${currentTab === 'watchlist' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-list-check"></i> Watchlist
        </button>
      </nav>
      
      <div className="header-actions">
        <div className={`sync-status ${isScanning ? 'scanning' : 'idle'}`}>
          <span className="status-indicator"></span>
          <span>{statusText}</span>
        </div>
        <button 
          onClick={onSync} 
          disabled={isScanning} 
          className="btn btn-secondary"
        >
          <i 
            className={`fa-solid fa-arrows-rotate icon-spin-hover ${isScanning ? 'fa-spin' : ''}`}
          ></i> Sincronizar Agora
        </button>
        <button 
          onClick={onAddClick}
          className="btn btn-primary"
        >
          <i className="fa-solid fa-plus"></i> Cadastrar Produto
        </button>
      </div>
    </header>
  );
}

