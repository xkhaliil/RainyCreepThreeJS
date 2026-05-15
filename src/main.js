// main.js
// Entry point. Imports trigger every module’s side-effects in order:
//   renderer.js → scene / camera / composer initialised first
//   lights.js   → SpotLight added to scene
//   room.js     → textures, walls, rain mesh added
//   audio.js    → Audio objects created (not yet playing)
//   models.js   → all GLBs begin async loading
//   controls.js → mouse / pointer listeners attached
// Order matters: each module assumes the previous ones have already run.

import gsap from "gsap";

// ─────────────────────────────────────────────
// Core systems (side effects run in import order)
// ─────────────────────────────────────────────
import { camera, stats, _enterBtn, _loadingScreen } from "./renderer.js";
import "./lights.js";
import "./room.js";
import "./audio.js";
import "./models.js";
import "./controls.js";

// Named imports used in the Enter button handler
import { camBase, camLookAt, camState } from "./controls.js";
import { rainAudio } from "./audio.js";
import { animate } from "./animate.js";

// ─────────────────────────────────────────────
// Intro: camera starts pulled back; Enter flies it into the room
// ─────────────────────────────────────────────
// Override the default camera position (1, -1, 5) set in renderer.js.
// This places the camera out in the corridor so the intro fly-in is dramatic.
camera.position.set(1, 2, 10);

// ─────────────────────────────────────────────
// Enter button: dismiss loading screen + intro fly-in
// ─────────────────────────────────────────────
_enterBtn.addEventListener("pointerup", (e) => {
  e.stopPropagation(); // prevent the global pointerup in controls.js from firing too

  stats.dom.style.display = ""; // restore FPS counter (hidden during loading)
  _loadingScreen.classList.add("fade-out");
  setTimeout(() => {
    _loadingScreen.style.display = "none";
  }, 950); // matches CSS transition

  rainAudio.play().catch(() => {}); // start rain ambience (may throw on iOS without prior touch)

  // Fly camera from z=10 to the resting position (camBase.z ≈ 5) over 2.5 s
  camState.transitioning = true;
  gsap.killTweensOf(camera.position); // cancel any existing tween before starting
  gsap.killTweensOf(camLookAt);
  gsap.to(camera.position, {
    x: camBase.x,
    y: camBase.y,
    z: camBase.z,
    duration: 2.5,
    ease: "power3.inOut", // slow start, fast middle, gentle settle
    onComplete: () => {
      camState.transitioning = false;
    }, // re-enable parallax
  });
});

// ─────────────────────────────────────────────
// Start render loop
// ─────────────────────────────────────────────
animate();
