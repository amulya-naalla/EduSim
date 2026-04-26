/**
 * state.js — Global session state
 * Single source of truth for the entire EduSim session.
 */

export const state = {
  // Session setup
  subject: null,       // 'physics' | 'chemistry' | 'maths'
  conceptKey: null,    // e.g. 'newtons_laws'
  conceptLabel: null,  // e.g. "Newton's Laws of Motion"

  // Session progress
  phase: 'idle',       // idle | intro | lecture | qa | coldcall | eval | closing | done
  turn: 0,             // how many teacher turns have elapsed
  isActive: false,

  // Conversation history for API
  messages: [],        // [{role, content}]

  // Player data
  playerAnswer: null,
  playerScore: null,   // 1–5
  teacherEvaluation: null,
  keyTakeaway: null,

  // Notes accumulated during session
  notes: [],           // [{label, body}]

  // Peer states
  peerStates: {},      // name → 'ENGAGED' | 'DISTRACTED' | 'SLEEPING' | 'ANSWERING'

  // UI
  dialogueSpeaker: null,
  isAnswerModalOpen: false,
  isNotesOpen: false,
};

/**
 * Reset state for a new session (keeps config).
 */
export function resetSession() {
  state.phase = 'idle';
  state.turn = 0;
  state.isActive = false;
  state.messages = [];
  state.playerAnswer = null;
  state.playerScore = null;
  state.teacherEvaluation = null;
  state.keyTakeaway = null;
  state.notes = [];
  state.peerStates = {
    Priya: 'ENGAGED',
    Arjun: 'ENGAGED',
    Zoe: 'DISTRACTED',
    Raj: 'ENGAGED',
    Lena: 'ENGAGED',
    Dev: 'SLEEPING',
    Sofia: 'ENGAGED',
    Kai: 'DISTRACTED',
  };
  state.dialogueSpeaker = null;
  state.isAnswerModalOpen = false;
  state.isNotesOpen = false;
}

/**
 * Add a note entry.
 */
export function addNote(label, body) {
  state.notes.push({ label, body });
}

/**
 * Append a message to conversation history.
 */
export function pushMessage(role, content) {
  state.messages.push({ role, content });
}
