// debug_webhook_test.js
import 'dotenv/config';  
import crypto from 'crypto';
import fetch from 'node-fetch';

const testWebhook = async () => {
  const webhookUrl = 'https://2b3d-105-112-203-135.ngrok-free.app/api/webhook/paystack';
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  
  console.log('🔧 DEBUG INFO:');
  console.log('Secret Key (masked):', secretKey ? `${secretKey.substring(0, 10)}...` : 'NOT FOUND');
  console.log('Webhook URL:', webhookUrl);
  
  // Test webhook payload - simulating a dedicated account inflow
  const payload = {
    event: 'dedicated_account.inflow',
    data: {
      amount: 12000, // 120 NGN in kobo
      customer: {
        email: 'bettor@example.com',
        customer_code: 'CUS_test123'
      },
      dedicated_account: {
        account_number: '9866013385',
        bank: {
          name: 'Paystack-Titan'
        }
      },
      reference: 'test_ref_' + Date.now(),
      session_id: 'session_' + Date.now()
    }
  };
  
  const payloadString = JSON.stringify(payload);
  
  console.log('\n📦 PAYLOAD:');
  console.log(payloadString);
  console.log('\n📏 Payload length:', payloadString.length);
  
  // Generate signature using the exact same method as Paystack
  const signature = crypto
    .createHmac('sha512', secretKey)
    .update(payloadString, 'utf8')
    .digest('hex');
  
  console.log('\n🔐 SIGNATURE GENERATION:');
  console.log('Algorithm: HMAC-SHA512');
  console.log('Secret Key length:', secretKey.length);
  console.log('Generated signature:', signature);
  console.log('Signature length:', signature.length);
  
  // Test locally first (generate what our server should generate)
  const localVerification = crypto
    .createHmac('sha512', secretKey)
    .update(payloadString, 'utf8')
    .digest('hex');
  
  console.log('\n🧪 LOCAL VERIFICATION:');
  console.log('Local generated hash:', localVerification);
  console.log('Matches our signature:', localVerification === signature);
  
  try {
    console.log('\n📤 SENDING REQUEST...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature,
        'User-Agent': 'Paystack/1.0 (+https://paystack.com)'
      },
      body: payloadString
    });
    
    const result = await response.text();
    
    console.log('\n📨 RESPONSE:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Body:', result);
    
    if (response.ok) {
      console.log('\n✅ SUCCESS: Webhook test passed!');
      
      // Now test balance check
      console.log('\n💰 CHECKING BETTOR BALANCE...');
      await checkBettorBalance();
      
    } else {
      console.log('\n❌ FAILED: Webhook test failed');
      
      // Additional debugging for signature issues
      if (response.status === 400 && result.includes('signature')) {
        console.log('\n🔍 SIGNATURE DEBUG:');
        console.log('This usually means:');
        console.log('1. Secret key mismatch between test and server');
        console.log('2. Body modification during transmission');
        console.log('3. Encoding issues (UTF-8)');
        console.log('4. Raw body not preserved on server');
      }
    }
    
  } catch (error) {
    console.error('\n💥 ERROR:', error);
  }
};

async function checkBettorBalance() {
  try {
    // First, sign in to get token
    const signinResponse = await fetch('https://2b3d-105-112-203-135.ngrok-free.app/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'bettor@example.com',
        password: 'bettorPass123'
      })
    });
    
    if (!signinResponse.ok) {
      console.log('❌ Could not sign in bettor');
      return;
    }
    
    const signinData = await signinResponse.json();
    const token = signinData.token;
    
    // Check balance
    const balanceResponse = await fetch('https://2b3d-105-112-203-135.ngrok-free.app/api/auth/balance', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log('📊 Current bettor balance:', balanceData.balance, 'NGN');
    } else {
      console.log('❌ Could not fetch balance');
    }
    
  } catch (error) {
    console.error('Balance check error:', error.message);
  }
}

// Alternative test with different payload format
async function testAlternativeFormat() {
  console.log('\n🔄 TRYING ALTERNATIVE FORMAT...');
  
  const webhookUrl = 'https://2b3d-105-112-203-135.ngrok-free.app/api/webhook/paystack';
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  
  // Minimal payload
  const payload = {
    "event": "dedicated_account.inflow",
    "data": {
      "amount": 12000,
      "customer": {
        "email": "bettor@example.com"
      },
      "reference": "ALT_" + Date.now()
    }
  };
  
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha512', secretKey)
    .update(payloadString, 'utf8')
    .digest('hex');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature,
      },
      body: payloadString
    });
    
    const result = await response.text();
    console.log('Alternative format result:', response.status, result);
    
  } catch (error) {
    console.error('Alternative test error:', error);
  }
}

// Run tests
console.log('🚀 Starting webhook tests...\n');
testWebhook().then(() => {
  return testAlternativeFormat();
}).then(() => {
  console.log('\n🏁 All tests completed');
});