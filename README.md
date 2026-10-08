# CyberAkshak Admin Panel

Web panel for admins to create, edit, publish and archive events. It talks to the **same Supabase project** as the mobile app, so changes show up on the app's Events screen.

Built with React + Vite (plain JS, no extra UI libraries). Uses only the public **anon** key; all permissions are enforced by your existing Row Level Security policies (`is_admin()`).

## 1. One-time Supabase setup

1. Open **Supabase Dashboard → SQL Editor** and run `supabase/002_admin_panel.sql`.
   It creates the `event-images` storage bucket (public read, admin-only write) and turns on realtime for the `events` table. It does not alter any existing table.
2. Make yourself an admin (the user must already exist, e.g. sign up in the app first):
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
   ```
3. Run `supabase/006_event_notification_preference.sql` to save the notification preference on events.
4. Configure and deploy the secure FCM sender using [FCM_SETUP.md](./supabase/FCM_SETUP.md).

## 2. Run locally

```bash
npm install
cp .env.example .env     # then fill in your project URL and anon key
npm run dev
```

Use the same `SUPABASE_URL` / `SUPABASE_ANON_KEY` as `src/config/secrets.js` in the app. **Never use the `service_role` key here.**

## 3. Deploy

`npm run build` outputs a static site in `dist/`. Host it on Vercel, Netlify or Cloudflare Pages and set the two `VITE_` variables in the host's settings.
Because the panel is public on the internet, access is protected by login + the `role = 'admin'` check + RLS. Non-admin accounts are signed out immediately.

## What it does

- Admin login (email + password), role-checked against `profiles.role`
- Events list with status tabs, search, upcoming/past indicator
- Create / edit in a slide-over with a **live preview of the app's event card**
- Send an FCM event push after creating an event when **Notify app users** is enabled; existing events can be saved and sent from their edit form
- Banner image upload to Supabase Storage (or paste a link)
- Publish, unpublish, archive, duplicate-as-draft, delete (with confirmation)
- Activity log (writes to `admin_audit_log`)

Field mapping to the `events` table: title, description, starts_at, ends_at, location (shown as "venue" in the app), image_url, category, registration_url, status.

## 4. Two small fixes recommended in the mobile app

Both are in `src/services/eventsService.js`. They make admin changes behave correctly on users' phones.

**a) Unpublishing/archiving doesn't refresh live.** The realtime subscription filters on `status=eq.published`, so when an event moves to draft/archived the row no longer matches and the app isn't notified. RLS already hides unpublished events from non-admins, so the filter isn't needed:

```js
// before
{ event: '*', schema: 'public', table: 'events', filter: 'status=eq.published' },
// after
{ event: '*', schema: 'public', table: 'events' },
```

**b) Hiding every event brings the old sample events back.** `fetchEventsOnce` returns the bundled `UPCOMING_EVENTS` whenever Supabase returns an empty list. Once the database is the source of truth, an empty list should stay empty. Only fall back on errors:

```js
// before
    return getFallbackEvents();   // right after the `if (Array.isArray(data) && data.length > 0)` block
// after
    cachedEvents = [];
    AsyncStorage.setItem(CACHE_KEY, '[]').catch(() => {});
    return [];
```

Also note: the app currently stores `registration_url` but the event card doesn't show a Register button yet.
