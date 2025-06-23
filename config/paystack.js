import dotenv from 'dotenv';

dotenv.config();

const secretKey = process.env.PAYSTACK_SECRET_KEY;

if (!secretKey) {
  console.error('💥 FATAL ERROR: PAYSTACK_SECRET_KEY is not defined in your .env file.');
  // In a real production environment, you might want to exit the process
  // process.exit(1);
} else {
  console.log('✅ Paystack secret key loaded successfully.');
  // Mask the key for security in logs
  console.log(`🔑 Key: ${secretKey.substring(0, 8)}...${secretKey.substring(secretKey.length - 4)}`);
}

export const paystackConfig = {
    // Test credentials
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    secretKey: secretKey,
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