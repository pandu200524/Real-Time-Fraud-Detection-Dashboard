import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Row, 
  Col,
  Spinner,
  Badge 
} from 'react-bootstrap';
import { 
  FaSignInAlt, 
  FaUser, 
  FaLock, 
  FaShieldAlt, 
  FaChartLine,
  FaBolt
} from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Load saved email if remember me was checked
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Save email if remember me is checked
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
    
    const result = await dispatch(login({ email, password }));
    if (!result.error) {
      navigate('/');
    }
  };

  const handleDemoLogin = async (role) => {
    const credentials = {
      admin: { email: 'admin@fraud.com', password: 'admin123' },
      viewer: { email: 'viewer@fraud.com', password: 'viewer123' },
    };
    
    setEmail(credentials[role].email);
    setPassword(credentials[role].password);
    
    // Auto-submit after setting credentials
    setTimeout(async () => {
      const result = await dispatch(login(credentials[role]));
      if (!result.error) {
        navigate('/');
      }
    }, 100);
  };

  return (
    <div className="bg-gradient min-vh-100 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
            <Card className="shadow-lg border-0 glass-card fade-in">
              <Card.Body className="p-5">
                <div className="text-center mb-5">
                  <div className="bg-primary bg-gradient rounded-circle d-inline-flex p-3 mb-3 shadow">
                    <FaShieldAlt size={40} className="text-white" />
                  </div>
                  <h2 className="fw-bold mb-2">
                    FraudShield <Badge bg="warning" text="dark">AI</Badge>
                  </h2>
                  <p className="text-muted mb-0">
                    Real-time Fraud Detection Dashboard
                  </p>
                </div>

                {error && (
                  <Alert 
                    variant="danger" 
                    onClose={() => dispatch(clearError())} 
                    dismissible
                    className="alert-slide d-flex align-items-center"
                  >
                    <FaShieldAlt className="me-2" />
                    <span>{error}</span>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">
                      <FaUser className="me-2 text-primary" />
                      Email Address
                    </Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="py-2"
                      autoComplete="email"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-medium">
                      <FaLock className="me-2 text-primary" />
                      Password
                    </Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="py-2"
                      autoComplete="current-password"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4 d-flex justify-content-between align-items-center">
                    <Form.Check
                      type="checkbox"
                      label="Remember me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      id="remember-checkbox"
                    />
                    <Button 
                      variant="link" 
                      className="p-0 text-decoration-none small"
                      onClick={() => alert('Password reset functionality coming soon!')}
                    >
                      Forgot password?
                    </Button>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100 py-2 mb-3 btn-gradient fw-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <FaSignInAlt className="me-2" />
                        Sign In
                      </>
                    )}
                  </Button>

                  <div className="text-center text-muted mb-3">
                    <small>Or try demo accounts:</small>
                  </div>
                  
                  <Row className="g-2">
                    <Col xs={6}>
                      <Button 
                        variant="outline-primary" 
                        onClick={() => handleDemoLogin('admin')}
                        className="w-100 d-flex align-items-center justify-content-center py-2"
                        disabled={loading}
                      >
                        <FaBolt className="me-2" />
                        Admin Demo
                      </Button>
                    </Col>
                    <Col xs={6}>
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => handleDemoLogin('viewer')}
                        className="w-100 d-flex align-items-center justify-content-center py-2"
                        disabled={loading}
                      >
                        <FaChartLine className="me-2" />
                        Viewer Demo
                      </Button>
                    </Col>
                  </Row>
                </Form>

                <div className="mt-4 pt-3 border-top text-center">
                  <small className="text-muted">
                    <FaShieldAlt className="me-1 text-success" />
                    Secure Connection
                  </small>
                </div>
              </Card.Body>
            </Card>

            <div className="text-center mt-4">
              <small className="text-white-50">
                © {new Date().getFullYear()} FraudShield AI • Real-time Monitoring System
              </small>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;