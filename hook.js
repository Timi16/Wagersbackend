import crypto from 'crypto';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const API_BASE_URL = 'https://2b3d-105-112-203-135.ngrok-free.app'; // Your ngrok URL
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const WEBHOOK_URL = `${API_BASE_URL}/api/webhook/paystack`;

// --- USER & ADMIN DETAILS (Update if yours are different) ---
const BETTOR_CREDENTIALS = { email: 'bettor@example.com', password: 'bettorPass123' };
const ADMIN_CREDENTIALS = { email: 'admin_1750694571080@example.com', password: 'Admin#1234' }; // Your actual admin credentials

// --- WAGER DETAILS ---
const WAGER_ID = 3; // The ID of the wager/match to bet on and resolve
const BET_CHOICE = 'yes'; // The bettor's choice ('yes' or 'no')

// --- 1. SIMULATE A DEPOSIT ---
const testDeposit = async () => {
  console.log('\n💸 Simulating a 120 NGN deposit for the bettor...');
  const payload = { event: 'dedicated_account.inflow', data: { amount: 12000, customer: { email: BETTOR_CREDENTIALS.email }, reference: `deposit_${Date.now()}` } };
  const payloadString = JSON.stringify(payload);
  const signature = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(payloadString, 'utf8').digest('hex');
  const response = await fetch(WEBHOOK_URL, { method: 'POST', body: payloadString, headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature } });
  console.log(response.ok ? '✅ Deposit successful!' : `❌ Deposit failed: ${response.status}`);
};

// --- 2. PLACE A BET ---
const testPlaceBet = async () => {
  console.log('\n🔥 Placing a 100 NGN bet...');
  const { token } = await signIn(BETTOR_CREDENTIALS, 'Bettor');
  if (!token) return;

  // CORRECTED: The server expects the key to be 'choice'.
  const betPayload = { stake: 100, choice: BET_CHOICE }; 
  console.log(`📦 Placing a ${betPayload.stake} NGN bet on Wager ID ${WAGER_ID} with choice: "${betPayload.choice}"`);
  
  const response = await fetch(`${API_BASE_URL}/api/wagers/${WAGER_ID}/bet`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(betPayload) });
  console.log(response.ok ? '✅ Bet placed successfully!' : `❌ Bet placement failed: ${response.status}`);
};

// --- 3. ADMIN RESOLVES THE WAGER ---
const testResolveWager = async () => {
  console.log(`\n👑 Admin resolving Wager ID ${WAGER_ID}...`);
  const { token } = await signIn(ADMIN_CREDENTIALS, 'Admin');
  if (!token) return;

  // CORRECTED: The server expects the key to be 'result'.
  const resolvePayload = { result: BET_CHOICE }; 
  console.log(`⚖️ Declaring result "${resolvePayload.result}" as the winner.`);

  const response = await fetch(`${API_BASE_URL}/api/wagers/${WAGER_ID}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(resolvePayload) });
  
  if (response.ok) {
    console.log('✅ Wager resolved successfully! Payouts and commission should be processed.');
  } else {
    console.log(`❌ Wager resolution failed: ${response.status}`, await response.text());
  }
};

// --- HELPER FUNCTIONS ---
const signIn = async (credentials, role) => {
  console.log(`🔑 Signing in as ${role}...`);
  const response = await fetch(`${API_BASE_URL}/api/auth/signin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
  if (!response.ok) {
    console.log(`❌ Could not sign in as ${role}. Check credentials.`);
    return {};
  }
  const data = await response.json();
  console.log(`✅ Signed in as ${role}.`);
  return data;
};

const checkBalance = async (credentials, role) => {
  const { token } = await signIn(credentials, role);
  if (!token) return;
  const response = await fetch(`${API_BASE_URL}/api/auth/balance`, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await response.json();
  console.log(`📊 ${role} balance is: ${data.balance} NGN`);
};

// --- MAIN EXECUTION ---
const main = async () => {
  const action = process.argv[2];

  console.log('🚀 Starting test script...');

  switch (action) {
    case 'deposit':
      await testDeposit();
      break;
    case 'bet':
      await testPlaceBet();
      break;
    case 'resolve':
      await testResolveWager();
      break;
    case 'bettor_balance':
      await checkBalance(BETTOR_CREDENTIALS, 'Bettor');
      break;
    case 'admin_balance':
      await checkBalance(ADMIN_CREDENTIALS, 'Admin');
      break;
    default:
      console.log(`
Usage: node hook.js <action>
Actions:
  deposit          - Simulates a 120 NGN deposit to the bettor's account.
  bet              - Places a 100 NGN bet from the bettor's account.
  resolve          - Resolves the wager as an admin, calculating commission.
  bettor_balance   - Checks the current balance of the bettor.
  admin_balance    - Checks the current balance of the admin (for commission).
      `);
  }

  console.log('\n🏁 Script finished.');
};

main().catch(err => {
  console.error('\n💥 A critical error occurred:', err);
});