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

export default function ProductCard({ 
  product, 
  onDelete, 
  onShowHistory, 
  onRename, 
  onUpdateCollection, 
  onUpdateTargetPrice,
  onToggleBudget, 
  isInBudget,
  viewMode = 'row'
}) {
  const isBeaten = product.last_price && product.target_price && product.last_price <= product.target_price;
  
  // Calculate variation percentage compared to historical average
  let discountPct = 0;
  if (product.last_price && product.stats?.avg_price && product.last_price < product.stats.avg_price) {
    const diff = ((product.stats.avg_price - product.last_price) / product.stats.avg_price) * 100;
    discountPct = Math.round(diff);
  }

  // Calculate sparkline points using SVG
  const prices = product.stats?.recent_prices || [];
  // Fallback to two points if no history is present yet
  const sparklinePoints = prices.length >= 2 ? prices : [product.last_price || 0, product.last_price || 0];
  
  const width = 90;
  const height = 30;
  const padding = 2;
  
  const minVal = Math.min(...sparklinePoints);
  const maxVal = Math.max(...sparklinePoints);
  const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;
  
  const points = sparklinePoints.map((val, index) => {
    const x = padding + (index / (sparklinePoints.length - 1)) * (width - padding * 2);
    const y = (height - padding) - ((val - minVal) / valRange) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  if (viewMode === 'row') {
    return (
      <tr className={isBeaten ? 'target-beaten' : ''}>
        <td>
          <div className="watchlist-product-cell">
            <div className="watchlist-product-details">
              <a 
                href={product.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="watchlist-product-name"
                title={product.name}
              >
                {product.name}
              </a>
              <div className="watchlist-product-meta">
                <span className={`store-badge mini ${product.store.toLowerCase()}`}>
                  {getStoreIcon(product.store)} {getStoreNameFormatted(product.store)}
                </span>
                {product.collection && (
                  <span className="product-collection-badge" title="Coleção">
                    <i className="fa-solid fa-folder"></i> {product.collection}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        
        <td>
          <div className="watchlist-price-pix">
            {formatBRL(product.last_price)}
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '4px' }}>Pix</span>
          </div>
          {product.last_price_installments && product.last_price_installments > product.last_price && (
            <div className="watchlist-price-installments" title="Parcelado">
              <i className="fa-solid fa-credit-card" style={{ fontSize: '9px', marginRight: '3px' }}></i>
              {formatBRL(product.last_price_installments)}
            </div>
          )}
        </td>
        
        <td>
          {product.target_price ? (
            <span style={{ fontWeight: 600, color: isBeaten ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
              {formatBRL(product.target_price)}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
          )}
          {isBeaten && (
            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <i className="fa-solid fa-circle-check"></i> META ATINGIDA
            </div>
          )}
        </td>
        
        <td>
          <span className={`watchlist-variation ${discountPct > 0 ? 'text-emerald' : 'text-muted'}`}>
            {discountPct > 0 ? (
              <>
                <i className="fa-solid fa-caret-down"></i> -{discountPct}%
              </>
            ) : (
              'Estável'
            )}
          </span>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Mín: {formatBRL(product.stats?.min_price || product.last_price)}
          </div>
        </td>
        
        <td>
          <div className="watchlist-sparkline-container" title="Tendência de preço (últimas verificações)">
            <svg className="watchlist-sparkline" width={width} height={height}>
              <polyline
                fill="none"
                stroke={discountPct > 0 ? "var(--accent-emerald)" : "var(--accent-primary)"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>
        </td>
        
        <td>
          <div className="watchlist-actions">
            <button 
              onClick={() => onShowHistory(product)} 
              className="watchlist-action-btn"
              title="Ver histórico de preços"
            >
              <i className="fa-solid fa-chart-line"></i>
            </button>

            <button 
              onClick={() => {
                const newTarget = prompt(
                  "Editar preço alvo (R$):", 
                  product.target_price !== null && product.target_price !== undefined ? product.target_price : ""
                );
                if (newTarget !== null) {
                  const parsed = newTarget.trim() === "" ? null : parseFloat(newTarget.replace(",", "."));
                  if (newTarget.trim() !== "" && (isNaN(parsed) || parsed <= 0)) {
                    alert("Por favor, insira um valor numérico válido positivo ou deixe em branco.");
                    return;
                  }
                  onUpdateTargetPrice(product.id, parsed);
                }
              }} 
              className="watchlist-action-btn"
              title="Editar preço alvo"
            >
              <i className="fa-solid fa-bullseye"></i>
            </button>
            
            <button 
              onClick={() => {
                const newColl = prompt("Editar coleção do produto (deixe em branco para sem coleção):", product.collection || "");
                if (newColl !== null) {
                   onUpdateCollection(product.id, newColl.trim() || null);
                }
              }} 
              className="watchlist-action-btn"
              title="Editar Coleção"
            >
              <i className="fa-solid fa-folder-open"></i>
            </button>

            <button 
              onClick={() => {
                const newName = prompt("Editar nome / apelido do produto:", product.name);
                if (newName !== null) {
                  onRename(product.id, newName);
                }
              }} 
              className="watchlist-action-btn"
              title="Editar apelido"
            >
              <i className="fa-solid fa-pen"></i>
            </button>
            
            <button 
              onClick={() => onToggleBudget(product.id)}
              className={`watchlist-action-btn budget ${isInBudget ? 'active' : ''}`}
              title={isInBudget ? 'Remover do Orçamento' : 'Adicionar ao Orçamento'}
            >
              <i className={isInBudget ? 'fa-solid fa-cart-shopping' : 'fa-solid fa-cart-plus'}></i>
            </button>
            
            <button 
              onClick={() => onDelete(product.id)} 
              className="watchlist-action-btn delete" 
              title="Excluir produto"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // viewMode === 'card' (Option A: Minimalist Nordic Card style)
  return (
    <div className={`product-card ${isBeaten ? 'target-beaten' : ''}`}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className={`store-badge ${product.store.toLowerCase()}`} style={{ marginBottom: 0 }}>
            {getStoreIcon(product.store)} {getStoreNameFormatted(product.store)}
          </span>
          {product.collection && (
            <span className="product-collection-badge" style={{ fontSize: '11px' }}>
              <i className="fa-solid fa-folder"></i> {product.collection}
            </span>
          )}
        </div>
        
        <h4 className="product-name" style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>
          <a href={product.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
            {product.name}
          </a>
        </h4>

        <div className="card-stats-row" style={{ marginTop: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
          <div className="card-stat">
            <span className="card-stat-label">Min Histórico</span>
            <span className="card-stat-val text-emerald">
              {formatBRL(product.stats?.min_price || product.last_price)}
            </span>
          </div>
          <div className="card-stat right">
            <span className="card-stat-label">Variação</span>
            <span className={`card-stat-val ${discountPct > 0 ? 'text-emerald' : 'text-muted'}`}>
              {discountPct > 0 ? `-${discountPct}%` : 'Estável'}
            </span>
          </div>
        </div>

        {product.last_price_installments && product.last_price_installments > product.last_price ? (
          <div className="price-details dual-price" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px' }}>
            <div className="dual-price-main">
              <div className="price-info">
                <span className="price-label">⚡ À Vista</span>
                <span className="price-value" style={{ fontSize: '18px' }}>{formatBRL(product.last_price)}</span>
              </div>
              {product.target_price && (
                <div className="target-info">
                  <span className="target-label">Preço Alvo</span>
                  <span className="target-value">{formatBRL(product.target_price)}</span>
                </div>
              )}
            </div>
            <div className="dual-price-installment" style={{ borderTop: '1px dashed var(--border-color)' }}>
              <span className="price-label">
                <i className="fa-solid fa-credit-card"></i> Parcelado
              </span>
              <span className="installment-value">
                {formatBRL(product.last_price_installments)}
              </span>
            </div>
          </div>
        ) : (
          <div className="price-details" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px' }}>
            <div className="price-info">
              <span className="price-label">Preço Atual</span>
              <span className="price-value" style={{ fontSize: '18px' }}>{formatBRL(product.last_price)}</span>
            </div>
            {product.target_price && (
              <div className="target-info">
                <span className="target-label">Preço Alvo</span>
                <span className="target-value">{formatBRL(product.target_price)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
        <div className="watchlist-sparkline-container" title="Tendência" style={{ width: '80px' }}>
          <svg className="watchlist-sparkline" width="80" height="25">
            <polyline
              fill="none"
              stroke={discountPct > 0 ? "var(--accent-emerald)" : "var(--accent-primary)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
        <div className="card-footer" style={{ borderTop: 'none', paddingTop: 0, margin: 0, gap: '6px' }}>
          <button 
            onClick={() => onShowHistory(product)} 
            className="card-btn card-btn-primary"
            style={{ padding: '6px 10px', fontSize: '11px' }}
            title="Histórico"
          >
            <i className="fa-solid fa-chart-line"></i>
          </button>
          <button 
            onClick={() => {
              const newTarget = prompt(
                "Editar preço alvo (R$):", 
                product.target_price !== null && product.target_price !== undefined ? product.target_price : ""
              );
              if (newTarget !== null) {
                const parsed = newTarget.trim() === "" ? null : parseFloat(newTarget.replace(",", "."));
                if (newTarget.trim() !== "" && (isNaN(parsed) || parsed <= 0)) {
                  alert("Por favor, insira um valor numérico válido positivo ou deixe em branco.");
                  return;
                }
                onUpdateTargetPrice(product.id, parsed);
              }
            }}
            className="card-btn card-btn-primary"
            style={{ padding: '6px 10px', fontSize: '11px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            title="Editar preço alvo"
          >
            <i className="fa-solid fa-bullseye"></i>
          </button>
          <button 
            onClick={() => onToggleBudget(product.id)}
            className={`card-btn card-btn-budget ${isInBudget ? 'active' : ''}`}
            style={{ padding: '6px 10px', fontSize: '11px' }}
            title="Orçamento"
          >
            <i className={isInBudget ? 'fa-solid fa-cart-shopping' : 'fa-solid fa-cart-plus'}></i>
          </button>
          <button 
            onClick={() => onDelete(product.id)} 
            className="card-btn card-btn-danger"
            style={{ padding: '6px 10px', fontSize: '11px' }}
            title="Excluir"
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
