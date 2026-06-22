import React from 'react';

export default function Header({ isScanning, onSync, statusText, currentTab, setCurrentTab, onAddClick }) {
  return (
    <header className="app-header">
      <div className="logo-container">
        <div className="logo-icon-wrapper">
          <i className="fa-solid fa-microchip logo-icon"></i>
        </div>
        <div>
          <h1 className="app-title">Price<span className="accent-text">Tracker</span></h1>
          <p className="app-subtitle">Monitoramento Inteligente de Hardware</p>
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
          <i className="fa-solid fa-plus"></i> Cadastrar Hardware
        </button>
      </div>
    </header>
  );
}

