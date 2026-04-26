/**
 * events.js — Session orchestrator
 * Drives the full session sequence and injects dynamic side events.
 */

import { state, resetSession, pushMessage, addNote } from './state.js';
import { buildSystemPrompt, getPeerBubble, SUBJECTS } from './topics.js';
import { streamTeacherTurn, getPeerAnswer, getFallbackDialogue } from './api.js';
import {
  setPhase, showDialogue, appendDialogueChunk, finaliseDialogue,
  hideDialogue, showThoughtBubble, promptPlayerAnswer,
  openNotes, showEndScreen, dismissAllBubbles,
} from './dialogue.js';
import { setPeerState, setTeacherState } from './characters.js';
import { setBlackboardImage } from './room.js';

// These are injected by main.js after the 3D scene is built
let teacherRef = null;
let peersRef   = [];
let cameraRef  = null;
let rendererRef = null;

export function injectSceneRefs(teacher, peers, camera, renderer) {
  teacherRef  = teacher;
  peersRef    = peers;
  cameraRef   = camera;
  rendererRef = renderer;
}

// ─── Session entry point ──────────────────────────────────────────────────

export async function startSession(subject, conceptKey) {
  resetSession();

  state.subject      = subject;
  state.conceptKey   = conceptKey;
  state.conceptLabel = SUBJECTS[subject].concepts[conceptKey].label;
  state.isActive     = true;

  // Initialise peer states from their defaults
  peersRef.forEach(p => {
    state.peerStates[p.name] = p.state;
  });

  await delay(600);

  // ── 1. INTRO ──────────────────────────────────────────────
  setPhase('intro');
  setTeacherState(teacherRef, 'TALKING');

  const systemPrompt = buildSystemPrompt(subject, conceptKey);
  const introPrompt  = `Open the class. Give a warm 2–3 sentence introduction to "${state.conceptLabel}". Be natural and spoken, not a list.`;

  pushMessage('user', introPrompt);
  await teacherSpeak(systemPrompt, `Good ${getTimeOfDay()}, everyone. Let's get started.`);

  await delay(1200);

  // ── 2. LECTURE PHASE (2–3 exchanges) ─────────────────────
  setPhase('lecture');
  
  // Show image on board
  const boardImage = SUBJECTS[subject].image;
  if (boardImage) setBlackboardImage(boardImage);
  
  setTeacherState(teacherRef, 'WRITING');

  for (let i = 0; i < 2; i++) {
    await delay(800);
    await maybeFireSideEvent('lecture');

    const lecturePrompt = i === 0
      ? `Continue your lecture on "${state.conceptLabel}". Explain the first 2 key points clearly in spoken language. Then ask Priya or Raj a question about it. Do NOT ask the Player.`
      : `Continue the lecture. Cover another key point, then ask a different student (Arjun, Lena, or Sofia) a short question. Do NOT ask the Player.`;

    pushMessage('user', lecturePrompt);
    setTeacherState(teacherRef, i % 2 === 0 ? 'WRITING' : 'TALKING');
    await teacherSpeak(systemPrompt);

    await delay(600);

    // Extract targeted student from teacher's dialogue
    const lastTeacherMsg = state.messages[state.messages.length - 1].content;
    const allNames = peersRef.map(p => p.name);
    const mentionedNames = allNames.filter(n => lastTeacherMsg.includes(n));
    const defaultName = i === 0 ? 'Priya' : 'Arjun';
    const peerName = mentionedNames.length > 0 ? mentionedNames[0] : defaultName;
    
    // Simulate peer answering
    const peer = peersRef.find(p => p.name === peerName);
    let lastPeerAns = '';
    if (peer) {
      setPeerState(peer, 'ANSWERING');
      const peerQ   = SUBJECTS[subject].concepts[conceptKey].sampleQuestion;
      const pdfCtx  = SUBJECTS[subject].concepts[conceptKey].pdfContext;
      lastPeerAns   = await getPeerAnswer(peerName, peer.level, state.conceptLabel, peerQ, pdfCtx);
      await showDialogue(peerName, lastPeerAns); // non-streaming static display
      setPeerState(peer, 'ENGAGED');
    }

    // Teacher feedback — reuse the already-fetched peer answer
    pushMessage('user', `${peerName} just answered: "${lastPeerAns || 'something reasonable'}". Give a brief 1-2 sentence feedback on their answer.`);
    await teacherSpeak(systemPrompt);
    await delay(600);
  }

  // ── 3. Q&A PHASE ──────────────────────────────────────────
  setPhase('qa');
  setTeacherState(teacherRef, 'TALKING');
  await delay(600);
  await maybeFireSideEvent('qa');

  // Struggling student gives wrong answer
  const struggler = peersRef.find(p => p.level === 'struggling' && p.state !== 'SLEEPING');
  if (struggler) {
    const q = SUBJECTS[subject].concepts[conceptKey].sampleQuestion;
    const pdfCtx = SUBJECTS[subject].concepts[conceptKey].pdfContext;
    pushMessage('user', `Ask ${struggler.name} the following question: "${q}"`);
    await teacherSpeak(systemPrompt);
    await delay(800);

    setPeerState(struggler, 'ANSWERING');
    const wrongAns = await getPeerAnswer(struggler.name, 'struggling', state.conceptLabel, q, pdfCtx);
    await showDialogue(struggler.name, wrongAns);
    pushMessage('assistant', wrongAns);
    setPeerState(struggler, 'DISTRACTED');

    pushMessage('user', `${struggler.name} just said: "${wrongAns}". Correct them gently and explain the right approach in 2 sentences.`);
    await teacherSpeak(systemPrompt);
    await delay(600);
  }

  // ── 4. COLD CALL ──────────────────────────────────────────
  setPhase('coldcall');
  setTeacherState(teacherRef, 'TALKING');
  await delay(1000);

  const coldCallQ = SUBJECTS[subject].concepts[conceptKey].sampleQuestion;
  pushMessage('user', `Now cold-call the [Player] with exactly this phrasing: "Alright, let's hear from you." Then ask them: "${coldCallQ}"`);

  // Stream teacher cold-call
  let coldCallText = '';
  await new Promise(resolve => {
    showDialogue('Professor Chen', '', true);
    streamTeacherTurn(
      state.messages,
      systemPrompt,
      chunk => { appendDialogueChunk(chunk); coldCallText += chunk; },
      full  => { pushMessage('assistant', full); finaliseDialogue('Professor Chen', full).then(() => resolve()); },
      ()    => { showDialogue('Professor Chen', "Alright, let's hear from you. " + coldCallQ).then(() => resolve()); }
    );
  });

  addNote('Cold Call Question', coldCallQ);
  await delay(1200);

  // ── 5. PLAYER ANSWERS ────────────────────────────────────
  const playerAnswer = await promptPlayerAnswer("Your answer:");
  state.playerAnswer = playerAnswer;
  addNote("Your Answer", playerAnswer);

  await delay(400);

  // ── 6. TEACHER EVALUATES ──────────────────────────────────
  setPhase('eval');
  setTeacherState(teacherRef, 'TALKING');

  pushMessage('user', playerAnswer);
  pushMessage('user', `The student just answered: "${playerAnswer}". Evaluate it thoroughly. Provide specific feedback. Give a SCORE: X/5 (where X is 1-5 based on accuracy and depth). Point out what was right, what was missing.`);
  await teacherSpeak(systemPrompt);

  // Parse score from teacher's evaluation
  const evalText = state.messages[state.messages.length - 1]?.content || '';
  const scoreMatch = evalText.match(/SCORE:\s*([1-5])/i);
  state.playerScore = scoreMatch ? parseInt(scoreMatch[1]) : 3;
  state.teacherEvaluation = evalText;
  addNote('Teacher Evaluation', evalText.slice(0, 280));

  await delay(1800);

  // ── 7. CLOSING ────────────────────────────────────────────
  setPhase('closing');
  setTeacherState(teacherRef, 'TALKING');
  await delay(600);

  pushMessage('user', `Close the session. Summarise in 3-4 sentences what was covered today about "${state.conceptLabel}". End with: "KEY TAKEAWAY:" followed by one memorable sentence.`);
  await teacherSpeak(systemPrompt);

  // Parse key takeaway
  const closingText = state.messages[state.messages.length - 1]?.content || '';
  const takeawayMatch = closingText.match(/KEY TAKEAWAY:\s*(.+)/i);
  state.keyTakeaway = takeawayMatch ? takeawayMatch[1].trim() : `Understanding ${state.conceptLabel} is foundational to mastering the subject.`;
  addNote('Key Takeaway', state.keyTakeaway);

  await delay(2000);

  // ── 8. SESSION END ────────────────────────────────────────
  setPhase('done');
  state.isActive = false;
  setTeacherState(teacherRef, 'IDLE');
  setBlackboardImage(null); // Clear board

  // Auto-open notes
  openNotes();

  await delay(1500);

  showEndScreen({
    concept:      state.conceptLabel,
    score:        state.playerScore,
    playerAnswer: state.playerAnswer,
    takeaway:     state.keyTakeaway,
  });
}

