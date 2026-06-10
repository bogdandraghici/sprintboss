// src/raid/FloatNum.jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

export default function FloatNum({ item, onDone }) {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current > 1.3) return onDone(item.id);
    ref.current.position.y = item.y + t.current * 1.1;
    ref.current.fillOpacity = Math.max(0, 1 - t.current / 1.3);
  });
  return (
    <Text ref={ref} position={[item.x, item.y, 1.2]} fontSize={0.42} color={item.color}
      anchorX="center" outlineWidth={0.02} outlineColor="#0d1016">
      {item.text}
    </Text>
  );
}
