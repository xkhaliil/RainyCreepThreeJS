import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import Stats from "stats.js";

const scene = new THREE.Scene();

// --- FPS Stats ---
const stats = new Stats();
stats.showPanel(0); // 0 = FPS
document.body.appendChild(stats.dom);
const exrLoader = new EXRLoader();
exrLoader.load("/DaySkyHDRI020A.exr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
});

const camera = new THREE.PerspectiveCamera(
  78,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(1, -1, 5);

const canvas = document.getElementById("webgl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvTexture = pmremGenerator.fromScene(new RoomEnvironment()).texture;

const textureLoader = new THREE.TextureLoader();

const floorTexture = textureLoader.load("/floor_texture.jpg");
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(4, 4);

const wallTexture = textureLoader.load("/wall texture.jpg");
wallTexture.repeat.set(1, 1);

const ceilingTexture = textureLoader.load("/ceilingtexture.jpg");
ceilingTexture.wrapS = THREE.RepeatWrapping;
ceilingTexture.wrapT = THREE.RepeatWrapping;
ceilingTexture.repeat.set(3, 3);

const graffitiTexture = textureLoader.load("/graffiti_texture.jpg");
graffitiTexture.wrapS = THREE.RepeatWrapping;
graffitiTexture.wrapT = THREE.RepeatWrapping;
graffitiTexture.repeat.set(1, 1);

const wallMat = new THREE.MeshStandardMaterial({
  map: wallTexture,
  side: THREE.FrontSide,
});
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture });

// Back wall with window cutout
// Wall: 10 wide, 6 tall. Window centered at (winCX, winCY)
const winW = 3.5,
  winH = 3,
  winCX = -1.5,
  winCY = 0.3;
const wallW = 10,
  wallH = 6;

const leftPanelW = winCX - winW / 2 + wallW / 2;
const rightPanelW = wallW / 2 - winCX - winW / 2;
const topPanelH = wallH / 2 - winCY - winH / 2;
const botPanelH = winCY - winH / 2 + wallH / 2;

const bwPanels = [
  { w: leftPanelW, h: wallH, x: -wallW / 2 + leftPanelW / 2, y: 0 },
  { w: rightPanelW, h: wallH, x: wallW / 2 - rightPanelW / 2, y: 0 },
  { w: winW, h: topPanelH, x: winCX, y: wallH / 2 - topPanelH / 2 },
  { w: winW, h: botPanelH, x: winCX, y: -wallH / 2 + botPanelH / 2 },
];
bwPanels.forEach(({ w, h, x, y }) => {
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
  panel.position.set(x, y, -3);
  panel.receiveShadow = true;
  scene.add(panel);
});

// --- Window ---
const frameThick = 0.1;
const wallDepth = 0.3;
const fz = -3 + wallDepth; // front face of wall (room side) = -2.7

// Reveal planes — show wall thickness inside the opening
const revealMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a9 });
[
  {
    w: winW,
    h: wallDepth,
    rx: Math.PI / 2,
    ry: 0,
    x: winCX,
    y: winCY + winH / 2,
    z: -8 + wallDepth,
  },
  {
    w: winW,
    h: wallDepth,
    rx: -Math.PI / 2,
    ry: 0,
    x: winCX,
    y: winCY - winH / 2,
    z: -3 + wallDepth / 2,
  },
  {
    w: wallDepth,
    h: winH,
    rx: 0,
    ry: Math.PI / 2,
    x: winCX - winW / 2,
    y: winCY,
    z: -3 + wallDepth / 2,
  },
  {
    w: wallDepth,
    h: winH,
    rx: 0,
    ry: -Math.PI / 2,
    x: winCX + winW / 2,
    y: winCY,
    z: -3 + wallDepth / 2,
  },
].forEach(({ w, h, rx, ry, x, y, z }) => {
  const r = new THREE.Mesh(new THREE.PlaneGeometry(w, h), revealMat);
  r.rotation.x = rx;
  r.rotation.y = ry;
  r.position.set(x, y, z);
  scene.add(r);
});

