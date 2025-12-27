const axios = require('axios');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.googleApiKey = process.env.GOOGLE_API_KEY;
  }

  async analyzeTransaction(transactionData) {
    try {
      // Use OpenAI by default, fallback to Gemini if configured
      if (this.openaiApiKey) {
        return await this._analyzeWithOpenAI(transactionData);
      } else if (this.googleApiKey) {
        return await this._analyzeWithGemini(transactionData);
      } else {
        // Mock analysis if no API key
        return this._mockAnalysis(transactionData);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      return this._mockAnalysis(transactionData);
    }
  }

  async _analyzeWithOpenAI(transactionData) {
    const prompt = this._createFraudAnalysisPrompt(transactionData);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a fraud detection expert. Analyze transactions for fraud risk and return ONLY a JSON object with riskScore (0-100), isFlagged (boolean), and reasons (array of strings).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  }

  async _analyzeWithGemini(transactionData) {
    const prompt = this._createFraudAnalysisPrompt(transactionData);
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.googleApiKey}`,
      {
        contents: [{
          parts: [{
            text: `Analyze this transaction for fraud risk. Return ONLY valid JSON: {"riskScore": number 0-100, "isFlagged": boolean, "reasons": ["string1", "string2"]}\n\n${prompt}`
          }]
        }]
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    // Extract JSON from response
    const jsonMatch = text.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : this._mockAnalysis(transactionData);
  }

  _createFraudAnalysisPrompt(transaction) {
    return `
    Transaction Analysis Request:
    
    Transaction Details:
    - Amount: ${transaction.amount} ${transaction.currency}
    - Customer Location: ${transaction.customer.location}
    - Merchant: ${transaction.merchant}
    - Time: ${transaction.timestamp}
    - Payment Method: ${transaction.paymentMethod}
    - Customer History: ${transaction.customer.isNew ? 'New Customer' : 'Returning Customer'}
    
    Analyze for:
    1. Unusual amount patterns
    2. Geographic inconsistencies
    3. Time anomaly (unusual hour)
    4. Merchant risk level
    5. Payment method risk
    
    Return JSON with riskScore (0-100), isFlagged (true if risk > 70), and reasons array.
    `;
  }

  _mockAnalysis(transaction) {
    // Simple mock analysis for demo
    const riskFactors = [];
    let baseScore = Math.random() * 30; // 0-30 base
    
    // Amount-based risk
    if (transaction.amount > 1000) {
      baseScore += 30;
      riskFactors.push('High transaction amount');
    } else if (transaction.amount > 500) {
      baseScore += 15;
      riskFactors.push('Medium-high transaction amount');
    }
    
    // New customer risk
    if (transaction.customer.isNew) {
      baseScore += 20;
      riskFactors.push('New customer');
    }
    
    // Time-based risk (late night)
    const hour = new Date(transaction.timestamp).getHours();
    if (hour >= 0 && hour <= 5) {
      baseScore += 25;
      riskFactors.push('Unusual transaction time (late night)');
    }
    
    // Payment method risk
    if (transaction.paymentMethod === 'crypto') {
      baseScore += 35;
      riskFactors.push('High-risk payment method (crypto)');
    }
    
    const riskScore = Math.min(Math.round(baseScore), 100);
    const isFlagged = riskScore > 70;
    
    // Add some random factors for variety
    if (Math.random() > 0.7) {
      riskFactors.push('Unusual purchase pattern');
    }
    
    return {
      riskScore,
      isFlagged,
      reasons: riskFactors.length > 0 ? riskFactors : ['Normal transaction pattern']
    };
  }
}

module.exports = new AIService();