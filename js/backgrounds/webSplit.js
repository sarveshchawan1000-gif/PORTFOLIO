/**
 * webSplit.js — Spider-Man inspired "Web Split" background
 *
 * Interface matches nightcity.js and circuit.js:
 *   constructor()
 *   init(width, height)
 *   resize(width, height)
 *   setMouse(x, y)
 *   update(reducedMotion, lowFpsMode)
 *   draw(ctx, width, height, reducedMotion, lowFpsMode)
 *
 * Features:
 *   - Dark red / dark blue diagonal split behind #090B16 base
 *   - Comic-panel jagged seam that eases toward cursor x, tilts with cursor y
 *   - Idle sine-wave drift when no pointer is active
 *   - Centered orb-web: 16 spokes, 13 rings (power-curve spacing), ring threads
 *     drawn as quadratic curves with slight sag between spokes
 *   - 6-8 long anchor threads from screen edges toward the web center
 *   - Strands within 170 px of cursor bend toward it
 *   - Very slow overall web rotation
 *   - Light pulse traveling along a random spoke every 1-2 seconds
 *   - Faint halftone dot band along the seam (comic style)
 *   - prefers-reduced-motion: seam held still, no rotation, no cursor deflection
 *   - Low-FPS fallback: reduce to 9 rings, 12 spokes
 */

'use strict';

class WebSplitBackground {
  constructor() {
    this.initialized  = false;
    this.tick         = 0;

    // Seam state
    this.seamX        = 0;     // current x at midheight (in logical px)
    this.seamTargetX  = 0;
    this.seamAngle    = 0;     // radians; positive = tilted right at bottom
    this.seamTargetAngle = 0;
    this.idlePhase    = 0;

    // Transition sweep
    this.isSweeping   = false;
    this.sweepFrame   = 0;
    this.sweepDuration = 25;

    // Mouse
    this.mouseX       = -9999;
    this.mouseY       = -9999;
    this.hasPointer   = false;

    // Web rotation
    this.webAngle     = 0;

    // Pulses: { spoke, progress, active }
    this.pulse        = { spoke: 0, progress: 0, active: false };
    this.pulseTimer   = 0;
    this.nextPulseIn  = 90; // frames

    // Halftone dot data (static, recomputed on resize)
    this.dots         = [];
  }

  // ─── init / resize ────────────────────────────────────────────────────────

  init(width, height) {
    this.width  = width;
    this.height = height;

    this.seamX        = width * 0.5;
    this.seamTargetX  = width * 0.5;
    this.seamAngle    = 0;
    this.seamTargetAngle = 0;
    this.idlePhase    = 0;
    this.webAngle     = 0;

    if (this.mouseX === -9999) {
      this.mouseX = width  * 0.5;
      this.mouseY = height * 0.5;
    }

    this._buildDots(width, height);
    this.initialized = true;
  }

  resize(width, height) { this.init(width, height); }

  setMouse(x, y) {
    this.mouseX    = x;
    this.mouseY    = y;
    this.hasPointer = true;
  }

  triggerSweep() {
    this.isSweeping = true;
    this.sweepFrame = 0;
    this.sweepDuration = 25;
  }

  destroy() {
    this.initialized = false;
    this.dots = [];
  }

  // ─── halftone dot band (static geometry) ──────────────────────────────────

  _buildDots(width, height) {
    this.dots = [];
    const band   = 80;          // half-width of band around seam
    const spacing = 9;
    for (let y = 0; y < height; y += spacing) {
      for (let dx = -band; dx <= band; dx += spacing) {
        const distRatio = Math.abs(dx) / band;   // 0 at seam, 1 at edge
        const r = (1 - distRatio) * 1.9 + 0.25; // max radius 2.15, min 0.25
        this.dots.push({ dx, y, r });
      }
    }
  }

  // ─── update (called each frame) ───────────────────────────────────────────