// Outer frame bars spanning full wall depth
const frameMat = new THREE.MeshStandardMaterial({ color: 0x7a5230 });
[
  {
    w: winW + frameThick * 2,
    h: frameThick,
    x: winCX,
    y: winCY + winH / 2 + frameThick / 2,
  },
  {
    w: winW + frameThick * 2,
    h: frameThick,
    x: winCX,
    y: winCY - winH / 2 - frameThick / 2,
  },
  {
    w: frameThick,
    h: winH + frameThick * 2,
    x: winCX - winW / 2 - frameThick / 2,
    y: winCY,
  },
  {
    w: frameThick,
    h: winH + frameThick * 2,
    x: winCX + winW / 2 + frameThick / 2,
    y: winCY,
  },
].forEach(({ w, h, x, y }) => {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallDepth), frameMat);
  bar.position.set(x, y, -3 + wallDepth / 2);
  bar.castShadow = true;
  scene.add(bar);
});

// Cross dividers — 4-pane window
const divThick = frameThick * 0.7;
[
  { w: winW, h: divThick }, // horizontal mid-bar
  { w: divThick, h: winH }, // vertical mid-bar
].forEach(({ w, h }) => {
  const div = new THREE.Mesh(new THREE.BoxGeometry(w, h, divThick), frameMat);
  div.position.set(winCX, winCY, fz - divThick / 2 - 0.01);
  scene.add(div);
});

// Window sill
const sillMat = new THREE.MeshStandardMaterial({ color: 0x9b7a52 });
const sill = new THREE.Mesh(
  new THREE.BoxGeometry(winW + frameThick * 2 + 0.1, 0.07, 0.4),
  sillMat,
);
sill.position.set(
  winCX,
  winCY - winH / 2 - frameThick - 0.035,
  fz + 0.4 / 2 - 0.05,
);
sill.castShadow = true;
sill.receiveShadow = true;
scene.add(sill);

// Sky visible through the window — use background.png
const bgTexture = textureLoader.load("/background.png");
// Shift texture up so skyscrapers sit at the bottom, sky fills top
bgTexture.offset.set(0, 0.15);
bgTexture.repeat.set(1, 1);
const skyMat = new THREE.MeshBasicMaterial({ map: bgTexture });
// Large plane so the city looks far away and fills the whole window view
const skyPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(winW * 2.5, winH * 2.2),
  skyMat,
);
skyPlane.position.set(winCX, winCY - 0.2, -4.5);
scene.add(skyPlane);

// --- Rain outside window ---
const rainCount = 1600;
const rainVerts = new Float32Array(rainCount * 2 * 3);
const rainSpeeds = new Float32Array(rainCount);
const rainXMin = winCX - winW * 1.4;
const rainXMax = winCX + winW * 1.4;
const rainYTop = winCY + winH * 1.2;
const rainYBot = winCY - winH * 1.8;
const rainZMin = -3.6;
const rainZMax = -7.0;
const streakLen = 0.38; // longer streaks
const windDrift = 0.12; // consistent wind angle
for (let i = 0; i < rainCount; i++) {
  const x = rainXMin + Math.random() * (rainXMax - rainXMin);
  const y = rainYBot + Math.random() * (rainYTop - rainYBot);
  const z = rainZMin + Math.random() * (rainZMax - rainZMin);
  rainVerts[i * 6 + 0] = x + windDrift; // top (wind-shifted)
  rainVerts[i * 6 + 1] = y;
  rainVerts[i * 6 + 2] = z;
  rainVerts[i * 6 + 3] = x;
  rainVerts[i * 6 + 4] = y - streakLen;
  rainVerts[i * 6 + 5] = z;
  rainSpeeds[i] = 0.18 + Math.random() * 0.1; // very fast
}
const rainGeo = new THREE.BufferGeometry();
const rainPosAttr = new THREE.BufferAttribute(rainVerts, 3);
rainPosAttr.setUsage(THREE.DynamicDrawUsage);
rainGeo.setAttribute("position", rainPosAttr);
const rainMesh = new THREE.LineSegments(
  rainGeo,
  new THREE.LineBasicMaterial({
    color: 0xc8e0ff,
    transparent: true,
    opacity: 0.35,
  }),
);
scene.add(rainMesh);

// --- All audio ---
const rainAudio = new Audio("/rain_sound.mp3");
rainAudio.loop = true;
rainAudio.volume = 0.5;

