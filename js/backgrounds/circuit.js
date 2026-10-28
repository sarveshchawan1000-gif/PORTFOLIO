/**
 * Circuit Board Canvas Background
 * Features:
 * - Dark green printed circuit board (PCB)
 * - 44px geometric grid with silkscreen junction points
 * - ~45 right-angle traces with circular solder pad end nodes
 * - Several IC surface-mount chip packages with pins & pin-1 notches
 * - Racing light pulses along traces that accelerate dynamically near the cursor
 */
class CircuitBackground {
  constructor() {
    this.GRID = 44;
    this.traces = [];
    this.chips = [];
    this.pulses = [];
    this.initialized = false;
    this.tick = 0;

    this.mouseX = -1000;
    this.mouseY = -1000;
  }

  init(width, height) {
    this.width = width;
    this.height = height;

    const cols = Math.floor(width / this.GRID);
    const rows = Math.floor(height / this.GRID);

    // Place 3 to 5 IC Chip packages on the grid
    this.chips = [];
    const chipLocations = [
      { c: Math.floor(cols * 0.18), r: Math.floor(rows * 0.28), w: 3, h: 2, label: 'GEMMA-M4' },
      { c: Math.floor(cols * 0.72), r: Math.floor(rows * 0.22), w: 2, h: 3, label: 'BUS-CTRL' },
      { c: Math.floor(cols * 0.45), r: Math.floor(rows * 0.65), w: 3, h: 3, label: 'CORE-V9' },
      { c: Math.floor(cols * 0.82), r: Math.floor(rows * 0.75), w: 2, h: 2, label: 'RAM-08' }
    ];

    for (const cl of chipLocations) {
      if (cl.c >= 0 && cl.c + cl.w <= cols && cl.r >= 0 && cl.r + cl.h <= rows) {
        this.chips.push({
          x: cl.c * this.GRID,
          y: cl.r * this.GRID,
          width: cl.w * this.GRID,
          height: cl.h * this.GRID,
          label: cl.label
        });
      }
    }

    // Generate ~45 right-angle traces on the 44px grid
    this.traces = [];
    this.pulses = [];
    const traceCount = 45;

    for (let i = 0; i < traceCount; i++) {
      const trace = this.generateTrace(cols, rows);
      if (trace && trace.points.length >= 2) {
        this.traces.push(trace);

        // Assign 1 or 2 pulses per trace
        this.pulses.push({
          traceIndex: this.traces.length - 1,
          progress: Math.random(),
          baseSpeed: 0.003 + Math.random() * 0.005,
          length: 0.12 + Math.random() * 0.1
        });

        if (Math.random() > 0.6) {
          this.pulses.push({
            traceIndex: this.traces.length - 1,
            progress: (Math.random() + 0.5) % 1,
            baseSpeed: 0.003 + Math.random() * 0.005,
            length: 0.1 + Math.random() * 0.08
          });
        }
      }
    }

    this.initialized = true;
  }

