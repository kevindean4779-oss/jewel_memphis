import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Dims } from './types';
import { dimsOk } from './pricing';

type CadView = 'front' | 'side' | 'top' | 'angled';
const VIEWS: [CadView, string, string][] = [
  ['front', 'Front', 'Width × Height'],
  ['side', 'Side', 'Depth × Height'],
  ['top', 'Top', 'Width × Depth'],
  ['angled', 'Angled', 'All three'],
];

function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
const WEBGL_OK = detectWebGL();

// Read a design token so the canvas follows light and dark themes.
function css(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// Exact outline: an ellipse of width × height, extruded to depth. Bounding box = W × H × D.
function cadGeometry(d: Dims): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, d.w / 2, d.h / 2, 0, Math.PI * 2, false, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d.d, bevelEnabled: false, curveSegments: 96 });
  geo.center();
  return geo;
}

function cadCamera(view: CadView, d: Dims, aspect: number): { cam: THREE.Camera; span: number | null } {
  const max = Math.max(d.w, d.h, d.d);
  if (view === 'angled') {
    const cam = new THREE.PerspectiveCamera(30, aspect, 1, 5000);
    cam.position.set(max * 1.6, max * 1.1, max * 2.0);
    cam.lookAt(0, 0, 0);
    return { cam, span: null };
  }
  const span = max * 0.62;
  const cam = new THREE.OrthographicCamera(-span * aspect, span * aspect, span, -span, 0.1, 5000);
  if (view === 'front') cam.position.set(0, 0, 1000);
  if (view === 'side') cam.position.set(1000, 0, 0);
  if (view === 'top') {
    cam.up.set(0, 0, -1);
    cam.position.set(0, 1000, 0);
  }
  cam.lookAt(0, 0, 0);
  return { cam, span };
}

function drawDimLines(
  ctx: CanvasRenderingContext2D, hx: number, vy: number, lh: string, lv: string,
  W: number, H: number, px: number,
) {
  const cx = W / 2, cy = H / 2, hw = (hx * px) / 2, hh = (vy * px) / 2;
  ctx.strokeStyle = css('--text-3', '#8D887E');
  ctx.fillStyle = css('--text', '#1A1917');
  ctx.lineWidth = 1.2;
  ctx.font = '600 15px Inter, system-ui, sans-serif';
  const yb = cy + hh + 26;
  ctx.beginPath(); ctx.moveTo(cx - hw, yb); ctx.lineTo(cx + hw, yb); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillText(lh, cx, yb + 18);
  const xr = cx + hw + 26;
  ctx.beginPath(); ctx.moveTo(xr, cy - hh); ctx.lineTo(xr, cy + hh); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillText(lv, xr + 8, cy + 5);
}

export function CadViews({ dims }: { dims: Dims }) {
  const canvases = useRef<Partial<Record<CadView, HTMLCanvasElement | null>>>({});
  const { w, h, d } = dims;

  const valid = dimsOk(dims);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!WEBGL_OK || !dimsOk({ w, h, d })) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true); // e.g. the GPU refused a context; show the size instead of crashing
      return;
    }
    const geo = cadGeometry({ w, h, d });
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.55, roughness: 0.35 });
    const lines: Partial<Record<CadView, [number, number, string, string]>> = {
      front: [w, h, `Width ${w} mm`, `Height ${h} mm`],
      side: [d, h, `Depth ${d} mm`, `Height ${h} mm`],
      top: [w, d, `Width ${w} mm`, `Depth ${d} mm`],
    };

    VIEWS.forEach(([view]) => {
      const c = canvases.current[view];
      if (!c) return;
      const W = c.width, H = c.height;
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geo, mat));
      scene.add(new THREE.HemisphereLight(0xfff6e0, 0x6b5a34, 1.6));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(1, 1.5, 2);
      scene.add(key);
      const { cam, span } = cadCamera(view, { w, h, d }, W / H);
      renderer.setSize(W, H, false);
      renderer.render(scene, cam);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = css('--surface-2', '#F1EFEA');
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(renderer.domElement, 0, 0, W, H);
      const line = lines[view];
      if (span && line) {
        const [hx, vy, lh, lv] = line;
        drawDimLines(ctx, hx, vy, lh, lv, W, H, H / (2 * span));
      }
    });

    return () => {
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [w, h, d]);

  if (!valid) return <div className="card muted">Enter a valid size to see the CAD views.</div>;

  return (
    <div className="cad-grid">
      {VIEWS.map(([view, name, cap]) => (
        <div className="cad-cell" key={view}>
          <div className="hd"><span>{name}</span><span>{cap}</span></div>
          {WEBGL_OK && !failed ? (
            <canvas
              ref={el => { canvases.current[view] = el; }}
              width={640}
              height={400}
            />
          ) : (
            <div className="muted" style={{ padding: '48px 12px', textAlign: 'center' }}>
              3D viewer unavailable offline. Size: {w} × {h} × {d} mm
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
