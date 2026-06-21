import React, { useState } from 'react';

/**
 * Componente que renderiza o painel lateral de cadastro de novos links de hardware,
 * incluindo auto-complete de categorias/coleções sugeridas.
 * 
 * @component
 * @param {Object} props - Propriedades passadas ao componente.
 * @param {Function} props.onAddProduct - Callback assíncrono para requisição de criação de produto na API.
 * @param {Array<string>} [props.existingCollections=[]] - Coleções ativas salvas no banco para exibição no auto-complete datalist.
 * @returns {React.JSX.Element} Formulário de cadastro renderizado.
 */
export default function AddProductForm({ onAddProduct, onBatchImport, existingCollections = [] }) {
  const [activeTab, setActiveTab] = useState('single');
  const [url, setUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [collection, setCollection] = useState('');
  const [loading, setLoading] = useState(false);

  // Batch states
  const [batchText, setBatchText] = useState('');
  const [jsonItems, setJsonItems] = useState([]);
  const [fileName, setFileName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    const success = await onAddProduct({
      url: url.trim(),
      target_price: targetPrice ? parseFloat(targetPrice) : null,
      collection: collection.trim() || null
    });
    setLoading(false);
    
    if (success) {
      setUrl('');
      setTargetPrice('');
      setCollection('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (Array.isArray(json)) {
          const validItems = json.filter(item => item.url);
          if (validItems.length > 0) {
            setJsonItems(validItems);
            setBatchText(''); // Clear pasted text if file uploaded
          } else {
            alert('O arquivo JSON não contém itens válidos com "url".');
            setFileName('');
          }
        } else {
          alert('O JSON deve ser uma lista (array) de produtos.');
          setFileName('');
        }
      } catch (err) {
        alert('Erro ao processar o arquivo JSON. Verifique a formatação.');
        setFileName('');
      }
    };
    reader.readAsText(file);
  };

  const handleBatchSubmit = (e) => {
    e.preventDefault();
    let itemsToImport = [];

    if (jsonItems && jsonItems.length > 0) {
      itemsToImport = jsonItems.map(item => ({
        url: item.url.trim(),
        target_price: item.target_price ? parseFloat(item.target_price) : null,
        collection: item.collection ? item.collection.trim() : (collection.trim() || null)
      }));
    } else if (batchText.trim()) {
      const lines = batchText.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        const parts = line.split(/[\s,;]+/);
        if (parts.length >= 1) {
          const itemUrl = parts[0].trim();
          let price = null;
          if (parts.length >= 2) {
            const priceStr = parts[1].trim().replace(',', '.');
            const parsedPrice = parseFloat(priceStr);
            if (!isNaN(parsedPrice)) {
              price = parsedPrice;
            }
          }
          if (itemUrl.startsWith('http')) {
            itemsToImport.push({
              url: itemUrl,
              target_price: price,
              collection: collection.trim() || null
            });
          }
        }
      }
    }

    if (itemsToImport.length === 0) {
      alert('Nenhum item válido encontrado. Verifique o texto colado ou o arquivo JSON.');
      return;
    }

    onBatchImport(itemsToImport);
    setBatchText('');
    setJsonItems([]);
    setFileName('');
    setCollection('');
  };

  return (
    <aside className="side-panel">
      <div className="panel-card">
        <div className="form-tabs">
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveTab('single')}
          >
            <i className="fa-solid fa-plus-circle"></i> Individual
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
            onClick={() => setActiveTab('batch')}
          >
            <i className="fa-solid fa-boxes-stacked"></i> Em Lote
          </button>
        </div>

        {activeTab === 'single' ? (
          <>
            <h3 className="panel-title">
              <i className="fa-solid fa-plus-circle text-cyan"></i> Novo Link para Monitorar
            </h3>
            <p className="panel-description">
              Adicione um link válido de hardware das lojas parceiras e defina o preço-alvo desejado.
            </p>
            
            <form onSubmit={handleSubmit} className="form-container">
              <div className="form-group">
                <label htmlFor="product-url" className="form-label">URL do Produto</label>
                <div className="input-wrapper">
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
                <label htmlFor="target-price" className="form-label">Preço Alvo (R$, Opcional)</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-brazilian-real-sign input-icon"></i>
                  <input 
                    type="number" 
                    id="target-price" 
                    step="0.01" 
                    min="0.01" 
                    placeholder="Ex: 1200.00 (opcional)" 
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="product-collection" className="form-label">Coleção / Grupo (Opcional)</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-folder input-icon"></i>
                  <input 
                    type="text" 
                    id="product-collection" 
                    placeholder="Ex: Placa de Vídeo" 
                    list="existing-collections"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                  />
                  <datalist id="existing-collections">
                    {existingCollections.map((coll, idx) => (
                      <option key={idx} value={coll} />
                    ))}
                  </datalist>
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
          </>
        ) : (
          <>
            <h3 className="panel-title">
              <i className="fa-solid fa-boxes-stacked text-cyan"></i> Importar em Lote
            </h3>
            <p className="panel-description">
              Importe múltiplos produtos enviando uma lista de links ou fazendo upload de um JSON.
            </p>
            
            <form onSubmit={handleBatchSubmit} className="form-container">
              <div className="form-group">
                <label className="form-label">Colar Links (Um por linha)</label>
                <div className="textarea-wrapper">
                  <textarea 
                    placeholder="https://link1.com.br&#10;https://link2.com.br 2500.00"
                    value={batchText}
                    onChange={(e) => {
                      setBatchText(e.target.value);
                      if (e.target.value) {
                        setJsonItems([]);
                        setFileName('');
                      }
                    }}
                    disabled={fileName !== ''}
                  />
                </div>
                <div className="batch-instructions">
                  Digite cada produto em uma linha separada:<br/>
                  <code>[URL] [PREÇO_ALVO (opcional)]</code>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ou fazer upload de arquivo JSON</label>
                <div className="file-input-wrapper">
                  <label htmlFor="batch-json-file" className="file-input-label">
                    <i className="fa-solid fa-file-upload"></i> Escolher arquivo JSON
                  </label>
                  <input 
                    type="file" 
                    id="batch-json-file" 
                    accept=".json"
                    onChange={handleFileUpload}
                  />
                </div>
                {fileName && (
                  <div className="selected-file-info">
                    <i className="fa-solid fa-file-code"></i> {fileName} ({jsonItems.length} itens)
                    <button 
                      type="button" 
                      onClick={() => {
                        setJsonItems([]);
                        setFileName('');
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', marginLeft: '5px' }}
                    >
                      <i className="fa-solid fa-circle-xmark"></i>
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="batch-collection" className="form-label">Coleção / Grupo Padrão</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-folder input-icon"></i>
                  <input 
                    type="text" 
                    id="batch-collection" 
                    placeholder="Aplicar a todos (ex: Processador)" 
                    list="existing-collections"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    autoComplete="off"
                  />
                  <datalist id="existing-collections">
                    {existingCollections.map((coll, idx) => (
                      <option key={idx} value={coll} />
                    ))}
                  </datalist>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                disabled={!batchText.trim() && jsonItems.length === 0}
              >
                <i className="fa-solid fa-file-import"></i> Processar e Importar
              </button>
            </form>
          </>
        )}

        <div className="store-badges-showcase">
          <span>Lojas Suportadas:</span>
          <div className="badge-row">
            <span className="store-badge mini amazon"><i className="fa-brands fa-amazon"></i> Amazon</span>
            <span className="store-badge mini mercadolivre"><i className="fa-solid fa-handshake"></i> M. Livre</span>
            <span className="store-badge mini kabum"><i className="fa-solid fa-k"></i> Kabum</span>
            <span className="store-badge mini pichau"><i className="fa-solid fa-p"></i> Pichau</span>
            <span className="store-badge mini terabyte"><i className="fa-solid fa-t"></i> Terabyte</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