const switchSound = new Audio("/light_switch_on.mp3");
switchSound.volume = 0.7;

const thunderAudio = new Audio("/thunder_sound.mp3");
thunderAudio.volume = 0.9;

const creepAudio = new Audio("/creep.mp3?v=" + Date.now());
creepAudio.loop = false;
creepAudio.volume = 0.85;
creepAudio.preload = "auto";

// Unlock rain + switch sounds on first user gesture; creepAudio is always
// triggered by an explicit click so it doesn't need pre-priming here.
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

// Window glass — transparent with subtle tint
const glassMat = new THREE.MeshStandardMaterial({
  color: 0xaaccee,
  transparent: true,
  opacity: 0.08,
  roughness: 0.0,
  metalness: 0.1,
  side: THREE.DoubleSide,
});
const windowGlass = new THREE.Mesh(
  new THREE.PlaneGeometry(winW, winH),
  glassMat,
);
windowGlass.position.set(winCX, winCY, fz - 0.02);
scene.add(windowGlass);

// Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3;
floor.receiveShadow = true;
scene.add(floor);

// Ceiling
const ceilingMat = new THREE.MeshStandardMaterial({ map: ceilingTexture });
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 3;
scene.add(ceiling);

// Left wall
const leftWallMat = new THREE.MeshStandardMaterial({
  map: graffitiTexture,
  side: THREE.FrontSide,
});
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), leftWallMat);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.x = -5;
leftWall.receiveShadow = true;
scene.add(leftWall);

// Right wall
const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallMat);
rightWall.rotation.y = -Math.PI / 2;
rightWall.position.x = 5;
rightWall.receiveShadow = true;
scene.add(rightWall);

// --- Ceiling Lamp Light (SpotLight pointing straight down) ---
const lampLight = new THREE.SpotLight(0xffd97d, 40, 18, Math.PI / 4, 0.4, 1.5);
lampLight.position.set(0, 2.8, 0);
lampLight.target.position.set(0, -3, 0); // aim at floor center
lampLight.castShadow = true;
lampLight.shadow.mapSize.width = 1024;
lampLight.shadow.mapSize.height = 1024;
scene.add(lampLight);
scene.add(lampLight.target);

// Very dim ambient so corners aren't pitch black
const ambient = new THREE.AmbientLight(0x221a10, 1);
scene.add(ambient);

// --- Table ---
const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b1f0e });

const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), tableMat);
tableTop.position.set(4.48, -1.5, -1.5);
tableTop.rotation.y = Math.PI / 2; // long side now runs along Z, facing left wall
tableTop.castShadow = true;
tableTop.receiveShadow = true;
scene.add(tableTop);
[
  [4.88, -0.6],
  [4.08, -0.6],
  [4.88, -2.4],
  [4.08, -2.4],
].forEach(([x, z]) => {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), tableMat);
  leg.position.set(x, -2.2, z);
  leg.castShadow = true;
  scene.add(leg);
});

// --- Ceiling Lamp Model ---
const gltfLoader = new GLTFLoader();
window._ceilingLamp = { wrapper: null, on: true };
gltfLoader.load(
  "/ceiling lamp.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -2;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.set(0, 3 - box2.max.y, 0);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    scene.add(wrapper);
    window._ceilingLamp.wrapper = wrapper;
  },
  undefined,
  (err) => console.error("Ceiling lamp load error:", err),
);

