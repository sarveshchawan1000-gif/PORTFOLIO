/**
 * Sakura Drift Canvas Background
 * Features:
 * - Dusk-purple atmospheric gradient
 * - Large luminous moon with subtle crater mares
 * - Organic dark gnarled branch with code-drawn 5-petal pink blossoms
 * - ~90 petals falling and rotating, with horizontal wind pushed by cursor X
 * - Respects prefers-reduced-motion and low FPS particle shedding
 */
class SakuraBackground {
  constructor() {
    this.petals = [];
    this.blossoms = [];
    this.branches = [];
    this.initialized = false;
    this.tick = 0;

    this.mouseX = 0;
    this.mouseY = 0;
    this.targetWind = 0;
    this.currentWind = 0;
  }

  init(width, height) {
    this.width = width;
    this.height = height;
    this.mouseX = width / 2;
    this.mouseY = height / 2;

    // Moon parameters
    this.moon = {
      x: Math.min(width * 0.82, width - 110),
      y: Math.max(height * 0.18, 95),
      radius: Math.min(Math.max(width * 0.075, 52), 80)
    };

    // Branch architecture (entering from top-left)
    this.buildBranchStructure(width, height);

    // Initialize 90 petals
    this.petals = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      this.petals.push(this.createPetal(width, height, true));
    }