// ─── Teacher speak helper ─────────────────────────────────────────────────

/**
 * Stream a teacher turn and wait for completion.
 * @param {string} systemPrompt
 * @param {string|null} fallback — text to show if API fails
 * @param {boolean} saveToHistory — save assistant reply to state.messages
 */
async function teacherSpeak(systemPrompt, fallback = null, saveToHistory = true) {
  return new Promise(resolve => {
    let accumulated = '';

    showDialogue('Professor Chen', '', true);

    streamTeacherTurn(
      state.messages,
      systemPrompt,
      chunk => {
        appendDialogueChunk(chunk);
        accumulated += chunk;
      },
      full => {
        finaliseDialogue('Professor Chen', full).then(() => {
          if (saveToHistory || true) pushMessage('assistant', full);
          resolve();
        });
      },
      () => {
        // Fallback
        const fb = fallback || getFallbackDialogue();
        showDialogue('Professor Chen', fb).then(() => {
          pushMessage('assistant', fb);
          resolve();
        });
      }
    );
  });
}

// ─── Side events ──────────────────────────────────────────────────────────

async function maybeFireSideEvent(phase) {
  const roll = Math.random();

  if (roll < 0.05) {
    await fireChitPass();
  } else if (roll < 0.15 && phase === 'qa') {
    await firePeerDebate();
  } else if (roll < 0.25) {
    await fireDistractionShift();
  }
}

