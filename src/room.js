/**
 * room.js — Three.js classroom environment
 * Procedural low-poly geometry, flat-shaded materials, lighting.
 */

import * as THREE from 'three';

// ─── Palette ───────────────────────────────────────────────
const C = {
  floor:       0x3a3228,
  wall:        0xd4c9b8,
  ceiling:     0xe8e0d0,
  blackboard:  0x1a2e1a,
  chalk:       0xf5f0e8,
  desk:        0x8b6914,
  deskTop:     0xc4a44a,
  metal:       0x8899aa,
  window:      0x87ceeb,
  windowFrame: 0x9ab0c8,
  locker:      0x5577aa,
  lockerDark:  0x3d5a80,
  rug:         0x8b4513,
  board_frame: 0x4a3728,
};

function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
}

/**
 * Build the entire classroom scene.
 * @param {THREE.Scene} scene
 * @returns {{ interactables: THREE.Object3D[] }}
 */
export let blackboardPlane = null;

export function buildRoom(scene) {
  const interactables = [];

  // ─── Room dimensions ───────────────────────────────────────
  const W = 16, H = 5, D = 14;

  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.2, D),
    mat(C.floor)
  );
  floor.position.set(0, -0.1, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Rug runner (center aisle)
  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.05, D - 1),
    mat(C.rug)
  );
  rug.position.set(0, 0.02, 0.5);
  scene.add(rug);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.2, D),
    mat(C.ceiling)
  );
  ceiling.position.set(0, H, 0);
  scene.add(ceiling);

  // ─── Walls ────────────────────────────────────────────────

  // Front wall (blackboard side, -Z)
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, 0.25),
    mat(C.wall)
  );
  frontWall.position.set(0, H / 2, -D / 2);
  scene.add(frontWall);

  // Back wall (+Z)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, 0.25),
    mat(C.wall)
  );
  backWall.position.set(0, H / 2, D / 2);
  scene.add(backWall);

  // Left wall (-X)
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, H, D),
    mat(C.wall)
  );
  leftWall.position.set(-W / 2, H / 2, 0);
  scene.add(leftWall);

  // Right wall (+X)
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, H, D),
    mat(C.wall)
  );
  rightWall.position.set(W / 2, H / 2, 0);
  scene.add(rightWall);

  // ─── Windows (left wall) ──────────────────────────────────
  const windowPositions = [-3, 1, 5];
  windowPositions.forEach(z => {
    // Frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 2.2, 1.8),
      mat(C.windowFrame)
    );
    frame.position.set(-W / 2, 2.5, z);
    scene.add(frame);

    // Glass
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 1.8, 1.4),
      new THREE.MeshLambertMaterial({ color: C.window, transparent: true, opacity: 0.35, flatShading: true })
    );
    glass.position.set(-W / 2, 2.5, z);
    scene.add(glass);

    // Light shaft
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.8, 1.4),
      new THREE.MeshLambertMaterial({ color: 0xfff8e7, transparent: true, opacity: 0.04, flatShading: true })
    );
    shaft.position.set(-W / 2 + 1.5, 2.5, z);
    scene.add(shaft);
  });

  // ─── Blackboard ────────────────────────────────────────────
  const boardGroup = new THREE.Group();
  boardGroup.name = 'blackboard';

  const boardFrame = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 2.8, 0.15),
    mat(C.board_frame)
  );
  boardFrame.position.set(0, 0, 0);
  boardGroup.add(boardFrame);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(8, 2.4, 0.18),
    mat(C.blackboard)
  );
  board.position.set(0, 0, 0.02);
  board.name = 'board_surface';
  boardGroup.add(board);

  // Image Plane
  blackboardPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 2.2),
    new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, flatShading: true })
  );
  blackboardPlane.position.set(0, 0, 0.115); // slightly in front of the board
  boardGroup.add(blackboardPlane);

  // Chalk ledge
  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 0.12, 0.3),
    mat(C.board_frame)
  );
  ledge.position.set(0, -1.3, 0.1);
  boardGroup.add(ledge);

  // Chalk pieces
  [-1.5, 0.2, 1.8].forEach((x, i) => {
    const chalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6),
      mat([0xffffff, 0xffff99, 0xff9999][i])
    );
    chalk.rotation.z = Math.PI / 2;
    chalk.position.set(x, -1.28, 0.25);
    boardGroup.add(chalk);
  });

  boardGroup.position.set(0, 2.6, -D / 2 + 0.2);
  scene.add(boardGroup);
  interactables.push(board);
  board.userData = { type: 'blackboard' };

  // ─── Teacher's desk ────────────────────────────────────────
  const teacherDesk = buildDesk(1.8, 0.9, scene, 0, 0, -D / 2 + 2.5);
  teacherDesk.name = 'teacher_desk';
  teacherDesk.userData = { type: 'teacher_desk' };
  interactables.push(teacherDesk);

  // ─── Student desks (3×4 grid) ──────────────────────────────
  const deskNames = [
    ['_player', 'Arjun', 'Zoe'],
    ['Raj', 'Lena', 'Dev'],
    ['Sofia', 'Kai', 'Priya'],
    ['_empty1', '_empty2', '_empty3'],
  ];

  const startX = -3, startZ = -1;
  const gapX = 3, gapZ = 2.8;

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const dx = startX + col * gapX;
      const dz = startZ + row * gapZ;
      const deskMesh = buildDesk(1.0, 0.75, scene, dx, 0, dz);
      const name = deskNames[row][col];
      deskMesh.name = `desk_${name}`;
      deskMesh.userData = { type: name === '_player' ? 'player_desk' : 'student_desk', studentName: name };
      if (name === '_player') interactables.push(deskMesh);
    }
  }

  // ─── Lockers (back wall) ───────────────────────────────────
  const lockerX = [-6, -3.6, -1.2, 1.2, 3.6, 6];
  lockerX.forEach(x => {
    const lockerGroup = buildLocker(x, D / 2 - 0.25);
    scene.add(lockerGroup);
    const front = lockerGroup.children.find(c => c.name === 'locker_door');
    if (front) {
      front.userData = { type: 'locker' };
      interactables.push(front);
    }
  });

  // ─── Ceiling light fixtures ────────────────────────────────
  [[-4, -3], [0, -3], [4, -3], [-4, 3], [0, 3], [4, 3]].forEach(([x, z]) => {
    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.35),
      mat(0xf0f0e0)
    );
    fixture.position.set(x, H - 0.14, z);
    scene.add(fixture);
  });

  // ─── Teacher's podium ──────────────────────────────────────
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.0, 0.5),
    mat(C.desk)
  );
  podium.position.set(-1.4, 0.5, -D / 2 + 1.5);
  scene.add(podium);

  return { interactables };
}