  update(reducedMotion, lowFpsMode) {
    this.tick++;

    if (reducedMotion) {
      // Keep seam still, no rotation, no drift
      this.seamX     = this.width * 0.5;
      this.seamAngle = 0;
      return;
    }

    // Idle drift when no pointer
    if (!this.hasPointer) {
      this.idlePhase    += 0.008;
      this.seamTargetX   = this.width * (0.5 + Math.sin(this.idlePhase) * 0.09);
      this.seamTargetAngle = 0;
    } else {
      // Seam x tracks pointer x (6 % per frame easing)
      const normX         = (this.mouseX / this.width) - 0.5;  // -0.5 .. +0.5
      this.seamTargetX    = this.width * (0.5 + normX * 0.18);
      // Angle tilts with pointer y: top → negative tilt, bottom → positive
      const normY         = (this.mouseY / this.height) - 0.5;
      this.seamTargetAngle = normY * 0.12;                       // ~±7 deg
    }

    if (this.isSweeping && !reducedMotion) {
      this.sweepFrame++;
      const p = Math.min(1, this.sweepFrame / this.sweepDuration);
      const ease = 1 - Math.pow(1 - p, 3);
      this.seamX = (-this.width * 0.3) + (this.seamTargetX - (-this.width * 0.3)) * ease;
      if (this.sweepFrame >= this.sweepDuration) {
        this.isSweeping = false;
      }
    } else {
      this.seamX += (this.seamTargetX - this.seamX) * 0.06;
    }
    this.seamAngle += (this.seamTargetAngle - this.seamAngle) * 0.06;

    // Slow web rotation
    this.webAngle  += 0.00018;

    // Pulse lifecycle
    if (!this.pulse.active) {
      this.pulseTimer++;
      if (this.pulseTimer >= this.nextPulseIn) {
        this.pulse.active   = true;
        this.pulse.spoke    = Math.floor(Math.random() * 16);
        this.pulse.progress = 0;
        this.pulseTimer     = 0;
        this.nextPulseIn    = 60 + Math.random() * 60; // 1-2 s at 60 fps
      }
    } else {
      this.pulse.progress += lowFpsMode ? 0.018 : 0.012;
      if (this.pulse.progress >= 1) this.pulse.active = false;
    }
  }

  // ─── draw ─────────────────────────────────────────────────────────────────

  draw(a, b, c, d, e) {
    let ctx, width, height, reducedMotion, lowFpsMode;
    if (a && typeof a.fillRect === 'function') {
      ctx = a;
      width = b || this.width;
      height = c || this.height;
      reducedMotion = !!d;
      lowFpsMode = !!e;
    } else {
      ctx = this.ctx || window.ctx;
      width = this.width;
      height = this.height;
      reducedMotion = false;
      lowFpsMode = false;
      if (b && typeof b.x === 'number') {
        this.setMouse(b.x, b.y);
      }
    }

    if (!this.initialized) this.init(width, height);

    const spokeCount = lowFpsMode ? 12 : 16;
    const ringCount  = lowFpsMode ?  9 : 13;

    // ── 1. Base fill ────────────────────────────────────────────────────────
    ctx.fillStyle = '#090B16';
    ctx.fillRect(0, 0, width, height);

    // ── 2. Seam geometry ────────────────────────────────────────────────────
    // The seam passes through (seamX, height/2) at angle seamAngle.
    // We represent it as a function: seamXatY(y)
    const seamXatY = (y) => this.seamX + Math.tan(this.seamAngle) * (y - height * 0.5);

    // ── 3. Colour fills (red left, blue right) ───────────────────────────────
    // Red section
    ctx.fillStyle = '#611519';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(seamXatY(0), 0);
    for (let y = 0; y <= height; y += 32) {
      ctx.lineTo(seamXatY(y), y);
    }
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Blue section
    ctx.fillStyle = '#162f74';
    ctx.beginPath();
    ctx.moveTo(seamXatY(0), 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height);
    for (let y = height; y >= 0; y -= 32) {
      ctx.lineTo(seamXatY(y), y);
    }
    ctx.closePath();
    ctx.fill();

    // ── 4. Jagged comic-panel seam ──────────────────────────────────────────
    this._drawSeam(ctx, width, height, seamXatY);

    // ── 5. Halftone dot band ─────────────────────────────────────────────────
    this._drawHalftone(ctx, height, seamXatY);

    // ── 6. Anchor threads ────────────────────────────────────────────────────
    const webCx = seamXatY(height * 0.5);
    const webCy = height * 0.5;
    this._drawAnchorThreads(ctx, width, height, webCx, webCy, reducedMotion);

    // ── 7. Orb web ───────────────────────────────────────────────────────────
    this._drawOrbWeb(ctx, webCx, webCy, width, height, spokeCount, ringCount, reducedMotion);

    // ── 8. Pulse ─────────────────────────────────────────────────────────────
    if (this.pulse.active && !reducedMotion) {
      this._drawPulse(ctx, webCx, webCy, width, height, spokeCount);
    }
  }

  // ─── seam ─────────────────────────────────────────────────────────────────

