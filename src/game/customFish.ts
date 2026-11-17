import type { Species } from "./species";

/**
 * Hand-modelled fish drawn from reference art:
 *   clown   — chubby 3D clownfish (Si Oren)
 *   idol    — Gill the Moorish idol
 *   shark   — Bruce the cartoon great white
 *   leopard — Toto the spotted leopard shark
 *
 * Every fish is drawn in a normalised space: 1 unit = sprite width, origin = sprite centre,
 * +x = forward (the fish faces right), +y = down.
 */
export type CustomStyle = "clown" | "idol" | "shark" | "shark_sleek" | "leopard" | "boris" | "andy" | "tang" | "leon" | "orca" | "barracuda" | "sailfish" | "eddy" | "stingray" | "mandarin" | "aurora" | "narwhal" | "seadragon" | "koi" | "axolotl" | "whaleshark";
type Expr = "normal" | "happy" | "panic";
type Ctx = CanvasRenderingContext2D;

const ASPECT: Record<CustomStyle, number> = { clown: 0.72, idol: 0.96, shark: 0.62, shark_sleek: 0.62, leopard: 0.44, boris: 0.84, andy: 0.92, tang: 0.82, leon: 0.94, orca: 0.56, barracuda: 0.46, sailfish: 0.64, eddy: 0.92, stingray: 0.56, mandarin: 0.78, aurora: 0.88, narwhal: 0.56, seadragon: 0.72, koi: 0.68, axolotl: 0.68, whaleshark: 0.54 };
/** mouth position as a fraction of the sprite width, measured from the sprite centre */
const MOUTH: Record<CustomStyle, [number, number]> = {
  clown: [0.34, 0.055],
  idol: [0.42, 0.0],
  shark: [0.365, 0.08],
  shark_sleek: [0.385, 0.055],
  leopard: [0.41, 0.05],
  boris: [0.355, 0.085],
  andy: [0.345, -0.004],
  tang: [0.33, 0.075],
  leon: [0.37, 0.068],
  orca: [0.37, 0.065],
  barracuda: [0.36, 0.01],
  sailfish: [0.34, 0.048],
  eddy: [0.32, 0.045],
  stingray: [0.32, 0.054],
  mandarin: [0.34, 0.032],
  aurora: [0.35, 0.025],
  narwhal: [0.275, 0.072],
  seadragon: [0.39, -0.015],
  koi: [0.345, 0.028],
  axolotl: [0.34, 0.035],
  whaleshark: [0.365, 0.048],
};

// (plain boolean on purpose: the legacy renderer keeps its own style checks type-valid)
export const isCustomStyle = (st: string): boolean =>
  st === "clown" || st === "idol" || st === "shark" || st === "shark_sleek" || st === "leopard" || st === "boris" || st === "andy" || st === "tang" || st === "leon" || st === "orca" || st === "barracuda" || st === "sailfish" || st === "eddy" || st === "stingray" || st === "mandarin" || st === "aurora" || st === "narwhal" || st === "seadragon" || st === "koi" || st === "axolotl" || st === "whaleshark";
export const customMouthOffset = (st: string, drawW: number): [number, number] => {
  const m = MOUTH[st as CustomStyle];
  return [m[0] * drawW, m[1] * drawW];
};

const TAU = Math.PI * 2;

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.startsWith("#") ? h.slice(1) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const ca = hexRgb(a),
    cb = hexRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t),
    g = Math.round(ca[1] + (cb[1] - ca[1]) * t),
    bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function rgba(h: string, a: number): string {
  const [r, g, b] = hexRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}

interface Pose {
  open: number; // 0..1 jaw gape
  puff: boolean; // chewing with a closed mouth
  wag: number; // tail beat -1..1
  wag2: number; // lagging fin ripple -1..1
  expr: Expr;
}

const lin = (c: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
};

