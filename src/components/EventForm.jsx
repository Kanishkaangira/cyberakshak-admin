import { useEffect, useRef, useState } from 'react';
import EventPreview from './EventPreview';
import { DEFAULT_CATEGORIES, STATUSES, uploadEventImage } from '../services/events';
import { isHttpUrl, toLocalInput } from '../utils';

const blank = () => ({
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  location: '',
  image_url: '',
  category: 'Webinar',
  registration_url: '',
  status: 'coming',
  notify_app_users: false,
});

function fromEvent(ev) {
  return {
    title: ev.title || '',
    description: ev.description || '',
    starts_at: toLocalInput(ev.starts_at),
    ends_at: toLocalInput(ev.ends_at),
    location: ev.location || '',
    image_url: ev.image_url || '',
    category: ev.category || 'Webinar',
    registration_url: ev.registration_url || '',
    status: ev.status || 'coming',
    notify_app_users: Boolean(ev.notify_app_users),
  };
}

function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = 'Add a title.';
  if (!f.description.trim()) e.description = 'Add a short description.';
  if (!f.starts_at) e.starts_at = 'Pick a start date and time.';
  if (f.ends_at && f.starts_at && new Date(f.ends_at) < new Date(f.starts_at)) e.ends_at = 'End must be after the start.';
  if (f.registration_url.trim() && !isHttpUrl(f.registration_url.trim())) e.registration_url = 'Enter a full link starting with https://';
  if (f.image_url.trim() && !isHttpUrl(f.image_url.trim())) e.image_url = 'Enter a full image link starting with https://';
  return e;
}

export default function EventForm({ event, onSave, onClose }) {
  const [form, setForm] = useState(() => (event ? fromEvent(event) : blank()));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveAndSend, setSaveAndSend] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef(null);
  const firstField = useRef(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const setChecked = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.checked }));
  };

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const url = await uploadEventImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function saveEvent({ sendNotification = false } = {}) {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSaveAndSend(sendNotification);
    setSaveError('');
    try {
      await onSave(form, { sendNotification });
    } catch (err) {
      setSaveError(err.message || 'Could not save the event.');
    } finally {
      setSaving(false);
      setSaveAndSend(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    await saveEvent();
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <form className="sheet-form" onSubmit={submit} noValidate>
          <header className="sheet-head">
            <h2 id="sheet-title">{event ? 'Edit event' : 'New event'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} disabled={saving} aria-label="Close">
              ✕
            </button>
          </header>

          <div className="sheet-scroll">
            <Field label="Title" error={errors.title}>
              <input ref={firstField} value={form.title} onChange={set('title')} maxLength={140} placeholder="e.g. Secure your UPI, net banking & wallets" />
            </Field>

            <Field label="Description" error={errors.description} hint="Shown on the event card in the app.">
              <textarea rows={4} value={form.description} onChange={set('description')} placeholder="What will people learn or do?" />
            </Field>

            <div className="grid2">
              <Field label="Starts" error={errors.starts_at}>
                <input type="datetime-local" value={form.starts_at} onChange={set('starts_at')} />
              </Field>
              <Field label="Ends (optional)" error={errors.ends_at}>
                <input type="datetime-local" value={form.ends_at} onChange={set('ends_at')} />
              </Field>
            </div>

            <div className="grid2">
              <Field label="Venue / mode">
                <input value={form.location} onChange={set('location')} placeholder="Online (Zoom), Campus Auditorium…" />
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={set('category')}>
                  {DEFAULT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Status">
              <select value={form.status} onChange={set('status')}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
            </Field>

            <Field
              label="App notification"
              hint="New events send after publishing. For an existing event, check this option and choose Save & send notification."
            >
              <label className="notification-toggle">
                <input
                  type="checkbox"
                  checked={form.notify_app_users}
                  onChange={setChecked('notify_app_users')}
                />
                <span>Notify app users about this event</span>
              </label>
            </Field>

            <Field label="Banner image" error={errors.image_url || uploadError}>
              <div className="image-row">
                <input value={form.image_url} onChange={set('image_url')} placeholder="Paste an image link, or upload →" />
                <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPickFile} />
              </div>
              <span className="hint">JPG, PNG or WebP, up to 5 MB. Wide images (16:9) look best.</span>
            </Field>

            <Field label="Registration link (optional)" error={errors.registration_url}>
              <input value={form.registration_url} onChange={set('registration_url')} placeholder="https://" inputMode="url" />
            </Field>
          </div>

          <footer className="sheet-foot">
            {saveError && <span className="err grow">{saveError}</span>}
            <span className="grow" />
            {event && form.notify_app_users && (
              <button
                type="button"
                className="btn"
                onClick={() => saveEvent({ sendNotification: true })}
                disabled={saving || uploading}
              >
                {saving && saveAndSend ? 'Saving & sending…' : 'Save & send notification'}
              </button>
            )}
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving || uploading}>
              {saving ? 'Saving…' : event ? 'Save changes' : 'Publish event'}
            </button>
          </footer>
        </form>

        <aside className="sheet-preview">
          <p className="preview-label">How it looks in the app</p>
          <EventPreview form={form} />
        </aside>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="err">{error}</span>}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}