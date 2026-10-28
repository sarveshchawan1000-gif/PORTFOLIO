/**
 * Night City Canvas Background
 * Features:
 * - Three parallax skyline layers responding to cursor X
 * - Randomly flickering warm amber windows
 * - Softly twinkling night stars
 * - Interactive silk web pendulum tracking cursor X, ending in a code-drawn red spider
 */
class NightCityBackground {
  constructor() {
    this.stars = [];
    this.layers = [];
    this.initialized = false;

    // Spider & pendulum physics
    this.anchorX = 0;
    this.prevAnchorX = 0;
    this.theta = 0;
    this.omega = 0;
    this.pendulumLength = 160;
    this.targetPendulumLength = 160;
    this.basePendulumLength = 160;
    this.gravity = 0.0035;
    this.damping = 0.982;

    // Parallax mouse offsets (smoothed)
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.smoothMouseX = 0;
    this.smoothMouseY = 0;

    // Window flicker state
    this.tick = 0;
  }

  init(width, height) {
    this.width = width;
    this.height = height;
    this.anchorX = width / 2;
    this.prevAnchorX = width / 2;
    this.targetMouseX = width / 2;
    this.smoothMouseX = width / 2;
    this.basePendulumLength = Math.min(Math.max(height * 0.22, 130), 220);
    this.pendulumLength = this.basePendulumLength;
    this.targetPendulumLength = this.basePendulumLength;
    this.targetMouseY = this.basePendulumLength;
    this.smoothMouseY = this.basePendulumLength;

    // Generate stars
    this.stars = [];
    const starCount = Math.floor(Math.min(width * 0.05, 55));
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.55),
        radius: Math.random() * 1.2 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.02 + 0.01,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Generate 3 parallax skyline layers
    // Layer 0: Far (dark slate blue, tall slender towers & spires)
    // Layer 1: Mid (intermediate silhouettes, rooftop tanks, varied heights)
    // Layer 2: Near (deep dark silhouette, wider structures)
    this.layers = [
      this.createLayer(width, height, {
        count: Math.ceil(width / 50) + 6,
        minW: 35,
        maxW: 75,
        minH: height * 0.22,
        maxH: height * 0.44,
        color: '#0e1529',
        windowDensity: 0.25,
        parallaxSpeed: 14,
        hasSpires: true
      }),
      this.createLayer(width, height, {
        count: Math.ceil(width / 70) + 6,
        minW: 55,
        maxW: 110,
        minH: height * 0.16,
        maxH: height * 0.34,
        color: '#131b33',
        windowDensity: 0.35,
        parallaxSpeed: 34,
        hasSpires: false
      }),
      this.createLayer(width, height, {
        count: Math.ceil(width / 95) + 6,
        minW: 80,
        maxW: 160,
        minH: height * 0.10,
        maxH: height * 0.24,
        color: '#080c1a',
        windowDensity: 0.42,
        parallaxSpeed: 60,
        hasSpires: false
      })
    ];

