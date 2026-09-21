# LOOPRA Web

Web-compatible Loopra build for StackBlitz/iPad. This version does not depend on Expo Web or Expo Router, so it avoids the Expo tunnel/manifest problem encountered on iPad.

## Included
- Supabase Auth
- Dashboard
- Orders + new order creation
- Products, clients, stock
- Finances and expenses
- Ozon Edge Function test/cities/sync
- Dark Premium responsive UI

## Security
The Supabase publishable key is intended for client-side use. Ozon credentials remain in Supabase Edge Function Secrets.
