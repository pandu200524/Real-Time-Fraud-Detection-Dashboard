import React from 'react';
import { Card, Button, Badge, ListGroup } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { clearAlerts, removeAlert } from '../features/transactions/transactionSlice';
import { FaBell, FaExclamationTriangle, FaTimes } from 'react-icons/fa';



export default AlertsPanel;

const AlertsPanel = () => {
  const dispatch = useDispatch();
  const { alerts } = useSelector((state) => state.transactions);
  const { user } = useSelector((state) => state.auth);

  const handleClearAll = () => {
    dispatch(clearAlerts());
  };

  const handleRemoveAlert = (id) => {
    dispatch(removeAlert(id));
  };

  const handleMarkAsReviewed = (transactionId) => {
    if (user?.role === 'admin') {
      dispatch(markAsReviewed(transactionId));
    }
  };

  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Card className="shadow-sm border-0 h-100">
      <Card.Body className="p-0 d-flex flex-column">
        <div className="p-3 border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <div className="bg-danger-light rounded-circle p-2 me-2">
                <FaBell className="text-danger" />
              </div>
              <div>
                <h5 className="fw-bold mb-0">Live Alerts</h5>
                <small className="text-muted">Real-time fraud detection</small>
              </div>
            </div>
            <div>
              <Badge bg="danger" pill className="fs-6">
                {alerts.length}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex-grow-1" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {alerts.length === 0 ? (
            <div className="text-center py-5">
              <div className="bg-light rounded-circle p-3 d-inline-block mb-3">
                <FaHistory size={24} className="text-muted" />
              </div>
              <h6 className="text-muted">No active alerts</h6>
              <small className="text-muted">All clear! No high-risk transactions detected.</small>
            </div>
          ) : (
            <ListGroup variant="flush">
              {alerts.map((alert) => (
                <ListGroup.Item 
                  key={alert.id} 
                  className="border-0 px-3 py-2 alert-slide"
                >
                  <div className="d-flex align-items-start">
                    <div className="me-2 mt-1">
                      <FaExclamationTriangle className="text-danger" />
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <strong className="text-danger">{alert.message}</strong>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-muted"
                          onClick={() => handleRemoveAlert(alert.id)}
                        >
                          <FaTimes />
                        </Button>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted">
                          Amount: <strong>${alert.transaction?.amount}</strong> • 
                          Risk: <span className="risk-critical">{alert.transaction?.riskScore}/100</span>
                        </small>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          {getTimeAgo(alert.timestamp)}
                        </small>
                        {user?.role === 'admin' && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleMarkAsReviewed(alert.transaction?._id)}
                          >
                            <FaEye className="me-1" />
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="p-3 border-top">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {Math.min(alerts.length, 10)} of {alerts.length} alerts
              </small>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleClearAll}
                disabled={alerts.length === 0}
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AlertsPanel;
