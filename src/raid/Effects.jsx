// src/raid/Effects.jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, HueSaturation,
} from '@react-three/postprocessing';
import { freezeLeft } from './timeBus';

// enraged: red-shifted grade. tableau 'defeat': desaturated. lite: no post at all.
export default function Effects({ enraged = false, tableau = null, lite = false }) {
  const ca = useRef();
  useFrame(() => {
    // One-beat chromatic pulse riding the hit-stop, decays with it.
    if (ca.current) {
      const k = Math.min(0.004, freezeLeft() * 0.03);
      ca.current.offset.set(k, k * 0.6);
    }
  });
  if (lite) return null;
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.35} intensity={1.15} mipmapBlur />
      <Noise opacity={0.045} />
      <HueSaturation saturation={tableau === 'defeat' ? -0.55 : enraged ? 0.12 : 0} />
      <ChromaticAberration ref={ca} />
      <Vignette darkness={0.5} eskil={false} />
    </EffectComposer>
  );
}
