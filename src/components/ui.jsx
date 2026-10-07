import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, message, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Confirm dialog ---------- */
export function ConfirmDialog({ title, body, confirmLabel, danger, busy, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return (
    <div className="overlay center" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
        <h3 id="dlg-title">{title}</h3>
        <p>{body}</p>
        <div className="dialog-actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Row action menu ---------- */
export function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label="More actions" onClick={() => setOpen((o) => !o)}>
        ⋯
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {items.map((it) =>
            it.divider ? (
              <hr key={it.key} />
            ) : (
              <button
                key={it.key}
                role="menuitem"
                className={it.danger ? 'danger-text' : ''}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status }) {
  return <span className={`pill ${status}`}>{status}</span>;
}
