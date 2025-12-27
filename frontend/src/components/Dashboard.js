import React, { useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Badge } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions, fetchStats } from '../features/transactions/transactionSlice';
import { useWebSocket } from '../hooks/useWebSocket';
import Navbar from './Navbar';
import StatsCards from './StatsCards';
import RiskChart from './RiskChart';
import TransactionTable from './TransactionTable';
import AlertsPanel from './AlertsPanel';
import RecentTransactions from './RecentTransactions';
import { FaSync, FaExclamationTriangle } from 'react-icons/fa';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { error } = useSelector((state) => state.transactions);
  useSelector((state) => state.transactions);
  
  // Initialize WebSocket connection
  useWebSocket();

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchStats());
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchStats());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchTransactions());
    dispatch(fetchStats());
  };

  return (
    <div className="min-vh-100 bg-light">
      <Navbar />
      
      <Container fluid className="px-4 py-3">
        {error && (
          <Alert variant="danger" className="d-flex align-items-center mb-3">
            <FaExclamationTriangle className="me-2" />
            {error}
            <Button 
              variant="outline-danger" 
              size="sm" 
              className="ms-auto"
              onClick={handleRefresh}
            >
              <FaSync className="me-1" />
              Retry
            </Button>
          </Alert>
        )}

        {/* Welcome Header */}
        <div className="mb-4">
          <h4 className="fw-bold mb-1">
            Welcome back, {user?.name}!
            <Badge bg={user?.role === 'admin' ? 'danger' : 'secondary'} className="ms-2">
              {user?.role?.toUpperCase()}
            </Badge>
          </h4>
          <p className="text-muted mb-0">
            Real-time fraud monitoring dashboard • Live transaction updates every 3 seconds
          </p>
        </div>

        {/* Stats Cards Row */}
        <Row className="mb-4">
          <Col>
            <StatsCards />
          </Col>
        </Row>

        {/* Charts and Alerts Row */}
        <Row className="mb-4">
          <Col lg={8}>
            <RiskChart />
          </Col>
          <Col lg={4}>
            <AlertsPanel />
          </Col>
        </Row>

        {/* Recent Transactions */}
        <Row className="mb-4">
          <Col>
            <RecentTransactions />
          </Col>
        </Row>

        {/* Main Transactions Table */}
        <Row>
          <Col>
            <TransactionTable />
          </Col>
        </Row>

        {/* Footer */}
        <div className="mt-4 pt-3 border-top text-center">
          <small className="text-muted">
            <FaSync className="me-1" />
            Auto-refresh every 30 seconds • 
            <span className="ms-2 text-success">
              <span className="status-indicator status-active"></span>
              System Status: Operational
            </span>
          </small>
        </div>
      </Container>
    </div>
  );
};

export default Dashboard;
