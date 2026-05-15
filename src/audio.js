// audio.js
// Creates every Audio instance the scene uses and wires up the iOS audio-unlock
// workaround. Plain HTML Audio elements are used rather than Three.js
// PositionalAudio because none of these sounds need 3D spatial positioning.

// --- Rain (ambient loop) ---
// Starts as soon as the player clicks Enter (main.js).
export const rainAudio = new Audio("/rain_sound.mp3");
rainAudio.loop = true;
rainAudio.volume = 0.5; // quiet enough not to drown out other sounds

// --- Light switch click ---
// Played whenever the ceiling lamp or desk lamp is toggled.
export const switchSound = new Audio("/light_switch_on.mp3");
switchSound.volume = 0.7;

// --- Thunder rumble ---
// Triggered by animate.js with a 1.6–2.4 s delay after the visual lightning
// flash so it feels like sound travelling from a distance.
export const thunderAudio = new Audio("/thunder_sound.mp3");
thunderAudio.volume = 0.9;

// --- Creep easter-egg track ---
// Played when the player clicks the speaker a second time.
// The ?v= cache-buster forces a fresh fetch in case the browser has a stale
// partial-range cached version that causes a playback hiccup on some browsers.
export const creepAudio = new Audio("/creep.mp3?v=" + Date.now());
creepAudio.loop = false;
creepAudio.volume = 0.85;
creepAudio.preload = "auto"; // pre-buffer so there’s no lag on first play

// --- iOS audio unlock ---
// Mobile browsers suspend audio until a user gesture fires. We silently play
// (then immediately pause) sounds on the very first gesture so they’re primed
// for instant playback when triggered later.
// creepAudio is deliberately excluded — it’s always triggered by an explicit
// click so the browser allows it without pre-priming.
const _unlockAudio = () => {
  [rainAudio, switchSound].forEach((a) => {
    a.play()
      .then(() => {
        // Pause everything that isn’t supposed to be playing yet
        if (a !== rainAudio) {
          a.pause();
          a.currentTime = 0; // rewind so it plays from the start when triggered
        }
      })
      .catch(() => {}); // swallow NotAllowedError — already unlocked
  });
  // Remove all listeners once the first gesture fires; only one unlock needed
  window.removeEventListener("click", _unlockAudio);
  window.removeEventListener("keydown", _unlockAudio);
  window.removeEventListener("pointermove", _unlockAudio);
};
window.addEventListener("click", _unlockAudio);
window.addEventListener("keydown", _unlockAudio);
window.addEventListener("pointermove", _unlockAudio); // fires on first touch-move on iOS