// --- Bed ---
gltfLoader.load(
  "/bed.glb",
  (gltf) => {
    const inner = gltf.scene;

    // Scale so the longest horizontal dimension = 3.5 units
    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 4.5 / Math.max(rawSize.x, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = 0;

    // Center the inner model at origin inside a wrapper
    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const centeredBox = new THREE.Box3().setFromObject(wrapper);
    const center = centeredBox.getCenter(new THREE.Vector3());
    inner.position.sub(center); // shift inner so wrapper's bbox is centered at 0

    // Recompute wrapper bbox and snap to walls
    const box = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.x = -5 - box.min.x; // left side touches left wall
    wrapper.position.z = -2 - box.min.z; // headboard touches back wall
    wrapper.position.y = -3 - box.min.y; // sits on floor

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Bed load error:", err),
);

// --- Computer ---
// Table surface: center (4.48, -1.45, -1.5), x-extent ±0.5, z-extent ±1
const tableTopY = -1.45;
const tableCX = 4.48;
const tableCZ = -1.5;

window._computer = { wrapper: null, mixer: null, clip: null };
gltfLoader.load(
  "/computer.glb",
  (gltf) => {
    const inner = gltf.scene;

    // Scale so the longest horizontal dimension ≈ 0.7 units
    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 2 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -Math.PI / 2; // face toward the bed (left wall direction)

    // Wrap and center geometry at origin
    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    // Recompute and place on table surface, centered on table
    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.set(tableCX, tableTopY - box2.min.y, tableCZ);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Make screen mesh emissive blue-white
        if (child.material) {
          child.material.emissive = new THREE.Color(0x88ccff);
          child.material.emissiveIntensity = 4.0;
        }
      }
    });
    scene.add(wrapper);
    window._computer.wrapper = wrapper;
    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(inner);
      window._computer.mixer = mixer;
      window._computer.clip = gltf.animations[0];
    }

    // SpotLight shining from the screen toward the room
    const screenSpot1 = new THREE.SpotLight(
      0x88ccff,
      18,
      6,
      Math.PI / 6,
      0.5,
      2,
    );
    screenSpot1.position.set(
      wrapper.position.x - 0.8,
      wrapper.position.y + 0.6,
      wrapper.position.z,
    );
    screenSpot1.target.position.set(
      wrapper.position.x - 3,
      wrapper.position.y - 0.5,
      wrapper.position.z,
    );
    screenSpot1.castShadow = false;
    scene.add(screenSpot1);
    scene.add(screenSpot1.target);
  },
  undefined,
  (err) => console.error("Computer load error:", err),
);

// --- Plant (next to table) ---
gltfLoader.load(
  "/plant.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Place on floor, just in front of the table's left-front corner
    wrapper.position.set(4.7, -3 - box2.min.y, -0.2);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Plant load error:", err),
);

// --- Speaker (next to plant) ---
window._speaker = { wrapper: null };
gltfLoader.load(
  "/speaker.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1.7 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = Math.PI / 1;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.set(2.8, -3 - box2.min.y, 1.5);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(wrapper);
    window._speaker.wrapper = wrapper;
  },
  undefined,
  (err) => console.error("Speaker load error:", err),
);

// --- Chair (in front of table) ---
gltfLoader.load(
  "/chair.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1.9 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);

    // Rotate to face the left wall, then 45 degrees to the right
    inner.rotation.y = Math.PI / 4;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Place on floor, centered on table x, in front of table's front edge (z=-0.5)
    wrapper.position.set(3.2, -3 - box2.min.y, -2);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Chair load error:", err),
);

// --- TV (on the floor, against the back wall, right of window) ---
window._tv = { wrapper: null, mixer: null, mesh: null };
gltfLoader.load(
  "/tv.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 2.5 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -Math.PI / 2; // face toward the camera

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.x = 0.5;
    wrapper.position.y = -3 - box2.min.y;
    wrapper.position.z = -1 - box2.min.z;

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(wrapper);

    window._tv.wrapper = wrapper;
    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(inner);
      window._tv.mixer = mixer;
      window._tv.clip = gltf.animations[0];
    }
  },
  undefined,
  (err) => console.error("TV load error:", err),
);

// --- Neon Sign (back wall, right of window) ---
gltfLoader.load(
  "/neon sign.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 2.9 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = Math.PI / 2; // face toward the room

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Mount on back wall, right of window (window right edge ~x=0.25)
    wrapper.position.x = 2.5;
    wrapper.position.y = 0.5; // mid-upper height on wall
    wrapper.position.z = -2.7 - box2.max.z + 0.02; // flush against front face of back wall

    const neonColor = new THREE.Color(0xff2ef7); // pink/magenta neon
    const neonMeshes = [];
    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.material = new THREE.MeshStandardMaterial({
          color: neonColor,
          emissive: neonColor,
          emissiveIntensity: 3.0,
          roughness: 0.4,
          metalness: 0.0,
        });
        neonMeshes.push(child);
      }
    });
    scene.add(wrapper);

    // PointLight to cast neon glow into the room
    const neonLight = new THREE.PointLight(0xff2ef7, 3, 5);
    neonLight.position.set(
      wrapper.position.x - 0.3,
      wrapper.position.y,
      wrapper.position.z + 0.5,
    );
    scene.add(neonLight);

    // Flicker logic — stored on window for animate loop access
    window._neonFlicker = {
      light: neonLight,
      meshes: neonMeshes,
      timer: 0,
      flickering: false,
    };
  },
  undefined,
  (err) => console.error("Neon sign load error:", err),
);