    this.initialized = true;
  }

  createLayer(width, height, cfg) {
    const buildings = [];
    let curX = -80;
    while (curX < width + 140) {
      const bWidth = Math.floor(cfg.minW + Math.random() * (cfg.maxW - cfg.minW));
      const bHeight = Math.floor(cfg.minH + Math.random() * (cfg.maxH - cfg.minH));
      const hasSpire = cfg.hasSpires && Math.random() > 0.55;

      // Generate windows on this building
      const windows = [];
      const cols = Math.max(2, Math.floor(bWidth / 12));
      const rows = Math.max(3, Math.floor(bHeight / 18));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < cfg.windowDensity) {
            windows.push({
              relX: 6 + c * 11,
              relY: 10 + r * 16,
              w: 5,
              h: 7,
              baseAlpha: 0.25 + Math.random() * 0.65,
              flickerSpeed: 0.01 + Math.random() * 0.05,
              flickerPhase: Math.random() * Math.PI * 2,
              isFlickering: Math.random() < 0.25
            });
          }
        }
      }

      buildings.push({
        x: curX,
        width: bWidth,
        height: bHeight,
        hasSpire,
        spireHeight: hasSpire ? 25 + Math.random() * 35 : 0,
        windows
      });

      curX += bWidth - (Math.random() * 12); // subtle overlap
    }

    return {
      buildings,
      color: cfg.color,
      parallaxSpeed: cfg.parallaxSpeed
    };
  }

  resize(width, height) {
    this.init(width, height);
  }

  setMouse(x, y) {
    this.targetMouseX = x;
    this.targetMouseY = y;
  }

  update(reducedMotion, lowFpsMode) {
    this.tick++;

    // Mouse lerping
    const lerpSpeed = reducedMotion ? 0.02 : 0.08;
    this.smoothMouseX += (this.targetMouseX - this.smoothMouseX) * lerpSpeed;
    this.smoothMouseY += (this.targetMouseY - this.smoothMouseY) * lerpSpeed;

    // Pendulum physics
    if (reducedMotion) {
      this.anchorX = this.width / 2;
      this.theta = Math.sin(this.tick * 0.01) * 0.03;
      this.omega = 0;
      this.pendulumLength = this.basePendulumLength;
    } else {
      // Dynamic string length: increases as cursor goes down, decreases as cursor goes up
      const minLength = Math.max(50, this.height * 0.08);
      const maxLength = Math.max(minLength + 140, this.height * 0.85);
      this.targetPendulumLength = Math.min(Math.max(this.targetMouseY, minLength), maxLength);

      // Smoothly reel silk string length toward target
      this.pendulumLength += (this.targetPendulumLength - this.pendulumLength) * 0.08;

      const prev = this.anchorX;
      // Anchor follows cursor X smoothly
      this.anchorX += (this.targetMouseX - this.anchorX) * 0.09;
      const anchorAccel = (this.anchorX - prev) - (prev - this.prevAnchorX);
      this.prevAnchorX = prev;

      const safeLength = Math.max(this.pendulumLength, 40);

      // Acceleration torque on the pendulum
      this.omega -= (anchorAccel / safeLength) * Math.cos(this.theta) * 0.45;
      
      // Restoring gravitational torque scaled by length (shorter pendulums oscillate faster: T ~ sqrt(L))
      const freqFactor = Math.sqrt(this.basePendulumLength / safeLength);
      this.omega -= this.gravity * freqFactor * Math.sin(this.theta);
      
      // Damping
      this.omega *= this.damping;
      this.theta += this.omega;

      // Clamp angle to safe realistic swinging range (-75 deg to +75 deg)
      const maxAngle = 1.3;
      if (this.theta > maxAngle) {
        this.theta = maxAngle;
        this.omega *= -0.5;
      } else if (this.theta < -maxAngle) {
        this.theta = -maxAngle;
        this.omega *= -0.5;
      }
    }
  }

  draw(ctx, width, height, reducedMotion) {
    if (!this.initialized) this.init(width, height);

    // Deep night background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#060811');
    bgGrad.addColorStop(0.65, '#0b0f1e');
    bgGrad.addColorStop(1, '#111728');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw stars
    const mouseNormX = (this.smoothMouseX / width) - 0.5;
    for (const star of this.stars) {
      const twinkle = reducedMotion ? star.alpha : star.alpha * (0.6 + 0.4 * Math.sin(this.tick * star.speed + star.phase));
      ctx.fillStyle = `rgba(243, 241, 234, ${twinkle.toFixed(2)})`;
      ctx.beginPath();
      // Slight parallax on stars too
      const starX = (star.x - mouseNormX * 6 + width) % width;
      ctx.arc(starX, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw 3 skyline layers
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const shiftX = -mouseNormX * layer.parallaxSpeed;

      for (const b of layer.buildings) {
        const bx = b.x + shiftX;
        const by = height - b.height;

        // Building silhouette - ensure fillStyle is set for each building
        ctx.fillStyle = layer.color;
        ctx.fillRect(bx, by, b.width, b.height);

        // Optional spire & blinking beacon
        if (b.hasSpire) {
          ctx.beginPath();
          ctx.moveTo(bx + b.width / 2, by);
          ctx.lineTo(bx + b.width / 2, by - b.spireHeight);
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Beacon light at the tip
          const beaconFlash = (Math.sin(this.tick * 0.08 + b.x) > 0.8) ? 0.9 : 0.15;
          ctx.fillStyle = `rgba(226, 54, 54, ${beaconFlash})`;
          ctx.beginPath();
          ctx.arc(bx + b.width / 2, by - b.spireHeight, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw windows
        for (const w of b.windows) {
          const wx = bx + w.relX;
          const wy = by + w.relY;

          // Culling
          if (wx + w.w < 0 || wx > width) continue;

          let alpha = w.baseAlpha;
          if (w.isFlickering && !reducedMotion) {
            alpha += Math.sin(this.tick * w.flickerSpeed + w.flickerPhase) * 0.22;
            alpha = Math.max(0.08, Math.min(0.95, alpha));
          }

          // Warm amber glow color: #F59E0B / rgb(245, 158, 11)
          ctx.fillStyle = `rgba(245, 170, 40, ${alpha.toFixed(2)})`;
          ctx.fillRect(wx, wy, w.w, w.h);
        }
      }
    }

    // Subtle dark mist at horizon base
    const mistGrad = ctx.createLinearGradient(0, height - 70, 0, height);
    mistGrad.addColorStop(0, 'rgba(9, 11, 22, 0)');
    mistGrad.addColorStop(1, 'rgba(9, 11, 22, 0.92)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, height - 70, width, 70);

    // Draw Pendulum Silk Thread & Spider
    this.drawSpiderPendulum(ctx, reducedMotion);
  }

  drawSpiderPendulum(ctx, reducedMotion) {
    const anchorY = 0;
    const bobX = this.anchorX + Math.sin(this.theta) * this.pendulumLength;
    const bobY = anchorY + Math.cos(this.theta) * this.pendulumLength;

    // Draw silk thread
    ctx.strokeStyle = 'rgba(243, 241, 234, 0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.anchorX, anchorY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Anchor bead at ceiling
    ctx.fillStyle = 'rgba(243, 241, 234, 0.7)';
    ctx.beginPath();
    ctx.arc(this.anchorX, 1.5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw code-drawn original Red Spider
    ctx.save();
    ctx.translate(bobX, bobY);
    // Align spider body with pendulum angle
    ctx.rotate(-this.theta);

    // Spider Cephalothorax (head) & Abdomen (body)
    // Abdomen
    ctx.fillStyle = '#E23636'; // Signature red
    ctx.beginPath();
    ctx.ellipse(0, 5, 5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle dorsal diamond marking on abdomen
    ctx.fillStyle = 'rgba(243, 241, 234, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 1.5);
    ctx.lineTo(2, 5);
    ctx.lineTo(0, 8.5);
    ctx.lineTo(-2, 5);
    ctx.closePath();
    ctx.fill();

    // Cephalothorax (head)
    ctx.fillStyle = '#b52323';
    ctx.beginPath();
    ctx.ellipse(0, -3.5, 3.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2 tiny pale eyes
    ctx.fillStyle = '#F3F1EA';
    ctx.fillRect(-1.5, -5.5, 1.2, 1.2);
    ctx.fillRect(0.3, -5.5, 1.2, 1.2);

    // 8 Delicate jointed spider legs
    ctx.strokeStyle = '#E23636';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left legs (4)
    const legConfigs = [
      { startY: -4, kneeX: -7, kneeY: -10, footX: -11, footY: -8 },
      { startY: -2, kneeX: -9, kneeY: -6,  footX: -14, footY: -3 },
      { startY: 1,  kneeX: -10, kneeY: 3,  footX: -13, footY: 9 },
      { startY: 3,  kneeX: -7, kneeY: 8,   footX: -10, footY: 15 }
    ];

    // Subtle leg flex based on vertical silk reeling and pendulum swing
    const reelingDelta = Math.abs(this.targetPendulumLength - this.pendulumLength);
    const motionAmount = reducedMotion ? 0 : Math.min(Math.abs(this.omega) * 3 + reelingDelta * 0.04, 1.2);

    for (let i = 0; i < legConfigs.length; i++) {
      const leg = legConfigs[i];
      const legOffset = motionAmount > 0.03 ? Math.sin(this.tick * 0.22 + i * 0.8) * motionAmount * 1.5 : 0;

      // Left leg
      ctx.beginPath();
      ctx.moveTo(-2, leg.startY);
      ctx.lineTo(leg.kneeX + legOffset * 0.5, leg.kneeY + legOffset);
      ctx.lineTo(leg.footX + legOffset, leg.footY + legOffset * 1.2);
      ctx.stroke();

      // Right leg (mirrored)
      ctx.beginPath();
      ctx.moveTo(2, leg.startY);
      ctx.lineTo(-leg.kneeX - legOffset * 0.5, leg.kneeY + legOffset);
      ctx.lineTo(-leg.footX - legOffset, leg.footY + legOffset * 1.2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Export for browser
window.NightCityBackground = NightCityBackground;
