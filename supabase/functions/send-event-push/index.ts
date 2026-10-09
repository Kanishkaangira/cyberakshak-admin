const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starts_at: string;
  location: string | null;
  category: string | null;
  notify_app_users: boolean;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function encodeBase64Url(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodePrivateKey(pem: string) {
  const content = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(content);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getFirebaseAccessToken(account: ServiceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    encodeBase64Url(
      JSON.stringify({
        iss: account.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: issuedAt,
        exp: issuedAt + 3600,
      }),
    ),
  ].join('.');

  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    decodePrivateKey(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    signingKey,
    new TextEncoder().encode(unsignedToken),
  );
  const assertion = `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const responseBody = await response.text();
  const result = responseBody ? JSON.parse(responseBody) : null;
  if (!response.ok || typeof result.access_token !== 'string') {
    throw new Error('Could not authenticate with Firebase. Check the service-account secret and enable FCM.');
  }
  return result.access_token as string;
}

async function databaseRequest(path: string, serviceRoleKey: string, init?: RequestInit) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '');
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured for the push function.');
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init?.headers || {}),
    },
  });
  const responseBody = await response.text();
  const result = responseBody ? JSON.parse(responseBody) : null;
  if (!response.ok) {
    throw new Error('Could not read the notification data from Supabase.');
  }
  return result;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID');
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!supabaseUrl || !serviceRoleKey || !firebaseProjectId || !serviceAccountJson) {
    return jsonResponse({ error: 'Push notification server secrets are not configured.' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Sign in as an administrator to send notifications.' }, 401);
  }

  try {
    const payload: Record<string, unknown> = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return jsonResponse({ error: 'A valid notification request is required.' }, 400);
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: authorization,
      },
    });
    if (!userResponse.ok) {
      return jsonResponse({ error: 'Your session is invalid or expired. Sign in again.' }, 401);
    }
    const user = await userResponse.json();

    const admins = await databaseRequest(
      `admins?select=id&id=eq.${encodeURIComponent(user.id)}`,
      serviceRoleKey,
    );
    if (!Array.isArray(admins) || admins.length !== 1) {
      return jsonResponse({ error: 'Only administrators can send notifications.' }, 403);
    }

    let notificationTitle: string;
    let messageBody: string;
    let notificationData: Record<string, string>;
    let imageUrl: string | null = null;

    if (typeof payload.event_id === 'string') {
      const eventId = payload.event_id;
      if (!/^[0-9a-f-]{36}$/i.test(eventId)) {
        return jsonResponse({ error: 'A valid event ID is required.' }, 400);
      }
      const events = await databaseRequest(
        `events?select=id,title,description,image_url,starts_at,location,category,notify_app_users&id=eq.${encodeURIComponent(eventId)}&notify_app_users=eq.true`,
        serviceRoleKey,
      ) as EventRow[];
      const event = events[0];
      if (!event) {
        return jsonResponse({ error: 'Event not found or notifications are not enabled for it.' }, 404);
      }

      notificationTitle = event.title;
      imageUrl = event.image_url;
      const eventDate = new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(event.starts_at));
      const eventDetails = [event.category, eventDate, event.location].filter(Boolean).join(' · ');
      messageBody = [eventDetails, event.description || 'A new cyber safety event has been added.']
        .filter(Boolean)
        .join('\n')
        .slice(0, 240);
      notificationData = {
        type: 'event',
        event_id: event.id,
        event_image_url: event.image_url || '',
      };
    } else if (payload.type === 'announcement') {
      if (typeof payload.title !== 'string' || typeof payload.body !== 'string') {
        return jsonResponse({ error: 'A notification title and message are required.' }, 400);
      }
      notificationTitle = payload.title.trim();
      messageBody = payload.body.trim();
      if (!notificationTitle || notificationTitle.length > 120) {
        return jsonResponse({ error: 'The notification title must be between 1 and 120 characters.' }, 400);
      }
      if (!messageBody || messageBody.length > 2000) {
        return jsonResponse({ error: 'The notification message must be between 1 and 2000 characters.' }, 400);
      }
      if (new TextEncoder().encode(`${notificationTitle}${messageBody}`).length > 3500) {
        return jsonResponse({ error: 'The notification is too large. Shorten the title or message and try again.' }, 400);
      }
      notificationData = { type: 'announcement' };
    } else {
      return jsonResponse({ error: 'Choose an event notification or a manual announcement.' }, 400);
    }

    const tokens = await databaseRequest(
      'device_tokens?select=fcm_token',
      serviceRoleKey,
    ) as { fcm_token: string }[];
    const uniqueTokens = [...new Set(tokens.map(({ fcm_token }) => fcm_token).filter(Boolean))];
    if (uniqueTokens.length === 0) return jsonResponse({ sent_count: 0, failed_count: 0 });

    const account = JSON.parse(serviceAccountJson) as ServiceAccount;
    if (!account.client_email || !account.private_key || account.project_id !== firebaseProjectId) {
      return jsonResponse({ error: 'Firebase service account does not match FIREBASE_PROJECT_ID.' }, 500);
    }
    const accessToken = await getFirebaseAccessToken(account);
    let sentCount = 0;
    let failedCount = 0;
    const deliveryErrors: string[] = [];

    for (let index = 0; index < uniqueTokens.length; index += 20) {
      const tokenBatch = uniqueTokens.slice(index, index + 20);
      const results = await Promise.all(
        tokenBatch.map(async (token) => {
          const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/messages:send`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: { title: notificationTitle, body: messageBody },
                  data: notificationData,
                  android: {
                    priority: 'HIGH',
                    notification: {
                      channel_id: 'event-updates-v2',
                      icon: 'ic_notification',
                      color: '#4B4FE0',
                      sound: 'default',
                      default_vibrate_timings: true,
                      ...(imageUrl ? { image: imageUrl } : {}),
                    },
                  },
                },
              }),
            },
          );
          if (response.ok) return { ok: true };

          const fcmError = await response.json().catch(() => null);
          const message =
            typeof fcmError?.error?.message === 'string'
              ? fcmError.error.message
              : `FCM returned HTTP ${response.status}.`;
          return { ok: false, message };
        }),
      );
      sentCount += results.filter((result) => result.ok).length;
      failedCount += results.filter((result) => !result.ok).length;
      deliveryErrors.push(
        ...results
          .filter((result) => !result.ok)
          .map((result) => result.message),
      );
    }

    let inboxWarning: string | undefined;
    try {
      await databaseRequest(
        'notifications',
        serviceRoleKey,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            title: notificationTitle,
            body: messageBody,
            audience: 'all',
            targeting: {},
            sent_at: sentCount > 0 ? new Date().toISOString() : null,
            data: {
              ...notificationData,
              sent_count: sentCount,
              failed_count: failedCount,
              ...(imageUrl ? { event_image_url: imageUrl } : {}),
            },
            created_by: user.id,
          }),
        },
      );
    } catch (error) {
      console.error('[send-event-push] Push completed, but the notification inbox record could not be saved.');
      inboxWarning = 'The push delivery was attempted, but the notification could not be saved to the app inbox.';
    }

    return jsonResponse({
      sent_count: sentCount,
      failed_count: failedCount,
      errors: [...new Set(deliveryErrors)].slice(0, 5),
      ...(inboxWarning ? { warning: inboxWarning } : {}),
    });
  } catch (error) {
    console.error('[send-event-push] Delivery failed.');
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Event notification delivery failed.' },
      500,
    );
  }
});
