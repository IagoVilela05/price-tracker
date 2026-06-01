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

/**
 * Componente que renderiza um cartão de hardware individual contendo as estatísticas, 
 * badges de loja e coleção, histórico de preço Pix/parcelado e ações dinâmicas.
 * 
 * @component
 * @param {Object} props - Propriedades passadas ao componente.
 * @param {Object} props.product - Objeto contendo os dados e estatísticas do produto monitorado.
 * @param {number} props.product.id - Identificador único do produto no banco.
 * @param {string} props.product.name - Nome/Apelido do produto.
 * @param {string} props.product.store - Nome da loja parceira.
 * @param {string} props.product.url - Link do produto monitorado.
 * @param {number} props.product.target_price - Preço-alvo estipulado pelo usuário.
 * @param {string|null} props.product.collection - Nome da coleção associada.
 * @param {number} props.product.last_price - Último preço Pix lido.
 * @param {number|null} props.product.last_price_installments - Último preço parcelado lido.
 * @param {Object} props.product.stats - Estatísticas históricas.
 * @param {Function} props.onDelete - Callback assíncrono para remoção de produto.
 * @param {Function} props.onShowHistory - Callback para exibição do gráfico de preços.
 * @param {Function} props.onRename - Callback para atualização de apelido.
 * @param {Function} props.onUpdateCollection - Callback para edição de grupo/coleção.
 * @returns {React.JSX.Element} Card renderizado de hardware.
 */
export default function ProductCard({ product, onDelete, onShowHistory, onRename, onUpdateCollection }) {
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
        <div className="product-card-header-row">
          <div className="product-badges-col">
            <a 
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`store-badge ${product.store.toLowerCase()}`} 
              style={{ marginBottom: 0, textDecoration: 'none', cursor: 'pointer' }}
              title="Ir para a loja"
            >
              {getStoreIcon(product.store)} {getStoreNameFormatted(product.store)}
              <i className="fa-solid fa-up-right-from-square" style={{ fontSize: '9px', opacity: 0.7, marginLeft: '2px' }}></i>
            </a>
            {product.collection && (
              <span className="product-collection-badge" title="Coleção / Grupo">
                <i className="fa-solid fa-folder" style={{ marginRight: '4px' }}></i> {product.collection}
              </span>
            )}
          </div>
          
          <div className="product-actions-col">
            <button 
              onClick={() => {
                const newColl = prompt("Editar coleção do produto (deixe em branco para sem coleção):", product.collection || "");
                if (newColl !== null) {
                   onUpdateCollection(product.id, newColl.trim() || null);
                }
              }} 
              className="collection-edit-btn"
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
              className="rename-btn"
              title="Editar apelido"
            >
              <i className="fa-solid fa-pen"></i>
            </button>
          </div>
        </div>
        <a 
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="product-name-link"
          style={{ textDecoration: 'none', color: 'inherit' }}
          title="Ir para a loja"
        >
          <h4 className="product-name" title={product.name}>{product.name}</h4>
        </a>
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
