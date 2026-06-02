## AI WhatsApp Channel Content Assistant

An automated daily content pack for the BIG SALES WhatsApp Channel. The AI generates 3 ready-to-publish posts every morning at 8 AM WAT (West Africa Time) following the **40% promo / 40% product / 20% engagement** mix, and emails them to **joyadaeze845@gmail.com** for one-tap copy & paste into the Channel.

### Why this approach

WhatsApp Channels have no public posting API — Meta restricts publishing to the in-app admin UI only. Browser automation against web.whatsapp.com is banned and breaks frequently. The only safe, sustainable pattern is: **AI generates → admin pastes**. The email delivery is designed to make pasting take under 10 seconds per post.

### What gets built

```text
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  pg_cron 8AM    │───▶│  Edge Function   │───▶│  Email to admin │
│  (daily WAT)    │    │ generate-channel │    │  (3 posts, copy │
│                 │    │     -posts       │    │   buttons, link │
└─────────────────┘    └──────────────────┘    │   to Channel)   │
                              │                 └─────────────────┘
                              ▼
                       ┌──────────────────┐
                       │ Lovable AI       │
                       │ (Gemini 2.5)     │
                       │ + products table │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ channel_posts    │
                       │ history table    │
                       │ (anti-repeat)    │
                       └──────────────────┘
```

### Content mix (40/40/20)

Every daily pack contains exactly:
- **1 PROMO post (40%)** — flash deal / discount call-out using real products that have `discount_price` set, or store-wide messaging ("Free delivery in Lagos this week"). Bold Naira pricing, urgency words.
- **1 PRODUCT showcase (40%)** — features a random in-stock featured/high-likes product. Pulls real name, price, description, image. Drives traffic to the product page.
- **1 ENGAGEMENT post (20%)** — poll, question, lifestyle tip, or "this or that" using 2 random products. Builds community without selling.

Daily rotation rule: never reuse the same product within 7 days (enforced via `channel_posts` history table).

### Admin email format

Each morning's email contains:
- Header: "Your 3 WhatsApp Channel posts for [date]"
- Big green button: **"Open WhatsApp Channel"** → links to `https://whatsapp.com/channel/0029VbCiW8yKAwEjEeodvb0X`
- For each of the 3 posts:
  - Post type badge (PROMO / PRODUCT / ENGAGEMENT)
  - Product image (if any) — right-click → Save, then paste in Channel
  - Caption preview with emojis/formatting
  - **"Copy caption"** button (mailto-friendly fallback: caption is also in selectable plain text)
  - Product link (if any) — `https://bigsales.ng/product/{id}`

### Admin dashboard page

New route: **/admin/channel-ai** with:
- **Today's pack** — preview the 3 posts that were sent (or "Generate now" if not yet sent)
- **"Send to my email now"** button — re-send today's pack on demand
- **History** — last 30 days of generated posts with type, status, and timestamp
- **Settings** — toggle the daily schedule on/off, change recipient email (default: joyadaeze845@gmail.com)

### Technical details

**Database (one migration):**
- `channel_posts` table: `id`, `post_type` (promo/product/engagement), `caption`, `image_url`, `product_id` (nullable FK reference), `sent_at`, `generated_for_date`, `created_at`. RLS: admin-only via `has_role(auth.uid(), 'admin')`. GRANTs to `authenticated` + `service_role`.
- `channel_ai_settings` table: `id`, `enabled` (bool, default true), `recipient_email` (default 'joyadaeze845@gmail.com'), `channel_url`, `updated_at`. RLS: admin-only.

**Email infrastructure:**
- Trigger the Lovable Emails setup dialog (`<presentation-open-email-setup>`). User picks a sender subdomain on `bigsales.ng` (e.g. `notify.bigsales.ng`).
- After domain setup, scaffold transactional emails. Create one React Email template: `channel-daily-pack.tsx` (branded green/gold header, product cards, copy-friendly captions).
- Register in `TEMPLATES` map, deploy.

**Edge function `generate-channel-posts`:**
1. Read settings; abort if `enabled = false`.
2. Pull pools: discounted products, featured/in-stock products, all in-stock products.
3. Exclude products used in `channel_posts` in the last 7 days.
4. Call Lovable AI (Gemini 2.5 Flash via existing `LOVABLE_API_KEY`) with structured-output tool calling to generate 3 captions (one per bucket) using selected products as context. Prompts enforce: Naira pricing with `₦`, Nigerian English tone, emojis, NEVER mention "Pay on Delivery", strong CTA, 280–600 char captions sized for WhatsApp.
5. Insert 3 rows into `channel_posts`.
6. Invoke `send-transactional-email` with template `channel-daily-pack` and `templateData = { date, posts: [...] }`. Idempotency key: `channel-pack-${YYYY-MM-DD}` (prevents duplicate sends if cron retries).

**Scheduling:**
- Enable `pg_cron` + `pg_net` extensions.
- Insert cron job (via Supabase insert tool, not migration — contains anon key): runs daily at `0 7 * * *` UTC (= 8 AM WAT, Nigeria is UTC+1). Calls the edge function via `net.http_post` with anon key.

**Frontend:**
- New page `src/pages/admin/ChannelAI.tsx` (uses existing admin layout/styling, green/gold tokens).
- Add nav entry in admin sidebar.
- Wire "Generate now" and "Send to my email" buttons to invoke the edge function with override flags.
- All wrapped in existing `AdminRoute` guard.

### Files

**Created**
- `supabase/migrations/<ts>_channel_ai.sql` (tables + RLS + GRANTs)
- `supabase/functions/generate-channel-posts/index.ts`
- `supabase/functions/_shared/transactional-email-templates/channel-daily-pack.tsx`
- `src/pages/admin/ChannelAI.tsx`

**Edited**
- `supabase/config.toml` (register `generate-channel-posts` with `verify_jwt = false`)
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (add template)
- `src/App.tsx` (add `/admin/channel-ai` route)
- `src/pages/admin/Dashboard.tsx` or admin sidebar (add nav link)

### Out of scope (will NOT do)

- Auto-posting to the WhatsApp Channel itself (no API exists — would get the admin number banned).
- Twilio / WhatsApp Business API (you chose email delivery).
- Marketing email blasts to customers (Lovable Email is strictly transactional).
- Generating product images — uses existing product photos from the database.

### What you'll need to do once

1. Approve the plan.
2. Complete the one-click email domain setup dialog when it pops up (verifies `notify.bigsales.ng` via DNS — automatic).
3. Wait one morning to receive the first 8 AM pack at joyadaeze845@gmail.com.
4. Copy → paste → publish on the Channel (≈90 seconds per day).