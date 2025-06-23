// Fixed paystackWebhook.js
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
    .update(payload, 'utf8')
    .digest('hex');
  
  console.log('🔍 Signature verification:');
  console.log('Generated hash:', hash);
  console.log('Received signature:', signature);
  console.log('Match:', hash === signature);
  
  return hash === signature;
};

/**
 * Handle Paystack webhook events
 */
export const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    console.log('📥 Webhook received with signature:', signature);
    
    if (!signature) {
      console.log('❌ No signature provided');
      return res.status(400).json({ error: 'No signature provided' });
    }

    // Get raw body - this is crucial for signature verification
    const rawBody = req.rawBody || JSON.stringify(req.body);
    console.log('📄 Raw body for verification:', rawBody);
    
    if (!verifyPaystackSignature(rawBody, signature)) {
      console.log('❌ Signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified successfully');
    
    const { event, data } = req.body;
    console.log('🎯 Processing event:', event);
    console.log('📋 Event data:', JSON.stringify(data, null, 2));

    switch (event) {
      case 'charge.success':
        await handleChargeSuccess(data);
        break;
      case 'dedicated_account.inflow':
        await handleInflow(data);
        break;
      case 'transfer.success':
        await handleTransferSuccess(data);
        break;
      case 'transfer.failed':
        await handleTransferFailed(data);
        break;
      case 'dedicated_account.create.success':
        await handleVirtualAccountCreated(data);
        break;
      case 'dedicated_account.create.failed':
        await handleVirtualAccountFailed(data);
        break;
      default:
        console.log('⚠️ Unhandled event:', event);
    }

    res.status(200).json({ status: 'success', message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
};

/**
 * Handle dedicated account inflow (bank transfer to virtual account)
 */
const handleInflow = async (data) => {
  console.log('💰 Processing inflow:', data);
  
  const { amount, customer, reference } = data;
  
  try {
    // Find user by email
    const user = await User.findOne({ where: { email: customer.email } });
    
    if (!user) {
      console.error('❌ User not found for inflow:', customer.email);
      return;
    }

    // Convert from kobo to Naira
    const amountInNaira = amount / 100;
    console.log(`💵 Converting ${amount} kobo to ${amountInNaira} NGN`);
    
    // Get current balance before update
    const oldBalance = parseFloat(user.balance) || 0;
    
    // Update user balance
    await user.increment('balance', { by: amountInNaira });
    
    // Reload user to get updated balance
    await user.reload();
    const newBalance = parseFloat(user.balance);
    
    console.log(`✅ Inflow successful!`);
    console.log(`👤 User: ${user.email} (ID: ${user.id})`);
    console.log(`💰 Amount: ${amountInNaira} NGN`);
    console.log(`🏦 Reference: ${reference}`);
    console.log(`📊 Balance: ${oldBalance} → ${newBalance} NGN`);
    
  } catch (error) {
    console.error('💥 Error handling inflow:', error);
    throw error; // Re-throw to be caught by main handler
  }
};

/**
 * Handle successful payment
 */
const handleChargeSuccess = async (data) => {
  console.log('💳 Processing charge success:', data);
  
  const { reference, amount, customer } = data;
  
  try {
    const user = await User.findOne({ where: { email: customer.email } });
    
    if (!user) {
      console.error('❌ User not found for payment:', customer.email);
      return;
    }

    const amountInNaira = amount / 100; // Convert from kobo to Naira
    const oldBalance = parseFloat(user.balance) || 0;
    
    await user.increment('balance', { by: amountInNaira });
    await user.reload();
    
    const newBalance = parseFloat(user.balance);
    
    console.log(`✅ Payment credited successfully!`);
    console.log(`👤 User: ${user.email} (ID: ${user.id})`);
    console.log(`💰 Amount: ${amountInNaira} NGN`);
    console.log(`🏦 Reference: ${reference}`);
    console.log(`📊 Balance: ${oldBalance} → ${newBalance} NGN`);
    
  } catch (error) {
    console.error('💥 Error handling charge success:', error);
    throw error;
  }
};

/**
 * Handle successful transfer (withdrawal)
 */
const handleTransferSuccess = async (data) => {
  const { reference, amount, recipient } = data;
  
  try {
    console.log(`✅ Transfer successful: ${amount / 100} NGN`);
    console.log(`🏦 Reference: ${reference}`);
    console.log(`👤 Recipient:`, recipient);
    
    // TODO: Implement transfer tracking if needed
    
  } catch (error) {
    console.error('💥 Error handling transfer success:', error);
    throw error;
  }
};

/**
 * Handle failed transfer
 */
const handleTransferFailed = async (data) => {
  try {
    console.log('❌ Transfer failed:', data);
    
    // TODO: Handle failed withdrawal - refund user's balance if needed
    
  } catch (error) {
    console.error('💥 Error handling transfer failure:', error);
    throw error;
  }
};

/**
 * Handle virtual account creation success
 */
const handleVirtualAccountCreated = async (data) => {
  const { customer, dedicated_account } = data;
  
  try {
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

      console.log(`✅ Virtual account created for user ${user.id}: ${dedicated_account.account_number}`);
    } else {
      console.error('❌ User not found for virtual account creation:', customer.email);
    }

  } catch (error) {
    console.error('💥 Error handling virtual account creation:', error);
    throw error;
  }
};

/**
 * Handle virtual account creation failure
 */
const handleVirtualAccountFailed = async (data) => {
  console.error('❌ Virtual account creation failed:', data);
};

/**
 * Handle wager stake payment
 */
const handleWagerStakePayment = async (metadata, user, amount) => {
  console.log(`🎲 Wager stake payment: ${amount} NGN from user ${user.id}`);
  // TODO: Implement betting system integration
};