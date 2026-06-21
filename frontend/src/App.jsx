import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KPIStats from './components/KPIStats';
import AddProductForm from './components/AddProductForm';
import ProductCard from './components/ProductCard';
import HistoryChartModal from './components/HistoryChartModal';
import BatchImportModal from './components/BatchImportModal';
import BudgetDrawer from './components/BudgetDrawer';

export default function App() {
  // Global State
  const [productsList, setProductsList] = useState([]);
  const [activeStoreFilter, setActiveStoreFilter] = useState('all');
  const [activeCollectionFilter, setActiveCollectionFilter] = useState('all');
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState('Sistema Pronto');
  
  const [stats, setStats] = useState({
    total_products: 0,
    below_target: 0,
    max_discount_pct: 0
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
    const res = await fetch(`${API_URL}/stats`);
    if (!res.ok) throw new Error('Stats API failed');
    const data = await res.json();
    setStats(data);
  };

  const fetchProducts = async () => {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error('Products API failed');
    const data = await res.json();
    setProductsList(data);
  };

  const checkSyncStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/products/check-status`);
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
        const res = await fetch(`${API_URL}/products/check-status`);
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

  // View Product Price Chart History Modal
  const handleShowHistory = async (product) => {
    try {
      const res = await fetch(`${API_URL}/products/${product.id}/history`);
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

  return (
    <>
      <div className="glow-bg"></div>
      <div className="app-container">
        
        {/* Top Header Section */}
        <Header 
          isScanning={isScanning} 
          onSync={handleTriggerSync} 
          statusText={statusText} 
        />

        {/* Top KPI metrics cards grid */}
        <KPIStats 
          total={stats.total_products} 
          belowTarget={stats.below_target} 
          maxDiscount={stats.max_discount_pct} 
        />

        {/* Dashboard layout grids */}
        <div className="dashboard-layout">
          
          {/* Main hardware list content */}
          <main className="main-content">
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

            {/* List products grid */}
            <div className="product-grid">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(prod => (
                  <ProductCard 
                    key={prod.id} 
                    product={prod} 
                    onDelete={handleDeleteProduct} 
                    onShowHistory={handleShowHistory} 
                    onRename={handleRenameProduct}
                    onUpdateCollection={handleUpdateCollection}
                    onToggleBudget={handleToggleBudget}
                    isInBudget={budgetItemIds.includes(prod.id)}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <i className="fa-solid fa-microchip-slash empty-state-icon"></i>
                  <p>Nenhum produto cadastrado {activeStoreFilter !== 'all' || activeCollectionFilter !== 'all' ? 'para este filtro' : ''} ainda.</p>
                  {activeStoreFilter === 'all' && activeCollectionFilter === 'all' && (
                    <p className="text-muted">Use o painel lateral para adicionar seu primeiro hardware!</p>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* Form lateral card panel */}
          <AddProductForm 
            onAddProduct={handleAddProduct} 
            onBatchImport={handleBatchImport}
            existingCollections={existingCollections} 
          />
        </div>
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
