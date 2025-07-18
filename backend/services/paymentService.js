// --- services/stripeService.js ---
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();

// === STRIPE CONNECT & PAYMENT ===

router.post('/create-stripe-account', async (req, res) => {
  try {
    const { user_id, email } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    // Check if user already has a stripe_account_id saved in DB
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', user_id)
      .single();

    if (userError) {
      return res.status(500).json({ error: 'Failed to fetch user info' });
    }

    let stripeAccountId = user?.stripe_account_id;

    if (!stripeAccountId) {
      // Create new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'standard',
        country: 'SG',
        email, // optional but recommended for onboarding
      });

      // Save Stripe account ID to DB
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_account_id: account.id })
        .eq('id', user_id);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to save Stripe account ID' });
      }

      stripeAccountId = account.id;
    }

    // Create onboarding / login link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `http://localhost:3000/onboard`,
      return_url: `http://localhost:3000/profile`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe create account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// checkout route
router.post('/checkout', async (req, res) => {
  try {
    const { user_id, listings_id } = req.body;
    if (!user_id || !listings_id) return res.status(400).json({ error: 'Missing user_id or listings_id' });

    // 1. Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('listings_id, original_owner_id, price, date, status')
      .eq('listings_id', listings_id)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // 2. Check if listing is already sold or confirmed
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available' });
    }

    // 3. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(listing.price * 100), // in cents
      currency: 'sgd',
      payment_method_types: ['card'],
      metadata: {
        new_owner_id: user_id,
        listings_id: listings_id,
      },
    });

    // DO NOT insert payment record or update listing here.
    // Wait until payment success (handled in /payment-success).

    // 4. Respond with payment client secret
    return res.json({
      clientSecret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Internal server error during checkout' });
  }
});


