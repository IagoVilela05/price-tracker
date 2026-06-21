import React from 'react';

/**
 * Componente de Modal que exibe o progresso de importação em lote de produtos.
 * 
 * @component
 * @param {Object} props - Propriedades do componente.
 * @param {boolean} props.active - Controla a visibilidade do modal.
 * @param {Array<Object>} props.items - Itens que estão sendo processados na fila de importação.
 * @param {boolean} props.importing - Flag indicando se a importação está em progresso.
 * @param {Function} props.onClose - Função callback acionada para fechar o modal.
 * @returns {React.JSX.Element|null} Renderiza o modal se ativo, caso contrário null.
 */
export default function BatchImportModal({ active, items = [], importing, onClose }) {
  if (!active) return null;

  const total = items.length;
  const processed = items.filter(item => item.status === 'success' || item.status === 'error').length;
  const successes = items.filter(item => item.status === 'success').length;
  const errors = items.filter(item => item.status === 'error').length;
  const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0;

  // Extrai nome ou domínio amigável para exibição
  const getFriendlyUrlName = (url) => {
    try {
      const hostname = new URL(url).hostname;
      // Simplifica ex: www.kabum.com.br para Kabum
      let siteName = hostname.replace('www.', '').split('.')[0];
      siteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
      return `${siteName} - Link`;
    } catch (e) {
      return url;
    }
  };

  return (
    <div className="modal active">
      <div onClick={importing ? null : onClose} className="modal-backdrop"></div>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        {!importing && (
          <button onClick={onClose} className="modal-close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
        
        <div className="modal-header">
          <span className="modal-badge store-badge pichau">
            <i className="fa-solid fa-boxes-stacked"></i> Importação Sequencial
          </span>
          <h3 className="modal-title">Fila de Importação em Lote</h3>
          <p className="modal-subtitle">
            {importing 
              ? 'Importando produtos sequencialmente para evitar sobrecarga no servidor...' 
              : 'Processamento concluído. Veja os resultados abaixo.'}
          </p>
        </div>

        <div className="modal-body">
          {/* Barra de Progresso */}
          <div className="batch-progress-bar-container">
            <div 
              className="batch-progress-bar" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Resumos em KPI */}
          <div className="batch-stats-summary">
            <span>
              Progresso: <strong>{processed} de {total}</strong> ({progressPercent}%)
            </span>
            <div style={{ display: 'flex', gap: '15px' }}>
              <span style={{ color: 'var(--accent-success)' }}>
                <i className="fa-solid fa-circle-check"></i> Sucesso: <strong>{successes}</strong>
              </span>
              <span style={{ color: 'var(--accent-danger)' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Falhas: <strong>{errors}</strong>
              </span>
            </div>
          </div>

          {/* Lista de Itens */}
          <div className="batch-items-list">
            {items.map((item, idx) => (
              <div key={idx} className="batch-item-row">
                <div className="batch-item-info">
                  <span className="batch-item-url" title={item.url}>
                    {getFriendlyUrlName(item.url)}
                  </span>
                  <div className="batch-item-meta">
                    <span>Meta: <strong>{item.target_price ? `R$ ${item.target_price.toFixed(2)}` : 'Opcional'}</strong></span>
                    {item.collection && (
                      <span style={{ marginLeft: '10px' }}>
                        Grupo: <strong>{item.collection}</strong>
                      </span>
                    )}
                  </div>
                  {item.errorMsg && (
                    <span className="batch-item-error-msg">
                      <i className="fa-solid fa-circle-exclamation"></i> {item.errorMsg}
                    </span>
                  )}
                </div>

                <div className={`batch-item-status ${item.status}`}>
                  {item.status === 'pending' && (
                    <>
                      <i className="fa-regular fa-clock"></i> Aguardando
                    </>
                  )}
                  {item.status === 'processing' && (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Extraindo
                    </>
                  )}
                  {item.status === 'success' && (
                    <>
                      <i className="fa-solid fa-circle-check"></i> Pronto
                    </>
                  )}
                  {item.status === 'error' && (
                    <>
                      <i className="fa-solid fa-circle-xmark"></i> Falhou
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botão de Fechar no final */}
          <button 
            onClick={onClose} 
            disabled={importing}
            className="btn btn-primary btn-full"
            style={{ marginTop: '10px' }}
          >
            {importing ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Processando fila...
              </>
            ) : (
              'Concluir'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
