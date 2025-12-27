import React, { useEffect, useRef, useMemo } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useSelector } from 'react-redux';
import { FaChartLine } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RiskChart = () => {
  const chartRef = useRef(null);
  const { stats, loading } = useSelector((state) => state.transactions);

  // ALWAYS use backend stats - never compute from local transactions
  const riskDistribution = useMemo(() => {
    if (stats.riskDistribution && stats.riskDistribution.length > 0) {
      return stats.riskDistribution;
    }
    // Return empty if no stats
    return [
      { riskRange: 'Medium (30-69)', count: 0 },
      { riskRange: 'High (70-84)', count: 0 },
      { riskRange: 'Critical (85-100)', count: 0 }
    ];
  }, [stats.riskDistribution]);

  const hourlyPattern = useMemo(() => {
    if (stats.hourlyPattern && stats.hourlyPattern.length > 0) {
      return stats.hourlyPattern;
    }
    // Return empty 24-hour array if no stats
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
      avgRisk: 0
    }));
  }, [stats.hourlyPattern]);

  
  useEffect(() => {
  let chartInstance = null;

  if (chartRef.current) {
    chartInstance = new Chart(chartRef.current, {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });
  }

  return () => {
    if (chartInstance) {
      chartInstance.destroy();
    }
  };
}, [chartData]);


  // Risk Distribution Data
  const riskData = {
    labels: riskDistribution.map(item => item.riskRange || item.label || 'Unknown'),
    datasets: [
      {
        label: 'Transaction Count',
        data: riskDistribution.map(item => item.count || 0),
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(253, 126, 20, 0.8)',
          'rgba(220, 53, 69, 0.8)'
        ],
        borderColor: [
          '#ffc107',
          '#fd7e14',
          '#dc3545'
        ],
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 60,
      }
    ]
  };

  // Hourly Pattern Data
  const hourlyData = {
    labels: hourlyPattern.map(item => {
      const h = item.hour;
      return `${h.toString().padStart(2, '0')}:00`;
    }),
    datasets: [
      {
        label: 'Transaction Count',
        data: hourlyPattern.map(item => item.count || 0),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Avg Risk Score',
        data: hourlyPattern.map(item => item.avgRisk || 0),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
        pointBackgroundColor: 'rgb(255, 99, 132)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };

  const riskOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12, weight: '600' },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: {
        display: true,
        text: 'Risk Distribution',
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 20 },
        color: '#333'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `Transactions: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { 
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: { 
          font: { size: 11 },
          color: '#666',
          stepSize: 10
        },
        title: {
          display: true,
          text: 'Number of Transactions',
          font: { size: 12, weight: '600' },
          color: '#333'
        }
      },
      x: {
        grid: { display: false },
        ticks: { 
          font: { size: 11 },
          color: '#666'
        }
      }
    }
  };

  const hourlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { 
          font: { size: 12, weight: '600' }, 
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: {
        display: true,
        text: 'Hourly Transaction Pattern',
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 20 },
        color: '#333'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label === 'Avg Risk Score') {
              return `${label}: ${value}/100`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: { 
          display: true, 
          text: 'Transaction Count',
          font: { size: 12, weight: '600' },
          color: 'rgb(54, 162, 235)'
        },
        grid: { 
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          font: { size: 11 },
          color: '#666'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        title: { 
          display: true, 
          text: 'Risk Score',
          font: { size: 12, weight: '600' },
          color: 'rgb(255, 99, 132)'
        },
        grid: { drawOnChartArea: false },
        min: 0,
        max: 100,
        ticks: {
          font: { size: 11 },
          color: '#666',
          callback: function(value) {
            return value;
          }
        }
      },
      x: {
        grid: { 
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          font: { size: 10 },
          color: '#666',
          maxRotation: 45,
          minRotation: 0
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (loading && (!stats.totalTransactions || stats.totalTransactions === 0)) {
    return (
      <Card className="shadow-sm border-0 h-100">
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Loading analytics...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 h-100">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
              <FaChartLine className="text-primary" size={24} />
            </div>
            <div>
              <h5 className="fw-bold mb-0">Risk Analytics</h5>
              <small className="text-muted">Real-time monitoring</small>
            </div>
          </div>
          <div className="text-end">
            <small className="text-muted d-block">Total Analyzed</small>
            <span className="fw-bold text-primary fs-5">
              {stats.totalTransactions || 0}
            </span>
          </div>
        </div>
        
        <div className="row g-3">
          <div className="col-md-6">
            <div className="chart-container" style={{ height: '350px', position: 'relative' }}>
              <Bar data={riskData} options={riskOptions} />
            </div>
          </div>
          <div className="col-md-6">
            <div className="chart-container" style={{ height: '350px', position: 'relative' }}>
              <Line data={hourlyData} options={hourlyOptions} />
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-top">
          <div className="row text-center">
            <div className="col-6">
              <span className="d-inline-flex align-items-center text-success small">
                <span className="status-indicator status-active me-2"></span>
                Live data updating
              </span>
            </div>
            <div className="col-6">
              <span className="d-inline-flex align-items-center text-danger small">
                <span className="status-indicator status-flagged me-2"></span>
                High risk threshold: 70+
              </span>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RiskChart;
