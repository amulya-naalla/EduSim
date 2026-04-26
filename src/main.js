/**
 * main.js — EduSim V2 entry point
 * Bootstraps Three.js scene, controls, characters, and session flow.
 */

import * as THREE from 'three';
import { buildRoom, setupLighting } from './room.js';
import { buildTeacher, buildPeers, animateCharacters } from './characters.js';
import { initControls, updateControls, getLookedAtObject, addInteractables, unlockPointer } from './controls.js';
import { initHUD, setPhase, showInteractPrompt, hideInteractPrompt } from './dialogue.js';
import { startSession, handleInteraction, injectSceneRefs } from './events.js';
import { SUBJECTS } from './topics.js';
import { state } from './state.js';
import { extractTextFromPDF } from './pdfParser.js';
import { setLectureSpeed, stopSpeech } from './tts.js';

// ─── DOM refs ──────────────────────────────────────────────────────────────
const canvas       = document.getElementById('edusim-canvas');
const startScreen  = document.getElementById('start-screen');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText  = document.getElementById('loading-text');
const subjectCards = document.querySelectorAll('.subject-card');
const conceptList  = document.getElementById('concept-list');
const conceptSel   = document.getElementById('concept-selector');
const enterBtn     = document.getElementById('enter-btn');
const btnReview    = document.getElementById('btn-review-notes');
const btnNew       = document.getElementById('btn-new-session');
const endScreen    = document.getElementById('end-screen');

// ─── Session setup UI ──────────────────────────────────────────────────────
let selectedSubject = null;
let selectedConcept = null;

subjectCards.forEach(card => {
  card.addEventListener('click', () => {
    const subject = card.dataset.subject;
    
    if (subject === 'custom') {
      const input = card.querySelector('#pdf-upload');
      input.click();
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        loadingOverlay.classList.remove('hidden');
        loadingText.textContent = 'Parsing PDF...';
        startScreen.classList.add('hidden');
        
        try {
          const text = await extractTextFromPDF(file);
          
          // Create a dynamic custom subject
          SUBJECTS.custom = {
            label: 'Custom Syllabus',
            icon: '📄',
            image: null,
            concepts: {
              custom_doc: {
                label: file.name.replace('.pdf', ''),
                sampleQuestion: "Can you explain the main idea presented in this document?",
                pdfContext: text.substring(0, 30000) // Keep it within token limits
              }
            }
          };
          
          selectedSubject = 'custom';
          selectedConcept = 'custom_doc';
          enterClassroom(selectedSubject, selectedConcept);
          
        } catch (err) {
          alert("Error parsing PDF: " + err.message);
          startScreen.classList.remove('hidden');
          loadingOverlay.classList.add('hidden');
        }
      };
      return;
    }

    subjectCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedSubject = subject;
    selectedConcept = null;
    enterBtn.classList.add('hidden');
    buildConceptList(selectedSubject);
    conceptSel.classList.remove('hidden');
  });
});

function buildConceptList(subject) {
  const concepts = SUBJECTS[subject].concepts;
  conceptList.innerHTML = '';
  Object.entries(concepts).forEach(([key, data]) => {
    const btn = document.createElement('button');
    btn.className = 'concept-btn';
    btn.textContent = data.label;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.concept-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedConcept = key;
      enterBtn.classList.remove('hidden');
    });
    conceptList.appendChild(btn);
  });
}

enterBtn.addEventListener('click', () => {
  if (!selectedSubject || !selectedConcept) return;
  enterClassroom(selectedSubject, selectedConcept);
});

// End screen buttons
btnNew?.addEventListener('click', () => {
  endScreen.classList.add('hidden');
  endScreen.classList.remove('active');
  startScreen.classList.remove('hidden');
  startScreen.classList.add('active');
  // Reset concept selector
  subjectCards.forEach(c => c.classList.remove('selected'));
  conceptSel.classList.add('hidden');
  enterBtn.classList.add('hidden');
  selectedSubject = null;
  selectedConcept = null;
});

btnReview?.addEventListener('click', () => {
  document.getElementById('notes-overlay').classList.remove('hidden');
  state.isNotesOpen = true;
  unlockPointer();
});

