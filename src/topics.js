/**
 * topics.js — Subject/concept data + system prompt templates
 */

export const SUBJECTS = {
  physics: {
    label: 'Physics',
    icon: '⚡',
    image: '/assets/physics_board.png',
    concepts: {
      newtons_laws: {
        label: "Newton's Laws of Motion",
        keyPoints: [
          "An object at rest stays at rest unless acted upon by a net external force (First Law).",
          "Force equals mass times acceleration: F = ma (Second Law).",
          "For every action there is an equal and opposite reaction (Third Law).",
          "Net force determines acceleration, not velocity.",
          "Friction is a real force that opposes relative motion.",
        ],
        sampleQuestion: "If a 5 kg object accelerates at 2 m/s², what is the net force acting on it?",
      },
      work_energy: {
        label: "Work, Energy & Power",
        keyPoints: [
          "Work is done when a force causes displacement: W = F·d·cosθ.",
          "Kinetic energy: KE = ½mv². Potential energy: PE = mgh.",
          "Conservation of energy: total energy in a closed system is constant.",
          "Power is the rate of doing work: P = W/t.",
          "The work–energy theorem states net work equals change in KE.",
        ],
        sampleQuestion: "A 10 kg box is lifted 3 metres. How much potential energy is gained? (g = 10 m/s²)",
      },
      waves: {
        label: "Waves & Oscillations",
        keyPoints: [
          "Waves transfer energy without transferring matter.",
          "Frequency (f) and period (T) are inverses: f = 1/T.",
          "Wave speed: v = fλ, where λ is wavelength.",
          "Transverse waves oscillate perpendicular to propagation; longitudinal waves oscillate parallel.",
          "Resonance occurs when driving frequency matches natural frequency.",
        ],
        sampleQuestion: "A wave has frequency 440 Hz and wavelength 0.77 m. What is its speed?",
      },
      circuits: {
        label: "Electric Circuits",
        keyPoints: [
          "Ohm's Law: V = IR (voltage = current × resistance).",
          "In series circuits, current is the same throughout; voltage divides.",
          "In parallel circuits, voltage is the same; current divides.",
          "Power dissipated: P = IV = I²R = V²/R.",
          "Kirchhoff's laws: sum of currents at a junction = 0; sum of EMFs in a loop = sum of voltage drops.",
        ],
        sampleQuestion: "Two 6Ω resistors are connected in parallel. What is the equivalent resistance?",
      },
    },
  },

  chemistry: {
    label: 'Chemistry',
    icon: '⚗️',
    image: '/assets/chemistry_board.png',
    concepts: {
      atomic_structure: {
        label: "Atomic Structure & Periodic Trends",
        keyPoints: [
          "Atoms consist of protons, neutrons (in nucleus) and electrons (orbitals).",
          "Atomic number = number of protons; determines the element.",
          "Electron configuration follows aufbau, Pauli exclusion, and Hund's rule.",
          "Periodic trends: atomic radius decreases across a period, increases down a group.",
          "Ionisation energy and electronegativity increase across a period.",
        ],
        sampleQuestion: "Why does atomic radius decrease as you move across a period from left to right?",
      },
      bonding: {
        label: "Chemical Bonding",
        keyPoints: [
          "Ionic bonds: electron transfer between metals and non-metals; forms lattice structures.",
          "Covalent bonds: electron sharing between non-metals; can be polar or non-polar.",
          "Bond strength: triple > double > single bond.",
          "VSEPR theory predicts molecular geometry from electron pairs.",
          "Electronegativity difference determines bond polarity.",
        ],
        sampleQuestion: "Explain why water (H₂O) is a polar molecule despite having two identical O–H bonds.",
      },
      acid_base: {
        label: "Acid-Base Reactions & Titration",
        keyPoints: [
          "Arrhenius: acids produce H⁺; bases produce OH⁻ in water.",
          "Brønsted–Lowry: acids are proton donors; bases are proton acceptors.",
          "pH = –log[H⁺]. Neutral pH = 7 at 25°C.",
          "Titration: standard solution of known concentration neutralises analyte.",
          "At equivalence point, moles of acid = moles of base (for 1:1 reactions).",
        ],
        sampleQuestion: "25 mL of NaOH is required to neutralise 20 mL of 0.1 M HCl. What is the molarity of NaOH?",
      },
      stoichiometry: {
        label: "Stoichiometry",
        keyPoints: [
          "A mole is 6.022 × 10²³ particles (Avogadro's number).",
          "Molar mass converts grams to moles.",
          "Balanced equations give mole ratios between reactants and products.",
          "Limiting reagent determines the theoretical yield.",
          "Percentage yield = (actual yield / theoretical yield) × 100.",
        ],
        sampleQuestion: "If 4g of H₂ reacts with excess O₂ to form water, what mass of water is produced?",
      },
    },
  },

  maths: {
    label: 'Mathematics',
    icon: '∫',
    image: '/assets/maths_board.png',
    concepts: {
      limits: {
        label: "Limits & Continuity",
        keyPoints: [
          "A limit describes the value a function approaches as input approaches a point.",
          "Limits can exist even when the function is undefined at that point.",
          "Left-hand and right-hand limits must agree for a limit to exist.",
          "A function is continuous at x = a if the limit equals the function value.",
          "L'Hôpital's rule resolves 0/0 and ∞/∞ indeterminate forms.",
        ],
        sampleQuestion: "Evaluate lim(x→2) of (x² – 4)/(x – 2) and explain your steps.",
      },
      differentiation: {
        label: "Differentiation",
        keyPoints: [
          "The derivative represents the instantaneous rate of change of a function.",
          "Power rule: d/dx(xⁿ) = nxⁿ⁻¹.",
          "Product rule: (uv)' = u'v + uv'. Quotient rule: (u/v)' = (u'v – uv')/v².",
          "Chain rule: dy/dx = (dy/du)·(du/dx) for composite functions.",
          "A critical point occurs where f'(x) = 0 or is undefined.",
        ],
        sampleQuestion: "Find the derivative of f(x) = x³ – 4x² + 7x – 2.",
      },
      integration: {
        label: "Integration",
        keyPoints: [
          "Integration is the reverse of differentiation (antiderivative).",
          "Indefinite integral: ∫f(x)dx = F(x) + C, where F'(x) = f(x).",
          "Definite integral gives the signed area under a curve between two limits.",
          "Fundamental Theorem of Calculus links differentiation and integration.",
          "Techniques include substitution, integration by parts, and partial fractions.",
        ],
        sampleQuestion: "Evaluate ∫(3x² + 2x – 1)dx from x = 0 to x = 2.",
      },
      probability: {
        label: "Probability",
        keyPoints: [
          "Probability ranges from 0 (impossible) to 1 (certain).",
          "P(A ∪ B) = P(A) + P(B) – P(A ∩ B) for any two events.",
          "Independent events: P(A ∩ B) = P(A) × P(B).",
          "Conditional probability: P(A|B) = P(A ∩ B) / P(B).",
          "Bayes' theorem updates probability given new evidence.",
        ],
        sampleQuestion: "A fair die is rolled twice. What is the probability of getting a sum of 7?",
      },
    },
  },
};

