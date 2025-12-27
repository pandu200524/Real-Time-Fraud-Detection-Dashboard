import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Badge, 
  Form, 
  InputGroup, 
  Pagination,
  Spinner,
  Dropdown,
  Modal 
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions, markAsReviewed } from '../features/transactions/transactionSlice';
import { 
  FaSearch, 
  FaFilter, 
  FaSort, 
  FaEye, 
  FaFileExport,
  FaSync,
  FaDownload,
} from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TransactionTable = () => {
  const dispatch = useDispatch();
  const { transactions, pagination, loading } = useSelector((state) => state.transactions);
  const { user, token } = useSelector((state) => state.auth);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchTransactions({ page: pagination.page }));
  }, [dispatch, pagination.page]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    dispatch(fetchTransactions({ 
      page: 1, 
      sortBy: field, 
      sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' 
    }));
  };

  const handlePageChange = (page) => {
    dispatch(fetchTransactions({ page }));
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleMarkAsReviewed = async (transactionId) => {
    try {
      await dispatch(markAsReviewed(transactionId)).unwrap();
      console.log('Transaction marked as reviewed');
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
      alert('Failed to mark transaction as reviewed');
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/transactions/export`,
        { format: exportFormat },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: exportFormat === 'csv' ? 'text' : 'json'
        }
      );
      
      const blob = new Blob(
        [exportFormat === 'csv' ? response.data : JSON.stringify(response.data, null, 2)], 
        { type: exportFormat === 'csv' ? 'text/csv' : 'application/json' }
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowExportModal(false);
      console.log('Export successful');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const getRiskBadge = (riskScore) => {
    if (riskScore < 30) return <Badge bg="success">Low</Badge>;
    if (riskScore < 70) return <Badge bg="warning">Medium</Badge>;
    if (riskScore < 85) return <Badge bg="danger">High</Badge>;
    return <Badge bg="dark" className="pulse">Critical</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.merchant?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'all' || 
      (riskFilter === 'low' && transaction.riskScore < 30) ||
      (riskFilter === 'medium' && transaction.riskScore >= 30 && transaction.riskScore < 70) ||
      (riskFilter === 'high' && transaction.riskScore >= 70);
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'flagged' && transaction.isFlagged) ||
      (statusFilter === 'reviewed' && transaction.isReviewed);

    return matchesSearch && matchesRisk && matchesStatus;
  });

  const SortableHeader = ({ field, children }) => (
    <th 
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort(field)}
      className="position-relative"
    >
      {children}
      <FaSort 
        className={`ms-1 ${sortField === field ? 'text-primary' : 'text-muted'}`}
        style={{ 
          opacity: sortField === field ? 1 : 0.3,
          transform: sortField === field && sortOrder === 'desc' ? 'rotate(180deg)' : 'none'
        }}
      />
    </th>
  );

  if (loading && transactions.length === 0) {
    return (
      <div className="table-container p-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading transactions...</p>
      </div>
    );
  }

  return (
    <>
      <div className="table-container shadow-sm border-0">
        <div className="p-3 border-bottom bg-white">
          <div className="row align-items-center">
            <div className="col-md-6 mb-2 mb-md-0">
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search transactions, customers, merchants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-md-6 d-flex justify-content-md-end">
              <div className="d-flex gap-2">
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    <FaFilter className="me-1" />
                    Risk: {riskFilter === 'all' ? 'All' : riskFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setRiskFilter('all')}>All Risks</Dropdown.Item>
                    <Dropdown.Item onClick={() => setRiskFilter('low')}>Low</Dropdown.Item>
                    <Dropdown.Item onClick={() => setRiskFilter('medium')}>Medium</Dropdown.Item>
                    <Dropdown.Item onClick={() => setRiskFilter('high')}>High</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Status: {statusFilter === 'all' ? 'All' : statusFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setStatusFilter('all')}>All</Dropdown.Item>
                    <Dropdown.Item onClick={() => setStatusFilter('flagged')}>Flagged</Dropdown.Item>
                    <Dropdown.Item onClick={() => setStatusFilter('reviewed')}>Reviewed</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => dispatch(fetchTransactions({ page: pagination.page }))}
                >
                  <FaSync />
                </Button>

                {user?.role === 'admin' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowExportModal(true)}
                  >
                    <FaFileExport className="me-1" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <SortableHeader field="transactionId">ID</SortableHeader>
                <SortableHeader field="timestamp">Time</SortableHeader>
                <SortableHeader field="customer.name">Customer</SortableHeader>
                <SortableHeader field="merchant">Merchant</SortableHeader>
                <SortableHeader field="amount">Amount</SortableHeader>
                <SortableHeader field="riskScore">Risk Score</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction._id} className={transaction.isFlagged ? 'table-warning' : ''}>
                  <td>
                    <small className="text-muted">{transaction.transactionId}</small>
                  </td>
                  <td>
                    <small>{formatDate(transaction.timestamp)}</small>
                  </td>
                  <td>
                    <div>
                      <div className="fw-medium">{transaction.customer?.name}</div>
                      <small className="text-muted">{transaction.customer?.location}</small>
                    </div>
                  </td>
                  <td>
                    <div className="fw-medium">{transaction.merchant}</div>
                    <small className="text-muted">{transaction.paymentMethod}</small>
                  </td>
                  <td className="fw-bold">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      {getRiskBadge(transaction.riskScore)}
                      <span className={`ms-2 fw-bold ${transaction.riskScore < 30 ? 'risk-low' : transaction.riskScore < 70 ? 'risk-medium' : transaction.riskScore < 85 ? 'risk-high' : 'risk-critical'}`}>
                        {transaction.riskScore}
                      </span>
                    </div>
                  </td>
                  <td>
                    {transaction.isFlagged ? (
                      <Badge bg="danger" className="pulse">Flagged</Badge>
                    ) : transaction.isReviewed ? (
                      <Badge bg="success">Reviewed</Badge>
                    ) : (
                      <Badge bg="secondary">Normal</Badge>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        title="View Details"
                        onClick={() => handleViewDetails(transaction)}
                      >
                        <FaEye />
                      </Button>
                      {user?.role === 'admin' && !transaction.isReviewed && transaction.isFlagged && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          title="Mark as Reviewed"
                          onClick={() => handleMarkAsReviewed(transaction._id)}
                        >
                          ✓
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-5">
            <p className="text-muted">No transactions found</p>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setRiskFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        <div className="p-3 border-top bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">
                Showing {filteredTransactions.length} of {pagination.total} transactions
              </small>
            </div>
            <Pagination size="sm" className="mb-0">
              <Pagination.Prev 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              />
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Pagination.Item
                    key={pageNum}
                    active={pageNum === pagination.page}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Pagination.Item>
                );
              })}
              {pagination.pages > 5 && <Pagination.Ellipsis />}
              <Pagination.Next 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              />
            </Pagination>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Transaction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTransaction && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Transaction ID</h6>
                  <p className="fw-bold">{selectedTransaction.transactionId}</p>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Timestamp</h6>
                  <p>{new Date(selectedTransaction.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Amount</h6>
                  <p className="fw-bold fs-4">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Risk Score</h6>
                  <div className="d-flex align-items-center">
                    {getRiskBadge(selectedTransaction.riskScore)}
                    <span className="ms-2 fw-bold fs-4">{selectedTransaction.riskScore}/100</span>
                  </div>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Customer</h6>
                  <p className="fw-medium mb-1">
                    {selectedTransaction.customer?.name}
                    {selectedTransaction.customer?.name === 'Anonymous Customer' && (
                      <small className="badge bg-secondary ms-2" title="Protected for viewer role">
                        Protected
                      </small>
                    )}
                  </p>
                  {selectedTransaction.customer?.email && (
                    <small className="text-muted d-block mb-1">
                      Email: {selectedTransaction.customer.email}
                    </small>
                  )}
                  {selectedTransaction.customer?.location && (
                    <small className="text-muted d-block">
                      Location: {selectedTransaction.customer.location}
                    </small>
                  )}
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Merchant</h6>
                  <p className="fw-medium mb-1">{selectedTransaction.merchant}</p>
                  <small className="text-muted d-block">
                    Payment: {selectedTransaction.paymentMethod}
                  </small>
                </div>
              </div>

              {selectedTransaction.riskReasons && selectedTransaction.riskReasons.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-muted mb-2">Risk Reasons</h6>
                  <ul className="list-unstyled">
                    {selectedTransaction.riskReasons.map((reason, idx) => (
                      <li key={idx} className="mb-2 d-flex align-items-start">
                        <Badge bg="warning" className="me-2 mt-1">Warning</Badge>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="row">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Status</h6>
                  <p>
                    {selectedTransaction.isFlagged ? (
                      <Badge bg="danger">Flagged</Badge>
                    ) : selectedTransaction.isReviewed ? (
                      <Badge bg="success">Reviewed</Badge>
                    ) : (
                      <Badge bg="secondary">Normal</Badge>
                    )}
                  </p>
                </div>
                {selectedTransaction.isReviewed && (
                  <div className="col-md-6">
                    <h6 className="text-muted mb-2">Reviewed</h6>
                    <p>
                      <small>{new Date(selectedTransaction.reviewedAt).toLocaleString()}</small>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          {user?.role === 'admin' && selectedTransaction && !selectedTransaction.isReviewed && selectedTransaction.isFlagged && (
            <Button 
              variant="success" 
              onClick={() => {
                handleMarkAsReviewed(selectedTransaction._id);
                setShowDetailsModal(false);
              }}
            >
              Mark as Reviewed
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Export Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Export Transactions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Export Format</Form.Label>
              <div>
                <Form.Check
                  type="radio"
                  label="JSON Format"
                  name="exportFormat"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                  className="mb-2"
                />
                <Form.Check
                  type="radio"
                  label="CSV Format"
                  name="exportFormat"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                />
              </div>
            </Form.Group>
            <small className="text-muted">
              {exportFormat === 'json' 
                ? 'Exports data in JSON format for programmatic use.'
                : 'Exports data in CSV format for spreadsheets.'}
            </small>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Exporting...
              </>
            ) : (
              <>
                <FaDownload className="me-2" />
                Export Data
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TransactionTable;