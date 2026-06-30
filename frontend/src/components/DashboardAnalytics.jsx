import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const formatBRL = (val) => {
  if (val === null || val === undefined) return 'Indisponível';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatChartDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  } catch (e) {
    return dateStr;
  }
};

export default function DashboardAnalytics({ productsList, API_URL }) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Set default selected product
  useEffect(() => {
    if (productsList && productsList.length > 0 && !selectedProductId) {
      // Find first product (highest priority or first pinned/active)
      const sorted = [...productsList].sort((a, b) => (b.pinned || 0) - (a.pinned || 0));
      setSelectedProductId(String(sorted[0].id));
    }
  }, [productsList, selectedProductId]);

  // Fetch history for selected product
  useEffect(() => {
    if (!selectedProductId) return;
    let isMounted = true;
    setLoading(true);
    
    fetch(`${API_URL}/products/${selectedProductId}/history?_t=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error('Falha ao obter histórico');
        return res.json();
      })
      .then(data => {
        if (isMounted) {
          setHistoryData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProductId, API_URL]);

  const selectedProduct = productsList.find(p => String(p.id) === selectedProductId);

  // Prepare chart data
  let chartContent = null;
  let statsSummary = null;

  if (loading) {
    chartContent = (
      <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '24px', color: 'var(--accent-primary)' }}></i>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Carregando dados históricos...</span>
        </div>
      </div>
    );
  } else if (!historyData || !historyData.history || historyData.history.length === 0) {
    chartContent = (
      <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        Nenhum registro de preço encontrado para este produto ainda. Aguarde a próxima varredura.
      </div>
    );
  } else {
    const labels = historyData.history.map(h => formatChartDate(h.formatted_date));
    const pricePoints = historyData.history.map(h => h.price);
    const priceInstallmentPoints = historyData.history.map(h => h.price_installments || h.price);
    const targetPoints = Array(labels.length).fill(historyData.target_price);

    const hasInstallmentDiff = historyData.history.some(h => h.price_installments && h.price_installments > h.price);

    const minPrice = Math.min(...pricePoints);
    const avgPrice = pricePoints.reduce((acc, p) => acc + p, 0) / pricePoints.length;

    const data = {
      labels: labels,
      datasets: [
        {
          label: hasInstallmentDiff ? 'À Vista (Pix)' : 'Preço Lido (R$)',
          data: pricePoints,
          borderColor: '#e05a2b', // Terracota HSL primary hex
          backgroundColor: 'rgba(224, 90, 43, 0.06)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#e05a2b',
          pointBorderColor: 'var(--bg-card)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: 'var(--accent-cyan)',
          pointHoverBorderColor: 'var(--bg-card)',
          pointHoverBorderWidth: 3
        },
        hasInstallmentDiff && {
          label: 'Preço Parcelado',
          data: priceInstallmentPoints,
          borderColor: '#3a82b8', // Steel blue HSL cyan hex
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.3,
          pointBackgroundColor: '#3a82b8',
          pointBorderColor: 'var(--bg-card)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: 'var(--accent-cyan)',
          pointHoverBorderColor: 'var(--bg-card)',
          pointHoverBorderWidth: 3
        },
        historyData.target_price && {
          label: 'Preço Alvo',
          data: targetPoints,
          borderColor: '#40915a', // Sage green HSL emerald hex
          borderWidth: 2,
          borderDash: [6, 6],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ].filter(Boolean)
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: 'var(--text-secondary)',
            usePointStyle: true,
            pointStyle: 'line',
            font: {
              family: "'Inter', sans-serif",
              weight: '600',
              size: 11
            }
          }
        },
        tooltip: {
          backgroundColor: 'var(--text-primary)',
          titleColor: 'var(--bg-card)',
          bodyColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += formatBRL(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.03)',
            borderColor: 'transparent'
          },
          ticks: {
            color: 'var(--text-muted)',
            font: {
              size: 10
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.03)',
            borderColor: 'transparent'
          },
          ticks: {
            color: 'var(--text-muted)',
            font: {
              size: 10
            },
            callback: function(value) {
              return 'R$ ' + value;
            }
          }
        }
      }
    };

    chartContent = (
      <div style={{ height: '300px', width: '100%', position: 'relative' }}>
        <Line data={data} options={options} />
      </div>
    );

    statsSummary = (
      <div className="analytics-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <div style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
            Menor Valor Histórico
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
            {formatBRL(minPrice)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
            Média de Preço
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>
            {formatBRL(avgPrice)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
            Preço Alvo Definido
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: historyData.target_price ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {historyData.target_price ? formatBRL(historyData.target_price) : 'Não definido'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }}>
      
      {/* Coluna da Esquerda: Analytics Dashboard */}
      <div className="panel-card analytics-main-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <i className="fa-solid fa-chart-line" style={{ color: 'var(--accent-primary)' }}></i> Analytics Dashboard
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Análise do histórico de preços do produto selecionado</p>
          </div>
          {productsList.length > 0 && (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                maxWidth: '240px'
              }}
            >
              {productsList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {chartContent}
        {statsSummary}
      </div>

      {/* Coluna da Direita: Tips & Insights (Empilhados) */}
      <div className="tips-insights-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, paddingLeft: '5px' }}>
          <i className="fa-solid fa-lightbulb" style={{ color: 'var(--accent-primary)' }}></i> Tips & Insights
        </h3>

        {/* Tip 1: Telegram Bot */}
        <div className="panel-card tip-card" style={{ padding: '20px', display: 'flex', gap: '15px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-cyan-glow)',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fa-brands fa-telegram" style={{ fontSize: '20px' }}></i>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Alertas via Telegram
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
              Ative o monitoramento móvel. Procure por <strong>@precotracker_bot</strong> no Telegram e inicie uma conversa para receber notificações de queda de preço na hora!
            </p>
          </div>
        </div>

        {/* Tip 2: Preço Alvo */}
        <div className="panel-card tip-card" style={{ padding: '20px', display: 'flex', gap: '15px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary-glow)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-bullseye" style={{ fontSize: '18px' }}></i>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Preço Alvo Inteligente
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
              Use a watchlist para definir o valor máximo que deseja pagar em um produto. O sistema compara o valor lido a cada varredura e destaca o card se a meta for atingida.
            </p>
          </div>
        </div>

        {/* Tip 3: Sincronização automática */}
        <div className="panel-card tip-card" style={{ padding: '20px', display: 'flex', gap: '15px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-emerald-glow)',
            color: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '16px' }}></i>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Varredura de Background
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
              Os preços são validados e atualizados automaticamente a cada 4 horas em segundo plano. Você pode ver o horário da última e da próxima checagem no menu lateral.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
