const { faker } = require('@faker-js/faker');

class TransactionGenerator {
  constructor() {
    this.merchants = [
      'Amazon', 'eBay', 'Walmart', 'Target', 'Best Buy', 
      'Apple Store', 'Microsoft', 'Netflix', 'Spotify', 'Uber',
      'Airbnb', 'Starbucks', 'McDonald\'s', 'Home Depot', 'Costco'
    ];
    
    this.paymentMethods = ['credit_card', 'debit_card', 'paypal', 'crypto', 'bank_transfer'];
    
    this.locations = [
      'New York, USA', 'London, UK', 'Tokyo, Japan', 'Sydney, Australia',
      'Berlin, Germany', 'Paris, France', 'Toronto, Canada', 'Singapore',
      'Mumbai, India', 'São Paulo, Brazil'
    ];
    
    // Track customer history
    this.customerHistory = new Map();
  }

  generateTransaction() {
    // Use datatype.uuid() instead of string.uuid()
    const customerId = faker.datatype.uuid().substring(0, 8);
    const isNewCustomer = !this.customerHistory.has(customerId) || Math.random() > 0.8;
    
    if (!this.customerHistory.has(customerId)) {
      this.customerHistory.set(customerId, {
        transactionCount: 0,
        totalSpent: 0,
        firstSeen: new Date()
      });
    }
    
    const customerHistory = this.customerHistory.get(customerId);
    customerHistory.transactionCount++;
    
    const amount = this._generateAmount();
    customerHistory.totalSpent += amount;
    
    const transaction = {
      transactionId: `TXN${Date.now()}${this._generateNumericString(6)}`,
      timestamp: new Date(),
      amount: parseFloat(amount.toFixed(2)),
      currency: 'USD',
      customer: {
        id: customerId,
        name: faker.name.fullName(),
        email: faker.internet.email().toLowerCase(),
        location: faker.helpers.arrayElement(this.locations),
        isNew: isNewCustomer
      },
      merchant: faker.helpers.arrayElement(this.merchants),
      paymentMethod: faker.helpers.arrayElement(this.paymentMethods),
      status: 'completed',
      metadata: {
        device: faker.helpers.arrayElement(['mobile', 'desktop', 'tablet']),
        browser: faker.helpers.arrayElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
        ip: faker.internet.ip()
      }
    };
    
    // Add occasional anomalies
    if (Math.random() > 0.9) {
      transaction.amount *= 10; // Unusually large amount
    }
    
    if (Math.random() > 0.95) {
      // Unusual location mismatch
      transaction.customer.location = 'Lagos, Nigeria'; // High-risk location
    }
    
    return transaction;
  }

  _generateNumericString(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  _generateAmount() {
    // Generate amounts with realistic distribution
    const rand = Math.random();
    
    if (rand < 0.6) {
      // 60% small transactions ($1-$100)
      return faker.datatype.float({ min: 1, max: 100, precision: 0.01 });
    } else if (rand < 0.9) {
      // 30% medium transactions ($100-$500)
      return faker.datatype.float({ min: 100, max: 500, precision: 0.01 });
    } else {
      // 10% large transactions ($500-$5000)
      return faker.datatype.float({ min: 500, max: 5000, precision: 0.01 });
    }
  }

  // Clean up old customer history
  cleanupOldHistory(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    for (const [customerId, history] of this.customerHistory.entries()) {
      if (history.firstSeen < cutoff) {
        this.customerHistory.delete(customerId);
      }
    }
  }
}


module.exports = new TransactionGenerator();