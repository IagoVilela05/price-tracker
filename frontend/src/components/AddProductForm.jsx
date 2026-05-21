import React, { useState } from 'react';

export default function AddProductForm({ onAddProduct }) {
  const [url, setUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url || !targetPrice) return;
    
    setLoading(true);
    const success = await onAddProduct({
      url: url.trim(),
      target_price: parseFloat(targetPrice)
    });
    setLoading(false);
    
    if (success) {
      setUrl('');
      setTargetPrice('');
    }
  };

  return (
    <aside className="side-panel">
      <div className="panel-card">
        <h3 className="panel-title">
          <i className="fa-solid fa-plus-circle text-cyan"></i> Novo Link para Monitorar
        </h3>
        <p className="panel-description">
          Adicione um link válido de hardware das lojas parceiras e defina o preço-alvo desejado.
        </p>
        
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="product-url" className="form-label">URL do Produto</label>
            <div class="input-wrapper">
              <i className="fa-solid fa-link input-icon"></i>
              <input 
                type="url" 
                id="product-url" 
                placeholder="https://www.kabum.com.br/produto/..." 
                required 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="target-price" className="form-label">Preço Alvo (R$)</label>
            <div class="input-wrapper">
              <i className="fa-solid fa-brazilian-real-sign input-icon"></i>
              <input 
                type="number" 
                id="target-price" 
                step="0.01" 
                min="0.01" 
                placeholder="Ex: 1200.00" 
                required 
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary btn-full"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Extraindo dados...
              </>
            ) : (
              <>
                <i className="fa-solid fa-plus"></i> Iniciar Rastreamento
              </>
            )}
          </button>
        </form>

        <div className="store-badges-showcase">
          <span>Lojas Suportadas:</span>
          <div className="badge-row">
            <span className="store-badge mini amazon"><i className="fa-brands fa-amazon"></i> Amazon</span>
            <span className="store-badge mini mercadolivre"><i class="fa-solid fa-handshake"></i> M. Livre</span>
            <span className="store-badge mini kabum"><i className="fa-solid fa-k"></i> Kabum</span>
            <span class="store-badge mini pichau"><i className="fa-solid fa-p"></i> Pichau</span>
            <span className="store-badge mini terabyte"><i className="fa-solid fa-t"></i> Terabyte</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
