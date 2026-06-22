import React from 'react';
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

// Registra módulos essenciais do ChartJS
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

const formatChartDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    // Se a data vier no formato ISO UTC (com T e Z), new Date() a converterá para local
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

export default function HistoryChartModal({ active, onClose, chartData, product }) {
  if (!active || !chartData || !product) return null;

  const labels = chartData.history.map(h => formatChartDate(h.formatted_date));
  const pricePoints = chartData.history.map(h => h.price);
  const priceInstallmentPoints = chartData.history.map(h => h.price_installments || h.price);
  const targetPoints = Array(labels.length).fill(chartData.target_price);

  const hasInstallmentDiff = chartData.history.some(h => h.price_installments && h.price_installments > h.price);

  // Stats
  const minPrice = Math.min(...pricePoints);
  const minInstallmentPrice = Math.min(...priceInstallmentPoints);
  const avgPrice = pricePoints.reduce((acc, p) => acc + p, 0) / pricePoints.length;

  // ChartJS Font & Theme Settings
  ChartJS.defaults.font.family = "'Inter', sans-serif";
  ChartJS.defaults.color = '#94a3b8'; // text-secondary/muted

  const data = {
    labels: labels,
    datasets: [
      {
        label: hasInstallmentDiff ? 'À Vista (Pix)' : 'Preço Lido (R$)',
        data: pricePoints,
        borderColor: '#a78bfa', // Bright neon purple HSL (accent)
        backgroundColor: 'rgba(167, 139, 250, 0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#a78bfa',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#00f0ff', // accent-cyan on hover
        pointHoverBorderColor: '#0f172a',
        pointHoverBorderWidth: 3
      },
      hasInstallmentDiff && {
        label: 'Preço Parcelado',
        data: priceInstallmentPoints,
        borderColor: '#38bdf8', // Sky-blue for installment
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.35,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#00f0ff',
        pointHoverBorderColor: '#0f172a',
        pointHoverBorderWidth: 3
      },
      chartData.target_price && {
        label: 'Preço Alvo',
        data: targetPoints,
        borderColor: '#10b981', // Emerald green
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
          color: '#f8fafc',
          usePointStyle: true,
          pointStyle: 'line',
          font: {
            family: "'Outfit', sans-serif",
            weight: '600'
          },
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => {
              return {
                text: dataset.label,
                datasetIndex: i,
                strokeStyle: dataset.borderColor,
                fillStyle: dataset.borderColor,
                lineWidth: 3,
                hidden: !chart.isDatasetVisible(i),
                lineDash: dataset.borderDash || [],
                pointStyle: 'line',
                fontColor: '#f8fafc',
                color: '#f8fafc'
              };
            });
          }
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: '#a78bfa',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
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
          color: 'rgba(255, 255, 255, 0.03)',
          borderColor: 'transparent'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          borderColor: 'transparent'
        },
        ticks: {
          callback: function(value) {
            return 'R$ ' + value;
          }
        }
      }
    }
  };

  return (
    <div className="modal active">
      <div onClick={onClose} className="modal-backdrop"></div>
      <div className="modal-content">
        <button onClick={onClose} className="modal-close">
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div className="modal-header">
          <span className={`modal-badge store-badge ${product.store.toLowerCase()}`}>
            {getStoreIcon(product.store)} {getStoreNameFormatted(product.store)}
          </span>
          <h3 className="modal-title">{product.name}</h3>
          <p className="modal-subtitle">Evolução do preço nas últimas verificações</p>
        </div>
        <div className="modal-body">
          <div className="chart-container">
            <Line data={data} options={options} />
          </div>
          <div className="chart-stats-summary">
            <div className="chart-stat-item">
              <span className="chart-stat-label">{hasInstallmentDiff ? 'Menor (À Vista)' : 'Menor Preço'}</span>
              <span className="chart-stat-val text-purple">{formatBRL(minPrice)}</span>
            </div>
            <div className="chart-stat-item">
              {hasInstallmentDiff ? (
                <>
                  <span className="chart-stat-label">Menor (Parcelado)</span>
                  <span className="chart-stat-val text-cyan">{formatBRL(minInstallmentPrice)}</span>
                </>
              ) : (
                <>
                  <span className="chart-stat-label">Média de Preço</span>
                  <span className="chart-stat-val text-purple">{formatBRL(avgPrice)}</span>
                </>
              )}
            </div>
            <div className="chart-stat-item">
              <span className="chart-stat-label">Preço Alvo</span>
              <span className={`chart-stat-val ${chartData.target_price ? 'text-emerald' : 'text-muted'}`}>
                {chartData.target_price ? formatBRL(chartData.target_price) : 'Opcional'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
