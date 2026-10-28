/**
 * SpiderWeb Canvas Background
 * Red / Blue split sections with kinetic interactive web-line patterns
 * Features:
 * - Geometric dual-sector split: Red sector (left) and Blue sector (right)
 * - Dual interlocking spider web hubs with radial tension lines and concentric polygon rings
 * - Transverse bridging silk strands with catenary tension
 * - Interactive cursor elastic deflection and dynamic silk tethering
 * - Traveling vibration signal pulses along web threads
 * - Respects prefers-reduced-motion and automatic low FPS throttling
 */
class SpiderWebBackground {
  constructor() {
    this.initialized = false;
    this.tick = 0;

    // Mouse coordinates (target and smoothed)
    this.mouseX = -1000;
    this.mouseY = -1000;
    this.smoothMouseX = -1000;
    this.smoothMouseY = -1000;

    // Web Hub configurations
    this.redHub = null;
    this.blueHub = null;
    this.bridgeStrands = [];
    this.pulses = [];

    // Cursor impulse wave
    this.impulseRadius = 0;
    this.impulseAlpha = 0;
  }

  init(width, height) {
    this.width = width;
    this.height = height;

    if (this.mouseX === -1000) {
      this.mouseX = width / 2;
      this.mouseY = height / 2;
      this.smoothMouseX = width / 2;
      this.smoothMouseY = height / 2;
    }

    // Hub 1: Red Sector — anchored upper-left, partly off-canvas for depth
    this.redHub = this.createWebHub({
      centerX: width * 0.08,
      centerY: height * 0.28,
      radius: Math.min(width * 0.46, 480),
      numRays: 14,
      numRings: 7,
      color: '#E23636',
      accentColor: 'rgba(226, 54, 54, 0.45)',
      ringColor: 'rgba(226, 54, 54, 0.22)'
    });

    // Hub 2: Blue Sector — anchored lower-right, partly off-canvas for depth
    this.blueHub = this.createWebHub({
      centerX: width * 0.92,
      centerY: height * 0.72,
      radius: Math.min(width * 0.46, 480),
      numRays: 14,
      numRings: 7,
      color: '#5B82FF',
      accentColor: 'rgba(91, 130, 255, 0.45)',
      ringColor: 'rgba(91, 130, 255, 0.22)'
    });

    // Intersecting / Bridging Tension Strands between Red and Blue sectors
    this.bridgeStrands = [];
    const bridgeCount = 8;
    for (let i = 0; i < bridgeCount; i++) {
      const t = (i + 0.5) / bridgeCount;
      const p1x = this.redHub.centerX + (Math.random() - 0.5) * this.redHub.radius * 0.7;
      const p1y = this.redHub.centerY + (t - 0.5) * this.redHub.radius * 0.8;
      const p2x = this.blueHub.centerX + (Math.random() - 0.5) * this.blueHub.radius * 0.7;
      const p2y = this.blueHub.centerY + (t - 0.5) * this.blueHub.radius * 0.8;
      this.bridgeStrands.push({
        p1: { x: p1x, y: p1y },
        p2: { x: p2x, y: p2y },
        sag: 20 + i * 6,
        tension: 0.85
      });
    }

    // Initialize traveling signal vibration pulses
    this.pulses = [];
    for (let i = 0; i < 24; i++) {
      this.pulses.push({
        hub: i % 2 === 0 ? 'red' : 'blue',
        rayIndex: Math.floor(Math.random() * 14),
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.008,
        direction: Math.random() > 0.5 ? 1 : -1
      });
    }

    this.initialized = true;
  }

  createWebHub(cfg) {
    const rays = [];
    const angleStep = (Math.PI * 2) / cfg.numRays;

    for (let i = 0; i < cfg.numRays; i++) {
      const angle = i * angleStep;
      const endX = cfg.centerX + Math.cos(angle) * cfg.radius;
      const endY = cfg.centerY + Math.sin(angle) * cfg.radius;

      // Ring nodes along this ray
      const nodes = [];
      for (let r = 1; r <= cfg.numRings; r++) {
        const dist = (r / cfg.numRings) * cfg.radius;
        nodes.push({
          x: cfg.centerX + Math.cos(angle) * dist,
          y: cfg.centerY + Math.sin(angle) * dist,
          baseDist: dist,
          angle
        });
      }

      rays.push({
        angle,
        endX,
        endY,
        nodes
      });
    }

    return {
      ...cfg,
      rays
    };
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

    // Mouse smoothing
    const lerp = reducedMotion ? 0.02 : 0.08;
    this.smoothMouseX += (this.mouseX - this.smoothMouseX) * lerp;
    this.smoothMouseY += (this.mouseY - this.smoothMouseY) * lerp;

    // Pulse updates
    const activePulseCount = lowFpsMode ? 12 : this.pulses.length;
    for (let i = 0; i < activePulseCount; i++) {
      const p = this.pulses[i];
      if (reducedMotion) {
        p.progress = (p.progress + p.speed * 0.4) % 1;
      } else {
        p.progress += p.speed * p.direction;
        if (p.progress > 1) {
          p.progress = 0;
          p.rayIndex = Math.floor(Math.random() * 14);
        } else if (p.progress < 0) {
          p.progress = 1;
          p.rayIndex = Math.floor(Math.random() * 14);
        }
      }
    }
  }

