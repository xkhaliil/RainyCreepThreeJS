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
camera.position.set(1, 2, 10);

// ─────────────────────────────────────────────
// Enter button: dismiss loading screen + intro fly-in
// ─────────────────────────────────────────────
_enterBtn.addEventListener("pointerup", (e) => {
  e.stopPropagation();

  stats.dom.style.display = ""; // restore FPS counter
  _loadingScreen.classList.add("fade-out");
  setTimeout(() => { _loadingScreen.style.display = "none"; }, 950);

  rainAudio.play().catch(() => {});

  camState.transitioning = true;
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(camLookAt);
  gsap.to(camera.position, {
    x: camBase.x, y: camBase.y, z: camBase.z,
    duration: 2.5, ease: "power3.inOut",
    onComplete: () => { camState.transitioning = false; },
  });
});

// ─────────────────────────────────────────────
// Start render loop
// ─────────────────────────────────────────────
animate();
