import { useEffect, useRef, useState } from 'react';
import EventPreview from './EventPreview';
import { DEFAULT_CATEGORIES, uploadEventImage } from '../services/events';
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
  status: 'published',
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
    status: ev.status || 'draft',
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

export default function EventForm({ event, categories, onSave, onClose }) {
  const [form, setForm] = useState(() => (event ? fromEvent(event) : blank()));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
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

  async function submit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSave(form);
    } catch (err) {
      setSaveError(err.message || 'Could not save the event.');
      setSaving(false);
    }
  }

  const cats = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));

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
              <Field label="Category" hint="Pick one or type a new one. The app builds its filter chips from these.">
                <input list="category-list" value={form.category} onChange={set('category')} />
                <datalist id="category-list">
                  {cats.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
            </div>

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