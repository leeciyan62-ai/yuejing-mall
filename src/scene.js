import * as THREE from 'three';
import { FLOORS, floorZones, zoneOfShop } from './data.js';
import { buildStreet } from './world/index.js';
import { createCharacter } from './character.js';
import { toonUniforms } from './toon.js';

const SLOTS = [
  ['left', 12], ['right', 12], ['left', 6], ['right', 6], ['left', 0], ['right', 0],
  ['left', -6], ['right', -6], ['left', -12], ['right', -12],
];
const CANOPIES = [0xe47b68, 0x5aa6a2, 0xe0b15a, 0xd46a8a, 0x7aaa62, 0xc47a4a, 0x6a8ec0, 0xd45a48, 0xc9a24a, 0x8a7ab8];
const KINDS = {
  pot: 'pot', tea: 'drink', food: 'griddle', bakery: 'fry', fruit: 'fruit', grill: 'grill', hotpot: 'pot', cafe: 'drink',
  restaurant: 'pot', western: 'griddle', jewel: 'scale', glasses: 'scale', watch: 'scale', perfume: 'drink', beauty: 'scale',
  bags: 'scale', fashion: 'scale', sport: 'game', cinema: 'game', shoes: 'scale', books: 'scale', gym: 'game', kids: 'game',
  yoga: 'game', blocks: 'game',
};
const TRIGGER = 1.15;
const CLICK = 1.55;

function toStalls(shops) {
  return shops.map((shop, i) => ({
    id: shop.id,
    name: shop.name,
    sign: shop.category,
    side: SLOTS[i][0],
    z: SLOTS[i][1],
    kind: KINDS[shop.kind] || 'pot',
    canopy: CANOPIES[i % CANOPIES.length],
    shop,
  }));
}

