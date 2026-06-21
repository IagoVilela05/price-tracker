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
 * Componente que renderiza o painel deslizante (Drawer) para o Simulador de Orçamento.
 * 
 * @component
 * @param {Object} props - Propriedades do componente.
 * @param {boolean} props.active - Controla a visibilidade/slide do painel.
 * @param {Function} props.onClose - Callback para fechar o painel.
 * @param {Array<Object>} props.products - Lista completa de produtos cadastrados no sistema.
 * @param {Array<number>} props.selectedIds - Array de IDs de produtos incluídos no orçamento atual.
 * @param {Function} props.onToggleItem - Callback para adicionar ou remover um produto do orçamento.
 * @param {Function} props.onClear - Callback para limpar todos os itens selecionados.
 * @returns {React.JSX.Element} Painel Drawer renderizado.
 */
export default function BudgetDrawer({ active, onClose, products = [], selectedIds = [], onToggleItem, onClear }) {
  // Filtra os produtos incluídos no orçamento
  const selectedProducts = products.filter(p => selectedIds.includes(p.id));

  // Filtra produtos disponíveis para adicionar (não incluídos ainda)
  const availableProducts = products.filter(p => !selectedIds.includes(p.id));

  // Cálculos financeiros
  const totalPix = selectedProducts.reduce((sum, p) => sum + (p.last_price || 0), 0);
  const totalInstallments = selectedProducts.reduce((sum, p) => sum + (p.last_price_installments || p.last_price || 0), 0);
  const totalTarget = selectedProducts.reduce((sum, p) => sum + (p.target_price || 0), 0);
  
  // Economia acumulada para os produtos que atingiram a meta (abaixo do preço alvo)
  const savings = selectedProducts.reduce((sum, p) => {
    if (p.last_price && p.target_price && p.last_price <= p.target_price) {
      return sum + (p.target_price - p.last_price);
    }
    return sum;
  }, 0);

  const handleQuickAdd = (e) => {
    const id = parseInt(e.target.value);
    if (!isNaN(id)) {
      onToggleItem(id);
      e.target.value = ''; // Reset select dropdown
    }
  };

  return (
    <>
      {/* Backdrop de fundo escurecido */}
      <div 
        onClick={onClose} 
        className={`budget-drawer-backdrop ${active ? 'active' : ''}`}
      ></div>

      {/* Painel Deslizante lateral */}
      <div className={`budget-drawer-container ${active ? 'active' : ''}`}>
        
        <div className="budget-drawer-header">
          <h3 className="budget-drawer-title">
            <i className="fa-solid fa-calculator text-cyan"></i> Meu Orçamento
          </h3>
          <button onClick={onClose} className="budget-drawer-close" title="Fechar painel">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="budget-drawer-body">
          {/* Seletor Rápido (Quick Add) */}
          <div className="budget-quick-add">
            <label className="form-label" style={{ fontSize: '11px' }}>Adicionar Componente Cadastrado</label>
            <div className="budget-select-wrapper">
              <select onChange={handleQuickAdd} defaultValue="">
                <option value="" disabled>Selecione um hardware...</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({getStoreNameFormatted(p.store)} - {formatBRL(p.last_price)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Itens no Orçamento */}
          <div className="budget-list-container">
            <span className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '8px' }}>
              Peças Selecionadas ({selectedProducts.length})
            </span>
            
            {selectedProducts.length > 0 ? (
              <div className="budget-list">
                {selectedProducts.map(p => (
                  <div key={p.id} className="budget-item-card">
                    <div className="budget-item-details">
                      <div className="budget-item-name" title={p.name}>
                        {p.name}
                      </div>
                      <div className="budget-item-price-row">
                        <span className="budget-item-price-pix" title="Preço Pix/À Vista">
                          {getStoreIcon(p.store)} {formatBRL(p.last_price)}
                        </span>
                        {p.last_price_installments && p.last_price_installments > p.last_price && (
                          <span className="budget-item-price-inst" title="Preço Parcelado">
                            <i className="fa-solid fa-credit-card"></i> {formatBRL(p.last_price_installments)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="budget-item-actions">
                      <button 
                        onClick={() => onToggleItem(p.id)}
                        className="budget-item-remove-btn"
                        title="Remover do Orçamento"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 20px', minHeight: 'auto', borderStyle: 'dashed' }}>
                <i className="fa-solid fa-calculator" style={{ fontSize: '24px', opacity: 0.3, marginBottom: '10px' }}></i>
                <p style={{ fontSize: '13px' }}>Nenhum componente adicionado à build.</p>
                <p className="text-muted" style={{ fontSize: '11px' }}>Adicione itens através da busca acima ou clicando em "Orçamento" nos cards de produtos.</p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Totais Financeiros */}
        <div className="budget-drawer-footer">
          <div className="budget-summary-card">
            <div className="budget-summary-row">
              <span className="budget-summary-label">Preço Alvo Total:</span>
              <span className="budget-summary-val text-muted">{formatBRL(totalTarget)}</span>
            </div>
            {savings > 0 && (
              <div className="budget-summary-row savings">
                <span className="budget-summary-label">Economia Acumulada:</span>
                <span className="budget-summary-val">-{formatBRL(savings)}</span>
              </div>
            )}
            <div className="budget-summary-row">
              <span className="budget-summary-label">Total Parcelado:</span>
              <span className="budget-summary-val text-secondary">{formatBRL(totalInstallments)}</span>
            </div>
            <div className="budget-summary-row accent">
              <span className="budget-summary-label">Total à Vista (Pix):</span>
              <span className="budget-summary-val">{formatBRL(totalPix)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={onClear}
              disabled={selectedProducts.length === 0}
              className="btn btn-secondary btn-full"
              style={{ flex: 1, padding: '10px 15px', fontSize: '13px' }}
            >
              <i className="fa-solid fa-eraser"></i> Limpar Tudo
            </button>
            <button 
              onClick={onClose}
              className="btn btn-primary btn-full"
              style={{ flex: 2, padding: '10px 15px', fontSize: '13px' }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
