/**
 * scrollSpider.js — Scroll-Driven Spider (Scrollable Layout)
 *
 * Behaviour:
 * 1. Hangs from top-center of viewport on a silk thread (idle pendulum sway)
 * 2. When the About section scrolls into view → spider descends to the
 *    centre of the webSplit orb-web (which is always drawn at viewport centre)
 * 3. Lands on the web, perches with spread legs
 * 4. When user scrolls back up → spider climbs back up the silk thread
 */
(function () {
  'use strict';

  const rig       = document.getElementById('scroll-spider-rig');
  const threadEl  = document.getElementById('spider-thread');
  const beadEl    = document.getElementById('spider-thread-bead');
  const spiderCvs = document.getElementById('scroll-spider-canvas');

  if (!rig || !spiderCvs || !threadEl || !beadEl) return;

  const ctx = spiderCvs.getContext('2d');
  const W = 80, H = 80;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  spiderCvs.width  = W * dpr;
  spiderCvs.height = H * dpr;
  spiderCvs.style.width  = W + 'px';
  spiderCvs.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  // ── Config ───────────────────────────────────────────────────────────────
  const GRAVITY = 0.0035;
  const DAMPING = 0.982;

  // ── Motion preference ────────────────────────────────────────────────────
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', e => { reducedMotion = e.matches; });

  // ── State ────────────────────────────────────────────────────────────────
  let mouseX = window.innerWidth  * 0.5;
  let mouseY = window.innerHeight * 0.3;

  // Pendulum (idle sway)
  let anchorX     = window.innerWidth * 0.5;
  let prevAnchorX = window.innerWidth * 0.5;
  let theta = 0, omega = 0;

  // Current spider position (viewport coords)
  let currentX = window.innerWidth  * 0.5;
  let currentY = 100;

  let spiderAngle = 0, targetAngle = 0;
  let legPhase = 0;
  let lastScrollY   = 0;
  let isClimbingUp  = false;
  let isLandedOnWeb = false;

  // Always-active — suppress canvas spider in nightcity.js
  rig.classList.add('is-visible');
  window.scrollSpiderActive = true;

  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const headerH = () => document.querySelector('.site-header')?.offsetHeight || 60;

  /**
   * Compute scroll progress 0→1 for descending onto the About web.
   *
   * The webSplit orb-web lives at viewport center (fixed canvas).
   * We want progress=1 when the About section is scrolled so that its
   * top edge is ~40% down the viewport (the section is well in view).
   */
  function getScrollProgress() {
    const aboutSection = document.getElementById('view-about');
    if (!aboutSection) return 0;

    const rect = aboutSection.getBoundingClientRect();
    const hdr  = headerH();

    // rect.top is the distance from viewport top to section top.
    // Progress starts at 0 when section top is at viewport bottom,
    // and reaches 1 when section top is at headerH + ~40 px
    // (i.e. about section is comfortably in view).
    const start = window.innerHeight;       // section top enters viewport
    const end   = hdr + 40;                 // section top near header

    const raw = 1 - Math.max(0, Math.min(1, (rect.top - end) / (start - end)));
    return raw;
  }

  // ── Main Loop ────────────────────────────────────────────────────────────
  function loop() {
    requestAnimationFrame(loop);

    const scrollY     = window.scrollY || 0;
    const scrollDelta = scrollY - lastScrollY;
    if (Math.abs(scrollDelta) > 0.8) isClimbingUp = scrollDelta < 0;
    lastScrollY = scrollY;

    const hdr = headerH();

    // ── Idle pendulum physics ──────────────────────────────────────────────
    const baseLen = Math.min(Math.max(window.innerHeight * 0.20, 100), 170);
    const yOffset = Math.min(Math.max((mouseY - 200) * 0.18, -40), 60);
    const effLen  = baseLen + yOffset;

    if (reducedMotion) {
      anchorX = window.innerWidth * 0.5;
      theta = 0; omega = 0;
    } else {
      const prev = anchorX;
      anchorX += (mouseX - anchorX) * 0.08;
      const accel = (anchorX - prev) - (prev - prevAnchorX);
      prevAnchorX = prev;
      omega -= (accel / Math.max(effLen, 40)) * Math.cos(theta) * 0.45;
      omega -= GRAVITY * Math.sin(theta);
      omega *= DAMPING;
      theta += omega;
      if (theta >  1.1) { theta =  1.1; omega *= -0.5; }
      if (theta < -1.1) { theta = -1.1; omega *= -0.5; }
    }

    // Rest position (hanging from anchor)
    const restX = anchorX + Math.sin(theta) * effLen;
    const restY = hdr     + Math.cos(theta) * effLen;

    // ── Descent target: About section's web (always viewport centre) ───────
    const scrollProgress = getScrollProgress();
    const eased = scrollProgress * scrollProgress * (3 - 2 * scrollProgress);

    // webSplit web centre is exactly viewport centre (fixed canvas)
    const webX = window.innerWidth  * 0.5;
    const webY = window.innerHeight * 0.5;

    const targetX = restX + (webX - restX) * eased;
    const targetY = restY + (webY - restY) * eased;

    isLandedOnWeb = scrollProgress >= 0.97;

    // ── Ease spider toward target ──────────────────────────────────────────
    const prevX = currentX, prevY = currentY;
    const ease  = isLandedOnWeb ? 0.28 : 0.13;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    const moveDist = Math.hypot(currentX - prevX, currentY - prevY);

    // ── Orientation ───────────────────────────────────────────────────────
    if (isLandedOnWeb) {
      targetAngle = 0;
    } else if (scrollProgress > 0.08 && isClimbingUp) {
      targetAngle = Math.PI;
    } else {
      targetAngle = -theta * 0.8;
    }
    let diff = targetAngle - spiderAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    spiderAngle += diff * 0.15;

    // ── Leg phase ─────────────────────────────────────────────────────────
    if (isLandedOnWeb) {
      legPhase += 0.02;
    } else if (moveDist > 0.2 || Math.abs(scrollDelta) > 0.5) {
      legPhase += Math.max(moveDist * 0.25, 0.18);
    } else {
      legPhase += 0.02;
    }

    // ── Render ────────────────────────────────────────────────────────────
    updateThread(hdr);
    drawSpider();
  }

  // ── SVG silk thread ───────────────────────────────────────────────────────
  function updateThread(hdr) {
    const ax = window.innerWidth * 0.5;
    const ay = hdr;

    threadEl.setAttribute('x1', ax);
    threadEl.setAttribute('y1', ay);
    threadEl.setAttribute('x2', currentX);
    threadEl.setAttribute('y2', currentY);

    beadEl.setAttribute('cx', ax);
    beadEl.setAttribute('cy', ay + 1.5);

    spiderCvs.style.left = (currentX - W / 2) + 'px';
    spiderCvs.style.top  = (currentY - H / 2) + 'px';
  }

  // ── Spider canvas drawing ─────────────────────────────────────────────────
  function drawSpider() {
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spiderAngle);

    // Shadow
    ctx.fillStyle = 'rgba(9,11,22,0.38)';
    ctx.beginPath();
    ctx.ellipse(1, 4, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#E23636';
    ctx.lineWidth   = 1.3;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    const legs = [
      { sy: -4, kx: -8,  ky: -11, fx: -13, fy: -9  },
      { sy: -2, kx: -11, ky: -6,  fx: -16, fy: -4  },
      { sy:  1, kx: -11, ky:  4,  fx: -15, fy:  10 },
      { sy:  3, kx:  -8, ky:  9,  fx: -12, fy:  16 }
    ];

    legs.forEach((leg, i) => {
      let s = 0;
      if (!reducedMotion) {
        if (isLandedOnWeb) {
          s = Math.sin(legPhase + i * 1.2) * 0.8;
        } else if (isClimbingUp) {
          s = Math.sin(legPhase + (i % 2 === 0 ? 0 : Math.PI)) * 3.2;
        } else {
          s = Math.sin(legPhase + i * (Math.PI / 2)) * 1.8;
        }
      }
      // Left
      ctx.beginPath();
      ctx.moveTo(-2.5, leg.sy);
      ctx.lineTo(leg.kx + s * 0.4, leg.ky + s);
      ctx.lineTo(leg.fx + s, leg.fy + s * 1.2);
      ctx.stroke();
      // Right (mirror)
      ctx.beginPath();
      ctx.moveTo(2.5, leg.sy);
      ctx.lineTo(-leg.kx - s * 0.4, leg.ky + s);
      ctx.lineTo(-leg.fx - s, leg.fy + s * 1.2);
      ctx.stroke();
    });

    // Abdomen
    ctx.fillStyle = '#E23636';
    ctx.beginPath();
    ctx.ellipse(0, 5.5, 5.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Diamond marking
    ctx.fillStyle = 'rgba(243,241,234,0.88)';
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(2, 5.5); ctx.lineTo(0, 9); ctx.lineTo(-2, 5.5);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#B52323';
    ctx.beginPath();
    ctx.ellipse(0, -3.5, 3.8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#F3F1EA';
    ctx.fillRect(-1.6, -5.6, 1.2, 1.2);
    ctx.fillRect( 0.4, -5.6, 1.2, 1.2);

    ctx.restore();
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  requestAnimationFrame(loop);
})();
