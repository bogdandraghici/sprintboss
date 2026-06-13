import { useState } from 'react';
import { initials, hueOf } from '../lib';

// Photo thumbnail when a URL is available and loads; initials otherwise.
// tip: overrides the tooltip text. Pass null to suppress it entirely; omit to
// use the default name tip.
export default function Avatar({ name, src, size = '2rem', tip = undefined }) {
  const [broken, setBroken] = useState(false);
  const dim = size ? { width: size, height: size } : null;
  const tipText = tip === undefined ? (name || 'Unassigned') : tip;

  if (src && !broken) {
    return (
      <img
        className="avatar"
        src={src}
        alt={name || 'Unassigned'}
        data-tip={tipText || undefined}
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
      data-tip={tipText || undefined}
      style={{
        background: name ? `hsl(${hueOf(name)} 45% 42%)` : 'var(--steel-3)',
        ...(size ? { ...dim, fontSize: `calc(${size} * 0.42)` } : null),
      }}
    >
      {initials(name)}
    </span>
  );
}