/** soft elliptical glow that fades to nothing — never leaves a visible ring */
const glow = (c: Ctx, x: number, y: number, rx: number, ry: number, rot: number, rgb: string, a: number) => {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.6, `rgba(${rgb},${a * 0.35})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, rx, 0, TAU);
  c.fill();
  c.restore();
};

const fillStroke = (c: Ctx, build: () => void, fill: string | CanvasGradient, stroke: string, lw: number, inner?: () => void) => {
  c.beginPath();
  build();
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (inner) {
    c.save();
    c.clip();
    inner();
    c.restore();
    c.beginPath();
    build();
    c.closePath();
  }
  c.strokeStyle = stroke;
  c.lineWidth = lw;
  c.stroke();
};

const blob = (c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  c.fill();
};

interface EyeOpt {
  iris: string;
  expr: Expr;
  ol: string;
  sx?: number; // horizontal squash of the eyeball
  look?: number; // pupil offset forward
  lookY?: number;
  irisR?: number;
  pupilR?: number;
  lid?: number; // 0..1 how much of the eye the upper lid covers
  lidTilt?: number;
  lidCol?: string;
  lidEdge?: string;
  tilt?: number;
  noHappy?: boolean;
  happyCol?: string; // colour of the closed "smiling" eye (needed on dark faces)
}

function eye(c: Ctx, x: number, y: number, r: number, o: EyeOpt) {
  const panic = o.expr === "panic";
  c.save();
  c.translate(x, y);
  if (o.tilt) c.rotate(o.tilt);
  if (o.expr === "happy" && !o.noHappy) {
    c.beginPath();
    c.arc(0, r * 0.32, r * 0.8, Math.PI * 1.1, Math.PI * 1.9);
    c.strokeStyle = o.happyCol || o.ol;
    c.lineWidth = Math.max(r * 0.26, 0.007);
    c.stroke();
    c.restore();
    return;
  }
  const sx = (o.sx ?? 0.9) * (panic ? 1.1 : 1),
    sy = panic ? 1.1 : 1;
  c.beginPath();
  c.ellipse(0, 0, r * sx, r * sy, 0, 0, TAU);
  const sg = c.createRadialGradient(r * 0.2, -r * 0.25, r * 0.1, 0, 0, r * 1.1);
  sg.addColorStop(0, "#ffffff");
  sg.addColorStop(0.7, "#f5f8fd");
  sg.addColorStop(1, "#b4c4d8");
  c.fillStyle = sg;
  c.fill();
  c.save();
  c.clip();
  const ir = r * (o.irisR ?? 0.56) * (panic ? 0.7 : 1),
    pr = r * (o.pupilR ?? 0.34) * (panic ? 0.65 : 1);
  const ix = r * (o.look ?? 0.3) * (panic ? 0.7 : 1),
    iy = r * (o.lookY ?? 0.04);
  c.fillStyle = o.iris;
  c.beginPath();
  c.arc(ix, iy, ir, 0, TAU);
  c.fill();
  c.fillStyle = "#07060c";
  c.beginPath();
  c.arc(ix + r * 0.03, iy, pr, 0, TAU);
  c.fill();
  c.fillStyle = "rgba(255,255,255,0.97)";
  c.beginPath();
  c.arc(ix - pr * 0.4, iy - pr * 0.5, Math.max(pr * 0.42, 0.003), 0, TAU);
  c.fill();
  c.fillStyle = "rgba(200,240,255,0.7)";
  c.beginPath();
  c.arc(ix + pr * 0.45, iy + pr * 0.5, pr * 0.2, 0, TAU);
  c.fill();
  if (o.lid && !panic) {
    c.rotate(o.lidTilt ?? 0);
    const ly = -r + o.lid * 2 * r;
    c.fillStyle = o.lidCol || o.ol;
    c.fillRect(-r * 1.8, -r * 1.8, r * 3.6, r * 1.8 + ly);
    c.strokeStyle = o.lidEdge || o.ol;
    c.lineWidth = r * 0.14;
    c.beginPath();
    c.moveTo(-r * 1.8, ly);
    c.lineTo(r * 1.8, ly);
    c.stroke();
  }
  c.restore();
  c.beginPath();
  c.ellipse(0, 0, r * sx, r * sy, 0, 0, TAU);
  c.strokeStyle = o.ol;
  c.lineWidth = Math.max(r * 0.12, 0.0045);
  c.stroke();
  c.restore();
}

/** fan of rays from a hub to points spread along a segment */
const rayFan = (c: Ctx, hx: number, hy: number, pts: [number, number][], col: string, lw: number) => {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.beginPath();
  for (const [x, y] of pts) {
    c.moveTo(hx, hy);
    c.lineTo(x, y);
  }
  c.stroke();
};

/** row of triangular teeth from a (hinge side) to b (jaw tip); (nx, ny) points into the mouth */
const teethRow = (c: Ctx, ax: number, ay: number, bx: number, by: number, n: number, nx: number, ny: number, len: (t: number) => number, t0 = 0.14, t1 = 0.99) => {
  c.fillStyle = "#ffffff";
  c.strokeStyle = "rgba(60,70,90,0.55)";
  c.lineWidth = 0.0025;
  for (let i = 0; i < n; i++) {
    const a = t0 + ((t1 - t0) * i) / n,
      b = t0 + ((t1 - t0) * (i + 1)) / n,
      m = (a + b) / 2;
    const l = len(m);
    if (l < 0.002) continue;
    c.beginPath();
    c.moveTo(ax + (bx - ax) * a, ay + (by - ay) * a);
    c.lineTo(ax + (bx - ax) * m + nx * l, ay + (by - ay) * m + ny * l);
    c.lineTo(ax + (bx - ax) * b, ay + (by - ay) * b);
    c.closePath();
    c.fill();
    c.stroke();
  }
};

/** sharp curved teeth along a quadratic Bezier jaw arch (p0=hinge -> p1=control -> p2=tip); side = +1 or -1 points into the mouth */
const curvedTeethRow = (
  c: Ctx,
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  n: number,
  side: 1 | -1,
  len: (t: number) => number,
  t0 = 0.12,
  t1 = 0.98
) => {
  const evalPt = (t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * p0x + 2 * u * t * p1x + t * t * p2x, u * u * p0y + 2 * u * t * p1y + t * t * p2y];
  };
  const evalTan = (t: number): [number, number] => {
    const dx = 2 * (1 - t) * (p1x - p0x) + 2 * t * (p2x - p1x);
    const dy = 2 * (1 - t) * (p1y - p0y) + 2 * t * (p2y - p1y);
    const d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  };
  c.fillStyle = "#ffffff";
  c.strokeStyle = "rgba(45, 58, 76, 0.48)";
  c.lineWidth = 0.0026;
  for (let i = 0; i < n; i++) {
    const a = t0 + ((t1 - t0) * i) / n;
    const b = t0 + ((t1 - t0) * (i + 1)) / n;
    const m = (a + b) / 2;
    const l = len(m);
    if (l < 0.002) continue;
    const [ax, ay] = evalPt(a);
    const [bx, by] = evalPt(b);
    const [mx, my] = evalPt(m);
    const [tx, ty] = evalTan(m);
    // inward normal + slight backward slant toward throat for shark teeth look
    const nx = -ty * side - tx * 0.12;
    const ny = tx * side - ty * 0.12;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(mx + nx * l, my + ny * l);
    c.lineTo(bx, by);
    c.closePath();
    c.fill();
    c.stroke();
  }
};

// =====================================================================================
// CLOWNFISH (Si Oren) — matching Image 1 silhouette & proportions:
// compact reef-fish scale, sleeker tapered tail stalk, big rounded paddle tail,
// 3-scallop tall front dorsal + rounded rear dorsal, split double pelvic fin,
// 3 crisp black-edged white bands & big expressive glossy eye!
// =====================================================================================
function drawClown(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const OR = pal.body,
    ORD = pal.dark,
    ORL = mix(pal.belly, "#ffffff", 0.14);
  const BLK = "#180b04",
    WH = "#fffdf8";
  const OL = rgba(pal.outline, 0.88);
  const LW = 0.0105;
  // Compact natural reef clownfish proportion so Nemo isn't larger than other species
  c.scale(0.84, 0.84);
  c.translate(0.01, 0.02);

  const finGrad = (x0: number, y0: number, x1: number, y1: number) =>
    lin(c, x0, y0, x1, y1, [
      [0, mix(OR, ORD, 0.28)],
      [0.55, OR],
      [1, ORL],
    ]);
  // orange fin with crisp black outer rim (matching Image 1)
  const rimFin = (full: () => void, edge: () => void, fill: string | CanvasGradient, rays?: () => void, bw = 0.052) => {
    c.beginPath();
    full();
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.save();
    c.clip();
    if (rays) rays();
    c.beginPath();
    edge();
    c.strokeStyle = BLK;
    c.lineWidth = bw;
    c.stroke();
    c.restore();
    c.beginPath();
    full();
    c.closePath();
    c.strokeStyle = OL;
    c.lineWidth = LW * 0.85;
    c.stroke();
  };
  const rayCol = rgba(ORD, 0.42);

  // ---- tail: big rounded paddle at end of slim peduncle (Image 1!) ----
  c.save();
  c.translate(-0.215, 0.015);
  c.rotate(p.wag * 0.18);
  c.scale(1 - Math.abs(p.wag) * 0.05, 1);
  const tailEdge = () => {
    c.moveTo(0.01, -0.052);
    c.bezierCurveTo(-0.055, -0.148, -0.195, -0.172, -0.242, -0.088);
    c.bezierCurveTo(-0.275, -0.03, -0.275, 0.055, -0.242, 0.112);
    c.bezierCurveTo(-0.195, 0.192, -0.055, 0.168, 0.01, 0.056);
  };
  rimFin(tailEdge, tailEdge, finGrad(0, 0, -0.26, 0), () => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) pts.push([-0.265, -0.12 + i * 0.036]);
    rayFan(c, 0.02, 0.004, pts, rayCol, 0.0042);
  });
  c.restore();

  // ---- dorsal fin: 3-scallop tall front crest + rounded rear lobe (Image 1!) ----
  const sw = p.wag2 * 0.006;
  const d1Edge = () => {
    c.moveTo(0.225, -0.195);
    c.bezierCurveTo(0.218, -0.275 + sw, 0.178, -0.325 + sw, 0.145, -0.305 + sw);
    c.bezierCurveTo(0.125, -0.342 + sw, 0.085, -0.352 + sw, 0.068, -0.312 + sw);
    c.bezierCurveTo(0.035, -0.352 + sw, -0.038, -0.345 + sw, -0.052, -0.285 + sw);
    c.quadraticCurveTo(-0.058, -0.23, -0.042, -0.165);
  };
  rimFin(
    () => {
      d1Edge();
      c.lineTo(-0.02, -0.1);
      c.lineTo(0.21, -0.1);
    },
    d1Edge,
    finGrad(0.08, -0.16, 0.1, -0.34),
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 7; i++) pts.push([0.21 - i * 0.04, -0.35]);
      rayFan(c, 0.08, -0.08, pts, rayCol, 0.004);
    }
  );
  const d2Edge = () => {
    c.moveTo(-0.055, -0.175);
    c.bezierCurveTo(-0.095, -0.228 + sw, -0.165, -0.235 + sw, -0.195, -0.19 + sw);
    c.bezierCurveTo(-0.215, -0.155 + sw, -0.195, -0.1, -0.16, -0.078);
  };
  rimFin(
    () => {
      d2Edge();
      c.lineTo(-0.11, -0.03);
      c.lineTo(-0.05, -0.09);
    },
    d2Edge,
    finGrad(-0.1, -0.09, -0.16, -0.22),
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) pts.push([-0.06 - i * 0.028, -0.23 + i * 0.015]);
      rayFan(c, -0.1, -0.05, pts, rayCol, 0.0038);
    }
  );

  // ---- rounded anal fin ----
  const anEdge = () => {
    c.moveTo(-0.025, 0.175);
    c.bezierCurveTo(-0.055, 0.252 - sw, -0.135, 0.268 - sw, -0.175, 0.225 - sw);
    c.bezierCurveTo(-0.205, 0.192 - sw, -0.19, 0.125, -0.155, 0.088);
  };
  rimFin(
    () => {
      anEdge();
      c.lineTo(-0.1, 0.06);
      c.lineTo(-0.02, 0.11);
    },
    anEdge,
    finGrad(-0.09, 0.11, -0.14, 0.25),
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) pts.push([-0.04 - i * 0.028, 0.26 - i * 0.012]);
      rayFan(c, -0.08, 0.06, pts, rayCol, 0.0038);
    }
  );

  // ---- double-lobed pelvic fin under belly (exact Image 1!) ----
  c.save();
  c.translate(0.165, 0.185);
  c.rotate(-p.wag2 * 0.08);
  const pvEdge = () => {
    c.moveTo(0.052, 0.0);
    c.bezierCurveTo(0.072, 0.052, 0.042, 0.098, 0.012, 0.078);
    c.lineTo(0.006, 0.052);
    c.bezierCurveTo(-0.012, 0.095, -0.068, 0.092, -0.072, 0.052);
    c.bezierCurveTo(-0.072, 0.025, -0.045, 0.004, -0.018, -0.002);
  };
  rimFin(pvEdge, pvEdge, finGrad(0, 0, -0.02, 0.09), () => {
    rayFan(c, 0.0, 0.0, [[0.045, 0.085], [0.02, 0.08], [-0.03, 0.09], [-0.06, 0.07]], rayCol, 0.0035);
  }, 0.042);
  c.restore();

  // ---- jaw geometry: cute smiling mouth indent & overhanging rounded snout ----
  const hx = 0.325,
    hy = 0.058,
    jl = 0.105;
  const baseAng = -0.12;
  const ua = baseAng - p.open * 0.34,
    la = baseAng + 0.35 + p.open * 0.88;
  const ux = hx + Math.cos(ua) * jl,
    uy = hy + Math.sin(ua) * jl;
  const lx = hx + Math.cos(la) * (jl * 0.78),
    ly = hy + Math.sin(la) * (jl * 0.78);
  const chin = (p.puff ? 0.012 : 0) + p.open * 0.024;

  if (p.open > 0) {
    c.beginPath();
    c.moveTo(ux - 0.005, uy + 0.006);
    c.lineTo(hx - 0.025, hy);
    c.lineTo(lx - 0.005, ly - 0.004);
    c.closePath();
    c.fillStyle = "#4d0f1c";
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = "#f0708c";
    blob(c, (hx + lx) / 2 + 0.005, (hy + ly) / 2 + 0.004, 0.036, 0.013, la);
    c.restore();
  }

  // ---- Image 1 Nemo body silhouette with tapered peduncle & cute rounded snout ----
  const body = () => {
    c.moveTo(-0.215, -0.05);
    c.bezierCurveTo(-0.125, -0.12, 0.0, -0.215, 0.125, -0.225);
    c.bezierCurveTo(0.265, -0.235, 0.395, -0.16, 0.432, -0.035 - p.open * 0.012);
    c.quadraticCurveTo(0.452, uy - 0.015, ux, uy);
    if (p.open > 0) {
      c.quadraticCurveTo((ux + hx) * 0.5, uy + 0.006, hx, hy);
      c.quadraticCurveTo((hx + lx) * 0.5, ly - 0.005, lx, ly);
    } else {
      // subtle smiling lip notch matching Image 1's cheerful mouth wedge
      c.quadraticCurveTo(ux + 0.004, uy + 0.022, hx + 0.018, hy + 0.006);
      c.quadraticCurveTo((hx + lx) * 0.52, ly - 0.008, lx, ly + 0.008 + chin);
    }
    c.bezierCurveTo(lx - 0.018, ly + 0.038 + chin, 0.315, 0.165 + chin, 0.215, 0.188 + chin);
    c.bezierCurveTo(0.1, 0.212, -0.025, 0.192, -0.125, 0.125);
    c.quadraticCurveTo(-0.178, 0.09, -0.215, 0.068);
  };

  c.beginPath();
  body();
  c.closePath();
  c.fillStyle = lin(c, 0, -0.24, 0, 0.22, [
    [0, mix(OR, ORL, 0.52)],
    [0.44, OR],
    [0.86, mix(OR, ORD, 0.38)],
    [1, mix(OR, ORD, 0.7)],
  ]);
  c.fill();
  c.save();
  c.clip();
  glow(c, 0.1, -0.03, 0.3, 0.19, 0, "255,196,92", 0.52);

  // 3 crisp white bands edged in black (Image 1!)
  const bandStroke = 0.024;
  const paintBand = (build: () => void) => {
    c.beginPath();
    build();
    c.closePath();
    c.strokeStyle = BLK;
    c.lineWidth = bandStroke;
    c.stroke();
    c.fillStyle = lin(c, 0, -0.24, 0, 0.22, [
      [0, "#ffffff"],
      [0.6, WH],
      [1, "#dbe0ea"],
    ]);
    c.fill();
  };
  // head band curving smoothly behind eye
  paintBand(() => {
    c.moveTo(0.248, -0.28);
    c.quadraticCurveTo(0.205, -0.02, 0.275, 0.25);
    c.lineTo(0.205, 0.25);
    c.quadraticCurveTo(0.135, -0.02, 0.175, -0.28);
  });
  // middle band curving forward slightly into gentle bump behind pectoral
  paintBand(() => {
    c.moveTo(-0.025, -0.28);
    c.bezierCurveTo(0.015, -0.1, 0.052, -0.04, 0.052, 0.018);
    c.bezierCurveTo(0.052, 0.08, 0.015, 0.12, -0.008, 0.26);
    c.lineTo(-0.105, 0.26);
    c.bezierCurveTo(-0.078, 0.08, -0.07, -0.05, -0.115, -0.28);
  });
  // tail-peduncle white band
  paintBand(() => {
    c.moveTo(-0.165, -0.18);
    c.quadraticCurveTo(-0.15, 0.01, -0.165, 0.18);
    c.lineTo(-0.24, 0.18);
    c.quadraticCurveTo(-0.225, 0.01, -0.24, -0.18);
  });

  // 3D gloss + bottom AO
  c.fillStyle = lin(c, 0, -0.24, 0, 0.22, [
    [0, "rgba(255,255,255,0.2)"],
    [0.22, "rgba(255,255,255,0)"],
    [0.68, "rgba(70,20,0,0)"],
    [1, "rgba(70,20,0,0.3)"],
  ]);
  c.fillRect(-0.4, -0.35, 0.95, 0.72);
  glow(c, 0.08, -0.13, 0.22, 0.045, -0.08, "255,255,255", 0.44);
  c.restore();

  c.beginPath();
  body();
  c.closePath();
  c.strokeStyle = OL;
  c.lineWidth = LW;
  c.stroke();

  // ---- mouth crease ----
  c.strokeStyle = rgba(pal.outline, 0.85);
  c.lineWidth = 0.0075;
  if (p.open > 0) {
    c.beginPath();
    c.moveTo(ux, uy);
    c.lineTo(hx, hy);
    c.lineTo(lx, ly);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(hx + 0.015, hy + 0.006);
    c.arc(hx + 0.008, hy + 0.002, 0.011, Math.PI * 0.4, Math.PI * 1.35);
    c.stroke();
  }

  // ---- cute stubby rounded triangular pectoral fin (Image 1!) ----
  c.save();
  c.translate(0.068, 0.058);
  c.rotate(0.18 + p.wag2 * 0.16);
  const pcEdge = () => {
    c.moveTo(0.01, -0.025);
    c.bezierCurveTo(-0.025, -0.058, -0.082, -0.062, -0.088, -0.015);
    c.bezierCurveTo(-0.092, 0.032, -0.045, 0.056, 0.0, 0.028);
  };
  rimFin(
    pcEdge,
    pcEdge,
    lin(c, 0, 0, -0.09, 0.02, [
      [0, mix(OR, ORD, 0.25)],
      [0.6, OR],
      [1, ORL],
    ]),
    () => {
      rayFan(c, 0.0, 0.0, [[-0.085, -0.035], [-0.09, 0.0], [-0.075, 0.035]], rayCol, 0.0038);
    },
    0.038
  );
  c.restore();

  // ---- BIG expressive eye (kept in existing glossy style, scaled up to match Image 1!) ----
  const ex = 0.312,
    ey = -0.052 - p.open * 0.006,
    er = 0.072;
  if (p.puff) glow(c, ex - 0.025, ey + 0.095, 0.048, 0.03, 0, "255,90,130", 0.48);
  c.beginPath();
  c.ellipse(ex - 0.006, ey, er * 1.04, er * 1.12, 0, Math.PI * 0.55, Math.PI * 1.75);
  c.strokeStyle = rgba(ORD, 0.42);
  c.lineWidth = 0.007;
  c.stroke();
  eye(c, ex, ey, er, { iris: "#7a3b12", expr: p.expr, ol: rgba(pal.outline, 0.85), sx: 0.94, look: 0.28, irisR: 0.56, pupilR: 0.36 });
}

// =====================================================================================
// GILL — Moorish idol: tall kite-shaped body, long white snout, dark face mask with a
// stern half-lidded eye, white / black / cream bands, sickle dorsal streamer, dark tail.
// =====================================================================================
function drawIdol(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const DK = "#261640",
    DK2 = "#120822",
    PUR = "#51397a";
  const WH = "#fffdf6",
    CREAM = "#f6ecc2",
    YEL = "#efd98a";
  const OL = rgba(pal.outline, 0.9);
  const LW = 0.0095;
  c.translate(0.0, 0.012);
  const s = p.wag2;

  // band 2 (rear black band) — one long ribbon running from the dorsal fin into the anal fin
  const band2 = () => {
    c.moveTo(0.078, -0.3);
    c.quadraticCurveTo(0.046, -0.03, 0.082, 0.22);
    c.lineTo(0.125, 0.335);
    c.lineTo(0.0, 0.38);
    c.lineTo(0.01, 0.22);
    c.quadraticCurveTo(-0.012, 0.0, -0.004, -0.19);
    c.lineTo(0.0, -0.3);
  };

  // ---- tail: dark triangle with a cream base ----
  c.save();
  c.translate(-0.045, 0.045);
  c.rotate(p.wag * 0.2);
  c.scale(1 - Math.abs(p.wag) * 0.05, 1);
  fillStroke(
    c,
    () => {
      c.moveTo(0.012, -0.034);
      c.bezierCurveTo(-0.05, -0.062, -0.12, -0.11, -0.18, -0.148);
      c.quadraticCurveTo(-0.186, -0.13, -0.172, -0.112);
      c.bezierCurveTo(-0.128, -0.07, -0.108, -0.03, -0.112, -0.008);
      c.bezierCurveTo(-0.112, 0.02, -0.122, 0.055, -0.136, 0.082);
      c.quadraticCurveTo(-0.118, 0.084, -0.098, 0.07);
      c.bezierCurveTo(-0.06, 0.05, -0.02, 0.036, 0.012, 0.03);
    },
    lin(c, 0.01, 0, -0.17, 0, [
      [0, CREAM],
      [0.16, YEL],
      [0.3, DK],
      [1, DK2],
    ]),
    OL,
    LW * 0.85,
    () => {
      rayFan(
        c,
        0.02,
        0,
        [
          [-0.19, -0.12],
          [-0.17, -0.07],
          [-0.15, -0.02],
          [-0.15, 0.03],
          [-0.16, 0.075],
        ],
        rgba(PUR, 0.5),
        0.004
      );
    }
  );
  c.restore();

  // ---- dorsal fin: white sickle streamer, dark inner ribbon, cream rear membrane ----
  const tipX = -0.452,
    tipY = -0.31 + s * 0.022;
  const mid = s * 0.01;
  const dorsalOuter = () => {
    c.moveTo(0.158, -0.29);
    c.bezierCurveTo(0.11, -0.385, 0.01, -0.43 + mid, -0.085, -0.422 + mid);
    c.bezierCurveTo(-0.21, -0.41 + mid, -0.33, -0.365 + mid, tipX, tipY);
  };
  const dorsalInnerBack = () => {
    c.bezierCurveTo(-0.33, -0.33 + mid, -0.22, -0.352 + mid, -0.13, -0.35 + mid);
    c.bezierCurveTo(-0.07, -0.348, -0.044, -0.262, -0.04, -0.13);
    c.bezierCurveTo(-0.07, -0.09, -0.075, -0.04, -0.058, 0.01);
    c.lineTo(0.06, -0.05);
  };
  fillStroke(
    c,
    () => {
      dorsalOuter();
      dorsalInnerBack();
    },
    lin(c, 0.1, -0.2, -0.2, -0.42, [
      [0, WH],
      [0.5, "#fffbe8"],
      [1, "#f4eccc"],
    ]),
    OL,
    LW * 0.85,
    () => {
      // dark ribbon along the inner side of the streamer (continuation of band 2)
      c.beginPath();
      c.moveTo(0.06, -0.22);
      c.bezierCurveTo(0.034, -0.322, -0.03, -0.376 + mid, -0.1, -0.372 + mid);
      c.bezierCurveTo(-0.21, -0.362 + mid, -0.33, -0.336 + mid, tipX, tipY);
      c.bezierCurveTo(-0.33, -0.31 + mid, -0.22, -0.33 + mid, -0.13, -0.33 + mid);
      c.bezierCurveTo(-0.05, -0.33, -0.012, -0.26, -0.006, -0.16);
      c.closePath();
      c.fillStyle = lin(c, 0, -0.2, -0.3, -0.38, [
        [0, DK2],
        [1, DK],
      ]);
      c.fill();
      // soft yellow tint on the rear membrane
      c.fillStyle = rgba(YEL, 0.5);
      c.beginPath();
      c.moveTo(-0.006, -0.16);
      c.lineTo(-0.1, -0.16);
      c.lineTo(-0.1, 0.05);
      c.lineTo(0.02, 0.05);
      c.closePath();
      c.fill();
      // sheen line down the white streamer
      c.beginPath();
      c.moveTo(0.11, -0.3);
      c.bezierCurveTo(0.07, -0.385, -0.0, -0.412 + mid, -0.09, -0.405 + mid);
      c.strokeStyle = "rgba(205,198,160,0.55)";
      c.lineWidth = 0.004;
      c.stroke();
    }
  );

  // ---- anal fin ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.215, 0.262);
      c.bezierCurveTo(0.17, 0.315, 0.1, 0.35 + s * 0.006, 0.03, 0.356 + s * 0.008);
      c.quadraticCurveTo(0.012, 0.352 + s * 0.008, 0.014, 0.334);
      c.bezierCurveTo(0.0, 0.25, -0.032, 0.15, -0.052, 0.074);
      c.lineTo(0.1, 0.08);
    },
    lin(c, 0, 0.1, 0, 0.36, [
      [0, CREAM],
      [1, YEL],
    ]),
    OL,
    LW * 0.85,
    () => {
      c.beginPath();
      c.moveTo(0.3, 0.2);
      c.lineTo(0.075, 0.2);
      c.quadraticCurveTo(0.03, 0.26, 0.012, 0.37);
      c.lineTo(0.3, 0.4);
      c.closePath();
      c.fillStyle = lin(c, 0.05, 0.2, 0.15, 0.36, [
        [0, DK2],
        [1, DK],
      ]);
      c.fill();
    }
  );

  // ---- pelvic fins: two long dark spikes ----
  const spike = (bx0: number, by0: number, bx1: number, by1: number, tx: number, ty: number) =>
    fillStroke(
      c,
      () => {
        c.moveTo(bx0, by0);
        c.quadraticCurveTo((bx0 + tx) / 2 + 0.016, (by0 + ty) / 2, tx, ty);
        c.quadraticCurveTo((bx1 + tx) / 2 - 0.004, (by1 + ty) / 2, bx1, by1);
      },
      lin(c, 0, by0, 0, ty, [
        [0, DK2],
        [1, PUR],
      ]),
      OL,
      LW * 0.7
    );
  spike(0.196, 0.262, 0.166, 0.262, 0.156 - s * 0.01, 0.412);
  spike(0.25, 0.23, 0.222, 0.248, 0.262 - s * 0.012, 0.37);

  // ---- jaw: iconic Gill Moorish idol arched beak & sculpted concave lower chin (Image 2!) ----
  const hx = 0.284;
  const hy = -0.008;
  const lift = p.open * 0.024;
  const chin = (p.puff ? 0.01 : 0) + p.open * 0.018;
  // Upper snout tip arches up over a rounded hump then points crisply forward-down
  const ux = 0.464 - p.open * 0.008;
  const uy = -0.014 - p.open * 0.038;
  // Lower jaw rotates cleanly around hinge (hx, hy) so open beak looks anatomical
  const jawAng = p.open * 0.56;
  const cosJ = Math.cos(jawAng);
  const sinJ = Math.sin(jawAng);
  const rotJ = (px: number, py: number): [number, number] => [
    hx + (px - hx) * cosJ - (py - hy) * sinJ,
    hy + (px - hx) * sinJ + (py - hy) * cosJ,
  ];
  const [lx, ly] = rotJ(0.454, -0.006);
  const [chinC1x, chinC1y] = rotJ(0.408, 0.022);
  const [chinC2x, chinC2y] = rotJ(0.376, 0.072);
  const [chinEndx, chinEndy] = rotJ(0.336, 0.138);

  if (p.open > 0) {
    c.beginPath();
    c.moveTo(hx - 0.02, hy);
    c.quadraticCurveTo(0.37, uy + 0.004, ux - 0.004, uy + 0.004);
    c.quadraticCurveTo((ux + lx) * 0.5 - 0.022, (uy + ly) * 0.5, lx - 0.004, ly + 0.002);
    c.quadraticCurveTo(0.365, (hy + ly) * 0.5 + 0.004, hx - 0.02, hy + 0.006);
    c.closePath();
    c.fillStyle = "#4a1020";
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = "#e8708a";
    blob(c, (hx + lx) * 0.5, (hy + ly) * 0.5 + 0.004, 0.055, 0.014, jawAng * 0.7);
    c.restore();
  }

  const body = () => {
    c.moveTo(0.114, -0.322);
    // Steep dark forehead sweeping down to proud protruding brow ridge
    c.bezierCurveTo(0.175, -0.312, 0.245, -0.228, 0.292, -0.152);
    c.quadraticCurveTo(0.326, -0.126, 0.308, -0.104 - lift * 0.4);
    // Concave dip right below the eye before rising over the bulbous arched upper beak!
    c.quadraticCurveTo(0.286, -0.082 - lift * 0.5, 0.31, -0.068 - lift * 0.7);
    c.bezierCurveTo(0.352, -0.078 - lift, 0.388, -0.098 - lift, 0.422, -0.064 - lift);
    c.quadraticCurveTo(0.448, -0.036 - lift * 0.6, ux, uy);
    if (p.open > 0) {
      c.quadraticCurveTo(0.375, uy + 0.006, hx, hy);
      c.quadraticCurveTo((hx + lx) * 0.5, (hy + ly) * 0.5 - 0.004, lx, ly);
      // Concave scooped lower snout sweeping gracefully down into the white cheek & chin!
      c.bezierCurveTo(chinC1x, chinC1y, chinC2x, chinC2y, chinEndx, chinEndy + chin);
    } else {
      c.lineTo(0.454, -0.006);
      // Iconic concave scooped under-jaw curve tapering into the white throat (Image 2!)
      c.bezierCurveTo(0.408, 0.022, 0.376, 0.072, 0.336, 0.138 + chin);
    }
    c.bezierCurveTo(0.305, 0.176 + chin, 0.278, 0.205, 0.256, 0.232);
    c.quadraticCurveTo(0.235, 0.262, 0.205, 0.277);
    // lower rear edge up to the tail stalk
    c.bezierCurveTo(0.12, 0.252, 0.02, 0.162, -0.05, 0.072);
    c.lineTo(-0.056, 0.016);
    // upper rear edge back to the apex
    c.bezierCurveTo(-0.03, -0.082, 0.02, -0.202, 0.114, -0.322);
  };

  c.beginPath();
  body();
  c.closePath();
  c.fillStyle = WH;
  c.fill();
  c.save();
  c.clip();
  // rear body: warm cream fading to yellow at the tail stalk
  c.fillStyle = lin(c, 0.02, 0, -0.06, 0, [
    [0, "#fbf3d0"],
    [1, YEL],
  ]);
  c.fillRect(-0.1, -0.35, 0.12, 0.7);
  // white middle band (soft warm shading toward the belly)
  c.fillStyle = lin(c, 0, -0.3, 0, 0.3, [
    [0, "#ffffff"],
    [0.55, WH],
    [1, "#efe6c6"],
  ]);
  c.fillRect(0.02, -0.35, 0.16, 0.7);
  // rear black band
  c.beginPath();
  band2();
  c.closePath();
  c.fillStyle = lin(c, 0.08, 0, -0.01, 0, [
    [0, DK],
    [1, DK2],
  ]);
  c.fill();
  // dark face mask
  c.beginPath();
  c.moveTo(0.158, -0.36);
  c.bezierCurveTo(0.126, -0.2, 0.122, -0.05, 0.138, 0.07);
  c.quadraticCurveTo(0.15, 0.19, 0.19, 0.3);
  c.lineTo(0.5, 0.3);
  c.lineTo(0.5, -0.36);
  c.closePath();
  c.fillStyle = lin(c, 0.14, -0.1, 0.33, 0.05, [
    [0, DK2],
    [0.5, DK],
    [1, "#2e1c4c"],
  ]);
  c.fill();
  // purple satin sheen on the forehead and cheek
  glow(c, 0.215, -0.21, 0.09, 0.035, 0.95, "120,92,176", 0.5);
  glow(c, 0.2, 0.1, 0.05, 0.09, 0.2, "104,80,160", 0.3);
  // white snout + cheek mask sweeping cleanly under eye & around chin (Image 2!)
  c.beginPath();
  c.moveTo(0.32, -0.082);
  c.bezierCurveTo(0.285, -0.062, 0.228, -0.044, 0.205, 0.008);
  c.bezierCurveTo(0.192, 0.062, 0.212, 0.145, 0.278, 0.212);
  c.lineTo(0.34, 0.28);
  c.lineTo(0.5, 0.28);
  c.lineTo(0.5, -0.18);
  c.closePath();
  c.fillStyle = lin(c, 0.32, -0.07, 0.34, 0.2, [
    [0, "#ffffff"],
    [0.55, "#f3f6fa"],
    [1, "#cad3e0"],
  ]);
  c.fill();
  c.strokeStyle = rgba(DK2, 0.55);
  c.lineWidth = 0.0042;
  c.stroke();
  // Subtle sculpted chin contour crease like Image 2
  c.beginPath();
  c.moveTo(0.352, 0.038 + chin * 0.2);
  c.quadraticCurveTo(0.322, 0.07 + chin * 0.3, 0.32, 0.112 + chin * 0.4);
  c.strokeStyle = "rgba(130, 140, 165, 0.32)";
  c.lineWidth = 0.0038;
  c.stroke();
  // Bright yellow saddle tucked into the concave nasal bridge (Image 2!)
  c.fillStyle = "#f4cb3c";
  c.beginPath();
  c.moveTo(0.292, -0.078 - lift * 0.55);
  c.quadraticCurveTo(0.314, -0.088 - lift * 0.65, 0.338, -0.068 - lift * 0.72);
  c.quadraticCurveTo(0.315, -0.056 - lift * 0.58, 0.288, -0.064 - lift * 0.52);
  c.closePath();
  c.fill();
  c.strokeStyle = rgba(DK2, 0.45);
  c.lineWidth = 0.0032;
  c.stroke();
  // overall volume
  c.fillStyle = lin(c, 0, -0.32, 0, 0.28, [
    [0, "rgba(255,255,255,0.12)"],
    [0.3, "rgba(255,255,255,0)"],
    [0.7, "rgba(20,10,40,0)"],
    [1, "rgba(20,10,40,0.3)"],
  ]);
  c.fillRect(-0.2, -0.4, 0.8, 0.8);
  c.restore();
  c.beginPath();
  body();
  c.closePath();
  c.strokeStyle = OL;
  c.lineWidth = LW;
  c.stroke();

  // ---- mouth: sleek crisp flat stern beak line ----
  c.strokeStyle = rgba(DK2, 0.94);
  c.lineWidth = 0.0072;
  if (p.open > 0) {
    c.beginPath();
    c.moveTo(ux, uy);
    c.quadraticCurveTo(0.375, uy + 0.006, hx, hy);
    c.quadraticCurveTo((hx + lx) * 0.5, (hy + ly) * 0.5 - 0.004, lx, ly);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(ux - 0.004, uy + 0.004);
    c.quadraticCurveTo(0.375, -0.008, hx + 0.008, hy);
    c.quadraticCurveTo(hx - 0.012, hy, hx - 0.022, hy + 0.01);
    c.stroke();
  }

  // ---- pectoral fin: long dark blade sweeping up and back over the white band ----
  c.save();
  c.translate(0.14, 0.1);
  c.rotate(p.wag2 * 0.12);
  fillStroke(
    c,
    () => {
      c.moveTo(0.012, -0.018);
      c.bezierCurveTo(-0.04, -0.082, -0.1, -0.15, -0.166, -0.19);
      c.quadraticCurveTo(-0.166, -0.165, -0.142, -0.122);
      c.bezierCurveTo(-0.1, -0.05, -0.062, 0.002, -0.024, 0.028);
      c.quadraticCurveTo(0.012, 0.022, 0.012, -0.018);
    },
    lin(c, 0, 0, -0.16, -0.18, [
      [0, DK2],
      [0.6, DK],
      [1, PUR],
    ]),
    OL,
    LW * 0.75,
    () => {
      rayFan(
        c,
        0.0,
        0.0,
        [
          [-0.16, -0.18],
          [-0.15, -0.145],
          [-0.12, -0.095],
        ],
        rgba(PUR, 0.75),
        0.004
      );
    }
  );
  c.restore();

  // ---- eye: heavy brow, half-closed lid, red-brown iris ----
  const ex = 0.238,
    ey = -0.094 - p.open * 0.004,
    er = 0.038;
  if (p.puff) glow(c, ex - 0.02, ey + 0.07, 0.04, 0.026, 0, "255,110,150", 0.4);
  // eye bag under the eye
  c.beginPath();
  c.ellipse(ex, ey + 0.006, er * 1.18, er * 1.12, 0, Math.PI * 0.12, Math.PI * 0.82);
  c.strokeStyle = rgba(PUR, 0.9);
  c.lineWidth = 0.0055;
  c.stroke();
  eye(c, ex, ey, er, {
    iris: pal.iris || "#8a3324",
    expr: p.expr,
    ol: "#0c0416",
    sx: 1.0,
    look: 0.3,
    lookY: 0.2,
    irisR: 0.52,
    pupilR: 0.3,
    lid: 0.44,
    lidTilt: 0.3,
    lidCol: "#2f1e4e",
    lidEdge: "#0c0416",
    happyCol: "#d9ccf5",
  });
  // heavy brow ridge slanting down toward the snout
  c.beginPath();
  c.moveTo(ex - er * 1.3, ey - er * 1.02);
  c.quadraticCurveTo(ex + er * 0.1, ey - er * 1.25, ex + er * 1.55, ey - er * 0.18);
  c.strokeStyle = rgba(PUR, 0.95);
  c.lineWidth = 0.0085;
  c.stroke();
  c.beginPath();
  c.moveTo(ex - er * 1.2, ey - er * 0.82);
  c.quadraticCurveTo(ex + er * 0.1, ey - er * 1.02, ex + er * 1.5, ey - er * 0.02);
  c.strokeStyle = "#0c0416";
  c.lineWidth = 0.007;
  c.stroke();
}

// =====================================================================================
// BRUCE — cartoon great white: chunky deep chest, pointed snout, goofy toothy grin,
// big round eye in a dark socket, tall swept dorsal, crescent tail, jagged white belly.
// Fins are the same slate-blue as the body (no black tips).
// =====================================================================================
function drawShark(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const B = pal.body,
    D = pal.dark;
  const WHITE = pal.belly;
  const FIN = pal.fin,
    FINL = mix(FIN, "#c4d4f0", 0.36),
    FIND = mix(FIN, D, 0.5);
  const OL = rgba(pal.outline, 0.88);
  const LW = 0.0105;
  c.translate(0, -0.012);
  const s = p.wag2;

  // ---- tail: tall crescent ----
  c.save();
  c.translate(-0.272, 0.018);
  c.rotate(p.wag * 0.15);
  c.scale(1 - Math.abs(p.wag) * 0.06, 1);
  c.translate(0.272, -0.018);
  fillStroke(
    c,
    () => {
      c.moveTo(-0.25, -0.012);
      c.bezierCurveTo(-0.3, -0.055, -0.375, -0.142, -0.446, -0.216);
      c.quadraticCurveTo(-0.458, -0.2, -0.449, -0.176);
      c.lineTo(-0.437, -0.158);
      c.lineTo(-0.447, -0.14);
      c.bezierCurveTo(-0.416, -0.082, -0.376, -0.045, -0.37, -0.004);
      c.bezierCurveTo(-0.372, 0.036, -0.396, 0.082, -0.432, 0.122);
      c.bezierCurveTo(-0.39, 0.108, -0.33, 0.074, -0.256, 0.05);
    },
    lin(c, -0.27, 0, -0.45, -0.06, [
      [0, B],
      [0.5, FIN],
      [1, FIND],
    ]),
    OL,
    LW * 0.9,
    () => {
      // light edge along the leading rim of both lobes
      c.beginPath();
      c.moveTo(-0.25, -0.012);
      c.bezierCurveTo(-0.3, -0.055, -0.375, -0.142, -0.446, -0.216);
      c.strokeStyle = rgba(FINL, 0.75);
      c.lineWidth = 0.022;
      c.stroke();
      c.beginPath();
      c.moveTo(-0.432, 0.122);
      c.bezierCurveTo(-0.39, 0.108, -0.33, 0.074, -0.256, 0.05);
      c.strokeStyle = rgba(FINL, 0.5);
      c.lineWidth = 0.018;
      c.stroke();
    }
  );
  c.restore();

  // ---- far-side pectoral fin tucked cleanly behind chest (never under chin!) ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.205, 0.145);
      c.bezierCurveTo(0.214, 0.192, 0.208, 0.236 + s * 0.006, 0.182, 0.262 + s * 0.008);
      c.bezierCurveTo(0.152, 0.242, 0.138, 0.202, 0.136, 0.154);
    },
    FIND,
    OL,
    LW * 0.8
  );

  // ---- dorsal fin: big swept-back triangle ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.172, -0.1);
      c.bezierCurveTo(0.1, -0.148, 0.0, -0.204 + s * 0.003, -0.082, -0.222 + s * 0.004);
      c.quadraticCurveTo(-0.096, -0.212 + s * 0.004, -0.086, -0.192 + s * 0.004);
      c.bezierCurveTo(-0.06, -0.145, -0.06, -0.096, -0.044, -0.058);
      c.lineTo(0.0, -0.03);
      c.lineTo(0.14, -0.04);
    },
    lin(c, 0.06, -0.06, -0.06, -0.2, [
      [0, B],
      [0.6, FIN],
      [1, FINL],
    ]),
    OL,
    LW * 0.9,
    () => {
      c.beginPath();
      c.moveTo(0.172, -0.1);
      c.bezierCurveTo(0.1, -0.148, 0.0, -0.204, -0.082, -0.222);
      c.strokeStyle = rgba(FINL, 0.8);
      c.lineWidth = 0.02;
      c.stroke();
    }
  );
  // ---- second dorsal ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.128, -0.036);
      c.bezierCurveTo(-0.156, -0.06, -0.188, -0.066, -0.218, -0.056);
      c.quadraticCurveTo(-0.202, -0.042, -0.2, -0.016);
      c.lineTo(-0.13, -0.006);
    },
    lin(c, -0.14, -0.02, -0.21, -0.06, [
      [0, B],
      [1, FINL],
    ]),
    OL,
    LW * 0.8
  );
  // ---- pelvic + anal fins (pale, like the belly) ----
  const PALE = mix(WHITE, B, 0.22);
  fillStroke(
    c,
    () => {
      c.moveTo(-0.162, 0.1);
      c.bezierCurveTo(-0.186, 0.124, -0.212, 0.136, -0.24, 0.132 - s * 0.004);
      c.quadraticCurveTo(-0.228, 0.106, -0.215, 0.068);
    },
    PALE,
    OL,
    LW * 0.8
  );

  // ---- mouth geometry: wide forward-projecting lower jaw & lifted upper jaw (clean & clear!) ----
  const gape = p.open;
  const headLift = p.puff ? 0 : gape * 0.072;
  const Cx = 0.206 - gape * 0.014,
    Cy = 0.044 - gape * 0.008;
  const baseAng = 0.14;
  // Upper jaw pitches cleanly upward as mouth opens wide
  const ua = baseAng - (p.puff ? 0 : 0.05 + gape * 0.44);
  const ul = 0.186 + gape * 0.016;
  const Ux = Cx + Math.cos(ua) * ul,
    Uy = Cy + Math.sin(ua) * ul;
  // Lower jaw projects cleanly forward & down (stays forward of pectoral fin, never collapses vertically!)
  const la = baseAng + (p.puff ? 0.06 : 0.14 + gape * 0.56);
  const ll = 0.162 + gape * 0.016;
  const Lx = Cx + Math.cos(la) * ll,
    Ly = Cy + Math.sin(la) * ll;

  // Curved jaw mid-control points so mouth forms an expressive curved arch
  const Ucx = (Cx + Ux) * 0.5 - Math.sin(ua) * (0.01 + gape * 0.01),
    Ucy = (Cy + Uy) * 0.5 + Math.cos(ua) * (0.008 + gape * 0.008);
  const Lcx = (Cx + Lx) * 0.5 + Math.sin(la) * (0.012 + gape * 0.012),
    Lcy = (Cy + Ly) * 0.5 - Math.cos(la) * (0.008 + gape * 0.01);

  // mouth interior (deep maroon throat + pink tongue & clean gum rim)
  const mouthPoly = () => {
    c.moveTo(Ux, Uy);
    c.quadraticCurveTo(Ucx, Ucy, Cx - 0.014, Cy);
    c.quadraticCurveTo(Cx - 0.024, Cy + 0.012, Cx - 0.012, Cy + 0.024);
    c.quadraticCurveTo(Lcx, Lcy, Lx, Ly);
    c.quadraticCurveTo((Ux + Lx) * 0.5 - 0.016, (Uy + Ly) * 0.5, Ux, Uy);
  };
  c.beginPath();
  mouthPoly();
  c.closePath();
  c.fillStyle = lin(c, Cx - 0.02, Cy, (Ux + Lx) * 0.5, (Uy + Ly) * 0.5, [
    [0, "#3b1019"],
    [0.55, "#6b2633"],
    [1, "#8c464f"],
  ]);
  c.fill();
  c.save();
  c.clip();
  // soft tongue inside lower jaw
  c.fillStyle = "#d96b7e";
  blob(c, Cx + Math.cos(la - 0.16) * ll * 0.52, Cy + Math.sin(la - 0.16) * ll * 0.52, 0.044 + gape * 0.012, 0.015 + gape * 0.007, la - 0.12);
  // pink gums along both curved jaw arches
  c.strokeStyle = "#f2a4ae";
  c.lineWidth = 0.013 + gape * 0.004;
  c.beginPath();
  c.moveTo(Ux, Uy);
  c.quadraticCurveTo(Ucx, Ucy, Cx - 0.01, Cy);
  c.quadraticCurveTo(Lcx, Lcy, Lx, Ly);
  c.stroke();
  c.restore();

  const body = () => {
    c.moveTo(-0.275, -0.004);
    c.bezierCurveTo(-0.2, -0.036, -0.1, -0.06, 0.0, -0.076);
    c.bezierCurveTo(0.1, -0.104, 0.2, -0.118, 0.29, -0.114 - headLift * 0.72);
    c.bezierCurveTo(0.36, -0.112 - headLift * 0.9, 0.422, -0.098 - headLift * 1.12, 0.456, -0.078 - headLift * 1.18);
    c.quadraticCurveTo(0.472, -0.062 - headLift * 1.16, 0.46, -0.044 - headLift * 1.05);
    c.bezierCurveTo(0.448, -0.014 - headLift * 0.7, 0.422, Uy - 0.012, Ux, Uy);
    c.quadraticCurveTo(Ucx, Ucy, Cx, Cy);
    c.quadraticCurveTo(Lcx, Lcy, Lx, Ly);
    // crisp pointed shark lower chin curving cleanly back into chest
    c.quadraticCurveTo(Lx - 0.014, Ly + 0.028, Lx - 0.056, Ly + 0.034);
    c.bezierCurveTo(0.245, 0.182 + gape * 0.014, 0.17, 0.205, 0.06, 0.208);
    c.bezierCurveTo(-0.02, 0.208, -0.07, 0.184, -0.1, 0.166);
    c.bezierCurveTo(-0.17, 0.118, -0.23, 0.064, -0.286, 0.038);
  };

  c.beginPath();
  body();
  c.closePath();
  c.fillStyle = lin(c, 0, -0.11, 0, 0.2, [
    [0, mix(B, D, 0.25)],
    [0.3, B],
    [0.6, mix(B, D, 0.35)],
    [1, D],
  ]);
  c.fill();
  c.save();
  c.clip();
  // satin blue sheen along the flank
  glow(c, 0.0, -0.01, 0.3, 0.07, -0.06, "150,172,214", 0.55);
  glow(c, 0.28, -0.07 - headLift * 0.6, 0.14, 0.03, 0.06 - gape * 0.18, "170,190,228", 0.5);

  // white underside with a ragged edge
  c.beginPath();
  c.moveTo(0.5, -0.065 - headLift * 1.1);
  c.lineTo(0.46, -0.056 - headLift);
  c.bezierCurveTo(0.41, -0.044 - headLift * 0.7, 0.36, -0.02 - headLift * 0.4, 0.32, 0.0);
  c.bezierCurveTo(0.28, 0.016, 0.24, 0.01, 0.215, 0.016);
  c.quadraticCurveTo(0.205, 0.036, 0.204, 0.072);
  c.lineTo(0.192, 0.058);
  c.lineTo(0.186, 0.098);
  c.lineTo(0.17, 0.076);
  c.lineTo(0.162, 0.118);
  c.quadraticCurveTo(0.1, 0.13, 0.02, 0.128);
  c.quadraticCurveTo(-0.04, 0.12, -0.076, 0.104);
  c.lineTo(-0.092, 0.082);
  c.lineTo(-0.108, 0.1);
  c.lineTo(-0.128, 0.072);
  c.lineTo(-0.146, 0.088);
  c.lineTo(-0.168, 0.058);
  c.quadraticCurveTo(-0.23, 0.036, -0.3, 0.02);
  c.lineTo(-0.3, 0.3);
  c.lineTo(0.5, 0.3);
  c.closePath();
  c.fillStyle = lin(c, 0, 0.0, 0, 0.2, [
    [0, "#ffffff"],
    [0.55, WHITE],
    [1, mix(WHITE, "#8fa2c2", 0.5)],
  ]);
  c.fill();
  // loose white flecks where the grey breaks up
  c.fillStyle = WHITE;
  for (const [fx, fy, fr, rot] of [
    [0.24, 0.022, 0.012, -1.1],
    [0.195, 0.052, 0.011, -1.2],
    [-0.1, 0.066, 0.011, -0.9],
    [-0.14, 0.056, 0.009, -0.8],
  ]) {
    c.beginPath();
    c.ellipse(fx, fy, fr, fr * 0.36, rot, 0, TAU);
    c.fill();
  }
  // gill slits
  c.strokeStyle = rgba(pal.outline, 0.5);
  c.lineWidth = 0.0048;
  for (let i = 0; i < 3; i++) {
    const gx = 0.195 - i * 0.025;
    c.beginPath();
    c.moveTo(gx + 0.008, -0.05 + i * 0.004);
    c.quadraticCurveTo(gx - 0.012, 0.0, gx + 0.004, 0.044 - i * 0.004);
    c.stroke();
  }
  // back-lit rim along the spine + belly shadow
  c.fillStyle = lin(c, 0, -0.11, 0, 0.21, [
    [0, "rgba(214,232,255,0.3)"],
    [0.14, "rgba(214,232,255,0)"],
    [0.74, "rgba(30,44,80,0)"],
    [1, "rgba(30,44,80,0.26)"],
  ]);
  c.fillRect(-0.5, -0.3, 1, 0.6);
  c.restore();
  c.beginPath();
  body();
  c.closePath();
  c.strokeStyle = OL;
  c.lineWidth = LW;
  c.stroke();

  // ---- teeth: sharp white curved rows on both jaws (clean & prominent like image 2!) ----
  const toothScale = 0.5 + gape * 0.65;
  const uToothLen = (t: number) => (0.015 + Math.sin(t * Math.PI) * 0.011 + t * 0.005) * toothScale;
  const lToothLen = (t: number) => (0.013 + Math.sin(t * Math.PI) * 0.009 + t * 0.004) * toothScale;
  curvedTeethRow(c, Cx, Cy, Ucx, Ucy, Ux, Uy, 7, 1, uToothLen, 0.1, 0.98);
  curvedTeethRow(c, Cx, Cy, Lcx, Lcy, Lx, Ly, 6, -1, lToothLen, 0.12, 0.96);

  // lips + grin crease
  c.strokeStyle = OL;
  c.lineWidth = 0.0068;
  c.beginPath();
  c.moveTo(Ux, Uy);
  c.quadraticCurveTo(Ucx, Ucy, Cx, Cy);
  c.quadraticCurveTo(Lcx, Lcy, Lx, Ly);
  c.stroke();
  c.beginPath();
  c.moveTo(Cx + 0.004, Cy + 0.002);
  c.quadraticCurveTo(Cx - 0.016, Cy - 0.004, Cx - 0.02, Cy - 0.022);
  c.lineWidth = 0.0055;
  c.stroke();
  // nostril
  c.beginPath();
  c.moveTo(0.418, -0.022 - headLift * 1.05);
  c.quadraticCurveTo(0.41, -0.014 - headLift * 1.05, 0.414, -0.004 - headLift * 1.05);
  c.strokeStyle = rgba(pal.outline, 0.75);
  c.lineWidth = 0.0055;
  c.stroke();

  // ---- near pectoral fin: broad leaf hanging down and back ----
  c.save();
  c.translate(0.17, 0.1);
  c.rotate(p.wag2 * 0.09);
  c.translate(-0.17, -0.1);
  fillStroke(
    c,
    () => {
      c.moveTo(0.222, 0.096);
      c.bezierCurveTo(0.212, 0.162, 0.172, 0.232, 0.06, 0.264);
      c.quadraticCurveTo(0.044, 0.26, 0.054, 0.238);
      c.bezierCurveTo(0.088, 0.202, 0.084, 0.16, 0.098, 0.13);
      c.bezierCurveTo(0.14, 0.104, 0.18, 0.092, 0.222, 0.096);
    },
    lin(c, 0.2, 0.09, 0.07, 0.24, [
      [0, B],
      [0.55, FIN],
      [1, FINL],
    ]),
    OL,
    LW * 0.9,
    () => {
      c.beginPath();
      c.moveTo(0.222, 0.096);
      c.bezierCurveTo(0.212, 0.162, 0.172, 0.232, 0.06, 0.264);
      c.strokeStyle = rgba(FINL, 0.85);
      c.lineWidth = 0.02;
      c.stroke();
    }
  );
  c.restore();

  // ---- eye: Nemo-style bright glossy oval eye (no dark socket disc!) ----
  const ex = 0.318,
    ey = -0.048 - headLift * 0.75,
    er = 0.038;
  if (p.puff) glow(c, ex - 0.03, ey + 0.06, 0.04, 0.024, 0, "255,110,150", 0.4);
  c.beginPath();
  c.ellipse(ex - 0.005, ey, er * 1.06, er * 1.14, 0, Math.PI * 0.55, Math.PI * 1.75);
  c.strokeStyle = rgba(D, 0.42);
  c.lineWidth = 0.006;
  c.stroke();
  eye(c, ex, ey, er, {
    iris: pal.iris || "#7a3b12",
    expr: p.expr,
    ol: rgba(pal.outline, 0.82),
    sx: 0.9,
    look: 0.34,
    irisR: 0.58,
    pupilR: 0.36,
  });
}

// =====================================================================================
// BRUCE ELEGAN — sleek straight-bodied great white modelled after reference image 2:
// streamlined torpedo silhouette, crisp white counter-shading, swept dorsal & pectoral
// fins, wide upward-tilting jaw gape with sharp curved teeth, and Nemo-style eye.
// =====================================================================================
function drawSharkSleek(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const B = pal.body,
    D = pal.dark;
  const WHITE = pal.belly;
  const FIN = pal.fin,
    FINL = mix(FIN, "#d8e8f5", 0.4),
    FIND = mix(FIN, D, 0.45);
  const OL = rgba(pal.outline, 0.85);
  const LW = 0.0095;
  c.translate(-0.01, -0.005);
  const s = p.wag2;

  // ---- tail: sleek forked crescent shark caudal fin ----
  c.save();
  c.translate(-0.278, 0.022);
  c.rotate(p.wag * 0.15);
  c.scale(1 - Math.abs(p.wag) * 0.06, 1);
  c.translate(0.278, -0.022);
  fillStroke(
    c,
    () => {
      c.moveTo(-0.26, 0.002);
      c.bezierCurveTo(-0.31, -0.036, -0.375, -0.112, -0.434, -0.188);
      c.quadraticCurveTo(-0.442, -0.172, -0.432, -0.148);
      c.bezierCurveTo(-0.4, -0.084, -0.374, -0.036, -0.368, 0.012);
      c.bezierCurveTo(-0.372, 0.052, -0.398, 0.088, -0.436, 0.118);
      c.bezierCurveTo(-0.39, 0.104, -0.33, 0.072, -0.264, 0.044);
    },
    lin(c, -0.27, 0, -0.44, -0.04, [
      [0, B],
      [0.55, FIN],
      [1, FIND],
    ]),
    OL,
    LW * 0.85,
    () => {
      c.beginPath();
      c.moveTo(-0.26, 0.002);
      c.bezierCurveTo(-0.31, -0.036, -0.375, -0.112, -0.434, -0.188);
      c.strokeStyle = rgba(FINL, 0.72);
      c.lineWidth = 0.018;
      c.stroke();
    }
  );
  c.restore();

  // ---- far-side pectoral fin tucked cleanly behind chest (never under jaw!) ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.178, 0.116);
      c.bezierCurveTo(0.184, 0.156, 0.176, 0.194 + s * 0.005, 0.152, 0.216 + s * 0.007);
      c.bezierCurveTo(0.13, 0.196, 0.122, 0.16, 0.124, 0.118);
    },
    FIND,
    OL,
    LW * 0.75
  );

  // ---- sleek swept dorsal fin ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.11, -0.068);
      c.bezierCurveTo(0.055, -0.122, -0.018, -0.168 + s * 0.003, -0.086, -0.18 + s * 0.004);
      c.quadraticCurveTo(-0.094, -0.168 + s * 0.004, -0.082, -0.146 + s * 0.004);
      c.bezierCurveTo(-0.058, -0.106, -0.052, -0.072, -0.046, -0.048);
      c.lineTo(0.08, -0.044);
    },
    lin(c, 0.04, -0.05, -0.07, -0.17, [
      [0, B],
      [0.6, FIN],
      [1, FINL],
    ]),
    OL,
    LW * 0.85,
    () => {
      c.beginPath();
      c.moveTo(0.11, -0.068);
      c.bezierCurveTo(0.055, -0.122, -0.018, -0.168, -0.086, -0.18);
      c.strokeStyle = rgba(FINL, 0.75);
      c.lineWidth = 0.018;
      c.stroke();
    }
  );

  // ---- small rear anal/pelvic fin (like image 2) ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.16, 0.072);
      c.bezierCurveTo(-0.184, 0.098, -0.208, 0.112, -0.232, 0.108 - s * 0.003);
      c.quadraticCurveTo(-0.218, 0.084, -0.204, 0.054);
    },
    lin(c, -0.17, 0.06, -0.22, 0.1, [
      [0, B],
      [1, FIND],
    ]),
    OL,
    LW * 0.75
  );

  // ---- jaw geometry: sleek snout tilts up & lower jaw projects forward & down cleanly ----
  const gape = p.open;
  const headLift = p.puff ? 0 : gape * 0.088;
  const Cx = 0.198 - gape * 0.016,
    Cy = 0.036 - gape * 0.004;
  const baseAng = 0.1;
  // Upper jaw angles sharply up when open
  const ua = baseAng - (p.puff ? 0 : 0.04 + gape * 0.48);
  const ul = 0.202 + gape * 0.018;
  const Ux = Cx + Math.cos(ua) * ul,
    Uy = Cy + Math.sin(ua) * ul;
  // Lower jaw drops forward & down without collapsing into chest
  const la = baseAng + (p.puff ? 0.06 : 0.12 + gape * 0.6);
  const ll = 0.174 + gape * 0.016;
  const Lx = Cx + Math.cos(la) * ll,
    Ly = Cy + Math.sin(la) * ll;

  const Ucx = (Cx + Ux) * 0.5 - Math.sin(ua) * (0.008 + gape * 0.012),
    Ucy = (Cy + Uy) * 0.5 + Math.cos(ua) * (0.006 + gape * 0.01);
  const Lcx = (Cx + Lx) * 0.5 + Math.sin(la) * (0.01 + gape * 0.012),
    Lcy = (Cy + Ly) * 0.5 - Math.cos(la) * (0.006 + gape * 0.01);

  // mouth interior (visible when open / grinning)
  const mouthOpen = gape > 0 || !p.puff;
  if (mouthOpen) {
    c.beginPath();
    c.moveTo(Ux, Uy);
    c.quadraticCurveTo(Ucx, Ucy, Cx - 0.012, Cy);
    c.quadraticCurveTo(Cx - 0.022, Cy + 0.012, Cx - 0.01, Cy + 0.022);
    c.quadraticCurveTo(Lcx, Lcy, Lx, Ly);
    c.quadraticCurveTo((Ux + Lx) * 0.5 - 0.014, (Uy + Ly) * 0.5, Ux, Uy);
    c.closePath();
    c.fillStyle = lin(c, Cx - 0.02, Cy, (Ux + Lx) * 0.5, (Uy + Ly) * 0.5, [
      [0, "#4a242b"],
      [0.6, "#7a444a"],
      [1, "#98585d"],
    ]);
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = "#d97886";
    blob(c, Cx + Math.cos(la - 0.16) * ll * 0.52, Cy + Math.sin(la - 0.16) * ll * 0.52, 0.038 + gape * 0.012, 0.013 + gape * 0.007, la - 0.12);
    c.strokeStyle = "#f2b8be";
    c.lineWidth = 0.012 + gape * 0.004;
    c.beginPath();
    c.moveTo(Ux, Uy);
    c.quadraticCurveTo(Ucx, Ucy, Cx - 0.008, Cy);
    c.quadraticCurveTo(Lcx, Lcy, Lx, Ly);
    c.stroke();
    c.restore();
  }

  // sleek straight-backed shark body silhouette
  const body = () => {
    c.moveTo(-0.285, 0.002);
    c.bezierCurveTo(-0.18, -0.024, -0.08, -0.048, 0.03, -0.068);
    c.bezierCurveTo(0.13, -0.084, 0.24, -0.09 - headLift * 0.55, 0.34, -0.084 - headLift * 0.92);
    c.bezierCurveTo(0.395, -0.08 - headLift * 1.15, 0.436, -0.072 - headLift * 1.28, 0.456, -0.056 - headLift * 1.32);
    c.quadraticCurveTo(0.468, -0.042 - headLift * 1.28, 0.452, -0.026 - headLift * 1.12);
    c.bezierCurveTo(0.436, -0.004 - headLift * 0.72, 0.415, Uy - 0.01, Ux, Uy);
    if (mouthOpen) {
      c.quadraticCurveTo(Ucx, Ucy, Cx, Cy);
      c.quadraticCurveTo(Lcx, Lcy, Lx, Ly);
    } else {
      c.lineTo(Lx, Ly);
    }
    // crisp pointed shark chin curving cleanly into straight belly line
    c.quadraticCurveTo(Lx - 0.014, Ly + 0.022, Lx - 0.05, Ly + 0.024);
    c.bezierCurveTo(0.24, 0.132 + gape * 0.016, 0.16, 0.136, 0.04, 0.136);
    c.bezierCurveTo(-0.04, 0.132, -0.1, 0.114, -0.17, 0.082);
    c.bezierCurveTo(-0.22, 0.06, -0.258, 0.044, -0.29, 0.038);
  };

  c.beginPath();
  body();
  c.closePath();
  c.fillStyle = lin(c, 0, -0.09, 0, 0.14, [
    [0, mix(B, D, 0.18)],
    [0.35, B],
    [0.75, mix(B, D, 0.28)],
    [1, D],
  ]);
  c.fill();
  c.save();
  c.clip();
  glow(c, 0.0, -0.01, 0.32, 0.05, -0.04, "180,206,228", 0.48);

  // crisp sleek white counter-shading underside (image 2 clean wave)
  c.beginPath();
  c.moveTo(0.49, -0.055 - headLift * 1.25);
  c.lineTo(0.456, -0.042 - headLift * 1.2);
  c.bezierCurveTo(0.39, -0.028 - headLift * 0.7, 0.29, -0.01 - headLift * 0.25, 0.2, 0.012);
  c.bezierCurveTo(0.14, 0.042, 0.08, 0.09, -0.02, 0.094);
  c.bezierCurveTo(-0.12, 0.096, -0.21, 0.056, -0.31, 0.03);
  c.lineTo(-0.31, 0.25);
  c.lineTo(0.5, 0.25);
  c.closePath();
  c.fillStyle = lin(c, 0, 0.0, 0, 0.14, [
    [0, "#ffffff"],
    [0.55, WHITE],
    [1, mix(WHITE, "#a8bfd4", 0.42)],
  ]);
  c.fill();

  // 3 clean curved gill slits (image 2 style)
  c.strokeStyle = rgba(pal.outline, 0.48);
  c.lineWidth = 0.0044;
  for (let i = 0; i < 3; i++) {
    const gx = 0.175 - i * 0.022;
    c.beginPath();
    c.moveTo(gx + 0.006, -0.032 + i * 0.003);
    c.quadraticCurveTo(gx - 0.01, 0.006, gx + 0.004, 0.04 - i * 0.003);
    c.stroke();
  }

  // soft top rim highlight + bottom shadow
  c.fillStyle = lin(c, 0, -0.09, 0, 0.15, [
    [0, "rgba(224,242,255,0.28)"],
    [0.16, "rgba(224,242,255,0)"],
    [0.74, "rgba(25,45,68,0)"],
    [1, "rgba(25,45,68,0.2)"],
  ]);
  c.fillRect(-0.5, -0.25, 1, 0.5);
  c.restore();

  c.beginPath();
  body();
  c.closePath();
  c.strokeStyle = OL;
  c.lineWidth = LW;
  c.stroke();

  // ---- teeth: crisp curved sharp white triangles on both upper & lower jaw (Image 2!) ----
  if (mouthOpen) {
    const toothScale = 0.36 + gape * 0.74;
    const uToothLen = (t: number) => (0.014 + Math.sin(t * Math.PI) * 0.011 + t * 0.006) * toothScale;
    const lToothLen = (t: number) => (0.012 + Math.sin(t * Math.PI) * 0.009 + t * 0.005) * toothScale;
    curvedTeethRow(c, Cx, Cy, Ucx, Ucy, Ux, Uy, 7, 1, uToothLen, 0.1, 0.98);
    curvedTeethRow(c, Cx, Cy, Lcx, Lcy, Lx, Ly, 6, -1, lToothLen, 0.12, 0.96);
  }

  // jaw line + subtle mouth corner crease
  c.strokeStyle = OL;
  c.lineWidth = 0.0062;
  c.beginPath();
  c.moveTo(Ux, Uy);
  c.quadraticCurveTo(Ucx, Ucy, Cx, Cy);
  if (mouthOpen) c.quadraticCurveTo(Lcx, Lcy, Lx, Ly);
  c.stroke();

  // nostril
  c.beginPath();
  c.moveTo(0.415, -0.025 - headLift * 1.15);
  c.quadraticCurveTo(0.408, -0.018 - headLift * 1.15, 0.412, -0.009 - headLift * 1.15);
  c.strokeStyle = rgba(pal.outline, 0.72);
  c.lineWidth = 0.005;
  c.stroke();

  // ---- near pectoral fin: sleek downward-swept shark fin (Image 2) ----
  c.save();
  c.translate(0.145, 0.068);
  c.rotate(p.wag2 * 0.09);
  c.translate(-0.145, -0.068);
  fillStroke(
    c,
    () => {
      c.moveTo(0.192, 0.068);
      c.bezierCurveTo(0.194, 0.125, 0.168, 0.19, 0.072, 0.222);
      c.quadraticCurveTo(0.056, 0.218, 0.062, 0.198);
      c.bezierCurveTo(0.088, 0.162, 0.084, 0.122, 0.096, 0.092);
      c.bezierCurveTo(0.128, 0.072, 0.162, 0.064, 0.192, 0.068);
    },
    lin(c, 0.18, 0.07, 0.07, 0.21, [
      [0, B],
      [0.55, FIN],
      [1, FINL],
    ]),
    OL,
    LW * 0.85,
    () => {
      c.beginPath();
      c.moveTo(0.192, 0.068);
      c.bezierCurveTo(0.194, 0.125, 0.168, 0.19, 0.072, 0.222);
      c.strokeStyle = rgba(FINL, 0.8);
      c.lineWidth = 0.018;
      c.stroke();
    }
  );
  c.restore();

  // ---- eye: Nemo-style bright glossy oval eye ----
  const ex = 0.288,
    ey = -0.044 - headLift * 0.78,
    er = 0.036;
  if (p.puff) glow(c, ex - 0.025, ey + 0.055, 0.038, 0.022, 0, "255,110,150", 0.4);
  c.beginPath();
  c.ellipse(ex - 0.005, ey, er * 1.06, er * 1.14, 0, Math.PI * 0.55, Math.PI * 1.75);
  c.strokeStyle = rgba(D, 0.42);
  c.lineWidth = 0.0058;
  c.stroke();
  eye(c, ex, ey, er, {
    iris: pal.iris || "#7a3b12",
    expr: p.expr,
    ol: rgba(pal.outline, 0.82),
    sx: 0.9,
    look: 0.34,
    irisR: 0.58,
    pupilR: 0.36,
  });
}

// =====================================================================================
// TOTO — leopard shark: long slender tan body, big dark-brown saddles and spots,
// brown fins, long upper tail lobe, pale almond eye with a mean little brow.
// =====================================================================================
function drawLeopard(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const B = pal.body,
    D = pal.dark,
    BEL = pal.belly;
  const SPOT = pal.spot || "#5a2c14";
  const FIN = pal.fin,
    FINT = pal.tail || pal.fin;
  const OL = rgba(pal.outline, 0.88);
  const LW = 0.0095;
  c.translate(0, 0.004);
  const s = p.wag2;

  const finFill = (x0: number, y0: number, x1: number, y1: number, tip: string) =>
    lin(c, x0, y0, x1, y1, [
      [0, mix(B, tip, 0.35)],
      [1, tip],
    ]);
  const spots = (list: number[][]) => {
    for (const [x, y, rx, ry, rot] of list) {
      c.fillStyle = SPOT;
      blob(c, x, y, rx, ry, rot || 0);
      c.fillStyle = rgba(mix(SPOT, "#000000", 0.35), 0.45);
      blob(c, x - rx * 0.12, y + ry * 0.1, rx * 0.62, ry * 0.6, rot || 0);
    }
  };

  // ---- tail: long upper lobe, short lower lobe ----
  c.save();
  c.translate(-0.295, 0.03);
  c.rotate(p.wag * 0.17);
  c.scale(1 - Math.abs(p.wag) * 0.06, 1);
  c.translate(0.295, -0.03);
  fillStroke(
    c,
    () => {
      c.moveTo(-0.27, 0.004);
      c.bezierCurveTo(-0.33, -0.022, -0.4, -0.066, -0.456, -0.102);
      c.quadraticCurveTo(-0.466, -0.088, -0.454, -0.072);
      c.lineTo(-0.436, -0.056);
      c.lineTo(-0.446, -0.04);
      c.bezierCurveTo(-0.41, -0.012, -0.376, 0.016, -0.364, 0.04);
      c.bezierCurveTo(-0.368, 0.068, -0.378, 0.092, -0.394, 0.112);
      c.quadraticCurveTo(-0.362, 0.104, -0.336, 0.078);
      c.bezierCurveTo(-0.318, 0.064, -0.298, 0.056, -0.272, 0.052);
    },
    finFill(-0.28, 0.02, -0.45, -0.06, FINT),
    OL,
    LW * 0.85,
    () => {
      spots([
        [-0.33, 0.0, 0.018, 0.012, -0.5],
        [-0.385, -0.04, 0.016, 0.01, -0.55],
        [-0.43, -0.07, 0.012, 0.008, -0.55],
        [-0.345, 0.062, 0.012, 0.008, 0.3],
      ]);
    }
  );
  c.restore();

  // ---- first dorsal ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.214, -0.058);
      c.bezierCurveTo(0.186, -0.1, 0.154, -0.146 + s * 0.003, 0.122, -0.166 + s * 0.004);
      c.quadraticCurveTo(0.108, -0.16 + s * 0.004, 0.11, -0.142 + s * 0.003);
      c.bezierCurveTo(0.104, -0.104, 0.082, -0.08, 0.05, -0.058);
      c.lineTo(0.06, -0.03);
      c.lineTo(0.2, -0.03);
    },
    finFill(0.14, -0.05, 0.12, -0.16, FIN),
    OL,
    LW * 0.85,
    () => {
      spots([
        [0.125, -0.13, 0.03, 0.022, -0.6],
        [0.15, -0.075, 0.016, 0.012, 0],
      ]);
    }
  );
  // ---- second dorsal ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.128, -0.034);
      c.bezierCurveTo(-0.146, -0.062, -0.168, -0.082 + s * 0.003, -0.19, -0.086 + s * 0.003);
      c.quadraticCurveTo(-0.198, -0.078, -0.196, -0.066);
      c.bezierCurveTo(-0.204, -0.046, -0.218, -0.03, -0.238, -0.018);
      c.lineTo(-0.14, 0.0);
    },
    finFill(-0.16, -0.03, -0.19, -0.085, FIN),
    OL,
    LW * 0.8,
    () => {
      spots([[-0.186, -0.066, 0.016, 0.011, -0.6]]);
    }
  );
  // ---- pelvic + anal fins ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.012, 0.086);
      c.bezierCurveTo(-0.03, 0.108, -0.054, 0.126, -0.082, 0.132 - s * 0.003);
      c.quadraticCurveTo(-0.08, 0.108, -0.072, 0.08);
    },
    finFill(-0.03, 0.085, -0.08, 0.13, FIN),
    OL,
    LW * 0.8
  );
  fillStroke(
    c,
    () => {
      c.moveTo(-0.158, 0.07);
      c.bezierCurveTo(-0.176, 0.09, -0.198, 0.106, -0.22, 0.108 - s * 0.003);
      c.quadraticCurveTo(-0.216, 0.088, -0.212, 0.062);
    },
    finFill(-0.17, 0.07, -0.22, 0.105, FIN),
    OL,
    LW * 0.8
  );
  // far-side pectoral
  fillStroke(
    c,
    () => {
      c.moveTo(0.3, 0.07);
      c.bezierCurveTo(0.296, 0.1, 0.282, 0.128, 0.256, 0.146 + s * 0.004);
      c.bezierCurveTo(0.244, 0.12, 0.244, 0.096, 0.25, 0.074);
    },
    mix(FIN, D, 0.45),
    OL,
    LW * 0.75
  );

  // ---- jaw: under-slung mouth (opens wider when eating!) ----
  const hx = 0.322,
    hy = 0.046,
    jl = 0.092;
  const baseAng = 0.04;
  const ua = baseAng - p.open * 0.28,
    la = baseAng + p.open * 0.88;
  const ux = hx + Math.cos(ua) * jl,
    uy = hy + Math.sin(ua) * jl;
  const lx = hx + Math.cos(la) * jl * 0.92,
    ly = hy + Math.sin(la) * jl * 0.92;
  const lift = p.open * 0.022;
  const chin = (p.puff ? 0.008 : 0) + p.open * 0.018;

  if (p.open > 0) {
    c.beginPath();
    c.moveTo(ux, uy);
    c.lineTo(hx - 0.02, hy);
    c.lineTo(lx, ly);
    c.closePath();
    c.fillStyle = "#4a0f1a";
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = "#e46c80";
    blob(c, (hx + lx) / 2 + 0.008, (hy + ly) / 2 + 0.002, 0.03, 0.009, la);
    c.restore();
  }

  const body = () => {
    c.moveTo(-0.3, 0.008);
    c.bezierCurveTo(-0.2, -0.03, -0.1, -0.048, 0.0, -0.06);
    c.bezierCurveTo(0.12, -0.076, 0.25, -0.08, 0.33, -0.066 - lift);
    c.bezierCurveTo(0.39, -0.054 - lift, 0.44, -0.03 - lift, 0.453, 0.002 - lift);
    c.quadraticCurveTo(0.458, 0.024 - lift, 0.44, 0.032 - lift * 0.6);
    c.quadraticCurveTo(0.43, uy - 0.002, ux, uy);
    if (p.open > 0) {
      c.lineTo(hx, hy);
      c.lineTo(lx, ly);
    }
    c.quadraticCurveTo(lx - 0.03, ly + 0.03 + chin, 0.3, 0.09 + chin);
    c.bezierCurveTo(0.2, 0.108 + chin * 0.5, 0.05, 0.104, -0.1, 0.084);
    c.bezierCurveTo(-0.2, 0.07, -0.26, 0.058, -0.305, 0.05);
  };

  c.beginPath();
  body();
  c.closePath();
  c.fillStyle = lin(c, 0, -0.08, 0, 0.105, [
    [0, mix(B, D, 0.42)],
    [0.3, B],
    [0.62, mix(B, BEL, 0.55)],
    [0.82, BEL],
    [1, mix(BEL, D, 0.3)],
  ]);
  c.fill();
  c.save();
  c.clip();
  glow(c, 0.05, -0.02, 0.3, 0.03, -0.04, "255,246,206", 0.5);
  // big saddles across the back
  spots([
    [0.305, -0.058, 0.034, 0.026, 0.1],
    [0.212, -0.058, 0.04, 0.032, 0.05],
    [0.09, -0.052, 0.042, 0.034, 0],
    [-0.028, -0.042, 0.042, 0.032, -0.08],
    [-0.135, -0.026, 0.036, 0.028, -0.14],
    [-0.222, -0.006, 0.03, 0.022, -0.2],
    [-0.282, 0.014, 0.02, 0.016, -0.25],
  ]);
  // round spots along the flank
  spots([
    [0.26, 0.004, 0.019, 0.015, 0],
    [0.152, 0.012, 0.024, 0.018, 0],
    [0.03, 0.02, 0.022, 0.017, 0],
    [-0.08, 0.026, 0.021, 0.016, -0.1],
    [-0.178, 0.032, 0.017, 0.013, -0.15],
    [0.392, -0.04, 0.014, 0.01, 0.4],
    [0.205, 0.044, 0.011, 0.009, 0],
    [0.092, 0.052, 0.012, 0.009, 0],
    [-0.025, 0.058, 0.011, 0.008, 0],
    [-0.13, 0.058, 0.01, 0.007, 0],
    [-0.238, 0.038, 0.009, 0.007, 0],
  ]);
  // gill slits
  c.strokeStyle = rgba(pal.outline, 0.42);
  c.lineWidth = 0.004;
  for (let i = 0; i < 3; i++) {
    const gx = 0.292 - i * 0.017;
    c.beginPath();
    c.moveTo(gx + 0.004, 0.022);
    c.quadraticCurveTo(gx - 0.006, 0.042, gx + 0.002, 0.062);
    c.stroke();
  }
  c.fillStyle = lin(c, 0, -0.08, 0, 0.105, [
    [0, "rgba(255,250,226,0.32)"],
    [0.2, "rgba(255,250,226,0)"],
    [0.72, "rgba(80,48,10,0)"],
    [1, "rgba(80,48,10,0.3)"],
  ]);
  c.fillRect(-0.5, -0.2, 1, 0.4);
  c.restore();
  c.beginPath();
  body();
  c.closePath();
  c.strokeStyle = OL;
  c.lineWidth = LW;
  c.stroke();

  // ---- mouth ----
  if (p.open > 0) {
    const gap = (t: number) => Math.hypot((ux - lx) * t, (uy - ly) * t);
    const tl = (t: number) => Math.min(0.014, gap(t) * 0.45);
    teethRow(c, hx, hy, ux, uy, 6, -Math.sin(ua), Math.cos(ua), tl, 0.2, 0.98);
    teethRow(c, hx, hy, lx, ly, 5, Math.sin(la), -Math.cos(la), (t) => tl(t) * 0.9, 0.24, 0.96);
    c.strokeStyle = OL;
    c.lineWidth = 0.006;
    c.beginPath();
    c.moveTo(ux, uy);
    c.lineTo(hx, hy);
    c.lineTo(lx, ly);
    c.stroke();
  } else {
    c.strokeStyle = OL;
    c.lineWidth = 0.0065;
    c.beginPath();
    c.moveTo(ux - 0.002, uy);
    c.quadraticCurveTo(hx + 0.04, hy + 0.012, hx, hy - 0.004);
    c.stroke();
    // tiny teeth peeking out of the closed mouth
    teethRow(c, hx + 0.012, hy + 0.004, ux - 0.006, uy + 0.002, 4, 0, 1, () => 0.008, 0.1, 0.9);
  }
  // nostril
  c.fillStyle = rgba(pal.outline, 0.7);
  blob(c, 0.428, 0.004 - lift, 0.005, 0.0035, 0.5);

  // ---- near pectoral fin ----
  c.save();
  c.translate(0.235, 0.076);
  c.rotate(p.wag2 * 0.1);
  c.translate(-0.235, -0.076);
  fillStroke(
    c,
    () => {
      c.moveTo(0.268, 0.066);
      c.bezierCurveTo(0.256, 0.104, 0.224, 0.142, 0.176, 0.164);
      c.quadraticCurveTo(0.164, 0.16, 0.168, 0.148);
      c.bezierCurveTo(0.18, 0.124, 0.184, 0.1, 0.198, 0.08);
      c.quadraticCurveTo(0.232, 0.066, 0.268, 0.066);
    },
    finFill(0.25, 0.07, 0.18, 0.16, FIN),
    OL,
    LW * 0.85,
    () => {
      spots([
        [0.21, 0.118, 0.016, 0.011, -0.8],
        [0.186, 0.148, 0.011, 0.008, -0.8],
      ]);
    }
  );
  c.restore();

  // ---- eye: Nemo-style bright glossy oval eye ----
  const ex = 0.362,
    ey = -0.014 - lift,
    er = 0.029;
  if (p.puff) glow(c, ex - 0.03, ey + 0.045, 0.034, 0.018, 0, "255,110,150", 0.4);
  c.beginPath();
  c.ellipse(ex - 0.004, ey, er * 1.06, er * 1.14, 0, Math.PI * 0.55, Math.PI * 1.75);
  c.strokeStyle = rgba(D, 0.42);
  c.lineWidth = 0.0052;
  c.stroke();
  eye(c, ex, ey, er, {
    iris: "#7a3b12",
    expr: p.expr,
    ol: rgba(pal.outline, 0.8),
    sx: 0.9,
    look: 0.34,
    irisR: 0.58,
    pupilR: 0.36,
  });
}

// =====================================================================================
// BORIS — Butterflyfish matching Feeding Frenzy 2 reference (Image 1):
// continuous yellow-lime dorsal+anal wrap, soft rounded upturned snout, dark vertical
// eye band holding a neat eye, two bold royal-blue curved saddle patches, blue tail dot.
// =====================================================================================
function drawBoris(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const B = pal.body,
    D = pal.dark,
    BEL = pal.belly;
  const FIN = pal.fin,
    FINL = mix(FIN, "#f5ff9e", 0.42),
    FIND = mix(FIN, "#729c08", 0.45);
  const BAND = pal.stripe || "#2e52b2";
  const NAVY = pal.spot || "#142258";
  const OL = rgba(pal.outline, 0.85);
  const LW = 0.0095;
  c.translate(-0.01, 0.005);
  const sw = p.wag2 * 0.008;

  // ---- tail: truncated fan fading to translucent pale yellow-white with golden rays ----
  c.save();
  c.translate(-0.225, 0.042);
  c.rotate(p.wag * 0.18);
  c.scale(1 - Math.abs(p.wag) * 0.06, 1);
  fillStroke(
    c,
    () => {
      c.moveTo(0, -0.042);
      c.bezierCurveTo(-0.048, -0.078, -0.102, -0.115, -0.146, -0.122);
      c.quadraticCurveTo(-0.162, -0.01, -0.142, 0.118);
      c.bezierCurveTo(-0.098, 0.11, -0.046, 0.075, 0, 0.044);
    },
    lin(c, 0, 0, -0.155, 0, [
      [0, FIND],
      [0.42, FIN],
      [0.82, "#f0f29a"],
      [1, "rgba(255, 255, 224, 0.85)"],
    ]),
    OL,
    LW * 0.8,
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 7; i++) pts.push([-0.155, -0.105 + i * 0.035]);
      rayFan(c, 0.01, 0, pts, "rgba(155, 118, 12, 0.4)", 0.0045);
      c.beginPath();
      c.moveTo(-0.146, -0.122);
      c.quadraticCurveTo(-0.162, -0.01, -0.142, 0.118);
      c.strokeStyle = "rgba(255,255,255,0.72)";
      c.lineWidth = 0.014;
      c.stroke();
    }
  );
  c.restore();

  // ---- continuous yellow-lime dorsal & anal fin wrapper hugging the tall rear body ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.145, -0.18);
      c.bezierCurveTo(0.06, -0.275, -0.12, -0.315 + sw * 0.4, -0.228 + sw, -0.245 + sw * 0.4);
      c.bezierCurveTo(-0.278 + sw, -0.17, -0.285 + sw, -0.045, -0.232, 0.018);
      c.lineTo(-0.16, 0.02);
      c.lineTo(-0.16, -0.14);
      c.lineTo(0.11, -0.16);
    },
    lin(c, -0.06, -0.15, -0.22, -0.29, [
      [0, FIND],
      [0.55, FIN],
      [1, FINL],
    ]),
    OL,
    LW * 0.85,
    () => {
      const pts: [number, number][] = [
        [0.08, -0.28],
        [-0.01, -0.31],
        [-0.1, -0.305],
        [-0.18, -0.285],
        [-0.25, -0.23],
        [-0.285, -0.15],
        [-0.29, -0.06],
      ];
      rayFan(c, -0.08, -0.08, pts, "rgba(130, 150, 10, 0.36)", 0.0042);
    }
  );
  fillStroke(
    c,
    () => {
      c.moveTo(-0.045, 0.215);
      c.bezierCurveTo(-0.12, 0.272 - sw * 0.3, -0.215 + sw, 0.272 - sw * 0.3, -0.256 + sw, 0.205);
      c.bezierCurveTo(-0.28 + sw, 0.145, -0.272, 0.095, -0.228, 0.068);
      c.lineTo(-0.15, 0.08);
      c.lineTo(-0.08, 0.19);
    },
    lin(c, -0.14, 0.14, -0.24, 0.26, [
      [0, FIND],
      [0.55, FIN],
      [1, FINL],
    ]),
    OL,
    LW * 0.85,
    () => {
      const pts: [number, number][] = [
        [-0.08, 0.265],
        [-0.15, 0.275],
        [-0.22, 0.255],
        [-0.265, 0.2],
        [-0.28, 0.13],
      ];
      rayFan(c, -0.12, 0.1, pts, "rgba(130, 150, 10, 0.36)", 0.0042);
    }
  );

  // ---- small dark-rimmed pale pelvic fin under belly (matches Image 1 bottom!) ----
  c.save();
  c.translate(0.06, 0.222);
  c.rotate(-p.wag2 * 0.08);
  fillStroke(
    c,
    () => {
      c.moveTo(0.038, -0.006);
      c.bezierCurveTo(0.015, 0.048, -0.036, 0.066, -0.064, 0.046);
      c.quadraticCurveTo(-0.044, 0.008, -0.012, -0.006);
    },
    lin(c, 0.02, 0, -0.04, 0.05, [
      [0, "#dce8f4"],
      [1, "#7a8aa8"],
    ]),
    "#0f1734",
    LW * 0.95
  );
  c.restore();

  // ---- jaw geometry: soft cute rounded protruding upper snout/lip (NOT sharp beak!) ----
  const hx = 0.272,
    hy = 0.082;
  const jl = 0.096;
  const baseAng = 0.05;
  const ua = baseAng - p.open * 0.26;
  const la = baseAng + p.open * 0.82;
  const ux = hx + Math.cos(ua) * (jl * 1.06),
    uy = hy + Math.sin(ua) * (jl * 1.06);
  const lx = hx + Math.cos(la) * (jl * 0.72),
    ly = hy + Math.sin(la) * (jl * 0.72);
  const chin = (p.puff ? 0.01 : 0) + p.open * 0.016;

  if (p.open > 0) {
    c.beginPath();
    c.moveTo(ux, uy);
    c.lineTo(hx - 0.02, hy);
    c.lineTo(lx, ly);
    c.closePath();
    c.fillStyle = "#521224";
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = "#eb6c8e";
    blob(c, (hx + lx) * 0.54, (hy + ly) * 0.54 + 0.004, 0.032, 0.012, la);
    c.restore();
  }

  // ---- rounded D-shaped butterflyfish body with gentle concaving forehead & blunt cute snout ----
  const body = () => {
    c.moveTo(-0.226, 0.018);
    // tall rounded rear edge rising smoothly into broad dome
    c.bezierCurveTo(-0.242, -0.105, -0.205, -0.225, -0.095, -0.242);
    c.bezierCurveTo(0.015, -0.258, 0.13, -0.215, 0.195, -0.145);
    // smooth concave forehead dip down to plump rounded upturned snout
    c.bezierCurveTo(0.245, -0.092, 0.272, -0.008 - p.open * 0.014, 0.312, 0.044 - p.open * 0.02);
    c.bezierCurveTo(0.345, 0.064 - p.open * 0.022, 0.372, uy - 0.018, ux, uy);
    if (p.open > 0) {
      c.quadraticCurveTo((ux + hx) * 0.5, uy + 0.005, hx, hy);
      c.quadraticCurveTo((hx + lx) * 0.5, ly - 0.005, lx, ly);
    } else {
      // soft rounded overhanging upper lip tucking gently under into cute little lower lip
      c.quadraticCurveTo(ux + 0.006, uy + 0.014, lx, ly + 0.01 + chin);
    }
    c.bezierCurveTo(lx - 0.028, ly + 0.044 + chin, 0.225, 0.175 + chin, 0.115, 0.222 + chin);
    c.bezierCurveTo(-0.02, 0.252, -0.16, 0.222, -0.218, 0.138);
    c.quadraticCurveTo(-0.236, 0.098, -0.226, 0.065);
  };

  c.beginPath();
  body();
  c.closePath();
  c.fillStyle = lin(c, -0.05, -0.24, 0.05, 0.24, [
    [0, mix(B, D, 0.45)],
    [0.35, "#d8f5ff"],
    [0.72, BEL],
    [1, mix(B, D, 0.42)],
  ]);
  c.fill();

  c.save();
  c.clip();
  // soft subtle blue rib lines across flank
  c.strokeStyle = rgba(D, 0.24);
  c.lineWidth = 0.0075;
  for (let i = -4; i <= 3; i++) {
    const u = i * 0.042;
    c.beginPath();
    c.moveTo(u + 0.015, -0.25);
    c.quadraticCurveTo(u - 0.028, 0.0, u + 0.01, 0.25);
    c.stroke();
  }
  // sky-blue shading over forehead & snout bridge
  glow(c, 0.27, -0.02, 0.12, 0.13, 0.2, "76,126,216", 0.55);

  // ---- vertical dark navy eye band covering eye down to throat ----
  c.fillStyle = NAVY;
  c.beginPath();
  c.moveTo(0.215, -0.24);
  c.bezierCurveTo(0.248, -0.08, 0.244, 0.08, 0.205, 0.23);
  c.lineTo(0.148, 0.23);
  c.bezierCurveTo(0.185, 0.07, 0.185, -0.09, 0.158, -0.24);
  c.closePath();
  c.fill();

  // ---- front S-curved royal-blue saddle patch (exact Image 1!) ----
  const drawPatch = (build: () => void) => {
    c.beginPath();
    build();
    c.closePath();
    c.fillStyle = lin(c, 0, -0.2, 0, 0.15, [
      [0, mix(BAND, "#4f7be6", 0.2)],
      [0.5, BAND],
      [1, mix(BAND, NAVY, 0.28)],
    ]);
    c.fill();
    c.strokeStyle = NAVY;
    c.lineWidth = 0.0085;
    c.stroke();
  };
  drawPatch(() => {
    c.moveTo(0.118, -0.225);
    c.bezierCurveTo(0.145, -0.15, 0.085, -0.08, 0.092, 0.005);
    c.bezierCurveTo(0.1, 0.09, 0.092, 0.165, 0.045, 0.172);
    c.bezierCurveTo(-0.005, 0.175, 0.015, 0.085, 0.01, 0.005);
    c.bezierCurveTo(0.005, -0.075, -0.045, -0.15, 0.0, -0.232);
  });
  // ---- rear plump royal-blue saddle patch (exact Image 1!) ----
  drawPatch(() => {
    c.moveTo(-0.045, -0.22);
    c.bezierCurveTo(-0.015, -0.13, -0.045, -0.03, -0.032, 0.065);
    c.bezierCurveTo(-0.02, 0.15, -0.085, 0.19, -0.145, 0.165);
    c.bezierCurveTo(-0.205, 0.14, -0.215, 0.01, -0.195, -0.115);
    c.bezierCurveTo(-0.18, -0.205, -0.095, -0.245, -0.045, -0.22);
  });

  // 3D body volume highlight + bottom rim
  glow(c, -0.02, -0.05, 0.16, 0.12, -0.2, "255,255,255", 0.34);
  c.fillStyle = lin(c, 0, -0.25, 0, 0.24, [
    [0, "rgba(255,255,255,0.22)"],
    [0.2, "rgba(255,255,255,0)"],
    [0.75, "rgba(10,20,55,0)"],
    [1, "rgba(10,20,55,0.28)"],
  ]);
  c.fillRect(-0.3, -0.3, 0.8, 0.6);
  c.restore();

  c.beginPath();
  body();
  c.closePath();
  c.strokeStyle = OL;
  c.lineWidth = LW;
  c.stroke();

  // ---- smiling/pouting mouth seam ----
  c.strokeStyle = OL;
  c.lineWidth = 0.007;
  if (p.open > 0) {
    c.beginPath();
    c.moveTo(ux, uy);
    c.lineTo(hx, hy);
    c.lineTo(lx, ly);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(lx + 0.003, ly + 0.004);
    c.quadraticCurveTo((lx + hx) * 0.5, hy + 0.016, hx, hy);
    c.stroke();
  }

  // ---- big royal-blue spot at tail peduncle (exact Image 1!) ----
  c.beginPath();
  c.arc(-0.222, 0.042, 0.036, 0, TAU);
  c.fillStyle = "#0e32ba";
  c.fill();
  c.strokeStyle = NAVY;
  c.lineWidth = 0.008;
  c.stroke();
  glow(c, -0.228, 0.032, 0.012, 0.009, 0, "140,200,255", 0.6);

  // ---- soft translucent pale cheek/pectoral fin (Image 1) ----
  c.save();
  c.translate(0.118, 0.118);
  c.rotate(-0.2 + p.wag2 * 0.14);
  fillStroke(
    c,
    () => {
      c.moveTo(0, -0.012);
      c.bezierCurveTo(-0.038, -0.042, -0.095, -0.02, -0.088, 0.018);
      c.bezierCurveTo(-0.075, 0.048, -0.028, 0.042, 0, 0.014);
    },
    lin(c, 0, 0, -0.09, 0, [
      [0, "rgba(210, 234, 248, 0.72)"],
      [1, "rgba(255, 255, 255, 0.88)"],
    ]),
    rgba(pal.outline, 0.45),
    LW * 0.65
  );
  c.restore();

  // ---- eye: neatly nestled inside the dark navy vertical eye band (Image 1!) ----
  const ex = 0.214,
    ey = 0.002 - p.open * 0.006,
    er = 0.035;
  if (p.puff) glow(c, ex - 0.025, ey + 0.055, 0.036, 0.022, 0, "255,110,150", 0.42);
  eye(c, ex, ey, er, {
    iris: pal.iris || "#1e3a78",
    expr: p.expr,
    ol: "#080f28",
    sx: 0.88,
    look: 0.28,
    irisR: 0.56,
    pupilR: 0.35,
    happyCol: "#e6f2ff",
  });
}

// =====================================================================================
// ANDY & RYAN — Angelfish matching Feeding Frenzy 1 reference:
// plump curved body, seamless swept-back dorsal peak with low ridge, rounded pouting
// lips with protruding upper snout, upward-sweeping U/J neon stripes, rounded golden
// anal fin, creamy crescent tail & larger glossy 3D oval eye nestled inside the head.
// =====================================================================================
function drawAndy(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const B = pal.body,
    D = pal.dark,
    BEL = pal.belly;
  const FIN = pal.fin,
    TAIL = pal.tail || "#fff6cc";
  const STR = pal.stripe || "#df22ff";
  const OL = rgba(pal.outline, 0.88);
  const LW = 0.009;
  c.translate(-0.02, 0.0);
  const sw = p.wag2 * 0.007;

  const [dr, dg, db] = hexRgb(D);
  const [br, bg, bb] = hexRgb(mix(BEL, "#fff066", 0.35));

  // ---- 1. Crisp cream-gold triangular fan tail (exact Gambar 4!) ----
  c.save();
  c.translate(-0.225, 0.0);
  c.rotate(p.wag * 0.2);
  c.scale(1 - Math.abs(p.wag) * 0.06, 1);
  fillStroke(
    c,
    () => {
      c.moveTo(0, -0.026);
      c.bezierCurveTo(-0.048, -0.058, -0.106, -0.106, -0.168, -0.124);
      c.quadraticCurveTo(-0.146, -0.002, -0.156, 0.116);
      c.bezierCurveTo(-0.098, 0.098, -0.046, 0.056, 0, 0.026);
    },
    lin(c, 0, 0, -0.165, 0, [
      [0, mix(D, BEL, 0.38)],
      [0.24, mix(BEL, TAIL, 0.68)],
      [0.62, TAIL],
      [1, "#ffffff"],
    ]),
    OL,
    LW * 0.85,
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 7; i++) pts.push([-0.152, -0.102 + i * 0.034]);
      rayFan(c, 0.01, 0, pts, rgba(BEL, 0.32), 0.0036);
    }
  );
  c.restore();

  // ---- 2. Low scalloped dorsal fin ridge along upper crown (Gambar 4) ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.065, -0.244);
      c.bezierCurveTo(-0.015, -0.326, -0.125 + sw * 0.4, -0.372 + sw * 0.3, -0.205 + sw * 0.7, -0.362 + sw * 0.3);
      c.lineTo(-0.185 + sw * 0.4, -0.335 + sw * 0.3);
      c.lineTo(-0.228 + sw, -0.342 + sw * 0.3);
      c.lineTo(-0.08, -0.25);
    },
    lin(c, -0.04, -0.25, -0.16, -0.37, [
      [0, mix(D, B, 0.2)],
      [0.6, D],
      [1, mix(D, pal.outline, 0.48)],
    ]),
    OL,
    LW * 0.78,
    () => {
      const pts: [number, number][] = [
        [0.015, -0.296],
        [-0.045, -0.336],
        [-0.1, -0.358],
        [-0.16, -0.365],
      ];
      rayFan(c, -0.05, -0.26, pts, rgba(pal.outline, 0.38), 0.0035);
    }
  );

  // ---- 3. Swept translucent rounded-tip anal fin with transverse bands (Gambar 4) ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.025, 0.212);
      c.bezierCurveTo(-0.06, 0.3, -0.122 + sw * 0.4, 0.366 - sw * 0.3, -0.184 + sw * 0.8, 0.354 - sw * 0.3);
      c.bezierCurveTo(-0.228, 0.332, -0.232, 0.205, -0.21, 0.088);
      c.lineTo(-0.11, 0.16);
    },
    lin(c, -0.09, 0.18, -0.18, 0.36, [
      [0, mix(BEL, FIN, 0.4)],
      [0.55, mix(FIN, BEL, 0.4)],
      [1, mix(FIN, D, 0.28)],
    ]),
    OL,
    LW * 0.85,
    () => {
      const pts: [number, number][] = [
        [-0.07, 0.318],
        [-0.118, 0.352],
        [-0.168, 0.356],
        [-0.208, 0.31],
        [-0.224, 0.206],
      ];
      rayFan(c, -0.07, 0.18, pts, rgba(D, 0.36), 0.0044);
      c.strokeStyle = rgba(STR, 0.38);
      c.lineWidth = 0.012;
      c.beginPath();
      c.moveTo(-0.045, 0.244);
      c.quadraticCurveTo(-0.132, 0.266, -0.215, 0.194);
      c.stroke();
      c.beginPath();
      c.moveTo(-0.082, 0.314);
      c.quadraticCurveTo(-0.152, 0.324, -0.22, 0.264);
      c.stroke();
    }
  );

  // ---- 4. Protruding Beaked Snout & Always-Clean Open-Shape Lips (Gambar 4!) ----
  const hx = 0.265,
    hy = 0.002;
  const openAmt = 0.18 + p.open * 0.82; // slight expressive Gambar-4 mouth gap even when idle!
  const ux = hx + 0.098 - p.open * 0.008,
    uy = hy - 0.024 - p.open * 0.036;
  const lx = hx + 0.092 - p.open * 0.012,
    ly = hy + 0.014 + p.open * 0.068;
  const chin = (p.puff ? 0.01 : 0) + p.open * 0.016;

  // Crimson inner mouth cavity (always cleanly framed between the protruding upper & lower beak lips!)
  c.beginPath();
  c.moveTo(ux - 0.004, uy + 0.006);
  c.lineTo(hx - 0.018, hy);
  c.lineTo(lx - 0.004, ly - 0.004);
  c.closePath();
  c.fillStyle = "#5c0f1d";
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = "#e65b78";
  blob(c, (hx + lx) * 0.52, (hy + ly) * 0.52 + 0.003, 0.032, 0.012, openAmt * 0.45);
  c.restore();

  // ---- 5. Sweeping Angelfish Body Silhouette (exact Gambar 4 curve!) ----
  const body = () => {
    c.moveTo(-0.228, -0.026);
    // Graceful concave rear back sweeping up-left to sharp dorsal tip
    c.bezierCurveTo(-0.214, -0.112, -0.168, -0.194, -0.238 + sw, -0.344 + sw * 0.35);
    // Full arched crown sweeping forward over eye down to nose-bridge dip
    c.bezierCurveTo(-0.1, -0.352, 0.055, -0.312, 0.165, -0.205);
    c.bezierCurveTo(0.215, -0.155, 0.252, -0.105, 0.278, -0.075);
    // Concave dip at nose bridge then protruding rounded upper snout beak!
    c.bezierCurveTo(0.305, -0.062, 0.338, -0.052, ux, uy);
    // Crisp parted upper lip inside mouth corner -> lower lip protruding forward
    c.quadraticCurveTo(ux - 0.006, uy + 0.01, (ux + hx) * 0.52, uy + 0.008);
    c.quadraticCurveTo(hx, hy, (hx + lx) * 0.52, ly - 0.005);
    c.quadraticCurveTo(lx + 0.004, ly - 0.002, lx, ly);
    // Sculpted lower chin sweeping down smoothly around full belly back to peduncle
    c.bezierCurveTo(lx - 0.022, ly + 0.024 + chin, 0.268, 0.095 + chin, 0.186, 0.17 + chin);
    c.bezierCurveTo(0.104, 0.242 + chin * 0.6, -0.014, 0.27 + chin * 0.3, -0.112, 0.234);
    c.bezierCurveTo(-0.18, 0.206, -0.214, 0.132, -0.228, 0.03);
  };

  c.beginPath();
  body();
  c.closePath();
  c.fillStyle = lin(c, -0.04, -0.26, 0.28, 0.16, [
    [0, mix(B, BEL, 0.5)],
    [0.36, BEL],
    [0.72, B],
    [1, D],
  ]);
  c.fill();

  c.save();
  c.clip();
  // Warm bright body center & deeper snout/forehead shading
  glow(c, -0.02, -0.06, 0.18, 0.155, -0.25, `${br},${bg},${bb}`, 0.65);
  glow(c, 0.27, 0.01, 0.145, 0.155, 0.25, `${Math.round(dr * 0.68)},${Math.round(dg * 0.52)},${Math.round(db * 0.45)}`, 0.52);
  glow(c, -0.21, -0.32, 0.08, 0.07, -0.4, `${Math.round(dr * 0.72)},${Math.round(dg * 0.48)},${Math.round(db * 0.42)}`, 0.46);

  // ---- 6. Five Bold Flowing Magenta/Cyan Stripes (exact Gambar 4 sweep!) ----
  const drawS = (pts: [number, number, number, number, number, number, number, number], w: number) => {
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    c.strokeStyle = rgba(D, 0.38);
    c.lineWidth = w * 1.62;
    c.stroke();
    c.strokeStyle = rgba(STR, 0.44);
    c.lineWidth = w * 1.28;
    c.stroke();
    c.strokeStyle = STR;
    c.lineWidth = w;
    c.stroke();
    c.strokeStyle = rgba(mix(STR, "#ffffff", 0.48), 0.7);
    c.lineWidth = w * 0.34;
    c.stroke();
  };
  // 1. Snout-bridge -> across cheek -> swept upper back arc
  drawS([0.302, -0.056, 0.228, -0.095, 0.172, -0.092, 0.135, -0.104], 0.013);
  // 2. Eye-front -> upper brow -> tall dorsal peak
  drawS([0.138, -0.104, 0.035, -0.118, -0.075, -0.182, -0.205 + sw * 0.7, -0.33], 0.019);
  // 3. Gill cheek -> sweeping golden center belly curve -> dorsal peak
  drawS([0.275, -0.018, 0.135, 0.032, -0.055, 0.038, -0.22 + sw * 0.8, -0.326], 0.022);
  // 4. Lower chest -> deep belly U-sweep -> upper rear flank
  drawS([0.115, 0.088, -0.015, 0.128, -0.12, 0.028, -0.206 + sw * 0.5, -0.268], 0.022);
  // 5. Bottom belly curve -> rear flank
  drawS([0.045, 0.176, -0.068, 0.192, -0.152, 0.095, -0.216, -0.105], 0.02);
  // 6. Small lower curl near anal fin
  drawS([-0.068, 0.224, -0.125, 0.214, -0.165, 0.168, -0.196, 0.112], 0.015);

  // Signature small brow ocellus ring above eye (Gambar 4!)
  c.beginPath();
  c.ellipse(0.164, -0.146, 0.016, 0.021, 0.15, 0, TAU);
  c.fillStyle = rgba(D, 0.3);
  c.fill();
  c.strokeStyle = rgba(D, 0.62);
  c.lineWidth = 0.0052;
  c.stroke();

  // Crisp golden gill cover crease behind eye
  c.strokeStyle = rgba(mix(BEL, "#fff4c8", 0.68), 0.74);
  c.lineWidth = 0.0082;
  c.beginPath();
  c.moveTo(0.158, -0.078);
  c.bezierCurveTo(0.126, -0.002, 0.144, 0.066, 0.198, 0.095);
  c.stroke();
  c.strokeStyle = rgba(D, 0.48);
  c.lineWidth = 0.004;
  c.beginPath();
  c.moveTo(0.152, -0.078);
  c.bezierCurveTo(0.12, -0.002, 0.138, 0.066, 0.192, 0.095);
  c.stroke();

  // Upper beak lip glossy highlight
  glow(c, ux - 0.018, uy - 0.006, 0.02, 0.009, -0.2, "255,240,210", 0.42);

  // 3D dorsal highlight & lower belly shadow
  c.fillStyle = lin(c, -0.08, -0.32, 0.12, 0.26, [
    [0, "rgba(255,250,220,0.22)"],
    [0.18, "rgba(255,250,220,0)"],
    [0.74, "rgba(45,10,5,0)"],
    [1, "rgba(45,10,5,0.34)"],
  ]);
  c.fillRect(-0.32, -0.38, 0.78, 0.74);
  c.restore();

  // Body ink outline
  c.beginPath();
  body();
  c.closePath();
  c.strokeStyle = OL;
  c.lineWidth = LW;
  c.stroke();

  // Crisp open mouth lip rim accent
  c.strokeStyle = OL;
  c.lineWidth = 0.0068;
  c.beginPath();
  c.moveTo(ux - 0.004, uy + 0.005);
  c.lineTo(hx, hy);
  c.lineTo(lx - 0.003, ly - 0.002);
  c.stroke();

  // ---- 7. Small warm translucent pectoral fin tucked behind gill crease ----
  c.save();
  c.translate(0.114, 0.074);
  c.rotate(-0.22 + p.wag2 * 0.14);
  fillStroke(
    c,
    () => {
      c.moveTo(0, -0.01);
      c.bezierCurveTo(-0.036, -0.042, -0.082, -0.018, -0.074, 0.022);
      c.bezierCurveTo(-0.058, 0.052, -0.016, 0.042, 0, 0.014);
    },
    lin(c, 0, 0, -0.08, 0.02, [
      [0, rgba(D, 0.82)],
      [1, rgba(FIN, 0.65)],
    ]),
    rgba(pal.outline, 0.58),
    LW * 0.68
  );
  c.restore();

  // ---- 8. Large Bright Expressive Glossy Eye (Gambar 4!) ----
  const ex = 0.224,
    ey = -0.068 - p.open * 0.006,
    er = 0.05;
  if (p.puff) glow(c, ex - 0.02, ey + 0.062, 0.038, 0.024, 0, "255,110,150", 0.45);
  c.beginPath();
  c.ellipse(ex - 0.004, ey, er * 0.96, er * 1.12, -0.14, Math.PI * 0.55, Math.PI * 1.72);
  c.strokeStyle = rgba(D, 0.56);
  c.lineWidth = 0.0065;
  c.stroke();
  eye(c, ex, ey, er, {
    iris: pal.iris || "#3a1c08",
    expr: p.expr,
    ol: OL,
    sx: 0.86,
    look: 0.26,
    irisR: 0.58,
    pupilR: 0.36,
    tilt: -0.14,
  });
}

// =====================================================================================
// DORI — Regal Blue Tang matching Image 2 (Pixar Dory):
// high arched royal-blue oval disc, steep rounded forehead, protruding cute rounded
// blue nose & wide happy smiling mouth, curved black palette saddle with electric-blue
// oval window, bright yellow wedge tail with black top/bottom edges & swept wing fin!
// =====================================================================================
function drawTang(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const B = "#1b6cff",
    BD = "#0d35b8",
    BL = "#4ca8ff";
  const BLK = "#0b1022";
  const YEL = pal.tail || "#ffe02a";
  const OL = rgba(pal.outline || "#07174a", 0.86);
  const LW = 0.0095;
  c.translate(-0.01, 0.008);
  const sw = p.wag2 * 0.007;

  // ---- tail: bright yellow wedge fan bordered along top & bottom by black ----
  c.save();
  c.translate(-0.228, -0.015);
  c.rotate(p.wag * 0.2);
  c.scale(1 - Math.abs(p.wag) * 0.05, 1);
  fillStroke(
    c,
    () => {
      c.moveTo(0.02, -0.032);
      c.bezierCurveTo(-0.045, -0.068, -0.115, -0.104, -0.185, -0.122);
      c.quadraticCurveTo(-0.172, 0.0, -0.182, 0.118);
      c.bezierCurveTo(-0.11, 0.1, -0.042, 0.064, 0.02, 0.032);
    },
    lin(c, 0.02, 0, -0.18, 0, [
      [0, "#d8a212"],
      [0.45, YEL],
      [1, "#fff268"],
    ]),
    OL,
    LW * 0.82,
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) pts.push([-0.18, -0.09 + i * 0.036]);
      rayFan(c, 0.02, 0, pts, "rgba(170, 110, 10, 0.34)", 0.0038);
      // Black upper & lower borders (characteristic Regal Tang tail wedge)
      c.strokeStyle = BLK;
      c.lineWidth = 0.024;
      c.beginPath();
      c.moveTo(0.02, -0.034);
      c.bezierCurveTo(-0.045, -0.068, -0.115, -0.104, -0.19, -0.122);
      c.stroke();
      c.beginPath();
      c.moveTo(0.02, 0.034);
      c.bezierCurveTo(-0.042, 0.064, -0.11, 0.1, -0.19, 0.118);
      c.stroke();
    }
  );
  c.restore();

  // ---- low continuous royal-blue dorsal & anal ridge hugging body ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.205, -0.19);
      c.bezierCurveTo(0.11, -0.292, -0.08, -0.305 + sw * 0.4, -0.22 + sw * 0.7, -0.185 + sw * 0.3);
      c.quadraticCurveTo(-0.245, -0.11, -0.22, -0.048);
      c.lineTo(-0.08, -0.12);
    },
    lin(c, 0.0, -0.18, -0.06, -0.3, [
      [0, BD],
      [0.6, B],
      [1, BL],
    ]),
    OL,
    LW * 0.8,
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) pts.push([0.16 - i * 0.042, -0.29 + Math.abs(i - 4) * 0.012]);
      rayFan(c, -0.02, -0.12, pts, "rgba(8, 22, 80, 0.35)", 0.0038);
    }
  );
  fillStroke(
    c,
    () => {
      c.moveTo(0.03, 0.228);
      c.bezierCurveTo(-0.06, 0.278 - sw * 0.3, -0.175 + sw * 0.5, 0.248 - sw * 0.3, -0.225 + sw * 0.7, 0.142);
      c.quadraticCurveTo(-0.238, 0.085, -0.218, 0.04);
      c.lineTo(-0.08, 0.13);
    },
    lin(c, -0.06, 0.16, -0.12, 0.27, [
      [0, BD],
      [0.65, B],
      [1, BL],
    ]),
    OL,
    LW * 0.8,
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 8; i++) pts.push([0.0 - i * 0.032, 0.27 - i * 0.01]);
      rayFan(c, -0.08, 0.12, pts, "rgba(8, 22, 80, 0.35)", 0.0038);
    }
  );

  // ---- jaw geometry: joyful wide smiling mouth with cute protruding blue nose ----
  const hx = 0.228,
    hy = 0.056;
  const jl = 0.112;
  const baseAng = 0.1;
  const ua = baseAng - 0.12 - p.open * 0.24;
  const la = baseAng + 0.14 + p.open * 0.88;
  const ux = hx + Math.cos(ua) * (jl * 1.04),
    uy = hy + Math.sin(ua) * (jl * 1.04);
  const lx = hx + Math.cos(la) * (jl * 0.88),
    ly = hy + Math.sin(la) * (jl * 0.88);
  const chin = (p.puff ? 0.01 : 0) + p.open * 0.022;

  if (p.open > 0) {
    c.beginPath();
    c.moveTo(ux - 0.006, uy + 0.005);
    c.lineTo(hx - 0.025, hy - 0.008);
    c.lineTo(lx - 0.006, ly - 0.004);
    c.closePath();
    c.fillStyle = "#220a38";
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = "#c9629c";
    blob(c, (hx + lx) * 0.54, (hy + ly) * 0.54 + 0.005, 0.036, 0.013, la);
    c.restore();
  }

  // ---- Image 2 Dory body silhouette: tall rounded dome, steep nose bridge, happy chin ----
  const body = () => {
    c.moveTo(-0.225, -0.042);
    c.bezierCurveTo(-0.205, -0.16, -0.1, -0.255, 0.055, -0.258);
    // steep rounded forehead & brow curve
    c.bezierCurveTo(0.185, -0.258, 0.275, -0.195, 0.305, -0.115 - p.open * 0.01);
    // cute steep nose bridge down to protruding rounded nose tip
    c.bezierCurveTo(0.326, -0.045, 0.352, uy - 0.032, ux, uy);
    if (p.open > 0) {
      c.quadraticCurveTo((ux + hx) * 0.5, uy + 0.008, hx, hy);
      c.quadraticCurveTo((hx + lx) * 0.5, ly - 0.006, lx, ly);
    } else {
      // cute happy Dory smiling nose & lower lip tuck
      c.quadraticCurveTo(ux + 0.008, uy + 0.018, lx, ly + 0.008 + chin);
    }
    // plump rounded chin curving smoothly into deep rounded belly
    c.bezierCurveTo(lx - 0.015, ly + 0.042 + chin, 0.255, 0.198 + chin, 0.135, 0.236 + chin * 0.6);
    c.bezierCurveTo(0.01, 0.268, -0.13, 0.215, -0.202, 0.105);
    c.quadraticCurveTo(-0.225, 0.062, -0.225, 0.025);
  };

  c.beginPath();
  body();
  c.closePath();
  c.fillStyle = lin(c, 0.1, -0.26, -0.08, 0.25, [
    [0, BL],
    [0.45, B],
    [0.85, BD],
    [1, "#09268a"],
  ]);
  c.fill();

  c.save();
  c.clip();
  glow(c, 0.22, 0.02, 0.16, 0.16, 0.1, "90,190,255", 0.5);

  // ---- iconic Regal Blue Tang black palette saddle (Image 2!) ----
  c.fillStyle = BLK;
  c.beginPath();
  c.moveTo(0.225, -0.165);
  c.bezierCurveTo(0.145, -0.258, -0.08, -0.275, -0.24, -0.055);
  c.lineTo(-0.24, 0.038);
  c.bezierCurveTo(-0.15, 0.065, -0.095, 0.135, -0.005, 0.132);
  c.bezierCurveTo(0.075, 0.128, 0.105, 0.055, 0.055, -0.005);
  c.bezierCurveTo(0.005, -0.062, 0.075, -0.145, 0.225, -0.165);
  c.closePath();
  c.fill();

  // Signature electric-blue oval window inside the black palette (Image 2!)
  c.fillStyle = lin(c, -0.09, -0.04, -0.02, 0.06, [
    [0, BL],
    [1, B],
  ]);
  c.beginPath();
  c.ellipse(-0.055, -0.008, 0.078, 0.048, -0.14, 0, TAU);
  c.fill();

  // Yellow triangle root leading cleanly into the yellow wedge tail (Image 2!)
  c.fillStyle = YEL;
  c.beginPath();
  c.moveTo(-0.125, -0.005);
  c.lineTo(-0.24, -0.042);
  c.lineTo(-0.24, 0.036);
  c.closePath();
  c.fill();

  // Subtle 3D shading & specular face glow
  c.fillStyle = lin(c, 0, -0.26, 0, 0.26, [
    [0, "rgba(185,235,255,0.22)"],
    [0.2, "rgba(185,235,255,0)"],
    [0.74, "rgba(5,12,48,0)"],
    [1, "rgba(5,12,48,0.34)"],
  ]);
  c.fillRect(-0.3, -0.32, 0.72, 0.65);
  c.restore();

  c.beginPath();
  body();
  c.closePath();
  c.strokeStyle = OL;
  c.lineWidth = LW;
  c.stroke();

  // ---- happy smiling cheek line ----
  c.strokeStyle = OL;
  c.lineWidth = 0.0072;
  if (p.open > 0) {
    c.beginPath();
    c.moveTo(ux - 0.004, uy + 0.005);
    c.lineTo(hx, hy);
    c.lineTo(lx - 0.004, ly - 0.002);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(lx + 0.005, ly + 0.004);
    c.quadraticCurveTo((lx + hx) * 0.52, hy + 0.022, hx - 0.008, hy - 0.012);
    c.stroke();
    // cheerful smile dimple
    c.beginPath();
    c.arc(hx - 0.012, hy - 0.012, 0.014, Math.PI * 0.7, Math.PI * 1.45);
    c.lineWidth = 0.005;
    c.stroke();
  }

  // ---- swept pointed pectoral wing with black frame & bright yellow tip (exact Image 2!) ----
  c.save();
  c.translate(0.052, 0.068);
  c.rotate(-0.62 + p.wag2 * 0.16);
  fillStroke(
    c,
    () => {
      c.moveTo(0, -0.012);
      c.bezierCurveTo(-0.045, -0.048, -0.115, -0.042, -0.155, -0.01);
      c.bezierCurveTo(-0.11, 0.036, -0.045, 0.045, 0, 0.018);
    },
    lin(c, 0, 0, -0.15, 0, [
      [0, B],
      [0.45, BL],
      [0.52, BLK],
      [1, BLK],
    ]),
    OL,
    LW * 0.72,
    () => {
      // Bright yellow crescent wing tip inside black border
      c.fillStyle = YEL;
      c.beginPath();
      c.ellipse(-0.1, -0.002, 0.042, 0.018, 0.05, 0, TAU);
      c.fill();
    }
  );
  c.restore();

  // ---- expressive big Dory eyes (with warm magenta-brown iris) ----
  const ex = 0.252,
    ey = -0.072 - p.open * 0.006,
    er = 0.058;
  if (p.puff) glow(c, ex - 0.022, ey + 0.075, 0.042, 0.026, 0, "255,110,150", 0.44);
  c.beginPath();
  c.ellipse(ex - 0.004, ey, er * 1.04, er * 1.12, -0.1, Math.PI * 0.55, Math.PI * 1.75);
  c.strokeStyle = rgba(BD, 0.55);
  c.lineWidth = 0.0065;
  c.stroke();
  eye(c, ex, ey, er, {
    iris: pal.iris || "#7c2228",
    expr: p.expr,
    ol: OL,
    sx: 0.88,
    look: 0.28,
    irisR: 0.55,
    pupilR: 0.34,
    tilt: -0.1,
  });
}

// =====================================================================================
// LEON — Feeding Frenzy Lionfish (matching Image 2 exactly!):
// compact steep snout with slightly longer protruding golden lower jaw (underbite),
// tucked fierce eye under dual brow tentacles, 10 tall feather-tipped dorsal spines,
// slim tail peduncle + softly rounded speckled mint tail, & sweeping banded pectoral fan!
// =====================================================================================
function drawLeon(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const GLD = "#e5ba14";
  const GLD_HI = "#f8df44";
  const OLV = "#7d6406";
  const DK = "#322804";
  const OL = rgba(pal.outline || "#262004", 0.86);
  const MINT = "#c8ddc6";
  const MINT_L = "#e4efe0";
  const CREAM = "#f6f3cc";
  const LW = 0.0085;
  c.translate(-0.015, 0.02);

  // ---- 1. 10 tall slender dorsal spines fanning forward-to-backward with tattered mint feather pennants ----
  const nSp = 10;
  for (let i = 0; i < nSp; i++) {
    const f = i / (nSp - 1);
    const rx = 0.205 - f * 0.24;
    const ry = -0.105 - Math.sin(f * Math.PI * 0.85) * 0.042 + f * 0.045;
    // Front spines pitch gently forward (+x), middle upright, rear fan smoothly back (-x) matching Image 2!
    const baseAng = -Math.PI * (0.38 + f * 0.3) + p.wag2 * 0.025;
    const spLen = 0.215 + Math.sin(f * Math.PI * 0.9) * 0.095 - f * 0.035;
    // Tip curls subtly backward toward tail (-x)
    const bend = 0.012 + f * 0.028;
    const midX = rx + Math.cos(baseAng) * spLen * 0.56 - bend * 0.15;
    const midY = ry + Math.sin(baseAng) * spLen * 0.56;
    const tipX = rx + Math.cos(baseAng) * spLen - bend;
    const tipY = ry + Math.sin(baseAng) * spLen + f * 0.012;

    // Tattered sage-mint feather pennant hanging off the rear edge of the upper spine
    const tx = tipX - midX;
    const ty = tipY - midY;
    const d = Math.hypot(tx, ty) || 1;
    const ux = tx / d;
    const uy = ty / d;
    // backward normal (-x direction roughly)
    const bx = -uy;
    const by = ux;
    const sign = bx < 0 ? 1 : -1;
    const nx = bx * sign;
    const ny = by * sign;

    c.beginPath();
    c.moveTo(midX, midY);
    c.lineTo(tipX, tipY);
    c.lineTo(tipX + nx * 0.036 + ux * 0.01, tipY + ny * 0.036 + uy * 0.01);
    c.lineTo(tipX - ux * 0.018 + nx * 0.022, tipY - uy * 0.018 + ny * 0.022);
    c.lineTo(tipX - ux * 0.03 + nx * 0.032, tipY - uy * 0.03 + ny * 0.032);
    c.lineTo(tipX - ux * 0.056 + nx * 0.014, tipY - uy * 0.056 + ny * 0.014);
    c.lineTo(midX + nx * 0.004, midY + ny * 0.004);
    c.closePath();
    c.fillStyle = lin(c, midX, midY, tipX, tipY, [
      [0, rgba(MINT, 0.85)],
      [0.65, rgba(MINT_L, 0.9)],
      [1, rgba("#d6e6d4", 0.78)],
    ]);
    c.fill();
    c.strokeStyle = rgba(OLV, 0.42);
    c.lineWidth = 0.004;
    c.stroke();

    // Slender banded spine shaft
    c.beginPath();
    c.moveTo(rx, ry + 0.015);
    c.quadraticCurveTo(midX, midY, tipX, tipY);
    c.strokeStyle = "#8c8b52";
    c.lineWidth = 0.009;
    c.stroke();
    c.setLineDash([0.013, 0.016]);
    c.strokeStyle = rgba(DK, 0.78);
    c.lineWidth = 0.0082;
    c.stroke();
    c.setLineDash([]);
  }

  // ---- 2. Soft rear dorsal fin (behind spines) ----
  c.beginPath();
  c.moveTo(-0.04, -0.065);
  c.quadraticCurveTo(-0.095, -0.18 + p.wag2 * 0.01, -0.145, -0.175 + p.wag2 * 0.012);
  c.bezierCurveTo(-0.155, -0.11, -0.145, -0.05, -0.145, -0.015);
  c.closePath();
  c.fillStyle = lin(c, -0.06, -0.04, -0.14, -0.17, [
    [0, rgba("#c2b850", 0.88)],
    [0.5, rgba(MINT, 0.86)],
    [1, rgba(MINT_L, 0.76)],
  ]);
  c.fill();
  c.strokeStyle = rgba(OLV, 0.45);
  c.lineWidth = 0.0045;
  c.stroke();
  // Soft dot rows on rear dorsal
  c.fillStyle = rgba("#424b28", 0.55);
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 3; k++) {
      blob(c, -0.075 - r * 0.024, -0.07 - k * 0.028 - r * 0.012, 0.004, 0.003);
    }
  }

  // ---- 3. Rounded translucent pale-mint speckled tail fin (Image 2!) ----
  c.save();
  c.translate(-0.215, 0.015);
  c.rotate(p.wag * 0.14);
  c.scale(1 - Math.abs(p.wag) * 0.04, 1);
  c.beginPath();
  c.moveTo(0.01, -0.036);
  c.quadraticCurveTo(-0.06, -0.105, -0.145, -0.135);
  c.bezierCurveTo(-0.22, -0.095, -0.235, 0.085, -0.13, 0.148);
  c.quadraticCurveTo(-0.055, 0.115, 0.01, 0.042);
  c.closePath();
  c.fillStyle = lin(c, 0, 0, -0.22, 0, [
    [0, rgba("#b4bc84", 0.88)],
    [0.35, rgba(MINT, 0.84)],
    [1, rgba(MINT_L, 0.74)],
  ]);
  c.fill();
  c.save();
  c.clip();
  // Faint pale rays + scattered dark olive dots like Image 2
  const tRays: [number, number][] = [];
  for (let i = 0; i < 7; i++) tRays.push([-0.21, -0.1 + i * 0.036]);
  rayFan(c, 0.02, 0.004, tRays, rgba("#eff4e4", 0.52), 0.0032);
  c.fillStyle = rgba("#303818", 0.62);
  for (let i = 0; i < 7; i++) {
    const ry = -0.088 + i * 0.031;
    for (let j = 1; j <= 4; j++) {
      const t = j * 0.22;
      blob(c, -0.03 - t * 0.17, ry * (0.35 + t * 0.85), 0.0042, 0.0034);
    }
  }
  c.restore();
  c.strokeStyle = rgba(OLV, 0.45);
  c.lineWidth = 0.0048;
  c.stroke();
  c.restore();

  // ---- 4. Small tucked anal fin behind pectoral curtain ----
  c.beginPath();
  c.moveTo(-0.06, 0.08);
  c.quadraticCurveTo(-0.095, 0.145 - p.wag2 * 0.008, -0.135, 0.145 - p.wag2 * 0.008);
  c.quadraticCurveTo(-0.15, 0.095, -0.145, 0.045);
  c.closePath();
  c.fillStyle = rgba(MINT, 0.78);
  c.fill();

  // ---- 5. BODY + SHORT STEEP SNOUT + RIGID-ROTATED LONGER PROTRUDING LOWER JAW ----
  const hx = 0.268;
  const hy = 0.058;
  const jawAng = p.open * 0.56;
  const cosJ = Math.cos(jawAng);
  const sinJ = Math.sin(jawAng);
  const rotJ = (px: number, py: number): [number, number] => [
    hx + (px - hx) * cosJ - (py - hy) * sinJ,
    hy + (px - hx) * sinJ + (py - hy) * cosJ,
  ];
  const ux = 0.354;
  const uy = 0.052 - p.open * 0.028;
  // Lower jaw sticks out slightly FURTHER than upper lip, rotating cleanly on hinge (hx, hy)
  const [lx, ly] = rotJ(0.382, 0.064);
  const [chinFrontX, chinFrontY] = rotJ(0.386, 0.094);
  const [chinBotX, chinBotY] = rotJ(0.312, 0.128);

  const body = () => {
    c.moveTo(-0.215, -0.028);
    // Slim tail peduncle rising cleanly into high rounded golden-olive back crest
    c.bezierCurveTo(-0.14, -0.028, -0.09, -0.068, -0.01, -0.132);
    c.bezierCurveTo(0.085, -0.165, 0.185, -0.138, 0.246, -0.085);
    // Steep slightly concave face down to short compact upper snout
    c.bezierCurveTo(0.268, -0.062, 0.282, -0.032, 0.312, 0.004 - p.open * 0.016);
    c.quadraticCurveTo(0.34, 0.032 - p.open * 0.024, ux, uy);
    if (p.open > 0) {
      c.quadraticCurveTo(0.314, (uy + hy) * 0.5 + 0.008, hx, hy);
      c.quadraticCurveTo((hx + lx) * 0.5 + 0.006, (hy + ly) * 0.5 - 0.004, lx, ly);
      // Smoothly rotated rounded chin sweeping cleanly back into throat & belly
      c.bezierCurveTo(chinFrontX, chinFrontY, chinBotX, chinBotY, 0.225, 0.138 + p.open * 0.01);
      c.bezierCurveTo(0.125, 0.152, 0.005, 0.115, -0.115, 0.068);
      c.quadraticCurveTo(-0.175, 0.05, -0.215, 0.044);
    } else {
      // Closed mouth: upper lip curves softly into tucked throat pocket while lower lip juts slightly further forward!
      c.quadraticCurveTo(ux - 0.006, 0.064, hx + 0.025, 0.062);
      c.quadraticCurveTo(lx - 0.012, 0.056, lx, ly);
      c.bezierCurveTo(lx + 0.006, ly + 0.024, 0.31, 0.112 + (p.puff ? 0.014 : 0), 0.225, 0.138);
      c.bezierCurveTo(0.125, 0.152, 0.005, 0.115, -0.115, 0.068);
      c.quadraticCurveTo(-0.175, 0.05, -0.215, 0.044);
    }
  };

  // Recessed natural mouth cavity behind jaws when eating (curved inner wall + clipped tongue + fangs!)
  if (p.open > 0) {
    c.beginPath();
    c.moveTo(hx - 0.016, hy);
    c.quadraticCurveTo(0.314, (uy + hy) * 0.5 + 0.008, ux - 0.006, uy + 0.003);
    c.quadraticCurveTo((ux + lx) * 0.5 - 0.026, (uy + ly) * 0.5, lx - 0.006, ly + 0.002);
    c.quadraticCurveTo((hx + lx) * 0.5 + 0.006, (hy + ly) * 0.5 - 0.004, hx - 0.016, hy + 0.008);
    c.closePath();
    c.fillStyle = "#520e1e";
    c.fill();
    c.save();
    c.clip();
    c.beginPath();
    c.ellipse((hx + lx) * 0.48, (hy + ly) * 0.52 + 0.004, 0.042, 0.018 + p.open * 0.01, jawAng * 0.65, 0, TAU);
    c.fillStyle = "#d94f78";
    c.fill();
    const fl = 0.012 * Math.min(1, p.open * 1.4);
    teethRow(c, hx, hy, ux - 0.005, uy + 0.003, 5, 0.24, 0.96, (t) => fl * (0.55 + t * 0.45), 0.18, 0.94);
    teethRow(c, hx, hy, lx - 0.006, ly + 0.002, 5, -0.22, -0.96, (t) => fl * (0.6 + t * 0.5), 0.18, 0.94);
    c.restore();
  }

  fillStroke(
    c,
    body,
    lin(c, 0.04, -0.16, 0.04, 0.15, [
      [0, "#a88208"],
      [0.24, GLD_HI],
      [0.58, GLD],
      [0.86, "#8a6804"],
      [1, "#4e3e02"],
    ]),
    OL,
    LW,
    () => {
      // Soft radial golden glow along shoulder/flank
      glow(c, 0.06, -0.02, 0.22, 0.11, -0.08, "255,230,90", 0.34);

      // Vertical/gently curving cream-lemon & deep-olive Lionfish zebra stripes on trunk
      const flankStripes = [
        { x: 0.155, w: 0.018, c: CREAM, a: 0.84, bend: 0.014 },
        { x: 0.115, w: 0.02, c: OLV, a: 0.36, bend: 0.014 },
        { x: 0.072, w: 0.022, c: CREAM, a: 0.88, bend: 0.012 },
        { x: 0.028, w: 0.02, c: OLV, a: 0.38, bend: 0.008 },
        { x: -0.018, w: 0.02, c: CREAM, a: 0.86, bend: 0.004 },
        { x: -0.065, w: 0.02, c: OLV, a: 0.38, bend: -0.004 },
        { x: -0.108, w: 0.016, c: CREAM, a: 0.78, bend: -0.008 },
        { x: -0.158, w: 0.014, c: CREAM, a: 0.72, bend: -0.01 },
      ];
      for (const s of flankStripes) {
        c.beginPath();
        c.moveTo(s.x, -0.18);
        c.quadraticCurveTo(s.x + s.bend, 0.0, s.x - 0.01, 0.18);
        c.strokeStyle = rgba(s.c, s.a);
        c.lineWidth = s.w;
        c.stroke();
      }

      // Snout & rounded gill-cover diagonal stripes (matching Image 2!)
      const headStripes = [
        [0.328, -0.01, 0.285, 0.11],
        [0.302, -0.04, 0.258, 0.125],
        [0.274, -0.07, 0.228, 0.138],
        [0.242, -0.085, 0.205, 0.14],
      ];
      for (const [x0, y0, x1, y1] of headStripes) {
        c.beginPath();
        c.moveTo(x0, y0);
        c.quadraticCurveTo((x0 + x1) * 0.5 + 0.012, (y0 + y1) * 0.5, x1, y1);
        c.strokeStyle = rgba("#e6ebbb", 0.74);
        c.lineWidth = 0.01;
        c.stroke();
      }

      // Proud protruding golden lower jaw / lip highlight rotated WITH jaw hinge!
      const [lh0x, lh0y] = rotJ(0.285, 0.056);
      const [lhCx, lhCy] = rotJ(0.34, 0.052);
      const [lhTipX, lhTipY] = rotJ(0.382, 0.066);
      const [lhBx, lhBy] = rotJ(0.345, 0.088);
      const [lhEndX, lhEndY] = rotJ(0.285, 0.08);
      c.beginPath();
      c.moveTo(lh0x, lh0y);
      c.quadraticCurveTo(lhCx, lhCy, lhTipX, lhTipY);
      c.quadraticCurveTo(lhBx, lhBy, lhEndX, lhEndY);
      c.closePath();
      c.fillStyle = lin(c, lh0x, lh0y, lhTipX, lhBy, [
        [0, "#c89608"],
        [0.5, "#f7dc44"],
        [1, "#e8b410"],
      ]);
      c.fill();
      c.strokeStyle = rgba(DK, 0.58);
      c.lineWidth = 0.0045;
      c.stroke();

      // Deep dark mouth crease & belly shadow
      c.fillStyle = lin(c, 0, 0.08, 0, 0.16, [
        [0, "rgba(25,18,2,0)"],
        [1, "rgba(25,18,2,0.48)"],
      ]);
      c.fillRect(-0.24, 0.05, 0.65, 0.14);
    }
  );

  // Rounded operculum / gill cover curve right behind cheek
  c.beginPath();
  c.moveTo(0.195, -0.035);
  c.bezierCurveTo(0.168, 0.02, 0.18, 0.095, 0.228, 0.132);
  c.strokeStyle = rgba(DK, 0.72);
  c.lineWidth = 0.0075;
  c.stroke();
  c.beginPath();
  c.moveTo(0.204, -0.025);
  c.bezierCurveTo(0.18, 0.025, 0.192, 0.092, 0.232, 0.122);
  c.strokeStyle = rgba("#f5eea8", 0.55);
  c.lineWidth = 0.004;
  c.stroke();

  // Crisp upper/lower mouth line accentuating slight underbite
  c.beginPath();
  if (p.open > 0) {
    c.moveTo(ux, uy);
    c.quadraticCurveTo(0.314, (uy + hy) * 0.5 + 0.008, hx, hy);
    c.quadraticCurveTo((hx + lx) * 0.5 + 0.006, (hy + ly) * 0.5 - 0.004, lx, ly);
  } else {
    c.moveTo(ux - 0.004, uy + 0.004);
    c.quadraticCurveTo(0.31, 0.062, hx + 0.01, hy + 0.004);
  }
  c.strokeStyle = rgba(DK, 0.85);
  c.lineWidth = 0.0068;
  c.stroke();

  // ---- 6. SWEEPING BANDED & RAGGED FEATHERED PECTORAL CURTAIN (Image 2 signature!) ----
  c.save();
  c.translate(0.18, 0.082);
  c.rotate(p.wag2 * 0.055);
  const raysData = [
    { ang: 1.5, len: 0.215 },
    { ang: 1.76, len: 0.255 },
    { ang: 2.02, len: 0.28 },
    { ang: 2.28, len: 0.295 },
    { ang: 2.54, len: 0.295 },
    { ang: 2.8, len: 0.29 },
    { ang: 3.06, len: 0.305 },
  ];
  // Outer translucent tattered feather-curtain silhouette sweeping under belly toward tail waist
  c.beginPath();
  c.moveTo(0.035, 0.0);
  for (let i = 0; i < raysData.length; i++) {
    const r = raysData[i];
    const ex = Math.cos(r.ang) * r.len;
    const ey = Math.sin(r.ang) * r.len;
    const nx = Math.cos(r.ang + 0.09) * (r.len * 0.92);
    const ny = Math.sin(r.ang + 0.09) * (r.len * 0.92);
    const notchX = Math.cos(r.ang + 0.14) * (r.len * 0.78);
    const notchY = Math.sin(r.ang + 0.14) * (r.len * 0.78);
    c.lineTo(ex, ey);
    c.lineTo(nx, ny);
    if (i < raysData.length - 1) c.lineTo(notchX, notchY);
  }
  c.lineTo(-0.08, -0.025);
  c.closePath();
  c.fillStyle = lin(c, 0.02, 0.0, -0.16, 0.26, [
    [0, rgba("#c89e18", 0.9)],
    [0.38, rgba("#98b888", 0.84)],
    [0.72, rgba("#d6ead8", 0.85)],
    [1, rgba("#f2f9f2", 0.82)],
  ]);
  c.fill();
  c.save();
  c.clip();
  // Banded orange-tan & cream concentric ribs over upper/mid curtain fading into frothy white feather tips
  for (let b = 0; b < 5; b++) {
    c.beginPath();
    c.arc(0.01, -0.01, 0.045 + b * 0.042, 1.55, 3.25);
    c.strokeStyle = b % 2 === 0 ? rgba("#d4861a", 0.54) : rgba("#f4f2cc", 0.56);
    c.lineWidth = 0.016;
    c.stroke();
  }
  // Ragged ray ribs + subtle dark spots along mid-curtain
  for (const r of raysData) {
    const ex = Math.cos(r.ang) * r.len;
    const ey = Math.sin(r.ang) * r.len;
    c.beginPath();
    c.moveTo(0.01, 0.0);
    c.quadraticCurveTo(ex * 0.45 + 0.01, ey * 0.5, ex, ey);
    c.strokeStyle = rgba("#e4edd4", 0.85);
    c.lineWidth = 0.0052;
    c.stroke();
    c.setLineDash([0.01, 0.013]);
    c.strokeStyle = rgba("#6a5812", 0.46);
    c.lineWidth = 0.0042;
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = rgba("#3a4424", 0.44);
    blob(c, ex * 0.78, ey * 0.78, 0.0038, 0.003);
  }
  c.restore();
  c.strokeStyle = rgba(OLV, 0.34);
  c.lineWidth = 0.0038;
  c.stroke();
  c.restore();

  // ---- 7. TWO CURVED BROW TENTACLES + SHARP FIERCE COOL EYE ----
  const ex = 0.252;
  const ey = -0.044 - p.open * 0.004;
  const er = 0.036;

  // Dual curved brow tentacles leaning upward & forward
  for (const [bx0, by0, cx0, cy0, tx0, ty0, w] of [
    [0.242, -0.088, 0.262, -0.142, 0.302, -0.168, 0.0075],
    [0.256, -0.082, 0.28, -0.128, 0.312, -0.145, 0.0062],
  ] as const) {
    c.beginPath();
    c.moveTo(bx0, by0);
    c.quadraticCurveTo(cx0, cy0, tx0, ty0);
    c.strokeStyle = "#7a660c";
    c.lineWidth = w;
    c.stroke();
    c.strokeStyle = rgba("#d9cf72", 0.65);
    c.lineWidth = w * 0.42;
    c.stroke();
  }

  // Sculpted fierce forward-angled socket & lower cheek rim
  c.beginPath();
  c.arc(ex, ey, er * 1.12, Math.PI * 0.1, Math.PI * 0.88);
  c.strokeStyle = rgba(DK, 0.58);
  c.lineWidth = 0.0052;
  c.stroke();

  if (p.puff) glow(c, ex - 0.02, ey + 0.06, 0.032, 0.02, 0, "255,110,120", 0.38);
  eye(c, ex, ey, er, {
    iris: "#a4bc1c",
    expr: p.expr,
    ol: OL,
    sx: 0.9,
    look: 0.28,
    lookY: 0.04,
    irisR: 0.58,
    pupilR: 0.35,
    lid: p.expr === "panic" ? 0 : 0.26,
    lidTilt: 0.26,
    lidCol: "#907206",
    lidEdge: OL,
  });

  // Confident sharp golden-olive brow ridge angled forward (no lazy droop!)
  c.beginPath();
  c.moveTo(ex - er * 1.05, ey - er * 0.92);
  c.quadraticCurveTo(ex + er * 0.15, ey - er * 0.9, ex + er * 1.15, ey - er * 0.28);
  c.strokeStyle = rgba(DK, 0.88);
  c.lineWidth = 0.008;
  c.stroke();
}

// =====================================================================================
// GOLIATH — Orca / Killer Whale matching Image 2 silhouette & proportions:
// massive muscular body tapering smoothly into horizontal cetacean tail fluke, rounded
// melon snout, falcate dorsal fin, broad paddle flipper, pure-white chin + broad rear
// flank patch + eye patch, & rigid-rotated plump lower jaw when eating!
// =====================================================================================
function drawOrca(c: Ctx, _sp: Species, p: Pose) {
  const BLK = "#10141c";
  const BLK_HI = "#2f3a4a";
  const OL = "#080b10";
  const WH = "#ffffff";
  const LW = 0.0068;
  c.translate(0.0, 0.02);

  // ---- 1. Swept falcate dorsal fin (Image 2!) ----
  const ds = p.wag2 * 0.006;
  fillStroke(
    c,
    () => {
      c.moveTo(0.072, -0.095);
      c.bezierCurveTo(0.032, -0.145, -0.015, -0.215, -0.065 + ds, -0.252);
      c.quadraticCurveTo(-0.084 + ds, -0.258, -0.078 + ds, -0.236);
      c.bezierCurveTo(-0.038, -0.185, -0.038, -0.128, -0.062, -0.092);
    },
    lin(c, 0.02, -0.25, -0.02, -0.09, [
      [0, BLK_HI],
      [0.42, "#151a24"],
      [1, BLK],
    ]),
    OL,
    LW * 0.9
  );

  // ---- 2. Sleek horizontal 3/4 cetacean tail fluke at end of rear body (Image 2!) ----
  c.save();
  c.translate(-0.355, 0.032);
  c.rotate(p.wag * 0.14);
  fillStroke(
    c,
    () => {
      c.moveTo(0.018, -0.014);
      // subtle upper/far blade edge
      c.quadraticCurveTo(-0.04, -0.022, -0.072, -0.004);
      c.quadraticCurveTo(-0.068, 0.015, -0.068, 0.022);
      // sleek sweeping near fluke blade extending smoothly back-and-down like Image 2
      c.quadraticCurveTo(-0.095, 0.048, -0.128, 0.068);
      c.bezierCurveTo(-0.092, 0.062, -0.042, 0.038, 0.015, 0.016);
    },
    lin(c, 0.0, -0.01, -0.11, 0.06, [
      [0, BLK_HI],
      [0.45, "#151a24"],
      [1, BLK],
    ]),
    OL,
    LW * 0.85,
    () => {
      c.beginPath();
      c.moveTo(0.0, -0.004);
      c.quadraticCurveTo(-0.065, 0.022, -0.116, 0.058);
      c.strokeStyle = "rgba(195,220,245,0.18)";
      c.lineWidth = 0.0055;
      c.stroke();
    }
  );
  c.restore();

  // ---- 3. Rigid-hinged jaw coordinates (keeps full chin thickness at every mouth step!) ----
  const hx = 0.276;
  const hy = 0.048;
  const jawAng = p.open * 0.44; // max ~25 deg clean downward hinge
  const cosJ = Math.cos(jawAng);
  const sinJ = Math.sin(jawAng);
  const rotJ = (px: number, py: number): [number, number] => [
    hx + (px - hx) * cosJ - (py - hy) * sinJ,
    hy + (px - hx) * sinJ + (py - hy) * cosJ,
  ];

  // Upper lip gently lifts slightly when biting
  const ux = 0.436;
  const uy = 0.044 - p.open * 0.014;
  const [tipX, tipY] = rotJ(0.428, 0.052);
  const [chinFrontX, chinFrontY] = rotJ(0.398, 0.088);
  const [chinMidX, chinMidY] = rotJ(0.338, 0.1);
  const chinBackY = 0.1 + p.open * 0.012 + (p.puff ? 0.01 : 0);

  const body = () => {
    c.moveTo(-0.36, 0.018);
    // Smooth muscular Image 2 rear back rising smoothly to tall shoulders & rounded melon snout
    c.bezierCurveTo(-0.275, -0.018, -0.19, -0.072, -0.035, -0.098);
    c.bezierCurveTo(0.115, -0.108, 0.255, -0.095, 0.355, -0.042);
    // Rounded melon forehead + gentle blunt rostrum curve (Image 2!)
    c.bezierCurveTo(0.395, -0.022, 0.422, 0.012, 0.432, 0.03 - p.open * 0.01);
    c.quadraticCurveTo(0.442, 0.04 - p.open * 0.012, ux, uy);
    if (p.open > 0) {
      c.quadraticCurveTo(0.365, uy + 0.012, hx, hy);
      c.quadraticCurveTo((hx + tipX) * 0.5, (hy + tipY) * 0.5 - 0.004, tipX, tipY);
      c.bezierCurveTo(tipX - 0.008, tipY + 0.022, chinFrontX, chinFrontY, chinMidX, chinMidY);
      c.quadraticCurveTo(0.275, chinBackY, 0.215, 0.102);
    } else {
      // Closed Image 2 rounded snout & plump white chin
      c.quadraticCurveTo(0.436, 0.068, 0.39, 0.086);
      c.bezierCurveTo(0.335, 0.104, 0.272, chinBackY, 0.215, 0.102);
    }
    // Deep smooth muscular belly tapering cleanly to sleek horizontal tail stem (Image 2!)
    c.bezierCurveTo(0.085, 0.108, -0.065, 0.095, -0.195, 0.075);
    c.bezierCurveTo(-0.275, 0.062, -0.325, 0.044, -0.36, 0.042);
  };

  // ---- 4. Open Mouth Interior (cleanly fills entire V between upper snout & rotated jaw!) ----
  if (p.open > 0) {
    c.beginPath();
    c.moveTo(hx - 0.015, hy);
    c.quadraticCurveTo(0.36, uy + 0.01, ux - 0.012, uy + 0.002);
    // Curved front throat edge connecting upper & lower jaw so ZERO transparent hole ever appears!
    c.quadraticCurveTo((ux + tipX) * 0.5 - 0.018, (uy + tipY) * 0.5, tipX - 0.012, tipY - 0.002);
    c.quadraticCurveTo((hx + tipX) * 0.5, (hy + tipY) * 0.5, hx - 0.015, hy + 0.008);
    c.closePath();
    c.fillStyle = "#5c1222";
    c.fill();

    c.save();
    c.clip();
    // Smooth pink tongue resting on the rotated lower jaw floor
    c.beginPath();
    c.moveTo(hx - 0.005, hy + 0.006);
    c.quadraticCurveTo((hx + tipX) * 0.52, (hy + tipY) * 0.5 + 0.002, tipX - 0.018, tipY);
    c.quadraticCurveTo((hx + tipX) * 0.48, (hy + tipY) * 0.5 + 0.032, hx - 0.008, hy + 0.028);
    c.closePath();
    c.fillStyle = "#e67c96";
    c.fill();

    // Soft rose-pink upper & lower gums
    c.beginPath();
    c.moveTo(hx, hy - 0.002);
    c.quadraticCurveTo(0.36, uy + 0.01, ux - 0.012, uy + 0.002);
    c.lineWidth = 0.011;
    c.strokeStyle = "#e8a8b6";
    c.stroke();

    c.beginPath();
    c.moveTo(hx, hy + 0.004);
    c.quadraticCurveTo((hx + tipX) * 0.5, (hy + tipY) * 0.5 - 0.002, tipX - 0.01, tipY);
    c.lineWidth = 0.012;
    c.strokeStyle = "#eab2be";
    c.stroke();

    // Neat small rounded white peg-teeth along both gum lines
    const drawPegTeeth = (ax: number, ay: number, cx: number, cy: number, bx: number, by: number, nxSign: number) => {
      const nT = 9;
      c.fillStyle = "#fffdfd";
      c.strokeStyle = "rgba(85,45,55,0.45)";
      c.lineWidth = 0.002;
      for (let i = 1; i < nT; i++) {
        const t = i / nT;
        const u = 1 - t;
        const px = u * u * ax + 2 * u * t * cx + t * t * bx;
        const py = u * u * ay + 2 * u * t * cy + t * t * by;
        const tx = 2 * u * (cx - ax) + 2 * t * (bx - cx);
        const ty = 2 * u * (cy - ay) + 2 * t * (by - cy);
        const d = Math.hypot(tx, ty) || 1;
        const nx = (-ty / d) * nxSign;
        const ny = (tx / d) * nxSign;
        const sz = (0.0048 + Math.sin(t * Math.PI) * 0.0018) * Math.min(1, p.open * 1.4);
        c.beginPath();
        c.ellipse(px + nx * sz * 0.55, py + ny * sz * 0.55, sz * 0.65, sz * 0.92, Math.atan2(ty, tx), 0, TAU);
        c.fill();
        c.stroke();
      }
    };
    drawPegTeeth(hx + 0.006, hy, 0.36, uy + 0.01, ux - 0.015, uy + 0.002, 1);
    drawPegTeeth(hx + 0.006, hy + 0.004, (hx + tipX) * 0.5, (hy + tipY) * 0.5 - 0.002, tipX - 0.014, tipY, -1);
    c.restore();
  }

  fillStroke(
    c,
    body,
    lin(c, 0.02, -0.11, 0.02, 0.11, [
      [0, BLK_HI],
      [0.34, "#161d28"],
      [0.78, BLK],
      [1, "#070a0f"],
    ]),
    OL,
    LW,
    () => {
      // ---- 5. PURE WHITE MARKINGS ("tetap putih ya putihcoraknya", Image 2!) ----
      // 1a) Clean pure white chin + throat sweeping cleanly back under pectoral flipper
      c.beginPath();
      if (p.open > 0) {
        c.moveTo(tipX + 0.006, tipY - 0.002);
        c.quadraticCurveTo((hx + tipX) * 0.5, (hy + tipY) * 0.5 - 0.004, hx, hy);
      } else {
        c.moveTo(0.436, 0.044);
        c.quadraticCurveTo(0.372, 0.056, 0.32, 0.044);
        c.quadraticCurveTo(0.28, 0.044, hx, hy);
      }
      c.bezierCurveTo(0.238, 0.046, 0.215, 0.068, 0.185, 0.075);
      c.bezierCurveTo(0.155, 0.088, 0.115, 0.105, 0.06, 0.115);
      c.lineTo(0.48, 0.26);
      c.closePath();
      c.fillStyle = lin(c, 0.32, 0.04, 0.32, 0.12, [
        [0, WH],
        [0.78, WH],
        [1, "#e6ecf4"],
      ]);
      c.fill();

      // 1b) Broad smooth rounded rear-flank white patch + ventral strip (exact Image 2!)
      c.beginPath();
      c.moveTo(-0.045, 0.14);
      c.bezierCurveTo(-0.065, 0.068, -0.105, 0.018, -0.175, 0.014);
      c.bezierCurveTo(-0.228, 0.01, -0.268, 0.028, -0.278, 0.055);
      c.lineTo(-0.285, 0.14);
      c.closePath();
      c.fillStyle = lin(c, -0.16, 0.015, -0.16, 0.095, [
        [0, WH],
        [0.82, "#f4f7fb"],
        [1, "#dde6f0"],
      ]);
      c.fill();

      // 2) Pure-white streamlined eye patch tilting cleanly UPWARD toward back (fierce, not droopy/sad!)
      c.save();
      c.translate(0.292, -0.006);
      c.rotate(0.22);
      c.beginPath();
      c.moveTo(-0.044, -0.002);
      c.bezierCurveTo(-0.036, -0.017, 0.008, -0.016, 0.04, -0.001);
      c.bezierCurveTo(0.046, 0.004, 0.038, 0.013, 0.014, 0.013);
      c.bezierCurveTo(-0.014, 0.013, -0.044, 0.01, -0.044, -0.002);
      c.closePath();
      c.fillStyle = WH;
      c.fill();
      c.restore();

      // 3) Glossy ocean sheen across broad rounded melon head & muscular back (Image 2!)
      glow(c, 0.34, -0.022, 0.085, 0.024, 0.18, "215,235,255", 0.24);
      c.beginPath();
      c.moveTo(0.365, -0.028);
      c.bezierCurveTo(0.245, -0.088, 0.075, -0.096, -0.125, -0.065);
      c.quadraticCurveTo(-0.23, -0.042, -0.31, -0.002);
      c.strokeStyle = "rgba(205, 226, 248, 0.16)";
      c.lineWidth = 0.016;
      c.stroke();
    }
  );

  // Subtle dark smile line when mouth is closed (Image 2!)
  if (p.open === 0) {
    c.beginPath();
    c.moveTo(0.432, 0.045);
    c.quadraticCurveTo(0.372, 0.056, 0.32, 0.044);
    c.quadraticCurveTo(0.285, 0.044, hx, hy);
    c.strokeStyle = "rgba(18,24,34,0.85)";
    c.lineWidth = 0.0052;
    c.stroke();
  }

  // ---- 6. Broad muscular paddle pectoral flipper (Image 2!) ----
  c.save();
  c.translate(0.185, 0.078);
  c.rotate(-0.74 + p.wag2 * 0.07);
  fillStroke(
    c,
    () => {
      c.moveTo(0.024, -0.016);
      c.bezierCurveTo(-0.012, -0.046, -0.105, -0.036, -0.138, 0.006);
      c.bezierCurveTo(-0.145, 0.038, -0.072, 0.056, 0.02, 0.022);
    },
    lin(c, 0, -0.03, -0.12, 0.03, [
      [0, BLK_HI],
      [0.45, "#18202c"],
      [1, BLK],
    ]),
    OL,
    LW * 0.85,
    () => {
      glow(c, -0.055, -0.008, 0.045, 0.014, -0.08, "215,235,255", 0.22);
    }
  );
  c.restore();

  // ---- 7. Small sleek dark eye tucked cleanly below front tip of white eye patch ----
  const ex = 0.326;
  const ey = 0.022 - p.open * 0.004;
  const er = 0.0125;
  if (p.puff) glow(c, ex - 0.01, ey + 0.032, 0.02, 0.013, 0, "255,105,130", 0.3);
  if (p.expr === "happy") {
    c.beginPath();
    c.arc(ex, ey + 0.003, er * 0.8, Math.PI * 1.1, Math.PI * 1.9);
    c.strokeStyle = "#ffffff";
    c.lineWidth = 0.0042;
    c.stroke();
  } else {
    const rUse = p.expr === "panic" ? er * 1.25 : er;
    c.beginPath();
    c.arc(ex, ey, rUse, 0, TAU);
    c.fillStyle = "#0a0e16";
    c.fill();
    c.strokeStyle = "#030508";
    c.lineWidth = 0.003;
    c.stroke();
    c.beginPath();
    c.arc(ex + rUse * 0.18, ey - rUse * 0.18, rUse * 0.24, 0, TAU);
    c.fillStyle = "rgba(210,230,250,0.68)";
    c.fill();
  }
}

// =====================================================================================
// ROBERT — Feeding Frenzy Barracuda (matching Image 3 100%!):
// icy cyan-mint torpedo tapering to slim tail peduncle, bulky grumpy bulldog underbite jaw
// jutting ahead of upturned short nose tip, scowling olive-gold eye under heavy brow,
// faded teal back bars, irregular black flank blotches, & pale cream-olive fins & tail!
// =====================================================================================
function drawBarracuda(c: Ctx, _sp: Species, p: Pose) {
  const AQUA_T = "#6ab4c2";
  const AQUA = "#bcece6";
  const AQUA_B = "#eefdf6";
  const FIN_L = "#e2e6ba";
  const FIN_D = "#b4c086";
  const FIN_OL = "rgba(96, 114, 78, 0.65)";
  const OL = "rgba(38, 76, 86, 0.72)";
  const LW = 0.0068;
  c.translate(0.0, 0.012);

  // ---- 1. Pale cream-olive swept forked tail fin (Image 3!) ----
  c.save();
  c.translate(-0.33, 0.004);
  c.rotate(p.wag * 0.15);
  fillStroke(
    c,
    () => {
      c.moveTo(0.012, -0.02);
      c.quadraticCurveTo(-0.068, -0.095, -0.132, -0.168);
      c.quadraticCurveTo(-0.096, -0.068, -0.062, 0.004);
      c.quadraticCurveTo(-0.095, 0.072, -0.122, 0.155);
      c.quadraticCurveTo(-0.062, 0.088, 0.012, 0.022);
    },
    lin(c, 0, 0, -0.13, 0, [
      [0, FIN_D],
      [0.45, FIN_L],
      [1, "#eff2d8"],
    ]),
    FIN_OL,
    LW * 0.85,
    () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 9; i++) pts.push([-0.125, -0.135 + i * 0.034]);
      rayFan(c, 0.015, 0.002, pts, "rgba(130, 145, 96, 0.35)", 0.003);
    }
  );
  c.restore();

  // ---- 2. Dorsal, Rear Dorsal, Pelvic & Anal pale cream-olive fins (Image 3!) ----
  const sw = p.wag2 * 0.005;
  // Front pointed dorsal fin with slight rear notch
  fillStroke(
    c,
    () => {
      c.moveTo(0.078, -0.088);
      c.lineTo(0.012 + sw, -0.172);
      c.lineTo(0.018 + sw, -0.132);
      c.lineTo(0.008 + sw, -0.136);
      c.lineTo(0.004, -0.082);
    },
    lin(c, 0.04, -0.08, 0.02, -0.17, [
      [0, FIN_D],
      [1, FIN_L],
    ]),
    FIN_OL,
    LW * 0.78
  );
  // Small wispy rear dorsal fin
  fillStroke(
    c,
    () => {
      c.moveTo(-0.145, -0.056);
      c.quadraticCurveTo(-0.18, -0.105 + sw, -0.208 + sw, -0.116 + sw);
      c.quadraticCurveTo(-0.205, -0.072, -0.2, -0.044);
    },
    lin(c, -0.17, -0.05, -0.2, -0.11, [
      [0, FIN_D],
      [1, FIN_L],
    ]),
    FIN_OL,
    LW * 0.72
  );
  // Small pelvic fin on belly
  fillStroke(
    c,
    () => {
      c.moveTo(0.068, 0.095);
      c.lineTo(0.035 - sw, 0.134);
      c.lineTo(0.025, 0.092);
    },
    FIN_L,
    FIN_OL,
    LW * 0.7
  );
  // Rear anal fin
  fillStroke(
    c,
    () => {
      c.moveTo(-0.148, 0.052);
      c.quadraticCurveTo(-0.18, 0.102 - sw, -0.205 - sw, 0.115 - sw);
      c.quadraticCurveTo(-0.202, 0.072, -0.198, 0.038);
    },
    lin(c, -0.17, 0.045, -0.2, 0.11, [
      [0, FIN_D],
      [1, FIN_L],
    ]),
    FIN_OL,
    LW * 0.72
  );

  // ---- 3. Grumpy Underbite Jaw Geometry & Rotation ----
  const hx = 0.258;
  const hy = 0.048;
  const jawAng = p.open * 0.52;
  const cosJ = Math.cos(jawAng);
  const sinJ = Math.sin(jawAng);
  const rotJ = (px: number, py: number): [number, number] => [
    hx + (px - hx) * cosJ - (py - hy) * sinJ,
    hy + (px - hx) * sinJ + (py - hy) * cosJ,
  ];
  const ux = 0.404;
  const uy = -0.032 - p.open * 0.025;
  const [tipX, tipY] = rotJ(0.436, -0.042);
  const [chinFrontX, chinFrontY] = rotJ(0.434, 0.028);
  const [chinBotX, chinBotY] = rotJ(0.362, 0.116);

  const body = () => {
    c.moveTo(-0.33, -0.022);
    // Slim tail waist rising cleanly to bulky muscular chest & humped forehead (Image 3!)
    c.bezierCurveTo(-0.23, -0.048, -0.1, -0.088, 0.06, -0.102);
    c.bezierCurveTo(0.165, -0.11, 0.235, -0.105, 0.278, -0.095);
    // Concave nasal bridge dipping down to tiny upturned nose hook above upper lip
    c.quadraticCurveTo(0.338, -0.058, 0.376, -0.046 - p.open * 0.02);
    c.lineTo(0.388, -0.054 - p.open * 0.022);
    c.lineTo(0.394, -0.04 - p.open * 0.024);
    c.lineTo(ux, uy);
    if (p.open > 0) {
      c.quadraticCurveTo(0.332, (uy + hy) * 0.5 + 0.015, hx, hy);
      c.quadraticCurveTo((hx + tipX) * 0.5 + 0.015, (hy + tipY) * 0.5 + 0.015, tipX, tipY);
      c.bezierCurveTo(chinFrontX, chinFrontY, chinBotX, chinBotY, 0.228, 0.125 + p.open * 0.018);
    } else {
      // Iconic proud jutting bulldog underbite chin protruding AHEAD of upper nose (Image 3!)
      c.quadraticCurveTo(0.422, -0.036, 0.436, -0.042);
      c.bezierCurveTo(0.452, -0.022, 0.448, 0.052, 0.398, 0.098);
      c.bezierCurveTo(0.348, 0.132, 0.278, 0.132 + (p.puff ? 0.01 : 0), 0.228, 0.124);
    }
    // Deep muscular chest tapering cleanly down to slender tail stem
    c.bezierCurveTo(0.11, 0.12, -0.04, 0.088, -0.175, 0.052);
    c.quadraticCurveTo(-0.265, 0.03, -0.33, 0.022);
  };

  // Open mouth cavity + sharp white fangs when biting
  if (p.open > 0) {
    c.beginPath();
    c.moveTo(hx - 0.015, hy);
    c.quadraticCurveTo(0.332, (uy + hy) * 0.5 + 0.015, ux - 0.008, uy + 0.004);
    c.quadraticCurveTo((ux + tipX) * 0.5 - 0.015, (uy + tipY) * 0.5, tipX - 0.01, tipY + 0.006);
    c.quadraticCurveTo((hx + tipX) * 0.5 + 0.015, (hy + tipY) * 0.5 + 0.015, hx - 0.015, hy + 0.01);
    c.closePath();
    c.fillStyle = "#5c1424";
    c.fill();
    c.save();
    c.clip();
    c.beginPath();
    c.ellipse((hx + tipX) * 0.5, (hy + tipY) * 0.56, 0.055, 0.022 + p.open * 0.015, 0.22, 0, TAU);
    c.fillStyle = "#e06884";
    c.fill();
    const fl = 0.018 * Math.min(1, p.open * 1.4);
    teethRow(c, hx, hy, ux - 0.006, uy + 0.004, 6, 0.25, 0.96, (t) => fl * (0.65 + t * 0.55), 0.16, 0.96);
    teethRow(c, hx, hy, tipX - 0.008, tipY + 0.006, 6, -0.18, -0.98, (t) => fl * (0.7 + t * 0.6), 0.16, 0.96);
    c.restore();
  }

  fillStroke(
    c,
    body,
    lin(c, 0, -0.11, 0, 0.13, [
      [0, AQUA_T],
      [0.24, "#92d8dc"],
      [0.54, AQUA],
      [0.86, AQUA_B],
      [1, "#c8ece4"],
    ]),
    OL,
    LW,
    () => {
      // Soft faded teal-slate vertical saddle bars along upper back only (exact Image 3!)
      for (let i = 0; i < 8; i++) {
        const bx = 0.14 - i * 0.052;
        const bw = 0.018 + (i % 2) * 0.006;
        c.beginPath();
        c.ellipse(bx, -0.075 + i * 0.004, bw * 0.65, 0.052 - i * 0.002, 0.15, 0, TAU);
        c.fillStyle = "rgba(72, 134, 146, 0.34)";
        c.fill();
      }

      // Soft sculpted cheek & jaw volume highlight (Image 3!)
      glow(c, 0.33, 0.04, 0.095, 0.055, 0.2, "255,255,255", 0.42);
      glow(c, 0.02, 0.01, 0.24, 0.058, 0.0, "255,255,255", 0.38);

      // Irregular clusters of dark charcoal-black flank & tail blotches (exact Image 3!)
      const spots: [number, number, number, number, number][] = [
        [0.065, -0.028, 0.008, 0.014, 0.05],
        [0.042, 0.002, 0.007, 0.009, 0.1],
        [0.012, -0.022, 0.009, 0.016, -0.05],
        [-0.015, 0.008, 0.006, 0.008, 0.0],
        [-0.048, -0.014, 0.01, 0.02, 0.04],
        [-0.068, -0.034, 0.007, 0.01, 0.0],
        [-0.088, -0.008, 0.009, 0.018, -0.05],
        [-0.108, -0.032, 0.008, 0.011, 0.08],
        [-0.125, -0.006, 0.008, 0.014, 0.02],
        [-0.155, -0.012, 0.009, 0.016, -0.04],
        [-0.178, 0.006, 0.006, 0.009, 0.0],
        [-0.205, -0.014, 0.007, 0.012, 0.06],
        [-0.232, -0.004, 0.007, 0.01, 0.0],
        [-0.262, -0.01, 0.006, 0.009, 0.0],
        [-0.292, -0.004, 0.006, 0.008, 0.0],
      ];
      c.fillStyle = "rgba(18, 28, 34, 0.88)";
      for (const [sx, sy, rx, ry, rot] of spots) {
        blob(c, sx, sy, rx, ry, rot);
      }

      // Subtle sculpted cheek & operculum crease
      c.beginPath();
      c.moveTo(0.222, -0.015);
      c.bezierCurveTo(0.195, 0.03, 0.205, 0.085, 0.242, 0.118);
      c.strokeStyle = "rgba(65, 118, 128, 0.42)";
      c.lineWidth = 0.007;
      c.stroke();

      // Subtle belly bottom AO shadow
      c.fillStyle = lin(c, 0, 0.06, 0, 0.14, [
        [0, "rgba(42,88,96,0)"],
        [1, "rgba(42,88,96,0.28)"],
      ]);
      c.fillRect(-0.35, 0.04, 0.85, 0.12);
    }
  );

  // ---- 4. Grumpy frowning lip crease & heavy jaw fold when mouth is closed (Image 3!) ----
  if (p.open === 0) {
    c.beginPath();
    c.moveTo(0.43, -0.032);
    c.bezierCurveTo(0.395, -0.012, 0.345, -0.008, 0.295, 0.052);
    c.quadraticCurveTo(0.278, 0.078, 0.272, 0.095);
    c.strokeStyle = "rgba(42, 82, 92, 0.82)";
    c.lineWidth = 0.0068;
    c.stroke();
    // Highlight ridge just under lower lip curl
    c.beginPath();
    c.moveTo(0.426, -0.024);
    c.bezierCurveTo(0.39, -0.004, 0.348, -0.002, 0.3, 0.052);
    c.strokeStyle = "rgba(255, 255, 255, 0.65)";
    c.lineWidth = 0.0042;
    c.stroke();
  }

  // ---- 5. Small translucent pale pectoral fin tucked behind cheek ----
  c.save();
  c.translate(0.188, 0.042);
  c.rotate(0.28 + p.wag2 * 0.14);
  fillStroke(
    c,
    () => {
      c.moveTo(0, -0.012);
      c.quadraticCurveTo(-0.045, -0.028, -0.072, -0.018);
      c.quadraticCurveTo(-0.052, 0.022, 0, 0.016);
    },
    rgba(FIN_L, 0.72),
    FIN_OL,
    LW * 0.65
  );
  c.restore();

  // ---- 6. Heavy scowling brow & fierce olive-gold eye (Image 3!) ----
  const ex = 0.272;
  const ey = -0.044 - p.open * 0.004;
  const er = 0.03;
  // Cheek bag wrinkle right below the scowling eye
  c.beginPath();
  c.arc(ex, ey, er * 1.15, Math.PI * 0.12, Math.PI * 0.88);
  c.strokeStyle = "rgba(65, 118, 128, 0.55)";
  c.lineWidth = 0.0048;
  c.stroke();

  eye(c, ex, ey, er, {
    iris: "#a6b22c",
    expr: p.expr,
    ol: OL,
    sx: 0.94,
    look: 0.24,
    irisR: 0.58,
    pupilR: 0.34,
    lid: p.expr === "panic" ? 0 : 0.42,
    lidTilt: 0.34,
    lidCol: "#78bec8",
    lidEdge: OL,
  });

  // Heavy overhanging brow ridge scowling forward
  c.beginPath();
  c.moveTo(ex - 0.036, ey - 0.028);
  c.quadraticCurveTo(ex, ey - 0.018, ex + 0.032, ey - 0.002);
  c.strokeStyle = "rgba(44, 92, 102, 0.85)";
  c.lineWidth = 0.0065;
  c.stroke();
}

// =====================================================================================
// KILAT (SAILFISH / MARLIN) — High-contrast Gambar 1 Blue Marlin:
//   deep midnight-cobalt dorsal with cyan highlights, vibrant golden-amber lateral band,
//   crisp pearly-white belly, electric-cyan vertical bars, tall arched sail dorsal fin,
//   razor sword bill, hinged crimson mouth, twin sleek ventral fins, crescent tail,
//   and a bright expressive Nemo-style glossy warm-brown eye!
// =====================================================================================
function drawSailfish(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const DK = "#081c54",
    MID = "#154fb8",
    BLU = "#247ee6",
    CYAN = "#38c0ff",
    CYL = "#90e8ff";
  const GOLD = "#ffaa08",
    YEL = "#ffe44d",
    ORG = "#e56a00";
  const WH = "#ffffff",
    BEL_SH = "#c4d9f0";
  const OL = rgba(pal.outline || "#071638", 0.94);
  const LW = 0.0074;
  const s = p.wag,
    s2 = p.wag2;

  // ---- 1. Back layers: small rear finlets, anal fin, twin rear ventral fin ----
  // Rear small dorsal finlet
  fillStroke(
    c,
    () => {
      c.moveTo(-0.258, -0.036);
      c.quadraticCurveTo(-0.278, -0.072, -0.304, -0.064);
      c.quadraticCurveTo(-0.29, -0.038, -0.292, -0.025);
    },
    lin(c, -0.28, -0.072, -0.28, -0.025, [
      [0, DK],
      [1, MID],
    ]),
    OL,
    LW * 0.72
  );

  // Rear small anal finlet
  fillStroke(
    c,
    () => {
      c.moveTo(-0.252, 0.034);
      c.quadraticCurveTo(-0.274, 0.066, -0.296, 0.056);
      c.quadraticCurveTo(-0.286, 0.036, -0.288, 0.024);
    },
    lin(c, -0.27, 0.024, -0.27, 0.065, [
      [0, MID],
      [1, DK],
    ]),
    OL,
    LW * 0.72
  );

  // Main rear anal fin
  fillStroke(
    c,
    () => {
      c.moveTo(-0.135, 0.058);
      c.bezierCurveTo(-0.17, 0.092, -0.215, 0.138, -0.236, 0.152 + s2 * 0.01);
      c.bezierCurveTo(-0.222, 0.112, -0.218, 0.076, -0.222, 0.044);
    },
    lin(c, -0.17, 0.05, -0.22, 0.15, [
      [0, BLU],
      [0.45, MID],
      [1, DK],
    ]),
    OL,
    LW * 0.85,
    () => {
      rayFan(
        c,
        -0.155,
        0.056,
        [
          [-0.232, 0.146],
          [-0.218, 0.115],
          [-0.215, 0.085],
        ],
        "rgba(8,22,68,0.5)",
        0.0028
      );
    }
  );

  // Back twin pelvic/ventral blade (shorter rear blade)
  fillStroke(
    c,
    () => {
      c.moveTo(0.116, 0.09);
      c.bezierCurveTo(0.085, 0.145, 0.045, 0.195, -0.015, 0.226 + s2 * 0.01);
      c.bezierCurveTo(0.032, 0.18, 0.07, 0.135, 0.095, 0.092);
    },
    lin(c, 0.1, 0.09, 0.0, 0.22, [
      [0, MID],
      [1, DK],
    ]),
    OL,
    LW * 0.8
  );

  // ---- 2. Tall Sweeping Sail Dorsal Fin (iconic silhouette from Gambar 1!) ----
  const dPeakX = 0.032 + s2 * 0.012;
  const dPeakY = -0.268;
  fillStroke(
    c,
    () => {
      c.moveTo(0.165, -0.098);
      c.bezierCurveTo(0.135, -0.178, 0.085, -0.238, dPeakX, dPeakY);
      // Graceful scalloped descending ridge back to the lower dorsal base
      c.bezierCurveTo(0.036, -0.215, 0.018, -0.188, -0.015, -0.182 + s2 * 0.005);
      c.quadraticCurveTo(-0.042, -0.16, -0.068, -0.154 + s2 * 0.006);
      c.quadraticCurveTo(-0.098, -0.136, -0.125, -0.128 + s2 * 0.006);
      c.quadraticCurveTo(-0.155, -0.108, -0.182, -0.096 + s2 * 0.005);
      c.quadraticCurveTo(-0.214, -0.074, -0.246, -0.056);
      c.quadraticCurveTo(-0.04, -0.088, 0.165, -0.098);
    },
    lin(c, 0.03, dPeakY, 0.0, -0.075, [
      [0, "#0b1a52"],
      [0.36, "#1846a8"],
      [0.75, "#2672d8"],
      [1, "#44a6ff"],
    ]),
    OL,
    LW * 0.92,
    () => {
      // Dark indigo upper crest band & crisp fin-spine rays
      c.fillStyle = "rgba(10, 18, 62, 0.42)";
      c.beginPath();
      c.moveTo(0.165, -0.098);
      c.bezierCurveTo(0.135, -0.178, 0.085, -0.238, dPeakX, dPeakY);
      c.lineTo(-0.246, -0.056);
      c.lineTo(0.06, -0.175);
      c.closePath();
      c.fill();

      c.strokeStyle = "rgba(10, 22, 70, 0.55)";
      c.lineWidth = 0.0032;
      const rays: [number, number, number, number][] = [
        [0.12, -0.098, 0.045, -0.245],
        [0.085, -0.1, 0.024, -0.22],
        [0.05, -0.1, -0.012, -0.18],
        [0.015, -0.096, -0.056, -0.155],
        [-0.025, -0.09, -0.105, -0.132],
        [-0.07, -0.082, -0.158, -0.104],
        [-0.12, -0.072, -0.208, -0.078],
      ];
      c.beginPath();
      for (const [x0, y0, x1, y1] of rays) {
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
      }
      c.stroke();

      // Subtle icy-cyan highlight veins on tall front sail
      c.strokeStyle = "rgba(130, 215, 255, 0.35)";
      c.lineWidth = 0.0024;
      c.beginPath();
      c.moveTo(0.135, -0.105);
      c.quadraticCurveTo(0.095, -0.185, dPeakX + 0.008, dPeakY + 0.022);
      c.moveTo(0.095, -0.102);
      c.quadraticCurveTo(0.06, -0.165, 0.026, -0.215);
      c.stroke();
    }
  );

  // ---- 3. Sleek Crescent Forked Caudal Tail ----
  const tx = -0.34,
    tw = s * 0.032;
  fillStroke(
    c,
    () => {
      c.moveTo(tx + 0.01, -0.016);
      c.bezierCurveTo(-0.375, -0.068, -0.425, -0.138, -0.474, -0.176 + tw);
      c.bezierCurveTo(-0.436, -0.108, -0.408, -0.045, -0.398, tw * 0.3);
      c.bezierCurveTo(-0.41, 0.055, -0.436, 0.118, -0.468, 0.184 + tw);
      c.bezierCurveTo(-0.422, 0.14, -0.376, 0.072, tx + 0.01, 0.018);
    },
    lin(c, -0.34, 0, -0.47, 0, [
      [0, MID],
      [0.45, DK],
      [1, "#07143e"],
    ]),
    OL,
    LW * 0.9,
    () => {
      // Bright cobalt inner tail edge + crisp rays
      c.strokeStyle = "rgba(105, 195, 255, 0.42)";
      c.lineWidth = 0.0034;
      c.beginPath();
      c.moveTo(-0.36, -0.022);
      c.quadraticCurveTo(-0.41, -0.09, -0.464, -0.16 + tw);
      c.moveTo(-0.36, 0.022);
      c.quadraticCurveTo(-0.41, 0.09, -0.458, 0.168 + tw);
      c.stroke();

      rayFan(
        c,
        -0.345,
        0,
        [
          [-0.452, -0.138 + tw],
          [-0.432, -0.088 + tw],
          [-0.406, -0.035 + tw * 0.4],
          [-0.408, 0.042 + tw * 0.4],
          [-0.432, 0.098 + tw],
          [-0.45, 0.146 + tw],
        ],
        "rgba(9, 24, 72, 0.55)",
        0.0028
      );
    }
  );

  // ---- 4. Articulated Mouth Interior & Hinged Lower Jaw (under upper sword bill) ----
  const hx = 0.222,
    hy = 0.022;
  const jawTipX = 0.344 - p.open * 0.014;
  const jawTipY = 0.012 + p.open * 0.068;

  if (p.open > 0.02) {
    // Deep crimson oral cavity cleanly tucked between upper palate & lower jaw
    const palTipX = 0.34 - p.open * 0.004;
    const palTipY = 0.007;
    c.beginPath();
    c.moveTo(0.214, 0.016);
    c.lineTo(palTipX, palTipY);
    c.quadraticCurveTo(0.295, 0.02 + p.open * 0.02, jawTipX, jawTipY);
    c.quadraticCurveTo(0.268, 0.044 + p.open * 0.01, hx, hy);
    c.closePath();
    c.fillStyle = lin(c, 0.21, 0.01, 0.34, 0.06, [
      [0, "#460914"],
      [0.55, "#861628"],
      [1, "#b42c42"],
    ]);
    c.fill();

    // Soft curved coral-pink tongue inside lower jaw
    c.beginPath();
    c.moveTo(0.238, 0.032 + p.open * 0.014);
    c.quadraticCurveTo(0.284, 0.024 + p.open * 0.032, 0.318, 0.028 + p.open * 0.048);
    c.quadraticCurveTo(0.278, 0.044 + p.open * 0.04, 0.238, 0.038 + p.open * 0.018);
    c.closePath();
    c.fillStyle = "#e45e72";
    c.fill();
  }

  // ---- 5. Main Streamlined Marlin Body + Sword Bill + Integrated Lower Jaw ----
  fillStroke(
    c,
    () => {
      // Tail peduncle top forward up along sleek arched cobalt back
      c.moveTo(-0.342, -0.018);
      c.bezierCurveTo(-0.24, -0.056, -0.08, -0.104, 0.075, -0.104);
      // Forehead sweep cleanly onto razor-sharp upper sword bill tip
      c.bezierCurveTo(0.155, -0.104, 0.218, -0.072, 0.285, -0.042);
      c.quadraticCurveTo(0.385, -0.022, 0.486, -0.008);
      // Underside of bill cleanly to mouth corner / sleek protruding lower jaw (NO sad gap!)
      if (p.open > 0.02) {
        c.quadraticCurveTo(0.382, -0.001, 0.285, 0.008);
        c.quadraticCurveTo(0.242, 0.014, hx, hy);
        c.lineTo(jawTipX, jawTipY);
        c.quadraticCurveTo(0.285, 0.056 + p.open * 0.034, 0.195, 0.082 + p.open * 0.014);
      } else {
        c.quadraticCurveTo(0.382, -0.001, 0.344, 0.009);
        c.quadraticCurveTo(0.352, 0.014, 0.34, 0.022);
        c.quadraticCurveTo(0.282, 0.054, 0.195, 0.082);
      }
      // Graceful curved pearly-white belly tapering cleanly to tail peduncle
      c.bezierCurveTo(0.085, 0.106, -0.075, 0.094, -0.342, 0.018);
    },
    WH,
    OL,
    LW,
    () => {
      // A) Cool pearly belly contour shading at bottom edge
      c.fillStyle = lin(c, 0, 0.02, 0, 0.115, [
        [0, WH],
        [0.62, "#f0f7ff"],
        [1, BEL_SH],
      ]);
      c.fillRect(-0.36, 0.01, 0.86, 0.13);

      // B) Vibrant Golden-Amber-Orange Mid-Flank Band (from behind cheek to tail!)
      c.fillStyle = lin(c, 0, -0.038, 0, 0.065, [
        [0, "rgba(255, 228, 77, 0)"],
        [0.24, YEL],
        [0.54, GOLD],
        [0.78, ORG],
        [1, "rgba(255, 190, 60, 0)"],
      ]);
      c.beginPath();
      c.moveTo(-0.35, -0.012);
      c.bezierCurveTo(-0.15, -0.036, 0.08, -0.048, 0.258, -0.032);
      c.lineTo(0.258, 0.056);
      c.bezierCurveTo(0.06, 0.066, -0.15, 0.044, -0.35, 0.016);
      c.closePath();
      c.fill();

      // C) Deep Midnight-Navy to Royal-Cobalt Dorsal Coat + Sword Top Bevel
      c.fillStyle = lin(c, 0, -0.115, 0, 0.012, [
        [0, DK],
        [0.42, MID],
        [0.78, BLU],
        [1, "rgba(36, 126, 230, 0)"],
      ]);
      c.beginPath();
      c.moveTo(-0.35, -0.026);
      c.bezierCurveTo(-0.2, -0.075, 0.0, -0.12, 0.22, -0.112);
      c.lineTo(0.495, -0.012);
      c.lineTo(0.495, -0.002);
      c.bezierCurveTo(0.32, -0.012, 0.15, -0.012, -0.02, -0.014);
      c.bezierCurveTo(-0.16, -0.014, -0.26, -0.006, -0.35, -0.002);
      c.closePath();
      c.fill();

      // D) Warm golden-cream underside along the sharp sword bill
      c.fillStyle = lin(c, 0.28, -0.004, 0.48, -0.004, [
        [0, "#ffd892"],
        [1, "#fff6dd"],
      ]);
      c.beginPath();
      c.moveTo(0.25, 0.002);
      c.lineTo(0.488, -0.008);
      c.lineTo(0.28, 0.016);
      c.closePath();
      c.fill();

      // E) Electric Sky-Cyan Vertical Marlin Stripes descending down the dorsal & gold band!
      const stripeXs = [0.135, 0.095, 0.054, 0.012, -0.03, -0.072, -0.114, -0.156, -0.196, -0.236, -0.274, -0.31];
      for (let i = 0; i < stripeXs.length; i++) {
        const sx = stripeXs[i];
        const w = 0.012 - i * 0.00055;
        const botY = 0.032 - i * 0.0018;
        c.fillStyle = lin(c, sx, -0.095, sx, botY, [
          [0, CYL],
          [0.45, CYAN],
          [0.85, "rgba(56, 192, 255, 0.65)"],
          [1, "rgba(56, 192, 255, 0)"],
        ]);
        c.beginPath();
        c.moveTo(sx - w * 0.45, -0.11);
        c.quadraticCurveTo(sx + 0.006, -0.04, sx - w * 0.35, botY);
        c.lineTo(sx + w * 0.65, botY);
        c.quadraticCurveTo(sx + w + 0.006, -0.04, sx + w * 0.75, -0.11);
        c.closePath();
        c.fill();
      }

      // F) Sleek Bright Aqua Dorsal Specular Highlight Streak along the upper shoulder
      c.strokeStyle = "rgba(165, 238, 255, 0.78)";
      c.lineWidth = 0.0085;
      c.beginPath();
      c.moveTo(-0.26, -0.038);
      c.bezierCurveTo(-0.1, -0.076, 0.06, -0.088, 0.215, -0.064);
      c.stroke();

      // Subtle glossy highlight ridge along top of the sword bill
      c.strokeStyle = "rgba(180, 240, 255, 0.7)";
      c.lineWidth = 0.0038;
      c.beginPath();
      c.moveTo(0.24, -0.056);
      c.quadraticCurveTo(0.35, -0.025, 0.47, -0.01);
      c.stroke();

      // G) Curved Gill Plate (Operculum) & Lower Cheek Arcs (matching Gambar 1!)
      c.strokeStyle = "rgba(32, 66, 118, 0.72)";
      c.lineWidth = 0.0044;
      c.beginPath();
      c.moveTo(0.175, -0.042);
      c.bezierCurveTo(0.145, 0.005, 0.155, 0.062, 0.21, 0.086);
      c.moveTo(0.194, -0.024);
      c.bezierCurveTo(0.172, 0.012, 0.18, 0.056, 0.222, 0.076);
      c.stroke();

      // Fine radiating gill-cover creases on silver-white cheek
      c.strokeStyle = "rgba(75, 112, 155, 0.45)";
      c.lineWidth = 0.0026;
      c.beginPath();
      c.moveTo(0.172, 0.045);
      c.quadraticCurveTo(0.195, 0.058, 0.224, 0.062);
      c.moveTo(0.178, 0.058);
      c.quadraticCurveTo(0.198, 0.068, 0.222, 0.072);
      c.stroke();
    }
  );

  // Confident, sleek marlin mouth line with gentle upward corner (no sad droop!)
  if (p.open <= 0.02) {
    c.beginPath();
    c.moveTo(0.342, 0.011);
    c.quadraticCurveTo(0.282, 0.02, 0.226, 0.016);
    c.quadraticCurveTo(0.22, 0.014, 0.216, 0.01);
    c.strokeStyle = OL;
    c.lineWidth = LW * 0.78;
    c.stroke();
  }

  // ---- 6. Front Long Sleek Pelvic/Ventral Fin (cobalt blue + icy white accent stripe) ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.128, 0.088);
      c.bezierCurveTo(0.106, 0.158, 0.078, 0.214, 0.036, 0.252 + s2 * 0.012);
      c.bezierCurveTo(0.068, 0.2, 0.095, 0.142, 0.108, 0.092);
    },
    lin(c, 0.12, 0.09, 0.04, 0.25, [
      [0, MID],
      [0.6, DK],
      [1, "#07143e"],
    ]),
    OL,
    LW * 0.85,
    () => {
      c.strokeStyle = "rgba(215, 240, 255, 0.78)";
      c.lineWidth = 0.0042;
      c.beginPath();
      c.moveTo(0.118, 0.096);
      c.quadraticCurveTo(0.095, 0.152, 0.064, 0.205);
      c.stroke();
    }
  );

  // ---- 7. Sleek Swept Pectoral Fin across flank ----
  c.save();
  c.translate(0.14, 0.034);
  c.rotate(-0.08 + s2 * 0.1);
  fillStroke(
    c,
    () => {
      c.moveTo(0.0, -0.014);
      c.bezierCurveTo(-0.055, -0.022, -0.135, -0.002, -0.195, 0.024);
      c.bezierCurveTo(-0.132, 0.036, -0.058, 0.044, -0.002, 0.018);
    },
    lin(c, 0.0, -0.015, -0.18, 0.025, [
      [0, BLU],
      [0.5, MID],
      [1, DK],
    ]),
    OL,
    LW * 0.86,
    () => {
      // Crisp bright cyan-ice highlight along upper leading edge of pectoral fin
      c.strokeStyle = "rgba(130, 222, 255, 0.65)";
      c.lineWidth = 0.004;
      c.beginPath();
      c.moveTo(-0.006, -0.01);
      c.bezierCurveTo(-0.058, -0.016, -0.128, 0.0, -0.182, 0.022);
      c.stroke();

      rayFan(
        c,
        0.0,
        0.002,
        [
          [-0.165, 0.018],
          [-0.135, 0.025],
          [-0.1, 0.028],
        ],
        "rgba(8, 22, 68, 0.55)",
        0.0026
      );
    }
  );
  c.restore();

  // ---- 8. Expressive Glossy NEMO-Style Eye (friendly, bright, warm brown iris!) ----
  const ex = 0.24,
    ey = -0.02 - p.open * 0.003,
    er = 0.038;
  // Subtle clean orbital crease below & above eye
  c.beginPath();
  c.arc(ex, ey, er * 1.15, Math.PI * 0.12, Math.PI * 0.78);
  c.strokeStyle = "rgba(38, 72, 128, 0.45)";
  c.lineWidth = 0.004;
  c.stroke();

  eye(c, ex, ey, er, {
    iris: "#7a3b12",
    expr: p.expr,
    ol: rgba("#071638", 0.92),
    sx: 0.94,
    look: 0.28,
    irisR: 0.56,
    pupilR: 0.36,
    happyCol: "#ffffff",
  });

  // Clean bright cobalt brow highlight arc above eye (sleek, NOT angry!)
  c.beginPath();
  c.moveTo(ex - 0.036, ey - 0.034);
  c.quadraticCurveTo(ex, ey - 0.048, ex + 0.036, ey - 0.026);
  c.strokeStyle = "rgba(110, 210, 255, 0.65)";
  c.lineWidth = 0.0038;
  c.stroke();
}

// =====================================================================================
// EDDY — Deep-sea Anglerfish 100% inspired by Gambar 1 silhouette, slanted underbite jaw,
// gracefully curved ivory crescent tusks, animated flared gill fin, cool downward-sloped
// 1-eye side-view eyelid, and glowing ELECTRIC NEON-BLUE bioluminescent esca lure!
// =====================================================================================
function drawEddy(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const HI = "#b8ea3a",
    BODY = pal.body || "#8cc828",
    DARK = pal.dark || "#548a16",
    DEEP = "#2d5209";
  const OL = rgba(pal.outline || "#132b05", 0.94);
  const LURE = pal.lure || "#1ce8ff";
  const LW = 0.0082;
  const s = p.wag,
    s2 = p.wag2;

  // Helper: draw a slender, gracefully curved ivory crescent tusk
  // outSign = 1 for upward lower tusks (+x bow), -1 for downward upper tusks (+x bow)
  const curvedTusk = (
    bx: number,
    by: number,
    tx: number,
    ty: number,
    bow: number,
    hw: number,
    outSign = 1,
    tone: "ivory" | "inner" = "ivory"
  ) => {
    const dx = tx - bx,
      dy = ty - by;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (outSign * -dy) / len,
      ny = (outSign * dx) / len;
    const outCtrlX = bx + dx * 0.45 + nx * (bow * 1.4 + hw * 0.46);
    const outCtrlY = by + dy * 0.45 + ny * (bow * 1.4 + hw * 0.46);
    const inCtrlX = bx + dx * 0.56 + nx * (bow * 0.56 - hw * 0.4);
    const inCtrlY = by + dy * 0.56 + ny * (bow * 0.56 - hw * 0.4);

    fillStroke(
      c,
      () => {
        c.moveTo(bx + nx * hw, by + ny * hw);
        c.quadraticCurveTo(outCtrlX, outCtrlY, tx, ty);
        c.quadraticCurveTo(inCtrlX, inCtrlY, bx - nx * hw, by - ny * hw);
        c.quadraticCurveTo(bx, by + outSign * hw * 0.42, bx + nx * hw, by + ny * hw);
      },
      tone === "inner"
        ? lin(c, bx, by, tx, ty, [
            [0, "#756d49"],
            [0.5, "#b8ae82"],
            [1, "#e2dac0"],
          ])
        : lin(c, bx, by, tx, ty, [
            [0, "#a89d6c"],
            [0.38, "#ebe2b8"],
            [0.82, "#fffdf2"],
            [1, "#ffffff"],
          ]),
      OL,
      LW * 0.58,
      tone === "ivory"
        ? () => {
            c.strokeStyle = "rgba(255, 255, 255, 0.72)";
            c.lineWidth = hw * 0.32;
            c.beginPath();
            c.moveTo(bx + nx * hw * 0.34, by + ny * hw * 0.34);
            c.quadraticCurveTo(
              bx + dx * 0.48 + nx * (bow * 1.15),
              by + dy * 0.48 + ny * (bow * 1.15),
              tx - dx * 0.08,
              ty - dy * 0.08
            );
            c.stroke();
          }
        : undefined
    );
  };

  // ---- 1. Ragged-edged webbed caudal tail fan (khas Gambar 2!) ----
  c.save();
  c.translate(-0.278, 0.028);
  c.rotate(s * 0.28);
  fillStroke(
    c,
    () => {
      c.moveTo(0.015, -0.018);
      c.bezierCurveTo(-0.045, -0.068, -0.105, -0.098, -0.156, -0.112);
      c.lineTo(-0.128, -0.056);
      c.lineTo(-0.165, -0.022);
      c.lineTo(-0.132, 0.014);
      c.lineTo(-0.156, 0.062);
      c.lineTo(-0.122, 0.072);
      c.lineTo(-0.136, 0.116);
      c.bezierCurveTo(-0.082, 0.098, -0.032, 0.062, 0.015, 0.022);
    },
    lin(c, 0, 0, -0.155, 0, [
      [0, BODY],
      [0.58, DARK],
      [1, DEEP],
    ]),
    OL,
    LW * 0.85,
    () => {
      c.fillStyle = "rgba(38, 72, 10, 0.42)";
      blob(c, -0.09, -0.032, 0.016, 0.01, -0.2);
      blob(c, -0.105, 0.028, 0.018, 0.011, 0.2);
      rayFan(
        c,
        0.01,
        0,
        [
          [-0.142, -0.098],
          [-0.152, -0.022],
          [-0.145, 0.055],
          [-0.128, 0.104],
        ],
        rgba(OL, 0.5),
        0.0036
      );
    }
  );
  c.restore();

  // ---- 2. Serrated jagged dorsal crest along arched back (khas Gambar 2!) ----
  const dorsalSpines: [number, number, number, number, number, number][] = [
    [-0.01, -0.148, -0.04, -0.208, -0.068, -0.138],
    [-0.06, -0.14, -0.096, -0.188, -0.126, -0.114],
    [-0.118, -0.116, -0.156, -0.154, -0.18, -0.084],
    [-0.174, -0.088, -0.208, -0.116, -0.232, -0.048],
  ];
  for (const [x0, y0, tx, ty, x1, y1] of dorsalSpines) {
    fillStroke(
      c,
      () => {
        c.moveTo(x0, y0 + 0.018);
        c.lineTo(tx, ty + s2 * 0.01);
        c.lineTo((tx + x1) * 0.5, ty + 0.016 + s2 * 0.007);
        c.lineTo(tx - 0.022, ty + 0.014 + s2 * 0.007);
        c.lineTo(x1, y1 + 0.018);
      },
      lin(c, x0, ty, x0, y0, [
        [0, DARK],
        [1, BODY],
      ]),
      OL,
      LW * 0.72
    );
  }

  // ---- 3. Ragged small pelvic fin under curved belly (Gambar 2) ----
  c.save();
  c.translate(-0.005, 0.152);
  c.rotate(s2 * 0.16);
  fillStroke(
    c,
    () => {
      c.moveTo(-0.022, -0.008);
      c.lineTo(-0.068, 0.092);
      c.lineTo(-0.042, 0.076);
      c.lineTo(-0.036, 0.114);
      c.lineTo(-0.016, 0.08);
      c.lineTo(0.006, 0.102);
      c.lineTo(0.026, -0.004);
    },
    lin(c, -0.02, -0.01, -0.036, 0.11, [
      [0, BODY],
      [1, DARK],
    ]),
    OL,
    LW * 0.75,
    () => {
      rayFan(
        c,
        0,
        0,
        [
          [-0.062, 0.082],
          [-0.032, 0.104],
          [0, 0.092],
        ],
        rgba(OL, 0.45),
        0.003
      );
    }
  );
  c.restore();

  // ---- 4. Tall Bioluminescent Esca Stalk & Glowing ELECTRIC NEON-BLUE Bulb ----
  const lx = 0.365,
    ly = -0.202 + s2 * 0.02;
  glow(c, lx, ly, 0.16, 0.16, 0, "20, 210, 255", 0.85);
  glow(c, lx, ly, 0.08, 0.08, 0, "185, 248, 255", 0.96);

  // Smooth arched stalk springing cleanly from upper brow (strictly side-view, NO second eye!)
  c.beginPath();
  c.moveTo(0.088, -0.145);
  c.bezierCurveTo(0.088, -0.355, 0.325, -0.422, lx, ly - 0.038);
  c.strokeStyle = OL;
  c.lineWidth = 0.028;
  c.stroke();
  c.strokeStyle = lin(c, 0.088, -0.145, lx, ly, [
    [0, DARK],
    [0.52, BODY],
    [0.82, "#32c6b8"],
    [1, "#5ceeff"],
  ]);
  c.lineWidth = 0.014;
  c.stroke();

  // Glowing electric neon-blue teardrop lure bulb
  fillStroke(
    c,
    () => {
      c.moveTo(lx, ly - 0.044);
      c.bezierCurveTo(lx + 0.036, ly - 0.025, lx + 0.046, ly + 0.036, lx, ly + 0.046);
      c.bezierCurveTo(lx - 0.046, ly + 0.036, lx - 0.036, ly - 0.025, lx, ly - 0.044);
    },
    lin(c, lx - 0.012, ly - 0.032, lx + 0.012, ly + 0.042, [
      [0, "#f2fdff"],
      [0.34, LURE],
      [0.74, "#009dff"],
      [1, "#0055cc"],
    ]),
    "#004499",
    LW * 0.65,
    () => {
      c.fillStyle = "rgba(255,255,255,0.95)";
      blob(c, lx - 0.012, ly - 0.012, 0.011, 0.016, 0.3);
    }
  );

  // ---- 5. Dramatic Gambar 1 Wide-Open Jaw Hinge, Throat Cavern, Tongue & Far Rim Teeth ----
  const hx = 0.118,
    hy = 0.146;
  const upLift = p.open * 0.036;
  const jawOpenAng = p.open * 0.84; // Dramatic ~48° wide cavern gape when mangap!
  const rJaw = Math.hypot(0.358 - hx, 0.048 - hy);
  const a0 = Math.atan2(0.048 - hy, 0.358 - hx);
  const a1 = a0 + jawOpenAng;
  const jTipX = hx + Math.cos(a1) * rJaw;
  const jTipY = hy + Math.sin(a1) * rJaw;

  if (p.open > 0.02) {
    const uTipX = 0.335 - p.open * 0.008;
    const uTipY = 0.008 - upLift;

    // Deep abyssal mouth cavern bridging lifted upper snout & swung-down lower jaw
    c.beginPath();
    c.moveTo(uTipX, uTipY);
    c.quadraticCurveTo(0.245, 0.062 - upLift * 0.3, hx, hy);
    c.lineTo(jTipX, jTipY);
    c.quadraticCurveTo((uTipX + jTipX) * 0.52, (uTipY + jTipY) * 0.52, uTipX, uTipY);
    c.closePath();
    c.fillStyle = lin(c, hx, 0.03, (uTipX + jTipX) * 0.5, (uTipY + jTipY) * 0.5, [
      [0, "#0a1404"],
      [0.45, "#260b12"],
      [1, "#4e1422"],
    ]);
    c.fill();

    // Subtle far-side inner curved needle fangs for 3D Gambar 1 jaw depth!
    const innerScale = Math.min(1, Math.max(0, (p.open - 0.2) / 0.45));
    if (innerScale > 0.05) {
      // Far upper rim fangs curving down-inward
      curvedTusk(0.295, 0.026 - upLift * 0.7, 0.275, 0.026 - upLift * 0.7 + 0.072 * innerScale, 0.012 * innerScale, 0.0068, -1, "inner");
      curvedTusk(0.245, 0.048 - upLift * 0.4, 0.228, 0.048 - upLift * 0.4 + 0.064 * innerScale, 0.01 * innerScale, 0.0062, -1, "inner");
    }

    // Fleshy textured coral-terracotta tongue resting on floor of open lower jaw (Gambar 1!)
    c.save();
    c.translate(hx, hy);
    c.rotate(jawOpenAng * 0.86);
    c.translate(-hx, -hy);
    c.beginPath();
    c.moveTo(0.142, 0.145);
    c.bezierCurveTo(0.205, 0.088, 0.285, 0.062, 0.328, 0.088);
    c.bezierCurveTo(0.285, 0.135, 0.205, 0.165, 0.142, 0.145);
    c.closePath();
    c.fillStyle = lin(c, 0.15, 0.14, 0.32, 0.08, [
      [0, "#68212b"],
      [0.52, "#a8444e"],
      [1, "#d87066"],
    ]);
    c.fill();
    c.strokeStyle = "rgba(55, 14, 20, 0.65)";
    c.lineWidth = 0.004;
    c.stroke();
    // Subtle tongue center groove
    c.beginPath();
    c.moveTo(0.165, 0.136);
    c.quadraticCurveTo(0.235, 0.1, 0.305, 0.095);
    c.strokeStyle = "rgba(85, 22, 30, 0.55)";
    c.lineWidth = 0.0036;
    c.stroke();
    c.restore();

    // Stretched muscular jaw corner tendon fold (Gambar 1!)
    c.beginPath();
    c.moveTo(0.168, 0.082);
    c.quadraticCurveTo(0.135, 0.135, 0.162, 0.195);
    c.strokeStyle = "rgba(18, 36, 8, 0.65)";
    c.lineWidth = 0.007;
    c.stroke();
  }

  // ---- 6. Body Silhouette (Gambar 2 Closed Scoop-Jaw + Gambar 1 Dramatic Open Gape) ----
  const body = () => {
    // Graceful slender peduncle curving cleanly up along arched back & steep sloped snout
    c.moveTo(-0.278, 0.012);
    c.bezierCurveTo(-0.2, -0.095, -0.065, -0.158, 0.08, -0.156);
    c.bezierCurveTo(0.182, -0.154, 0.258, -0.092 - upLift * 0.4, 0.338 - p.open * 0.008, 0.008 - upLift);
    if (p.open > 0.02) {
      // Open bite contour: lifted upper lip -> cheek hinge -> swung-open lower jaw -> rounded scoop chin
      c.quadraticCurveTo(0.245, 0.065 - upLift * 0.3, hx, hy);
      c.lineTo(jTipX, jTipY);
      c.bezierCurveTo(
        jTipX - 0.008,
        jTipY + 0.058,
        0.245,
        0.348,
        0.13,
        0.326
      );
    } else {
      // Gambar 2 closed underbite: protruding lower lip sloping cleanly down-back to firm rounded chin!
      c.bezierCurveTo(0.355, 0.024, 0.365, 0.048, 0.348, 0.096);
      c.bezierCurveTo(0.305, 0.195, 0.225, 0.292, 0.142, 0.31);
      c.quadraticCurveTo(0.115, 0.316, 0.092, 0.304);
    }
    // Deep heavy round chin/jowl sweeping up sharply into pinched arched belly waist & peduncle
    c.bezierCurveTo(0.012, 0.295, -0.045, 0.082, -0.278, 0.048);
  };

  fillStroke(
    c,
    body,
    lin(c, 0.06, -0.16, 0.06, 0.32, [
      [0, HI],
      [0.44, BODY],
      [0.84, DARK],
      [1, DEEP],
    ]),
    OL,
    LW,
    () => {
      // Soft bright chartreuse highlight on brow & upper cheek
      glow(c, 0.12, -0.095, 0.145, 0.068, 0.14, "230,255,145", 0.45);
      // Bold rounded C-curve cheek/jowl muscle fold rising smoothly to gill fin base (Gambar 2!)
      c.strokeStyle = rgba(DEEP, 0.56);
      c.lineWidth = 0.0085;
      c.beginPath();
      c.moveTo(0.042, 0.258);
      c.bezierCurveTo(-0.025, 0.145, -0.018, 0.012, 0.078, -0.022);
      c.stroke();
      // Subtle 3 oval olive skin bumps on plump lower cheek (Gambar 2!)
      c.fillStyle = DARK;
      c.strokeStyle = rgba(DEEP, 0.5);
      c.lineWidth = 0.003;
      for (const [bx, by, br] of [
        [0.058, 0.082, 0.011],
        [0.085, 0.102, 0.008],
        [0.032, 0.1, 0.008],
      ]) {
        c.beginPath();
        c.ellipse(bx, by, br * 1.25, br * 0.85, -0.1, 0, TAU);
        c.fill();
        c.stroke();
      }
    }
  );

  // ---- 7A. Upper Curved Needle Tusks matching Lower Tusks (appear smoothly on mangap!) ----
  const uTooth = Math.min(1, Math.max(0, (p.open - 0.03) / 0.28));
  if (uTooth > 0.04) {
    const upperFangs: [number, number, number, number, number, number][] = [
      // [baseX, baseY, tipX, tipY, bow, halfWidth (5% slimmer!)]
      [0.326, 0.002 - upLift, 0.296, 0.002 - upLift + 0.118 * uTooth, 0.022 * uTooth, 0.0102],
      [0.294, 0.014 - upLift * 0.85, 0.264, 0.014 - upLift * 0.85 + 0.116 * uTooth, 0.026 * uTooth, 0.0124],
      [0.254, 0.032 - upLift * 0.65, 0.228, 0.032 - upLift * 0.65 + 0.098 * uTooth, 0.022 * uTooth, 0.0115],
      [0.214, 0.052 - upLift * 0.45, 0.194, 0.052 - upLift * 0.45 + 0.074 * uTooth, 0.016 * uTooth, 0.0098],
      [0.174, 0.072 - upLift * 0.25, 0.16, 0.072 - upLift * 0.25 + 0.052 * uTooth, 0.011 * uTooth, 0.0084],
    ];
    for (const [bx, by, tx, ty, bow, hw] of upperFangs) {
      curvedTusk(bx, by, tx, ty, bow, hw, -1, "ivory");
    }
  }

  // ---- 7B. Lower Slanted Mouth Slit + 5 Slender Curved Ivory Lower Tusks (5% slimmer!) ----
  c.save();
  c.translate(hx, hy);
  c.rotate(jawOpenAng);
  c.translate(-hx, -hy);

  if (p.open <= 0.02) {
    // Expressive thin slanted dark mouth slit & corner crease matching Gambar 2!
    c.beginPath();
    c.moveTo(0.348, 0.034);
    c.bezierCurveTo(0.282, 0.065, 0.212, 0.115, 0.146, 0.175);
    c.quadraticCurveTo(0.218, 0.138, 0.348, 0.052);
    c.closePath();
    c.fillStyle = "#162b06";
    c.fill();
    c.strokeStyle = OL;
    c.lineWidth = 0.0068;
    c.stroke();

    // Extended lower mouth-corner crease curving down toward chin (Gambar 2!)
    c.beginPath();
    c.moveTo(0.152, 0.17);
    c.quadraticCurveTo(0.132, 0.192, 0.116, 0.214);
    c.strokeStyle = OL;
    c.lineWidth = 0.0064;
    c.stroke();
  }

  // 5 slender (~5-7% slimmer), gracefully curved ivory lower tusks (Gambar 2 closed, Gambar 1 open!)
  curvedTusk(0.342, 0.048, 0.308, -0.014, 0.022, 0.0102); // 1. front snout fang
  curvedTusk(0.312, 0.072, 0.272, -0.046, 0.034, 0.014); // 2. tall front primary fang
  curvedTusk(0.272, 0.1, 0.23, -0.04, 0.038, 0.0156); // 3. tallest main crescent fang
  curvedTusk(0.224, 0.13, 0.192, 0.034, 0.028, 0.0128); // 4. medium curved fang
  curvedTusk(0.168, 0.168, 0.146, 0.098, 0.02, 0.011); // 5. rear mouth-corner fang
  c.restore();

  // ---- 8. Animated Flared & Spotted Ragged Gill / Pectoral Fin (Gambar 1!) ----
  c.save();
  c.translate(0.032, -0.022);
  // Lively swimming & fanning motion clearly visible near the gill!
  c.rotate(-0.12 + s2 * 0.34);
  c.scale(1 - s * 0.14, 1 + s2 * 0.08);
  const tipFlex = s * 0.022;
  fillStroke(
    c,
    () => {
      c.moveTo(-0.015, 0.016);
      c.bezierCurveTo(-0.042, -0.075, -0.068 + tipFlex * 0.5, -0.148, -0.076 + tipFlex, -0.228);
      // Wide flared jagged 4-peak top edge matching Gambar 1!
      c.lineTo(-0.038 + tipFlex * 0.85, -0.205);
      c.lineTo(-0.018 + tipFlex * 0.8, -0.244);
      c.lineTo(0.01 + tipFlex * 0.7, -0.212);
      c.lineTo(0.038 + tipFlex * 0.65, -0.238);
      c.bezierCurveTo(0.035 + tipFlex * 0.3, -0.142, 0.026, -0.065, 0.016, 0.016);
    },
    lin(c, 0, 0.01, -0.01 + tipFlex, -0.24, [
      [0, DARK],
      [0.48, BODY],
      [1, "#a6dc44"],
    ]),
    OL,
    LW * 0.8,
    () => {
      c.fillStyle = "rgba(42, 82, 12, 0.42)";
      blob(c, -0.032 + tipFlex * 0.4, -0.135, 0.017, 0.013, 0.12);
      blob(c, 0.008 + tipFlex * 0.5, -0.172, 0.014, 0.011, -0.2);
      blob(c, -0.018 + tipFlex * 0.2, -0.078, 0.012, 0.009, 0);
      rayFan(
        c,
        0,
        0.01,
        [
          [-0.066 + tipFlex, -0.218],
          [-0.018 + tipFlex * 0.8, -0.234],
          [0.032 + tipFlex * 0.65, -0.228],
        ],
        rgba(OL, 0.46),
        0.0032
      );
    }
  );
  c.restore();

  // ---- 9. Single Side-View Glossy Eye with Cool Down-Tilted Eyelid Angle ----
  const ex = 0.148,
    ey = -0.068 - p.open * 0.004,
    er = 0.072;
  // Sculpted smooth green brow ridge dome tilted subtly with the upper eyelid
  c.save();
  c.translate(ex, ey);
  c.rotate(0.22);
  c.beginPath();
  c.ellipse(0, -0.014, er * 1.14, er * 1.12, 0, Math.PI * 1.02, Math.PI * 1.98);
  c.fillStyle = BODY;
  c.fill();
  c.strokeStyle = OL;
  c.lineWidth = LW * 0.82;
  c.stroke();
  c.restore();

  eye(c, ex, ey, er, {
    iris: pal.iris || "#20ad30",
    expr: p.expr,
    ol: OL,
    sx: 0.96,
    look: 0.28,
    lookY: 0.08,
    irisR: 0.54,
    pupilR: 0.32,
    lid: p.expr === "panic" ? 0 : 0.4,
    lidTilt: 0.26,
    lidCol: "#6eb822",
    lidEdge: OL,
  });

  // Soft glossy curved specular highlight along the slanted eyelid & brow
  c.save();
  c.translate(ex, ey);
  c.rotate(0.24);
  c.beginPath();
  c.moveTo(-er * 0.66, -er * 0.46);
  c.quadraticCurveTo(0, -er * 0.78, er * 0.66, -er * 0.44);
  c.strokeStyle = "rgba(225, 255, 160, 0.58)";
  c.lineWidth = 0.0058;
  c.stroke();
  c.restore();
}

// =====================================================================================
// PARI (STINGRAY) — Side-view Blue-Spotted Stingray inspired by Gambar 1:
//   deep midnight-indigo dorsal mantle with soft pale sky-blue spots, sweeping arched
//   upper wing + broad pale-cream rolled lower wing edge, ruffled rear pelvic lobes,
//   long graceful whip tail, curved gill slits & spiracle, warm chestnut glossy eye,
//   and cheerful underside mouth!
// =====================================================================================
function drawStingray(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const DK = pal.dark || "#0a2258",
    MID = pal.body || "#184b96",
    BLU = "#286ec2",
    SPOT = pal.spot || "#74c2f6";
  const CREAM = pal.belly || "#f5efe6",
    CR_SH = "#beb9cb";
  const OL = rgba(pal.outline || "#071638", 0.94);
  const LW = 0.0072;
  const s = p.wag,
    s2 = p.wag2;

  // ---- 1. Long graceful whip tail tapering smoothly to the left ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.16, -0.018);
      c.bezierCurveTo(-0.27, -0.025 + s * 0.015, -0.39, -0.005 + s * 0.045, -0.492, 0.072 + s * 0.068);
      c.bezierCurveTo(-0.39, 0.014 + s * 0.042, -0.27, -0.002 + s * 0.014, -0.155, 0.014);
    },
    lin(c, -0.16, -0.015, -0.48, 0.06, [
      [0, MID],
      [0.5, DK],
      [1, "#051030"],
    ]),
    OL,
    LW * 0.78,
    () => {
      c.strokeStyle = "rgba(130, 200, 255, 0.55)";
      c.lineWidth = 0.003;
      c.beginPath();
      c.moveTo(-0.17, -0.012);
      c.bezierCurveTo(-0.28, -0.018 + s * 0.014, -0.39, 0.0 + s * 0.042, -0.475, 0.064 + s * 0.062);
      c.stroke();
    }
  );

  // ---- 2. Ruffled dark-blue rear pelvic fin lobes trailing before the tail ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.135, 0.002);
      c.bezierCurveTo(-0.175, -0.01, -0.218, -0.008, -0.235, 0.012 + s2 * 0.008);
      c.quadraticCurveTo(-0.2, 0.024, -0.228, 0.044 + s2 * 0.008);
      c.quadraticCurveTo(-0.188, 0.056, -0.195, 0.074);
      c.quadraticCurveTo(-0.148, 0.068, -0.118, 0.046);
    },
    lin(c, -0.14, 0.0, -0.22, 0.065, [
      [0, MID],
      [1, DK],
    ]),
    OL,
    LW * 0.8
  );

  // ---- 3. Sweeping Upper Arched Dorsal Wing (classic Gambar 1 wing-glide silhouette!) ----
  const wTopX = 0.025 + s2 * 0.01;
  const wTopY = -0.212;
  fillStroke(
    c,
    () => {
      c.moveTo(0.185, -0.058);
      c.bezierCurveTo(0.14, -0.125, 0.088, -0.186, wTopX, wTopY);
      c.bezierCurveTo(-0.005, -0.175, -0.065, -0.11, -0.148, -0.042);
      c.quadraticCurveTo(0.02, -0.048, 0.185, -0.058);
    },
    lin(c, wTopX, wTopY, 0.04, -0.06, [
      [0, "#081b4c"],
      [0.45, MID],
      [1, BLU],
    ]),
    OL,
    LW * 0.9,
    () => {
      // Soft sky-blue ray spots & crisp top wing sheen
      c.fillStyle = rgba(SPOT, 0.42);
      blob(c, 0.032, -0.155, 0.018, 0.01, -0.35);
      blob(c, -0.018, -0.118, 0.022, 0.012, -0.2);
      blob(c, 0.065, -0.11, 0.014, 0.009, 0.1);
      c.strokeStyle = "rgba(155, 222, 255, 0.55)";
      c.lineWidth = 0.004;
      c.beginPath();
      c.moveTo(0.165, -0.066);
      c.bezierCurveTo(0.118, -0.125, 0.075, -0.178, wTopX, wTopY + 0.008);
      c.stroke();
    }
  );

  // ---- 4. Open Underside Mouth Interior ----
  const mhX = 0.256,
    mhY = 0.046;
  const mTipX = 0.342 - p.open * 0.008;
  const mTipY = 0.032 + p.open * 0.052;
  c.beginPath();
  c.moveTo(0.285, 0.026);
  c.lineTo(mTipX, 0.024);
  c.quadraticCurveTo(0.315, 0.044 + p.open * 0.036, mhX, mhY);
  c.closePath();
  c.fillStyle = "#5c0f1d";
  c.fill();
  c.fillStyle = "#e8647c";
  blob(c, 0.296, 0.036 + p.open * 0.018, 0.024, 0.009 + p.open * 0.006, 0.15);

  // ---- 5. Main Side-View Stingray Body + Rounded Nose + Creamy Belly ----
  fillStroke(
    c,
    () => {
      // Back shoulder forward over brow hump to rounded ray nose
      c.moveTo(-0.18, -0.018);
      c.bezierCurveTo(-0.08, -0.075, 0.1, -0.095, 0.225, -0.078);
      c.bezierCurveTo(0.275, -0.076, 0.302, -0.056, 0.342, -0.046);
      c.bezierCurveTo(0.382, -0.038, 0.412, -0.025, 0.408, -0.006);
      // Rounded snout curving smoothly down into cream upper lip
      c.bezierCurveTo(0.402, 0.016, 0.372, 0.024, mTipX, 0.024);
      // Articulated cheerful underside ray mouth
      if (p.open > 0.02) {
        c.quadraticCurveTo(0.305, 0.034, mhX, mhY);
        c.lineTo(mTipX - 0.008, mTipY);
        c.quadraticCurveTo(0.285, 0.068 + p.open * 0.025, 0.19, 0.078 + p.open * 0.012);
      } else {
        c.quadraticCurveTo(0.308, 0.045, mhX, mhY);
        c.quadraticCurveTo(0.308, 0.044, 0.335, 0.034);
        c.quadraticCurveTo(0.295, 0.072, 0.185, 0.078);
      }
      // Cream throat & chest curving smoothly back toward tail root
      c.bezierCurveTo(0.065, 0.09, -0.065, 0.062, -0.18, 0.015);
    },
    CREAM,
    OL,
    LW,
    () => {
      // A) Cool lavender-cream belly shading at lower rim
      c.fillStyle = lin(c, 0, 0.02, 0, 0.095, [
        [0, CREAM],
        [0.65, "#ebe4da"],
        [1, CR_SH],
      ]);
      c.fillRect(-0.2, 0.01, 0.64, 0.1);

      // B) Deep Midnight-Cobalt Upper Dorsal Mantle Coat
      c.fillStyle = lin(c, 0, -0.095, 0, 0.032, [
        [0, DK],
        [0.48, MID],
        [0.92, BLU],
        [1, "rgba(40, 110, 194, 0)"],
      ]);
      c.beginPath();
      c.moveTo(-0.2, -0.03);
      c.bezierCurveTo(-0.05, -0.095, 0.16, -0.1, 0.415, -0.012);
      c.lineTo(0.415, -0.002);
      c.bezierCurveTo(0.33, 0.002, 0.245, 0.005, 0.145, 0.028);
      c.bezierCurveTo(0.02, 0.052, -0.09, 0.042, -0.2, 0.015);
      c.closePath();
      c.fill();

      // C) Crisp light sky-blue top contour rim along nose & brow
      c.strokeStyle = "rgba(150, 222, 255, 0.72)";
      c.lineWidth = 0.0055;
      c.beginPath();
      c.moveTo(0.23, -0.072);
      c.bezierCurveTo(0.285, -0.066, 0.345, -0.042, 0.398, -0.012);
      c.stroke();

      // D) Scattered Soft Pale Sky-Blue Stingray Spots across upper mantle (Gambar 1!)
      const spots: [number, number, number, number, number, number][] = [
        [0.08, -0.048, 0.024, 0.011, -0.1, 0.55],
        [-0.02, -0.038, 0.028, 0.013, 0.08, 0.5],
        [-0.1, -0.02, 0.02, 0.01, -0.15, 0.45],
        [0.14, -0.025, 0.018, 0.009, 0.1, 0.5],
        [0.03, -0.01, 0.022, 0.011, 0.0, 0.45],
        [-0.06, 0.005, 0.018, 0.009, 0.12, 0.4],
        [0.11, 0.008, 0.015, 0.008, -0.2, 0.42],
        [0.185, -0.052, 0.013, 0.007, 0.15, 0.45],
      ];
      for (const [sx, sy, rx, ry, rot, a] of spots) {
        c.fillStyle = rgba(SPOT, a);
        blob(c, sx, sy, rx, ry, rot);
      }

      // E) 5 Curved Gill Slits tucked neatly along the cream lower cheek/throat (Gambar 1!)
      c.strokeStyle = "rgba(38, 48, 72, 0.74)";
      c.lineWidth = 0.0036;
      for (let g = 0; g < 5; g++) {
        const gx = 0.145 + g * 0.018;
        const gy = 0.054 - g * 0.002;
        c.beginPath();
        c.moveTo(gx, gy - 0.01);
        c.quadraticCurveTo(gx + 0.005, gy, gx - 0.002, gy + 0.011);
        c.stroke();
      }
    }
  );

  // ---- 6. Broad Foreground Sweeping Lower Pectoral Wing Flap (with thick cream rolled rim!) ----
  c.save();
  c.translate(0.0, 0.0);
  fillStroke(
    c,
    () => {
      c.moveTo(0.115, 0.022);
      c.bezierCurveTo(0.068, 0.088 + s2 * 0.014, -0.015, 0.142 + s2 * 0.018, -0.105, 0.124 + s2 * 0.014);
      c.bezierCurveTo(-0.155, 0.11, -0.172, 0.065, -0.148, 0.016);
      c.bezierCurveTo(-0.08, -0.005, 0.03, -0.002, 0.115, 0.022);
    },
    lin(c, -0.02, -0.01, -0.04, 0.135, [
      [0, MID],
      [0.6, DK],
      [0.84, "#ebe4da"],
      [1, CR_SH],
    ]),
    OL,
    LW * 0.88,
    () => {
      // Top dark cobalt wing face leaving the thick pale lavender-cream rolled edge at bottom!
      c.fillStyle = lin(c, -0.02, -0.005, -0.04, 0.105, [
        [0, MID],
        [0.72, DK],
        [1, "#091b48"],
      ]);
      c.beginPath();
      c.moveTo(0.115, 0.018);
      c.bezierCurveTo(0.065, 0.072 + s2 * 0.012, -0.012, 0.118 + s2 * 0.016, -0.098, 0.098 + s2 * 0.012);
      c.bezierCurveTo(-0.145, 0.086, -0.165, 0.045, -0.145, 0.012);
      c.closePath();
      c.fill();

      // Crisp pale blue spots on the sweeping wing
      c.fillStyle = rgba(SPOT, 0.45);
      blob(c, -0.025, 0.035, 0.02, 0.01, -0.15);
      blob(c, -0.088, 0.048, 0.016, 0.009, 0.1);
      blob(c, 0.032, 0.042, 0.014, 0.008, -0.2);

      // Soft rim highlight right along the cream rolled wing edge
      c.strokeStyle = "rgba(255, 252, 245, 0.85)";
      c.lineWidth = 0.005;
      c.beginPath();
      c.moveTo(0.104, 0.028);
      c.bezierCurveTo(0.058, 0.082 + s2 * 0.012, -0.016, 0.13 + s2 * 0.016, -0.1, 0.112 + s2 * 0.012);
      c.stroke();
    }
  );
  c.restore();

  // ---- 7. Spiracle Opening & Big Expressive Warm-Brown Glossy Ray Eye (Gambar 1!) ----
  const ex = 0.252,
    ey = -0.032 - p.open * 0.003,
    er = 0.038;
  // Dark oval spiracle slit just behind eye (iconic stingray detail from Gambar 1)
  c.beginPath();
  c.ellipse(ex - 0.048, ey + 0.004, 0.01, 0.015, 0.18, 0, TAU);
  c.fillStyle = "#061028";
  c.fill();
  c.strokeStyle = "rgba(130, 200, 255, 0.45)";
  c.lineWidth = 0.003;
  c.stroke();

  // Gentle orbital crease around lower socket
  c.beginPath();
  c.arc(ex, ey, er * 1.18, Math.PI * 0.12, Math.PI * 0.82);
  c.strokeStyle = "rgba(18, 52, 108, 0.48)";
  c.lineWidth = 0.0042;
  c.stroke();

  eye(c, ex, ey, er, {
    iris: pal.iris || "#7a3b12",
    expr: p.expr,
    ol: OL,
    sx: 0.94,
    look: 0.24,
    irisR: 0.56,
    pupilR: 0.36,
    happyCol: "#ffffff",
  });
}

// =====================================================================================
// MANDARIN (MANDARIN DRAGONET) — Polished Psychedelic Reef Jewel:
//   sleek sapphire-cobalt body with smooth S-curved tangerine & turquoise swirl ribbons,
//   graceful non-crossing sweeping crown plume + clean rounded second dorsal sail,
//   scalloped peacock-fan tail, gossamer pectoral wing, and gold-ringed emerald jewel eye!
// =====================================================================================
function drawMandarin(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const SAP = pal.body || "#0e47b8",
    DK = pal.dark || "#061d66",
    AQUA = pal.belly || "#279cf5",
    ORN = pal.stripe || "#ff7b1c",
    CRMS = pal.tail || "#ff4757",
    CYAN = pal.spot || "#2cf5e8",
    OL = rgba(pal.outline || "#041033", 0.94);
  const LW = 0.0066;
  const s = p.wag,
    s2 = p.wag2;

  // ---- 1. Sculpted Rounded Peacock-Fan Tail ----
  c.save();
  c.translate(-0.158, 0.0);
  c.rotate(s * 0.16);
  fillStroke(
    c,
    () => {
      c.moveTo(0.012, -0.032);
      c.bezierCurveTo(-0.075, -0.105, -0.168, -0.145 + s2 * 0.015, -0.225, -0.088 + s2 * 0.016);
      c.bezierCurveTo(-0.258, -0.042, -0.258, 0.042, -0.225, 0.088 + s2 * 0.016);
      c.bezierCurveTo(-0.168, 0.145 + s2 * 0.015, -0.075, 0.105, 0.012, 0.032);
    },
    lin(c, 0.01, 0.0, -0.255, 0.0, [
      [0, "#1558cf"],
      [0.36, ORN],
      [0.74, CRMS],
      [1, "#b81845"],
    ]),
    OL,
    LW * 0.88,
    () => {
      // Soft radiating fin rays
      c.strokeStyle = "rgba(255, 240, 185, 0.42)";
      c.lineWidth = 0.0032;
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.moveTo(-0.005, i * 0.006);
        c.quadraticCurveTo(-0.115, i * 0.018, -0.225, i * 0.026);
        c.stroke();
      }
      // Subtle turquoise marginal arc & inner pearls
      c.strokeStyle = rgba(CYAN, 0.92);
      c.lineWidth = 0.0072;
      c.beginPath();
      c.moveTo(-0.214, -0.084 + s2 * 0.012);
      c.quadraticCurveTo(-0.25, 0.0, -0.214, 0.084 + s2 * 0.012);
      c.stroke();

      c.fillStyle = rgba(CYAN, 0.82);
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.arc(-0.184 + Math.abs(i) * 0.008, i * 0.029, 0.0062, 0, TAU);
        c.fill();
      }
    }
  );
  c.restore();

  // ---- 2. Second Dorsal Fin (Clean Rounded Dragonet Sail behind the plume) ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.172, -0.038);
      c.bezierCurveTo(-0.182, -0.132, -0.125, -0.186 + s2 * 0.01, -0.048, -0.168 + s2 * 0.008);
      c.bezierCurveTo(-0.018, -0.16, 0.004, -0.128, 0.01, -0.092);
      c.closePath();
    },
    lin(c, -0.08, -0.185, -0.08, -0.045, [
      [0, "#1d8ae8"],
      [0.42, ORN],
      [0.85, "#1154bd"],
      [1, DK],
    ]),
    OL,
    LW * 0.82,
    () => {
      // Delicate rays
      c.strokeStyle = "rgba(255, 245, 210, 0.36)";
      c.lineWidth = 0.0028;
      for (let i = 0; i < 4; i++) {
        const bx = -0.145 + i * 0.038;
        c.beginPath();
        c.moveTo(bx, -0.055);
        c.quadraticCurveTo(bx - 0.012, -0.115, bx - 0.022, -0.162);
        c.stroke();
      }
      // Clean cyan rim & golden pearl spots
      c.strokeStyle = rgba(CYAN, 0.9);
      c.lineWidth = 0.0065;
      c.beginPath();
      c.moveTo(-0.168, -0.102);
      c.bezierCurveTo(-0.142, -0.168, -0.072, -0.174 + s2 * 0.008, -0.01, -0.142);
      c.stroke();
      c.fillStyle = rgba("#ffe270", 0.85);
      blob(c, -0.115, -0.118, 0.01, 0.007, -0.2);
      blob(c, -0.068, -0.122, 0.01, 0.007, -0.15);
      blob(c, -0.032, -0.116, 0.008, 0.006, 0);
    }
  );

  // ---- 3. First Dorsal Plume (Tall, Sleek, Non-Crossing Sickle Crown Crest!) ----
  fillStroke(
    c,
    () => {
      // Root cleanly on upper back (0.002 -> 0.112), sweeping gracefully up & back without any crossover
      c.moveTo(0.002, -0.095);
      c.bezierCurveTo(0.004, -0.178, -0.032, -0.252 + s2 * 0.012, -0.112, -0.292 + s2 * 0.018);
      c.bezierCurveTo(-0.048, -0.282 + s2 * 0.016, 0.065, -0.215, 0.112, -0.09);
      c.closePath();
    },
    lin(c, -0.105, -0.292, 0.085, -0.092, [
      [0, CYAN],
      [0.28, "#ffe268"],
      [0.62, ORN],
      [1, "#2b42d6"],
    ]),
    OL,
    LW * 0.84,
    () => {
      // Elegant curved dorsal spine rays following the plume smoothly
      c.strokeStyle = "rgba(255, 250, 220, 0.65)";
      c.lineWidth = 0.0034;
      c.beginPath();
      c.moveTo(0.088, -0.098);
      c.bezierCurveTo(0.048, -0.195, -0.025, -0.258 + s2 * 0.014, -0.095, -0.282 + s2 * 0.016);
      c.stroke();

      c.strokeStyle = rgba(CYAN, 0.72);
      c.lineWidth = 0.003;
      c.beginPath();
      c.moveTo(0.048, -0.098);
      c.bezierCurveTo(0.022, -0.178, -0.018, -0.228 + s2 * 0.01, -0.065, -0.252 + s2 * 0.012);
      c.stroke();
    }
  );

  // ---- 4. Anal & Pelvic Underside Fins ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.162, 0.042);
      c.bezierCurveTo(-0.188, 0.125, -0.118, 0.17 - s2 * 0.01, -0.025, 0.145);
      c.quadraticCurveTo(0.002, 0.128, 0.015, 0.092);
    },
    lin(c, -0.1, 0.055, -0.1, 0.168, [
      [0, SAP],
      [0.52, ORN],
      [1, CRMS],
    ]),
    OL,
    LW * 0.8,
    () => {
      c.strokeStyle = rgba(CYAN, 0.9);
      c.lineWidth = 0.006;
      c.beginPath();
      c.moveTo(-0.155, 0.115);
      c.quadraticCurveTo(-0.1, 0.16, -0.028, 0.136);
      c.stroke();
    }
  );

  // Foreground dragonet pelvic fan fin
  fillStroke(
    c,
    () => {
      c.moveTo(0.088, 0.086);
      c.bezierCurveTo(0.108, 0.158, 0.045, 0.192, 0.002, 0.155);
      c.quadraticCurveTo(0.025, 0.118, 0.052, 0.088);
    },
    lin(c, 0.075, 0.09, 0.025, 0.18, [
      [0, SAP],
      [0.5, ORN],
      [1, CYAN],
    ]),
    OL,
    LW * 0.76
  );

  // ---- 5. Open Mouth Interior ----
  const mhX = 0.255,
    mhY = 0.032;
  const mTipX = 0.348 - p.open * 0.01;
  const mTipY = 0.026 + p.open * 0.052;
  c.beginPath();
  c.moveTo(0.285, 0.016);
  c.lineTo(mTipX, 0.016);
  c.quadraticCurveTo(0.312, 0.036 + p.open * 0.032, mhX, mhY);
  c.closePath();
  c.fillStyle = "#5c0f24";
  c.fill();
  c.fillStyle = "#ff6a88";
  blob(c, 0.295, 0.028 + p.open * 0.016, 0.022, 0.009 + p.open * 0.006, 0.12);

  // ---- 6. Sleek Dragonet Body & Smooth Psychedelic Swirl Ribbons ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.172, -0.035);
      c.bezierCurveTo(-0.085, -0.095, 0.078, -0.116, 0.202, -0.092);
      c.bezierCurveTo(0.278, -0.076, 0.328, -0.028, mTipX, 0.015);
      if (p.open > 0.02) {
        c.quadraticCurveTo(0.305, 0.024, mhX, mhY);
        c.lineTo(mTipX - 0.008, mTipY);
        c.quadraticCurveTo(0.298, 0.068 + p.open * 0.022, 0.182, 0.088 + p.open * 0.008);
      } else {
        c.quadraticCurveTo(0.315, 0.034, mhX, mhY);
        c.quadraticCurveTo(0.31, 0.038, 0.336, 0.032);
        c.quadraticCurveTo(0.288, 0.076, 0.182, 0.09);
      }
      c.bezierCurveTo(0.055, 0.112, -0.082, 0.082, -0.172, 0.035);
    },
    lin(c, 0.06, -0.112, 0.06, 0.108, [
      [0, DK],
      [0.34, SAP],
      [0.74, AQUA],
      [1, "#1870db"],
    ]),
    OL,
    LW,
    () => {
      // Soft top sheen highlight
      glow(c, 0.08, -0.062, 0.21, 0.046, 0.0, "120,245,255", 0.28);

      const drawSwirl = (pathFn: () => void) => {
        c.beginPath();
        pathFn();
        c.closePath();
        c.fillStyle = lin(c, -0.12, -0.08, 0.24, 0.08, [
          [0, "#ffa62b"],
          [0.52, ORN],
          [1, CRMS],
        ]);
        c.fill();
        c.strokeStyle = CYAN;
        c.lineWidth = 0.005;
        c.stroke();
        c.strokeStyle = rgba("#030e2b", 0.72);
        c.lineWidth = 0.0022;
        c.stroke();
      };

      // Organic flowing swirl 1: Shoulder S-wave curving forward under the cheek
      drawSwirl(() => {
        c.moveTo(0.112, -0.105);
        c.bezierCurveTo(0.148, -0.048, 0.155, 0.015, 0.228, 0.044);
        c.bezierCurveTo(0.258, 0.056, 0.232, 0.088, 0.178, 0.076);
        c.bezierCurveTo(0.12, 0.062, 0.108, -0.025, 0.068, -0.098);
      });

      // Organic flowing swirl 2: Mid-flank curved ribbon hook
      drawSwirl(() => {
        c.moveTo(0.015, -0.104);
        c.bezierCurveTo(-0.022, -0.045, 0.038, 0.018, -0.018, 0.078);
        c.bezierCurveTo(-0.048, 0.102, -0.088, 0.082, -0.068, 0.046);
        c.bezierCurveTo(-0.038, -0.004, -0.072, -0.058, -0.032, -0.098);
      });

      // Organic flowing swirl 3: Rear peduncle band
      drawSwirl(() => {
        c.moveTo(-0.105, -0.068);
        c.bezierCurveTo(-0.135, -0.025, -0.108, 0.022, -0.145, 0.052);
        c.lineTo(-0.175, 0.034);
        c.bezierCurveTo(-0.154, 0.0, -0.165, -0.032, -0.138, -0.058);
      });

      // Snout swirl accent + glowing turquoise dots
      c.fillStyle = ORN;
      blob(c, 0.278, -0.015, 0.019, 0.011, 0.35);
      c.strokeStyle = CYAN;
      c.lineWidth = 0.0036;
      c.stroke();

      c.fillStyle = CYAN;
      blob(c, 0.188, -0.055, 0.009, 0.0065, -0.2);
      blob(c, 0.042, 0.052, 0.01, 0.007, 0.2);
      blob(c, -0.088, -0.024, 0.009, 0.0065, 0.0);

      // Cute cheek swirl curl below eye
      c.strokeStyle = rgba(CYAN, 0.85);
      c.lineWidth = 0.0038;
      c.beginPath();
      c.moveTo(0.245, 0.048);
      c.quadraticCurveTo(0.272, 0.035, 0.285, 0.056);
      c.stroke();

      if (p.puff) {
        c.fillStyle = "rgba(255, 165, 195, 0.55)";
        blob(c, 0.23, 0.046, 0.025, 0.016, 0);
      }
    }
  );

  // ---- 7. Gossamer Rounded Pectoral Wing Fin (tucked neatly lower-mid flank) ----
  c.save();
  c.translate(0.105, 0.032);
  c.rotate(s2 * 0.18);
  fillStroke(
    c,
    () => {
      c.moveTo(0, 0);
      c.bezierCurveTo(-0.028, -0.038, -0.102, -0.022, -0.092, 0.032);
      c.bezierCurveTo(-0.078, 0.076, -0.018, 0.064, 0, 0.016);
    },
    lin(c, 0, 0, -0.09, 0.028, [
      [0, rgba(AQUA, 0.9)],
      [0.58, rgba(ORN, 0.85)],
      [1, rgba(CYAN, 0.92)],
    ]),
    OL,
    LW * 0.68,
    () => {
      c.strokeStyle = "rgba(255,255,255,0.52)";
      c.lineWidth = 0.0026;
      for (let r = -1; r <= 2; r++) {
        c.beginPath();
        c.moveTo(-0.006, 0.004);
        c.lineTo(-0.076, r * 0.018);
        c.stroke();
      }
    }
  );
  c.restore();

  // ---- 8. Gold-Ringed Emerald Jewel Eye (cleanly proportioned) ----
  const ex = 0.228,
    ey = -0.034 - p.open * 0.004,
    er = 0.041;
  c.beginPath();
  c.arc(ex, ey, er * 1.18, 0, TAU);
  c.fillStyle = "#ffae2b";
  c.fill();
  c.strokeStyle = OL;
  c.lineWidth = 0.0038;
  c.stroke();

  eye(c, ex, ey, er, {
    iris: pal.iris || "#18c98f",
    expr: p.expr,
    ol: OL,
    sx: 0.94,
    look: 0.24,
    irisR: 0.62,
    pupilR: 0.36,
    happyCol: "#ffe999",
  });
}

// =====================================================================================
// AURORA (CELESTIAL HALFMOON VEILFISH) — Rare Iridescent Betta Queen:
//   pearlescent rose-opal body & colossal 180-degree silk halfmoon tail + crown veils
//   rippling smoothly in S-waves, flowing amethyst -> rose -> aurora-cyan sheen!
// =====================================================================================
function drawAurora(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const ROSE = pal.body || "#ff85c0",
    AMET = pal.dark || "#6928a8",
    OPAL = pal.belly || "#ffe8f7",
    ORCH = pal.fin || "#9c5cf5",
    AUR = pal.tail || "#4df5e8",
    STAR = pal.spot || "#7df9ff",
    OL = rgba(pal.outline || "#2a0b4a", 0.9);
  const LW = 0.0066;
  const s = p.wag,
    s2 = p.wag2;

  // ---- 1. Giant 180-degree Billowing Silk Halfmoon Veil Tail ----
  c.save();
  c.translate(-0.04, 0.0);
  fillStroke(
    c,
    () => {
      c.moveTo(0.02, -0.048);
      c.bezierCurveTo(-0.08, -0.18 + s * 0.025, -0.22, -0.35 + s2 * 0.035, -0.375, -0.305 + s2 * 0.045);
      // Scalloped aurora ruffled outer edge
      c.bezierCurveTo(-0.435, -0.18 + s * 0.03, -0.455, -0.06 + s2 * 0.025, -0.438, 0.0 + s * 0.02);
      c.bezierCurveTo(-0.455, 0.07 + s2 * 0.025, -0.43, 0.20 + s * 0.03, -0.368, 0.312 + s2 * 0.045);
      c.bezierCurveTo(-0.21, 0.348 + s2 * 0.035, -0.075, 0.178 + s * 0.025, 0.02, 0.05);
    },
    lin(c, 0.02, 0.0, -0.44, 0.0, [
      [0, AMET],
      [0.32, ORCH],
      [0.65, ROSE],
      [0.88, "#ffbde8"],
      [1, AUR],
    ]),
    OL,
    LW * 0.82,
    () => {
      // Silky translucent aurora crescent rim along trailing edge
      c.strokeStyle = rgba(AUR, 0.86);
      c.lineWidth = 0.016;
      c.beginPath();
      c.moveTo(-0.358, -0.29 + s2 * 0.04);
      c.bezierCurveTo(-0.432, -0.12 + s * 0.025, -0.432, 0.12 + s * 0.025, -0.352, 0.295 + s2 * 0.04);
      c.stroke();

      // Delicate branching gossamer betta rays
      c.strokeStyle = "rgba(255, 250, 255, 0.44)";
      c.lineWidth = 0.0032;
      for (let i = -5; i <= 5; i++) {
        const ang = i * 0.16 + s * 0.05;
        const ex = -Math.cos(ang) * 0.39;
        const ey = Math.sin(ang) * 0.305 + (i % 2 === 0 ? s2 * 0.025 : s * 0.02);
        c.beginPath();
        c.moveTo(0.0, i * 0.006);
        c.quadraticCurveTo(ex * 0.52, ey * 0.52 + s * 0.018, ex, ey);
        c.stroke();
      }

      // Shimmering starlight dots in veil
      c.fillStyle = "rgba(255, 255, 255, 0.78)";
      blob(c, -0.28, -0.14 + s * 0.02, 0.01, 0.007, 0.3);
      blob(c, -0.33, 0.05 + s2 * 0.02, 0.011, 0.007, -0.2);
      blob(c, -0.26, 0.17 + s * 0.02, 0.009, 0.006, 0.1);
    }
  );
  c.restore();

  // ---- 2. Sweeping Crown Dorsal Silk Veil ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.115, -0.075);
      c.bezierCurveTo(0.06, -0.19, -0.04, -0.345 + s2 * 0.025, -0.185, -0.345 + s2 * 0.032);
      c.bezierCurveTo(-0.155, -0.245, -0.125, -0.145, -0.065, -0.052);
    },
    lin(c, 0.05, -0.07, -0.17, -0.34, [
      [0, ORCH],
      [0.52, ROSE],
      [1, AUR],
    ]),
    OL,
    LW * 0.8,
    () => {
      c.strokeStyle = "rgba(255,255,255,0.48)";
      c.lineWidth = 0.003;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(0.08 - i * 0.032, -0.07);
        c.quadraticCurveTo(0.01 - i * 0.042, -0.20, -0.095 - i * 0.02 + s2 * 0.018, -0.295 - i * 0.008);
        c.stroke();
      }
    }
  );

  // ---- 3. Long Flowing Ventral / Anal Ribbon Veil ----
  fillStroke(
    c,
    () => {
      c.moveTo(0.125, 0.072);
      c.bezierCurveTo(0.05, 0.205, -0.055, 0.355 - s2 * 0.022, -0.215, 0.345 - s2 * 0.03);
      c.bezierCurveTo(-0.155, 0.245, -0.12, 0.145, -0.058, 0.048);
    },
    lin(c, 0.06, 0.06, -0.19, 0.34, [
      [0, ORCH],
      [0.55, ROSE],
      [1, AUR],
    ]),
    OL,
    LW * 0.8,
    () => {
      c.strokeStyle = "rgba(255,255,255,0.45)";
      c.lineWidth = 0.003;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(0.09 - i * 0.034, 0.065);
        c.quadraticCurveTo(0.01 - i * 0.042, 0.20, -0.10 - i * 0.025 - s2 * 0.018, 0.29 + i * 0.01);
        c.stroke();
      }
    }
  );

  // Foreground delicate paired silk ribbon streamer
  fillStroke(
    c,
    () => {
      c.moveTo(0.155, 0.075);
      c.bezierCurveTo(0.13, 0.185, 0.055, 0.285 - s2 * 0.02, -0.015, 0.305 - s2 * 0.028);
      c.bezierCurveTo(0.03, 0.225, 0.075, 0.145, 0.115, 0.082);
    },
    lin(c, 0.14, 0.08, 0.0, 0.30, [
      [0, OPAL],
      [0.6, "#ff99d6"],
      [1, AUR],
    ]),
    OL,
    LW * 0.72
  );

  // ---- 4. Open Mouth Interior ----
  const mhX = 0.265,
    mhY = 0.026;
  const mTipX = 0.355 - p.open * 0.008;
  const mTipY = 0.018 + p.open * 0.054;
  c.beginPath();
  c.moveTo(0.295, 0.008);
  c.lineTo(mTipX, 0.008);
  c.quadraticCurveTo(0.32, 0.032 + p.open * 0.032, mhX, mhY);
  c.closePath();
  c.fillStyle = "#591032";
  c.fill();
  c.fillStyle = "#ff78a5";
  blob(c, 0.302, 0.02 + p.open * 0.018, 0.022, 0.009 + p.open * 0.006, 0.1);

  // ---- 5. Graceful Sculpted Pearlescent Veilfish Body ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.085, -0.044);
      c.bezierCurveTo(0.01, -0.098, 0.155, -0.105, 0.255, -0.068);
      c.bezierCurveTo(0.305, -0.048, 0.338, -0.018, mTipX, 0.008);
      if (p.open > 0.02) {
        c.quadraticCurveTo(0.312, 0.018, mhX, mhY);
        c.lineTo(mTipX - 0.008, mTipY);
        c.quadraticCurveTo(0.30, 0.062 + p.open * 0.022, 0.185, 0.084 + p.open * 0.008);
      } else {
        c.quadraticCurveTo(0.322, 0.028, mhX, mhY);
        c.quadraticCurveTo(0.318, 0.032, 0.344, 0.024);
        c.quadraticCurveTo(0.295, 0.072, 0.185, 0.084);
      }
      c.bezierCurveTo(0.07, 0.095, -0.02, 0.075, -0.085, 0.045);
    },
    lin(c, 0.08, -0.105, 0.08, 0.095, [
      [0, AMET],
      [0.34, ORCH],
      [0.64, ROSE],
      [1, OPAL],
    ]),
    OL,
    LW,
    () => {
      // Iridescent aqua-pearl spine glow & rose cheek blush
      glow(c, 0.08, -0.04, 0.19, 0.055, -0.08, "125,249,255", 0.34);
      glow(c, 0.17, 0.02, 0.12, 0.05, 0, "255,190,235", 0.45);

      // Subtle overlapping diamond scale shimmer arcs
      c.strokeStyle = rgba(STAR, 0.42);
      c.lineWidth = 0.003;
      for (let r = 0; r < 3; r++) {
        for (let col = 0; col < 5; col++) {
          const sx = -0.03 + col * 0.042 + (r % 2) * 0.02;
          const sy = -0.035 + r * 0.035;
          c.beginPath();
          c.arc(sx, sy, 0.022, -Math.PI * 0.35, Math.PI * 0.35);
          c.stroke();
        }
      }

      // Rosy pearl cheek blush
      c.fillStyle = "rgba(255, 110, 175, 0.44)";
      blob(c, 0.21, 0.032, 0.024, 0.015, 0.1);
      if (p.puff) {
        c.fillStyle = "rgba(255, 130, 195, 0.65)";
        blob(c, 0.225, 0.038, 0.03, 0.02, 0);
      }

      // Delicate gill arc
      c.strokeStyle = rgba(AMET, 0.55);
      c.lineWidth = 0.004;
      c.beginPath();
      c.arc(0.145, 0.005, 0.045, -Math.PI * 0.32, Math.PI * 0.38);
      c.stroke();
    }
  );

  // ---- 6. Gossamer Opal Pectoral Fin ----
  c.save();
  c.translate(0.13, 0.024);
  c.rotate(s2 * 0.22);
  fillStroke(
    c,
    () => {
      c.moveTo(0, 0);
      c.bezierCurveTo(-0.04, -0.048, -0.145, -0.018, -0.135, 0.042);
      c.bezierCurveTo(-0.11, 0.088, -0.03, 0.068, 0, 0.015);
    },
    lin(c, 0, 0, -0.13, 0.04, [
      [0, "rgba(255, 240, 252, 0.86)"],
      [0.65, "rgba(185, 135, 255, 0.78)"],
      [1, "rgba(77, 245, 232, 0.88)"],
    ]),
    rgba(pal.outline || "#2a0b4a", 0.72),
    LW * 0.68
  );
  c.restore();

  // ---- 7. Sapphire Jewel Eye + Long Eyelash Flourish ----
  const ex = 0.242,
    ey = -0.024 - p.open * 0.003,
    er = 0.044;
  eye(c, ex, ey, er, {
    iris: pal.iris || "#2d68e6",
    expr: p.expr,
    ol: OL,
    sx: 0.94,
    look: 0.24,
    irisR: 0.6,
    pupilR: 0.35,
    happyCol: "#ffffff",
  });
}

// =====================================================================================
// NARWHAL (LUMINA — STARLIGHT PEARL NARWHAL) — Rare Arctic Celestial Creature:
//   sleek moonlit-lavender & pearl whale body with twinkling star speckles,
//   expressive smiling snout, rosy cheeks, crescent whale fluke tail,
//   and an iconic gleaming spiraled golden-ivory horn tusk!
// =====================================================================================
function drawNarwhal(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const LAV = pal.body || "#8e78ff",
    IND = pal.dark || "#4432a8",
    PRL = pal.belly || "#f7f4ff",
    GOLD = pal.stripe || "#ffe58f",
    STAR = pal.spot || "#b5f4ff",
    OL = rgba(pal.outline || "#1a1047", 0.94);
  const LW = 0.0072;
  const s = p.wag,
    s2 = p.wag2;

  // ---- 1. Graceful Crescent Whale Fluke Tail ----
  c.save();
  c.translate(-0.24, 0.005);
  c.rotate(s * 0.14);
  fillStroke(
    c,
    () => {
      c.moveTo(0.02, -0.028);
      c.bezierCurveTo(-0.07, -0.06, -0.155, -0.165, -0.215, -0.18 + s2 * 0.015);
      c.bezierCurveTo(-0.18, -0.095, -0.145, -0.032, -0.105, 0.0);
      c.bezierCurveTo(-0.145, 0.032, -0.18, 0.095, -0.215, 0.18 + s2 * 0.015);
      c.bezierCurveTo(-0.155, 0.165, -0.07, 0.06, 0.02, 0.028);
    },
    lin(c, 0.0, -0.16, -0.18, 0.16, [
      [0, IND],
      [0.5, LAV],
      [1, "#4e3cc4"],
    ]),
    OL,
    LW * 0.9,
    () => {
      c.strokeStyle = rgba(STAR, 0.55);
      c.lineWidth = 0.004;
      c.beginPath();
      c.moveTo(-0.02, -0.022);
      c.quadraticCurveTo(-0.12, -0.08, -0.195, -0.16);
      c.stroke();
    }
  );
  c.restore();

  // ---- 2. Iconic Spiraled Golden-Ivory Narwhal Horn / Tusk ----
  c.save();
  c.translate(0.248, -0.026);
  c.rotate(-0.15); // tilted slightly upward for proud silhouette
  const tuskLen = 0.232;
  fillStroke(
    c,
    () => {
      c.moveTo(0.0, -0.021);
      c.bezierCurveTo(tuskLen * 0.35, -0.014, tuskLen * 0.72, -0.007, tuskLen, 0.0);
      c.bezierCurveTo(tuskLen * 0.72, 0.007, tuskLen * 0.35, 0.014, 0.0, 0.021);
    },
    lin(c, 0, -0.022, 0, 0.022, [
      [0, "#fffdf2"],
      [0.45, GOLD],
      [1, "#d99b26"],
    ]),
    OL,
    LW * 0.76,
    () => {
      // Spiral diagonal tusk twist grooves!
      for (let i = 0; i < 7; i++) {
        const tx = 0.018 + i * 0.029;
        const hw = 0.022 * (1 - tx / (tuskLen * 1.08));
        c.strokeStyle = "rgba(175, 110, 15, 0.62)";
        c.lineWidth = 0.0042;
        c.beginPath();
        c.moveTo(tx - 0.005, -hw);
        c.lineTo(tx + 0.012, hw);
        c.stroke();

        c.strokeStyle = "rgba(255, 255, 255, 0.85)";
        c.lineWidth = 0.0026;
        c.beginPath();
        c.moveTo(tx - 0.009, -hw * 0.85);
        c.lineTo(tx + 0.007, hw * 0.45);
        c.stroke();
      }
    }
  );
  // Subtle starlight gleam near tusk tip
  glow(c, tuskLen - 0.01, -0.002, 0.032, 0.022, 0, "255,245,180", 0.55);
  c.restore();

  // ---- 3. Open Mouth Interior ----
  const mhX = 0.195,
    mhY = 0.068;
  const mTipX = 0.278 - p.open * 0.006;
  const mTipY = 0.062 + p.open * 0.052;
  c.beginPath();
  c.moveTo(0.225, 0.052);
  c.lineTo(mTipX, 0.05);
  c.quadraticCurveTo(0.248, 0.072 + p.open * 0.032, mhX, mhY);
  c.closePath();
  c.fillStyle = "#5c1438";
  c.fill();
  c.fillStyle = "#ff7aa8";
  blob(c, 0.235, 0.062 + p.open * 0.016, 0.022, 0.009 + p.open * 0.006, 0.12);

  // ---- 4. Sleek Plump Opalescent Narwhal Body ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.245, -0.028);
      c.bezierCurveTo(-0.145, -0.108, 0.02, -0.142, 0.175, -0.118);
      // Iconic rounded bulbous narwhal melon forehead curving smoothly to snout
      c.bezierCurveTo(0.245, -0.105, 0.292, -0.065, 0.292, -0.008);
      c.bezierCurveTo(0.292, 0.028, 0.282, 0.044, mTipX, 0.05);
      if (p.open > 0.02) {
        c.quadraticCurveTo(0.24, 0.056, mhX, mhY);
        c.lineTo(mTipX - 0.008, mTipY);
        c.quadraticCurveTo(0.228, 0.095 + p.open * 0.024, 0.135, 0.106 + p.open * 0.01);
      } else {
        c.quadraticCurveTo(0.248, 0.068, mhX, mhY);
        c.quadraticCurveTo(0.245, 0.072, 0.272, 0.064);
        c.quadraticCurveTo(0.225, 0.10, 0.135, 0.106);
      }
      c.bezierCurveTo(0.015, 0.12, -0.135, 0.09, -0.245, 0.032);
    },
    lin(c, 0.0, -0.14, 0.0, 0.12, [
      [0, IND],
      [0.42, LAV],
      [0.72, "#c6bdff"],
      [1, PRL],
    ]),
    OL,
    LW,
    () => {
      // Creamy pearl underbelly wave
      c.fillStyle = lin(c, 0, 0.02, 0, 0.12, [
        [0, PRL],
        [0.72, "#eee8ff"],
        [1, "#d2c8f7"],
      ]);
      c.beginPath();
      c.moveTo(-0.25, 0.018);
      c.bezierCurveTo(-0.11, 0.035, 0.06, 0.048, 0.285, 0.045);
      c.lineTo(0.29, 0.13);
      c.lineTo(-0.26, 0.12);
      c.closePath();
      c.fill();

      // Soft top crescent specular sheen
      glow(c, 0.08, -0.09, 0.18, 0.04, -0.05, "215,245,255", 0.34);

      // Authentic narwhal dappled mottled pearl-aqua spots across back
      const dots: [number, number, number, number, number, number][] = [
        [-0.08, -0.065, 0.022, 0.011, -0.15, 0.55],
        [-0.01, -0.085, 0.026, 0.012, 0.08, 0.55],
        [0.065, -0.078, 0.02, 0.01, -0.1, 0.6],
        [0.125, -0.058, 0.018, 0.009, 0.15, 0.55],
        [-0.145, -0.04, 0.019, 0.01, -0.12, 0.45],
        [-0.045, -0.035, 0.015, 0.008, 0.05, 0.5],
        [0.035, -0.042, 0.016, 0.008, -0.2, 0.45],
      ];
      for (const [dx, dy, rx, ry, rot, a] of dots) {
        c.fillStyle = rgba(STAR, a);
        blob(c, dx, dy, rx, ry, rot);
      }

      // Rosy kawaii cheek blush
      c.fillStyle = "rgba(255, 130, 185, 0.52)";
      blob(c, 0.17, 0.045, 0.025, 0.015, 0.08);
      if (p.puff) {
        c.fillStyle = "rgba(255, 145, 200, 0.7)";
        blob(c, 0.185, 0.052, 0.03, 0.02, 0);
      }
    }
  );

  // ---- 5. Rounded Flipper Fin ----
  c.save();
  c.translate(0.055, 0.052);
  c.rotate(s2 * 0.22);
  fillStroke(
    c,
    () => {
      c.moveTo(0.01, -0.008);
      c.bezierCurveTo(-0.025, 0.055, -0.088, 0.082, -0.112, 0.055);
      c.bezierCurveTo(-0.125, 0.03, -0.072, -0.012, -0.008, -0.014);
    },
    lin(c, 0, -0.01, -0.11, 0.07, [
      [0, LAV],
      [0.65, IND],
      [1, "#2f2285"],
    ]),
    OL,
    LW * 0.78,
    () => {
      c.strokeStyle = rgba(STAR, 0.55);
      c.lineWidth = 0.0032;
      c.beginPath();
      c.moveTo(-0.015, 0.045);
      c.quadraticCurveTo(-0.065, 0.068, -0.102, 0.052);
      c.stroke();
    }
  );
  c.restore();

  // ---- 6. Glossy Starry Whale Eye ----
  const ex = 0.202,
    ey = 0.002 - p.open * 0.002,
    er = 0.042;
  eye(c, ex, ey, er, {
    iris: pal.iris || "#1f3a8a",
    expr: p.expr,
    ol: OL,
    sx: 0.94,
    look: 0.24,
    irisR: 0.62,
    pupilR: 0.38,
    happyCol: "#ffffff",
  });
}

// =====================================================================================
// NAGA DAUN (LEAFY SEADRAGON) — Golden-Emerald Kelp Sovereign:
//   graceful arched armored body & tubular snout, ornate golden-jade ridge segments,
//   and fluttering swaying kelp-leaf plumes along back, belly & tail!
// =====================================================================================
function drawSeadragon(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const EMR = pal.body || "#22b87a",
    DK = pal.dark || "#0c4a38",
    GOLD = pal.belly || "#ffe47a",
    AMBER = pal.fin || "#e6a825",
    LEAF = pal.spot || "#9effc6",
    OL = rgba(pal.outline || "#07261c", 0.92);
  const LW = 0.0064;
  const s = p.wag,
    s2 = p.wag2;

  const drawLeafPlume = (ax: number, ay: number, ang: number, len: number, wid: number, warm = false) => {
    c.save();
    c.translate(ax, ay);
    c.rotate(ang);
    fillStroke(
      c,
      () => {
        c.moveTo(0, 0);
        c.bezierCurveTo(len * 0.28, -wid * 0.9, len * 0.65, -wid * 0.5, len, -wid * 0.15);
        c.bezierCurveTo(len * 0.85, wid * 0.28, len * 0.48, wid * 0.95, 0.004, wid * 0.18);
      },
      lin(c, 0, 0, len, 0, warm
        ? [
            [0, DK],
            [0.45, AMBER],
            [1, GOLD],
          ]
        : [
            [0, DK],
            [0.48, EMR],
            [1, LEAF],
          ]),
      OL,
      LW * 0.72,
      () => {
        c.strokeStyle = rgba(GOLD, 0.75);
        c.lineWidth = 0.0028;
        c.beginPath();
        c.moveTo(0.005, 0);
        c.quadraticCurveTo(len * 0.5, -wid * 0.12, len * 0.88, -wid * 0.04);
        c.stroke();
      }
    );
    c.restore();
  };

  // ---- 1. Fluttering Leaf Plumes Behind Tail & Back ----
  drawLeafPlume(-0.31, -0.02 + s * 0.015, -2.55 + s * 0.18, 0.16, 0.042, true);
  drawLeafPlume(-0.32, 0.02 + s * 0.015, 2.58 + s * 0.16, 0.145, 0.038, false);
  drawLeafPlume(-0.18, -0.06, -2.1 + s2 * 0.14, 0.175, 0.048, false);
  drawLeafPlume(-0.04, -0.10, -1.85 + s2 * 0.14, 0.195, 0.052, true);
  drawLeafPlume(0.11, -0.095, -1.65 + s2 * 0.12, 0.16, 0.045, false);

  // Belly swaying kelp plumes
  drawLeafPlume(-0.12, 0.055, 2.15 - s2 * 0.14, 0.155, 0.042, true);
  drawLeafPlume(0.02, 0.088, 1.85 - s2 * 0.14, 0.165, 0.046, false);
  drawLeafPlume(0.16, 0.072, 1.55 - s2 * 0.12, 0.125, 0.036, true);

  // ---- 2. Open Snout Tip Mouth Interior ----
  const tipX = 0.40 - p.open * 0.01;
  const lowY = 0.002 + p.open * 0.042;
  if (p.open > 0.03) {
    c.beginPath();
    c.moveTo(0.32, -0.014);
    c.lineTo(tipX, -0.022);
    c.lineTo(tipX - 0.008, lowY);
    c.closePath();
    c.fillStyle = "#5a1426";
    c.fill();
  }

  // ---- 3. Graceful Arched Leafy Seadragon Body & Tubular Snout ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.34, 0.012 + s * 0.018);
      c.bezierCurveTo(-0.24, -0.068, -0.08, -0.125, 0.065, -0.115);
      c.bezierCurveTo(0.165, -0.105, 0.215, -0.092, 0.258, -0.048);
      // Tubular seahorse snout
      c.bezierCurveTo(0.305, -0.035, 0.355, -0.032, tipX, -0.026);
      if (p.open > 0.03) {
        c.lineTo(0.345, -0.01);
        c.lineTo(tipX - 0.008, lowY);
        c.quadraticCurveTo(0.34, 0.015 + p.open * 0.016, 0.245, 0.022);
      } else {
        c.quadraticCurveTo(0.398, -0.008, 0.382, 0.002);
        c.bezierCurveTo(0.34, 0.004, 0.29, 0.006, 0.248, 0.02);
      }
      c.bezierCurveTo(0.205, 0.088, 0.08, 0.115, -0.04, 0.09);
      c.bezierCurveTo(-0.16, 0.065, -0.25, 0.038, -0.34, 0.024 + s * 0.018);
    },
    lin(c, 0.05, -0.115, 0.05, 0.105, [
      [0, DK],
      [0.36, EMR],
      [0.72, AMBER],
      [1, GOLD],
    ]),
    OL,
    LW,
    () => {
      // Soft dorsal highlight & golden armored body rings
      glow(c, 0.06, -0.05, 0.22, 0.05, 0.0, "255,235,140", 0.24);
      c.strokeStyle = rgba(GOLD, 0.68);
      c.lineWidth = 0.0048;
      for (let i = -3; i <= 3; i++) {
        const rx = i * 0.058 - 0.01;
        c.beginPath();
        c.moveTo(rx, -0.11);
        c.quadraticCurveTo(rx - 0.022, 0.0, rx, 0.098);
        c.stroke();
      }
      c.fillStyle = rgba(LEAF, 0.85);
      for (let i = -2; i <= 2; i++) {
        blob(c, i * 0.062 + 0.01, -0.028, 0.009, 0.006, 0.15);
      }
      if (p.puff) {
        c.fillStyle = "rgba(255, 195, 145, 0.55)";
        blob(c, 0.22, 0.028, 0.024, 0.015, 0);
      }
    }
  );

  // ---- 4. Crown Head Crest & Translucent Golden Dorsal Fin Fan ----
  drawLeafPlume(0.185, -0.088, -2.05, 0.09, 0.028, true);
  c.save();
  c.translate(-0.075, -0.095);
  fillStroke(
    c,
    () => {
      c.moveTo(-0.055, 0.018);
      c.bezierCurveTo(-0.045, -0.065, 0.045, -0.075 + s2 * 0.01, 0.065, 0.005);
    },
    rgba(GOLD, 0.78),
    OL,
    LW * 0.72
  );
  c.restore();

  // ---- 5. Translucent Pectoral Leaf-Fan Fin ----
  c.save();
  c.translate(0.145, 0.012);
  c.rotate(s2 * 0.22);
  fillStroke(
    c,
    () => {
      c.moveTo(0, 0);
      c.bezierCurveTo(-0.028, -0.042, -0.092, -0.022, -0.085, 0.028);
      c.bezierCurveTo(-0.072, 0.068, -0.012, 0.054, 0, 0.015);
    },
    lin(c, 0, 0, -0.085, 0.02, [
      [0, rgba(EMR, 0.85)],
      [1, rgba(GOLD, 0.9)],
    ]),
    OL,
    LW * 0.68
  );
  c.restore();

  // ---- 6. Golden Jewel Eye ----
  const ex = 0.228,
    ey = -0.042,
    er = 0.036;
  c.beginPath();
  c.arc(ex, ey, er * 1.18, 0, TAU);
  c.fillStyle = AMBER;
  c.fill();
  c.strokeStyle = OL;
  c.lineWidth = 0.0036;
  c.stroke();

  eye(c, ex, ey, er, {
    iris: pal.iris || "#ff6b35",
    expr: p.expr,
    ol: OL,
    sx: 0.95,
    look: 0.24,
    irisR: 0.6,
    pupilR: 0.35,
    happyCol: GOLD,
  });
}

// =====================================================================================
// KAISAR KOI (IMPERIAL BUTTERFLY KOI) — Silky Kohaku Veil Majesty:
//   ivory-pearl plush Koi silhouette with Tancho crimson crown + organic Sanke patches,
//   graceful twin golden ribbon barbels, and billowing split butterfly veil tail!
// =====================================================================================
function drawKoi(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const PEARL = pal.body || "#fffcf5",
    CREAM = pal.belly || "#fff5e8",
    CRIM = pal.stripe || "#f03824",
    GOLD = pal.spot || "#ffaa1d",
    FIN = pal.fin || "#ffe2b8",
    OL = rgba(pal.outline || "#2b0d0b", 0.92);
  const LW = 0.0066;
  const s = p.wag,
    s2 = p.wag2;

  // ---- 1. Flowing Twin Split Butterfly Veil Tail ----
  c.save();
  c.translate(-0.185, 0.0);
  c.rotate(s * 0.16);
  fillStroke(
    c,
    () => {
      c.moveTo(0.015, -0.025);
      c.bezierCurveTo(-0.085, -0.145, -0.22, -0.22 + s2 * 0.022, -0.32, -0.165 + s2 * 0.025);
      c.bezierCurveTo(-0.275, -0.095, -0.215, -0.03, -0.185, 0.0 + s2 * 0.012);
      c.bezierCurveTo(-0.215, 0.03, -0.275, 0.095, -0.32, 0.165 + s2 * 0.025);
      c.bezierCurveTo(-0.22, 0.22 + s2 * 0.022, -0.085, 0.145, 0.015, 0.025);
    },
    lin(c, 0.0, 0.0, -0.32, 0.0, [
      [0, CRIM],
      [0.45, GOLD],
      [0.85, FIN],
      [1, "#ffffff"],
    ]),
    OL,
    LW * 0.82,
    () => {
      c.strokeStyle = "rgba(255, 255, 255, 0.65)";
      c.lineWidth = 0.003;
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        c.beginPath();
        c.moveTo(-0.005, i * 0.006);
        c.quadraticCurveTo(-0.14, i * 0.032, -0.285, i * 0.048);
        c.stroke();
      }
    }
  );
  c.restore();

  // ---- 2. Flowing Koi Dorsal Sail Fin ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.155, -0.048);
      c.bezierCurveTo(-0.185, -0.175, -0.055, -0.215 + s2 * 0.015, 0.065, -0.162);
      c.quadraticCurveTo(0.085, -0.125, 0.075, -0.092);
    },
    lin(c, -0.04, -0.21, -0.04, -0.05, [
      [0, "#ffffff"],
      [0.4, FIN],
      [0.82, GOLD],
      [1, CRIM],
    ]),
    OL,
    LW * 0.8,
    () => {
      c.strokeStyle = "rgba(255, 255, 255, 0.55)";
      c.lineWidth = 0.0028;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(-0.04 + i * 0.032, -0.075);
        c.quadraticCurveTo(-0.06 + i * 0.03, -0.135, -0.08 + i * 0.03, -0.175);
        c.stroke();
      }
    }
  );

  // ---- 3. Rear Belly Veil Fin ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.145, 0.048);
      c.bezierCurveTo(-0.175, 0.145, -0.075, 0.178 - s2 * 0.012, -0.015, 0.135);
      c.lineTo(0.02, 0.088);
    },
    lin(c, -0.08, 0.06, -0.08, 0.17, [
      [0, GOLD],
      [1, "#ffffff"],
    ]),
    OL,
    LW * 0.78
  );

  // ---- 4. Open Mouth Interior ----
  const mhX = 0.255,
    mhY = 0.028;
  const mTipX = 0.352 - p.open * 0.01;
  const mTipY = 0.024 + p.open * 0.052;
  c.beginPath();
  c.moveTo(0.285, 0.012);
  c.lineTo(mTipX, 0.012);
  c.quadraticCurveTo(0.312, 0.034 + p.open * 0.03, mhX, mhY);
  c.closePath();
  c.fillStyle = "#661224";
  c.fill();

  // ---- 5. Plush Pearl-White Koi Body & Imperial Kohaku Crimson Patches ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.182, -0.028);
      c.bezierCurveTo(-0.085, -0.098, 0.085, -0.125, 0.215, -0.092);
      c.bezierCurveTo(0.285, -0.074, 0.335, -0.025, mTipX, 0.012);
      if (p.open > 0.02) {
        c.quadraticCurveTo(0.305, 0.022, mhX, mhY);
        c.lineTo(mTipX - 0.008, mTipY);
        c.quadraticCurveTo(0.30, 0.068 + p.open * 0.02, 0.185, 0.09 + p.open * 0.008);
      } else {
        c.quadraticCurveTo(0.315, 0.03, mhX, mhY);
        c.quadraticCurveTo(0.312, 0.034, 0.338, 0.028);
        c.quadraticCurveTo(0.288, 0.076, 0.185, 0.09);
      }
      c.bezierCurveTo(0.05, 0.114, -0.085, 0.084, -0.182, 0.028);
    },
    lin(c, 0.05, -0.115, 0.05, 0.11, [
      [0, "#f2ecf2"],
      [0.35, PEARL],
      [0.85, CREAM],
      [1, "#ffdcc2"],
    ]),
    OL,
    LW,
    () => {
      // Iconic Tancho Ruby Crown Spot on forehead!
      c.fillStyle = lin(c, 0.2, -0.09, 0.28, -0.03, [
        [0, "#ff5538"],
        [1, CRIM],
      ]);
      blob(c, 0.245, -0.058, 0.044, 0.026, 0.18);

      // Organic flowing Kohaku crimson & gold Sanke patches on back
      c.fillStyle = lin(c, -0.08, -0.1, 0.12, 0.04, [
        [0, "#ff4d30"],
        [0.65, CRIM],
        [1, "#b81810"],
      ]);
      c.beginPath();
      c.moveTo(0.115, -0.115);
      c.bezierCurveTo(0.145, -0.04, 0.085, 0.03, 0.015, 0.012);
      c.bezierCurveTo(-0.045, -0.005, -0.035, -0.08, 0.025, -0.118);
      c.closePath();
      c.fill();

      c.beginPath();
      c.moveTo(-0.055, -0.095);
      c.bezierCurveTo(-0.025, -0.03, -0.08, 0.045, -0.145, 0.015);
      c.bezierCurveTo(-0.175, 0.0, -0.165, -0.055, -0.115, -0.08);
      c.closePath();
      c.fill();

      // Subtle Sumi ink & gold shimmer accents
      c.fillStyle = "#1b1f2c";
      blob(c, -0.025, -0.045, 0.022, 0.014, -0.3);
      blob(c, -0.125, -0.018, 0.016, 0.01, 0.2);

      c.fillStyle = rgba(GOLD, 0.72);
      blob(c, 0.068, 0.038, 0.028, 0.015, 0.2);

      glow(c, 0.08, -0.06, 0.2, 0.045, 0.0, "255,255,255", 0.35);

      if (p.puff) {
        c.fillStyle = "rgba(255, 155, 165, 0.55)";
        blob(c, 0.24, 0.048, 0.026, 0.016, 0);
      }
    }
  );

  // ---- 6. Silky Golden Koi Barbels (Kumis) ----
  c.strokeStyle = OL;
  c.lineWidth = LW * 1.15;
  c.beginPath();
  c.moveTo(0.325, 0.028);
  c.bezierCurveTo(0.355, 0.065, 0.335, 0.115 + s2 * 0.01, 0.285, 0.122 + s2 * 0.014);
  c.stroke();
  c.strokeStyle = GOLD;
  c.lineWidth = LW * 0.65;
  c.stroke();

  // ---- 7. Broad Butterfly Veil Pectoral Fin ----
  c.save();
  c.translate(0.118, 0.032);
  c.rotate(s2 * 0.22);
  fillStroke(
    c,
    () => {
      c.moveTo(0, 0);
      c.bezierCurveTo(-0.035, -0.038, -0.142, -0.018, -0.132, 0.052);
      c.bezierCurveTo(-0.115, 0.115, -0.022, 0.086, 0, 0.018);
    },
    lin(c, 0, 0, -0.13, 0.048, [
      [0, rgba(GOLD, 0.9)],
      [0.6, rgba(FIN, 0.9)],
      [1, "rgba(255, 255, 255, 0.94)"],
    ]),
    OL,
    LW * 0.7,
    () => {
      c.strokeStyle = "rgba(255, 255, 255, 0.65)";
      c.lineWidth = 0.0026;
      for (let r = -1; r <= 2; r++) {
        c.beginPath();
        c.moveTo(-0.008, 0.004);
        c.lineTo(-0.108, r * 0.024 + 0.015);
        c.stroke();
      }
    }
  );
  c.restore();

  // ---- 8. Expressive Koi Eye ----
  const ex = 0.232,
    ey = -0.028 - p.open * 0.004,
    er = 0.038;
  eye(c, ex, ey, er, {
    iris: pal.iris || "#1e2433",
    expr: p.expr,
    ol: OL,
    sx: 0.94,
    look: 0.24,
    irisR: 0.62,
    pupilR: 0.36,
    happyCol: CRIM,
  });
}

// =====================================================================================
// MOCHI (AXOLOTL KRISTAL) — Adorable Sakura Crystal Axolotl:
//   plush pastel-pink body with cute wide smile, 3 pairs of fluffy magenta-coral
//   feather gill fronds, tiny paddle feet, and shimmering crystal-ribbon tail!
// =====================================================================================
function drawAxolotl(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const PINK = pal.body || "#ffb6d9",
    DK = pal.dark || "#db5c98",
    BELLY = pal.belly || "#fff2f9",
    GILL = pal.fin || "#ff3f82",
    CRYS = pal.spot || "#6ef7ff",
    OL = rgba(pal.outline || "#4d1234", 0.9);
  const LW = 0.0064;
  const s = p.wag,
    s2 = p.wag2;

  // ---- 1. Translucent Glowing Dorsal-to-Tail Ribbon Crest ----
  c.save();
  c.translate(-0.145, 0.0);
  c.rotate(s * 0.16);
  fillStroke(
    c,
    () => {
      c.moveTo(0.115, -0.072);
      c.bezierCurveTo(-0.02, -0.148, -0.205, -0.145 + s2 * 0.018, -0.268, 0.0 + s2 * 0.02);
      c.bezierCurveTo(-0.205, 0.125 + s2 * 0.018, -0.045, 0.11, 0.055, 0.042);
      c.closePath();
    },
    lin(c, 0.05, -0.12, -0.26, 0.06, [
      [0, rgba(PINK, 0.85)],
      [0.55, rgba(GILL, 0.68)],
      [1, rgba(CRYS, 0.85)],
    ]),
    OL,
    LW * 0.78,
    () => {
      c.fillStyle = "rgba(255, 255, 255, 0.55)";
      blob(c, -0.14, -0.032, 0.014, 0.009, -0.2);
      blob(c, -0.19, 0.022, 0.011, 0.007, 0.1);
    }
  );
  c.restore();

  // ---- 2. Back Little Swimming Paddle Foot ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.075, 0.068);
      c.bezierCurveTo(-0.095, 0.135, -0.145, 0.155 - s2 * 0.01, -0.148, 0.118);
      c.bezierCurveTo(-0.142, 0.092, -0.105, 0.078, -0.095, 0.065);
    },
    PINK,
    OL,
    LW * 0.75
  );

  // ---- 3. Open Cute Mouth Interior ----
  const mhX = 0.242,
    mhY = 0.042;
  const mTipX = 0.348 - p.open * 0.008;
  const mTipY = 0.035 + p.open * 0.056;
  if (p.open > 0.02) {
    c.beginPath();
    c.moveTo(0.28, 0.022);
    c.lineTo(mTipX, 0.022);
    c.quadraticCurveTo(0.308, 0.045 + p.open * 0.035, mhX, mhY);
    c.closePath();
    c.fillStyle = "#7a1440";
    c.fill();
  }

  // ---- 4. Chubby Pastel Sakura Axolotl Body & Rounded Head ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.195, -0.026);
      c.bezierCurveTo(-0.10, -0.078, 0.06, -0.098, 0.185, -0.102);
      c.bezierCurveTo(0.275, -0.105, 0.338, -0.052, mTipX, 0.022);
      if (p.open > 0.02) {
        c.quadraticCurveTo(0.302, 0.032, mhX, mhY);
        c.lineTo(mTipX - 0.008, mTipY);
        c.quadraticCurveTo(0.295, 0.08 + p.open * 0.02, 0.175, 0.095 + p.open * 0.008);
      } else {
        c.quadraticCurveTo(0.312, 0.044, mhX, mhY);
        c.quadraticCurveTo(0.308, 0.048, 0.335, 0.038);
        c.quadraticCurveTo(0.285, 0.086, 0.175, 0.095);
      }
      c.bezierCurveTo(0.055, 0.108, -0.085, 0.082, -0.195, 0.026);
    },
    lin(c, 0.06, -0.105, 0.06, 0.105, [
      [0, DK],
      [0.32, PINK],
      [0.75, BELLY],
      [1, "#ffe8f5"],
    ]),
    OL,
    LW,
    () => {
      glow(c, 0.08, -0.055, 0.2, 0.045, 0.0, "255,255,255", 0.32);
      // Shimmering crystal spots along flank & cheek blush
      c.fillStyle = rgba(CRYS, 0.85);
      blob(c, 0.06, -0.038, 0.011, 0.008, 0.15);
      blob(c, -0.03, -0.025, 0.012, 0.009, -0.2);
      blob(c, -0.11, -0.012, 0.01, 0.007, 0.1);
      blob(c, 0.01, 0.028, 0.009, 0.0065, 0.0);

      // Rosy kawaii cheek blush
      c.fillStyle = rgba(GILL, p.puff ? 0.55 : 0.34);
      blob(c, 0.235, 0.036, 0.026, 0.015, 0.08);
    }
  );

  // ---- 5. Fluffy Feather Gill Fronds (3 Iconic Plumes Behind Head!) ----
  const gills: [number, number, number][] = [
    [-2.18, 0.128, -0.048],
    [-2.52, 0.142, -0.018],
    [2.85, 0.122, 0.018],
  ];
  for (let i = 0; i < gills.length; i++) {
    const [ang, glen, gy] = gills[i];
    c.save();
    c.translate(0.145, gy);
    c.rotate(ang + s2 * (0.1 + i * 0.03));
    fillStroke(
      c,
      () => {
        c.moveTo(0, -0.01);
        c.bezierCurveTo(glen * 0.35, -0.034, glen * 0.72, -0.024, glen, 0);
        c.bezierCurveTo(glen * 0.72, 0.024, glen * 0.35, 0.034, 0, 0.01);
      },
      lin(c, 0, 0, glen, 0, [
        [0, PINK],
        [0.45, GILL],
        [1, "#ff87b5"],
      ]),
      OL,
      LW * 0.68,
      () => {
        c.strokeStyle = rgba(CRYS, 0.65);
        c.lineWidth = 0.0024;
        c.beginPath();
        c.moveTo(0.01, 0);
        c.lineTo(glen * 0.85, 0);
        c.stroke();
      }
    );
    c.restore();
  }

  // ---- 6. Cute Front Paddle Arm ----
  c.save();
  c.translate(0.092, 0.056);
  c.rotate(0.35 + s2 * 0.16);
  fillStroke(
    c,
    () => {
      c.moveTo(0, -0.012);
      c.bezierCurveTo(0.012, 0.045, -0.025, 0.085, -0.048, 0.055);
      c.bezierCurveTo(-0.056, 0.032, -0.025, 0.005, -0.012, -0.01);
    },
    lin(c, 0, 0, -0.04, 0.06, [
      [0, PINK],
      [1, BELLY],
    ]),
    OL,
    LW * 0.72
  );
  c.restore();

  // ---- 7. Sparkling Kawaii Axolotl Eye ----
  const ex = 0.242,
    ey = -0.032 - p.open * 0.004,
    er = 0.038;
  eye(c, ex, ey, er, {
    iris: pal.iris || "#28143b",
    expr: p.expr,
    ol: OL,
    sx: 0.94,
    look: 0.24,
    irisR: 0.66,
    pupilR: 0.42,
    happyCol: GILL,
  });
}

// =====================================================================================
// ASTRO (STARLIGHT WHALE SHARK) — Celestial Gentle Giant:
//   iconic broad whale-shark profile with wide smiling front mouth, sweeping azure
//   pectoral wings, and glowing star-constellation spots & aurora stripes across back!
// =====================================================================================
function drawWhaleshark(c: Ctx, sp: Species, p: Pose) {
  const pal = sp.pal;
  const NAVY = pal.body || "#163a7a",
    DK = pal.dark || "#0a1a42",
    BELLY = pal.belly || "#e8f6ff",
    FIN = pal.fin || "#1d4b96",
    CYAN = pal.stripe || "#5ce6ff",
    STAR = pal.spot || "#fff4b8",
    OL = rgba(pal.outline || "#050d24", 0.92);
  const LW = 0.0066;
  const s = p.wag,
    s2 = p.wag2;

  // ---- 1. Crescent Whale Shark Tail ----
  c.save();
  c.translate(-0.22, 0.0);
  c.rotate(s * 0.16);
  fillStroke(
    c,
    () => {
      c.moveTo(0.015, -0.022);
      c.bezierCurveTo(-0.07, -0.115, -0.155, -0.195 + s2 * 0.015, -0.215, -0.195 + s2 * 0.018);
      c.bezierCurveTo(-0.175, -0.095, -0.135, -0.025, -0.135, 0.0);
      c.bezierCurveTo(-0.135, 0.025, -0.155, 0.088, -0.182, 0.148 + s2 * 0.016);
      c.bezierCurveTo(-0.118, 0.122, -0.05, 0.068, 0.015, 0.022);
    },
    lin(c, 0, -0.18, -0.2, 0.14, [
      [0, DK],
      [0.5, NAVY],
      [1, FIN],
    ]),
    OL,
    LW * 0.88,
    () => {
      c.fillStyle = rgba(STAR, 0.8);
      blob(c, -0.12, -0.09, 0.007, 0.006, 0);
      blob(c, -0.155, -0.13, 0.006, 0.005, 0);
    }
  );
  c.restore();

  // ---- 2. Tall Rounded Primary & Small Secondary Dorsal Fins ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.04, -0.088);
      c.bezierCurveTo(-0.045, -0.185, 0.01, -0.228, 0.045, -0.205);
      c.bezierCurveTo(0.055, -0.175, 0.055, -0.122, 0.07, -0.095);
    },
    lin(c, 0.01, -0.22, 0.01, -0.088, [
      [0, CYAN],
      [0.24, FIN],
      [1, DK],
    ]),
    OL,
    LW * 0.84,
    () => {
      c.fillStyle = rgba(STAR, 0.85);
      blob(c, 0.012, -0.155, 0.0065, 0.0065, 0);
      blob(c, 0.028, -0.13, 0.0055, 0.0055, 0);
    }
  );

  fillStroke(
    c,
    () => {
      c.moveTo(-0.175, -0.036);
      c.bezierCurveTo(-0.178, -0.088, -0.142, -0.098, -0.125, -0.055);
    },
    FIN,
    OL,
    LW * 0.78
  );

  // ---- 3. Wide Gentle-Giant Mouth Interior ----
  const mhX = 0.285,
    mhY = 0.042;
  const mTipX = 0.378 - p.open * 0.008;
  const mTipY = 0.035 + p.open * 0.058;
  if (p.open > 0.02) {
    c.beginPath();
    c.moveTo(0.315, 0.018);
    c.lineTo(mTipX, 0.018);
    c.quadraticCurveTo(0.34, 0.048 + p.open * 0.036, mhX, mhY);
    c.closePath();
    c.fillStyle = "#17254a";
    c.fill();
    c.fillStyle = "#4874b8";
    blob(c, 0.325, 0.035 + p.open * 0.018, 0.024, 0.01 + p.open * 0.006, 0.1);
  }

  // ---- 4. Broad Whale Shark Body & Celestial Star-Constellation Back ----
  fillStroke(
    c,
    () => {
      c.moveTo(-0.228, -0.022);
      c.bezierCurveTo(-0.12, -0.092, 0.065, -0.118, 0.235, -0.102);
      c.bezierCurveTo(0.325, -0.092, 0.378, -0.045, mTipX, 0.018);
      if (p.open > 0.02) {
        c.quadraticCurveTo(0.335, 0.028, mhX, mhY);
        c.lineTo(mTipX - 0.008, mTipY);
        c.quadraticCurveTo(0.325, 0.078 + p.open * 0.018, 0.195, 0.088 + p.open * 0.008);
      } else {
        c.quadraticCurveTo(0.345, 0.038, mhX, mhY);
        c.quadraticCurveTo(0.34, 0.044, 0.365, 0.035);
        c.quadraticCurveTo(0.315, 0.082, 0.195, 0.088);
      }
      c.bezierCurveTo(0.055, 0.102, -0.105, 0.068, -0.228, 0.022);
    },
    lin(c, 0.05, -0.11, 0.05, 0.1, [
      [0, DK],
      [0.45, NAVY],
      [0.72, "#2255a6"],
      [0.76, BELLY],
      [1, "#cbe7ff"],
    ]),
    OL,
    LW,
    () => {
      // Celestial pale transverse bands & glowing star-constellation spots
      c.strokeStyle = rgba(CYAN, 0.36);
      c.lineWidth = 0.0042;
      for (let i = -3; i <= 2; i++) {
        const bx = i * 0.058 + 0.02;
        c.beginPath();
        c.moveTo(bx, -0.11);
        c.quadraticCurveTo(bx - 0.008, -0.045, bx, 0.012);
        c.stroke();
      }
      const stars: [number, number, number][] = [
        [0.24, -0.065, 0.0075],
        [0.18, -0.042, 0.006],
        [0.12, -0.072, 0.0085],
        [0.065, -0.032, 0.007],
        [0.01, -0.068, 0.008],
        [-0.045, -0.028, 0.0065],
        [-0.095, -0.055, 0.0075],
        [-0.145, -0.018, 0.006],
        [0.095, 0.002, 0.0055],
        [-0.015, 0.004, 0.0055],
      ];
      for (const [sx, sy, sr] of stars) {
        c.fillStyle = STAR;
        c.beginPath();
        c.arc(sx, sy, sr, 0, TAU);
        c.fill();
        c.fillStyle = rgba(CYAN, 0.45);
        c.beginPath();
        c.arc(sx, sy, sr * 1.45, 0, TAU);
        c.fill();
      }

      // Soft gill slits behind cheek
      c.strokeStyle = rgba(DK, 0.72);
      c.lineWidth = 0.0042;
      for (let g = 0; g < 4; g++) {
        const gx = 0.145 + g * 0.015;
        c.beginPath();
        c.moveTo(gx, -0.025);
        c.quadraticCurveTo(gx - 0.004, 0.005, gx, 0.034);
        c.stroke();
      }

      if (p.puff) {
        c.fillStyle = "rgba(130, 225, 255, 0.45)";
        blob(c, 0.26, 0.045, 0.028, 0.016, 0);
      }
    }
  );

  // ---- 5. Sweeping Broad Pectoral Wing Fin ----
  c.save();
  c.translate(0.115, 0.048);
  c.rotate(s2 * 0.14);
  fillStroke(
    c,
    () => {
      c.moveTo(0, 0);
      c.bezierCurveTo(-0.02, 0.055, -0.105, 0.125, -0.135, 0.105);
      c.bezierCurveTo(-0.118, 0.055, -0.068, 0.012, -0.028, -0.012);
    },
    lin(c, 0, 0, -0.12, 0.1, [
      [0, NAVY],
      [0.7, FIN],
      [1, CYAN],
    ]),
    OL,
    LW * 0.78,
    () => {
      c.fillStyle = rgba(STAR, 0.85);
      blob(c, -0.065, 0.048, 0.0065, 0.0055, 0);
      blob(c, -0.095, 0.072, 0.0055, 0.005, 0);
    }
  );
  c.restore();

  // ---- 6. Friendly Gentle Whale Shark Eye ----
  const ex = 0.278,
    ey = -0.026 - p.open * 0.004,
    er = 0.034;
  eye(c, ex, ey, er, {
    iris: pal.iris || "#38bdf8",
    expr: p.expr,
    ol: OL,
    sx: 0.96,
    look: 0.26,
    irisR: 0.62,
    pupilR: 0.36,
    happyCol: "#ffffff",
  });
}

export function renderCustomFish(sp: Species, W: number, jawState: number, tailFrame: number, tailFrames: number, expr: Expr): HTMLCanvasElement {
  const st = sp.style as CustomStyle;
  const H = Math.max(20, Math.round(W * ASPECT[st]));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;
  c.lineJoin = "round";
  c.lineCap = "round";
  const ang = (tailFrame / tailFrames) * TAU;
  const pose: Pose = {
    open: jawState > 0 ? Math.min(1, jawState / 6) : 0,
    puff: jawState === -1,
    wag: Math.sin(ang),
    wag2: Math.sin(ang - 1.0),
    expr,
  };
  c.translate(W / 2, H / 2);
  c.scale(W, W);
  if (st === "clown") drawClown(c, sp, pose);
  else if (st === "idol") drawIdol(c, sp, pose);
  else if (st === "shark") drawShark(c, sp, pose);
  else if (st === "shark_sleek") drawSharkSleek(c, sp, pose);
  else if (st === "boris") drawBoris(c, sp, pose);
  else if (st === "andy") drawAndy(c, sp, pose);
  else if (st === "tang") drawTang(c, sp, pose);
  else if (st === "leon") drawLeon(c, sp, pose);
  else if (st === "orca") drawOrca(c, sp, pose);
  else if (st === "barracuda") drawBarracuda(c, sp, pose);
  else if (st === "sailfish") drawSailfish(c, sp, pose);
  else if (st === "eddy") drawEddy(c, sp, pose);
  else if (st === "stingray") drawStingray(c, sp, pose);
  else if (st === "mandarin") drawMandarin(c, sp, pose);
  else if (st === "aurora") drawAurora(c, sp, pose);
  else if (st === "narwhal") drawNarwhal(c, sp, pose);
  else if (st === "seadragon") drawSeadragon(c, sp, pose);
  else if (st === "koi") drawKoi(c, sp, pose);
  else if (st === "axolotl") drawAxolotl(c, sp, pose);
  else if (st === "whaleshark") drawWhaleshark(c, sp, pose);
  else drawLeopard(c, sp, pose);
  return cv;
}