  _drawSeam(ctx, width, height, seamXatY) {
    // Jagged path: straight segments with small random-but-stable offsets
    const segH   = 28;
    const segs   = Math.ceil(height / segH) + 1;
    const jitter = 4; // max px offset

    ctx.strokeStyle = 'rgba(243, 241, 234, 0.85)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();

    // Use tick-stable jitter seeded by segment index (not random per frame)
    for (let i = 0; i <= segs; i++) {
      const y  = i * segH;
      const bx = seamXatY(y);
      // Deterministic offset: hash-ish from index
      const j  = ((i * 37 + 19) % 13 - 6) / 6 * jitter;
      if (i === 0) ctx.moveTo(bx + j, y);
      else         ctx.lineTo(bx + j, y);
    }

    ctx.stroke();
  }

  // ─── halftone dots ────────────────────────────────────────────────────────

  _drawHalftone(ctx, height, seamXatY) {
    ctx.fillStyle = 'rgba(243, 241, 234, 0.07)';
    for (const d of this.dots) {
      const seamX = seamXatY(d.y);
      ctx.beginPath();
      ctx.arc(seamX + d.dx, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── anchor threads ───────────────────────────────────────────────────────

  _drawAnchorThreads(ctx, width, height, cx, cy, reducedMotion) {
    const anchors = [
      { x: 0,         y: 0          },
      { x: width,     y: 0          },
      { x: 0,         y: height     },
      { x: width,     y: height     },
      { x: 0,         y: height*0.4 },
      { x: width,     y: height*0.6 },
      { x: width*0.3, y: 0          },
      { x: width*0.7, y: height     },
    ];

    ctx.strokeStyle = 'rgba(243, 241, 234, 0.14)';
    ctx.lineWidth   = 1;
    ctx.lineCap     = 'round';

    for (const a of anchors) {
      let tx = cx, ty = cy;

      // Pull endpoint toward mouse if close (cursor deflection on anchor)
      if (!reducedMotion && this.hasPointer) {
        const mx = this.mouseX, my = this.mouseY;
        // Find point on the thread closest to mouse (simple midpoint test)
        const midX = (a.x + cx) * 0.5;
        const midY = (a.y + cy) * 0.5;
        const d = Math.hypot(midX - mx, midY - my);
        if (d < 170) {
          const pull = (1 - d / 170) * 14;
          tx = cx + (mx - cx) / (d + 0.001) * pull;
          ty = cy + (my - cy) / (d + 0.001) * pull;
        }
      }

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  }

  // ─── orb web ──────────────────────────────────────────────────────────────

  _orbWebRadius(width, height) {
    return Math.min(width, height) * 0.42;
  }

  _drawOrbWeb(ctx, cx, cy, width, height, spokeCount, ringCount, reducedMotion) {
    const maxR    = this._orbWebRadius(width, height);
    const angle0  = reducedMotion ? 0 : this.webAngle;

    // Compute spoke tips (possibly deflected by cursor)
    const tipX = [], tipY = [];
    for (let s = 0; s < spokeCount; s++) {
      const a  = angle0 + (s / spokeCount) * Math.PI * 2;
      let ex   = cx + Math.cos(a) * maxR;
      let ey   = cy + Math.sin(a) * maxR;

      // Deflect toward cursor if close
      if (!reducedMotion && this.hasPointer) {
        const d = Math.hypot(ex - this.mouseX, ey - this.mouseY);
        if (d < 170) {
          const pull = (1 - d / 170) * 18;
          ex += (this.mouseX - ex) * pull / (d + 0.001);
          ey += (this.mouseY - ey) * pull / (d + 0.001);
        }
      }

      tipX.push(ex);
      tipY.push(ey);
    }

    // Ring distances: power curve, exponent 1.2
    const ringDists = [];
    for (let r = 0; r < ringCount; r++) {
      const t = (r + 1) / ringCount;
      ringDists.push(Math.pow(t, 1.2) * maxR);
    }

    // Which side hovered? Boost alpha on that side
    const leftAlpha  = (!reducedMotion && this.hasPointer && this.mouseX < cx) ? 0.38 : 0.28;
    const rightAlpha = (!reducedMotion && this.hasPointer && this.mouseX >= cx) ? 0.38 : 0.28;

    // ── Draw spokes ───────────────────────────────────────────────────────
    for (let s = 0; s < spokeCount; s++) {
      const a      = angle0 + (s / spokeCount) * Math.PI * 2;
      const isLeft = Math.cos(a) < 0;
      ctx.strokeStyle = `rgba(243, 241, 234, ${isLeft ? leftAlpha : rightAlpha})`;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tipX[s], tipY[s]);
      ctx.stroke();
    }

    // ── Draw rings ────────────────────────────────────────────────────────
    for (let r = 0; r < ringCount; r++) {
      const dist = ringDists[r];

      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let s = 0; s < spokeCount; s++) {
        const a  = angle0 + (s / spokeCount) * Math.PI * 2;
        // Node at this ring/spoke intersection
        let nx   = cx + Math.cos(a) * dist;
        let ny   = cy + Math.sin(a) * dist;

        // Deflect ring node toward cursor
        if (!reducedMotion && this.hasPointer) {
          const d = Math.hypot(nx - this.mouseX, ny - this.mouseY);
          if (d < 170) {
            const pull = (1 - d / 170) * 12;
            nx += (this.mouseX - nx) * pull / (d + 0.001);
            ny += (this.mouseY - ny) * pull / (d + 0.001);
          }
        }

        // Sagging thread: midpoint between prev and this node, offset inward
        if (s === 0) {
          ctx.moveTo(nx, ny);
        } else {
          // Compute previous node
          const pa   = angle0 + ((s - 1) / spokeCount) * Math.PI * 2;
          let px2    = cx + Math.cos(pa) * dist;
          let py2    = cy + Math.sin(pa) * dist;

          if (!reducedMotion && this.hasPointer) {
            const d = Math.hypot(px2 - this.mouseX, py2 - this.mouseY);
            if (d < 170) {
              const pull = (1 - d / 170) * 12;
              px2 += (this.mouseX - px2) * pull / (d + 0.001);
              py2 += (this.mouseY - py2) * pull / (d + 0.001);
            }
          }

          // Sag: mid-point pulled slightly toward center
          const sag  = dist * 0.035;
          const midX = (px2 + nx) * 0.5;
          const midY = (py2 + ny) * 0.5;
          // Inward vector
          const len  = Math.hypot(midX - cx, midY - cy) || 1;
          const qx   = midX - ((midX - cx) / len) * sag;
          const qy   = midY - ((midY - cy) / len) * sag;

          ctx.quadraticCurveTo(qx, qy, nx, ny);
        }

        // Colour by side
        const isLeft = Math.cos(a) < 0;
        ctx.strokeStyle = `rgba(243, 241, 234, ${isLeft ? leftAlpha : rightAlpha})`;
      }

      // Close ring back to first node
      const a0   = angle0;
      let nx0    = cx + Math.cos(a0) * dist;
      let ny0    = cy + Math.sin(a0) * dist;
      if (!reducedMotion && this.hasPointer) {
        const d = Math.hypot(nx0 - this.mouseX, ny0 - this.mouseY);
        if (d < 170) {
          const pull = (1 - d / 170) * 12;
          nx0 += (this.mouseX - nx0) * pull / (d + 0.001);
          ny0 += (this.mouseY - ny0) * pull / (d + 0.001);
        }
      }

      const lastA  = angle0 + ((spokeCount - 1) / spokeCount) * Math.PI * 2;
      let pxL      = cx + Math.cos(lastA) * dist;
      let pyL      = cy + Math.sin(lastA) * dist;
      if (!reducedMotion && this.hasPointer) {
        const d = Math.hypot(pxL - this.mouseX, pyL - this.mouseY);
        if (d < 170) {
          const pull = (1 - d / 170) * 12;
          pxL += (this.mouseX - pxL) * pull / (d + 0.001);
          pyL += (this.mouseY - pyL) * pull / (d + 0.001);
        }
      }

      const sag  = dist * 0.035;
      const midX = (pxL + nx0) * 0.5;
      const midY = (pyL + ny0) * 0.5;
      const len  = Math.hypot(midX - cx, midY - cy) || 1;
      const qx   = midX - ((midX - cx) / len) * sag;
      const qy   = midY - ((midY - cy) / len) * sag;
      ctx.quadraticCurveTo(qx, qy, nx0, ny0);

      ctx.stroke();
    }

    // Hub anchor dot
    ctx.fillStyle = 'rgba(243, 241, 234, 0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── pulse ────────────────────────────────────────────────────────────────

  _drawPulse(ctx, cx, cy, width, height, spokeCount) {
    const maxR   = this._orbWebRadius(width, height);
    const a      = this.webAngle + (this.pulse.spoke / spokeCount) * Math.PI * 2;
    const t      = this.pulse.progress;
    const px     = cx + Math.cos(a) * maxR * t;
    const py     = cy + Math.sin(a) * maxR * t;

    // Outer glow bead
    ctx.fillStyle = 'rgba(243, 241, 234, 0.65)';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Bright core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px, py, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Register globally
window.WebSplitBackground = WebSplitBackground;

