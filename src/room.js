// room.js
// Builds all static room geometry and the GPU rain mesh, then adds them to the
// scene. Nothing is exported except the window-opening constants (used by
// models.js to position the curtain) and the rainMesh (used by animate.js to
// update the uTime shader uniform each frame).
import * as THREE from "three";
import { scene, textureLoader } from "./renderer.js";
import rainVertexShader from "./shaders/rainVertex.js";
import rainFragShader from "./shaders/rainFrag.js";

// ─────────────────────────────────────────────
// Textures
// ─────────────────────────────────────────────
// Floor tile: tiled 4×4 so individual tiles stay a natural size
const floorTexture = textureLoader.load("/floor_texture.jpg");
floorTexture.colorSpace = THREE.SRGBColorSpace; // mark as sRGB so Three.js linearises correctly
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(4, 4);

// Plain wall texture used on back, right, and partial-back panels
const wallTexture = textureLoader.load("/wall texture.jpg");
wallTexture.colorSpace = THREE.SRGBColorSpace;
wallTexture.repeat.set(1, 1);

// Ceiling plaster texture tiled 3×3
const ceilingTexture = textureLoader.load("/ceilingtexture.jpg");
ceilingTexture.colorSpace = THREE.SRGBColorSpace;
ceilingTexture.wrapS = THREE.RepeatWrapping;
ceilingTexture.wrapT = THREE.RepeatWrapping;
ceilingTexture.repeat.set(3, 3);

// Graffiti/mural texture on the left wall only for visual interest
const graffitiTexture = textureLoader.load("/graffiti_texture.jpg");
graffitiTexture.colorSpace = THREE.SRGBColorSpace;
graffitiTexture.wrapS = THREE.RepeatWrapping;
graffitiTexture.wrapT = THREE.RepeatWrapping;
graffitiTexture.repeat.set(1, 1);

const wallMat = new THREE.MeshStandardMaterial({
  map: wallTexture,
  side: THREE.FrontSide, // only render the inward-facing side
});
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture });

// ─────────────────────────────────────────────
// Window opening constants — exported for other modules
// ─────────────────────────────────────────────
// These define the rectangular hole cut into the back wall.
// models.js uses them to position the curtain mesh flush with the opening.
export const winW = 3.5; // opening width
export const winH = 3; // opening height
export const winCX = -1.5; // X centre of the opening (left of room centre)
export const winCY = 0.3; // Y centre (slightly above the room's vertical midpoint)

const wallW = 10; // full room width
const wallH = 6; // full room height (floor at -3, ceiling at +3)
const frameThick = 0.1; // wood frame bar thickness
const wallDepth = 0.3; // back wall physical depth (used for reveal and frame depth)
export const fz = -3 + wallDepth; // Z of the room-side face of the back wall = -2.7

// ─────────────────────────────────────────────
// Back wall with window cutout (four panels)
// ─────────────────────────────────────────────
// There is no geometry with a true hole in it in WebGL, so the opening is
// faked by placing four solid wall panels around the gap:
//   left panel  — left of the opening
//   right panel — right of the opening
//   top panel   — above the opening
//   bottom panel— below the opening
const leftPanelW = winCX - winW / 2 + wallW / 2; // width of left strip
const rightPanelW = wallW / 2 - winCX - winW / 2; // width of right strip
const topPanelH = wallH / 2 - winCY - winH / 2; // height of top strip
const botPanelH = winCY - winH / 2 + wallH / 2; // height of bottom strip

[
  { w: leftPanelW, h: wallH, x: -wallW / 2 + leftPanelW / 2, y: 0 },
  { w: rightPanelW, h: wallH, x: wallW / 2 - rightPanelW / 2, y: 0 },
  { w: winW, h: topPanelH, x: winCX, y: wallH / 2 - topPanelH / 2 },
  { w: winW, h: botPanelH, x: winCX, y: -wallH / 2 + botPanelH / 2 },
].forEach(({ w, h, x, y }) => {
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
  panel.position.set(x, y, -3);
  panel.receiveShadow = true;
  scene.add(panel);
});

// ─────────────────────────────────────────────
// Window frame
// ─────────────────────────────────────────────

// Reveal planes — fill the interior sides of the wall thickness so the
// opening doesn’t look like a paper-thin cut. Four planes: top, bottom, left, right.
const revealMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a9 }); // off-white plaster
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

// Outer wooden frame bars — BoxGeometry so they have depth equal to the wall
const frameMat = new THREE.MeshStandardMaterial({ color: 0x7a5230 }); // dark wood
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

// Sky city backdrop — large plane behind the window filled with background.png
// It is intentionally oversized (2.5× the opening) so the city stays visible
// even after parallax shifts the camera slightly left/right.
const bgTexture = textureLoader.load("/background.png");
bgTexture.colorSpace = THREE.SRGBColorSpace;
// Shift texture up so skyscrapers sit at the bottom, sky fills top
bgTexture.offset.set(0, 0.15);
bgTexture.repeat.set(1, 1);
const skyPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(winW * 2.5, winH * 2.2),
  new THREE.MeshBasicMaterial({ map: bgTexture }), // unlit — the "sky" is self-luminous
);
skyPlane.position.set(winCX, winCY - 0.2, -4.5); // placed deeper than the wall
scene.add(skyPlane);

