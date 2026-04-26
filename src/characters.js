/**
 * characters.js — Procedural low-poly character system
 * Builds teacher + 8 peer meshes. Drives animation states.
 */

import * as THREE from 'three';

// ─── Peer roster ──────────────────────────────────────────────────────────
export const PEERS = [
  { name: 'Priya',  level: 'topper',    shirtColor: 0x3b82f6, state: 'ENGAGED',    col: 2, row: 2, gender: 'F' },
  { name: 'Arjun',  level: 'average',   shirtColor: 0x22c55e, state: 'ENGAGED',    col: 1, row: 0, gender: 'M' },
  { name: 'Zoe',    level: 'struggling', shirtColor: 0xef4444, state: 'DISTRACTED', col: 2, row: 0, gender: 'F' },
  { name: 'Raj',    level: 'topper',    shirtColor: 0x3b82f6, state: 'ENGAGED',    col: 0, row: 1, gender: 'M' },
  { name: 'Lena',   level: 'average',   shirtColor: 0xeab308, state: 'ENGAGED',    col: 1, row: 1, gender: 'F' },
  { name: 'Dev',    level: 'struggling', shirtColor: 0xef4444, state: 'SLEEPING',   col: 2, row: 1, gender: 'M' },
  { name: 'Sofia',  level: 'average',   shirtColor: 0xf97316, state: 'ENGAGED',    col: 0, row: 2, gender: 'F' },
  { name: 'Kai',    level: 'average',   shirtColor: 0xa855f7, state: 'DISTRACTED', col: 1, row: 2, gender: 'M' },
];

// Desk grid origin (must match room.js)
const DESK_START_X = -3;
const DESK_START_Z = -1;
const DESK_GAP_X = 3;
const DESK_GAP_Z = 2.8;

// Colors
const SKIN  = 0xfcd5ae;
const HAIR  = [0x1a0a00, 0x3b1f00, 0x8b5e3c, 0x1c1c1c, 0x4a2c0a, 0xd4a017, 0x2b1810, 0x1a1a2e];
const PANTS = 0x1e293b;

/**
 * Build a humanoid character group.
 * Returns the group and refs to animatable parts.
 */
function buildHumanoid(shirtColor, hairColor, scene, x, y, z) {
  const group = new THREE.Group();

  function m(color) { return new THREE.MeshLambertMaterial({ color, flatShading: true }); }

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.2), m(shirtColor));
  torso.position.set(0, 0.95, 0);
  group.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.24), m(SKIN));
  head.position.set(0, 1.32, 0);
  group.add(head);

  // Hair
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.26), m(hairColor));
  hair.position.set(0, 1.47, 0);
  group.add(hair);

  // Left arm
  const leftArm = new THREE.Group();
  const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), m(shirtColor));
  leftArmMesh.position.set(0, -0.175, 0);
  leftArm.add(leftArmMesh);
  leftArm.position.set(-0.22, 1.12, 0);
  group.add(leftArm);

  // Right arm
  const rightArm = new THREE.Group();
  const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), m(shirtColor));
  rightArmMesh.position.set(0, -0.175, 0);
  rightArm.add(rightArmMesh);
  rightArm.position.set(0.22, 1.12, 0);
  group.add(rightArm);

  // Legs
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), m(PANTS));
  leftLeg.position.set(-0.09, 0.57, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), m(PANTS));
  rightLeg.position.set(0.09, 0.57, 0);
  group.add(rightLeg);

  group.position.set(x, y, z);
  scene.add(group);

  return { group, head, leftArm, rightArm, torso };
}

/**
 * Build the teacher character.
 */
export function buildTeacher(scene) {
  // Move teacher to the front of the desk (closer to students) so they are impossible to miss
  const x = 0.5;
  const z = -3.5;

  const { group, head, leftArm, rightArm } = buildHumanoid(0x2d4a7a, 0x2c1810, scene, x, 0.75, z);
  group.name = 'teacher';

  // Suit jacket lapels
  function m(c) { return new THREE.MeshLambertMaterial({ color: c, flatShading: true }); }
  const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.22), m(0x0f2444));
  lapel.position.set(0, 0.95, 0.05);
  group.add(lapel);

  group.rotation.y = Math.PI * 0.08; // slight angle toward class
  group.userData = { type: 'teacher', name: 'Professor Chen' };

  return { group, head, leftArm, rightArm, animState: 'IDLE', animTime: 0 };
}

/**
 * Build all peer student characters.
 */
