import React from 'react';

export default function Header({ isScanning, onSync, statusText }) {
  return (
    <header className="app-header">
      <div className="logo-container">
        <div className="logo-icon-wrapper">
          <i className="fa-solid fa-radar fa-fade logo-icon"></i>
        </div>
        <div>
          <h1 className="app-title">Price<span className="accent-text">Tracker</span></h1>
          <p className="app-subtitle">Monitoramento Inteligente de Hardware (React SPA)</p>
        </div>
      </div>
      
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
      </div>
    </header>
  );
}
