# Phase 15 - Verification & Testing

## 1. Webhook Duplicate Test (Idempotency)

Simulate two concurrent webhooks arriving at the same time to ensure unique constraints block the second one.

```bash
# Set your Razorpay Secret and webhook payload
export RAZORPAY_WEBHOOK_SECRET="your_webhook_secret_here"
export PAYLOAD='{"entity":"event","account_id":"acc_123","event":"payment.captured","contains":["payment"],"payload":{"payment":{"entity":{"id":"pay_XYZ","amount":10000,"currency":"INR","notes":{"bookingId":"<BOOKING_ID_HERE>","tenantId":"<TENANT_ID_HERE>"}}}}}'

# Generate HMAC signature
export SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$RAZORPAY_WEBHOOK_SECRET" | sed 's/^.* //')

# Fire duplicate requests quickly
curl -X POST http://localhost:3000/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  -d "$PAYLOAD" & \
curl -X POST http://localhost:3000/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  -d "$PAYLOAD"
```

## 2. Testing Refund Simulation

Force a booking into `EXPIRED` status, then send a `payment.captured` webhook.
The DB should reject the `PaymentProcessorService` flow, flag `REFUND_REQUIRED`, and successfully trigger Razorpay API refund outside of the transaction, writing both a SUCCESS payment ledger and REFUND_INITIATED/SUCCESS ledger.

1. Create a Booking, stop before capture.
2. Manually execute in Prisma Studio: change `Booking.status` to `EXPIRED`.
3. Fire the `payment.captured` webhook using the curl script above.
4. Check Ledger entries.

## 3. Reconciliation Worker Test

1. Create a booking and go through Razorpay UI but close network before frontend redirects.
2. Wait 10 minutes.
3. The cron job will pick up the `PAYMENT_IN_PROGRESS` booking and fetch from Razorpay API.
4. If payment is captured, it will restore the DB to `CONFIRMED`.

```bash
# Force worker run for testing by changing frequency from EVERY_5_MINUTES to EVERY_10_SECONDS temporarily, then reverting.
```
