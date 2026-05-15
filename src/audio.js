// --- All audio instances ---
export const rainAudio = new Audio("/rain_sound.mp3");
rainAudio.loop = true;
rainAudio.volume = 0.5;

export const switchSound = new Audio("/light_switch_on.mp3");
switchSound.volume = 0.7;

export const thunderAudio = new Audio("/thunder_sound.mp3");
thunderAudio.volume = 0.9;

export const creepAudio = new Audio("/creep.mp3?v=" + Date.now());
creepAudio.loop = false;
creepAudio.volume = 0.85;
creepAudio.preload = "auto";

// Unlock rain + switch sounds on first user gesture.
// creepAudio is always triggered by an explicit click so it doesn't need pre-priming here.
const _unlockAudio = () => {
  [rainAudio, switchSound].forEach((a) => {
    a.play()
      .then(() => {
        if (a !== rainAudio) {
          a.pause();
          a.currentTime = 0;
        }
      })
      .catch(() => {});
  });
  window.removeEventListener("click", _unlockAudio);
  window.removeEventListener("keydown", _unlockAudio);
  window.removeEventListener("pointermove", _unlockAudio);
};
window.addEventListener("click", _unlockAudio);
window.addEventListener("keydown", _unlockAudio);
window.addEventListener("pointermove", _unlockAudio);
