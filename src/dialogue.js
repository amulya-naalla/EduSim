/**
 * dialogue.js — All HUD overlays, dialogue streaming, thought bubbles, answer input, notes.
 */

import { state, addNote } from './state.js';
import { unlockPointer, lockPointer } from './controls.js';
import { speakText, speakTextAndWait, stopSpeech, startSpeechStream, appendSpeechChunk, finalizeSpeechStream, waitForSpeechToFinish, lectureSpeed } from './tts.js';

// ─── Element refs ──────────────────────────────────────────────────────────
const dialogueBox     = document.getElementById('dialogue-box');
const dialogueSpeaker = document.getElementById('dialogue-speaker');
const dialogueText    = document.getElementById('dialogue-text');
const dialogueCursor  = document.getElementById('dialogue-cursor');
const phaseBanner     = document.getElementById('phase-banner');
const phaseText       = document.getElementById('phase-text');
const answerModal     = document.getElementById('answer-modal');
const answerInput     = document.getElementById('answer-input');
const answerSubmit    = document.getElementById('answer-submit');
const answerPromptEl  = document.getElementById('answer-prompt-text');
const notesOverlay    = document.getElementById('notes-overlay');
const notesContent    = document.getElementById('notes-content');
const notesClose      = document.getElementById('notes-close');
const notesCopy       = document.getElementById('notes-copy');
const interactPrompt  = document.getElementById('interact-prompt');
const interactLabel   = document.getElementById('interact-label');
const crosshair       = document.getElementById('crosshair');
const bubblesContainer = document.getElementById('bubbles-container');

let dialogueFadeTimer = null;
let answerResolve = null;

// ─── Initialise UI ──────────────────────────────────────────────────────────
export function initHUD() {
  crosshair.classList.remove('hidden');
  phaseBanner.classList.remove('hidden');

  // Notes close
  notesClose.addEventListener('click', closeNotes);
  window.addEventListener('keydown', e => {
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
    if (isInput) return;
    
    if (e.code === 'KeyN' || (e.code === 'KeyD' && !state.isAnswerModalOpen)) {
      toggleNotes();
    }
    if (e.code === 'Escape') {
      if (state.isNotesOpen) closeNotes();
    }
  });

  // Copy notes
  notesCopy.addEventListener('click', () => {
    const text = state.notes.map(n => `[${n.label}]\n${n.body}`).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    notesCopy.textContent = '✓ Copied!';
    setTimeout(() => { notesCopy.textContent = '📋 Copy Notes'; }, 2000);
  });
}

// ─── Phase banner ──────────────────────────────────────────────────────────
const PHASE_LABELS = {
  idle:     'Ready',
  intro:    '🎓 Introduction',
  lecture:  '📖 Lecture',
  qa:       '🙋 Q&A Phase',
  coldcall: '⚡ Cold Call!',
  eval:     '📊 Evaluation',
  closing:  '✅ Session Closing',
  done:     '🎉 Session Complete',
};

export function setPhase(phase) {
  state.phase = phase;
  phaseText.textContent = PHASE_LABELS[phase] || phase;
  phaseBanner.style.borderColor =
    phase === 'coldcall' ? 'rgba(246,224,94,0.6)' :
    phase === 'eval'     ? 'rgba(104,211,145,0.6)' :
    'rgba(99,179,237,0.35)';
  phaseText.style.color =
    phase === 'coldcall' ? '#f6e05e' :
    phase === 'eval'     ? '#68d391' :
    '#63b3ed';
}

// ─── Dialogue box ──────────────────────────────────────────────────────────
/**
 * Show speaker name and start streaming text into the dialogue box.
 * Returns a promise that resolves when streaming is complete.
 */
export function showDialogue(speaker, text, isStreaming = false) {
  clearFadeTimer();
  dialogueBox.classList.remove('hidden');
  dialogueSpeaker.textContent = speaker.toUpperCase();
  dialogueText.textContent = '';
  dialogueCursor.style.display = 'inline-block';

  state.dialogueSpeaker = speaker;

  if (!isStreaming) {
    // Type out statically and speak
    // Use speakTextAndWait so we await directly on the utterance onend — no polling race.
    const speechDone = speakTextAndWait(text, speaker);
    return typeText(text).then(() => speechDone).then(() => {
      dialogueCursor.style.display = 'none';
      scheduleDialogueFade(5000);
    });
  }
  
  // If streaming, start the TTS buffer
  startSpeechStream(speaker);
}

/**
 * Append a streamed chunk to the dialogue box.
 */
export function appendDialogueChunk(chunk) {
  clearFadeTimer();
  dialogueBox.classList.remove('hidden');
  dialogueCursor.style.display = 'inline-block';
  dialogueText.textContent += chunk;
  appendSpeechChunk(chunk);
}

/**
 * Called when streaming is done.
 */
