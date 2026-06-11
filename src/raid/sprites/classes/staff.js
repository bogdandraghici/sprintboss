// src/raid/sprites/classes/staff.js
// Robed caster, 20×28, gem staff drawn in. Pure data — no imports (node-loadable).
// Chars: K outline, S skin, H hair, A robe, B dark trim/hem, P pants (unused), W staff shaft, L metal (unused), G gem glow.
// No legs: the robe widens from the waist to a flat B-hemmed base on the floor —
// the only skirt-shaped lower half on the roster, so it reads "caster" at a glance.
// Fighters face RIGHT. Staff is planted at the right side, gem at head height.
// headAnchors target the visual face centre, not the headBox geometric centre (sword.js does the same).

const IDLE_A = [
  '.......KKKKK........',
  '......KHHHHHK.KKKK..',
  '......KHHHHHK.KGGK..',
  '......KHSSSHK.KGGK..',
  '......KSKSKSK.KKKK..',
  '......KSSSSSK..KWK..',
  '.......KSSSK...KWK..',
  '........KSK....KWK..',
  '.....KAAAAAAK..KWK..',
  '....KAKAAAAKAK.KWK..',
  '....KAKAAAAKAK.KWK..',
  '....KAKAAAAKAAASSK..',
  '....KSKAAAAK...KWK..',
  '.....KBBBBBK...KWK..',
  '.....KAAAAAK...KWK..',
  '.....KAAAAAK...KWK..',
  '....KAAAAAAAK..KWK..',
  '....KAAAAAAAK..KWK..',
  '...KAAAAAAAAAK.KWK..',
  '...KAAAAAAAAAK.KWK..',
  '...KAAAAAAAAAK.KWK..',
  '..KAAAAAAAAAAAKKWK..',
  '..KAAAAAAAAAAAKKWK..',
  '..KAAAAAAAAAAAKKWK..',
  '..KAAAAAAAAAAAKKWK..',
  '..KBBBBBBBBBBBKKWK..',
  '..KBBBBBBBBBBBKKWK..',
  '..KKKKKKKKKKKKKKKK..',
];

// Breathing: the staff gem glints — glow spills up through the top cap.
const IDLE_B_EDITS = {
  1: '......KHHHHHK.KGGK..',
};
const IDLE_B = IDLE_A.map((r, y) => IDLE_B_EDITS[y] ?? r);

// Wind-up: staff hauled overhead, bottom off the floor, gem flaring 1px each side.
const ATTACK_A = [
  '.............KGGGGK.',
  '.............KGGGGK.',
  '.......KKKKK..KGGK..',
  '......KHHHHHK..KWK..',
  '......KHHHHHK..KWK..',
  '......KHSSSHK..KWK..',
  '......KSKSKSK.KSSK..',
  '......KSSSSSKKAKWK..',
  '.......KSSSK.KAKWK..',
  '........KSK.KAAKWK..',
  '.....KAAAAAAKAAKWK..',
  '....KAKAAAAK...KWK..',
  '....KAKAAAAK...KWK..',
  '....KSKAAAAK...KWK..',
  '.....KBBBBBK...KWK..',
  '.....KAAAAAK...KWK..',
  '....KAAAAAAAK..KWK..',
  '....KAAAAAAAK.......',
  '...KAAAAAAAAAK......',
  '...KAAAAAAAAAK......',
  '...KAAAAAAAAAK......',
  '..KAAAAAAAAAAAK.....',
  '..KAAAAAAAAAAAK.....',
  '..KAAAAAAAAAAAK.....',
  '..KAAAAAAAAAAAK.....',
  '..KBBBBBBBBBBBK.....',
  '..KBBBBBBBBBBBK.....',
  '..KKKKKKKKKKKKK.....',
];