function lerpAngle(from, to, t) {
  let delta = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

export function createMall(canvas, hooks = {}) {
  const onShop = typeof hooks === 'function' ? hooks : hooks.onShop;
  const onZone = typeof hooks === 'function' ? () => {} : (hooks.onZone || (() => {}));
  const compact = window.matchMedia('(max-width: 720px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.5 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x263552, 1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x263552);
  scene.fog = new THREE.Fog(0x71869a, 55, 190);
  scene.add(new THREE.HemisphereLight(0xc2e2ef, 0x5b4a42, 1.35));
  const moon = new THREE.DirectionalLight(0xd8e7ff, 0.62);
  moon.position.set(-8, 18, 6);
  scene.add(moon);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 170);
  const character = createCharacter();
  character.group.position.set(0, 0, 13.2);
  character.group.rotation.y = Math.PI;
  scene.add(character.group);

  const built = new Map();
  let active = 0;
  let zone = 0;
  let world = null;
  let running = true;
  let nearbyId = '';
  const initialDistance = compact ? 12.4 : 14.8;
  const view = { yaw: -0.679, pitch: 0.705, dist: initialDistance, distTarget: initialDistance, fov: 40 };
  const keys = new Set();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const moveDir = new THREE.Vector3();
  const lookTarget = new THREE.Vector3(0, 0.9, 10.8);
  let moveTarget = null;
  let speed01 = 0;
  let clock = 0;
  const pointers = new Map();
  let dragDistance = 0;
  let pinchDistance = 0;

  function blocked() {
    return Boolean(document.querySelector('dialog[open]'));
  }
  function screenToGround(clientX, clientY) {
    if (!world) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(ground, hit)) return null;
    hit.x = THREE.MathUtils.clamp(hit.x, -world.walkHalf, world.walkHalf);
    hit.z = THREE.MathUtils.clamp(hit.z, world.bounds.zMin, world.bounds.zMax);
    return hit;
  }
  function stallAt(hit) {
    let found = null;
    let best = CLICK;
    for (const stall of world.stalls) {
      const distance = Math.hypot(stall.anchor.x - hit.x, stall.anchor.z - hit.z);
      if (distance < best) {
        best = distance;
        found = stall;
      }
    }
    return found;
  }
  function standAt(stall) {
    character.group.position.set(stall.anchor.x, 0, stall.anchor.z);
    character.group.rotation.y = stall.side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    moveTarget = null;
    placeCamera();
  }
  function showZone(zoneIndex) {
    const zones = floorZones(FLOORS[active]);
    zone = THREE.MathUtils.clamp(zoneIndex, 0, zones.length - 1);
    const key = `${active}:${zone}`;
    if (!built.has(key)) {
      const root = new THREE.Group();
      const current = zones[zone];
      const stalls = toStalls(current.shops);
      const street = buildStreet(root, stalls, { gate: FLOORS[active].name, exit: current.name });
      scene.add(root);
      built.set(key, { root, street });
    }
    for (const entry of built.values()) entry.root.visible = false;
    const entry = built.get(key);
    entry.root.visible = true;
    world = entry.street;
    character.group.position.set(0, 0, 13.2);
    character.group.rotation.y = Math.PI;
    moveTarget = null;
    nearbyId = '';
    view.yaw = -0.679;
    view.pitch = 0.705;
    view.dist = initialDistance;
    view.distTarget = initialDistance;
    placeCamera();
    onZone(zone);
    resize();
  }
  function placeCamera() {
    const horizontal = Math.cos(view.pitch) * view.dist;
    const focus = character.group.position;
    camera.position.set(
      focus.x + Math.sin(view.yaw) * horizontal,
      focus.y + Math.sin(view.pitch) * view.dist,
      focus.z + Math.cos(view.yaw) * horizontal,
    );
    lookTarget.set(focus.x, focus.y + 0.9, focus.z - 2.4);
    camera.lookAt(lookTarget);
  }

  canvas.addEventListener('pointerdown', (event) => {
    try { canvas.setPointerCapture(event.pointerId); } catch { /* still tracks the pointer */ }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
    dragDistance = 0;
  });
  canvas.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const spread = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0) view.distTarget = THREE.MathUtils.clamp(view.distTarget * (pinchDistance / Math.max(1, spread)), 9, 36);
      pinchDistance = spread;
      return;
    }
    dragDistance += Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
    if (dragDistance > 6) {
      view.yaw -= (event.clientX - previous.x) * 0.006;
      view.pitch = THREE.MathUtils.clamp(view.pitch - (event.clientY - previous.y) * 0.004, 0.42, 1.24);
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (dragDistance > 6 || blocked() || !world || pointers.size > 0) return;
    const hit = screenToGround(event.clientX, event.clientY);
    if (!hit) return;
    const stall = stallAt(hit);
    if (!stall) {
      moveTarget = hit;
      return;
    }
    const here = Math.hypot(character.group.position.x - stall.anchor.x, character.group.position.z - stall.anchor.z);
    if (here < TRIGGER) onShop(stall.shop);
    else moveTarget = stall.anchor.clone();
  });
  canvas.addEventListener('pointercancel', (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    view.distTarget = THREE.MathUtils.clamp(view.distTarget + event.deltaY * 0.012, 9, 36);
  }, { passive: false });
  function onKey(event) {
    const key = event.key.toLowerCase();
    if (event.target.matches?.('input, textarea')) return;
    if (key === 'e' && nearbyId && !blocked()) {
      const stall = world?.stalls.find((item) => item.id === nearbyId);
      if (stall) onShop(stall.shop);
      return;
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      if (blocked()) return;
      keys.add(key);
      moveTarget = null;
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (width < 2 || height < 2) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const aspect = width / height;
    view.fov = aspect >= 1.25 ? 40 : aspect >= 0.95 ? 48 : 52;
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  }
  function setFloor(i) {
    active = i;
    showZone(0);
  }
  function focusShop(shop) {
    const floorIndex = FLOORS.findIndex((floor) => floor.id === shop.floor);
    const zoneIndex = zoneOfShop(shop);
    const switched = active !== floorIndex || zone !== zoneIndex || !built.has(`${floorIndex}:${zoneIndex}`);
    active = floorIndex;
    if (switched) showZone(zoneIndex);
    const stall = world.stalls.find((item) => item.id === shop.id);
    if (stall) standAt(stall);
  }

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!running || !world) return;
    clock += dt;
    moveDir.set(0, 0, 0);
    if (!blocked()) {
      const left = keys.has('a') || keys.has('arrowleft');
      const right = keys.has('d') || keys.has('arrowright');
      const forward = keys.has('w') || keys.has('arrowup');
      const back = keys.has('s') || keys.has('arrowdown');
      moveDir.x = (right ? 1 : 0) - (left ? 1 : 0);
      moveDir.z = (back ? 1 : 0) - (forward ? 1 : 0);
      if (moveDir.lengthSq() > 0) moveDir.normalize();
      else if (moveTarget) {
        const delta = moveTarget.clone().sub(character.group.position);
        delta.y = 0;
        if (delta.length() < 0.2) moveTarget = null;
        else moveDir.copy(delta.normalize());
      }
    }
    speed01 = 0;
    if (moveDir.lengthSq() > 0) {
      character.group.position.addScaledVector(moveDir, 3.2 * dt);
      character.group.position.x = THREE.MathUtils.clamp(character.group.position.x, -world.walkHalf, world.walkHalf);
      character.group.position.z = THREE.MathUtils.clamp(character.group.position.z, world.bounds.zMin, world.bounds.zMax);
      character.group.rotation.y = lerpAngle(character.group.rotation.y, Math.atan2(moveDir.x, moveDir.z), 1 - Math.exp(-12 * dt));
      speed01 = 1;
    }
    character.update(dt, speed01);

    let nearest = null;
    let nearestDistance = Infinity;
    for (const stall of world.stalls) {
      const distance = stall.anchor.distanceTo(character.group.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = stall;
      }
    }
    const nextId = nearest && nearestDistance < TRIGGER && !blocked() ? nearest.id : '';
    if (nextId !== nearbyId) {
      nearbyId = nextId;
      const caption = document.getElementById('scene-caption');
      const hint = floorZones(FLOORS[active])[zone].hint;
      if (caption) {
        caption.innerHTML = nearest && nextId
          ? `到了 ${nearest.name}<br><small>再点一次，或按 E 看这家</small>`
          : `${hint}<br><small>点地面走过去 · 方向键也能走 · 拖动转头</small>`;
      }
    }

    view.dist += (view.distTarget - view.dist) * (1 - Math.exp(-3.2 * dt));
    const blend = THREE.MathUtils.clamp((view.dist - 21) / 20, 0, 1);
    const focus = character.group.position.clone().lerp(new THREE.Vector3(), blend);
    const horizontal = Math.cos(view.pitch) * view.dist;
    const target = new THREE.Vector3(
      focus.x + Math.sin(view.yaw) * horizontal,
      focus.y + Math.sin(view.pitch) * view.dist,
      focus.z + Math.cos(view.yaw) * horizontal,
    );
    const look = new THREE.Vector3(focus.x, focus.y + 0.9, focus.z - 2.4 + blend * 2.4);
    camera.position.lerp(target, 1 - Math.exp(-7 * dt));
    lookTarget.lerp(look, 1 - Math.exp(-7 * dt));
    camera.lookAt(lookTarget);
    world.update(dt, character.group.position, clock);
    toonUniforms.uCameraPos.value.copy(camera.position);
    renderer.render(scene, camera);
  });

  return {
    setFloor,
    setZone: showZone,
    focusShop,
    resize,
    setRunning(value) { running = value; },
    setBags(count) { character.setBags(count); },
    reset() { setFloor(active); },
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      ro.disconnect();
      renderer.dispose();
    },
  };
}
