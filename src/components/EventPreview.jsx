import { useEffect, useState } from 'react';
import { normalizeImageUrl } from '../utils';

/** Mirrors the card on the mobile app's Events screen so admins see what users will see. */
export default function EventPreview({ form }) {
  const [imgFailed, setImgFailed] = useState(false);
  const image = normalizeImageUrl(form.image_url);
  useEffect(() => setImgFailed(false), [image]);

  const d = form.starts_at ? new Date(form.starts_at) : null;
  const valid = d && !Number.isNaN(d.getTime());
  const date = valid ? d.toLocaleDateString() : 'Date';
  const time = valid ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time';
  const showImage = image && !imgFailed;

  return (
    <div className="phone" aria-label="Preview of the mobile app event card">
      <div className="phone-bar">Events</div>
      <div className="phone-card">
        {showImage ? (
          <div className="pc-image">
            <img src={image} alt="" onError={() => setImgFailed(true)} />
            <span className="pc-badge">{form.category || 'Webinar'}</span>
          </div>
        ) : (
          <div className="pc-fallback">
            <span className="pc-badge pc-badge-static">{form.category || 'Webinar'}</span>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
              <path d="M8.5 12l2.5 2.5L15.5 10" />
            </svg>
          </div>
        )}
        <div className="pc-body">
          <h4>{form.title || 'Event title'}</h4>
          <div className="pc-meta">
            <span>{date}</span>
            <i />
            <span>{time}</span>
          </div>
          <div className="pc-venue">{form.location || 'Venue'}</div>
          <p>{form.description || 'The description appears here, trimmed to three lines until the user taps Read more.'}</p>
        </div>
      </div>
    </div>
  );
}