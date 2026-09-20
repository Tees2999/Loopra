# LOOPRA — Dark Premium
Version 1.0.0

## v1.0 — Ozon Express integration
- Server-side Supabase Edge Function
- Ozon API credentials stay in server secrets
- Test connection
- Synchronize Ozon cities into `ozon_cities`
- Send confirmed/processing orders to Ozon
- Save Ozon tracking and status
- Synchronize tracking/status/costs back to Loopra
- Ozon dashboard with operational counters
- Responsive Web / iPad / Mobile

### Supabase Edge Function secrets
Configure these server-side (never in EXPO_PUBLIC variables):
- `OZON_CUSTOMER_ID`
- `OZON_API_KEY`
- optional `OZON_BASE` (defaults to https://api.ozonexpress.ma)

The function also uses the normal Supabase Edge Function environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The Ozon field mapping is ported from the validated Loopra Google Sheets flow:
`/cities`, `POST /customers/{ID}/{KEY}/add-parcel`, `POST /customers/{ID}/{KEY}/tracking`, and `POST /customers/{ID}/{KEY}/parcel-info`.

Do not expose Ozon credentials in the client.

## Supabase connection
This build is preconfigured with the public Supabase project URL and publishable key for Loopra. Never add the Supabase secret key or Ozon API credentials to the app. Ozon credentials belong only in Supabase Edge Function Secrets.
