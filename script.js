// =============================
// Canvas Setup
// =============================
const canvas = document.getElementById("clothCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const sidebarWidth = 260;
  canvas.width = window.innerWidth - sidebarWidth - 40;
  canvas.height = window.innerHeight - 60;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// =============================
// CONFIG: Smooth 3D Cloth
// =============================

// Dense mesh (small cells, boxes barely visible)
const COLS = 80;
const ROWS = 60;
const SPACING = 8;

// Thickness (depth slices)
const DEPTH_LAYERS = 6;   // 3D thickness
const DEPTH_GAP = 4;

// Physics
let gravityEnabled = true;
let GRAVITY_BASE = 0.8;        // base gravity
let gravityMultiplier = 1.0;   // 0..2 from slider

const DAMPING = 0.96;
const CLOTH_DRAG = 0.002;
let tensionFactor = 1.0;

// Cut depth: 0..1 (0 = surface only, 1 = full thickness)
let cutDepthFactor = 1.0;

let viewAngleDeg = 0;
let simCenterX = 0;

const ITERATIONS = 14;

// Cutting
let isDragging = false;
let cutPath = [];

// =============================
// UI Controls (null-safe)
// =============================

// Tension
const tensionSlider = document.getElementById("tension");
const tensionLabel = document.getElementById("tensionValue");
if (tensionSlider) {
  tensionSlider.value = tensionSlider.value || "100";
  tensionFactor = (Number(tensionSlider.value) || 100) / 100;
  if (tensionLabel) tensionLabel.textContent = `${tensionSlider.value}%`;
  tensionSlider.addEventListener("input", (e) => {
    const v = Number(e.target.value) || 0;
    tensionFactor = v / 100;
    if (tensionLabel) tensionLabel.textContent = `${v}%`;
  });
}

// View angle
const viewSlider = document.getElementById("viewAngle");
const viewLabel = document.getElementById("viewAngleValue");
if (viewSlider) {
  viewSlider.value = viewSlider.value || "0";
  viewAngleDeg = Number(viewSlider.value) || 0;
  if (viewLabel) viewLabel.textContent = `${viewSlider.value}°`;
  viewSlider.addEventListener("input", (e) => {
    const v = Number(e.target.value) || 0;
    viewAngleDeg = v;
    if (viewLabel) viewLabel.textContent = `${v}°`;
  });
}

// Gravity toggle
const gravityToggle = document.getElementById("gravityToggle");
if (gravityToggle) {
  gravityToggle.checked = true;
  gravityEnabled = true;
  gravityToggle.addEventListener("change", (e) => {
    gravityEnabled = e.target.checked;
  });
}

// Gravity strength (optional but recommended)
const gravityStrengthSlider = document.getElementById("gravityStrength");
const gravityStrengthLabel = document.getElementById("gravityStrengthValue");
if (gravityStrengthSlider) {
  gravityStrengthSlider.value = gravityStrengthSlider.value || "100";
  gravityMultiplier =
    (Number(gravityStrengthSlider.value) || 100) / 100;
  if (gravityStrengthLabel) {
    gravityStrengthLabel.textContent = `${gravityStrengthSlider.value}%`;
  }
  gravityStrengthSlider.addEventListener("input", (e) => {
    const v = Number(e.target.value) || 0;
    gravityMultiplier = v / 100;
    if (gravityStrengthLabel) {
      gravityStrengthLabel.textContent = `${v}%`;
    }
  });
} else {
  gravityMultiplier = 1.0; // default
}

// Cut depth slider (surface vs full depth)
const cutDepthSlider = document.getElementById("cutDepth");
const cutDepthLabel = document.getElementById("cutDepthValue");
if (cutDepthSlider) {
  cutDepthSlider.value = cutDepthSlider.value || "100";
  cutDepthFactor = (Number(cutDepthSlider.value) || 100) / 100;
  if (cutDepthLabel) {
    cutDepthLabel.textContent = `${cutDepthSlider.value}%`;
  }
  cutDepthSlider.addEventListener("input", (e) => {
    const v = Number(e.target.value) || 0;
    cutDepthFactor = v / 100;
    if (cutDepthLabel) cutDepthLabel.textContent = `${v}%`;
  });
} else {
  cutDepthFactor = 1.0; // full-depth cuts by default
}

// =============================
// Math Helpers
// =============================
function dist2D(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMousePos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function segmentsIntersect(a, b, c, d) {
  function ccw(p, q, r) {
    return (r.y - p.y) * (q.x - p.x) > (q.y - p.y) * (r.x - p.x);
  }
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

// 3D projection
function projectPoint(p) {
  const ang = (viewAngleDeg * Math.PI) / 180;
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);

  const u = p.x - simCenterX;
  const v = p.y;
  const w = p.z;

  const uRot = u * cosA + w * sinA;
  const wRot = -u * sinA + w * cosA;

  return {
    x: simCenterX + uRot,
    y: v - wRot * 0.18,
    depth: wRot,
  };
}

// =============================
// Point Class
// =============================
class Point {
  constructor(x, y, z, pinned = false) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.oldx = x;
    this.oldy = y;
    this.pinned = pinned;
  }

  update() {
    if (this.pinned) return;

    let vx = (this.x - this.oldx) * DAMPING;
    let vy = (this.y - this.oldy) * DAMPING;

    if (gravityEnabled) {
      vy += GRAVITY_BASE * gravityMultiplier;
    }

    vx -= vx * CLOTH_DRAG;
    vy -= vy * CLOTH_DRAG;

    this.oldx = this.x;
    this.oldy = this.y;

    this.x += vx;
    this.y += vy;

    if (this.x < 5) this.x = 5;
    if (this.x > canvas.width - 5) this.x = canvas.width - 5;
    if (this.y < 5) this.y = 5;
    if (this.y > canvas.height - 5) this.y = canvas.height - 5;
  }
}

// =============================
// Stick Class
// =============================
class Stick {
  constructor(p1, p2, depthIndex, isVolume = false) {
    this.p1 = p1;
    this.p2 = p2;
    this.baseLength = dist2D(p1, p2);
    this.depthIndex = depthIndex;
    this.isVolume = isVolume;
    this.broken = false;
  }

  update() {
    if (this.broken) return;

    let dx = this.p2.x - this.p1.x;
    let dy = this.p2.y - this.p1.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const loosen = 1 - tensionFactor;
    const targetLength = this.baseLength * (1 + 0.35 * loosen);

    const diff = (targetLength - dist) / dist;

    const stiffness = this.isVolume ? 0.28 : 0.45;
    const offX = dx * diff * 0.5 * stiffness;
    const offY = dy * diff * 0.5 * stiffness;

    if (!this.p1.pinned) {
      this.p1.x -= offX;
      this.p1.y -= offY;
    }
    if (!this.p2.pinned) {
      this.p2.x += offX;
      this.p2.y += offY;
    }
  }

  draw() {
    if (this.broken) return;

    const p1s = projectPoint(this.p1);
    const p2s = projectPoint(this.p2);

    const midY = (p1s.y + p2s.y) / 2;
    const depthFactor = 1 - this.depthIndex / (DEPTH_LAYERS - 1);
    const heightFactor = 1 - midY / canvas.height;
    const lambert = Math.max(0.25, 0.35 * depthFactor + 0.65 * heightFactor);

    const r = 230 * lambert;
    const g = 230 * lambert;
    const b = 255 * lambert;

    ctx.beginPath();
    ctx.moveTo(p1s.x, p1s.y);
    ctx.lineTo(p2s.x, p2s.y);
    ctx.lineWidth = (this.isVolume ? 1.2 : 2.0) + this.depthIndex * 0.25;
    ctx.strokeStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.stroke();
  }
}

// =============================
// Cloth Construction
// =============================
let slices = [];
let volumeSticks = [];

function createSlice(depthIndex) {
  const points = [];
  const sticks = [];
  const z = depthIndex * DEPTH_GAP;

  for (let y = 0; y <= ROWS; y++) {
    for (let x = 0; x <= COLS; x++) {
      const pinned = x === 0 || x === COLS;
      points.push(
        new Point(x * SPACING + 140, y * SPACING + 80, z, pinned)
      );
    }
  }

  // Structural + triangles
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * (COLS + 1) + x;

      const p = points[i];
      const pr = points[i + 1];
      const pd = points[i + COLS + 1];
      const pdr = points[i + COLS + 2];

      sticks.push(new Stick(p, pr, depthIndex));
      sticks.push(new Stick(p, pd, depthIndex));
      sticks.push(new Stick(p, pdr, depthIndex));
      sticks.push(new Stick(pr, pd, depthIndex));
    }
  }

  // Bending constraints
  for (let y = 0; y < ROWS - 1; y++) {
    for (let x = 0; x < COLS - 1; x++) {
      const i = y * (COLS + 1) + x;
      const p = points[i];
      const p2 = points[i + 2];
      const p3 = points[i + 2 * (COLS + 1)];
      if (p2) sticks.push(new Stick(p, p2, depthIndex));
      if (p3) sticks.push(new Stick(p, p3, depthIndex));
    }
  }

  return { points, sticks };
}

