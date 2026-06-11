// Usage: node scripts/render-class.mjs sword [poseIndex]
// Renders a class file's poses as ASCII for eyeballing proportions.
const cls = process.argv[2] ?? 'sword';
const only = process.argv[3] != null ? Number(process.argv[3]) : null;
const { default: c } = await import(`../src/raid/sprites/classes/${cls}.js`);
const NAMES = ['IDLE_A', 'IDLE_B', 'ATTACK_A', 'ATTACK_B', 'KNEEL', 'DOWN'];
c.poses.forEach((f, i) => {
  if (only != null && i !== only) return;
  console.log(`\n=== ${cls} / ${NAMES[i]} ===`);
  f.forEach((r) => console.log(r.replace(/\./g, ' ')));
});