export function buildPeers(scene) {
  const peers = [];

  PEERS.forEach((p, i) => {
    const x = DESK_START_X + p.col * DESK_GAP_X;
    const z = DESK_START_Z + p.row * DESK_GAP_Z - 0.25; // slightly behind desk

    const { group, head, leftArm, rightArm } = buildHumanoid(
      p.shirtColor,
      HAIR[i % HAIR.length],
      scene,
      x, 0.75, z
    );

    group.name = `peer_${p.name}`;
    group.userData = { type: 'peer', name: p.name, level: p.level };

    // Face the teacher (front of room)
    group.rotation.y = 0;

    peers.push({
      ...p,
      group, head, leftArm, rightArm,
      animState: p.state,
      animTime: Math.random() * Math.PI * 2, // stagger idle animation
    });
  });

  return peers;
}

// ─── Animation ─────────────────────────────────────────────────────────────

/**
 * Apply animations each frame.
 * @param {object} teacher — result of buildTeacher()
 * @param {Array} peers — result of buildPeers()
 * @param {number} t — elapsed time in seconds
 */
export function animateCharacters(teacher, peers, t) {
  animateTeacher(teacher, t);
  peers.forEach(p => animatePeer(p, t));
}

function animateTeacher(tc, t) {
  const { group, head, leftArm, rightArm, animState, animTime } = tc;
  tc.animTime = animTime + 0.016;
  const s = tc.animTime;

  switch (animState) {
    case 'IDLE':
      group.position.y = 0.75 + Math.sin(s * 1.2) * 0.008;
      head.rotation.y = Math.sin(s * 0.5) * 0.08;
      leftArm.rotation.z = 0;
      rightArm.rotation.z = 0;
      break;

    case 'TALKING':
      group.position.y = 0.75 + Math.sin(s * 1.8) * 0.01;
      leftArm.rotation.z  = Math.sin(s * 2.5) * 0.22;
      rightArm.rotation.z = -Math.sin(s * 2.5 + 1) * 0.18;
      leftArm.rotation.x  = Math.sin(s * 1.8) * 0.12;
      head.rotation.y = Math.sin(s * 0.8) * 0.12;
      break;

    case 'WRITING':
      group.rotation.y = Math.PI * 0.5; // face blackboard
      rightArm.rotation.x = -0.6;
      rightArm.rotation.z = -0.3;
      leftArm.rotation.x = 0;
      head.rotation.y = 0;
      break;

    default:
      break;
  }
}

function animatePeer(peer, t) {
  const { head, leftArm, rightArm, group, animState, animTime } = peer;
  peer.animTime = animTime + 0.016;
  const s = peer.animTime;

  switch (animState) {
    case 'ENGAGED':
      group.rotation.x = 0;
      head.rotation.x = 0;
      head.rotation.y = Math.sin(s * 0.3 + peer.animTime) * 0.04;
      group.position.y = 0.75 + Math.sin(s * 0.9) * 0.005;
      leftArm.rotation.x = 0;
      rightArm.rotation.x = 0;
      break;

    case 'DISTRACTED':
      head.rotation.y = -0.55; // looking left (window)
      head.rotation.x = 0.05;
      group.rotation.x = 0.06;
      leftArm.rotation.x = 0;
      rightArm.rotation.x = 0;
      break;

    case 'SLEEPING':
      head.rotation.x = 0.65; // head drooping forward
      head.rotation.y = 0.15;
      group.rotation.x = 0.15; // body slumping
      leftArm.rotation.x = 0.4;
      rightArm.rotation.x = 0.4;
      // Slow breathing bob
      group.position.y = 0.75 + Math.sin(s * 0.5) * 0.012;
      break;

    case 'ANSWERING':
      head.rotation.x = -0.1;
      head.rotation.y = 0;
      group.rotation.x = -0.05;
      rightArm.rotation.z = -1.1; // arm raised!
      rightArm.rotation.x = -0.3;
      group.position.y = 0.75 + Math.sin(s * 1.5) * 0.006;
      break;

    default:
      break;
  }
}

/**
 * Set a peer's animation state.
 */
export function setPeerState(peer, newState) {
  // Reset rotations first
  peer.head.rotation.set(0, 0, 0);
  peer.group.rotation.set(0, 0, 0);
  peer.leftArm.rotation.set(0, 0, 0);
  peer.rightArm.rotation.set(0, 0, 0);
  peer.animState = newState;
  peer.state = newState;
}

/**
 * Set the teacher's animation state.
 */
export function setTeacherState(teacher, newState) {
  if (newState !== 'WRITING') {
    teacher.group.rotation.y = Math.PI * 0.08; // face class
  }
  teacher.animState = newState;
}
