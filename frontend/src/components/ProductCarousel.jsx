import React, { useRef } from 'react';
import ProductCard from './ProductCard';

export default function ProductCarousel({
  products,
  onDelete,
  onShowHistory,
  onRename,
  onUpdateCollection,
  onUpdateTargetPrice,
  onTogglePin,
  onToggleBudget,
  budgetItemIds,
  showPrompt,
  showAlert
}) {
  const trackRef = useRef(null);

  const scrollLeft = () => {
    if (trackRef.current) {
      // Scroll by card width + gap (approx 340px)
      trackRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  return (
    <div className="carousel-section" style={{ marginBottom: '40px' }}>
      <div className="carousel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <i className="fa-solid fa-list-check" style={{ color: 'var(--accent-primary)' }}></i> Produtos em Rastreamento
        </h3>
        {products.length > 0 && (
          <div className="carousel-controls" style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={scrollLeft} 
              className="btn btn-secondary carousel-control-btn"
              style={{ padding: '8px 12px', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Voltar"
            >
              <i className="fa-solid fa-chevron-left" style={{ fontSize: '13px' }}></i>
            </button>
            <button 
              onClick={scrollRight} 
              className="btn btn-secondary carousel-control-btn"
              style={{ padding: '8px 12px', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Avançar"
            >
              <i className="fa-solid fa-chevron-right" style={{ fontSize: '13px' }}></i>
            </button>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nenhum produto cadastrado no sistema ainda.</p>
      ) : (
        <div 
          className="carousel-track-wrapper" 
          style={{ position: 'relative', width: '100%', overflow: 'hidden' }}
        >
          <div 
            ref={trackRef}
            className="carousel-track" 
            style={{ 
              display: 'flex', 
              gap: '20px', 
              overflowX: 'auto', 
              scrollBehavior: 'smooth',
              paddingBottom: '15px',
              paddingTop: '5px',
              // Hide scrollbar but keep scroll behavior
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {products.map(prod => (
              <div 
                key={prod.id} 
                className="carousel-card-item"
                style={{ flex: '0 0 320px', minWidth: '320px' }}
              >
                <ProductCard 
                  product={prod} 
                  viewMode="card"
                  onDelete={onDelete} 
                  onShowHistory={onShowHistory} 
                  onRename={onRename}
                  onUpdateCollection={onUpdateCollection}
                  onUpdateTargetPrice={onUpdateTargetPrice}
                  onTogglePin={onTogglePin}
                  onToggleBudget={onToggleBudget}
                  isInBudget={budgetItemIds.includes(prod.id)}
                  showPrompt={showPrompt}
                  showAlert={showAlert}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
