# Event push notification setup

The admin panel invokes the `send-event-push` Supabase Edge Function when a new
event is saved with `notify_app_users = true`. For an existing opted-in event,
open its edit form and choose **Save & send notification**. The function verifies the caller
against `public.admins`, checks the event preference, reads device tokens from
`public.device_tokens`, and sends an FCM HTTP v1 notification containing
`type: "event"` and `event_id`. It also saves successful broadcasts in
`public.notifications`, which the mobile app displays in its Notifications inbox.
Pushes use the event banner image when available, a branded icon/color, a
high-visibility Android channel, and include the event date and venue in the
notification text.

The mobile app's Android Firebase project is `cyberakshak-d71e9`. The Android
`google-services.json` file configures the client app; it does **not** contain
the private key required to send FCM notifications from a server.

## Configure the Firebase server credential

1. In Google Cloud Console, select Firebase project `cyberakshak-d71e9`.
2. Create or select a service account with permission to send Firebase Cloud
   Messaging messages (Firebase Cloud Messaging API Admin).
3. Create a JSON key for that service account and keep it private. Never put it
   in the web app, commit it to the repository, or share it in chat.
4. In Supabase Dashboard → Edge Functions → Secrets, set:
   - `FIREBASE_PROJECT_ID` to `cyberakshak-d71e9`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` to the complete service-account JSON

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed
Edge Functions. The service-role key is used only inside the function and must
never be added to a `VITE_` variable.

## Deploy

From the repository root, link the Supabase CLI to the project if not already
linked, then deploy:

```powershell
supabase functions deploy send-event-push --project-ref <SUPABASE_PROJECT_REF>
```

The function uses the caller's authenticated session and independently verifies
that its user ID exists in `public.admins`. Do not disable JWT verification.

After deployment, create a test event with **Notify app users** enabled. The
admin panel reports how many registered devices received the push, or shows an
error with Firebase's response if setup/delivery failed. If no app devices are
registered, the admin reports that explicitly. The mobile app must be freshly
installed with notifications allowed and have a token in `public.device_tokens`.
The inbox is opened by tapping the notification bell on the home screen; it
shows successful sends even after a push banner has been dismissed.
