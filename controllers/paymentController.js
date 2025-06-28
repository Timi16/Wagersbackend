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
        amount: amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason: 'Withdrawal from WagersMe',
      }),
    });
    const transferData = await transferResponse.json();
    if (!transferData.status) {
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