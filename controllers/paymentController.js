import { getPaystackHeaders } from '../config/paystack.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

export const withdraw = async (req, res) => {
  const { amount } = req.body; // Amount in NGN
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    let recipientCode = user.paystackRecipientCode;
    if (!recipientCode) {
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: getPaystackHeaders(),
        body: JSON.stringify({
          type: 'nuban',
          name: user.username,
          account_number: user.bankAccountNumber, // Add this field to User model
          bank_code: user.bankCode, // Add this field to User model
          currency: 'NGN',
        }),
      });
      const recipientData = await recipientResponse.json();
      if (!recipientData.status) {
        return res.status(400).json({ message: 'Failed to create transfer recipient' });
      }
      recipientCode = recipientData.data.recipient_code;
      await user.update({ paystackRecipientCode: recipientCode });
    }

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
      return res.status(400).json({ message: 'Transfer failed' });
    }

    await user.decrement('balance', { by: amount });
    await Transaction.create({
      userId: user.id,
      type: 'withdraw',
      amount: -amount, // Negative for withdrawal
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