import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createIcons, Bike, VolumeX, Volume2, Sun, Sunset, Moon, BellRing, Camera, RotateCcw, Maximize, Pause, Play, Scan } from 'lucide';
import './style.css';

const icons = { Bike, VolumeX, Volume2, Sun, Sunset, Moon, BellRing, Camera, RotateCcw, Maximize, Pause, Play, Scan };
const $ = (s) => document.querySelector(s);
const icon = (el, name) => { el.innerHTML = `<i data-lucide="${name}"></i>`; createIcons({ icons }); };
createIcons({ icons });
const state = { running: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 18, distance: 0, time: 'day', camera: 'follow', sound: false, phase: 0, frames: 0 };
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
} catch (error) {
  $('#loading').innerHTML = '<p>暂时无法启动三维画面</p><p>请启用浏览器硬件加速，或使用支持三维图形的浏览器。</p>';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 851 ? 1.5 : 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
$('#scene').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d1e8e1');
scene.fog = new THREE.Fog('#d1e8e1', 28, 105);
const camera = new THREE.PerspectiveCamera(38, 1, .1, 180);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * .48;
controls.minPolarAngle = .25;
controls.target.set(0, 1.9, 0);
const hemi = new THREE.HemisphereLight('#edfffa', '#818d72', 2.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d3', 4);
sun.position.set(-8, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
sun.shadow.normalBias = .035;
scene.add(sun);
const fill = new THREE.DirectionalLight('#b9f3ed', 1.2);
fill.position.set(6, 4, -6); scene.add(fill);
const mat = (color, roughness = .7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const m = {
  white: mat('#fff8e9'), wing: mat('#e9e8da'), feather: mat('#d5dcd1'), beak: mat('#efb147'), pouch: mat('#efa975'),
  orange: mat('#e88239'), eye: mat('#192d2d', .25), teal: mat('#dd6c51', .3, .26), tire: mat('#293c3b'), rim: mat('#eee8cd', .35, .4),
  metal: mat('#b7c7bd', .25, .7), leather: mat('#704e3e'), coral: mat('#e75f4b'), helmet: mat('#397f75', .4), sand: mat('#efe0b6'),
  grass: mat('#8fb998'), darkGreen: mat('#377e70'), palm: mat('#63a77d'), trunk: mat('#988269'), road: mat('#b8b8a6'), stripe: mat('#fbebc8'), rock: mat('#b8c5b4'),
};
const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
function mesh(geo, material, parent = scene, pos = [0, 0, 0]) {
  const obj = new THREE.Mesh(geo, material); obj.position.set(...pos); parent.add(obj); obj.castShadow = true; obj.receiveShadow = true; return obj;
}
function ellipsoid(parent, material, pos, scale) { const obj = mesh(sphereGeo, material, parent, pos); obj.scale.set(...scale); return obj; }
function box(parent, material, pos, scale) { return mesh(new THREE.BoxGeometry(...scale), material, parent, pos); }
function rod(parent, a, b, radius, material, sides = 12) {
  const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta = bv.clone().sub(av);
  const obj = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), sides), material, parent);
  obj.position.copy(av.add(bv).multiplyScalar(.5)); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return obj;
}
function tube(parent, points, radius, material) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 40, radius, 12, false), material, parent);
}
const world = new THREE.Group(); scene.add(world);
box(world, m.sand, [0, -.38, 1], [220, .5, 18]);
box(world, m.road, [0, -.08, 1.1], [220, .16, 4.6]);
for (const z of [-1, 3.2]) box(world, m.stripe, [0, .008, z], [220, .016, .055]);
const moving = [];
function moveWithRoad(obj, span = 70, factor = 1) { moving.push({ obj, span, factor }); return obj; }
for (let x = -36; x < 36; x += 3.2) moveWithRoad(box(world, m.stripe, [x, .014, 1.3], [1.35, .018, .055]), 73.6);
const waterGeo = new THREE.PlaneGeometry(220, 140, 100, 50); waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.MeshStandardMaterial({ color: '#4dbab1', roughness: .3, metalness: .28, transparent: true, opacity: .94 });
const water = mesh(waterGeo, waterMat, scene, [0, -.32, -77]); water.castShadow = false;
const waterBase = Float32Array.from(waterGeo.attributes.position.array);
const foamMat = mat('#daeee0');
const foam = [];
for (let i = 0; i < 38; i++) {
  const o = box(scene, foamMat, [(i * 9.13) % 100 - 50, -.2, -9 - (i % 7) * 5.7], [1.5 + i % 4, .022, .09]); o.castShadow = false; foam.push(o);
}