export async function finaliseDialogue(speaker, fullText) {
  dialogueCursor.style.display = 'none';
  finalizeSpeechStream();
  
  await waitForSpeechToFinish();
  scheduleDialogueFade(6000);

  // Auto-save to notes (key moments)
  if (state.phase === 'intro' || state.phase === 'lecture' || state.phase === 'closing') {
    const label = state.phase === 'closing' ? 'Session Summary' : `${state.conceptLabel || 'Lecture'}`;
    addNote(label, fullText.slice(0, 260) + (fullText.length > 260 ? '...' : ''));
    renderNotes();
  }
}

export function hideDialogue() {
  clearFadeTimer();
  dialogueBox.classList.add('hidden');
  dialogueText.textContent = '';
}

function scheduleDialogueFade(ms) {
  dialogueFadeTimer = setTimeout(() => {
    dialogueBox.classList.add('hidden');
  }, ms);
}

function clearFadeTimer() {
  if (dialogueFadeTimer) { clearTimeout(dialogueFadeTimer); dialogueFadeTimer = null; }
}

// Typewriter effect for static text
function typeText(text, speed = 28) {
  return new Promise(resolve => {
    let i = 0;
    dialogueText.textContent = '';
    const interval = setInterval(() => {
      dialogueText.textContent += text[i];
      i++;
      if (i >= text.length) { clearInterval(interval); resolve(); }
    }, 25 / lectureSpeed);
  });
}

// ─── Thought Bubbles ──────────────────────────────────────────────────────
const activeBubbles = new Map(); // name → {el, timer}

/**
 * Show a thought bubble near a 3D object's screen position.
 * @param {string} name — peer name
 * @param {string} text
 * @param {{x: number, y: number}} screenPos — {x, y} in pixels
 */
export function showThoughtBubble(name, text, screenPos) {
  dismissBubble(name);

  const el = document.createElement('div');
  el.className = 'thought-bubble';
  el.textContent = text;
  el.style.left = `${Math.min(screenPos.x, window.innerWidth - 200)}px`;
  el.style.top  = `${Math.max(screenPos.y - 80, 40)}px`;
  bubblesContainer.appendChild(el);

  const timer = setTimeout(() => dismissBubble(name), 3000);
  activeBubbles.set(name, { el, timer });
}

export function dismissBubble(name) {
  const entry = activeBubbles.get(name);
  if (!entry) return;
  clearTimeout(entry.timer);
  entry.el.remove();
  activeBubbles.delete(name);
}

export function dismissAllBubbles() {
  activeBubbles.forEach((_, name) => dismissBubble(name));
}

// ─── Answer Input Modal ───────────────────────────────────────────────────
/**
 * Show the answer modal. Returns a Promise<string> with the player's answer.
 */
export function promptPlayerAnswer(prompt = 'Your answer:') {
  return new Promise(resolve => {
    answerResolve = resolve;
    answerPromptEl.textContent = prompt;
    answerInput.value = '';
    answerModal.classList.remove('hidden');
    state.isAnswerModalOpen = true;
    unlockPointer();

    setTimeout(() => answerInput.focus(), 100);

    const submit = () => {
      const answer = answerInput.value.trim();
      if (!answer) return;
      answerModal.classList.add('hidden');
      state.isAnswerModalOpen = false;
      lockPointer();
      resolve(answer);
    };

    answerSubmit.onclick = submit;
    answerInput.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    };
  });
}

// ─── Session Notes ─────────────────────────────────────────────────────────
export function toggleNotes() {
  if (state.isNotesOpen) closeNotes();
  else openNotes();
}

export function openNotes() {
  renderNotes();
  notesOverlay.classList.remove('hidden');
  state.isNotesOpen = true;
  unlockPointer();
}

export function closeNotes() {
  notesOverlay.classList.add('hidden');
  state.isNotesOpen = false;
  if (!state.isAnswerModalOpen) lockPointer();
}

function renderNotes() {
  if (!state.notes.length) {
    notesContent.innerHTML = '<p class="notes-empty">Notes will appear here as the session progresses...</p>';
    return;
  }
  notesContent.innerHTML = state.notes.map(n => `
    <div class="notes-entry">
      <div class="notes-entry-label">${escHtml(n.label)}</div>
      <div class="notes-entry-body">${escHtml(n.body)}</div>
    </div>
  `).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Interact prompt ───────────────────────────────────────────────────────
export function showInteractPrompt(label) {
  interactLabel.textContent = label;
  interactPrompt.classList.remove('hidden');
}
export function hideInteractPrompt() {
  interactPrompt.classList.add('hidden');
}

// ─── Screen transitions ────────────────────────────────────────────────────
export function showEndScreen(data) {
  const endScreen = document.getElementById('end-screen');
  document.getElementById('end-concept').textContent  = data.concept || '—';
  document.getElementById('end-score').textContent    = data.score ? `${data.score}/5` : '—';
  document.getElementById('end-player-answer').textContent = data.playerAnswer || '—';
  document.getElementById('end-takeaway').textContent = data.takeaway || '—';
  document.getElementById('end-subtitle').textContent =
    data.score >= 4 ? 'Outstanding performance! 🌟' :
    data.score >= 3 ? 'Good effort! Keep it up.' :
    'Room to grow — every session makes you sharper.';

  endScreen.classList.remove('hidden');
  endScreen.classList.add('active');
}
