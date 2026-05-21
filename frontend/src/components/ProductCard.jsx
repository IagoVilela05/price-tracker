import React from 'react';

// Helpers
const formatBRL = (val) => {
  if (val === null || val === undefined) return 'Indisponível';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getStoreIcon = (store) => {
  const icons = {
    'amazon': <i className="fa-brands fa-amazon"></i>,
    'mercadolivre': <i className="fa-solid fa-handshake"></i>,
    'kabum': <i className="fa-solid fa-k"></i>,
    'pichau': <i className="fa-solid fa-p"></i>,
    'terabyte': <i className="fa-solid fa-t"></i>
  };
  return icons[store.toLowerCase()] || <i className="fa-solid fa-store"></i>;
};

const getStoreNameFormatted = (store) => {
  const names = {
    'amazon': 'Amazon',
    'mercadolivre': 'Mercado Livre',
    'kabum': 'KaBuM!',
    'pichau': 'Pichau',
    'terabyte': 'TerabyteShop'
  };
  return names[store.toLowerCase()] || store;
};

export default function ProductCard({ product, onDelete, onShowHistory, onRename }) {
  const isBeaten = product.last_price && product.last_price <= product.target_price;
  
  // Calculate variations
  let discountPct = 0;
  if (product.last_price && product.stats?.avg_price && product.last_price < product.stats.avg_price) {
    const diff = ((product.stats.avg_price - product.last_price) / product.stats.avg_price) * 100;
    discountPct = Math.round(diff);
  }

  return (
    <div className={`product-card ${isBeaten ? 'target-beaten' : ''}`}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className={`store-badge ${product.store.toLowerCase()}`} style={{ marginBottom: 0 }}>
            {getStoreIcon(product.store)} {getStoreNameFormatted(product.store)}
          </span>
          <button 
            onClick={() => {
              const newName = prompt("Editar nome / apelido do produto:", product.name);
              if (newName !== null) {
                onRename(product.id, newName);
              }
            }} 
            className="rename-btn"
            title="Editar apelido"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'var(--transition-smooth)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-cyan)';
              e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <i className="fa-solid fa-pen"></i>
          </button>
        </div>
        <h4 className="product-name" title={product.name}>{product.name}</h4>
      </div>
      
      <div>
        <div className="card-stats-row">
          <div className="card-stat">
            <span className="card-stat-label">Min Histórico</span>
            <span className="card-stat-val text-emerald">
              {formatBRL(product.stats?.min_price || product.last_price)}
            </span>
          </div>
          <div className="card-stat right">
            <span className="card-stat-label">Variação Média</span>
            <span className={`card-stat-val ${discountPct > 0 ? 'text-emerald' : 'text-muted'}`}>
              {discountPct > 0 ? `-${discountPct}%` : 'Estável'}
            </span>
          </div>
        </div>

        {product.last_price_installments && product.last_price_installments > product.last_price ? (
          <div className="price-details dual-price">
            <div className="dual-price-main">
              <div className="price-info">
                <span className="price-label">⚡ À Vista (Pix)</span>
                <span className="price-value">{formatBRL(product.last_price)}</span>
              </div>
              <div className="target-info">
                <span className="target-label">Preço Alvo</span>
                <span className="target-value">{formatBRL(product.target_price)}</span>
              </div>
            </div>
            <div className="dual-price-installment">
              <span className="price-label">
                <i className="fa-solid fa-credit-card"></i> Parcelado
              </span>
              <span className="installment-value">
                {formatBRL(product.last_price_installments)}
              </span>
            </div>
          </div>
        ) : (
          <div className="price-details">
            <div className="price-info">
              <span className="price-label">Preço Atual</span>
              <span className="price-value">{formatBRL(product.last_price)}</span>
            </div>
            <div className="target-info">
              <span className="target-label">Preço Alvo</span>
              <span className="target-value">{formatBRL(product.target_price)}</span>
            </div>
          </div>
        )}

        <div className="card-footer">
          <button 
            onClick={() => onShowHistory(product)} 
            className="card-btn card-btn-primary"
          >
            <i className="fa-solid fa-chart-line"></i> Histórico
          </button>
          <button 
            onClick={() => onDelete(product.id)} 
            className="card-btn card-btn-danger" 
            title="Excluir produto"
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
