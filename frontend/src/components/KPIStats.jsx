import React from 'react';

export default function KPIStats({ total, belowTarget, maxDiscount }) {
  return (
    <section className="stats-grid">
      <div className="stat-card card-total">
        <div className="stat-icon-wrapper purple">
          <i className="fa-solid fa-microchip"></i>
        </div>
        <div className="stat-details">
          <span className="stat-label">Produtos Monitorados</span>
          <h2 className="stat-value">{total}</h2>
        </div>
        <div className="stat-bg-glow"></div>
      </div>
      
      <div className="stat-card card-alerts">
        <div className="stat-icon-wrapper emerald">
          <i className="fa-solid fa-bullseye"></i>
        </div>
        <div className="stat-details">
          <span className="stat-label">Preço-Alvo Atingido</span>
          <h2 className="stat-value text-emerald">{belowTarget}</h2>
        </div>
        <div className="stat-bg-glow"></div>
      </div>
      
      <div className="stat-card card-discount">
        <div className="stat-icon-wrapper cyan">
          <i className="fa-solid fa-tag"></i>
        </div>
        <div className="stat-details">
          <span className="stat-label">Maior Desconto Encontrado</span>
          <h2 className="stat-value text-cyan">{maxDiscount}%</h2>
        </div>
        <div className="stat-bg-glow"></div>
      </div>
    </section>
  );
}
