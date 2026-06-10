// src/raid/Effects.jsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export default function Effects() {
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.35} intensity={1.05} mipmapBlur />
      <Vignette darkness={0.45} eskil={false} />
    </EffectComposer>
  );
}
