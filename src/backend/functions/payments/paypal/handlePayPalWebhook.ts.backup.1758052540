/**
 * CVPlus PayPal Webhook Handler Firebase Function
 * Processes PayPal webhook events with signature verification
 */

import { https } from 'firebase-functions';
import { PayPalPaymentProvider } from '../../../services/payments/providers/paypal-provider';
import { configurationManager } from '../../../services/payments/config-manager';
import { PayPalConfig } from '../../../../types/providers.types';
import { PaymentEvent } from '../../../../types/payments.types';

/**
 * PayPal Webhook Handler Function
 */
export const handlePayPalWebhook = https.onRequest(async (req, res) => {
  // Validate HTTP method
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted for webhooks',
    });
  }

  // Get webhook signature headers
  const authAlgo = req.get('PAYPAL-AUTH-ALGO');
  const transmission = req.get('PAYPAL-TRANSMISSION-ID');
  const certId = req.get('PAYPAL-CERT-ID');
  const transmissionSig = req.get('PAYPAL-TRANSMISSION-SIG');
  const transmissionTime = req.get('PAYPAL-TRANSMISSION-TIME');

  if (!authAlgo || !transmission || !certId || !transmissionSig || !transmissionTime) {
    console.error('[handlePayPalWebhook] Missing required webhook headers');
    return res.status(400).json({
      error: 'Bad request',
      message: 'Missing required PayPal webhook headers',
    });
  }

  try {
    // Get raw payload
    const payload = JSON.stringify(req.body);
    
    // Log webhook received
    console.log('[handlePayPalWebhook] Webhook received:', {
      transmission_id: transmission,
      event_type: req.body?.event_type,
      resource_type: req.body?.resource_type,
      timestamp: transmissionTime,
    });

    // Load PayPal configuration
    const config = await configurationManager.loadConfig<PayPalConfig>('paypal');
    
    // Initialize PayPal provider
    const paypalProvider = new PayPalPaymentProvider(config);
    await paypalProvider.initialize();

    // Construct webhook event (includes signature verification)
    const webhookEvent: PaymentEvent = await paypalProvider.constructWebhookEvent(
      payload,
      transmissionSig
    );

    // Handle the webhook event
    const result = await paypalProvider.handleWebhookEvent(webhookEvent);

    if (!result.processed) {
      console.error('[handlePayPalWebhook] Failed to process webhook:', {
        event_id: webhookEvent.id,
        error: result.error,
      });
      
      return res.status(500).json({
        error: 'Webhook processing failed',
        event_id: webhookEvent.id,
        message: result.error,
      });
    }

    // Log successful processing
    console.log('[handlePayPalWebhook] Webhook processed successfully:', {
      event_id: webhookEvent.id,
      event_type: webhookEvent.type,
      actions_taken: result.actions_taken,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      event_id: webhookEvent.id,
      processed: true,
      actions_taken: result.actions_taken,
      timestamp: result.timestamp,
    });

  } catch (error) {
    console.error('[handlePayPalWebhook] Error processing webhook:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});