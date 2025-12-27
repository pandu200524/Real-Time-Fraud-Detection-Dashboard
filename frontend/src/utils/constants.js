export const RISK_LEVELS = {
  LOW: { min: 0, max: 29, color: '#28a745', label: 'Low' },
  MEDIUM: { min: 30, max: 69, color: '#ffc107', label: 'Medium' },
  HIGH: { min: 70, max: 84, color: '#fd7e14', label: 'High' },
  CRITICAL: { min: 85, max: 100, color: '#dc3545', label: 'Critical' },
};

export const PAYMENT_METHODS = [
  'credit_card',
  'debit_card', 
  'paypal',
  'crypto',
  'bank_transfer'
];

export const MERCHANTS = [
  'Amazon',
  'eBay',
  'Walmart',
  'Target',
  'Best Buy',
  'Apple Store',
  'Netflix',
  'Spotify',
  'Uber',
  'Airbnb'
];

export const STATUS_COLORS = {
  pending: 'warning',
  completed: 'success',
  failed: 'danger',
  flagged: 'danger'
};