// --- Posters (right wall) ---
gltfLoader.load(
  "/posters.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 3.5 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -Math.PI / 2; // face left toward room interior

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Mount just inside right wall (x=5), centered in z, at mid height
    wrapper.position.x = 5 - box2.max.x - 0.05;
    wrapper.position.y = 0.5;
    wrapper.position.z = -1;

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = true;
        // Keep original material, slightly dim the color
        if (child.material) {
          child.material.color.multiplyScalar(0.25);
        }
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Posters load error:", err),
);

// --- Curtain (hanging at window) ---
window._curtain = {
  wrapper: null,
  mixer: null,
  windAction: null,
  openClip: null,
  opened: false,
};
gltfLoader.load(
  "/curtain.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 5.5 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = 0;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.x = winCX - 0.9;
    wrapper.position.y = winCY + winH / 1.5 - box2.max.y;
    wrapper.position.z = -2.25 + 0.05;

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(wrapper);
    window._curtain.wrapper = wrapper;

    // Soft daylight leaking through the curtain into the room
    const curtainLight = new THREE.PointLight(0xb8d4f0, 2.5, 8, 1.8);
    curtainLight.position.set(winCX, winCY, -2.1);
    scene.add(curtainLight);
    window._curtainLight = curtainLight; // used by thunder effect

    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(wrapper);
      window._curtainMixer = mixer;
      window._curtain.mixer = mixer;

      // Idle wind sway — loops continuously
      const windClip =
        gltf.animations.find((a) => a.name === "Armature|Vento Forte") ||
        gltf.animations[0];
      const windAction = mixer.clipAction(windClip);
      windAction.setLoop(THREE.LoopRepeat, Infinity);
      windAction.play();
      window._curtain.windAction = windAction;

      // Open clip — triggered on click
      const openClip =
        gltf.animations.find((a) => a.name === "Armature|Abrindo") || null;
      window._curtain.openClip = openClip;
    }
  },
  undefined,
  (err) => console.error("Curtain load error:", err),
);

// --- Mini Table (next to bed, against left wall) ---
gltfLoader.load(
  "/minitable.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = 0;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Snap to left wall (x), sit on floor (y), place beside the bed toward the camera (z)
    wrapper.position.x = -4.7 - box2.min.x; // flush left wall
    wrapper.position.y = -3 - box2.min.y; // sit on floor
    wrapper.position.z = -3 + 3.5 - box2.min.z; // beside bed foot (bed depth ~3.5)

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(wrapper);

    // Compute world-space table top Y and center X/Z for lamp placement
    const tableTopY = wrapper.position.y + box2.max.y;
    const tableCenterX = wrapper.position.x;
    const tableCenterZ = wrapper.position.z;

    // --- Lamp on top of mini table ---
    gltfLoader.load(
      "/lamp.glb",
      (gltf2) => {
        const lInner = gltf2.scene;

        const lRaw = new THREE.Box3().setFromObject(lInner);
        const lRawSize = lRaw.getSize(new THREE.Vector3());
        const lScale = 0.8 / Math.max(lRawSize.x, lRawSize.y, lRawSize.z);
        lInner.scale.setScalar(lScale);
        lInner.rotation.y = 0;

        const lWrapper = new THREE.Group();
        lWrapper.add(lInner);
        const lBox = new THREE.Box3().setFromObject(lWrapper);
        const lCenter = lBox.getCenter(new THREE.Vector3());
        lInner.position.sub(lCenter);

        const lBox2 = new THREE.Box3().setFromObject(lWrapper);
        lWrapper.position.set(
          tableCenterX,
          tableTopY - lBox2.min.y,
          tableCenterZ,
        );

        const lampMeshes = [];
        lWrapper.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffdd88,
              emissive: new THREE.Color(0xffaa33),
              emissiveIntensity: 2.0,
              roughness: 0.6,
              metalness: 0.1,
            });
            lampMeshes.push(child);
          }
        });
        scene.add(lWrapper);

        // PointLight shining from the lamp shade downward
        const tableLight = new THREE.PointLight(0xffaa33, 1.5, 3);
        tableLight.position.set(
          lWrapper.position.x,
          lWrapper.position.y + lBox2.max.y,
          lWrapper.position.z,
        );
        tableLight.castShadow = true;
        scene.add(tableLight);

        window._deskLamp = {
          wrapper: lWrapper,
          light: tableLight,
          meshes: lampMeshes,
          on: true,
        };
      },
      undefined,
      (err) => console.error("Lamp load error:", err),
    );
  },
  undefined,
  (err) => console.error("Mini table load error:", err),
);

