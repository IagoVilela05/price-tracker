import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KPIStats from './components/KPIStats';
import AddProductForm from './components/AddProductForm';
import ProductCard from './components/ProductCard';
import HistoryChartModal from './components/HistoryChartModal';
import BatchImportModal from './components/BatchImportModal';
import BudgetDrawer from './components/BudgetDrawer';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const dateObj = new Date(dateStr);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${day}/${month} às ${hours}:${minutes}`;
  } catch (e) {
    return dateStr;
  }
};

export default function App() {
  // Global State
  const [productsList, setProductsList] = useState([]);
  const [activeStoreFilter, setActiveStoreFilter] = useState('all');
  const [activeCollectionFilter, setActiveCollectionFilter] = useState('all');
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState('Sistema Pronto');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  
  const [stats, setStats] = useState({
    total_products: 0,
    below_target: 0,
    max_discount_pct: 0,
    last_scan_time: null,
    next_scan_time: null
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [chartData, setChartData] = useState(null);

  // Batch Import State
  const [batchModalActive, setBatchModalActive] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [batchImporting, setBatchImporting] = useState(false);

  // Budget Simulator State
  const [budgetItemIds, setBudgetItemIds] = useState(() => {
    try {
      const saved = localStorage.getItem('price_tracker_budget');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('price_tracker_budget', JSON.stringify(budgetItemIds));
    } catch (e) {
      console.error(e);
    }
  }, [budgetItemIds]);

  // Toast State
  const [toast, setToast] = useState({
    visible: false,
    title: '',
    message: '',
    isError: false
  });

  // Base API URL
  const API_URL = '/api';

  // Load Dashboard Data
  useEffect(() => {
    fetchDashboardData();
    checkSyncStatus();
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchProducts()
      ]);
    } catch (err) {
      showToast('Erro de Conexão', 'Falha ao sincronizar dados com o back-end.', true);
    }
  };

  const fetchStats = async () => {
    const res = await fetch(`${API_URL}/stats?_t=${Date.now()}`);
    if (!res.ok) throw new Error('Stats API failed');
    const data = await res.json();
    setStats(data);
  };

  const fetchProducts = async () => {
    const res = await fetch(`${API_URL}/products?_t=${Date.now()}`);
    if (!res.ok) throw new Error('Products API failed');
    const data = await res.json();
    setProductsList(data);
  };

  const checkSyncStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/products/check-status?_t=${Date.now()}`);
      const data = await res.json();
      if (data.is_scanning) {
        setIsScanning(true);
        setStatusText('Verificando Preços...');
        pollSyncStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger manual background scan
  const handleTriggerSync = async () => {
    if (isScanning) return;
    try {
      const res = await fetch(`${API_URL}/products/check`, { method: 'POST' });
      const data = await res.json();
      
      if (data.status === 'started' || data.status === 'scanning') {
        setIsScanning(true);
        setStatusText('Verificando Preços...');
        showToast('Varredura Iniciada', data.message || 'Scraper rodando em background.');
        pollSyncStatus();
      }
    } catch (err) {
      showToast('Erro de Varredura', 'Não foi possível disparar a varredura.', true);
    }
  };

  // Poll background scan until finished
  const pollSyncStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/products/check-status?_t=${Date.now()}`);
        const data = await res.json();
        
        if (!data.is_scanning) {
          clearInterval(interval);
          setIsScanning(false);
          setStatusText('Sistema Pronto');
          showToast('Varredura Concluída', 'Todos os preços foram atualizados com sucesso!');
          fetchDashboardData();
        }
      } catch (err) {
        clearInterval(interval);
        setIsScanning(false);
        setStatusText('Sistema Pronto');
      }
    }, 3000);
  };

  // Add Product
  const handleAddProduct = async (payload) => {
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao processar URL');
      }
      
      showToast('Sucesso', 'Produto cadastrado e rastreamento iniciado!');
      fetchDashboardData();
      return true;
    } catch (err) {
      showToast('Erro de Cadastro', err.message, true);
      return false;
    }
  };

  // Batch Import
  const handleBatchImport = async (items) => {
    const formattedItems = items.map(item => ({
      ...item,
      status: 'pending',
      errorMsg: null
    }));
    
    setBatchItems(formattedItems);
    setBatchModalActive(true);
    setBatchImporting(true);

    for (let i = 0; i < formattedItems.length; i++) {
      setBatchItems(prevItems => {
        const updated = [...prevItems];
        updated[i].status = 'processing';
        return updated;
      });

      try {
        const res = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: formattedItems[i].url,
            target_price: formattedItems[i].target_price,
            collection: formattedItems[i].collection
          })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.detail || 'Erro ao processar URL');
        }

        setBatchItems(prevItems => {
          const updated = [...prevItems];
          updated[i].status = 'success';
          return updated;
        });
      } catch (err) {
        setBatchItems(prevItems => {
          const updated = [...prevItems];
          updated[i].status = 'error';
          updated[i].errorMsg = err.message || 'Erro de rede ou conexão.';
          return updated;
        });
      }
    }

    setBatchImporting(false);
    fetchDashboardData();
  };

  // Toggle item in budget simulator
  const handleToggleBudget = (productId) => {
    setBudgetItemIds(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Clear all items in budget
  const handleClearBudget = () => {
    if (confirm('Deseja realmente limpar todos os componentes do seu orçamento?')) {
      setBudgetItemIds([]);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id) => {
    if (!confirm('Deseja realmente remover este hardware e todo o seu histórico do monitoramento?')) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete API failed');
      
      showToast('Removido', 'Produto excluído com sucesso.');
      fetchDashboardData();
    } catch (err) {
      showToast('Erro ao Excluir', 'Falha ao remover o produto.', true);
    }
  };

  // Rename Product nickname
  const handleRenameProduct = async (id, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('Erro ao Renomear', 'O nome não pode estar vazio.', true);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/products/${id}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao renomear produto');
      }
      showToast('Apelido Atualizado', 'Nome do produto atualizado com sucesso!');
      fetchDashboardData();
    } catch (err) {
      showToast('Erro ao Renomear', err.message, true);
    }
  };

  // Update Product Collection
  const handleUpdateCollection = async (id, collection) => {
    try {
      const res = await fetch(`${API_URL}/products/${id}/collection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: collection })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao atualizar coleção');
      }
      showToast('Coleção Atualizada', 'A coleção do produto foi atualizada com sucesso!');
      fetchDashboardData();
    } catch (err) {
      showToast('Erro ao Atualizar', err.message, true);
    }
  };

  // Update Product Target Price
  const handleUpdateTargetPrice = async (id, targetPrice) => {
    try {
      const res = await fetch(`${API_URL}/products/${id}/target-price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_price: targetPrice })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao atualizar preço alvo');
      }
      showToast('Preço Alvo Atualizado', 'Preço alvo atualizado com sucesso!');
      fetchDashboardData();
    } catch (err) {
      showToast('Erro ao Atualizar', err.message, true);
    }
  };

  // Toggle Product Pinned/Favorite Status
  const handleTogglePin = async (id, pinned) => {
    try {
      const res = await fetch(`${API_URL}/products/${id}/pinned`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: pinned })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao favoritar produto');
      }
      showToast(pinned ? 'Adicionado aos Favoritos' : 'Removido dos Favoritos', pinned ? 'Produto fixado no Dashboard.' : 'Produto removido do Dashboard.');
      fetchDashboardData();
    } catch (err) {
      showToast('Erro ao favoritar', err.message, true);
    }
  };

  // View Product Price Chart History Modal
  const handleShowHistory = async (product) => {
    try {
      const res = await fetch(`${API_URL}/products/${product.id}/history?_t=${Date.now()}`);
      if (!res.ok) throw new Error('History API failed');
      const data = await res.json();
      
      setSelectedProduct(product);
      setChartData(data);
    } catch (err) {
      showToast('Erro de Conexão', 'Não foi possível obter dados históricos.', true);
    }
  };

  // Toast Notification Helper
  const showToast = (title, message, isError = false) => {
    setToast({
      visible: true,
      title,
      message,
      isError
    });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Extract existing collections dynamically
  const existingCollections = Array.from(
    new Set(
      productsList
        .map(p => p.collection)
        .filter(c => c && c.trim() !== '')
    )
  ).sort();

  // Client-side filtering logic
  const filteredProducts = productsList.filter(prod => {
    // 1. Store filter
    const storeMatch = activeStoreFilter === 'all' || prod.store.toLowerCase() === activeStoreFilter;
    if (!storeMatch) return false;

    // 2. Collection filter (custom or dynamic)
    if (activeCollectionFilter === 'all') return true;
    
    if (activeCollectionFilter === 'dynamic_below_target') {
      return prod.last_price && prod.target_price && prod.last_price <= prod.target_price;
    }
    if (activeCollectionFilter === 'dynamic_under_2000') {
      return prod.last_price && prod.last_price <= 2000;
    }
    if (activeCollectionFilter === 'dynamic_under_1000') {
      return prod.last_price && prod.last_price <= 1000;
    }

    // Default: custom user collection matching
    return prod.collection === activeCollectionFilter;
  });

  // Sort products by discount percentage for the dashboard "Maiores Descontos" section
  const productsWithDiscounts = productsList
    .map(prod => {
      let discountPct = 0;
      if (prod.last_price && prod.stats?.avg_price && prod.last_price < prod.stats.avg_price) {
        const diff = ((prod.stats.avg_price - prod.last_price) / prod.stats.avg_price) * 100;
        discountPct = Math.round(diff);
      }
      return { ...prod, discountPct };
    })
    .filter(prod => prod.discountPct > 0)
    .sort((a, b) => b.discountPct - a.discountPct);

  // Filter pinned/favorite products for the "Favoritos" section
  const pinnedProducts = productsList.filter(
    prod => !!prod.pinned
  );

  const formatBRL = (val) => {
    if (val === null || val === undefined) return 'Indisponível';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Store Distribution counts for analytics card
  const storeNamesMap = {
    amazon: 'Amazon',
    mercadolivre: 'Mercado Livre',
    kabum: 'KaBuM!',
    pichau: 'Pichau',
    terabyte: 'Terabyte'
  };
  const storeIconsMap = {
    amazon: 'fa-brands fa-amazon',
    mercadolivre: 'fa-solid fa-handshake',
    kabum: 'fa-solid fa-k',
    pichau: 'fa-solid fa-p',
    terabyte: 'fa-solid fa-t'
  };
  const storeDistribution = Object.keys(storeNamesMap).map(key => {
    const count = productsList.filter(p => p.store.toLowerCase() === key).length;
    const pct = productsList.length > 0 ? (count / productsList.length) * 100 : 0;
    return { key, name: storeNamesMap[key], icon: storeIconsMap[key], count, pct };
  }).sort((a, b) => b.count - a.count);

  // Active budget simulation list and calculations
  const budgetItems = productsList.filter(p => budgetItemIds.includes(p.id));
  const budgetTotal = budgetItems.reduce((sum, p) => sum + (p.last_price || 0), 0);

  return (
    <>
      <div className="glow-bg"></div>
      <div className="app-container">
        
        {/* Top Header Section */}
        <Header 
          isScanning={isScanning} 
          onSync={handleTriggerSync} 
          statusText={statusText}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onAddClick={() => setIsAddFormOpen(true)}
        />

        {currentTab === 'watchlist' && (
          <KPIStats 
            total={stats.total_products} 
            belowTarget={stats.below_target} 
            maxDiscount={stats.max_discount_pct} 
          />
        )}

        {currentTab === 'dashboard' ? (
          /* Painel Geral / Dashboard View: Two-Column Responsive Layout */
          <div className="dashboard-grid-layout" style={{ marginTop: '10px' }}>
            
            {/* Coluna da Esquerda (Destaques) */}
            <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
              
              {/* Box 1: Maiores Descontos */}
              <div className="dashboard-section">
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <i className="fa-solid fa-fire" style={{ color: 'var(--accent-primary)' }}></i> Maiores Descontos
                </h3>
                {productsWithDiscounts.length > 0 ? (
                  <div className="product-grid">
                    {productsWithDiscounts.slice(0, 4).map(prod => (
                      <ProductCard 
                        key={prod.id} 
                        product={prod} 
                        viewMode="card"
                        onDelete={handleDeleteProduct} 
                        onShowHistory={handleShowHistory} 
                        onRename={handleRenameProduct}
                        onUpdateCollection={handleUpdateCollection}
                        onUpdateTargetPrice={handleUpdateTargetPrice}
                        onTogglePin={handleTogglePin}
                        onToggleBudget={handleToggleBudget}
                        isInBudget={budgetItemIds.includes(prod.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nenhuma variação relevante detectada ainda.</p>
                )}
              </div>

              {/* Box 2: Produtos Favoritos */}
              <div className="dashboard-section">
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <i className="fa-solid fa-star" style={{ color: 'var(--accent-primary)' }}></i> Produtos Favoritos
                </h3>
                {pinnedProducts.length > 0 ? (
                  <div className="product-grid">
                    {pinnedProducts.map(prod => (
                      <ProductCard 
                        key={prod.id} 
                        product={prod} 
                        viewMode="card"
                        onDelete={handleDeleteProduct} 
                        onShowHistory={handleShowHistory} 
                        onRename={handleRenameProduct}
                        onUpdateCollection={handleUpdateCollection}
                        onUpdateTargetPrice={handleUpdateTargetPrice}
                        onTogglePin={handleTogglePin}
                        onToggleBudget={handleToggleBudget}
                        isInBudget={budgetItemIds.includes(prod.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nenhum produto favoritado ou fixado no momento. Use a estrela ao lado do nome de qualquer produto para fixá-lo aqui.</p>
                )}
              </div>
            </div>

            {/* Coluna da Direita (Painel Analítico Lateral) */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Card 1: Distribuição de Lojas */}
              <div className="panel-card" style={{ padding: '24px' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-chart-simple" style={{ color: 'var(--accent-primary)' }}></i> Cobertura de Lojas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {storeDistribution.map(item => (
                    <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                          <i className={item.icon}></i> {item.name}
                        </span>
                        <span style={{ color: 'var(--text-primary)' }}>{item.count} {item.count === 1 ? 'item' : 'itens'}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.pct}%`, height: '100%', background: 'var(--accent-emerald)', transition: 'width 0.5s ease-in-out' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Meu Orçamento Atual */}
              <div className="panel-card" style={{ padding: '24px' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 800, marginBottom: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-calculator" style={{ color: 'var(--accent-primary)' }}></i> Meu Orçamento
                </h3>
                
                {budgetItems.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '15px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Estimado</span>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatBRL(budgetTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                      {budgetItems.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px dashed var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={item.name}>{item.name}</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatBRL(item.last_price)}</span>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setIsBudgetOpen(true)}
                      className="btn btn-secondary btn-full"
                      style={{ fontSize: '12px', padding: '8px 16px' }}
                    >
                      <i className="fa-solid fa-expand"></i> Detalhar Simulação
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '15px 0' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Nenhum item selecionado para o orçamento ainda.</p>
                    <button 
                      onClick={() => setCurrentTab('watchlist')}
                      className="btn btn-secondary btn-full"
                      style={{ fontSize: '12px', padding: '8px 16px' }}
                    >
                      Ir para Watchlist
                    </button>
                  </div>
                )}
              </div>

              {/* Card 3: Status do Sistema e Agendamento */}
              <div className="panel-card" style={{ padding: '24px' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent-primary)' }}></i> Atividades
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '13px' }}>
                  
                  {/* Última varredura */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Última Varredura:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats.last_scan_time ? (
                        formatDateTime(stats.last_scan_time)
                      ) : (
                        'Nenhuma realizada'
                      )}
                    </span>
                  </div>

                  {/* Próxima varredura */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Próxima Varredura:</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      {stats.next_scan_time ? (
                        formatDateTime(stats.next_scan_time)
                      ) : (
                        'Agendada'
                      )}
                    </span>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '5px 0' }} />

                  {/* Telegram Bot status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Telegram Bot:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      <span style={{ width: '6px', height: '6px', background: 'var(--accent-emerald)', borderRadius: '50%' }}></span> Ativo
                    </span>
                  </div>

                </div>
              </div>

            </aside>

          </div>
        ) : (
          /* Watchlist View */
          <div className="dashboard-layout" style={{ display: 'block', width: '100%' }}>
            <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
              <div className="content-header">
                <h2 className="section-title">Hardware em Rastreamento</h2>
                
                <div className="filter-bar">
                  <div className="store-filters">
                    <button 
                      onClick={() => setActiveStoreFilter('all')} 
                      className={`filter-btn ${activeStoreFilter === 'all' ? 'active' : ''}`}
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => setActiveStoreFilter('amazon')} 
                      className={`filter-btn ${activeStoreFilter === 'amazon' ? 'active' : ''}`}
                    >
                      <i className="fa-brands fa-amazon"></i> Amazon
                    </button>
                    <button 
                      onClick={() => setActiveStoreFilter('mercadolivre')} 
                      className={`filter-btn ${activeStoreFilter === 'mercadolivre' ? 'active' : ''}`}
                    >
                      <i className="fa-solid fa-handshake"></i> M. Livre
                    </button>
                    <button 
                      onClick={() => setActiveStoreFilter('kabum')} 
                      className={`filter-btn ${activeStoreFilter === 'kabum' ? 'active' : ''}`}
                    >
                      <i className="fa-solid fa-k"></i> Kabum
                    </button>
                    <button 
                      onClick={() => setActiveStoreFilter('pichau')} 
                      className={`filter-btn ${activeStoreFilter === 'pichau' ? 'active' : ''}`}
                    >
                      <i className="fa-solid fa-p"></i> Pichau
                    </button>
                    <button 
                      onClick={() => setActiveStoreFilter('terabyte')} 
                      className={`filter-btn ${activeStoreFilter === 'terabyte' ? 'active' : ''}`}
                    >
                      <i className="fa-solid fa-t"></i> Terabyte
                    </button>
                  </div>
                  
                  {/* Coleções & Filtros Dinâmicos */}
                  <div className="collection-filters-container">
                    <span className="collection-filters-label">
                      <i className="fa-solid fa-tags"></i> Coleções e Filtros Dinâmicos
                    </span>
                    <div className="collection-filters">
                      <button 
                        onClick={() => setActiveCollectionFilter('all')} 
                        className={`collection-filter-btn ${activeCollectionFilter === 'all' ? 'active' : ''}`}
                      >
                        Todas as Coleções
                      </button>
                      
                      {/* User-defined collections */}
                      {existingCollections.map((coll, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveCollectionFilter(coll)}
                          className={`collection-filter-btn ${activeCollectionFilter === coll ? 'active' : ''}`}
                        >
                          <i className="fa-solid fa-folder"></i> {coll}
                        </button>
                      ))}

                      {/* Dynamic Virtual Filters */}
                      <button 
                        onClick={() => setActiveCollectionFilter('dynamic_below_target')} 
                        className={`collection-filter-btn dynamic-filter ${activeCollectionFilter === 'dynamic_below_target' ? 'active' : ''}`}
                      >
                        🎯 Abaixo da Meta
                      </button>
                      <button 
                        onClick={() => setActiveCollectionFilter('dynamic_under_2000')} 
                        className={`collection-filter-btn dynamic-filter ${activeCollectionFilter === 'dynamic_under_2000' ? 'active' : ''}`}
                      >
                        💰 Abaixo de R$ 2.000
                      </button>
                      <button 
                        onClick={() => setActiveCollectionFilter('dynamic_under_1000')} 
                        className={`collection-filter-btn dynamic-filter ${activeCollectionFilter === 'dynamic_under_1000' ? 'active' : ''}`}
                      >
                        💸 Abaixo de R$ 1.000
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Produtos */}
              {filteredProducts.length > 0 ? (
                <div className="watchlist-table-container">
                  <table className="watchlist-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Preço Atual</th>
                        <th>Variação</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(prod => (
                        <ProductCard 
                          key={prod.id} 
                          product={prod} 
                          onDelete={handleDeleteProduct} 
                          onShowHistory={handleShowHistory} 
                          onRename={handleRenameProduct}
                          onUpdateCollection={handleUpdateCollection}
                          onUpdateTargetPrice={handleUpdateTargetPrice}
                          onTogglePin={handleTogglePin}
                          onToggleBudget={handleToggleBudget}
                          isInBudget={budgetItemIds.includes(prod.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <i className="fa-solid fa-microchip-slash empty-state-icon" style={{ fontSize: '40px', color: 'var(--text-muted)', marginBottom: '15px' }}></i>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Nenhum produto cadastrado {activeStoreFilter !== 'all' || activeCollectionFilter !== 'all' ? 'para este filtro' : ''} ainda.</p>
                  {activeStoreFilter === 'all' && activeCollectionFilter === 'all' && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '5px' }}>Use o botão "Cadastrar Hardware" no topo para adicionar seu primeiro hardware!</p>
                  )}
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* Drawer deslizante lateral para cadastro */}
      <div 
        className={`add-product-drawer-backdrop ${isAddFormOpen ? 'active' : ''}`}
        onClick={() => setIsAddFormOpen(false)}
      />
      <div className={`add-product-drawer-container ${isAddFormOpen ? 'active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0 24px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Cadastrar Hardware</h2>
          <button 
            onClick={() => setIsAddFormOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-secondary)' }}
            title="Fechar"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <AddProductForm 
          onAddProduct={async (payload) => {
            const success = await handleAddProduct(payload);
            if (success) setIsAddFormOpen(false);
            return success;
          }} 
          onBatchImport={async (items) => {
            await handleBatchImport(items);
            setIsAddFormOpen(false);
          }}
          existingCollections={existingCollections} 
        />
      </div>

      {/* Dynamic Price Chart Modal overlay */}
      <HistoryChartModal 
        active={!!selectedProduct} 
        onClose={() => {
          setSelectedProduct(null);
          setChartData(null);
        }} 
        chartData={chartData} 
        product={selectedProduct} 
      />

      {/* Batch Import Modal */}
      <BatchImportModal 
        active={batchModalActive}
        items={batchItems}
        importing={batchImporting}
        onClose={() => {
          setBatchModalActive(false);
          setBatchItems([]);
        }}
      />

      {/* Floating Budget Trigger Button */}
      <button 
        onClick={() => setIsBudgetOpen(true)}
        className="floating-budget-trigger"
        title="Abrir Simulador de Orçamento"
      >
        <i className="fa-solid fa-calculator"></i>
        {budgetItemIds.length > 0 && (
          <span className="floating-budget-badge">
            {budgetItemIds.length}
          </span>
        )}
      </button>

      {/* Budget Drawer Panel */}
      <BudgetDrawer 
        active={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
        products={productsList}
        selectedIds={budgetItemIds}
        onToggleItem={handleToggleBudget}
        onClear={handleClearBudget}
      />

      {/* Reactive Toast pop-ups */}
      <div className={`toast ${toast.visible ? 'visible' : ''}`}>
        <div className="toast-content">
          <i 
            className={`fa-solid ${toast.isError ? 'fa-circle-exclamation error' : 'fa-circle-check'} toast-icon`}
            style={{ color: toast.isError ? 'var(--accent-danger)' : 'var(--accent-cyan)' }}
          ></i>
          <div className="toast-message-container">
            <span className="toast-title">{toast.title}</span>
            <span className="toast-msg">{toast.message}</span>
          </div>
        </div>
      </div>
    </>
  );
}