// Cast: staff thrust horizontal at the boss, gem leading, robe streaming back-left.
const ATTACK_B = [
  '....................',
  '....................',
  '.....KKKKK..........',
  '....KHHHHHK.........',
  '....KHHHHHK.........',
  '....KHSSSHK.........',
  '....KSKSKSK.........',
  '....KSSSSSK.........',
  '.....KSSSK..........',
  '......KSK...........',
  '...KAAAAAAK.....KGGK',
  '...KAAAAAASSWWWWKGGK',
  '...KAAAAAAK.........',
  '...KBBBBBBK.........',
  '...KAAAAAAK.........',
  '..KAAAAAAAK.........',
  '..KAAAAAAAK.........',
  '.KAAAAAAAAK.........',
  '.KAAAAAAAK..........',
  'KAAAAAAAAK..........',
  'KAAAAAAAAK..........',
  'KAAAAAAAK...........',
  'KAAAAAAAK...........',
  'KAAAAAAAK...........',
  'KAAAAAAAK...........',
  'KBBBBBBBK...........',
  'KBBBBBBBK...........',
  'KKKKKKKKK...........',
];

// Exhausted: slumped low, head bowed to the shoulders, staff still planted, robe pooling wide.
const KNEEL = [
  '....................',
  '..............KKKK..',
  '..............KGGK..',
  '..............KGGK..',
  '..............KKKK..',
  '...............KWK..',
  '...............KWK..',
  '.......KKKKK...KWK..',
  '......KHHHHHK..KWK..',
  '......KHHHHHK..KWK..',
  '......KHSSSHK..KWK..',
  '......KSKSKSK..KWK..',
  '......KSSSSSK..KWK..',
  '.......KSSSK...KWK..',
  '.....KAAAAAAKAASSK..',
  '....KAKAAAAK...KWK..',
  '....KSKAAAAK...KWK..',
  '.....KBBBBBK...KWK..',
  '....KAAAAAAAK..KWK..',
  '...KAAAAAAAAAK.KWK..',
  '...KAAAAAAAAAK.KWK..',
  '..KAAAAAAAAAAAKKWK..',
  '..KAAAAAAAAAAAKKWK..',
  '.KAAAAAAAAAAAAAKWK..',
  '.KAAAAAAAAAAAAAKWK..',
  '.KBBBBBBBBBBBBBKWK..',
  '.KBBBBBBBBBBBBBKWK..',
  '.KKKKKKKKKKKKKKKKK..',
];

// Knocked down: flat on the back, staff lying above, gem still glowing.
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
  '..KKKK..............',
  '..KGGKWWWWWWWWW.....',
  '..KKKK..............',
  '....................',
  '....KKKKK...........',
  '...KHHHHHKKKKKKKKK..',
  '..KHHHHHHKAAAAAAABK.',
  '..KHSSSSHKAAAAAABBBK',
  '..KSSKSSHKAAAAAABBBK',
  '..KHSSSSHKAAAAAABBK.',
  '...KKKKKKKKKKKKKKK..',
  '....................',
];

export default {
  poses: [IDLE_A, IDLE_B, ATTACK_A, ATTACK_B, KNEEL, DOWN],
  // Erase-box per pose for the avatar-headed variant (pixel coords, inclusive).
  headBoxes: [
    { x0: 5, y0: 0, x1: 13, y1: 7 },
    { x0: 5, y0: 0, x1: 13, y1: 7 },
    { x0: 5, y0: 2, x1: 12, y1: 9 },
    { x0: 3, y0: 2, x1: 11, y1: 9 },
    { x0: 5, y0: 7, x1: 13, y1: 13 },
    { x0: 1, y0: 20, x1: 8, y1: 26 },
  ],
  // [cx, cy] head-centre per pose, 20×28 pixel space.
  headAnchors: [
    [9, 4], [9, 4], [9, 6], [7, 6], [9, 11], [5, 23.5],
  ],
  // Hair overlay top-left per pose; null = no hair on this pose (lying down).
  hairAt: [[5, 0], [5, 0], [5, 2], [3, 2], [5, 7], null],
};
