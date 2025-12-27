import React from 'react';
import { Container, Navbar as BootstrapNavbar, Nav, Button, Badge, Dropdown } from 'react-bootstrap';
import { FaBell, FaSignOutAlt, FaUser, FaShieldAlt, FaChartLine } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { clearAlerts } from '../features/transactions/transactionSlice';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { alerts } = useSelector((state) => state.transactions);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleClearAlerts = () => {
    dispatch(clearAlerts());
  };

  return (
    <BootstrapNavbar bg="white" expand="lg" className="shadow-sm py-3">
      <Container>
        <BootstrapNavbar.Brand href="/" className="d-flex align-items-center fw-bold">
          <FaShieldAlt className="text-primary me-2" size={24} />
          <span className="text-gradient">FraudShield</span>
          <Badge bg="warning" className="ms-2">AI</Badge>
        </BootstrapNavbar.Brand>
        
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link active className="d-flex align-items-center">
              <FaChartLine className="me-1" />
              Live Dashboard
            </Nav.Link>
          </Nav>
          
          <div className="d-flex align-items-center">
            {/* Alerts Dropdown */}
            <Dropdown className="me-3">
              <Dropdown.Toggle variant="light" id="alerts-dropdown" className="position-relative">
                <FaBell size={18} />
                {alerts.length > 0 && (
                  <span className="notification-badge">{alerts.length}</span>
                )}
              </Dropdown.Toggle>
              
              <Dropdown.Menu style={{ minWidth: '300px' }}>
                <Dropdown.Header className="d-flex justify-content-between align-items-center">
                  <span>Alerts ({alerts.length})</span>
                  {alerts.length > 0 && (
                    <Button size="sm" variant="outline-danger" onClick={handleClearAlerts}>
                      Clear All
                    </Button>
                  )}
                </Dropdown.Header>
                {alerts.length > 0 ? (
                  alerts.slice(0, 5).map(alert => (
                    <Dropdown.Item key={alert.id} className="text-wrap">
                      <div className="d-flex align-items-start">
                        <div className="status-indicator status-flagged me-2 mt-1"></div>
                        <div>
                          <small className="text-danger fw-bold">{alert.message}</small>
                          <br />
                          <small className="text-muted">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </small>
                        </div>
                      </div>
                    </Dropdown.Item>
                  ))
                ) : (
                  <Dropdown.ItemText className="text-muted text-center py-3">
                    No new alerts
                  </Dropdown.ItemText>
                )}
              </Dropdown.Menu>
            </Dropdown>
            
            {/* User Dropdown */}
            <Dropdown>
              <Dropdown.Toggle variant="light" id="user-dropdown" className="d-flex align-items-center">
                <FaUser className="me-2" />
                <span>{user?.name || 'User'}</span>
                <Badge bg={user?.role === 'admin' ? 'danger' : 'secondary'} className="ms-2">
                  {user?.role}
                </Badge>
              </Dropdown.Toggle>
              
              <Dropdown.Menu>
                <Dropdown.Header>
                  <div className="fw-bold">{user?.name}</div>
                  <small className="text-muted">{user?.email}</small>
                </Dropdown.Header>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <FaSignOutAlt className="me-2" />
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;