  draw(ctx, width, height, reducedMotion, lowFpsMode) {
    if (!this.initialized) this.init(width, height);

    // Deep obsidian background
    ctx.fillStyle = '#090B16';
    ctx.fillRect(0, 0, width, height);

    // Split Section Tone Overlays
    this.drawSectorSplit(ctx, width, height);

    // Draw Central Seam Thread
    this.drawSeamThread(ctx, width, height);

    // Draw Red and Blue Interlocking Webs
    this.drawWebHub(ctx, this.redHub, reducedMotion, lowFpsMode);
    this.drawWebHub(ctx, this.blueHub, reducedMotion, lowFpsMode);

    // Draw Bridging Tension Strands between Sectors
    this.drawBridgeStrands(ctx, reducedMotion);

    // Draw Traveling Vibration Pulses
    this.drawPulses(ctx, lowFpsMode);

    // Interactive Cursor Web Pluck & Dynamic Tether Lines
    if (!reducedMotion) {
      this.drawCursorTethers(ctx);
    }

    // Subtle edge shading
    const edgeMist = ctx.createLinearGradient(0, height - 70, 0, height);
    edgeMist.addColorStop(0, 'rgba(9, 11, 22, 0)');
    edgeMist.addColorStop(1, 'rgba(9, 11, 22, 0.88)');
    ctx.fillStyle = edgeMist;
    ctx.fillRect(0, height - 70, width, 70);
  }

