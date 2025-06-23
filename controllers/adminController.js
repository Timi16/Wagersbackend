import Commission from '../models/Commission.js';  // Fixed: default import + .js extension
import fetch from 'node-fetch';

export const transferCommission = async (req, res) => {
  try {
    const totalCommission = await Commission.sum('amount', { where: { transferred: false } });
    if (!totalCommission || totalCommission <= 0) {
      return res.status(200).json({ message: 'No commission to transfer' });
    }

    const amountInKobo = Math.round(totalCommission * 100); // Convert Naira to Kobo

    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amountInKobo,
        recipient: process.env.PAYSTACK_ADMIN_RECIPIENT_CODE,
        reason: 'Commission transfer',
      }),
    });

    const transferData = await transferResponse.json();
    if (transferData.status) {
      await Commission.update(
        { transferred: true, transferredAt: new Date() },
        { where: { transferred: false } }
      );
      return res.status(200).json({ message: 'Commission transferred successfully' });
    } else {
      return res.status(400).json({ message: 'Transfer failed', error: transferData.message });
    }
  } catch (err) {
    console.error('Transfer commission error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};