//payment success route
router.post('/payment-success', async (req, res) => {
  const { payment_intent_id } = req.body;
  if (!payment_intent_id) {
    return res.status(400).json({ error: 'Missing payment_intent_id' });
  }

  try {
    // Retrieve payment intent from Stripe to get metadata
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not succeeded' });
    }

    const user_id = paymentIntent.metadata.new_owner_id;
    const listings_id = paymentIntent.metadata.listings_id;

    // Check if payment already exists (idempotency)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_intent_id', payment_intent_id)
      .single();

    if (existingPayment) {
      return res.json({ message: 'Payment already recorded' });
    }

    // Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('listings_id, original_owner_id, price, date')
      .eq('listings_id', listings_id)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        listings_id,
        new_owner_id: user_id,
        original_owner_id: listing.original_owner_id,
        total_amount: listing.price,
        event_date: listing.date,
        status: 'initiated',
        payment_intent_id,
      })
      .select()
      .single();

    if (paymentError) {
      return res.status(500).json({ error: 'Failed to create payment record' });
    }

    // Update listing status to 'sold'
    const { error: listingUpdateError } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('listings_id', listings_id);

    if (listingUpdateError) {
      return res.status(500).json({ error: 'Failed to update listing status' });
    }

    res.json({ success: true, payment });
  } catch (err) {
    console.error('Error in payment-success route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// === POST-PURCHASE ACTIONS ===

router.post('/confirm-purchase', async (req, res) => {
  try {
    const { payment_id, new_owner_id } = req.body;
    if (!payment_id || !new_owner_id) {
      return res.status(400).json({ error: 'Missing payment_id or new_owner_id' });
    }

    // 1. Fetch payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(400).json({ error: 'Payment not found' });
    }

    if (payment.new_owner_id !== new_owner_id) {
      return res.status(403).json({ error: 'Buyer mismatch' });
    }
    if (payment.status !== 'initiated') {
      return res.status(400).json({ error: 'Payment not in initiated state' });
    }

    // 2. Fetch all ticket rows (listings) with same listings_id
    const { data: tickets, error: ticketFetchError } = await supabase
      .from('listings')
      .select('ticket_id, original_owner_id, price')
      .eq('listings_id', payment.listings_id);

    if (ticketFetchError) {
      return res.status(500).json({ error: 'Failed to fetch ticket rows' });
    }
    if (!tickets || tickets.length === 0) {
      return res.status(400).json({ error: 'No tickets found for this listing' });
    }

    // 3. Group tickets by seller and sum amounts
    const sellersMap = {};
    tickets.forEach(t => {
      if (!sellersMap[t.original_owner_id]) {
        sellersMap[t.original_owner_id] = 0;
      }
      sellersMap[t.original_owner_id] += t.price;
    });

    // 4. For each seller, get Stripe account and create transfer
    for (const sellerId of Object.keys(sellersMap)) {
      // Fetch seller's Stripe account id
      const { data: seller, error: sellerError } = await supabase
        .from('users')
        .select('stripe_account_id')
        .eq('id', sellerId)
        .single();

      if (sellerError || !seller?.stripe_account_id) {
        console.warn(`Seller ${sellerId} missing Stripe account, skipping transfer`);
        continue; // skip seller without Stripe account
      }

      const amountCents = Math.round(sellersMap[sellerId] * 100);

      try {
        await stripe.transfers.create({
          amount: amountCents,
          currency: 'sgd',
          destination: seller.stripe_account_id,
          transfer_group: `payment_${payment_id}`,
        });
      } catch (err) {
        console.error(`Failed transfer to seller ${sellerId}:`, err);
        // Optionally decide to fail whole route or continue here.
        // For now, continue with other sellers.
      }
    }

    // 5. Update payment to confirmed + released + timestamps
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'released',
        confirmed_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
      })
      .eq('payment_id', payment_id);

    if (updatePaymentError) {
      return res.status(500).json({ error: 'Failed to update payment status' });
    }

    // 6. Update all related listings to 'confirmed'
    const ticketIds = tickets.map(t => t.ticket_id);
    const { error: listingUpdateError } = await supabase
      .from('listings')
      .update({ status: 'confirmed' })
      .in('ticket_id', ticketIds);

    if (listingUpdateError) {
      console.error('Failed to update listings to confirmed:', listingUpdateError);
      return res.status(500).json({ error: 'Failed to update listing status' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Confirm purchase error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// // === REPORT SELLER ROUTE ===

router.post('/report-seller', async (req, res) => {
  try {
    const { payment_id } = req.body;

    if (!payment_id) {
      return res.status(400).json({ error: 'Missing payment_id' });
    }

    // Set status to 'reported' internally, no need to get from client
    const { error: updateError, data: updatedPayment } = await supabase
      .from('payments')
      .update({ status: 'reported' })
      .eq('payment_id', payment_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return res.status(500).json({ error: 'Failed to update payment status' });
    }

    if (!updatedPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.status(200).json({ success: true, message: `Payment status updated to reported` });

  } catch (err) {
    console.error('Unexpected error in report-seller:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// === PAYMENT HISTORY ROUTES ===
router.get('/payments/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    const { data, error } = await supabase
      .from('payments')
      .select('payment_id, listings_id, total_amount, status, created_at, event_date')
      .eq('new_owner_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to fetch payments');
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error('Error fetching payments:', err.message);
    res.status(500).json({ error: 'Internal server error while fetching payments' });
  }
});

// test manually auto release
router.post('/manual-auto-release', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get listings whose event_date is more than 7 days ago
    const { data: staleListings, error: listingsError } = await supabase
      .from('listings')
      .select('listings_id')
      .lt('date', sevenDaysAgo.toISOString());

    if (listingsError) {
      console.error('Error fetching stale listings:', listingsError);
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }

    const listingIds = staleListings.map((l) => l.listings_id);

    if (listingIds.length === 0) {
      return res.status(200).json({ message: 'No eligible listings for auto-confirmation' });
    }

    // Update pending payments whose listings match
    const { data: updatedPayments, error: updateError } = await supabase
      .from('payments')
      .update({ status: 'confirmed' })
      .eq('status', 'pending')
      .in('listings_id', listingIds)
      .select();

    if (updateError) {
      console.error('Error confirming payments:', updateError);
      return res.status(500).json({ error: 'Failed to confirm payments' });
    }

    res.status(200).json({
      message: `${updatedPayments.length} payment(s) auto-confirmed.`,
      updatedPayments,
    });
  } catch (err) {
    console.error('Unexpected error in auto-release:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;

