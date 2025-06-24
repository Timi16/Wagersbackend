import crypto from 'crypto';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const API_BASE_URL = 'https://2b3d-105-112-203-135.ngrok-free.app'; // Your ngrok URL
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const WEBHOOK_URL = `${API_BASE_URL}/api/webhook/paystack`;

// --- USER & ADMIN DETAILS ---
const BETTOR_CREDENTIALS = { email: 'bettor@example.com', password: 'bettorPass123' };
const ADMIN_CREDENTIALS = { email: 'admin_1750694571080@example.com', password: 'Admin#1234' };

// --- WAGER DETAILS ---
let WAGER_ID = 3; // Will be updated when we create a new wager
const BET_CHOICE = 'yes'; // The bettor's choice ('yes' or 'no')

// --- NEW: CREATE A WAGER ---
const createTestWager = async () => {
  console.log('\n🏗️ Creating a new test wager...');
  const { token } = await signIn(ADMIN_CREDENTIALS, 'Admin');
  if (!token) return null;

  const wagerPayload = {
    title: `Test Match ${Date.now()}`,
    description: 'A test wager for automated testing purposes',
    category: 'sports',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    tags: ['test', 'automated'],
    stakeType: 'open',
    minStake: 50,
    maxStake: 1000
  };

  console.log(`📝 Creating wager: "${wagerPayload.title}"`);
  
  const response = await fetch(`${API_BASE_URL}/api/wagers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(wagerPayload)
  });

  if (response.ok) {
    const data = await response.json();
    WAGER_ID = data.wager.id;
    console.log(`✅ Wager created successfully! Wager ID: ${WAGER_ID}`);
    return WAGER_ID;
  } else {
    console.log(`❌ Wager creation failed: ${response.status}`, await response.text());
    return null;
  }
};

// --- 1. SIMULATE A DEPOSIT ---
const testDeposit = async () => {
  console.log('\n💸 Simulating a 120 NGN deposit for the bettor...');
  const payload = { 
    event: 'dedicated_account.inflow', 
    data: { 
      amount: 12000, // 120 NGN in kobo
      customer: { email: BETTOR_CREDENTIALS.email }, 
      reference: `deposit_${Date.now()}` 
    } 
  };
  const payloadString = JSON.stringify(payload);
  const signature = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(payloadString, 'utf8').digest('hex');
  
  const response = await fetch(WEBHOOK_URL, { 
    method: 'POST', 
    body: payloadString, 
    headers: { 
      'Content-Type': 'application/json', 
      'x-paystack-signature': signature 
    } 
  });
  
  console.log(response.ok ? '✅ Deposit successful!' : `❌ Deposit failed: ${response.status}`);
};

// --- 2. PLACE A BET ---
const testPlaceBet = async (wagerId = WAGER_ID) => {
  console.log(`\n🔥 Placing a 100 NGN bet on Wager ID ${wagerId}...`);
  const { token } = await signIn(BETTOR_CREDENTIALS, 'Bettor');
  if (!token) return;

  const betPayload = { stake: 100, choice: BET_CHOICE }; 
  console.log(`📦 Placing a ${betPayload.stake} NGN bet with choice: "${betPayload.choice}"`);
  
  const response = await fetch(`${API_BASE_URL}/api/wagers/${wagerId}/bet`, { 
    method: 'POST', 
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}` 
    }, 
    body: JSON.stringify(betPayload) 
  });
  
  if (response.ok) {
    console.log('✅ Bet placed successfully!');
  } else {
    console.log(`❌ Bet placement failed: ${response.status}`, await response.text());
  }
};