// Shared model coordinates keep the pedal, foot and wheel animation mechanically aligned.
const rider = new THREE.Group(); scene.add(rider); rider.position.z = .45;
const bike = new THREE.Group(); rider.add(bike);
const wheels = [];
for (const x of [-1.27, 1.27]) {
  const wheel = new THREE.Group(); wheel.position.set(x, .68, 0); bike.add(wheel); wheels.push(wheel);
  mesh(new THREE.TorusGeometry(.625, .065, 12, 64), m.tire, wheel);
  mesh(new THREE.TorusGeometry(.56, .028, 8, 64), m.rim, wheel);
  ellipsoid(wheel, m.metal, [0, 0, 0], [.095, .095, .13]);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; rod(wheel, [0, 0, 0], [Math.cos(a) * .55, Math.sin(a) * .55, 0], .009, m.metal, 5); }
  const fender = mesh(new THREE.TorusGeometry(.72, .029, 8, 36, Math.PI * .86), m.teal, bike, [x, .68, 0]); fender.rotation.z = .22;
}
const rear = [-1.27, .68, 0], crankPos = [-.12, .72, 0], seatBase = [-.56, 1.6, 0], topFront = [.82, 1.66, 0], lowFront = [.97, 1.34, 0];
for (const [a, b] of [[rear, crankPos], [rear, seatBase], [seatBase, crankPos], [seatBase, topFront], [crankPos, lowFront], [topFront, lowFront]]) rod(bike, a, b, .052, m.teal);
for (const z of [-.11, .11]) rod(bike, [.97, 1.39, z], [1.27, .68, z], .035, m.teal);
rod(bike, [-.56, 1.5, 0], [-.63, 1.87, 0], .034, m.metal);
ellipsoid(bike, m.leather, [-.66, 1.88, 0], [.32, .085, .21]);
rod(bike, [.82, 1.6, 0], [.72, 2.0, 0], .032, m.metal);
tube(bike, [[.72, 1.99, -.42], [.86, 2.05, -.28], [.72, 2.03, 0], [.86, 2.05, .28], [.72, 1.99, .42]], .026, m.metal);
for (const z of [-.41, .41]) { rod(bike, [.72, 1.99, z], [.47, 1.96, z], .047, m.leather); }
ellipsoid(bike, m.metal, [.78, 2.075, .23], [.065, .043, .065]);
const crank = new THREE.Group(); crank.position.set(...crankPos); bike.add(crank);
const gear = mesh(new THREE.TorusGeometry(.2, .023, 8, 32), m.metal, bike, [-.12, .72, .12]);
tube(bike, [[-.12, .92, .13], [-1.27, .77, .13], [-1.36, .68, .13], [-1.27, .59, .13], [-.12, .52, .13], [.075, .72, .13], [-.12, .92, .13]], .014, m.tire);
const pedals = [];
for (const side of [-1, 1]) {
  rod(crank, [0, 0, side * .12], [.26 * side, 0, side * .25], .025, m.metal);
  const pedal = box(bike, m.leather, [0, 0, 0], [.22, .06, .21]); pedals.push({ pedal, side });
}
// The pelican silhouette is defined by a long bill, a hanging pouch and an S-shaped neck.
const bird = new THREE.Group(); rider.add(bird);
ellipsoid(bird, m.white, [-.52, 2.35, 0], [.83, .7, .52]).rotation.z = -.13;
ellipsoid(bird, m.white, [-.1, 2.72, 0], [.39, .63, .36]).rotation.z = .28;
tube(bird, [[-.1, 2.63, 0], [.19, 2.88, 0], [.09, 3.23, 0], [.29, 3.52, 0], [.51, 3.57, 0]], .235, m.white);
ellipsoid(bird, m.white, [.45, 3.61, 0], [.36, .34, .31]);
const bill = new THREE.Shape(); bill.moveTo(.65, 3.65); bill.quadraticCurveTo(1.36, 3.65, 2.01, 3.42); bill.quadraticCurveTo(1.84, 3.36, .64, 3.49); bill.closePath();
const billGeo = new THREE.ExtrudeGeometry(bill, { depth: .26, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .035, bevelThickness: .035 });
mesh(billGeo, m.beak, bird, [0, 0, -.13]);
const pouch = new THREE.Shape(); pouch.moveTo(.66, 3.48); pouch.lineTo(1.96, 3.41); pouch.quadraticCurveTo(1.25, 3.11, .74, 3.04); pouch.quadraticCurveTo(.58, 3.1, .66, 3.48);
mesh(new THREE.ExtrudeGeometry(pouch, { depth: .2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .06, bevelThickness: .04 }), m.pouch, bird, [0, 0, -.1]);
for (const side of [-1, 1]) {
  ellipsoid(bird, m.white, [.57, 3.68, side * .28], [.115, .13, .049]);
  ellipsoid(bird, m.eye, [.596, 3.685, side * .32], [.052, .068, .027]);
  ellipsoid(bird, m.white, [.614, 3.71, side * .338], [.018, .023, .009]);
  tube(bird, [[.48, 3.84, side * .27], [.58, 3.86, side * .28], [.67, 3.83, side * .26]], .021, m.feather);
  const wing = ellipsoid(bird, m.wing, [-.42, 2.42, side * .46], [.57, .28, .14]); wing.rotation.z = -.52;
  tube(bird, [[-.38, 2.45, side * .45], [.02, 2.2, side * .51], [.3, 1.97, side * .44], [.59, 1.98, side * .42]], .105, m.wing);
  for (let i = 0; i < 4; i++) { const f = ellipsoid(bird, i % 2 ? m.wing : m.feather, [-.78 - i * .075, 2.24 + i * .06, side * .49], [.29, .065, .065]); f.rotation.z = .35; }
}
for (let i = 0; i < 5; i++) { const f = ellipsoid(bird, i % 2 ? m.feather : m.white, [-1.3, 2.24, (i - 2) * .1], [.43, .09, .085]); f.rotation.z = -.2; }
const helmet = mesh(new THREE.SphereGeometry(.365, 32, 20, 0, Math.PI * 2, 0, Math.PI * .47), m.helmet, bird, [.43, 3.79, 0]); helmet.scale.set(1.1, .72, 1);
for (const z of [-.15, 0, .15]) tube(bird, [[.17, 3.94, z], [.42, 4.05 - Math.abs(z) * .15, z], [.68, 3.94, z]], .018, m.darkGreen);
tube(bird, [[.33, 3.82, .3], [.35, 3.34, .27], [.66, 3.69, .27]], .014, m.leather);
const scarfRing = mesh(new THREE.TorusGeometry(.255, .085, 12, 32), m.coral, bird, [.08, 3.02, 0]); scarfRing.rotation.x = Math.PI / 2;
ellipsoid(bird, m.coral, [-.17, 3.04, .19], [.12, .12, .13]);
const scarfGeo = new THREE.PlaneGeometry(1.24, .22, 18, 1);
const scarfMat = new THREE.MeshStandardMaterial({ color: '#e7614e', roughness: .85, side: THREE.DoubleSide });
const scarf = mesh(scarfGeo, scarfMat, bird, [-.79, 3.08, .14]);
const scarfBase = Float32Array.from(scarfGeo.attributes.position.array);
const legs = [];
for (const side of [-1, 1]) {
  const upper = rod(rider, [0, 0, 0], [0, 1, 0], .054, m.orange);
  const lower = rod(rider, [0, 0, 0], [0, 1, 0], .041, m.orange);
  const foot = ellipsoid(rider, m.orange, [0, 0, 0], [.19, .055, .13]);
  legs.push({ side, upper, lower, foot });
}
function setBone(obj, a, b) { const delta = b.clone().sub(a); obj.position.copy(a).add(b).multiplyScalar(.5); obj.scale.y = delta.length(); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); }