function connectSlices() {
  volumeSticks = [];
  for (let d = 0; d < DEPTH_LAYERS - 1; d++) {
    const A = slices[d];
    const B = slices[d + 1];
    for (let i = 0; i < A.points.length; i++) {
      volumeSticks.push(new Stick(A.points[i], B.points[i], d, true));
    }
  }
}

function computeSimCenterX() {
  const pts = slices[0].points;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
  }
  simCenterX = (minX + maxX) / 2;
}

function initCloth() {
  slices = [];
  for (let d = 0; d < DEPTH_LAYERS; d++) {
    slices.push(createSlice(d));
  }
  connectSlices();
  computeSimCenterX();
}

initCloth();

// =============================
// Cutting with Depth Control
// =============================
function performCut() {
  if (cutPath.length < 2) return;

  // decide how many depth layers to cut
  // 0% => only layer 0
  // 100% => all DEPTH_LAYERS-1
  const maxLayerIndex = Math.floor(
    cutDepthFactor * (DEPTH_LAYERS - 1)
  );

  for (let i = 0; i < cutPath.length - 1; i++) {
    const A = cutPath[i];
    const B = cutPath[i + 1];

    // per-slice sticks
    for (let d = 0; d <= maxLayerIndex; d++) {
      const slice = slices[d];
      for (const s of slice.sticks) {
        if (s.broken) continue;
        const C = projectPoint(s.p1);
        const D = projectPoint(s.p2);
        if (segmentsIntersect(A, B, C, D)) s.broken = true;
      }
    }

    // volume sticks between slices (use their depthIndex)
    for (const s of volumeSticks) {
      if (s.broken) continue;
      if (s.depthIndex > maxLayerIndex) continue;
      const C = projectPoint(s.p1);
      const D = projectPoint(s.p2);
      if (segmentsIntersect(A, B, C, D)) s.broken = true;
    }
  }
}

// Mouse events
canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  cutPath = [getMousePos(e)];
});
canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  cutPath.push(getMousePos(e));
});
canvas.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  performCut();
});
canvas.addEventListener("mouseleave", () => {
  if (!isDragging) return;
  isDragging = false;
  performCut();
});

// =============================
// Reset
// =============================
const resetBtn = document.getElementById("reset");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    initCloth();
  });
}

// =============================
// Simulation Loop
// =============================
function update() {
  for (const slice of slices) {
    for (const p of slice.points) p.update();
  }

  for (let k = 0; k < ITERATIONS; k++) {
    for (const slice of slices) {
      for (const s of slice.sticks) s.update();
    }
    for (const s of volumeSticks) s.update();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // back → front
  for (let d = DEPTH_LAYERS - 1; d >= 0; d--) {
    const slice = slices[d];
    for (const s of slice.sticks) s.draw();
  }
  for (const s of volumeSticks) s.draw();

  if (isDragging && cutPath.length > 1) {
    ctx.beginPath();
    ctx.moveTo(cutPath[0].x, cutPath[0].y);
    for (let i = 1; i < cutPath.length; i++) {
      ctx.lineTo(cutPath[i].x, cutPath[i].y);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,0,0,0.9)";
    ctx.stroke();
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
