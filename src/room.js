import * as THREE from "three";
import { scene, textureLoader } from "./renderer.js";
import rainVertexShader from "./shaders/rainVertex.js";
import rainFragShader from "./shaders/rainFrag.js";

// ─────────────────────────────────────────────
// Textures
// ─────────────────────────────────────────────
const floorTexture = textureLoader.load("/floor_texture.jpg");
floorTexture.colorSpace = THREE.SRGBColorSpace;
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(4, 4);

const wallTexture = textureLoader.load("/wall texture.jpg");
wallTexture.colorSpace = THREE.SRGBColorSpace;
wallTexture.repeat.set(1, 1);

const ceilingTexture = textureLoader.load("/ceilingtexture.jpg");
ceilingTexture.colorSpace = THREE.SRGBColorSpace;
ceilingTexture.wrapS = THREE.RepeatWrapping;
ceilingTexture.wrapT = THREE.RepeatWrapping;
ceilingTexture.repeat.set(3, 3);

const graffitiTexture = textureLoader.load("/graffiti_texture.jpg");
graffitiTexture.colorSpace = THREE.SRGBColorSpace;
graffitiTexture.wrapS = THREE.RepeatWrapping;
graffitiTexture.wrapT = THREE.RepeatWrapping;
graffitiTexture.repeat.set(1, 1);

const wallMat = new THREE.MeshStandardMaterial({
  map: wallTexture,
  side: THREE.FrontSide,
});
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture });

// ─────────────────────────────────────────────
// Window dimensions — exported for other modules
// ─────────────────────────────────────────────
export const winW = 3.5;
export const winH = 3;
export const winCX = -1.5;
export const winCY = 0.3;

const wallW = 10;
const wallH = 6;
const frameThick = 0.1;
const wallDepth = 0.3;
export const fz = -3 + wallDepth; // front face of back wall (room side) = -2.7

// ─────────────────────────────────────────────
// Back wall with window cutout (four panels)
// ─────────────────────────────────────────────
const leftPanelW = winCX - winW / 2 + wallW / 2;
const rightPanelW = wallW / 2 - winCX - winW / 2;
const topPanelH = wallH / 2 - winCY - winH / 2;
const botPanelH = winCY - winH / 2 + wallH / 2;

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

// Sky plane visible through the window — background.png
const bgTexture = textureLoader.load("/background.png");
bgTexture.colorSpace = THREE.SRGBColorSpace;
// Shift texture up so skyscrapers sit at the bottom, sky fills top
bgTexture.offset.set(0, 0.15);
bgTexture.repeat.set(1, 1);
const skyPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(winW * 2.5, winH * 2.2),
  new THREE.MeshBasicMaterial({ map: bgTexture }),
);
skyPlane.position.set(winCX, winCY - 0.2, -4.5);
scene.add(skyPlane);

// Window glass — transparent with subtle tint
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
const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b1f0e });

const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), tableMat);
tableTop.position.set(4.48, -1.5, -1.5);
tableTop.rotation.y = Math.PI / 2; // long side runs along Z
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

// ─────────────────────────────────────────────
// GPU Rain (outside window, animated in vertex shader)
// ─────────────────────────────────────────────
const rainCount = 1600;
const rainXMin = winCX - winW * 1.4;
const rainXMax = winCX + winW * 1.4;
const rainYTop = winCY + winH * 1.2;
const rainYBot = winCY - winH * 1.8;
const rainZMin = -3.6;
const rainZMax = -7.0;
const streakLen = 0.38;
const windDrift = 0.12;

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
rainGeo.setAttribute("aSpeed", new THREE.BufferAttribute(rainASpeed, 1));
rainGeo.setAttribute("aDy", new THREE.BufferAttribute(rainADy, 1));

export const rainMesh = new THREE.LineSegments(
  rainGeo,
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uRainYBot: { value: rainYBot },
      uRainYTop: { value: rainYTop },
      uStreakLen: { value: streakLen },
      uColor: { value: new THREE.Color(0xc8e0ff) },
      uOpacity: { value: 0.35 },
    },
    vertexShader: rainVertexShader,
    fragmentShader: rainFragShader,
    transparent: true,
    depthWrite: false,
  }),
);
scene.add(rainMesh);
