// Cursor-driven parallax. Each layer moves at a different depth, the whole
// scene tilts toward the pointer, and the pill drifts slightly in the
// opposite direction so the composition feels like it has volume.

const scene = document.getElementById("scene");
const pill = document.getElementById("pill");
const layers = Array.from(scene.querySelectorAll(".layer"));

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// depth per layer, back to front (echoes lag behind, logo leads)
const depths = [-0.55, -0.35, -0.18, 0.25];

// Target pointer position in [-1, 1]
let tx = 0;
let ty = 0;
// Smoothed position
let cx = 0;
let cy = 0;

function onMove(x, y) {
  tx = (x / window.innerWidth) * 2 - 1;
  ty = (y / window.innerHeight) * 2 - 1;
}

window.addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY), { passive: true });
window.addEventListener("pointerleave", () => { tx = 0; ty = 0; });

// touch: drive the scene with device orientation. Neutral pose is whatever
// angle the phone is held at when the first reading arrives, so the scene
// starts centered instead of assuming a fixed 30deg tilt.
const TILT_RANGE = 25;
let baseBeta = null;
let baseGamma = null;

function onOrientation(e) {
  if (e.gamma == null || e.beta == null) return;
  if (baseBeta === null) {
    baseBeta = e.beta;
    baseGamma = e.gamma;
  }
  const gx = Math.max(-TILT_RANGE, Math.min(TILT_RANGE, e.gamma - baseGamma)) / TILT_RANGE;
  const gy = Math.max(-TILT_RANGE, Math.min(TILT_RANGE, e.beta - baseBeta)) / TILT_RANGE;
  tx = gx;
  ty = gy;
}

function attachOrientation() {
  window.addEventListener("deviceorientation", onOrientation, { passive: true });
}

// iOS 13+ only delivers orientation events after an explicit permission
// request made from a user gesture; everything else can listen right away.
if (typeof DeviceOrientationEvent !== "undefined") {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    const ask = () => {
      DeviceOrientationEvent.requestPermission()
        .then((state) => { if (state === "granted") attachOrientation(); })
        .catch(() => {});
      window.removeEventListener("touchend", ask);
      window.removeEventListener("click", ask);
    };
    window.addEventListener("touchend", ask, { passive: true });
    window.addEventListener("click", ask);
  } else {
    attachOrientation();
  }
}

let t = 0;

function frame() {
  // ease toward target
  cx += (tx - cx) * 0.08;
  cy += (ty - cy) * 0.08;
  t += 0.016;

  // idle breathing so it never sits perfectly still
  const idleX = Math.sin(t * 0.9) * 0.04;
  const idleY = Math.cos(t * 0.7) * 0.04;
  const px = cx + idleX;
  const py = cy + idleY;

  // tilt whole scene toward pointer
  const rotY = px * 14;
  const rotX = -py * 14;
  scene.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;

  // parallax per layer
  layers.forEach((layer, i) => {
    const d = depths[i];
    const dx = px * d * 60;
    const dy = py * d * 60;
    const dz = d * 80;
    layer.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, ${dz}px)`;
  });

  // pill drifts against the logo
  pill.style.transform = `translate3d(${(-px * 10).toFixed(1)}px, ${(-py * 6).toFixed(1)}px, 0)`;

  requestAnimationFrame(frame);
}

if (!reduceMotion) {
  requestAnimationFrame(frame);
}
