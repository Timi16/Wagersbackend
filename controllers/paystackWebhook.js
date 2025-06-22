import crypto from 'crypto';
import { paystackConfig } from '../config/paystack.js';
import User from '../models/User.js';

/**
 * Verify Paystack webhook signature
 * Paystack uses your secret key to sign webhooks
 */
const verifyPaystackSignature = (payload, signature) => {
  const hash = crypto
    .createHmac('sha512', paystackConfig.secretKey)
    .update(payload, 'utf8') // Use the raw payload string
    .digest('hex');
  
  return hash === signature;
};

/**
 * Handle Paystack webhook events
 */
export const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'No signature provided' });
    }

    // Get raw body as string for signature verification
    const rawBody = req.rawBody;
    
    // Verify webhook signature using raw body
    if (!verifyPaystackSignature(rawBody, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse the JSON after signature verification
    const { event, data } = req.body;

    console.log('Paystack webhook received:', event, data);

    switch (event) {
      case 'charge.success':
        await handleChargeSuccess(data);
        break;
        
      case 'transfer.success':
        await handleTransferSuccess(data);
        break;
        
      case 'transfer.failed':
        await handleTransferFailed(data);
        break;
        
      case 'dedicatedaccount.assign.success':
        await handleVirtualAccountCreated(data);
        break;
        
      case 'dedicatedaccount.assign.failed':
        await handleVirtualAccountFailed(data);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle successful payment
 */
const handleChargeSuccess = async (data) => {
  const { reference, amount, customer, metadata } = data;
  
  try {
    // Find user by customer email or reference
    const user = await User.findOne({ 
      where: { 
        email: customer.email 
      } 
    });

    if (!user) {
      console.error('User not found for payment:', customer.email);
      return;
    }

    // Update user's virtual account balance
    const amountInNaira = amount / 100; // Paystack amounts are in kobo
    
    // You'll need to add a balance field to your User model
    await user.increment('balance', { by: amountInNaira });

    console.log(`Credit successful: ${amountInNaira} NGN to user ${user.id}`);

    // Handle different transaction types based on metadata
    if (metadata?.type === 'wager_stake') {
      await handleWagerStakePayment(metadata, user, amountInNaira);
    }

  } catch (error) {
    console.error('Error handling charge success:', error);
  }
};

/**
 * Handle successful transfer (withdrawal)
 */
const handleTransferSuccess = async (data) => {
  const { reference, amount, recipient } = data;
  
  try {
    // Find user by transfer reference
    // You might want to store transfer references in a separate table
    console.log(`Transfer successful: ${amount / 100} NGN`);
    
  } catch (error) {
    console.error('Error handling transfer success:', error);
  }
};

/**
 * Handle failed transfer
 */
const handleTransferFailed = async (data) => {
  try {
    // Handle failed withdrawal - refund user's balance
    console.log('Transfer failed:', data);
    
  } catch (error) {
    console.error('Error handling transfer failure:', error);
  }
};

/**
 * Handle virtual account creation success
 */
const handleVirtualAccountCreated = async (data) => {
  const { customer, dedicated_account } = data;
  
  try {
    // Update user with virtual account details
    const user = await User.findOne({ 
      where: { 
        email: customer.email 
      } 
    });

    if (user) {
      await user.update({
        virtualAccountNumber: dedicated_account.account_number,
        virtualAccountBank: dedicated_account.bank.name,
        virtualAccountName: dedicated_account.account_name,
      });

      console.log(`Virtual account created for user ${user.id}: ${dedicated_account.account_number}`);
    }

  } catch (error) {
    console.error('Error handling virtual account creation:', error);
  }
};

/**
 * Handle virtual account creation failure
 */
const handleVirtualAccountFailed = async (data) => {
  console.error('Virtual account creation failed:', data);
};

/**
 * Handle wager stake payment
 */
const handleWagerStakePayment = async (metadata, user, amount) => {
  // This will be used when we implement the betting system
  console.log(`Wager stake payment: ${amount} NGN from user ${user.id}`);
  // We'll implement this in the next step
};