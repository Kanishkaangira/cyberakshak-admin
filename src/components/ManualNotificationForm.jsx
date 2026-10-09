import { useEffect, useState } from 'react';

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 2000;

export default function ManualNotificationForm({ onSend, onClose }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [delivery, setDelivery] = useState(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      setDelivery(await onSend({ title: title.trim(), body: body.trim() }));
    } catch (sendError) {
      setError(sendError.message || 'Could not send the notification.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="overlay center"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <section
        className="dialog notification-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-dialog-title"
      >
        <header className="notification-dialog-head">
          <div className="notification-dialog-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
              <path d="M10 21h4" />
            </svg>
          </div>
          <div>
            <h2 id="notification-dialog-title">Send app notification</h2>
            <p>Write an update to send to app users.</p>
          </div>
          <button
            type="button"
            className="icon-btn notification-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form onSubmit={submit}>
          {delivery ? (
            <div className={`notification-result${delivery.failed_count > 0 ? ' partial' : ''}`} role="status">
              <span className="notification-result-icon" aria-hidden="true">
                {delivery.failed_count > 0 ? '!' : '✓'}
              </span>
              <div>
                <strong>
                  {delivery.failed_count > 0 ? 'Notification partially sent' : 'Notification sent'}
                </strong>
                <p>
                  Sent to {delivery.sent_count} {delivery.sent_count === 1 ? 'device' : 'devices'}.
                  {delivery.failed_count > 0 &&
                    ` ${delivery.failed_count} ${delivery.failed_count === 1 ? 'device was' : 'devices were'} not reached.`}
                </p>
                {delivery.failed_count > 0 && delivery.errors?.length > 0 && (
                  <p className="notification-result-details">{delivery.errors.join(' ')}</p>
                )}
                {delivery.warning && (
                  <p className="notification-result-details">{delivery.warning}</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <label className="field">
                <span className="label">Notification title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={MAX_TITLE_LENGTH}
                  placeholder="e.g. New app update"
                  required
                  autoFocus
                />
                <span className="hint notification-counter">{title.length}/{MAX_TITLE_LENGTH}</span>
              </label>
              <label className="field">
                <span className="label">Message</span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={MAX_BODY_LENGTH}
                  rows={5}
                  placeholder="Share an update, reminder, or important information…"
                  required
                />
                <span className="hint notification-counter">{body.length}/{MAX_BODY_LENGTH}</span>
              </label>

              <div className="notification-delivery-note">
                <span aria-hidden="true">ⓘ</span>
                This message will be sent to registered app devices and appear in the app’s Notifications list.
              </div>
              {error && <div className="banner error" role="alert">{error}</div>}
            </>
          )}

          <footer className="notification-dialog-actions">
            {delivery ? (
              <button type="button" className="btn notification-done" onClick={onClose} autoFocus>
                Done
              </button>
            ) : (
              <>
                <button type="button" className="btn" onClick={onClose} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={busy || !title.trim() || !body.trim()}
                >
                  {busy ? 'Sending…' : 'Send to app users'}
                </button>
              </>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
}