const textureLoader = new THREE.TextureLoader();

/**
 * Load and display an image on the blackboard.
 */
export function setBlackboardImage(url) {
  if (!blackboardPlane) return;
  if (!url) {
    blackboardPlane.material.opacity = 0;
    return;
  }
  textureLoader.load(url, (tex) => {
    // Prevent aspect ratio distortion
    tex.colorSpace = THREE.SRGBColorSpace;
    blackboardPlane.material.map = tex;
    blackboardPlane.material.color.setHex(0xffffff); // reset color to white
    blackboardPlane.material.opacity = 0.8; // blend with blackboard slightly
    blackboardPlane.material.needsUpdate = true;
  });
}

/**
 * Build a desk group (top + 4 legs).
 */
function buildDesk(w, h, scene, x, y, z) {
  const group = new THREE.Group();

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.06, 0.7),
    mat(C.deskTop)
  );
  top.position.set(0, h, 0);
  group.add(top);

  const legPositions = [
    [-w / 2 + 0.06, 0, -0.28], [w / 2 - 0.06, 0, -0.28],
    [-w / 2 + 0.06, 0, 0.28],  [w / 2 - 0.06, 0, 0.28],
  ];
  legPositions.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, h, 0.06),
      mat(C.metal)
    );
    leg.position.set(lx, h / 2, lz);
    group.add(leg);
  });

  group.position.set(x, y, z);
  scene.add(group);
  return group;
}

/**
 * Build a locker group.
 */
function buildLocker(x, z) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 2.2, 0.5),
    mat(C.lockerDark)
  );
  body.position.set(0, 1.1, 0);
  group.add(body);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.0, 0.08),
    mat(C.locker)
  );
  door.position.set(0, 1.1, 0.25);
  door.name = 'locker_door';
  group.add(door);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.25, 0.08),
    mat(C.metal)
  );
  handle.position.set(0.65, 1.1, 0.32);
  group.add(handle);

  group.position.set(x, 0, z);
  return group;
}

/**
 * Set up scene lighting.
 */
export function setupLighting(scene) {
  // Ambient (warm base)
  const ambient = new THREE.AmbientLight(0xfff5e0, 0.55);
  scene.add(ambient);

  // Main directional (from window side)
  const sun = new THREE.DirectionalLight(0xfff8dc, 1.1);
  sun.position.set(-8, 8, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 30;
  scene.add(sun);

  // Fill light (from right)
  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.4);
  fill.position.set(8, 5, 4);
  scene.add(fill);

  // Ceiling light points
  [[-4, 4.6, -3], [0, 4.6, -3], [4, 4.6, -3],
   [-4, 4.6, 3],  [0, 4.6, 3],  [4, 4.6, 3]].forEach(([x, y, z]) => {
    const pt = new THREE.PointLight(0xfffde7, 0.5, 9);
    pt.position.set(x, y, z);
    scene.add(pt);
  });
}
