const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create or retrieve Stripe customer for a user
 */
async function getOrCreateCustomer(user) {
  if (user.stripeCustomerId) {
    return stripe.customers.retrieve(user.stripeCustomerId);
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    metadata: { userId: user._id.toString() },
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer;
}

/**
 * Create a Stripe Checkout Session for subscription
 */
async function createCheckoutSession({ user, plan, successUrl, cancelUrl, affiliateCode }) {
  const customer = await getOrCreateCustomer(user);

  // For 0€ plans Stripe requires payment_method_collection: 'if_required'
  const isFree = plan.price === 0;

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    ...(isFree && { payment_method_collection: 'if_required' }),
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId: user._id.toString(),
      planId: plan._id.toString(),
      affiliateCode: affiliateCode || '',
    },
    subscription_data: {
      metadata: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
        affiliateCode: affiliateCode || '',
      },
    },
  });

  return session;
}

/**
 * Create a Stripe product + price for a plan
 */
async function createStripeProduct({ name, description, price, currency, interval }) {
  const product = await stripe.products.create({ name, description });
  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: price,
    currency: currency || 'eur',
    recurring: { interval: interval || 'month' },
  });
  return { productId: product.id, priceId: stripePrice.id };
}

/**
 * Cancel a subscription at period end
 */
async function cancelSubscription(stripeSubscriptionId) {
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Get subscription details from Stripe
 */
async function getSubscription(stripeSubscriptionId) {
  return stripe.subscriptions.retrieve(stripeSubscriptionId);
}

/**
 * Create customer billing portal session
 */
async function createPortalSession(stripeCustomerId, returnUrl) {
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
}

module.exports = {
  stripe,
  getOrCreateCustomer,
  createCheckoutSession,
  createStripeProduct,
  cancelSubscription,
  getSubscription,
  createPortalSession,
};
