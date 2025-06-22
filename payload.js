// generate-signature.js
import crypto from 'crypto';

// The exact payload you're sending
const testPayload = `{"event":"charge.success","data":{"reference":"test_ref_12345","amount":1000000,"customer":{"email":"test@example.com"},"metadata":{"type":"wallet_funding"}}}`;

// Your Paystack secret key
const secretKey = 'sk_test_562208ae2579ae7d0cb8fcf017d5916ab15fffd3';

// Generate the signature
const signature = crypto
  .createHmac('sha512', secretKey)
  .update(testPayload, 'utf8')
  .digest('hex');

console.log('Payload:', testPayload);
console.log('Generated signature:', signature);
console.log('\n--- Windows CMD Command ---');
console.log(`curl -X POST "https://b762-105-112-183-176.ngrok-free.app/api/webhook/paystack" -H "Content-Type: application/json" -H "x-paystack-signature: ${signature}" -d "{\\"event\\":\\"charge.success\\",\\"data\\":{\\"reference\\":\\"test_ref_12345\\",\\"amount\\":1000000,\\"customer\\":{\\"email\\":\\"test@example.com\\"},\\"metadata\\":{\\"type\\":\\"wallet_funding\\"}}}"`);

console.log('\n--- PowerShell Command ---');
console.log(`Invoke-RestMethod -Uri "https://b762-105-112-183-176.ngrok-free.app/api/webhook/paystack" -Method POST -Headers @{"Content-Type"="application/json"; "x-paystack-signature"="${signature}"} -Body '${testPayload}'`);

// Test the signature verification function
const verifySignature = (payload, signature, secret) => {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return hash === signature;
};

console.log('\n--- Signature Verification Test ---');
console.log('Signature valid:', verifySignature(testPayload, signature, secretKey));