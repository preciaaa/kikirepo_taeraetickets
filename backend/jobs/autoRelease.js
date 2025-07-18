const { supabase } = require('../db/supabase');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function autoReleaseJob() {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch all payments with status 'initiated'
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('payment_id, listings_id, original_owner_id, event_date, total_amount')
      .eq('status', 'initiated');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return;
    }

    let releasedCount = 0;

    for (const payment of payments) {
      // Skip payments with event_date less recent than oneWeekAgo
      if (new Date(payment.event_date) > oneWeekAgo) continue;

      // Get seller's stripe_account_id
      const { data: seller, error: sellerError } = await supabase
        .from('users')
        .select('stripe_account_id')
        .eq('id', payment.original_owner_id)
        .single();

      if (sellerError || !seller?.stripe_account_id) {
        console.warn(`Skipping payment ${payment.payment_id}: no Stripe account for seller ${payment.original_owner_id}`);
        continue;
      }

      try {
        // Create Stripe transfer to seller
        await stripe.transfers.create({
          amount: Math.round(payment.total_amount * 100), // amount in cents
          currency: 'sgd',
          destination: seller.stripe_account_id,
          transfer_group: `payment_${payment.payment_id}`,
        });

        // Update payment status to confirmed with timestamp
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            released_at: new Date().toISOString(),
          })
          .eq('payment_id', payment.payment_id);

        if (updateError) {
          console.error(`Failed to update payment ${payment.payment_id} status:`, updateError);
          continue;
        }

        releasedCount++;
        console.log(`Payment ${payment.payment_id} successfully released.`);
      } catch (err) {
        console.error(`Stripe transfer failed for payment ${payment.payment_id}:`, err);
      }
    }

    console.log(`${releasedCount} payment(s) auto-released.`);
  } catch (err) {
    console.error('Auto-release job failed:', err);
  }
};