// --- Resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Mouse parallax ---
const mouse = { x: 0, y: 0 };
const smoothMouse = { x: 0, y: 0 };
const camBase = {
  x: camera.position.x,
  y: camera.position.y,
  z: camera.position.z,
};
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

// --- TV click interaction ---
// States: 0=idle, 1=focused, 2=playing
const tvState = { phase: 0, forward: true };
const computerState = { phase: 0, forward: true };
const speakerState = { phase: 0 };
const raycaster = new THREE.Raycaster();
const clickNDC = new THREE.Vector2();

function handleModelClick(e, modelRef, state, focusCamFn) {
  if (!modelRef || !modelRef.wrapper) return;
  if (state.phase === 0) {
    clickNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    clickNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(clickNDC, camera);
    const hits = raycaster.intersectObject(modelRef.wrapper, true);
    if (hits.length > 0) state.phase = 1;
  } else if (state.phase === 1) {
    if (modelRef.mixer && modelRef.clip) {
      const action = modelRef.mixer.clipAction(modelRef.clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      if (state.forward) {
        // Play forward from start
        action.reset();
        action.timeScale = 1;
        action.play();
        state.forward = false;
      } else {
        // Play in reverse from end — reset first, then override time
        action.reset();
        action.timeScale = -1;
        action.time = modelRef.clip.duration;
        action.play();
        state.forward = true;
      }
    }
    state.phase = 2;
  } else if (state.phase === 2) {
    // Return camera only — animation stays frozen
    state.phase = 0;
  }
}

window.addEventListener("click", (e) => {
  clickNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  clickNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(clickNDC, camera);

  // --- Ceiling lamp toggle ---
  if (window._ceilingLamp && window._ceilingLamp.wrapper) {
    if (
      raycaster.intersectObject(window._ceilingLamp.wrapper, true).length > 0
    ) {
      window._ceilingLamp.on = !window._ceilingLamp.on;
      lampLight.intensity = window._ceilingLamp.on ? 40 : 0;
      switchSound.currentTime = 0;
      switchSound.play().catch(() => {});
      return;
    }
  }

  // --- Desk lamp toggle ---
  if (window._deskLamp && window._deskLamp.wrapper) {
    if (raycaster.intersectObject(window._deskLamp.wrapper, true).length > 0) {
      window._deskLamp.on = !window._deskLamp.on;
      window._deskLamp.light.intensity = window._deskLamp.on ? 1.5 : 0;
      window._deskLamp.meshes.forEach((m) => {
        m.material.emissiveIntensity = window._deskLamp.on ? 2.0 : 0;
      });
      switchSound.currentTime = 0;
      switchSound.play().catch(() => {});
      return;
    }
  }

  // --- Curtain toggle ---
  const curt = window._curtain;
  if (curt && curt.wrapper && curt.mixer && curt.openClip) {
    if (raycaster.intersectObject(curt.wrapper, true).length > 0) {
      const openAction = curt.mixer.clipAction(curt.openClip);
      openAction.setLoop(THREE.LoopOnce, 1);
      openAction.clampWhenFinished = true;
      if (!curt.opened) {
        if (curt.windAction) curt.windAction.stop();
        openAction.reset();
        openAction.timeScale = 1;
        openAction.play();
        curt.opened = true;
      } else {
        openAction.reset();
        openAction.timeScale = -1;
        openAction.time = curt.openClip.duration;
        openAction.play();
        curt.opened = false;
        const onFinished = (ev) => {
          if (ev.action === openAction) {
            curt.mixer.removeEventListener("finished", onFinished);
            openAction.stop();
            if (curt.windAction) {
              curt.windAction.reset();
              curt.windAction.setLoop(THREE.LoopRepeat, Infinity);
              curt.windAction.play();
            }
          }
        };
        curt.mixer.addEventListener("finished", onFinished);
      }
      return;
    }
  }

  // --- TV / Computer / Speaker (one active at a time) ---
  const speakerActive = speakerState.phase > 0;

  if (tvState.phase > 0) {
    handleModelClick(e, window._tv, tvState, null);
  } else if (computerState.phase > 0) {
    handleModelClick(e, window._computer, computerState, null);
  } else if (speakerActive) {
    if (speakerState.phase === 1) {
      if (creepAudio.paused) {
        creepAudio.currentTime = 0;
        creepAudio.play().catch((err) => {
          // Recover from any cached error state by reloading the source
          console.warn("creep play failed (retrying):", err);
          creepAudio.src = "/creep.mp3?v=" + Date.now();
          creepAudio.load();
          creepAudio
            .play()
            .catch((err2) => console.error("creep retry failed:", err2));
        });
      } else {
        creepAudio.pause();
      }
      speakerState.phase = 2;
    } else if (speakerState.phase === 2) {
      speakerState.phase = 0;
    }
  } else {
    handleModelClick(e, window._tv, tvState, null);
    if (tvState.phase === 0)
      handleModelClick(e, window._computer, computerState, null);
    if (
      tvState.phase === 0 &&
      computerState.phase === 0 &&
      window._speaker &&
      window._speaker.wrapper
    ) {
      if (raycaster.intersectObject(window._speaker.wrapper, true).length > 0)
        speakerState.phase = 1;
    }
  }
});

// --- Clock for animation mixers ---
const clock = new THREE.Clock();

// --- Thunder state ---
const thunder = {
  nextStrike: 10 + Math.random() * 20, // seconds until first strike
  phase: "idle", // 'idle' | 'flashing'
  elapsed: 0,
  baseIntensity: 2.5,
};

// --- Loop ---
const camLookAt = new THREE.Vector3(0, 0, 0); // smoothed look target
function animate() {
  smoothMouse.x += (mouse.x - smoothMouse.x) * 0.03;
  smoothMouse.y += (mouse.y - smoothMouse.y) * 0.03;

  if (
    tvState.phase === 0 &&
    computerState.phase === 0 &&
    speakerState.phase === 0
  ) {
    // Default: parallax
    const targetX = camBase.x + smoothMouse.x * 0.4;
    const targetY = camBase.y - smoothMouse.y * 0.2;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.position.z += (camBase.z - camera.position.z) * 0.03;
    const lookTarget = new THREE.Vector3(
      smoothMouse.x * 0.6,
      -smoothMouse.y * 0.3,
      0,
    );
    camLookAt.lerp(lookTarget, 0.05);
  } else if (tvState.phase > 0) {
    // Focused on TV
    const tv = window._tv;
    const tvPos =
      tv && tv.wrapper
        ? new THREE.Vector3().setFromMatrixPosition(tv.wrapper.matrixWorld)
        : new THREE.Vector3(0.5, -1, -1);
    const focusCam = new THREE.Vector3(
      tvPos.x - 0.1,
      tvPos.y + 0.6,
      tvPos.z + 3.5,
    );
    camera.position.lerp(focusCam, 0.03);
    camLookAt.lerp(tvPos, 0.03);
  } else if (computerState.phase > 0) {
    // Focused on computer
    const comp = window._computer;
    const compPos =
      comp && comp.wrapper
        ? new THREE.Vector3().setFromMatrixPosition(comp.wrapper.matrixWorld)
        : new THREE.Vector3(tableCX, tableTopY, tableCZ);
    const focusCam = new THREE.Vector3(
      compPos.x - 2.5,
      compPos.y + 0.5,
      compPos.z + 1.5,
    );
    camera.position.lerp(focusCam, 0.03);
    camLookAt.lerp(compPos, 0.03);
  } else if (speakerState.phase > 0) {
    // Focused on speaker
    const spk = window._speaker;
    const spkPos =
      spk && spk.wrapper
        ? new THREE.Vector3().setFromMatrixPosition(spk.wrapper.matrixWorld)
        : new THREE.Vector3(2.8, -2, 1.5);
    const focusCam = new THREE.Vector3(
      spkPos.x - 2.0,
      spkPos.y + 0.4,
      spkPos.z + 2.0,
    );
    camera.position.lerp(focusCam, 0.03);
    camLookAt.lerp(spkPos, 0.03);
  }
  camera.lookAt(camLookAt);

  // Neon flicker
  if (window._neonFlicker) {
    const f = window._neonFlicker;
    f.timer -= 1;
    if (f.timer <= 0) {
      if (f.flickering) {
        // end of flicker burst — restore and schedule next burst
        f.light.intensity = 3;
        f.meshes.forEach((m) => (m.material.emissiveIntensity = 3.0));
        f.flickering = false;
        f.timer = Math.random() * 300 + 100; // wait 100-400 frames
      } else {
        // start a short flicker
        const on = Math.random() > 0.5;
        f.light.intensity = on ? 3 : 0;
        f.meshes.forEach(
          (m) => (m.material.emissiveIntensity = on ? 3.0 : 0.1),
        );
        f.timer = Math.floor(Math.random() * 6) + 1; // 1-6 frames
        f.flickering = Math.random() > 0.6; // 40% chance burst ends after this
      }
    }
  }

  const delta = clock.getDelta();

  // --- Thunder flash ---
  if (window._curtainLight) {
    if (thunder.phase === "idle") {
      thunder.nextStrike -= delta;
      if (thunder.nextStrike <= 0) {
        thunder.phase = "flashing";
        thunder.elapsed = 0;
        // Thunder sound arrives 1.6-2.4 s after the flash
        const delay = 1600 + Math.random() * 800;
        setTimeout(() => {
          thunderAudio.currentTime = 0;
          thunderAudio.play().catch(() => {});
        }, delay);
      }
    } else {
      thunder.elapsed += delta;
      const t = thunder.elapsed;
      let fl = thunder.baseIntensity;
      // Two quick white-blue flashes then fade
      if (t < 0.06) fl = 900;
      else if (t < 0.14)
        fl = THREE.MathUtils.lerp(
          900,
          thunder.baseIntensity,
          (t - 0.06) / 0.08,
        );
      else if (t < 0.22) fl = 500;
      else if (t < 0.42)
        fl = THREE.MathUtils.lerp(500, thunder.baseIntensity, (t - 0.22) / 0.2);
      else {
        fl = thunder.baseIntensity;
        thunder.phase = "idle";
        thunder.nextStrike = 15 + Math.random() * 30;
      }
      window._curtainLight.intensity = fl;
      // Expand light range during flash so it floods the whole room
      window._curtainLight.distance = fl > thunder.baseIntensity + 1 ? 40 : 8;
    }
  }

  if (window._curtainMixer) window._curtainMixer.update(delta);
  if (window._tv && window._tv.mixer) window._tv.mixer.update(delta);
  if (window._computer && window._computer.mixer)
    window._computer.mixer.update(delta);

  // Animate rain
  const rp = rainMesh.geometry.attributes.position;
  for (let i = 0; i < rainCount; i++) {
    const topY = rp.getY(i * 2);
    const spd = rainSpeeds[i];
    if (topY - streakLen < rainYBot) {
      const nx = rainXMin + Math.random() * (rainXMax - rainXMin);
      const nz = rainZMin + Math.random() * (rainZMax - rainZMin);
      rp.setXYZ(i * 2, nx + windDrift, rainYTop + Math.random() * 0.5, nz);
      rp.setXYZ(i * 2 + 1, nx, rainYTop + Math.random() * 0.5 - streakLen, nz);
    } else {
      rp.setY(i * 2, topY - spd);
      rp.setY(i * 2 + 1, rp.getY(i * 2 + 1) - spd);
    }
  }
  rp.needsUpdate = true;

  stats.begin();
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(animate);
}
animate();
