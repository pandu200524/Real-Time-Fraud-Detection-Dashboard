import React from 'react';
import { Card, Badge, ListGroup } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { FaHistory, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const RecentTransactions = () => {
  const { liveTransactions } = useSelector((state) => state.transactions);

  const getRiskColor = (riskScore) => {
    if (riskScore < 30) return 'success';
    if (riskScore < 70) return 'warning';
    if (riskScore < 85) return 'danger';
    return 'dark';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          <div className="bg-primary-light rounded-circle p-2 me-2">
            <FaHistory className="text-primary" />
          </div>
          <h5 className="fw-bold mb-0">Recent Transactions</h5>
          <Badge bg="light" text="dark" className="ms-2">
            Live
          </Badge>
        </div>

        <ListGroup variant="flush">
          {liveTransactions.slice(0, 5).map((transaction, index) => (
            <ListGroup.Item key={index} className="border-0 px-0 py-2">
              <div className="d-flex align-items-center">
                <div className={`bg-${getRiskColor(transaction.riskScore)}-light rounded-circle p-2 me-3`}>
                  {transaction.riskScore > 70 ? (
                    <FaArrowUp className={`text-${getRiskColor(transaction.riskScore)}`} />
                  ) : (
                    <FaArrowDown className={`text-${getRiskColor(transaction.riskScore)}`} />
                  )}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-medium">{transaction.merchant}</span>
                    <span className={`fw-bold ${transaction.riskScore > 70 ? 'risk-critical' : 'risk-low'}`}>
                      {formatAmount(transaction.amount)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">{transaction.customer?.name}</small>
                    <div className="d-flex align-items-center">
                      <Badge 
                        bg={getRiskColor(transaction.riskScore)} 
                        className="me-2"
                      >
                        {transaction.riskScore}
                      </Badge>
                      <small className="text-muted">{formatTime(transaction.timestamp)}</small>
                    </div>
                  </div>
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>

        {liveTransactions.length === 0 && (
          <div className="text-center py-3">
            <small className="text-muted">Waiting for live transactions...</small>
          </div>
        )}

        <div className="mt-3 text-center">
          <small className="text-muted">
            Showing {Math.min(liveTransactions.length, 5)} of {liveTransactions.length} recent transactions
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RecentTransactions;