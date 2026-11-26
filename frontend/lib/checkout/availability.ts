/**
 * Production availability gate for the fiat checkout endpoints.
 *
 * WHY THIS EXISTS
 * ---------------
 * The checkout routes move real money, but this application has no
 * server-side authentication: `app/context/AuthContext.tsx` is a client-side
 * localStorage mock whose `login()` accepts any non-empty password and stores a
 * boolean. A route handler therefore has NO trustworthy way to identify the
 * caller, which means it cannot:
 *
 *   - attribute a PaymentIntent to a verified customer (payment ownership),
 *   - scope duplicate-payment protection to a real user, or
 *   - stop an anonymous caller driving the Stripe API at our expense.
 *
 * Trusting the localStorage flag would be security theatre: the browser owns
 * that value. So instead of shipping money-moving endpoints that anyone on the
 * internet can drive, they FAIL CLOSED in production and stay usable in
 * development, where the integration can still be exercised against Stripe test
 * keys.
 *
 * HOW TO LIFT THE GATE
 * --------------------
 * `isCheckoutAuthConfigured()` is the single intended seam. When real
 * server-side auth exists (a verified session or bearer token the handlers can
 * validate), make it reflect that, and have the handlers bind the PaymentIntent
 * to the authenticated customer. Nothing else here needs to change.
 */

/**
 * Whether the deployment can authenticate the payer server-side.
 *
 * Hard-coded `false`: no server-side auth exists in this repository yet. This
 * is deliberately NOT an environment flag, so a deployment cannot accidentally
 * (or casually) opt out of the gate without implementing the real thing.
 */
export function isCheckoutAuthConfigured(): boolean {
  return false;
}

/** Whether the app is running as a production build. */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Whether the checkout endpoints may serve a request at all.
 *
 * Open in development and test so the Stripe integration remains verifiable;
 * closed in production until the payer can be authenticated.
 */
export function isCheckoutAvailable(): boolean {
  return isCheckoutAuthConfigured() || !isProductionRuntime();
}