/**
 * Build the teacher system prompt for a given subject+concept.
 */
export function buildSystemPrompt(subject, conceptKey) {
  const subData = SUBJECTS[subject];
  const concept = subData.concepts[conceptKey];

  const peerRoster = `
Student roster:
- Priya (Topper — answers confidently and correctly)
- Arjun (Average — thinks carefully, mostly right)
- Zoe (Struggling — often confused, gives plausible wrong answers)
- Raj (Topper — razor-sharp, likes to explain)
- Lena (Average — attentive, steady)
- Dev (Struggling — frequently distracted or sleeping)
- Sofia (Average — participates willingly)
- Kai (Average — bit distracted, tries when called)
- [Player] (the student you are speaking to directly — cold-call them at least once)
`.trim();

  let pdfInstructions = '';
  if (concept.pdfContext) {
    pdfInstructions = `\n\n=== SOURCE MATERIAL TO LECTURE FROM ===\n${concept.pdfContext}\n=======================================\n\nBase your ENTIRE lecture exclusively on the source material provided above. Do not use outside knowledge.`;
  } else {
    pdfInstructions = `\nKey points to cover during this session:\n${concept.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
  }

  return `You are Professor Chen, a formal but warm ${subData.label} professor at a college.
Today's topic: "${concept.label}".
${pdfInstructions}

${peerRoster}

Session structure you must follow:
1. Open with a 2–3 sentence introduction of today's concept.
2. Deliver a short lecture (explain 2–3 key points naturally, not as a list).
3. Ask Priya or Raj a question; provide their simulated answer and your feedback.
4. Ask another peer a question; let a struggling student give a wrong answer you correct.
5. Cold-call the [Player] with: "Alright, let's hear from you." Then ask a specific question.
6. After the player answers, evaluate it with a score from 1–5 and give specific feedback.
7. Close with a brief summary of what was covered today.

Tone: Socratic, encouraging, never condescending. Use "we" and "let's" to build inclusion.
Format: Write dialogue naturally — no bullet lists, no markdown headers in speech.
Keep each turn concise (3–6 sentences max unless evaluating).
When evaluating the player's answer, ALWAYS include "SCORE: X/5" somewhere in your response.
When closing, ALWAYS include "KEY TAKEAWAY:" followed by one sentence.`;
}

/**
 * Get peer thought bubble text based on their academic level.
 */
export function getPeerBubble(name) {
  const toppers = ['Priya', 'Raj'];
  const struggling = ['Zoe', 'Dev'];

  if (toppers.includes(name)) {
    const options = ['I know this one.', 'Easy.', 'Already got it.', 'Classic example.'];
    return options[Math.floor(Math.random() * options.length)];
  }
  if (struggling.includes(name)) {
    const options = ['I have no idea...', 'Huh?', 'Wait, what?', 'Can we go back?'];
    return options[Math.floor(Math.random() * options.length)];
  }
  const options = ['Let me think...', 'Sort of makes sense.', 'Getting it...', 'Hmm...'];
  return options[Math.floor(Math.random() * options.length)];
}