// --- 3. ADMIN RESOLVES THE WAGER ---
const testResolveWager = async (wagerId = WAGER_ID) => {
  console.log(`\n👑 Admin resolving Wager ID ${wagerId}...`);
  const { token } = await signIn(ADMIN_CREDENTIALS, 'Admin');
  if (!token) return;

  const resolvePayload = { result: BET_CHOICE }; 
  console.log(`⚖️ Declaring result "${resolvePayload.result}" as the winner.`);

  const response = await fetch(`${API_BASE_URL}/api/wagers/${wagerId}/resolve`, { 
    method: 'POST', 
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}` 
    }, 
    body: JSON.stringify(resolvePayload) 
  });
  
  if (response.ok) {
    console.log('✅ Wager resolved successfully! Payouts and commission should be processed.');
  } else {
    console.log(`❌ Wager resolution failed: ${response.status}`, await response.text());
  }
};

// --- GET WAGER DETAILS ---
const getWagerDetails = async (wagerId = WAGER_ID) => {
  console.log(`\n📋 Getting details for Wager ID ${wagerId}...`);
  
  const response = await fetch(`${API_BASE_URL}/api/wagers/${wagerId}`);
  
  if (response.ok) {
    const data = await response.json();
    console.log(`✅ Wager Details:
    - Title: ${data.wager.title}
    - Status: ${data.wager.status}
    - Total Pool: ${data.wager.totalPool || 0} NGN
    - Participant Count: ${data.wager.participantCount || 0}
    - Deadline: ${new Date(data.wager.deadline).toLocaleString()}
    - Result: ${data.wager.result || 'Not resolved yet'}`);
    return data.wager;
  } else {
    console.log(`❌ Failed to get wager details: ${response.status}`);
    return null;
  }
};

// --- HELPER FUNCTIONS ---
const signIn = async (credentials, role) => {
  console.log(`🔑 Signing in as ${role}...`);
  const response = await fetch(`${API_BASE_URL}/api/auth/signin`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(credentials) 
  });
  
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
  
  const response = await fetch(`${API_BASE_URL}/api/auth/balance`, { 
    headers: { 'Authorization': `Bearer ${token}` } 
  });
  
  const data = await response.json();
  console.log(`📊 ${role} balance is: ${data.balance} NGN`);
  return data.balance;
};

// --- FULL FLOW TEST ---
const runFullFlow = async () => {
  console.log('🎯 Running complete wager flow test...');
  
  // Step 1: Create a wager
  const wagerId = await createTestWager();
  if (!wagerId) {
    console.log('❌ Cannot continue without a wager. Exiting...');
    return;
  }
  
  // Step 2: Check initial balances
  console.log('\n📊 Initial Balances:');
  await checkBalance(BETTOR_CREDENTIALS, 'Bettor');
  await checkBalance(ADMIN_CREDENTIALS, 'Admin');
  
  // Step 3: Deposit funds
  await testDeposit();
  
  // Wait a moment for webhook processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 4: Check balance after deposit
  console.log('\n📊 After Deposit:');
  await checkBalance(BETTOR_CREDENTIALS, 'Bettor');
  
  // Step 5: Place bet
  await testPlaceBet(wagerId);
  
  // Step 6: Check wager details
  await getWagerDetails(wagerId);
  
  // Step 7: Check balances after bet
  console.log('\n📊 After Bet:');
  await checkBalance(BETTOR_CREDENTIALS, 'Bettor');
  
  // Step 8: Resolve wager
  await testResolveWager(wagerId);
  
  // Step 9: Check final balances
  console.log('\n📊 Final Balances:');
  await checkBalance(BETTOR_CREDENTIALS, 'Bettor');
  await checkBalance(ADMIN_CREDENTIALS, 'Admin');
  
  // Step 10: Final wager details
  await getWagerDetails(wagerId);
  
  console.log('\n🎉 Complete flow test finished!');
};

// --- MAIN EXECUTION ---
const main = async () => {
  const action = process.argv[2];
  const wagerId = process.argv[3] ? parseInt(process.argv[3]) : WAGER_ID;

  console.log('🚀 Starting test script...');

  switch (action) {
    case 'create':
      await createTestWager();
      break;
    case 'deposit':
      await testDeposit();
      break;
    case 'bet':
      await testPlaceBet(wagerId);
      break;
    case 'resolve':
      await testResolveWager(wagerId);
      break;
    case 'details':
      await getWagerDetails(wagerId);
      break;
    case 'bettor_balance':
      await checkBalance(BETTOR_CREDENTIALS, 'Bettor');
      break;
    case 'admin_balance':
      await checkBalance(ADMIN_CREDENTIALS, 'Admin');
      break;
    case 'full':
      await runFullFlow();
      break;
    default:
      console.log(`
Usage: node hook.js <action> [wager_id]

Actions:
  create           - Creates a new test wager
  deposit          - Simulates a 120 NGN deposit to the bettor's account
  bet [wager_id]   - Places a 100 NGN bet (optionally specify wager ID)
  resolve [wager_id] - Resolves the wager as an admin
  details [wager_id] - Gets wager details
  bettor_balance   - Checks the current balance of the bettor
  admin_balance    - Checks the current balance of the admin
  full             - Runs the complete flow test (create → deposit → bet → resolve)

Examples:
  node hook.js create                    # Create a new wager
  node hook.js full                      # Run complete test flow
  node hook.js bet 5                     # Place bet on wager ID 5
  node hook.js resolve 5                 # Resolve wager ID 5
  node hook.js details 5                 # Get details of wager ID 5
      `);
  }

  console.log('\n🏁 Script finished.');
};

main().catch(err => {
  console.error('\n💥 A critical error occurred:', err);
});