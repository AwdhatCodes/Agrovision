# Payment Integration Guide

This project includes a complete Stripe payment integration alongside existing M-Pesa and PayPal payment methods.

## Overview

The Agrovision marketplace now supports three payment methods:
1. **Stripe** - Credit/debit card payments (primary recommended method)
2. **M-Pesa** - Mobile money payments
3. **PayPal** - PayPal account payments

## Architecture

### Backend (Express.js)
Located in `/server/index.js`:

- **POST `/api/stripe/create-checkout-session`** - Creates a Stripe checkout session
  - Validates product availability and stock
  - Returns a client secret for embedded checkout
  - Stores metadata for payment confirmation

- **POST `/api/stripe/confirm-payment`** - Confirms payment and creates a sale record
  - Verifies Stripe session payment status
  - Creates sales record in database
  - Deducts from product inventory

- **POST `/api/checkout`** - Legacy checkout for M-Pesa and PayPal
- **POST `/api/checkout-cart`** - Cart checkout for multiple items

### Frontend (React with Vite)
Located in `/client/src/`:

- **StripeCheckout.jsx** (`/client/src/components/StripeCheckout.jsx`)
  - Embedded Stripe checkout component
  - Handles Stripe key configuration
  - Provides error handling and loading states

- **Store.jsx** (`/client/src/pages/Store.jsx`)
  - Updated payment method selection UI
  - Integrated Stripe as primary payment method
  - Maintains backward compatibility with other payment methods

## Setup Instructions

### 1. Environment Variables

The following Stripe environment variables must be set in your Vercel project settings:

```
STRIPE_SECRET_KEY=sk_test_...  (or production key)
STRIPE_PUBLISHABLE_KEY=pk_test_...  (or production key)
```

These are automatically injected and available to:
- Server-side: `process.env.STRIPE_SECRET_KEY`
- Client-side: `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`

### 2. Client Configuration

The client automatically attempts to load the Stripe publishable key from:
1. `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`
2. `process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY`
3. `window.__STRIPE_PUBLISHABLE_KEY__`

If none are available, the Stripe checkout will show a configuration error.

### 3. Testing

#### Test Mode
Use Stripe's test card numbers:
- **4242 4242 4242 4242** - Visa (succeeds)
- **5555 5555 5555 4444** - Mastercard (succeeds)
- **4000 0000 0000 0002** - Visa (fails)

#### Test API Keys
Get test keys from your Stripe Dashboard under:
Settings → API Keys → Test Mode

## Usage Flow

### Single Product Checkout
1. User clicks "Buy" on a product
2. Checkout modal opens with payment method selection
3. Default method is "Stripe"
4. User selects Stripe → StripeCheckout component loads
5. Stripe creates checkout session via `/api/stripe/create-checkout-session`
6. User completes payment in embedded Stripe form
7. Stripe confirms payment via `/api/stripe/confirm-payment`
8. Sale record created, inventory updated
9. Success confirmation shown

### Cart Checkout
Similar flow but with multiple products:
1. User adds items to cart
2. Clicks "Checkout"
3. Selects Stripe payment method
4. Single checkout session for entire cart

## Database Schema

### Sales Table
Existing `sales` table stores all transactions:
```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  farm_id TEXT,
  quantity INTEGER,
  revenue REAL,
  buyer_region TEXT,
  buyer_lat REAL,
  buyer_lng REAL,
  buyer_location TEXT,
  buyer_name TEXT,
  payment_method TEXT,  -- 'stripe', 'mpesa', 'paypal', 'card'
  payment_reference TEXT,  -- 'STRIPE-xxx', 'MPESA-xxx', etc.
  payment_status TEXT,  -- 'paid', 'pending', etc.
  created_at TIMESTAMP
)
```

## Error Handling

### Missing Stripe Configuration
If `STRIPE_SECRET_KEY` is not set:
- Server logs a warning
- Stripe endpoints return HTTP 503 with configuration error
- Client shows a helpful error message

### Failed Payments
- Stripe validation errors are passed to client
- User can retry checkout
- No sale record created until payment confirmed

### Stock Issues
- Stock is verified before creating checkout session
- If stock changes during checkout, payment confirmation will fail
- User must restart checkout process

## Security Considerations

1. **Server-side Price Validation** - Prices fetched from database, not from client
2. **Payment Status Verification** - Only confirmed Stripe payments create sales
3. **Inventory Atomicity** - Stock deduction happens in single transaction
4. **Client Secret** - Session tokens are ephemeral and single-use
5. **Environment Variables** - Secret key never exposed to client

## Testing the Integration

### 1. Start the dev servers
```bash
npm run dev
```

### 2. Navigate to Store page
Open http://localhost:5173 and go to the Store section

### 3. Start a checkout
- Click "Buy" on any product
- Select "Stripe" payment method
- Fill in buyer details
- Click "Pay [amount]"

### 4. Test payment
- Use Stripe test card: 4242 4242 4242 4242
- Enter any future expiry date and any CVC
- Complete payment

### 5. Verify transaction
- Check success confirmation
- Verify sale record in database
- Check inventory was decremented

## Troubleshooting

### Stripe key not found
- Check Vercel project settings for STRIPE_SECRET_KEY
- Ensure key is set in both production and preview environments
- Restart dev server after adding/updating key

### Checkout session creation fails
- Check server logs for error message
- Verify product exists and is approved
- Verify stock is available

### Payment confirmation fails
- Check Stripe Dashboard for session details
- Verify payment status shows "paid"
- Check database for sale record creation

## Future Enhancements

- [ ] Implement webhook handling for payment updates
- [ ] Add refund processing
- [ ] Implement subscription payments
- [ ] Add payment dispute handling
- [ ] Create payment admin dashboard
- [ ] Add email receipts
- [ ] Implement payment retry logic