async function fireChitPass() {
  const p1 = peersRef[Math.floor(Math.random() * peersRef.length)];
  const p2 = peersRef.find(p => p !== p1);
  if (!p1 || !p2) return;

  // Animate — brief distraction
  const prev1 = p1.animState, prev2 = p2.animState;
  setPeerState(p1, 'DISTRACTED');
  setPeerState(p2, 'DISTRACTED');
  await delay(2500);
  setPeerState(p1, prev1);
  setPeerState(p2, prev2);
}

async function firePeerDebate() {
  const debaters = peersRef.filter(p => p.level !== 'struggling').slice(0, 2);
  if (debaters.length < 2) return;

  setPeerState(debaters[0], 'ANSWERING');
  await delay(1200);
  setPeerState(debaters[0], 'ENGAGED');
  setPeerState(debaters[1], 'ANSWERING');
  await delay(1200);
  setPeerState(debaters[1], 'ENGAGED');
}

async function fireDistractionShift() {
  const engaged = peersRef.filter(p => p.animState === 'ENGAGED');
  if (!engaged.length) return;
  const target = engaged[Math.floor(Math.random() * engaged.length)];
  setPeerState(target, 'DISTRACTED');
  await delay(4000 + Math.random() * 3000);
  setPeerState(target, 'ENGAGED');
}

// ─── Interaction handler (called by controls.js raycaster) ───────────────

export function handleInteraction(obj, peers, screenPos) {
  const type = obj?.userData?.type;
  if (!type) return;

  dismissAllBubbles();

  switch (type) {
    case 'blackboard':
      showDialogue('Blackboard', `📋 Today's Topic: ${state.conceptLabel || 'Select a concept to begin'}`);
      break;

    case 'locker':
      openNotes();
      break;

    case 'player_desk':
      if (state.phase === 'coldcall') {
        promptPlayerAnswer().then(ans => {
          state.playerAnswer = ans;
        });
      } else {
        showDialogue('Your Desk', 'The teacher hasn\'t called on you yet. Pay attention!');
      }
      break;

    case 'teacher':
    case 'teacher_desk':
      if (state.isActive) {
        showDialogue('Professor Chen', 'Please hold your questions for now. We\'ll get to everyone.');
      }
      break;

    case 'peer': {
      const name = obj.userData?.name || obj.parent?.userData?.name;
      if (!name) return;
      const peer = peers.find(p => p.name === name);
      if (!peer) return;
      const bubble = getPeerBubble(name);
      if (screenPos) showThoughtBubble(name, bubble, screenPos);
      break;
    }

    default:
      break;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
