import { getPaystackHeaders } from '../config/paystack.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

export const getBanks = async (req, res) => {
  try {
    const response = await fetch('https://api.paystack.co/bank', {
      method: 'GET',
      headers: getPaystackHeaders(),
    });
    const data = await response.json();
    if (data.status) {
      return res.status(200).json(data.data);
    } else {
      return res.status(500).json({ message: 'Failed to fetch banks' });
    }
  } catch (err) {
    console.error('Get banks error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const withdraw = async (req, res) => {
  const { amount, bankCode, accountNumber } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Check Paystack account balance first
    const balanceResponse = await fetch('https://api.paystack.co/balance', {
      method: 'GET',
      headers: getPaystackHeaders(),
    });
    const balanceData = await balanceResponse.json();
    
    if (!balanceData.status) {
      return res.status(500).json({ message: 'Failed to check account balance' });
    }

    // Convert amount to kobo for comparison
    const amountInKobo = amount * 100;
    const availableBalance = balanceData.data[0]?.balance || 0; // NGN balance in kobo

    if (availableBalance < amountInKobo) {
      console.error(`Insufficient Paystack balance. Required: ${amountInKobo} kobo, Available: ${availableBalance} kobo`);
      return res.status(400).json({ 
        message: `Withdrawal temporarily unavailable. Please try again later or contact support.`,
        code: 'INSUFFICIENT_PROVIDER_BALANCE'
      });
    }

    // Create a new transfer recipient with provided details
    const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: getPaystackHeaders(),
      body: JSON.stringify({
        type: 'nuban',
        name: user.username,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });
    const recipientData = await recipientResponse.json();
    if (!recipientData.status) {
      return res.status(400).json({ message: 'Failed to create transfer recipient: ' + recipientData.message });
    }
    const recipientCode = recipientData.data.recipient_code;

    // Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: getPaystackHeaders(),
      body: JSON.stringify({
        source: 'balance',
        amount: amountInKobo, // Amount in kobo
        recipient: recipientCode,
        reason: 'Withdrawal from WagersMe',
      }),
    });
    const transferData = await transferResponse.json();
    if (!transferData.status) {
      // Log the exact error for debugging
      console.error('Transfer failed:', transferData);
      return res.status(400).json({ message: 'Transfer failed: ' + transferData.message });
    }

    // Deduct from user's balance
    await user.decrement('balance', { by: amount });

    // Record transaction
    await Transaction.create({
      userId: user.id,
      type: 'withdraw',
      amount: -amount,
      status: 'completed',
      method: 'Bank Transfer',
      date: new Date(),
    });

    return res.status(200).json({ message: 'Withdrawal successful', transfer: transferData.data });
  } catch (err) {
    console.error('Withdraw error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Add to your payment controller

export const initiateSettlement = async (req, res) => {
  try {
    // Fetch successful transactions
    const transactionsResponse = await fetch('https://api.paystack.co/transaction?status=success&amount_gte=1', {
      method: 'GET',
      headers: getPaystackHeaders(),
    });
    const transactionsData = await transactionsResponse.json();
    
    if (!transactionsData.status) {
      return res.status(500).json({ message: 'Failed to fetch transactions' });
    }

    // Filter virtual account transactions
    const virtualAccountTransactions = transactionsData.data.filter(
      tx => tx.channel === 'dedicated_nuban' && tx.status === 'success'
    );

    const totalAvailable = virtualAccountTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    if (totalAvailable === 0) {
      return res.status(200).json({ 
        message: 'No funds available in virtual accounts',
        totalAvailable: 0 
      });
    }

    // Check main balance
    const balanceResponse = await fetch('https://api.paystack.co/balance', {
      method: 'GET',
      headers: getPaystackHeaders(),
    });
    const balanceData = await balanceResponse.json();

    if (!balanceData.status) {
      return res.status(500).json({ message: 'Failed to check balance' });
    }

    const mainBalance = balanceData.data[0]?.balance || 0;

    return res.status(200).json({ 
      message: 'Funds status checked. Settlement is automatic via Paystack.',
      virtualAccountFunds: totalAvailable / 100, // In naira
      mainBalance: mainBalance / 100, // In naira
      note: 'Funds in virtual accounts will settle to your bank account per your Paystack schedule.'
    });

  } catch (err) {
    console.error('Settlement error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getSettlementHistory = async (req, res) => {
  try {
    const response = await fetch('https://api.paystack.co/settlement', {
      method: 'GET',
      headers: getPaystackHeaders(),
    });
    
    const data = await response.json();
    
    if (data.status) {
      return res.status(200).json(data.data);
    } else {
      return res.status(500).json({ message: 'Failed to fetch settlement history' });
    }
  } catch (err) {
    console.error('Get settlement history error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Enhanced balance check that shows both main balance and virtual account funds
export const getDetailedBalance = async (req, res) => {
  try {
    // Get main balance
    const balanceResponse = await fetch('https://api.paystack.co/balance', {
      method: 'GET',
      headers: getPaystackHeaders(),
    });
    const balanceData = await balanceResponse.json();

    // Get virtual account transactions
    const transactionsResponse = await fetch('https://api.paystack.co/transaction?status=success&channel=dedicated_nuban', {
      method: 'GET',
      headers: getPaystackHeaders(),
    });
    const transactionsData = await transactionsResponse.json();

    let virtualAccountBalance = 0;
    if (transactionsData.status) {
      virtualAccountBalance = transactionsData.data.reduce((sum, tx) => {
        return tx.status === 'success' ? sum + tx.amount : sum;
      }, 0);
    }

    const mainBalance = balanceData.status ? (balanceData.data[0]?.balance || 0) : 0;

    return res.status(200).json({
      mainBalance: mainBalance / 100, // Convert to naira
      virtualAccountBalance: virtualAccountBalance / 100, // Convert to naira
      totalAvailable: (mainBalance + virtualAccountBalance) / 100,
      mainBalanceKobo: mainBalance,
      virtualAccountBalanceKobo: virtualAccountBalance,
      canProcessWithdrawals: mainBalance > 0
    });

  } catch (err) {
    console.error('Get detailed balance error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
// Add this to your payment controller

export const getPaystackBalance = async (req, res) => {
  try {
    const response = await fetch('https://api.paystack.co/balance', {
      method: 'GET',
      headers: getPaystackHeaders(),
    });
    const data = await response.json();
    
    if (data.status) {
      const balances = data.data.map(balance => ({
        currency: balance.currency,
        balance: balance.balance / 100, // Convert from kobo to naira
        balanceInKobo: balance.balance
      }));
      
      return res.status(200).json({ 
        message: 'Balance retrieved successfully',
        balances 
      });
    } else {
      return res.status(500).json({ message: 'Failed to fetch balance' });
    }
  } catch (err) {
    console.error('Get balance error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