    this.initialized = true;
  }

  buildBranchStructure(width, height) {
    // Main branch curves from top-left (x: -20, y: -20) across to (x: width * 0.45, y: height * 0.3)
    this.blossoms = [];
    const startX = -20;
    const startY = -15;
    const endX = Math.min(width * 0.42, 380);
    const endY = Math.min(height * 0.35, 240);

    // Generate blossom positions along the branch curve and sub-twigs
    const numBlossoms = 24;
    for (let i = 0; i < numBlossoms; i++) {
      const t = (i + 1) / (numBlossoms + 1);
      // Quadratic bezier curve point
      const ctrlX = endX * 0.45;
      const ctrlY = endY * 0.15;
      const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX;
      const by = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY;

      // Small twig displacement
      const twigAngle = (Math.random() - 0.5) * 1.8;
      const twigLen = 12 + Math.random() * 26;
      const fx = bx + Math.cos(twigAngle) * twigLen;
      const fy = by + Math.sin(twigAngle) * twigLen;

      this.blossoms.push({
        x: fx,
        y: fy,
        size: 7 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        isBud: Math.random() < 0.2
      });
    }
  }

  createPetal(width, height, randomY = false) {
    return {
      x: Math.random() * (width + 200) - 100,
      y: randomY ? Math.random() * height : -20 - Math.random() * 50,
      sizeW: 4.5 + Math.random() * 4.5,
      sizeH: 7 + Math.random() * 6,
      fallSpeed: 0.9 + Math.random() * 1.6,
      rotAngle: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      flutterPhase: Math.random() * Math.PI * 2,
      flutterSpeed: 0.02 + Math.random() * 0.04,
      flutterAmp: 0.6 + Math.random() * 1.2,
      colorVariant: Math.random(),
      alpha: 0.65 + Math.random() * 0.3
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

    // Horizontal wind pushed by cursor horizontal position
    const mouseNormX = (this.mouseX / this.width) - 0.5; // -0.5 to +0.5
    this.targetWind = mouseNormX * 2.8;
    this.currentWind += (this.targetWind - this.currentWind) * 0.06;

    const activeCount = lowFpsMode ? 45 : this.petals.length;

    for (let i = 0; i < activeCount; i++) {
      const p = this.petals[i];

      if (reducedMotion) {
        // Reduced motion: slow constant fall, no rotation, no sway
        p.y += p.fallSpeed * 0.35;
      } else {
        // Natural petal drift + wind + sinusoidal flutter
        p.y += p.fallSpeed;
        p.flutterPhase += p.flutterSpeed;
        p.x += Math.sin(p.flutterPhase) * p.flutterAmp + this.currentWind;
        p.rotAngle += p.rotSpeed + (this.currentWind * 0.015);
      }

      // Recycle petals when off-screen
      if (p.y > this.height + 25) {
        p.y = -15;
        p.x = Math.random() * (this.width + 160) - 80;
      } else if (p.x < -60) {
        p.x = this.width + 40;
      } else if (p.x > this.width + 60) {
        p.x = -40;
      }
    }
  }

  draw(ctx, width, height, reducedMotion, lowFpsMode) {
    if (!this.initialized) this.init(width, height);

    // Dusk-purple atmospheric sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0d071a');
    sky.addColorStop(0.35, '#160c2b');
    sky.addColorStop(0.7, '#24143d');
    sky.addColorStop(1, '#33174b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Draw Large Moon
    this.drawMoon(ctx);

    // Draw Dark Branch & Blossoms
    this.drawBranch(ctx, width, height);

    // Draw Falling Petals
    const activeCount = lowFpsMode ? 45 : this.petals.length;
    for (let i = 0; i < activeCount; i++) {
      this.drawPetal(ctx, this.petals[i]);
    }

    // Subtle bottom dusk vignetting
    const duskMist = ctx.createLinearGradient(0, height - 90, 0, height);
    duskMist.addColorStop(0, 'rgba(13, 7, 26, 0)');
    duskMist.addColorStop(1, 'rgba(9, 11, 22, 0.88)');
    ctx.fillStyle = duskMist;
    ctx.fillRect(0, height - 90, width, 90);
  }

  drawMoon(ctx) {
    const { x, y, radius } = this.moon;

    // Subtle moon outer aura (restrained, thin crisp glow ring)
    ctx.strokeStyle = 'rgba(253, 244, 215, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.stroke();

    // Moon disc
    ctx.fillStyle = '#FFFDF5';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Lunar mare patterns (delicate crater shadings)
    ctx.fillStyle = 'rgba(215, 205, 185, 0.35)';

    // Crater 1
    ctx.beginPath();
    ctx.arc(x - radius * 0.28, y - radius * 0.15, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Crater 2
    ctx.beginPath();
    ctx.arc(x + radius * 0.22, y + radius * 0.18, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Crater 3
    ctx.beginPath();
    ctx.arc(x - radius * 0.1, y + radius * 0.32, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBranch(ctx, width, height) {
    const startX = -20;
    const startY = -15;
    const endX = Math.min(width * 0.42, 380);
    const endY = Math.min(height * 0.35, 240);

    // Main dark gnarled branch silhouette
    ctx.strokeStyle = '#12081d';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(endX * 0.4, endY * 0.2, endX, endY);
    ctx.stroke();

    // Secondary sub-branch
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(startX + 60, startY + 45);
    ctx.quadraticCurveTo(startX + 140, startY + 110, startX + 220, startY + 90);
    ctx.stroke();

    // Tertiary twigs to blossoms
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1c0f2a';
    for (const b of this.blossoms) {
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y - 6);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Draw blossom
      this.drawBlossom(ctx, b);
    }
  }

  drawBlossom(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);

    if (b.isBud) {
      // Small pink closed bud
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.size * 0.4, b.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 5-lobed sakura blossom
      const numPetals = 5;
      const petalRadius = b.size * 0.65;

      for (let i = 0; i < numPetals; i++) {
        const angle = (i * 2 * Math.PI) / numPetals;
        const px = Math.cos(angle) * petalRadius;
        const py = Math.sin(angle) * petalRadius;

        ctx.fillStyle = (i % 2 === 0) ? '#fbcfe8' : '#fda4af';
        ctx.beginPath();
        ctx.ellipse(px, py, b.size * 0.4, b.size * 0.55, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      // Blossom center pistil (deep rose)
      ctx.fillStyle = '#9d174d';
      ctx.beginPath();
      ctx.arc(0, 0, b.size * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Tiny yellow stamen center
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, b.size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawPetal(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotAngle);

    // Petal color palette (shades of sakura pink)
    const color = p.colorVariant > 0.5 ? `rgba(251, 207, 232, ${p.alpha})` : `rgba(244, 114, 182, ${p.alpha})`;
    ctx.fillStyle = color;

    // Curved sakura petal shape with small cleft tip
    ctx.beginPath();
    ctx.moveTo(0, -p.sizeH / 2);
    ctx.bezierCurveTo(p.sizeW, -p.sizeH / 4, p.sizeW * 0.8, p.sizeH / 3, 0, p.sizeH / 2);
    ctx.bezierCurveTo(-p.sizeW * 0.8, p.sizeH / 3, -p.sizeW, -p.sizeH / 4, 0, -p.sizeH / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// Export for browser
window.SakuraBackground = SakuraBackground;
