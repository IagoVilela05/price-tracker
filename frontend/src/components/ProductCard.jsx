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
  onTogglePin,
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
          <div className="watchlist-product-cell" style={{ display: 'flex', alignItems: 'center' }}>
            <span 
              onClick={() => onTogglePin(product.id, !product.pinned)}
              style={{ cursor: 'pointer', marginRight: '10px', color: !!product.pinned ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', transition: 'color 0.2s' }}
              title={!!product.pinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <i className={!!product.pinned ? "fa-solid fa-star" : "fa-regular fa-star"} style={{ fontSize: '15px' }}></i>
            </span>
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
  const cardWidth = 100;
  const cardHeight = 35;
  const cardPadding = 2;
  
  const cardPointsList = sparklinePoints.map((val, index) => {
    const x = cardPadding + (index / (sparklinePoints.length - 1)) * (cardWidth - cardPadding * 2);
    const y = (cardHeight - cardPadding) - ((val - minVal) / valRange) * (cardHeight - cardPadding * 2);
    return { x, y };
  });

  const cardPathD = cardPointsList.length >= 2 
    ? `M ${cardPointsList.map(p => `${p.x} ${p.y}`).join(' L ')}` 
    : '';

  const cardFillD = cardPathD 
    ? `${cardPathD} L ${cardWidth - cardPadding} ${cardHeight} L ${cardPadding} ${cardHeight} Z` 
    : '';

  const cardLastX = cardPointsList.length > 0 ? cardPointsList[cardPointsList.length - 1].x : 0;
  const cardLastY = cardPointsList.length > 0 ? cardPointsList[cardPointsList.length - 1].y : 0;
  const gradId = `sparkline-grad-${product.id}`;

  return (
    <div className={`product-card ${isBeaten ? 'target-beaten' : ''}`}>
      <div>
        <h4 className="product-name" style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '700', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: 0 }}>
          <span 
            onClick={() => onTogglePin(product.id, !product.pinned)}
            style={{ cursor: 'pointer', color: !!product.pinned ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0, marginTop: '2px', transition: 'color 0.2s' }}
            title={!!product.pinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <i className={!!product.pinned ? "fa-solid fa-star" : "fa-regular fa-star"} style={{ fontSize: '14px' }}></i>
          </span>
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

      {/* Sparkline Grafico no estilo da Opcao A (Quiet Luxury / Area Chart) */}
      <div style={{ marginTop: '20px', marginBottom: '4px' }} title="Tendência de preço (últimas verificações)">
        {/* Range labels (min/max) + chart side by side */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
          {/* Min label (bottom-left reference) */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0, paddingBottom: '2px' }}>
            <span style={{ fontSize: '9px', fontFamily: "'Outfit', sans-serif", fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {formatBRL(maxVal)}
            </span>
            <span style={{ fontSize: '9px', fontFamily: "'Outfit', sans-serif", fontWeight: 600, color: discountPct > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {formatBRL(minVal)}
            </span>
          </div>

          {/* SVG chart — preserveAspectRatio="none" forces it to fill full width */}
          <svg
            viewBox={`0 0 ${cardWidth} ${cardHeight}`}
            preserveAspectRatio="none"
            style={{ flex: 1, height: '52px', display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={discountPct > 0 ? "var(--accent-emerald)" : "var(--accent-primary)"} stopOpacity="0.18" />
                <stop offset="100%" stopColor={discountPct > 0 ? "var(--accent-emerald)" : "var(--accent-primary)"} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Baseline rule */}
            <line
              x1={cardPadding} y1={cardHeight - cardPadding}
              x2={cardWidth - cardPadding} y2={cardHeight - cardPadding}
              stroke="var(--border-color)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
            <path d={cardFillD} fill={`url(#${gradId})`} stroke="none" />
            <path
              d={cardPathD}
              fill="none"
              stroke={discountPct > 0 ? "var(--accent-emerald)" : "var(--accent-primary)"}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {cardPointsList.length > 0 && (
              <>
                <circle cx={cardLastX} cy={cardLastY} r="5" fill={discountPct > 0 ? "var(--accent-emerald)" : "var(--accent-primary)"} opacity="0.2" vectorEffect="non-scaling-stroke" />
                <circle cx={cardLastX} cy={cardLastY} r="2.5" fill={discountPct > 0 ? "var(--accent-emerald)" : "var(--accent-primary)"} vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
        </div>
      </div>

      <div className="card-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
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
  );
}
