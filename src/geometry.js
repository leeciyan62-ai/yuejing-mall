import * as THREE from 'three';

export function place(x, y, z, rx = 0, ry = 0, rz = 0) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  return new THREE.Matrix4().makeRotationFromQuaternion(quat).setPosition(x, y, z);
}

function paint(g, color) {
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function flatten(geom) {
  if (!geom.index) return geom;
  const converted = geom.toNonIndexed();
  geom.dispose();
  return converted;
}

function pushPart(store, geom, color) {
  const g = flatten(geom);
  if (color) paint(g, color);
  store.push(g);
}

export function boxPart(store, w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.applyMatrix4(place(x, y, z, rx, ry, rz));
  pushPart(store, g, color);
}

export function cylPart(store, rTop, rBottom, h, segments, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, segments);
  g.applyMatrix4(place(x, y, z, rx, ry, rz));
  pushPart(store, g, color);
}

export function spherePart(store, r, color, x, y, z, segments = 10) {
  const g = new THREE.SphereGeometry(r, segments, Math.max(6, segments - 2));
  g.applyMatrix4(place(x, y, z));
  pushPart(store, g, color);
}

export function torusPart(store, r, tube, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.TorusGeometry(r, tube, 6, 14);
  g.applyMatrix4(place(x, y, z, rx, ry, rz));
  pushPart(store, g, color);
}

export function signPart(store, cell, atlas, w, h, x, y, z, ry = 0, rx = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, (cell.x + u * cell.w) / atlas.width, 1 - (cell.y + (1 - v) * cell.h) / atlas.height);
  }
  g.applyMatrix4(place(x, y, z, rx, ry, 0));
  pushPart(store, g, null);
}

export function mergeParts(parts, keepUV = false) {
  const total = parts.reduce((sum, g) => sum + g.attributes.position.count, 0);
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const color = keepUV ? null : new Float32Array(total * 3);
  const uv = keepUV ? new Float32Array(total * 2) : null;
  let offset = 0;
  for (const g of parts) {
    const count = g.attributes.position.count;
    position.set(g.attributes.position.array, offset * 3);
    normal.set(g.attributes.normal.array, offset * 3);
    if (color) color.set(g.attributes.color.array, offset * 3);
    if (uv && g.attributes.uv) uv.set(g.attributes.uv.array, offset * 2);
    offset += count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  if (color) out.setAttribute('color', new THREE.BufferAttribute(color, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  parts.length = 0;
  return out;
}