  drawSectorSplit(ctx, width, height) {
    // Diagonal line splits canvas top-46% to bottom-54%
    const splitXTop = width * 0.46;
    const splitXBottom = width * 0.54;

    // Left Sector (Red tint wash)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(splitXTop, 0);
    ctx.lineTo(splitXBottom, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(226, 54, 54, 0.055)';
    ctx.fill();
    ctx.restore();

    // Right Sector (Blue tint wash)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(splitXTop, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height);
    ctx.lineTo(splitXBottom, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(91, 130, 255, 0.055)';
    ctx.fill();
    ctx.restore();
  }

  drawSeamThread(ctx, width, height) {
    const splitXTop = width * 0.46;
    const splitXBottom = width * 0.54;

    // Central tension dividing thread — crisp single pixel
    ctx.strokeStyle = 'rgba(243, 241, 234, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(splitXTop, 0);
    ctx.lineTo(splitXBottom, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Seam tension junction beads spaced along the dividing line
    const beadCount = 5;
    for (let i = 0; i < beadCount; i++) {
      const t = (i + 1) / (beadCount + 1);
      const bx = splitXTop + (splitXBottom - splitXTop) * t;
      const by = height * t;

      // Alternating red/blue bead pairs
      ctx.fillStyle = i % 2 === 0 ? '#E23636' : '#5B82FF';
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWebHub(ctx, hub, reducedMotion, lowFpsMode) {
    const { centerX, centerY, rays, color, ringColor } = hub;

    // 1. Draw Radial Strands
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1;

    for (let i = 0; i < rays.length; i++) {
      const ray = rays[i];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);

      // Elastic deflection if near cursor
      let targetX = ray.endX;
      let targetY = ray.endY;

      if (!reducedMotion) {
        const dist = Math.hypot(ray.endX - this.smoothMouseX, ray.endY - this.smoothMouseY);
        if (dist < 180) {
          const factor = (1 - dist / 180) * 12;
          targetX += (this.smoothMouseX - ray.endX) * (factor / dist);
          targetY += (this.smoothMouseY - ray.endY) * (factor / dist);
        }
      }

      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // Outer terminal anchor bead
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Concentric Polygon Web Rings
    const ringStep = lowFpsMode ? 2 : 1;
    for (let r = 0; r < hub.numRings; r += ringStep) {
      ctx.beginPath();
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 0.9;

      for (let i = 0; i < rays.length; i++) {
        const node = rays[i].nodes[r];
        let nx = node.x;
        let ny = node.y;

        // Interactive elastic pluck
        if (!reducedMotion) {
          const d = Math.hypot(nx - this.smoothMouseX, ny - this.smoothMouseY);
          if (d < 140) {
            const pull = (1 - d / 140) * 14;
            nx += ((this.smoothMouseX - nx) / d) * pull;
            ny += ((this.smoothMouseY - ny) / d) * pull;
          }
        }

        if (i === 0) {
          ctx.moveTo(nx, ny);
        } else {
          ctx.lineTo(nx, ny);
        }
      }

      // Close polygon loop back to first ray node
      const firstNode = rays[0].nodes[r];
      ctx.lineTo(firstNode.x, firstNode.y);
      ctx.stroke();

      // Junction beads at vertices
      ctx.fillStyle = 'rgba(243, 241, 234, 0.45)';
      for (let i = 0; i < rays.length; i++) {
        const node = rays[i].nodes[r];
        ctx.fillRect(node.x - 1, node.y - 1, 2, 2);
      }
    }

    // 3. Central Web Anchor Core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F3F1EA';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBridgeStrands(ctx, reducedMotion) {
    ctx.lineWidth = 1;

    for (let i = 0; i < this.bridgeStrands.length; i++) {
      const strand = this.bridgeStrands[i];
      const midX = (strand.p1.x + strand.p2.x) / 2;
      let midY = (strand.p1.y + strand.p2.y) / 2 + strand.sag;

      // Cursor deflection on bridge strand
      if (!reducedMotion) {
        const dist = Math.hypot(midX - this.smoothMouseX, midY - this.smoothMouseY);
        if (dist < 160) {
          const deflect = (1 - dist / 160) * 22;
          midY += ((this.smoothMouseY - midY) / dist) * deflect;
        }
      }

      // Dual-tone strand gradient from Red Sector to Blue Sector
      const grad = ctx.createLinearGradient(strand.p1.x, strand.p1.y, strand.p2.x, strand.p2.y);
      grad.addColorStop(0, 'rgba(226, 54, 54, 0.35)');
      grad.addColorStop(0.5, 'rgba(243, 241, 234, 0.45)');
      grad.addColorStop(1, 'rgba(91, 130, 255, 0.35)');

      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(strand.p1.x, strand.p1.y);
      ctx.quadraticCurveTo(midX, midY, strand.p2.x, strand.p2.y);
      ctx.stroke();

      // Central tension node
      ctx.fillStyle = 'rgba(243, 241, 234, 0.7)';
      ctx.beginPath();
      ctx.arc(midX, midY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPulses(ctx, lowFpsMode) {
    const activePulseCount = lowFpsMode ? 12 : this.pulses.length;

    for (let i = 0; i < activePulseCount; i++) {
      const p = this.pulses[i];
      const hub = p.hub === 'red' ? this.redHub : this.blueHub;
      const ray = hub.rays[p.rayIndex];
      if (!ray) continue;

      const px = hub.centerX + (ray.endX - hub.centerX) * p.progress;
      const py = hub.centerY + (ray.endY - hub.centerY) * p.progress;

      // Pulse color
      ctx.fillStyle = hub.color;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Core white pip
      ctx.fillStyle = '#F3F1EA';
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCursorTethers(ctx) {
    if (this.smoothMouseX < 0 || this.smoothMouseX > this.width) return;

    // Nearest 3 anchor nodes from both hubs
    const allNodes = [];
    [this.redHub, this.blueHub].forEach(hub => {
      hub.rays.forEach(ray => {
        allNodes.push({ x: ray.endX, y: ray.endY, color: hub.color });
        ray.nodes.forEach(n => allNodes.push({ x: n.x, y: n.y, color: hub.color }));
      });
    });

    // Find closest 2 nodes to cursor
    allNodes.sort((a, b) => {
      const da = Math.hypot(a.x - this.smoothMouseX, a.y - this.smoothMouseY);
      const db = Math.hypot(b.x - this.smoothMouseX, b.y - this.smoothMouseY);
      return da - db;
    });

    const closest = allNodes.slice(0, 2);
    ctx.lineWidth = 0.8;

    for (const node of closest) {
      const dist = Math.hypot(node.x - this.smoothMouseX, node.y - this.smoothMouseY);
      if (dist < 220) {
        const alpha = (1 - dist / 220) * 0.45;
        ctx.strokeStyle = `rgba(243, 241, 234, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(this.smoothMouseX, this.smoothMouseY);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();

        // Terminal bead
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Small spider bead tracking the cursor directly
    ctx.fillStyle = '#E23636';
    ctx.beginPath();
    ctx.arc(this.smoothMouseX, this.smoothMouseY, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5B82FF';
    ctx.beginPath();
    ctx.arc(this.smoothMouseX, this.smoothMouseY, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Export for browser
window.SpiderWebBackground = SpiderWebBackground;
// Also alias as SakuraBackground for backward compatibility
window.SakuraBackground = SpiderWebBackground;

