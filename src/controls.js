/**
 * controls.js — First-person camera controls
 * PointerLockControls, WASD movement, Raycaster interactions.
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ─── Room boundary (must match room.js) ────────────────────
const BOUNDS = { minX: -7, maxX: 7, minZ: -6.5, maxZ: 6.5 };
const MOVE_SPEED = 5.0;
const PLAYER_HEIGHT = 1.7;

const keys = {
  KeyW: false, KeyS: false, KeyA: false, KeyD: false,
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
};

let controls = null;
let camera = null;
let onInteractCb = null;
let raycaster = null;
let interactables = [];

/**
 * Initialise controls.
 * @param {THREE.Camera} cam
 * @param {HTMLElement} domElement
 * @param {THREE.Object3D[]} interactableList
 * @param {(object: THREE.Object3D) => void} onInteract
 */
export function initControls(cam, domElement, interactableList, onInteract) {
  camera = cam;
  interactables = interactableList;
  onInteractCb = onInteract;

  camera.position.set(-3, PLAYER_HEIGHT, -0.1);
  camera.rotation.order = 'YXZ';

  controls = new PointerLockControls(camera, domElement);
  raycaster = new THREE.Raycaster();

  // Key listeners
  window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
  });
  window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
  });

  // Click to lock / interact
  domElement.addEventListener('click', () => {
    if (!controls.isLocked) {
      controls.lock();
    } else {
      handleRaycast();
    }
  });

  controls.addEventListener('unlock', () => {
    // pointer unlocked
  });

  return controls;
}

/**
 * Update player movement. Call every frame with delta time.
 */
export function updateControls(delta) {
  if (!controls || !controls.isLocked) return;

  const speed = MOVE_SPEED * delta;
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const move = new THREE.Vector3();

  if (keys.KeyW || keys.ArrowUp)    move.addScaledVector(forward,  speed);
  if (keys.KeyS || keys.ArrowDown)  move.addScaledVector(forward, -speed);
  if (keys.KeyA || keys.ArrowLeft)  move.addScaledVector(right,   -speed);
  if (keys.KeyD || keys.ArrowRight) move.addScaledVector(right,    speed);

  camera.position.add(move);

  // Clamp to room bounds
  camera.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, camera.position.x));
  camera.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, camera.position.z));
  camera.position.y = PLAYER_HEIGHT; // keep at head height
}

/**
 * Cast a ray from screen center and fire interaction.
 */
function handleRaycast() {
  if (!camera || !raycaster) return;

  // Ray from camera center
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const hits = raycaster.intersectObjects(flattenInteractables(), true);
  if (!hits.length) return;

  const hit = hits[0];
  if (hit.distance > 7) return; // only interact within 7 units

  // Walk up to find the interactable root
  let obj = hit.object;
  while (obj) {
    if (obj.userData?.type) {
      onInteractCb?.(obj);
      return;
    }
    obj = obj.parent;
  }
}

function flattenInteractables() {
  return interactables.flatMap(o => {
    const list = [o];
    o.traverse(c => { if (c !== o) list.push(c); });
    return list;
  });
}

/**
 * Update the interactable list (call after peers are built).
 */
export function addInteractables(list) {
  interactables.push(...list);
}

/**
 * Lock / unlock the pointer programmatically.
 */
export function lockPointer() {
  controls?.lock();
}
export function unlockPointer() {
  controls?.unlock();
}

export function isLocked() {
  return controls?.isLocked ?? false;
}

/**
 * Get the object the player is currently looking at (within range).
 */
export function getLookedAtObject(range = 5) {
  if (!camera || !raycaster) return null;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(flattenInteractables(), true);
  if (!hits.length || hits[0].distance > range) return null;

  let obj = hits[0].object;
  while (obj) {
    if (obj.userData?.type) return obj;
    obj = obj.parent;
  }
  return null;
}
