import { useCallback, useEffect, useMemo, useState } from 'react';
import EventForm from '../components/EventForm';
import ManualNotificationForm from '../components/ManualNotificationForm';
import StatCards from '../components/StatCards';
import { ConfirmDialog, RowMenu, StatusPill, useToast } from '../components/ui';
import { createEvent, deleteEvent, listEvents, sendEventPushNotification, sendManualPushNotification, setEventStatus, updateEvent } from '../services/events';
import { fmtDateTime, normalizeImageUrl, timeUntil } from '../utils';

const FILTERS = ['all', 'coming', 'ongoing', 'archived'];

function dateSearchValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function EventsPage() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | event
  const [manualNotificationOpen, setManualNotificationOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // { event }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError('');
      setEvents(await listEvents());
    } catch (err) {
      setLoadError(err.message || 'Could not load events.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: events.length, coming: 0, ongoing: 0, archived: 0 };
    events.forEach((e) => (c[e.status] = (c[e.status] || 0) + 1));
    return c;
  }, [events]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) =>
        (filter === 'all' || e.status === filter) &&
        (!q ||
          [
            e.title,
            e.location,
            e.category,
            e.status,
            fmtDateTime(e.starts_at),
            fmtDateTime(e.ends_at),
            dateSearchValue(e.starts_at),
            dateSearchValue(e.ends_at),
          ].some((value) => (value || '').toLowerCase().includes(q)))
    );
  }, [events, filter, query]);

  async function handleSave(form, { sendNotification = false } = {}) {
    const isNew = editing === 'new';
    const savedEvent = await (isNew ? createEvent(form) : updateEvent(editing.id, form));
    setEditing(null);
    load();
    if (form.notify_app_users && (isNew || sendNotification)) {
      try {
        const result = await sendEventPushNotification(savedEvent.id);
        const deliveryMessage = `Event saved and notification sent to ${result.sent_count} device(s).`;
        toast(result.warning ? `${deliveryMessage} ${result.warning}` : deliveryMessage);
      } catch (err) {
        toast(`Event saved, but notification failed: ${err.message || 'Could not send notification.'}`, 'error');
      }
    } else if (isNew) {
      toast('Event published. It will appear in the app.');
    } else {
      toast('Changes saved.');
    }
  }

  async function handleManualNotification(notification) {
    const result = await sendManualPushNotification(notification);
    const deliveryMessage = `Notification sent to ${result.sent_count} device(s).`;
    toast(result.warning ? `${deliveryMessage} ${result.warning}` : deliveryMessage);
  }

  async function changeStatus(ev, status, message) {
    try {
      await setEventStatus(ev, status);
      toast(message);
      load();
    } catch (err) {
      toast(err.message || 'Could not update status.', 'error');
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deleteEvent(confirm.event);
      toast('Event deleted.');
      setConfirm(null);
      load();
    } catch (err) {
      toast(err.message || 'Could not delete.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Events</h1>
          <p className="muted">
            {counts.coming} coming · {counts.ongoing} ongoing · {counts.archived} archived
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn notification-action" onClick={() => setManualNotificationOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
              <path d="M10 21h4" />
            </svg>
            Send notification
          </button>
          <button className="btn primary" onClick={() => setEditing('new')}>
            + New event
          </button>
        </div>
      </header>

      <StatCards events={events} counts={counts} />


      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)} <span className="count">{counts[f] || 0}</span>
            </button>
          ))}
        </div>
        <input className="search" type="search" placeholder="Search title, venue, category, date, or status" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search events by title, venue, category, date, or status" />
      </div>

      {loading ? (
        <div className="empty">Loading events…</div>
      ) : loadError ? (
        <div className="banner error">
          {loadError} <button className="link" onClick={load}>Retry</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          {events.length === 0 ? (
            <>
              <h3>No events yet</h3>
              <p>Create your first event and it will show up on the Events screen of the app.</p>
              <button className="btn primary" onClick={() => setEditing('new')}>+ New event</button>
            </>
          ) : (
            <p>No events match this filter.</p>
          )}
        </div>
      ) : (
        <ul className="rows">
          {shown.map((ev) => {
            const img = normalizeImageUrl(ev.image_url);
            const when = timeUntil(ev.starts_at);
            return (
              <li key={ev.id} className="row">
                <button className="row-main" onClick={() => setEditing(ev)}>
                  <div className="thumb">{img ? <img src={img} alt="" loading="lazy" /> : <span>{(ev.category || 'E')[0]}</span>}</div>
                  <div className="row-text">
                    <strong>{ev.title}</strong>
                    <span className="muted">
                      {ev.category}
                      {ev.location ? ` • ${ev.location}` : ''}
                    </span>
                  </div>
                  <div className="row-when">
                    <span>{fmtDateTime(ev.starts_at)}</span>
                    <span className={`muted${when === 'Past' ? '' : ' soon'}`}>{when}</span>
                  </div>
                </button>
                <StatusPill status={ev.status} />
                <RowMenu
                  items={[
                    { key: 'edit', label: 'Edit', onClick: () => setEditing(ev) },
                    { key: 'del', label: 'Delete…', danger: true, onClick: () => setConfirm({ event: ev }) },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <EventForm event={editing === 'new' ? null : editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}

      {manualNotificationOpen && (
        <ManualNotificationForm
          onSend={handleManualNotification}
          onClose={() => setManualNotificationOpen(false)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          danger
          busy={busy}
          title="Delete this event?"
          body={`"${confirm.event.title}" will be removed permanently and disappear from the app. If you only want to hide it, archive it instead.`}
          confirmLabel="Delete event"
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}