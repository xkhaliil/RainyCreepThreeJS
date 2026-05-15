import * as THREE from "three";
import Stats from "stats.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";

// --- Scene ---
export const scene = new THREE.Scene();

// --- FPS Stats ---
export const stats = new Stats();
stats.showPanel(0); // 0 = FPS
document.body.appendChild(stats.dom);
stats.dom.style.display = "none"; // hidden until Enter is clicked

// --- Loading Screen DOM refs ---
export const _loadingBar = document.getElementById("loading-bar");
export const _loadingPct = document.getElementById("loading-pct");
export const _enterBtn = document.getElementById("enter-btn");
export const _loadingScreen = document.getElementById("loading-screen");

export const loadingManager = new THREE.LoadingManager(
  () => {
    // All assets done — snap to 100 % and reveal Enter button
    _loadingBar.style.width = "100%";
    _loadingPct.textContent = "100%";
    setTimeout(() => _enterBtn.classList.add("visible"), 300);
  },
  (_url, loaded, total) => {
    const pct = Math.round((loaded / total) * 100);
    _loadingBar.style.width = pct + "%";
    _loadingPct.textContent = pct + "%";
  },
);

// --- Camera ---
export const camera = new THREE.PerspectiveCamera(
  78,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(1, -1, 5);

// --- Renderer ---
const canvas = document.getElementById("webgl");
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

export const pmremGenerator = new THREE.PMREMGenerator(renderer);

// --- Post-processing ---
const _bloomW = Math.floor(window.innerWidth);
const _bloomH = Math.floor(window.innerHeight);
export const _bloomRT = new THREE.WebGLRenderTarget(_bloomW, _bloomH);
export const composer = new EffectComposer(renderer, _bloomRT);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(_bloomW, _bloomH),
    0.4, // strength — subtle
    0.5, // radius
    0.9, // threshold — only very bright emissives catch bloom
  ),
);
composer.addPass(new OutputPass());
composer.addPass(
  new SMAAPass(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio(),
  ),
);

// --- Loaders (shared via loadingManager) ---
export const textureLoader = new THREE.TextureLoader(loadingManager);
export const gltfLoader = new GLTFLoader(loadingManager);

// --- EXR Environment (IBL + background) ---
const exrLoader = new EXRLoader(loadingManager);
exrLoader.load("/DaySkyHDRI020A.exr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
});

// --- Resize handler ---
function _onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  const rw = Math.floor(w);
  const rh = Math.floor(h);
  _bloomRT.setSize(rw, rh);
  composer.setSize(w, h);
}
window.addEventListener("resize", _onResize);
// iOS fires visualViewport resize when the address bar shows/hides
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", _onResize);
}
