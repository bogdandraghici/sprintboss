// src/raid/Debris.jsx
// Afterglow on the battlefield: one planted sword per recent kill, fading over
// ~24h (heat from heat.js/debris). A glance separates a busy day from a quiet one.
import { useMemo } from 'react';
import { sheetTexture } from './sprites/textures';
import { hueOf } from '../lib';

const SWORD = ['..L', '.LL', '..L', '.WW', '..W'];
const PAL = { L: '#bfefff', W: '#6b5b4a' };
const PX = 0.06;
const CAP = 20; // newest kills only — a memento field, not a graveyard

export default function Debris({ kills }) {
  const entry = useMemo(() => sheetTexture('debris-sword', [SWORD], PAL), []);
  return (
    <group>
      {kills.slice(-CAP).map((k) => {
        const h = hueOf(k.key);
        const x = -3.6 + ((h % 23) / 23) * 5.4; // scattered between party and boss
        const z = 0.9 + ((h % 11) / 11) * 1.4;  // in front of the action line
        return (
          <mesh key={`${k.key}-${k.ts}`} position={[x, 0.16, z]} rotation={[0, 0, ((h % 5) - 2) * 0.07]}>
            <planeGeometry args={[3 * PX, 5 * PX]} />
            <meshBasicMaterial
              map={entry.tex} transparent alphaTest={0.1} toneMapped={false}
              opacity={0.25 + 0.6 * k.heat} depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
