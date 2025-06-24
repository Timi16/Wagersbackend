import { getPaystackHeaders } from '../config/paystack.js';
import User from '../models/User.js';
import Commission from '../models/Commission.js';

export const transferCommission = async (req, res) => {
  const { commissionId } = req.body;
  const adminId = req.user.id;

  try {
    const commission = await Commission.findByPk(commissionId);
    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }
    if (commission.userId !== adminId) {
      return res.status(403).json({ message: 'Not your commission' });
    }
    if (commission.transferred) {
      return res.status(400).json({ message: 'Commission already transferred' });
    }

    const admin = await User.findByPk(adminId);
    if (admin.balance < commission.amount) {
      return res.status(400).json({ message: 'Insufficient admin balance' });
    }

    let recipientCode = admin.paystackRecipientCode;
    if (!recipientCode) {
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: getPaystackHeaders(),
        body: JSON.stringify({
          type: 'nuban',
          name: admin.username,
          account_number: admin.bankAccountNumber,
          bank_code: admin.bankCode,
          currency: 'NGN',
        }),
      });
      const recipientData = await recipientResponse.json();
      if (!recipientData.status) {
        return res.status(400).json({ message: 'Failed to create transfer recipient' });
      }
      recipientCode = recipientData.data.recipient_code;
      await admin.update({ paystackRecipientCode: recipientCode });
    }

    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: getPaystackHeaders(),
      body: JSON.stringify({
        source: 'balance',
        amount: commission.amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason: `Commission payout for wager ${commission.wagerId}`,
      }),
    });
    const transferData = await transferResponse.json();
    if (!transferData.status) {
      return res.status(400).json({ message: 'Transfer failed' });
    }

    await admin.decrement('balance', { by: commission.amount });
    await commission.update({ transferred: true, transferredAt: new Date() });

    return res.status(200).json({ message: 'Commission transferred successfully', transfer: transferData.data });
  } catch (err) {
    console.error('Transfer commission error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};