  generateTrace(cols, rows) {
    // Pick start grid node
    let startC = Math.floor(Math.random() * (cols - 2)) + 1;
    let startR = Math.floor(Math.random() * (rows - 2)) + 1;

    const points = [{ x: startC * this.GRID, y: startR * this.GRID }];
    const segments = 2 + Math.floor(Math.random() * 3); // 2 to 4 segments with right-angle turns
    let currentC = startC;
    let currentR = startR;
    let horizontal = Math.random() > 0.5;

    for (let s = 0; s < segments; s++) {
      const step = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 4));
      if (horizontal) {
        currentC = Math.max(1, Math.min(cols - 1, currentC + step));
      } else {
        currentR = Math.max(1, Math.min(rows - 1, currentR + step));
      }
      points.push({ x: currentC * this.GRID, y: currentR * this.GRID });
      horizontal = !horizontal; // alternate to enforce right-angle turns
    }

    // Compute total length and segment breakdown for parametric progress
    let totalLen = 0;
    const segLengths = [];
    for (let p = 0; p < points.length - 1; p++) {
      const dx = points[p + 1].x - points[p].x;
      const dy = points[p + 1].y - points[p].y;
      const len = Math.hypot(dx, dy);
      segLengths.push(len);
      totalLen += len;
    }

    if (totalLen === 0) return null;

    return {
      points,
      totalLength: totalLen,
      segmentLengths: segLengths
    };
  }

  getPointAtProgress(trace, progress) {
    let targetDist = (progress % 1) * trace.totalLength;
    let accumulated = 0;

    for (let i = 0; i < trace.segmentLengths.length; i++) {
      const segLen = trace.segmentLengths[i];
      if (accumulated + segLen >= targetDist) {
        const segProgress = (targetDist - accumulated) / segLen;
        const p1 = trace.points[i];
        const p2 = trace.points[i + 1];
        return {
          x: p1.x + (p2.x - p1.x) * segProgress,
          y: p1.y + (p2.y - p1.y) * segProgress
        };
      }
      accumulated += segLen;
    }

    const last = trace.points[trace.points.length - 1];
    return { x: last.x, y: last.y };
  }

  resize(width, height) {
    this.init(width, height);
  }

  setMouse(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  }

  update(reducedMotion, lowFpsMode) {
    this.tick++;

    const activePulseCount = lowFpsMode ? Math.floor(this.pulses.length * 0.5) : this.pulses.length;

    for (let i = 0; i < activePulseCount; i++) {
      const pulse = this.pulses[i];
      const trace = this.traces[pulse.traceIndex];
      if (!trace) continue;

      if (reducedMotion) {
        // Slow constant speed, no cursor acceleration
        pulse.progress = (pulse.progress + pulse.baseSpeed * 0.4) % 1;
      } else {
        // Calculate current position to check proximity to cursor
        const currentPos = this.getPointAtProgress(trace, pulse.progress);
        const dist = Math.hypot(currentPos.x - this.mouseX, currentPos.y - this.mouseY);

        let speedMultiplier = 1;
        const proximityThreshold = 180;
        if (dist < proximityThreshold) {
          // Speed up near cursor (up to 4x faster)
          speedMultiplier = 1 + (1 - dist / proximityThreshold) * 3.8;
        }

        pulse.progress = (pulse.progress + pulse.baseSpeed * speedMultiplier) % 1;
      }
    }
  }

  draw(ctx, width, height, reducedMotion, lowFpsMode) {
    if (!this.initialized) this.init(width, height);

    // Dark green PCB base
    ctx.fillStyle = '#05110b';
    ctx.fillRect(0, 0, width, height);

    // Subtle silkscreen 44px grid dots
    ctx.fillStyle = 'rgba(52, 211, 153, 0.09)';
    const cols = Math.floor(width / this.GRID);
    const rows = Math.floor(height / this.GRID);
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        ctx.fillRect(c * this.GRID - 1, r * this.GRID - 1, 2, 2);
      }
    }

    // Draw Traces
    ctx.strokeStyle = 'rgba(46, 117, 89, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const trace of this.traces) {
      ctx.beginPath();
      ctx.moveTo(trace.points[0].x, trace.points[0].y);
      for (let p = 1; p < trace.points.length; p++) {
        ctx.lineTo(trace.points[p].x, trace.points[p].y);
      }
      ctx.stroke();

      // End nodes (circular solder pads)
      const pStart = trace.points[0];
      const pEnd = trace.points[trace.points.length - 1];

      this.drawSolderPad(ctx, pStart.x, pStart.y);
      this.drawSolderPad(ctx, pEnd.x, pEnd.y);
    }

    // Draw IC Chips
    for (const chip of this.chips) {
      this.drawChip(ctx, chip);
    }

    // Draw Light Pulses racing along traces
    const activePulseCount = lowFpsMode ? Math.floor(this.pulses.length * 0.5) : this.pulses.length;
    for (let i = 0; i < activePulseCount; i++) {
      const pulse = this.pulses[i];
      const trace = this.traces[pulse.traceIndex];
      if (!trace) continue;

      this.drawPulse(ctx, trace, pulse);
    }

    // Subtle edge shading
    const borderMist = ctx.createLinearGradient(0, height - 80, 0, height);
    borderMist.addColorStop(0, 'rgba(5, 17, 11, 0)');
    borderMist.addColorStop(1, 'rgba(9, 11, 22, 0.85)');
    ctx.fillStyle = borderMist;
    ctx.fillRect(0, height - 80, width, 80);
  }

  drawSolderPad(ctx, x, y) {
    ctx.fillStyle = 'rgba(52, 211, 153, 0.65)';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#05110b';
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawChip(ctx, chip) {
    // Chip body
    ctx.fillStyle = '#0c1a14';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(chip.x, chip.y, chip.width, chip.height);
    ctx.strokeRect(chip.x, chip.y, chip.width, chip.height);

    // Index notch (pin 1 circular indent)
    ctx.fillStyle = 'rgba(52, 211, 153, 0.5)';
    ctx.beginPath();
    ctx.arc(chip.x + 8, chip.y + 8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Silvery pin leads on left and right
    const pinSpacing = 11;
    const pinCountH = Math.floor(chip.height / pinSpacing) - 1;
    ctx.fillStyle = 'rgba(209, 213, 219, 0.6)';

    for (let i = 1; i <= pinCountH; i++) {
      const py = chip.y + i * pinSpacing;
      // Left pin
      ctx.fillRect(chip.x - 5, py - 1.5, 5, 3);
      // Right pin
      ctx.fillRect(chip.x + chip.width, py - 1.5, 5, 3);
    }

    // Label text
    ctx.fillStyle = 'rgba(243, 241, 234, 0.7)';
    ctx.font = '9px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chip.label, chip.x + chip.width / 2, chip.y + chip.height / 2);
  }

  drawPulse(ctx, trace, pulse) {
    const head = this.getPointAtProgress(trace, pulse.progress);

    // Pulse head (bright signal bead)
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Tail: sample 3 points behind the head
    for (let step = 1; step <= 3; step++) {
      const tailProgress = pulse.progress - (step * 0.018);
      if (tailProgress > 0) {
        const tailPt = this.getPointAtProgress(trace, tailProgress);
        const tailAlpha = (1 - step / 4) * 0.55;
        ctx.fillStyle = `rgba(110, 231, 183, ${tailAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(tailPt.x, tailPt.y, 2 - step * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Export for browser
window.CircuitBackground = CircuitBackground;

