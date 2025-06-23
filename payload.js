import axios from "axios";

// Set the base URL
const baseUrl = 'https://2b3d-105-112-203-135.ngrok-free.app';

// Generate unique admin credentials
typeof window !== 'undefined';
const timestamp = Date.now();
const adminCredentials = {
  username: `admin_${timestamp}`,
  email: `admin_${timestamp}@example.com`,
  password: 'Admin#1234',
};

// Define bettor credentials (existing)
const bettorCredentials = {
  email: 'bettor@example.com',
  password: 'bettorPass123',
};

async function createAdmin(credentials) {
  // Create a new admin account
  const res = await axios.post(
    `${baseUrl}/api/auth/signup`,
    credentials
  );
  console.log(`Admin created with ID: ${res.data.user.id}`);
  return res.data.user.id;
}

async function signin(credentials, label) {
  // Sign in and return token
  const res = await axios.post(
    `${baseUrl}/api/auth/signin`,
    { email: credentials.email, password: credentials.password }
  );
  console.log(`${label} signed in, token: ${res.data.token}`);
  return res.data.token;
}

async function fetchProfile(headers, label) {
  // Fetch and log profile details
  const res = await axios.get(
    `${baseUrl}/api/auth/profile`,
    { headers }
  );
  console.log(`${label} profile:`, res.data.user);
  return res.data.user;
}

async function main() {
  try {
    // ===== ADMIN SETUP =====
    const newAdminId = await createAdmin(adminCredentials);

    const adminToken = await signin(adminCredentials, 'Admin');
    const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    // Fetch and log admin profile
    await fetchProfile(adminHeaders, 'Admin');

    // Ensure admin role
    await axios.post(
      `${baseUrl}/api/auth/set-admin`,
      { userId: newAdminId },
      { headers: adminHeaders }
    );
    console.log('Admin role assigned');

    // ===== BETTOR SIGNIN =====
    const bettorToken = await signin(bettorCredentials, 'Bettor');
    const bettorHeaders = {
      Authorization: `Bearer ${bettorToken}`,
      'Content-Type': 'application/json',
    };

    // Fetch and log bettor profile
    await fetchProfile(bettorHeaders, 'Bettor');

    // ===== WAGER & BET =====
    // Admin creates wager
    const wagerPayload = {
      title: 'Will it rain tomorrow?',
      description: 'Bet on whether it will rain tomorrow.',
      category: 'weather',
      deadline: new Date(Date.now() + 24*60*60*1000).toISOString(), // 24h from now
      stakeType: 'fixed',
      fixedStake: 100,
    };
    const wagerRes = await axios.post(
      `${baseUrl}/api/wagers`,
      wagerPayload,
      { headers: adminHeaders }
    );
    const wagerId = wagerRes.data.wager.id;
    console.log(`Wager created with ID: ${wagerId}`);

    // Bettor places bet
    const betPayload = { choice: 'yes', stake: 100 };
    await axios.post(
      `${baseUrl}/api/wagers/${wagerId}/bet`,
      betPayload,
      { headers: bettorHeaders }
    );
    console.log('Bet placed by bettor');

    // Admin resolves wager
    const resolvePayload = { result: 'yes' };
    await axios.post(
      `${baseUrl}/api/wagers/${wagerId}/resolve`,
      resolvePayload,
      { headers: adminHeaders }
    );
    console.log('Wager resolved');

    // Check balances
    const [adminBalRes, bettorBalRes] = await Promise.all([
      axios.get(`${baseUrl}/api/auth/balance`, { headers: adminHeaders }),
      axios.get(`${baseUrl}/api/auth/balance`, { headers: bettorHeaders }),
    ]);
    console.log(`Admin balance: ${adminBalRes.data.balance}`);
    console.log(`Bettor balance: ${bettorBalRes.data.balance}`);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

main();