window.addEventListener('keydown', e => {
  const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
  if ((e.key === 'd' || e.key === 'D') && !isInput) {
    if (state.isNotesOpen) {
      document.getElementById('notes-overlay').classList.add('hidden');
      state.isNotesOpen = false;
      lockPointer();
    } else {
      document.getElementById('notes-overlay').classList.remove('hidden');
      state.isNotesOpen = true;
      unlockPointer();
    }
  }
});

document.getElementById('speed-selector')?.addEventListener('change', (e) => {
  setLectureSpeed(parseFloat(e.target.value));
});

document.getElementById('exit-btn')?.addEventListener('click', () => {
  if (confirm("Are you sure you want to exit the session?")) {
    stopSpeech();
    location.reload();
  }
});

// ─── Three.js setup ────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue peeking through windows
scene.fog = new THREE.Fog(0xd4c9b8, 14, 22);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 40);

// Handle resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ─── Enter classroom ────────────────────────────────────────────────────────
let teacher, peers, controls;
let classroomBuilt = false;

async function enterClassroom(subject, concept) {
  // Show loading
  startScreen.classList.remove('active');
  startScreen.classList.add('hidden');
  loadingOverlay.classList.remove('hidden');
  loadingText.textContent = 'Building the classroom...';

  await tick(); // allow DOM to update

  if (!classroomBuilt) {
    await buildClassroom();
    classroomBuilt = true;
  }

  loadingText.textContent = 'Seating students...';
  await tick();
  await new Promise(r => setTimeout(r, 400));

  loadingText.textContent = 'Starting session...';
  await tick();
  await new Promise(r => setTimeout(r, 300));

  loadingOverlay.classList.add('hidden');

  // Lock pointer and start
  controls.lock();
  initHUD();
  setPhase('intro');

  // Inject refs into events
  injectSceneRefs(teacher, peers, camera, renderer);

  // Start session (async, drives the whole flow)
  startSession(subject, concept);
}

async function buildClassroom() {
  // Room geometry
  const { interactables } = buildRoom(scene);
  setupLighting(scene);

  // Characters
  teacher = buildTeacher(scene);
  peers   = buildPeers(scene);

  // Controls — pass teacher + peer groups as interactables
  const peerGroups = peers.map(p => p.group);
  const allInteractables = [
    ...interactables,
    teacher.group,
    ...peerGroups,
  ];

  controls = initControls(camera, renderer.domElement, allInteractables, (obj) => {
    // Get screen position for thought bubbles
    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);
    const screenPos = worldPos.clone().project(camera);
    const sx = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
    handleInteraction(obj, peers, { x: sx, y: sy });
  });

  // Also register peer groups with controls
  addInteractables(peerGroups);
}

// ─── Interact prompt loop ──────────────────────────────────────────────────
let lastLookedAt = null;

function updateInteractPrompt() {
  if (!controls?.isLocked) { hideInteractPrompt(); return; }
  const obj = getLookedAtObject(5.5);
  if (obj !== lastLookedAt) {
    lastLookedAt = obj;
    if (obj) {
      const type = obj.userData?.type || obj.parent?.userData?.type;
      const name = obj.userData?.name || obj.parent?.userData?.name;
      const labels = {
        blackboard:   'Click — View today\'s topic',
        locker:       'Click — Open Session Notes',
        player_desk:  'Click — Your desk',
        teacher:      'Click — Professor Chen',
        teacher_desk: 'Click — Teacher\'s desk',
        peer:         name ? `Click — ${name}` : 'Click — Student',
      };
      showInteractPrompt(labels[type] || 'Click to interact');
    } else {
      hideInteractPrompt();
    }
  }
}

// ─── Render loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  updateControls(delta);
  updateInteractPrompt();

  if (teacher && peers) {
    animateCharacters(teacher, peers, elapsed);
  }

  renderer.render(scene, camera);
}

animate();

// ─── Utility ───────────────────────────────────────────────────────────────
function tick() {
  return new Promise(r => requestAnimationFrame(r));
}