function palm(x, z, size = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(size); world.add(g);
  tube(g, [[0, 0, 0], [.1, 1.4, 0], [.42, 3, .06], [.6, 4.3, 0]], .13, m.trunk);
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    const points = [[.6, 4.3, 0], [.6 + Math.cos(a) * .7, 4.65, Math.sin(a) * .7], [.6 + Math.cos(a) * 1.8, 4.13, Math.sin(a) * 1.8]];
    tube(g, points, .032, m.darkGreen);
    for (let j = 1; j <= 5; j++) { const t = j / 5, r = t * 1.64; const leaf = ellipsoid(g, i % 2 ? m.palm : m.darkGreen, [.6 + Math.cos(a) * r, 4.45 + Math.sin(t * Math.PI) * .16 - t * .3, Math.sin(a) * r], [.63 * Math.sin(t * Math.PI * .85), .035, .22]); leaf.rotation.y = -a + Math.PI / 2; leaf.rotation.z = -.15; }
  }
  for (let i = 0; i < 3; i++) ellipsoid(g, m.leather, [.45 + i * .14, 4.15, .12], [.12, .16, .12]);
  return moveWithRoad(g, 76);
}
palm(-8, -4, .62); palm(13, -4.8, .6); palm(28, -3.8, .66); palm(-27, -5, .62);
for (let i = 0; i < 32; i++) {
  const x = (i * 7.23) % 76 - 38, z = i % 2 ? 4.4 + (i % 3) * .5 : -2.6 - (i % 3) * .6;
  const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g); moveWithRoad(g, 76);
  if (i % 3 === 0) { const r = mesh(new THREE.DodecahedronGeometry(.32 + i % 4 * .09, 0), m.rock, g, [0, .08, 0]); r.scale.set(1.4, .7, 1); }
  else { for (let j = 0; j < 5; j++) { const blade = mesh(new THREE.ConeGeometry(.045, .4 + j * .055, 5), m.grass, g, [(j - 2) * .09, .17, (j % 2) * .08]); blade.rotation.z = (j - 2) * .18; } if (i % 4 === 0) { rod(g, [0, 0, 0], [0, .5, 0], .016, m.darkGreen); for (let j = 0; j < 5; j++) ellipsoid(g, m.stripe, [Math.cos(j * 1.26) * .075, .5 + Math.sin(j * 1.26) * .075, .01], [.07, .07, .027]); ellipsoid(g, m.orange, [0, .5, .04], [.05, .05, .025]); } }
}
const posts = new THREE.Group(); scene.add(posts);
for (let i = -10; i < 11; i++) {
  const g = new THREE.Group(); posts.add(g); g.position.set(i * 4, 0, -2.4);
  box(g, m.white, [0, .27, 0], [.13, .55, .13]); box(g, m.coral, [0, .47, .071], [.14, .12, .015]); moveWithRoad(g, 84);
}
const islandMat = mat('#80aaa0');
for (let i = 0; i < 7; i++) { const island = mesh(new THREE.ConeGeometry(7 + i % 3 * 3, 4 + i % 3, 7), islandMat, scene, [-50 + i * 19, -.6, -53 - i % 3 * 6]); island.rotation.y = i; island.scale.z = .55; }
const lighthouse = new THREE.Group(); scene.add(lighthouse); lighthouse.position.set(-6, -.2, -20);
mesh(new THREE.CylinderGeometry(3.1, 3.8, .9, 9), m.rock, lighthouse);
mesh(new THREE.CylinderGeometry(.65, .95, 4.6, 24), m.white, lighthouse, [0, 2.6, 0]);
mesh(new THREE.CylinderGeometry(.72, .8, .65, 24), m.coral, lighthouse, [0, 3.2, 0]);
mesh(new THREE.CylinderGeometry(.88, .88, .2, 24), m.white, lighthouse, [0, 5, 0]);
const lanternMat = new THREE.MeshStandardMaterial({ color: '#e5e9bb', emissive: '#ffc35c', emissiveIntensity: .4, roughness: .2 });
mesh(new THREE.CylinderGeometry(.48, .48, .7, 12), lanternMat, lighthouse, [0, 5.4, 0]);
mesh(new THREE.ConeGeometry(.9, .65, 24), m.coral, lighthouse, [0, 6.05, 0]);
for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; rod(lighthouse, [Math.cos(a) * .48, 5.05, Math.sin(a) * .48], [Math.cos(a) * .48, 5.82, Math.sin(a) * .48], .035, m.darkGreen); }
box(lighthouse, m.darkGreen, [.0, .95, .88], [.42, 1, .07]);
const boats = [];
for (let i = 0; i < 4; i++) {
  const g = new THREE.Group(); scene.add(g); g.position.set(-21 + i * 17, 0, -21 - (i % 2) * 13); g.scale.setScalar(.6 + (i % 2) * .2); boats.push(g);
  const hull = ellipsoid(g, i % 2 ? m.coral : m.teal, [0, .05, 0], [1.2, .22, .38]);
  rod(g, [0, 0, 0], [0, 2.6, 0], .027, m.leather);
  const shape = new THREE.Shape(); shape.moveTo(-.05, .42); shape.lineTo(-.05, 2.6); shape.lineTo(-1.12, .42); shape.closePath();
  mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: '#fff7df', side: THREE.DoubleSide }), g);
  const shape2 = new THREE.Shape(); shape2.moveTo(.05, .42); shape2.lineTo(.05, 2.35); shape2.lineTo(.88, .42); shape2.closePath();
  mesh(new THREE.ShapeGeometry(shape2), new THREE.MeshStandardMaterial({ color: '#ebac88', side: THREE.DoubleSide }), g);
}
const clouds = [];
const cloudMat = mat('#f6f6e9');
for (let i = 0; i < 9; i++) { const g = new THREE.Group(); scene.add(g); g.position.set(-55 + i * 14, 13 + i % 3 * 2.5, -42 - i % 4 * 10); for (let j = 0; j < 4; j++) ellipsoid(g, cloudMat, [j * 1.7, Math.sin(j) * .35, 0], [2, .6 + Math.sin(j) * .35, .8]); clouds.push(g); }
const gulls = [];
for (let i = 0; i < 5; i++) { const g = new THREE.Group(); scene.add(g); g.position.set(-10 + i * 5, 7 + i % 3, -16 - i % 2 * 4); const wings = []; for (const side of [-1, 1]) { const pivot = new THREE.Group(); g.add(pivot); const w = ellipsoid(pivot, m.white, [side * .3, 0, 0], [.4, .04, .12]); w.rotation.y = side * .2; wings.push(pivot); } ellipsoid(g, m.white, [0, 0, 0], [.1, .1, .3]); gulls.push({ g, wings }); }
const starGeo = new THREE.BufferGeometry(); const starPositions = [];
for (let i = 0; i < 230; i++) { const a = i * 2.39996, y = 12 + (i % 29) * 1.5, r = 60; starPositions.push(Math.cos(a) * r, y, Math.sin(a) * r); }
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffe3', size: .12, transparent: true, opacity: 0 })); scene.add(stars);
const moon = mesh(new THREE.SphereGeometry(1.7, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffecbd' }), scene, [18, 19, -48]); moon.visible = false;
const headlight = new THREE.SpotLight('#fff0ba', 0, 13, .45, .7); headlight.position.set(1.1, 1.48, .45); headlight.target.position.set(8, 0, .45); scene.add(headlight, headlight.target);
ellipsoid(bike, lanternMat, [1.05, 1.5, 0], [.12, .1, .1]);
// 自行车旅行装备与道路细节。
const canvasMat = mat('#7f957c', .9), trimMat = mat('#ddc69c', .8);
rod(bike, [-1.42, .77, -.18], [-1.42, 1.5, -.18], .023, m.metal);
rod(bike, [-1.42, .77, .18], [-1.42, 1.5, .18], .023, m.metal);
box(bike, m.metal, [-1.2, 1.48, 0], [.65, .045, .4]);
const bag = box(bike, canvasMat, [-1.25, 1.3, .34], [.46, .43, .19]);
box(bike, trimMat, [-1.25, 1.51, .35], [.48, .075, .21]);
for (const x of [-1.4,-1.1]) box(bike, m.leather, [x,1.32,.45],[.04,.38,.02]);
ellipsoid(bike, m.coral, [-1.6,1.47,0],[.036,.055,.09]);
for (const w of wheels) {
 const reflector = box(w, trimMat, [.31,.25,.025],[.055,.14,.04]); reflector.rotation.z=-.7;
}
const roadTextureCanvas=document.createElement('canvas');roadTextureCanvas.width=roadTextureCanvas.height=128;
const rc=roadTextureCanvas.getContext('2d');rc.fillStyle='#deded3';rc.fillRect(0,0,128,128);
for(let i=0;i<1800;i++){const l=160+Math.floor(Math.random()*55);rc.fillStyle='rgba('+l+','+l+','+(l-12)+',.24)';rc.fillRect(Math.random()*128,Math.random()*128,1,1);}
const roadTexture=new THREE.CanvasTexture(roadTextureCanvas);roadTexture.wrapS=roadTexture.wrapT=THREE.RepeatWrapping;roadTexture.repeat.set(60,2);roadTexture.colorSpace=THREE.SRGBColorSpace;m.road.map=roadTexture;
const signGroup=new THREE.Group();world.add(signGroup);signGroup.position.set(16,0,-3.4);moveWithRoad(signGroup,76);
rod(signGroup,[0,0,0],[0,2.6,0],.045,m.leather);
const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=160;
const sc=signCanvas.getContext('2d');sc.fillStyle='#ecdfb9';sc.fillRect(0,0,512,160);sc.strokeStyle='#72866b';sc.lineWidth=7;sc.strokeRect(10,10,492,140);sc.fillStyle='#3e5b48';sc.textAlign='center';sc.font='bold 52px "Microsoft YaHei",sans-serif';sc.fillText('去看海  →',256,98);
const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
box(signGroup,m.leather,[0,2.27,0],[1.65,.54,.08]);mesh(new THREE.PlaneGeometry(1.65,.54),new THREE.MeshStandardMaterial({map:signTexture}),signGroup,[0,2.27,.046]);
const seaSun=mesh(new THREE.SphereGeometry(2.6,32,20),new THREE.MeshBasicMaterial({color:'#fff0cf'}),scene,[23,15,-65]);seaSun.castShadow=false;
const eyeDetails=bird.children.filter(o=>o.material===m.eye);let blinkT=0;
let cameraTransition = true;
function cameraPosition(mode) {
  const mobile = innerWidth < 851;
  if (mode === 'side') return new THREE.Vector3(.8, mobile ? 4.2 : 3.8, mobile ? 22 : 11.4);
  return new THREE.Vector3(mobile ? 8 : 6.7, mobile ? 5.8 : 5.05, mobile ? 22 : 11.4);
}
function resize() {
  const { width, height } = $('#scene').getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
  // Off-centre framing preserves room for the title above and controls below.
  camera.setViewOffset(width, height, innerWidth < 851 ? -width * .015 : -width * .175, innerWidth < 851 ? -height * .028 : -height * .005, width, height);
  cameraTransition = true;
}
camera.position.copy(cameraPosition('follow')); controls.target.set(0, 1.85, 0); controls.update();
addEventListener('resize', resize); resize();
controls.addEventListener('start', () => { cameraTransition = false; controls.autoRotate = false; });
let toastTimer;
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2300); }
function updatePlaying() { icon($('#play'), state.running ? 'pause' : 'play'); $('#play').setAttribute('aria-label', state.running ? '暂停骑行' : '继续骑行'); $('#play').title = state.running ? '暂停骑行' : '继续骑行'; $('#ride-state').textContent = state.running ? '自在骑行中' : '停下来看看海'; }
updatePlaying();
$('#play').onclick = () => { state.running = !state.running; updatePlaying(); };
$('#speed').oninput = (e) => { state.speed = Number(e.target.value); $('#speed-label').value = `${state.speed} 公里/时`; };
$('#cameras').onclick = (e) => { const button = e.target.closest('[data-camera]'); if (!button) return; state.camera = button.dataset.camera; for (const b of $('#cameras').children) b.setAttribute('aria-pressed', String(b === button)); cameraTransition = true; controls.autoRotate = state.camera === 'orbit'; controls.autoRotateSpeed = .7; };
$('#reset').onclick = () => { state.camera = 'follow'; cameraTransition = true; controls.autoRotate = false; controls.target.set(0, 1.85, 0); for (const b of $('#cameras').children) b.setAttribute('aria-pressed', String(b.dataset.camera === 'follow')); toast('回到海风里的视角'); };
const palettes = {
  day: { sky: '#d1e8e1', water: '#52b6aa', sun: '#fff1d3', intensity: 4, hemi: 2.8, exposure: 1.16, label: '晴日海风', icon: 'sun' },
  sunset: { sky: '#eac0b8', water: '#809fb0', sun: '#ffa466', intensity: 3, hemi: 1.9, exposure: 1.04, label: '落日慢行', icon: 'sunset' },
  night: { sky: '#233d4d', water: '#244f61', sun: '#afccf6', intensity: 1.3, hemi: .85, exposure: 1.05, label: '月下漫游', icon: 'moon' },
};
$('#times').onclick = (e) => { const button = e.target.closest('[data-time]'); if (!button) return; state.time = button.dataset.time; const p = palettes[state.time]; for (const b of $('#times').children) b.setAttribute('aria-pressed', String(b === button)); $('#weather-label').textContent = p.label; $('#weather-icon').outerHTML = `<i id="weather-icon" data-lucide="${p.icon}"></i>`; createIcons({ icons }); document.body.classList.toggle('night', state.time === 'night'); moon.visible = state.time === 'night'; seaSun.visible = state.time !== 'night'; seaSun.position.y = state.time === 'sunset' ? 7.5 : 15; seaSun.material.color.set(state.time === 'sunset' ? '#ffd3a3' : '#fff0cf'); stars.material.opacity = state.time === 'night' ? .85 : 0; headlight.intensity = state.time === 'night' ? 14 : 0; lanternMat.emissiveIntensity = state.time === 'night' ? 3 : .4; };
let audioCtx, windGain, windSource;
function ensureAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
$('#sound').onclick = () => {
  try { const ctx = ensureAudio(); state.sound = !state.sound; if (!windSource) { const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate); const data = buffer.getChannelData(0); let last = 0; for (let i = 0; i < data.length; i++) { last = (last + (Math.random() * 2 - 1) * .035) / 1.035; data[i] = last; } windSource = ctx.createBufferSource(); windSource.buffer = buffer; windSource.loop = true; windGain = ctx.createGain(); windGain.gain.value = 0; const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700; windSource.connect(filter).connect(windGain).connect(ctx.destination); windSource.start(); } windGain.gain.setTargetAtTime(state.sound ? .24 : 0, ctx.currentTime, .6); icon($('#sound'), state.sound ? 'volume-2' : 'volume-x'); $('#sound').setAttribute('aria-label', state.sound ? '关闭环境音' : '开启环境音'); $('#sound').title = state.sound ? '关闭环境音' : '开启环境音'; } catch { toast('此浏览器暂时无法播放声音'); }
};
let bellTime = -10;
$('#bell').onclick = () => { bellTime = performance.now() / 1000; try { const ctx = ensureAudio(); for (const offset of [0, .13]) for (const freq of [1850, 2780, 3720]) { const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = freq; gain.gain.setValueAtTime(0, ctx.currentTime + offset); gain.gain.linearRampToValueAtTime(.045, ctx.currentTime + offset + .005); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + offset + 1.1); osc.connect(gain).connect(ctx.destination); osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 1.2); } } catch { /* Visual feedback remains available when audio is unsupported. */ } toast('叮铃！海风借过。'); };
$('#photo').onclick = () => { renderer.render(scene, camera); renderer.domElement.toBlob((blob) => { if (!blob) return toast('照片未能保存，请重试'); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `海风骑行-${{day:'晴日',sunset:'日落',night:'月夜'}[state.time]}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); toast('这一刻的海风，收好了。'); }); };
$('#fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#app').requestFullscreen(); } catch { toast('此浏览器不支持全屏模式'); } };
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); toast('三维画面已中断，请刷新页面恢复'); });
let lastFrameTime = performance.now(), elapsed = 0; let simTime = 0, lastUi = 0;
const targetColor = new THREE.Color();
function animate() {
  requestAnimationFrame(animate); const now=performance.now(); const dt=Math.min((now-lastFrameTime)/1000,.05);lastFrameTime=now;elapsed+=dt;
  const movingDt = state.running && !document.hidden ? dt : 0;
  simTime += movingDt; state.phase += movingDt * state.speed / 6; state.distance += movingDt * state.speed / 3600;
  const phase = state.phase;
  blinkT=simTime%5.7; for(const eye of eyeDetails) eye.scale.y = blinkT>5.45 ? .01 : .068;
  for (const w of wheels) w.rotation.z = -phase * 1.45;
  crank.rotation.z = -phase;
  rider.position.y = Math.sin(phase * 2) * .014;
  bird.rotation.x = Math.sin(phase) * .015;
  const bellAge = performance.now() / 1000 - bellTime;
  bird.rotation.z = bellAge < .7 ? Math.sin(bellAge * 22) * .022 : Math.sin(phase * 2) * .007;
  for (const { side, pedal } of pedals) { pedal.position.set(crankPos[0] + Math.cos(-phase) * .26 * side, crankPos[1] + Math.sin(-phase) * .26 * side, side * .27); }
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i], p = pedals[i].pedal.position, hip = new THREE.Vector3(-.55, 1.98, leg.side * .29), foot = new THREE.Vector3(p.x, p.y + .075, p.z);
    const delta = foot.clone().sub(hip), d = delta.length(), len = .77;
    const knee = hip.clone().add(foot).multiplyScalar(.5).add(new THREE.Vector3(-delta.y, delta.x, 0).normalize().multiplyScalar(Math.sqrt(Math.max(.015, len * len - d * d / 4))));
    setBone(leg.upper, hip, knee); setBone(leg.lower, knee, foot); leg.foot.position.copy(foot).add(new THREE.Vector3(.07, 0, .01));
  }
  const cloth = scarfGeo.attributes.position;
  for (let i = 0; i < cloth.count; i++) { const x = scarfBase[i * 3], t = (.62 - x) / 1.24; cloth.setY(i, scarfBase[i * 3 + 1] + Math.sin(t * 7 - phase * 2) * t * .13); cloth.setZ(i, Math.sin(t * 8 - phase * 1.7) * t * .13); } cloth.needsUpdate = true; scarfGeo.computeVertexNormals();
  for (const { obj, span, factor } of moving) { obj.position.x -= movingDt * state.speed / 8 * factor; if (obj.position.x < -span / 2) obj.position.x += span; }
  const positions = waterGeo.attributes.position;
  if (state.frames % 2 === 0) { for (let i = 0; i < positions.count; i++) { const x = waterBase[i * 3], z = waterBase[i * 3 + 2]; positions.setY(i, Math.sin(x * .4 + simTime * .8) * Math.cos(z * .5 + simTime * .4) * .07); } positions.needsUpdate = true; waterGeo.computeVertexNormals(); }
  for (let i = 0; i < foam.length; i++) { foam[i].position.x -= movingDt * .17; if (foam[i].position.x < -50) foam[i].position.x = 50; foam[i].scale.x = .8 + Math.sin(simTime * .6 + i) * .2; }
  boats.forEach((g, i) => { g.rotation.z = Math.sin(simTime * .75 + i) * .045; g.position.y = -.03 + Math.sin(simTime + i) * .06; });
  gulls.forEach(({ g, wings }, i) => { g.position.y = 7 + i % 3 + Math.sin(simTime * .6 + i) * .3; g.position.x += movingDt * .38; if (g.position.x > 30) g.position.x = -30; wings.forEach((w, n) => w.rotation.z = Math.sin(simTime * 3 + i) * .22 * (n ? 1 : -1)); });
  clouds.forEach((g) => { g.position.x += movingDt * .06; if (g.position.x > 80) g.position.x = -80; });
  const p = palettes[state.time], smoothing = 1 - Math.exp(-dt * 2.5);
  scene.background.lerp(targetColor.set(p.sky), smoothing); scene.fog.color.copy(scene.background); waterMat.color.lerp(targetColor.set(p.water), smoothing); sun.color.lerp(targetColor.set(p.sun), smoothing); sun.intensity = THREE.MathUtils.lerp(sun.intensity, p.intensity, smoothing); hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, p.hemi, smoothing); renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure, p.exposure, smoothing);
  if (cameraTransition) { const dest = cameraPosition(state.camera); camera.position.lerp(dest, 1 - Math.exp(-dt * 3)); if (camera.position.distanceTo(dest) < .03) cameraTransition = false; }
  controls.autoRotate = state.camera === 'orbit' && !cameraTransition && state.running;
  controls.update(dt); renderer.render(scene, camera); state.frames++;
  if (elapsed - lastUi > .25) { $('#distance').textContent = state.distance.toFixed(2); lastUi = elapsed; }
  if (state.frames === 2) {$('#loading').classList.add('done');$('#loading').setAttribute('aria-hidden','true');}
}
document.addEventListener('visibilitychange', () => { if (windGain && audioCtx) windGain.gain.setTargetAtTime(!document.hidden && state.sound ? .24 : 0, audioCtx.currentTime, .2); });
$('#adventure').onclick=()=>{state.running=true;updatePlaying();$('#cameras').querySelector('[data-camera="side"]').click();toast('出发吧，今天把忙碌留在身后。');};
$('.customize').onclick=e=>{const b=e.target.closest('[data-color]');if(!b)return;m.teal.color.set(b.dataset.color);for(const el of $('.customize').querySelectorAll('button'))el.setAttribute('aria-pressed',String(el===b));toast('给单车换上今天的心情');};
function setCinema(active){document.body.classList.toggle('cinematic',active);for(const el of document.querySelectorAll('header,.hero,.tools,footer,.customize'))el.inert=active;(active?$('#exit-cinema'):$('#cinema')).focus();}
$('#cinema').onclick=()=>setCinema(true);
$('#exit-cinema').onclick=()=>setCinema(false);
addEventListener('keydown',e=>{if(e.code==='Escape'&&document.body.classList.contains('cinematic')){setCinema(false);return;}if(/INPUT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();$('#play').click();}if(e.code==='KeyB')$('#bell').click();if(e.code==='Escape')setCinema(false);});
window.__pelican = { state, renderer, scene, camera, getStats: () => ({ frames: state.frames, distance: state.distance, phase: state.phase, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }) };
animate();
