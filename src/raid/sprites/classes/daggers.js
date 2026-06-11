// src/raid/sprites/classes/daggers.js
// Small hooded rogue, 20×28, twin daggers drawn in. Pure data — no imports (node-loadable).
// Chars: K outline, S skin, A armor, B dark hood/boots, P pants, W grip, L blade, G gem.
// Smallest silhouette on the roster: ~22 rows standing (head from row 6), knees always bent.
// The head is wrapped in a pointed B hood — only the face shows; hairAt is null on EVERY pose
// (hair never composes onto this class; the hood erases with the head via the head box).
// Fighters face RIGHT. Daggers are short: ~3px L blades on W grips.
// headAnchors target the visual face centre, not the headBox geometric centre (sword.js does the same).

const IDLE_A = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '........KK..........',
  '.......KBBK.........',
  '......KBBBBK........',
  '.....KBBBBBBK.......',
  '.....KBSSSSBK.......',
  '.....KBSKSKBK.......',
  '.....KBSSSSBK.......',
  '......KBBBBK........',
  '.....KAAAAAAK.......',
  '....KAKAAAAKAK......',
  '....KSKAGAAKSK......',
  '....KWKBBBBKWK......',
  '....KLKAAAAKLK......',
  '....KLKPPPPKLK......',
  '....KLKPKKPKLK......',
  '......KPK.KPK.......',
  '.....KPK...KPK......',
  '.....KPK...KPK......',
  '.....KPK...KPK......',
  '....KKPK...KPKK.....',
  '....KBBK...KBBK.....',
  '...KKBBK...KBBKK....',
];

// Breathing: the hood point dips one row.
const IDLE_B_EDITS = {
  6: '....................',
  7: '........KK..........',
};
const IDLE_B = IDLE_A.map((r, y) => IDLE_B_EDITS[y] ?? r);

// Wind-up: coiled into a deep crouch, daggers crossed in an X in front of the chest.
const ATTACK_A = [
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
  '.......KK...........',
  '......KBBK..........',
  '.....KBBBBK.........',
  '....KBBBBBBK........',
  '....KBSSSSBK........',
  '....KBSKSKBK.L...L..',
  '....KBSSSSBK..L.L...',
  '.....KBBBBK....L....',
  '....KAAAAAAK..W.W...',
  '...KAKAAAAKAASSSK...',
  '....KABBBBAK........',
  '..KKPPPPPPPPKK......',
  '..KPPK....KPPK......',
  '..KPPK....KPPK......',
  '..KPPK....KPPK......',
  '.KKPPK....KPPKK.....',
  '.KBBBK....KBBBK.....',
  '.KBBBK....KBBBK.....',
];

// Strike: lunging right, both daggers thrust forward parallel, blades stacked.
const ATTACK_B = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '......KK............',
  '.....KBBK...........',
  '....KBBBBK..........',
  '...KBBBBBBK.........',
  '...KBSSSSBK.........',
  '...KBSKSKBK.........',
  '...KBSSSSBK.........',
  '....KBBBBK..........',
  '...KAAAAAKSSWLLLL...',
  '...KAAGAAAK.........',
  '...KAAAAAKSSWLLLL...',
  '...KBBBBBBK.........',
  '...KPPKKPPK.........',
  '..KPPK..KPPK........',
  '..KPK....KPPK.......',
  '.KPK......KPPK......',
  '.KPK.......KPK......',
  '.KPK.......KPK......',
  'KKBBK......KBBKK....',
  'KBBBK......KBBBK....',
];

// Exhausted: back knee on the ground, daggers sheathed — hands hang empty.
const KNEEL = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '........KK..........',
  '.......KBBK.........',
  '......KBBBBK........',
  '.....KBBBBBBK.......',
  '.....KBSSSSBK.......',
  '.....KBSKSKBK.......',
  '.....KBSSSSBK.......',
  '......KBBBBK........',
  '.....KAAAAAAK.......',
  '....KAKAAAAKAK......',
  '....KSKAGAAKSK......',
  '.....KBBBBBBK.......',
  '.....KPPPPPPK.......',
  '.....KPK..KPPK......',
  '....KPK....KPK......',
  '....KPK....KPK......',
  '...KPPK....KPK......',
  '...KBBKK...KBBK.....',
  '....................',
];

// Knocked down: flat on the back, one dagger dropped above him.
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
  '....................',
  '...LLLW.............',
  '....................',
  '....KKKK............',
  '...KBBBBKKKKKKKK....',
  '..KBBBBBKAAAAAABK...',
  '.KKBSSSBKAAGAAABPK..',
  '..KBSKSBKAAAAABPPK..',
  '..KBSSSBKAAAAAABK...',
  '...KKKKKKKKKKKKKKK..',
  '....................',
];

export default {
  poses: [IDLE_A, IDLE_B, ATTACK_A, ATTACK_B, KNEEL, DOWN],
  // Erase-box per pose for the avatar-headed variant (pixel coords, inclusive).
  // Boxes cover the FULL hood (it erases with the head), never the daggers.
  headBoxes: [
    { x0: 5, y0: 6, x1: 12, y1: 13 },
    { x0: 5, y0: 6, x1: 12, y1: 13 },
    { x0: 4, y0: 10, x1: 11, y1: 17 },
    { x0: 3, y0: 8, x1: 10, y1: 15 },
    { x0: 5, y0: 9, x1: 12, y1: 16 },
    { x0: 1, y0: 20, x1: 8, y1: 26 },
  ],
  // [cx, cy] head-centre per pose, 20×28 pixel space.
  headAnchors: [
    [8.5, 11], [8.5, 11], [7.5, 15], [6.5, 13], [8.5, 14], [5, 24],
  ],
  // Hair never composes onto this class — the hood replaces it on every pose.
  hairAt: [null, null, null, null, null, null],
};
