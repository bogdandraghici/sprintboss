// src/components/FighterBar.jsx
// A roster strip above the dock: one thumbnail per fighter. Clicking focuses
// that fighter, filtering the whole command deck (dock, HP bar, scene, ticker).
// Presentation lens only — drives the same setFocus the arena uses; clearing
// stays via Esc / empty-space click in the arena.
import Avatar from './Avatar';
import { firstName } from '../lib';

export default function FighterBar({ party = [], focus = null, onFocus = () => {} }) {
  if (party.length === 0) return null;
  return (
    <div className="fighter-bar" role="toolbar" aria-label="Fighters">
      {party.map((f) => {
        const active = focus === f.name;
        const dimmed = focus && !active;
        return (
          <button
            key={f.name}
            type="button"
            className="fighter-chip"
            data-active={active}
            data-dimmed={dimmed}
            aria-current={active || undefined}
            title={f.name}
            onClick={() => onFocus(f.name)}
          >
            <Avatar name={f.name} src={f.avatar} size="2.4rem" />
            <span className="fighter-chip-name">{firstName(f.name)}</span>
          </button>
        );
      })}
    </div>
  );
}
