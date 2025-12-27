import React from 'react';
import { Card, Row, Col, Spinner } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { 
  FaMoneyBillWave, 
  FaExclamationTriangle, 
  FaChartLine, 
  FaShieldAlt,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';

const StatsCards = () => {
  const { stats, loading } = useSelector((state) => state.transactions);

  const cards = [
    {
      title: 'Total Transactions',
      value: stats.totalTransactions || 0,
      icon: <FaMoneyBillWave size={24} />,
      color: 'primary',
      change: '+12%',
      trend: 'up',
      prefix: '',
      suffix: '',
    },
    {
      title: 'High Risk',
      value: stats.highRiskTransactions || 0,
      icon: <FaExclamationTriangle size={24} />,
      color: 'danger',
      change: '+5%',
      trend: 'up',
      prefix: '',
      suffix: '',
      percentage: stats.highRiskPercentage ? `${stats.highRiskPercentage}%` : '0%',
    },
    {
      title: 'Avg Risk Score',
      value: stats.avgRiskScore || 0,
      icon: <FaChartLine size={24} />,
      color: 'warning',
      change: '-2%',
      trend: 'down',
      prefix: '',
      suffix: '/100',
    },
    {
      title: 'Total Amount',
      value: stats.totalAmount || 0,
      icon: <FaShieldAlt size={24} />,
      color: 'success',
      change: '+8%',
      trend: 'up',
      prefix: '$',
      suffix: '',
    },
  ];

  const getRiskLevel = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore < 30) return { label: 'Low Risk', class: 'success' };
    if (numScore < 70) return { label: 'Medium Risk', class: 'warning' };
    if (numScore < 85) return { label: 'High Risk', class: 'danger' };
    return { label: 'Critical', class: 'dark' };
  };

  if (loading && !stats.totalTransactions) {
    return (
      <Row>
        {[1, 2, 3, 4].map(i => (
          <Col key={i} lg={3} md={6} className="mb-3">
            <Card className="shadow-sm border-0 hover-lift">
              <Card.Body className="text-center py-4">
                <Spinner animation="border" variant="primary" />
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <Row>
      {cards.map((card, index) => {
        const riskLevel = card.title === 'Avg Risk Score' ? getRiskLevel(card.value) : null;
        
        return (
          <Col key={index} lg={3} md={6} className="mb-3">
            <Card className={`shadow-sm border-0 hover-lift border-start border-${card.color} border-3`}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <h6 className="text-muted mb-2 text-uppercase small fw-medium">
                      {card.title}
                    </h6>
                    <h2 className={`fw-bold mb-0 text-${card.color}`}>
                      {card.prefix}
                      {typeof card.value === 'number' 
                        ? card.value.toLocaleString() 
                        : card.value}
                      {card.suffix}
                    </h2>
                    {card.percentage && (
                      <div className="mt-1">
                        <span className={`badge bg-${card.color}`}>
                          {card.percentage}
                        </span>
                      </div>
                    )}
                    {riskLevel && (
                      <div className="mt-2">
                        <span className={`badge bg-${riskLevel.class}`}>
                          {riskLevel.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`bg-${card.color} bg-opacity-10 rounded-circle p-3`}>
                    <div className={`text-${card.color}`}>
                      {card.icon}
                    </div>
                  </div>
                </div>
                <div className="mt-3 d-flex align-items-center">
                  <span className={`me-2 ${card.trend === 'up' ? 'text-success' : 'text-danger'}`}>
                    {card.trend === 'up' ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}
                    <span className="ms-1">{card.change}</span>
                  </span>
                  <span className="text-muted small">from last hour</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default StatsCards;