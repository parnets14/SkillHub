const crypto = require('crypto');
const axios = require('axios');
const { logger } = require('./logger');

class PhonePeService {
  constructor() {
    this.merchantId = process.env.PHONEPE_MERCHANT_ID || '';
    this.saltKey = process.env.PHONEPE_SALT_KEY || '';
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    this.apiUrl = process.env.PHONEPE_API_URL || 'https://api.phonepe.com/apis/hermes';
  }

  generateChecksum(payload) {
    const checksumString = payload + '/pg/v1/pay' + this.saltKey;
    const checksum = crypto.createHash('sha256').update(checksumString).digest('hex');
    return `${checksum}###${this.saltIndex}`;
  }

  async initiatePayment(request) {
    try {
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: request.orderId,
        merchantUserId: request.userId,
        amount: request.amount * 100, // Convert to paisa
        redirectUrl: request.redirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
        redirectMode: 'REDIRECT',
        callbackUrl: request.callbackUrl || `${process.env.BACKEND_URL}/api/payment/webhook`,
        mobileNumber: request.mobileNumber,
        paymentInstrument: {
          type: 'PAY_PAGE',
        },
      };

      const payloadString = JSON.stringify(payload);
      const base64Payload = Buffer.from(payloadString).toString('base64');
      const checksum = this.generateChecksum(base64Payload);

      const response = await axios.post(`${this.apiUrl}/pg/v1/pay`, {
        request: base64Payload,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
      });

      if (response.data.success) {
        logger.info(`Payment initiated: ${request.orderId}`);
        return {
          success: true,
          paymentUrl: response.data.data?.instrumentResponse?.redirectInfo?.url,
          transactionId: request.orderId,
        };
      } else {
        logger.error('Payment initiation failed:', response.data);
        return {
          success: false,
          message: response.data.message || 'Payment initiation failed',
        };
      }
    } catch (error) {
      logger.error('PhonePe payment error:', error);
      return {
        success: false,
        message: 'Payment service unavailable',
      };
    }
  }

  async verifyPayment(orderId) {
    try {
      const checksumString = `/pg/v1/status/${this.merchantId}/${orderId}` + this.saltKey;
      const checksum = crypto.createHash('sha256').update(checksumString).digest('hex');
      const xVerify = `${checksum}###${this.saltIndex}`;

      const response = await axios.get(`${this.apiUrl}/pg/v1/status/${this.merchantId}/${orderId}`, {
        headers: {
          'X-VERIFY': xVerify,
          'X-MERCHANT-ID': this.merchantId,
        },
      });

      return {
        success: response.data.success,
        code: response.data.code,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      logger.error('Payment verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed',
      };
    }
  }

  async refundPayment(orderId, amount) {
    try {
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: `REF-${orderId}`,
        originalTransactionId: orderId,
        amount: amount * 100,
        callbackUrl: `${process.env.BACKEND_URL}/api/payment/refund/webhook`,
      };

      const payloadString = JSON.stringify(payload);
      const base64Payload = Buffer.from(payloadString).toString('base64');
      const checksum = this.generateChecksum(base64Payload);

      const response = await axios.post(`${this.apiUrl}/pg/v1/refund`, {
        request: base64Payload,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
      });

      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      logger.error('Refund error:', error);
      return {
        success: false,
        message: 'Refund failed',
      };
    }
  }
}

const phonepeService = new PhonePeService();

module.exports = phonepeService;

