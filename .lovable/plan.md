

# Product Detail Video Fix + Browse Categories Navigation + Remove "Pay on/before Delivery" References

## 1. Product Detail: Show Only Video When Video Exists (`src/pages/ProductDetail.tsx`)

Currently when a product has both `image_url` and `video_url`, the page shows the image AND a separate video player below it. Change this so:
- If `video_url` exists → show only the video (with controls, autoplay, loop)
- If only `image_url` → show the image as before
- Lines ~222-253: Replace the conditional to check `video_url` first, skip the image entirely when video exists

## 2. Browse Categories Scrolls to Category Section (`src/pages/Home.tsx`)

The "Browse Categories" button already scrolls to `#categories` (line 413). Need to ensure the `CategoryBrowser` section has `id="categories"` on its wrapper.
- Line ~580-584: Wrap `CategoryBrowser` in a `div` with `id="categories"` (or add it directly to the section element inside `CategoryBrowser.tsx`)

## 3. Remove All "Pay on Delivery" / "Pay Before Delivery" References

### `src/components/TrustBadges.tsx`
- Remove the "Pay on Delivery" badge (lines 15-19) from the main badges array

### `src/components/HowItWorks.tsx`
- Change Step 4 title from "Receive & Pay" → "Receive Your Order"
- Change description from "Get your order delivered and pay on delivery" → "Get your order delivered to your doorstep"

### `src/components/FAQ.tsx`
- Update FAQ answers to remove payment-before-delivery language:
  - Q1: Remove "payment instructions" wording → "You'll receive order confirmation immediately"
  - Q2 (payment methods): Reword to say "Payment details will be communicated via WhatsApp after order placement"
  - Q3: Remove "after your payment is confirmed" → "after your order is confirmed"

### `src/pages/Checkout.tsx`
- Line 54: Change toast description from "Please make payment and contact us with proof of payment" → "Your order has been placed successfully. We'll contact you shortly."

### `src/pages/OrderSuccess.tsx`
- Lines 148-154: Keep the payment_details section (admin configurable, useful later) but update the "What happens next" steps (lines 157-163):
  - "1. We'll review and confirm your order"
  - "2. You'll receive delivery updates via WhatsApp"
  - "3. Your order will be delivered to your doorstep"
- Line 76: Update WhatsApp message from "made payment" → "placed an order"

| File | Changes |
|------|---------|
| `src/pages/ProductDetail.tsx` | Show video only (no image) when video_url exists |
| `src/pages/Home.tsx` | Add `id="categories"` to CategoryBrowser wrapper |
| `src/components/TrustBadges.tsx` | Remove "Pay on Delivery" badge |
| `src/components/HowItWorks.tsx` | Update step 4 text to remove pay on delivery |
| `src/components/FAQ.tsx` | Update FAQ answers to remove payment-first language |
| `src/pages/Checkout.tsx` | Update success toast message |
| `src/pages/OrderSuccess.tsx` | Update WhatsApp message and "what happens next" steps |

