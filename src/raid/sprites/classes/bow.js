// src/raid/sprites/classes/bow.js
// Lean, tall archer, 20×28, longbow drawn in. Pure data — no imports (node-loadable).
// Chars: K outline, S skin, H hair, A armor, B dark, P pants, W wood, L string/arrow, G gem.
// Narrow shoulders, long thin legs, head at row 0 — reads "ranger" next to the knight/heavy.
// A B quiver strap runs diagonally across the torso. Fighters face RIGHT.
// headAnchors target the visual face centre, not the headBox geometric centre (sword.js does the same).

const IDLE_A = [
  '.......KKKKK........',
  '......KHHHHHK.......',
  '......KHHHHHK.......',
  '......KHSSSHK.......',
  '......KSKSKSK.......',
  '......KSSSSSK.......',
  '.......KSSSK........',
  '........KSK....KK...',
  '.....KAAAAAAK..LWK..',
  '....KAKAAABAKAKLWK..',
  '....KAKAABAAKAKLWK..',
  '....KAKABAGAKAKLWK..',
  '....KSKBAAAAKAASSK..',
  '.....KKBBBBBKK.LWK..',
  '......KAAAAAK..LWK..',
  '......KAAAAAK..LWK..',
  '......KPPKPPK..LWK..',
  '......KPK.KPK..LWK..',
  '......KPK.KPK..LWK..',
  '......KPK.KPK..LWK..',
  '......KPK.KPK..LWK..',
  '......KPK.KPK..KK...',
  '......KPK.KPK.......',
  '......KPK.KPK.......',
  '......KPK.KPK.......',
  '.....KKPK.KPKK......',
  '.....KBBK.KBBK......',
  '....KKBBK.KBBKK.....',
];

// Breathing: chest gem glints a row higher.
const IDLE_B_EDITS = {
  10: '....KAKAABGAKAKLWK..',
  11: '....KAKABAAAKAKLWK..',
};
const IDLE_B = IDLE_A.map((r, y) => IDLE_B_EDITS[y] ?? r);

// Wind-up: bow thrust at the boss, string drawn back to the cheek, arrow nocked.
const ATTACK_A = [
  '....KKKKK...........',
  '...KHHHHHK..........',
  '...KHHHHHK..........',
  '...KHSSSHK..........',
  '...KSKSKSK......KK..',
  '...KSSSSSK.....L.WK.',
  '....KSSSK.....L..WK.',
  '.....KSK.....L....WK',
  '....KAAAAAK.L.....WK',
  '....KAAAKSSLLLLLLLWK',
  '....KAAABAKL......WK',
  '....KAABAAKAAAAASSWK',
  '....KABAAAK..L....WK',
  '....KKBBBKK...L...WK',
  '.....KAAAK.....L.WK.',
  '.....KPPPK.....L.WK.',
  '....KPPKPPK.....KK..',
  '....KPK..KPK........',
  '...KPK....KPK.......',
  '...KPK....KPK.......',
  '..KPK......KPK......',
  '..KPK......KPK......',
  '..KPK......KPK......',
  '..KPK......KPK......',
  '..KPK......KPK......',
  '.KKPK......KPKK.....',
  '.KBBK......KBBK.....',
  'KKBBK......KBBKK....',
];

// Loose: arrow gone, string snapped straight, bow arm fully extended right.
const ATTACK_B = [
  '....KKKKK...........',
  '...KHHHHHK..........',
  '...KHHHHHK..........',
  '...KHSSSHK..........',
  '...KSKSKSK......KK..',
  '...KSSSSSK......LWK.',
  '....KSSSK.......LWK.',
  '.....KSK........L.WK',
  '....KAAAAAK.....L.WK',
  '....KAAAKSK.....L.WK',
  '....KAAABAKAAAAAASWK',
  '....KAABAAK.....L.WK',
  '....KABAAAK.....L.WK',
  '....KKBBBKK.....L.WK',
  '.....KAAAK......LWK.',
  '.....KPPPK......LWK.',
  '....KPPKPPK.....KK..',
  '....KPK..KPK........',
  '...KPK....KPK.......',
  '...KPK....KPK.......',
  '..KPK......KPK......',
  '..KPK......KPK......',
  '..KPK......KPK......',
  '..KPK......KPK......',
  '..KPK......KPK......',
  '.KKPK......KPKK.....',
  '.KBBK......KBBK.....',
  'KKBBK......KBBKK....',
];

// Exhausted: down on one knee, bow planted upright like a staff.
const KNEEL = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '.......KKKKK...KK...',
  '......KHHHHHK..LWK..',
  '......KHHHHHK..LWK..',
  '......KHSSSHK..LWK..',
  '......KSKSKSK..LWK..',
  '......KSSSSSK..LWK..',
  '.......KSSSK...LWK..',
  '........KSK....LWK..',
  '.....KAAAAAAKAASSK..',
  '....KAKAABAAK..LWK..',
  '....KAKABAGAK..LWK..',
  '....KSKBAAAAK..LWK..',
  '.....KKBBBBK...LWK..',
  '......KAAAAK...LWK..',
  '.....KPPPPPPK..LWK..',
  '.....KPK..KPPK.LWK..',
  '....KPK...KPPK.LWK..',
  '....KPK...KPK..LWK..',
  '....KPK...KPK..LWK..',
  '...KPPK...KPK..LWK..',
  '...KBBKK..KPK..LWK..',
  '..KBBBBK..KBBK.KK...',
  '....................',
];

// Knocked down: flat on the back, bow dropped above him (arc + slack string).
const DOWN = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '...KWWWWWWWWWK......',
  '...K.LLLLLLL.K......',
  '....................',
  '...KKKKK............',
  '..KHHHHHKKKKKKKKKK..',
  '.KHHHHHHKAABAAAAABK.',
  '.KHSSSSHKAAABAAAABPK',
  '.KSSKSSKSKAAAGAABPPK',
  '.KHSSSSHKAAAAAAABPK.',
  '..KKKKKKKKKKKKKKKK..',
  '....................',
];

export default {
  poses: [IDLE_A, IDLE_B, ATTACK_A, ATTACK_B, KNEEL, DOWN],
  // Erase-box per pose for the avatar-headed variant (pixel coords, inclusive).
  headBoxes: [
    { x0: 5, y0: 0, x1: 13, y1: 7 },
    { x0: 5, y0: 0, x1: 13, y1: 7 },
    { x0: 2, y0: 0, x1: 10, y1: 7 },
    { x0: 2, y0: 0, x1: 10, y1: 7 },
    { x0: 5, y0: 5, x1: 13, y1: 12 },
    { x0: 0, y0: 20, x1: 9, y1: 26 },
  ],
  // [cx, cy] head-centre per pose, 20×28 pixel space.
  headAnchors: [
    [9, 4], [9, 4], [6, 4], [6, 4], [9, 9], [5, 23.5],
  ],
  // Hair overlay top-left per pose; null = no hair on this pose (lying down).
  hairAt: [[5, 0], [5, 0], [2, 0], [2, 0], [5, 5], null],
};
