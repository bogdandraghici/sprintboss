import { useState } from 'react';
import { initials, hueOf } from '../lib';

// Photo thumbnail when a URL is available and loads; initials otherwise.
export default function Avatar({ name, src, size }) {
  const [broken, setBroken] = useState(false);
  const dim = size ? { width: size, height: size } : null;

  if (src && !broken) {
    return (
      <img
        className="avatar"
        src={src}
        alt={name || 'Unassigned'}
        title={name || 'Unassigned'}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        style={dim}
      />
    );
  }
  return (
    <span
      className="avatar"
      title={name || 'Unassigned'}
      style={{
        background: name ? `hsl(${hueOf(name)} 45% 42%)` : 'var(--steel-3)',
        ...(size ? { ...dim, fontSize: `calc(${size} * 0.42)` } : null),
      }}
    >
      {initials(name)}
    </span>
  );
}
