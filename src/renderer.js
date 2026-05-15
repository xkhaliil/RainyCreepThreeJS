// renderer.js
// Sets up every piece of core infrastructure that the rest of the app depends on:
// Three.js scene, camera, WebGL renderer, post-processing pipeline, shared loaders,
// loading-screen DOM wiring, and the window-resize handler.
// Everything here is exported so other modules can import only what they need.

import * as THREE from "three";
import Stats from "stats.js"; // lightweight FPS / memory panel
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js"; // high-dynamic-range HDRI
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"; // 3D model loader
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"; // render pipeline
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"; // base scene pass
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"; // glow on bright emissives
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js"; // tone mapping output
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js"; // sub-pixel anti-aliasing

// --- Scene ---
// Root container for all 3D objects, lights, and the environment map.
export const scene = new THREE.Scene();

// --- FPS Stats ---
// Shown in the top-left corner during development. Hidden initially; revealed
// by main.js once the user clicks the Enter button on the loading screen.
export const stats = new Stats();
stats.showPanel(0); // panel 0 = FPS (1 = MS per frame, 2 = MB memory)
document.body.appendChild(stats.dom);
stats.dom.style.display = "none"; // hidden until Enter is clicked

// --- Loading Screen DOM refs ---
// Grabbed once here and exported so main.js can attach the Enter button handler
// without querying the DOM a second time.
export const _loadingBar = document.getElementById("loading-bar");
export const _loadingPct = document.getElementById("loading-pct");
export const _enterBtn = document.getElementById("enter-btn");
export const _loadingScreen = document.getElementById("loading-screen");

// LoadingManager is passed to every loader (texture, GLTF, EXR) so their
// individual progress events are aggregated into one progress bar.
export const loadingManager = new THREE.LoadingManager(
  // onLoad — fires once ALL registered loaders have finished
  () => {
    // Snap bar to 100 % (in case rounding left it at 99) then reveal Enter
    _loadingBar.style.width = "100%";
    _loadingPct.textContent = "100%";
    // Small delay so the user can see the completed bar before the button appears
    setTimeout(() => _enterBtn.classList.add("visible"), 300);
  },
  // onProgress — fires after each individual item finishes loading
  (_url, loaded, total) => {
    const pct = Math.round((loaded / total) * 100);
    _loadingBar.style.width = pct + "%";
    _loadingPct.textContent = pct + "%";
  },
);

// --- Camera ---
// 78 ° FOV gives a natural "looking into a room" perspective without too much
// distortion. Near/far planes are tight (0.1 / 100) to maximise depth-buffer
// precision at this scale. Position is overridden in main.js to z=10 for the
// intro fly-in; the resting position (1, -1, 5) is captured in controls.js.
export const camera = new THREE.PerspectiveCamera(
  78, // field of view in degrees
  window.innerWidth / window.innerHeight, // aspect ratio — updated on resize
  0.1, // near clip plane
  100, // far clip plane
);
camera.position.set(1, -1, 5); // resting position (slightly right and low)

// --- Renderer ---
// antialias:true on the WebGLRenderer has no effect once EffectComposer takes
// over (it renders to an off-screen RT), but it's kept as a safety net in case
// the composer is ever bypassed during debugging.
const canvas = document.getElementById("webgl");
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Cap pixel ratio at 2 — retina screens beyond 2× offer no visible benefit
// but double (or quadruple) the fragment work.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
// PCFSoft gives smooth penumbra edges at the cost of a few extra shadow-map
// samples per fragment. Acceptable for a single SpotLight at 512×512.
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// SRGBColorSpace ensures textures are correctly linearised before lighting.
renderer.outputColorSpace = THREE.SRGBColorSpace;
// ACESFilmic maps HDR values to the display range with pleasing contrast and
// natural highlight roll-off. Exposure 0.5 keeps the scene intentionally dark.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

// PMREMGenerator pre-filters the EXR into a prefiltered mip-map radiance
// environment map (PMREM) used for physically based reflections.
export const pmremGenerator = new THREE.PMREMGenerator(renderer);

// --- Post-processing pipeline ---
// Pass order matters: RenderPass → Bloom → OutputPass (tone map) → SMAA (AA)
//
// We supply an explicit WebGLRenderTarget (_bloomRT) to the composer so we
// control its exact pixel size (floored integers avoid sub-pixel artefacts on
// high-DPI screens where innerWidth is a non-integer logical pixel value).
const _bloomW = Math.floor(window.innerWidth);
const _bloomH = Math.floor(window.innerHeight);
export const _bloomRT = new THREE.WebGLRenderTarget(_bloomW, _bloomH);
export const composer = new EffectComposer(renderer, _bloomRT);

// 1. Render the scene normally into the composer's internal RT.
composer.addPass(new RenderPass(scene, camera));

// 2. Bloom — adds a glow halo around pixels above the luminance threshold.
//    strength 0.4 = subtle; radius 0.5; threshold 0.9 means only neon/screen
//    emissives (emissiveIntensity >= ~1.5) visibly bloom. Low-intensity lights
//    and wall textures are untouched.
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(_bloomW, _bloomH),
    0.4, // strength — subtle glow, not a music-video effect
    0.5, // radius — how far the glow spreads
    0.9, // threshold — only very bright emissives catch bloom
  ),
);

// 3. OutputPass applies ACESFilmic tone mapping and converts to sRGB for display.
composer.addPass(new OutputPass());

// 4. SMAA (Subpixel Morphological Anti-Aliasing) at physical pixel resolution.
//    Runs after tone mapping so it operates on final LDR values, which is correct.
composer.addPass(
  new SMAAPass(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio(),
  ),
);

// --- Loaders (shared via loadingManager) ---
// Passing loadingManager to each loader registers them with the aggregated
// progress/complete callbacks defined above.
export const textureLoader = new THREE.TextureLoader(loadingManager);
export const gltfLoader = new GLTFLoader(loadingManager);

// --- EXR Environment map (IBL + background) ---
// The HDRI is used for two purposes:
//   scene.background  — drawn as the sky/backdrop behind all geometry
//   scene.environment — drives physically based specular reflections (IBL)
// The HDRI is a *daytime* sky which was deliberately chosen for reflections only;
// the actual scene illumination comes from placed lights (see lights.js).
const exrLoader = new EXRLoader(loadingManager);
exrLoader.load("/DaySkyHDRI020A.exr", (texture) => {
  // EquirectangularReflectionMapping tells Three.js how to sample the panorama.
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture; // show raw HDR panorama as sky behind the room
  // fromEquirectangular() pre-filters the panorama into a PMREM cube map used
  // for specular highlights on materials with roughness < 1.
  scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
});

// --- Resize handler ---
// Called whenever the viewport changes size. Updates camera projection, the
// renderer output, and all render targets that depend on pixel dimensions.
function _onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Keep the camera frustum matching the new aspect ratio
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);

  // Floor the RT dimensions for the same reason they were floored at init
  const rw = Math.floor(w);
  const rh = Math.floor(h);
  _bloomRT.setSize(rw, rh);
  composer.setSize(w, h); // also resizes all intermediate composer RTs
}
window.addEventListener("resize", _onResize);

// On iOS Safari, showing/hiding the address bar changes the visible viewport
// height but does NOT fire a window 'resize' event — only visualViewport does.
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", _onResize);
}
