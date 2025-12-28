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
  const { transactions = [], pagination, loading } = useSelector((state) => state.transactions);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [localLoading, setLocalLoading] = useState(false);

  // Initialize pagination with default values to prevent undefined errors
  const safePagination = pagination || {
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  };

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLocalLoading(true);
        await dispatch(fetchTransactions({ page: currentPage })).unwrap();
      } catch (error) {
        console.error('Failed to load transactions:', error);
      } finally {
        setLocalLoading(false);
      }
    };
    
    loadTransactions();
  }, [dispatch, currentPage]);

  const handleSort = (field) => {
    const newSortOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newSortOrder);
    dispatch(fetchTransactions({ 
      page: 1, 
      sortBy: field, 
      sortOrder: newSortOrder 
    }));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > safePagination.pages) return;
    setCurrentPage(page);
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
      // Refresh the current page to update the transaction status
      dispatch(fetchTransactions({ page: currentPage }));
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
      alert('Failed to mark transaction as reviewed');
    }
  };

  const handleExport = async () => {
    if (!token) {
      alert('Authentication required for export');
      return;
    }

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
          responseType: exportFormat === 'csv' ? 'text' : 'json',
          timeout: 30000 // 30 second timeout
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
      alert(`Export failed: ${error.response?.data?.message || error.message || 'Please try again.'}`);
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
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const filteredTransactions = Array.isArray(transactions) 
    ? transactions.filter(transaction => {
        if (!transaction) return false;
        
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
      })
    : [];

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
          transform: sortField === field && sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease'
        }}
      />
    </th>
  );

  const isLoading = loading || localLoading;

  if (isLoading && transactions.length === 0) {
    return (
      <div className="table-container p-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading transactions...</p>
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
                  disabled={isLoading}
                />
              </InputGroup>
            </div>
            <div className="col-md-6 d-flex justify-content-md-end">
              <div className="d-flex gap-2">
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm" disabled={isLoading}>
                    <FaFilter className="me-1" />
                    Risk: {riskFilter === 'all' ? 'All' : riskFilter.charAt(0).toUpperCase() + riskFilter.slice(1)}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setRiskFilter('all')}>All Risks</Dropdown.Item>
                    <Dropdown.Item onClick={() => setRiskFilter('low')}>Low</Dropdown.Item>
                    <Dropdown.Item onClick={() => setRiskFilter('medium')}>Medium</Dropdown.Item>
                    <Dropdown.Item onClick={() => setRiskFilter('high')}>High</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm" disabled={isLoading}>
                    Status: {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
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
                  onClick={() => dispatch(fetchTransactions({ page: currentPage }))}
                  title="Refresh"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner animation="border" size="sm" /> : <FaSync />}
                </Button>

                {user?.role === 'admin' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowExportModal(true)}
                    disabled={isLoading || filteredTransactions.length === 0}
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
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    <Spinner animation="border" size="sm" className="me-2" />
                    <span className="text-muted">Loading transactions...</span>
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction._id || transaction.transactionId} className={transaction.isFlagged ? 'table-warning' : ''}>
                    <td>
                      <small className="text-muted">{transaction.transactionId || 'N/A'}</small>
                    </td>
                    <td>
                      <small>{formatDate(transaction.timestamp)}</small>
                    </td>
                    <td>
                      <div>
                        <div className="fw-medium">{transaction.customer?.name || 'N/A'}</div>
                        <small className="text-muted">{transaction.customer?.location || ''}</small>
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium">{transaction.merchant || 'N/A'}</div>
                      <small className="text-muted">{transaction.paymentMethod || ''}</small>
                    </td>
                    <td className="fw-bold">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        {getRiskBadge(transaction.riskScore || 0)}
                        <span className={`ms-2 fw-bold ${(transaction.riskScore || 0) < 30 ? 'risk-low' : (transaction.riskScore || 0) < 70 ? 'risk-medium' : (transaction.riskScore || 0) < 85 ? 'risk-high' : 'risk-critical'}`}>
                          {transaction.riskScore || 0}
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
                          disabled={isLoading}
                        >
                          <FaEye />
                        </Button>
                        {user?.role === 'admin' && !transaction.isReviewed && transaction.isFlagged && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            title="Mark as Reviewed"
                            onClick={() => handleMarkAsReviewed(transaction._id)}
                            disabled={isLoading}
                          >
                            ✓
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="text-muted mb-3">No transactions found</div>
                    {(searchTerm || riskFilter !== 'all' || statusFilter !== 'all') && (
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
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {filteredTransactions.length > 0 && safePagination.pages > 1 && (
          <div className="p-3 border-top bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted">
                  Showing {filteredTransactions.length} of {safePagination.total || 0} transactions
                </small>
              </div>
              <Pagination size="sm" className="mb-0">
                <Pagination.Prev 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                />
                {[...Array(Math.min(5, safePagination.pages || 1))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Pagination.Item
                      key={pageNum}
                      active={pageNum === currentPage}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                    >
                      {pageNum}
                    </Pagination.Item>
                  );
                })}
                {(safePagination.pages || 1) > 5 && <Pagination.Ellipsis />}
                <Pagination.Next 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === (safePagination.pages || 1) || isLoading}
                />
              </Pagination>
            </div>
          </div>
        )}
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
                  <p className="fw-bold">{selectedTransaction.transactionId || 'N/A'}</p>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Timestamp</h6>
                  <p>{selectedTransaction.timestamp ? new Date(selectedTransaction.timestamp).toLocaleString() : 'N/A'}</p>
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
                    {getRiskBadge(selectedTransaction.riskScore || 0)}
                    <span className="ms-2 fw-bold fs-4">{selectedTransaction.riskScore || 0}/100</span>
                  </div>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Customer</h6>
                  <p className="fw-medium mb-1">
                    {selectedTransaction.customer?.name || 'N/A'}
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
                  <p className="fw-medium mb-1">{selectedTransaction.merchant || 'N/A'}</p>
                  <small className="text-muted d-block">
                    Payment: {selectedTransaction.paymentMethod || 'N/A'}
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
                {selectedTransaction.isReviewed && selectedTransaction.reviewedAt && (
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
                  disabled={exportLoading}
                />
                <Form.Check
                  type="radio"
                  label="CSV Format"
                  name="exportFormat"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  disabled={exportLoading}
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
          <Button variant="secondary" onClick={() => setShowExportModal(false)} disabled={exportLoading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleExport}
            disabled={exportLoading || filteredTransactions.length === 0}
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
