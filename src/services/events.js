import { supabase } from '../supabaseClient';
import { statusFromStartDate } from '../utils';

export const STATUSES = ['coming', 'ongoing', 'archived'];

/** coming = starts in the future, ongoing = happening now / today, archived = already over. */
export function statusFromDates(startsAt, endsAt) {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 24 * 60 * 60 * 1000;
  if (start > now) return 'coming';
  if (end >= now) return 'ongoing';
  return 'archived';
}
export const DEFAULT_CATEGORIES = ['Seminar', 'Workshop', 'Webinar'];
export const IMAGE_BUCKET = 'Events';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function listEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*, created_by_profile:profiles(full_name, email)')
    .order('starts_at', { ascending: false });
  if (error) throw error;

  const updates = new Map();
  data.forEach((event) => {
    const expectedStatus = statusFromStartDate(event.starts_at);
    if (expectedStatus && expectedStatus !== event.status) {
      const ids = updates.get(expectedStatus) || [];
      ids.push(event.id);
      updates.set(expectedStatus, ids);
      event.status = expectedStatus;
    }
  });

  for (const [status, ids] of updates) {
    const { data: updatedEvents, error: updateError } = await supabase
      .from('events')
      .update({ status })
      .in('id', ids)
      .select('id');
    if (updateError) throw updateError;
    if (updatedEvents.length !== ids.length) {
      throw new Error('Could not synchronize event statuses. Check the admin update permissions.');
    }
  }

  return data;
}

/** Turn form values into a DB row. Empty optional strings become null. */
function toRow(form) {
  const clean = (v) => {
    const s = typeof v === 'string' ? v.trim() : v;
    return s === '' || s === undefined ? null : s;
  };
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    starts_at: new Date(form.starts_at).toISOString(),
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    location: clean(form.location),
    image_url: clean(form.image_url),
    category: clean(form.category) || 'Webinar',
    registration_url: clean(form.registration_url),
    status: form.status,
    notify_app_users: Boolean(form.notify_app_users),
  };
}

export async function createEvent(form) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('events')
    .insert([{ ...toRow(form), created_by: userData.user.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function sendEventPushNotification(eventId) {
  const { data, error } = await supabase.functions.invoke('send-event-push', {
    body: { event_id: eventId },
  });
  if (error) {
    if (error.context instanceof Response) {
      const responseBody = await error.context.clone().json().catch(() => null);
      if (typeof responseBody?.error === 'string') throw new Error(responseBody.error);
    }
    throw error;
  }
  if (!data || data.sent_count === undefined) {
    throw new Error('The push service returned an invalid response.');
  }
  if (data.failed_count > 0) {
    const details = Array.isArray(data.errors)
      ? data.errors.map((message) => String(message)).join(' ')
      : '';
    throw new Error(
      `Notification sent to ${data.sent_count} device(s), but failed for ${data.failed_count}.${details ? ` ${details}` : ''}`
    );
  }
  if (data.sent_count === 0) {
    throw new Error('The event was saved, but no app devices are registered for notifications yet.');
  }
  return data;
}

export async function updateEvent(id, form) {
  const { data, error } = await supabase.from('events').update(toRow(form)).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function setEventStatus(event, status) {
  const { data, error } = await supabase.from('events').update({ status }).eq('id', event.id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(event) {
  const { error, count } = await supabase.from('events').delete({ count: 'exact' }).eq('id', event.id);
  if (error) throw error;
  if (count === 0) throw new Error('Nothing was deleted. Check that your account has the admin role.');
}

/** Uploads a banner to Supabase Storage and returns its public URL. */
export async function uploadEventImage(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be 5 MB or smaller.');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false });
  if (error) {
    if (/bucket not found/i.test(error.message)) {
      throw new Error('Storage bucket "Events" is missing. Run supabase/004_event_image_storage.sql first.');
    }
    if (error.code === '42501' || /row-level security/i.test(error.message)) {
      throw new Error('Supabase Storage blocked this upload. Run supabase/004_event_image_storage.sql in the Supabase SQL Editor, then try again while signed in as an admin.');
    }
    throw error;
  }
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}