// Window glass — a near-invisible plane inside the frame opening.
// Very low opacity (0.08) gives a faint blue-grey tint without obscuring the city.
const windowGlass = new THREE.Mesh(
  new THREE.PlaneGeometry(winW, winH),
  new THREE.MeshStandardMaterial({
    color: 0xaaccee,
    transparent: true,
    opacity: 0.08,
    roughness: 0.0,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }),
);
windowGlass.position.set(winCX, winCY, fz - 0.02);
scene.add(windowGlass);

// ─────────────────────────────────────────────
// Room geometry — floor, ceiling, walls
// ─────────────────────────────────────────────

// Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3;
floor.receiveShadow = true;
scene.add(floor);

// Ceiling
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ map: ceilingTexture }),
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 3;
scene.add(ceiling);

// Left wall (graffiti)
const leftWall = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 6),
  new THREE.MeshStandardMaterial({
    map: graffitiTexture,
    side: THREE.FrontSide,
  }),
);
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

// ─────────────────────────────────────────────
// Table (desk)
// ─────────────────────────────────────────────
// Simple box geometry table against the right wall. The computer, plant, and
// chair models are positioned relative to these dimensions in models.js.
const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b1f0e }); // dark walnut

// Table top: 2 units long (runs along Z after a 90° Y rotation), 0.1 thick
const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), tableMat);
tableTop.position.set(4.48, -1.5, -1.5);
tableTop.rotation.y = Math.PI / 2; // long side runs along Z axis
tableTop.castShadow = true;
tableTop.receiveShadow = true;
scene.add(tableTop);

// Four legs — pairs at front/back and left/right edges of the tabletop
// X positions: 4.88 (right edge) and 4.08 (left edge)
// Z positions: -0.6 (back) and -2.4 (front)
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

// ─────────────────────────────────────────────
// GPU Rain (outside window, animated entirely in vertex shader)
// ─────────────────────────────────────────────
// Rain is 1600 LineSegments. Each streak is two vertices (top + bottom).
// All motion is computed on the GPU — the only per-frame CPU cost is writing
// a single float uniform (uTime). See shaders/rainVertex.js for the logic.
const rainCount = 1600;
// Horizontal bounds: 40 % wider than the window so rain fills the whole glass
const rainXMin = winCX - winW * 1.4;
const rainXMax = winCX + winW * 1.4;
// Vertical bounds: extend above and below the window opening
const rainYTop = winCY + winH * 1.2;
const rainYBot = winCY - winH * 1.8;
// Depth range: rain sits between z = -3.6 (just behind the window) and -7.0
const rainZMin = -3.6;
const rainZMax = -7.0;
const streakLen = 0.38; // world-space length of each streak in units
const windDrift = 0.12; // horizontal offset baked into the top vertex to simulate wind angle

const rainPositions = new Float32Array(rainCount * 2 * 3);
const rainASpeed = new Float32Array(rainCount * 2);
const rainADy = new Float32Array(rainCount * 2);

for (let i = 0; i < rainCount; i++) {
  const x = rainXMin + Math.random() * (rainXMax - rainXMin);
  const y = rainYBot + Math.random() * (rainYTop - rainYBot);
  const z = rainZMin + Math.random() * (rainZMax - rainZMin);
  const speed = 10.8 + Math.random() * 6.0;

  // top vertex — windDrift baked into x
  rainPositions[i * 6 + 0] = x + windDrift;
  rainPositions[i * 6 + 1] = y;
  rainPositions[i * 6 + 2] = z;
  rainASpeed[i * 2] = speed;
  rainADy[i * 2] = 0.0;

  // bottom vertex
  rainPositions[i * 6 + 3] = x;
  rainPositions[i * 6 + 4] = y;
  rainPositions[i * 6 + 5] = z;
  rainASpeed[i * 2 + 1] = speed;
  rainADy[i * 2 + 1] = -streakLen;
}

const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
rainGeo.setAttribute("aSpeed", new THREE.BufferAttribute(rainASpeed, 1)); // custom speed attribute
rainGeo.setAttribute("aDy", new THREE.BufferAttribute(rainADy, 1)); // custom Y-offset attribute

// LineSegments draws independent line pairs (0→1, 2→3, ...) which is exactly
// what we want: each streak is one segment with no connection to its neighbours.
export const rainMesh = new THREE.LineSegments(
  rainGeo,
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 }, // elapsed seconds, written by animate.js each frame
      uRainYBot: { value: rainYBot }, // wrap threshold — when a streak passes this, reset to top
      uRainYTop: { value: rainYTop }, // spawn Y position after wrapping
      uStreakLen: { value: streakLen }, // passed to shader so alpha fade matches geometry
      uColor: { value: new THREE.Color(0xc8e0ff) }, // cool blue-white raindrops
      uOpacity: { value: 0.35 }, // semi-transparent so the city shows through
    },
    vertexShader: rainVertexShader,
    fragmentShader: rainFragShader,
    transparent: true,
    depthWrite: false,
  }),
);
scene.add(rainMesh);
