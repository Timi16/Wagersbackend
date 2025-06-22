// config/paystack.js
export const paystackConfig = {
    // Test credentials
    publicKey: 'pk_test_d525e373c0abd9b63aeec1e100a071d2093e8ab0',
    secretKey: 'sk_test_562208ae2579ae7d0cb8fcf017d5916ab15fffd3',
    
    // API Base URL
    baseURL: 'https://api.paystack.co',
    
    // Webhook configuration - Paystack uses your secret key for webhook verification
    webhookSecret: process.env.PAYSTACK_SECRET_KEY || 'sk_test_562208ae2579ae7d0cb8fcf017d5916ab15fffd3',
    
    // Your webhook URL (replace with your actual domain)
    webhookURL: process.env.PAYSTACK_WEBHOOK_URL || 'https://yourdomain.com/api/webhook/paystack',
    
    // Your callback URL for frontend redirects
    callbackURL: process.env.PAYSTACK_CALLBACK_URL || 'https://yourdomain.com/payment/callback',
    
    // Virtual account settings
    virtualAccount: {
      provider: 'titan-paystack', // or 'titan-paystack'
      currency: 'NGN',
    }
  };
  
  // Helper function to get headers for Paystack API calls
  export const getPaystackHeaders = () => ({
    'Authorization': `Bearer ${paystackConfig.secretKey}`,
    'Content-Type': 'application/json',
  });