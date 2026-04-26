/**
 * tts.js — Text-to-Speech using Web Speech API
 */

import { PEERS } from './characters.js';

const synth = window.speechSynthesis;
let voices = [];
export let lectureSpeed = 1.0;

export function setLectureSpeed(speed) {
  lectureSpeed = speed;
}

// Load voices
function loadVoices() {
  voices = synth.getVoices();
}
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

// Keep a global array of active utterances to prevent Chrome garbage collection bug
const activeUtterances = [];

const speechQueue = [];
let isProcessingQueue = false;

/**
 * Queue text to be spoken.
 * @param {string} text 
 * @param {string} speakerName 
 */
export function speakText(text, speakerName) {
  if (!synth) return;
  speechQueue.push({ text, speakerName, resolve: null });
  processQueue();
}

/**
 * Speak text and return a Promise that resolves only when the audio fully finishes.
 * Safe to await — won't race with polling.
 */
export function speakTextAndWait(text, speakerName) {
  return new Promise(resolve => {
    if (!synth) { resolve(); return; }
    speechQueue.push({ text, speakerName, resolve });
    processQueue();
  });
}

function processQueue() {
  if (isProcessingQueue || speechQueue.length === 0) return;
  
  isProcessingQueue = true;
  const { text, speakerName, resolve: itemResolve } = speechQueue.shift();
  
  // Get all english voices
  let enVoices = voices.filter(v => v.lang.startsWith('en'));
  if (enVoices.length === 0) enVoices = voices; // fallback
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Customise voice based on speaker
  if (speakerName === 'Professor Chen') {
    // Try to find a male-sounding or deep voice for the professor
    let voice = enVoices.find(v => v.name.includes('Google UK English Male') || v.name.includes('David') || v.name.includes('Male'));
    if (!voice && enVoices.length > 0) voice = enVoices[0];
    if (voice) utterance.voice = voice;
    
    utterance.pitch = 0.85;
    utterance.rate = 0.95 * lectureSpeed; // Slightly slower, professorial
  } else {
    // Peers have different voices based on name hash and gender
    if (enVoices.length > 0) {
      const peerData = PEERS.find(p => p.name === speakerName);
      const gender = peerData ? peerData.gender : 'M';
      
      let genderVoices = enVoices.filter(v => {
        const name = v.name.toLowerCase();
        if (gender === 'F') return name.includes('female') || name.includes('woman') || name.includes('zira');
        return name.includes('male') || name.includes('man') || name.includes('david');
      });
      if (genderVoices.length === 0) genderVoices = enVoices;
      
      const hash = speakerName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const voiceIndex = hash % genderVoices.length;
      utterance.voice = genderVoices[voiceIndex];
      
      // Also vary pitch slightly for more variety
      utterance.pitch = 0.9 + ((hash % 10) * 0.05);
      utterance.rate = 1.05 * lectureSpeed;
    }
  }
  
  // Clean up utterance from array when done to free memory
  utterance.onend = () => {
    const idx = activeUtterances.indexOf(utterance);
    if (idx > -1) activeUtterances.splice(idx, 1);
    isProcessingQueue = false;
    if (itemResolve) itemResolve();
    processQueue();
  };
  
  utterance.onerror = () => {
    const idx = activeUtterances.indexOf(utterance);
    if (idx > -1) activeUtterances.splice(idx, 1);
    isProcessingQueue = false;
    if (itemResolve) itemResolve();
    processQueue();
  };
  
  activeUtterances.push(utterance);
  synth.speak(utterance);
}

export function stopSpeech() {
  speechQueue.length = 0;
  if (synth) synth.cancel();
  activeUtterances.length = 0;
  isProcessingQueue = false;
}

/**
 * Wait for all current speech to finish.
 * Returns a Promise that resolves when speaking is complete.
 */
export function waitForSpeechToFinish() {
  return new Promise(resolve => {
    if (!synth || (!synth.speaking && activeUtterances.length === 0 && streamBuffer.trim().length === 0 && speechQueue.length === 0 && !isProcessingQueue)) {
      resolve();
      return;
    }
    
    // Check periodically
    const interval = setInterval(() => {
      if (!synth.speaking && activeUtterances.length === 0 && streamBuffer.trim().length === 0 && speechQueue.length === 0 && !isProcessingQueue) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

// ─── Stream buffering ───────────────────────────────────────────────────────

let streamBuffer = '';
let currentSpeaker = '';

export function startSpeechStream(speakerName) {
  currentSpeaker = speakerName;
  streamBuffer = '';
  stopSpeech();
}

export function appendSpeechChunk(chunk) {
  streamBuffer += chunk;
  
  // Look for sentence boundaries: ., !, ?, \n
  // Use a while loop to extract ALL complete sentences currently in the buffer
  while (true) {
    const match = streamBuffer.match(/([^.!?\n]+[.!?\n]+)/);
    if (match) {
      const sentence = match[1];
      speakText(sentence, currentSpeaker);
      streamBuffer = streamBuffer.slice(match.index + sentence.length);
    } else {
      break;
    }
  }
}

export function finalizeSpeechStream() {
  if (streamBuffer.trim().length > 0) {
    speakText(streamBuffer, currentSpeaker);
  }
  streamBuffer = '';
}
