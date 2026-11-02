/**
 * scrollSpider.js — Scroll-Driven Spider (Scrollable Layout Version)
 *
 * - Spider hangs from top-center of the viewport via a silk thread
 * - As user scrolls down, thread extends and spider descends toward
 *   the photo-web-landing element
 * - When it lands it perches; scrolling back up reels it back up
 * - Always active (site is now fully scrollable, single page)
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

  // --- Config ---
  const GRAVITY  = 0.0035;
  const DAMPING  = 0.982;

  // --- Motion preference ---
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
    reducedMotion = e.matches;
  });

  // --- State ---
  let mouseX = window.innerWidth * 0.5;
  let mouseY = window.innerHeight * 0.3;

  // Pendulum (for idle sway at rest position)
  let anchorX     = window.innerWidth * 0.5;
  let prevAnchorX = window.innerWidth * 0.5;
  let theta = 0, omega = 0;

  // Spider world position (viewport coords — always fixed)
  let currentX = window.innerWidth * 0.5;
  let currentY = 100;
  let spiderAngle = 0;
  let targetAngle = 0;
  let legPhase = 0;

  let lastScrollY   = 0;
  let isClimbingUp  = false;
  let isLandedOnWeb = false;
  let rafId = null;

  // Header height
  const HEADER_H = () => (document.querySelector('.site-header')?.offsetHeight || 60);

  // Mouse tracking
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Always show rig (site is now scrollable, spider is always active)
  rig.classList.add('is-visible');
  window.scrollSpiderActive = true;

  // --- Main Loop ---
  function loop() {
    rafId = requestAnimationFrame(loop);

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const scrollDelta = scrollY - lastScrollY;
    if (Math.abs(scrollDelta) > 0.8) isClimbingUp = scrollDelta < 0;
    lastScrollY = scrollY;

    const headerH = HEADER_H();

    // --- Idle pendulum anchor sway ---
    const baseLength = Math.min(Math.max(window.innerHeight * 0.22, 120), 180);
    const cursorYOffset = Math.min(Math.max((mouseY - 200) * 0.18, -40), 60);
    const effectiveLength = baseLength + cursorYOffset;

    if (reducedMotion) {
      anchorX = window.innerWidth * 0.5;
      theta = 0; omega = 0;
    } else {
      const prev = anchorX;
      anchorX += (mouseX - anchorX) * 0.08;
      const anchorAccel = (anchorX - prev) - (prev - prevAnchorX);
      prevAnchorX = prev;

      omega -= (anchorAccel / Math.max(effectiveLength, 40)) * Math.cos(theta) * 0.45;
      omega -= GRAVITY * Math.sin(theta);
      omega *= DAMPING;
      theta += omega;
      if (theta > 1.1) { theta = 1.1; omega *= -0.5; }
      if (theta < -1.1) { theta = -1.1; omega *= -0.5; }
    }

    // Resting position (hanging from anchor, swaying)
    const restX = anchorX + Math.sin(theta) * effectiveLength;
    const restY = headerH + Math.cos(theta) * effectiveLength;

    // --- Web landing target ---
    const landingEl = document.getElementById('photo-web-landing');
    let targetX = restX;
    let targetY = restY;
    let scrollProgress = 0;

    if (landingEl) {
      const rect = landingEl.getBoundingClientRect();
      // Center of the web hub element in viewport coords
      const webX = rect.left + rect.width / 2;
      const webY = rect.top + rect.height / 2;

      // Visible when webY is above 70% of the viewport height
      const visibleThreshold = window.innerHeight * 0.70;
      // Progress: 0 = web not yet visible, 1 = web at 30% of viewport
      const rawProgress = 1 - Math.min(1, Math.max(0,
        (webY - window.innerHeight * 0.30) / (visibleThreshold - window.innerHeight * 0.30)
      ));
      scrollProgress = rawProgress;

      // Smoothstep easing
      const eased = scrollProgress * scrollProgress * (3 - 2 * scrollProgress);

      targetX = restX + (webX - restX) * eased;
      targetY = restY + (webY - restY) * eased;
    }

    isLandedOnWeb = scrollProgress >= 0.97;

    // Ease spider toward target
    const prevX = currentX;
    const prevY = currentY;
    const easeSpeed = isLandedOnWeb ? 0.28 : 0.13;
    currentX += (targetX - currentX) * easeSpeed;
    currentY += (targetY - currentY) * easeSpeed;
    const moveDist = Math.hypot(currentX - prevX, currentY - prevY);

    // --- Spider orientation ---
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

    // --- Leg animation ---
    if (isLandedOnWeb) {
      legPhase += 0.02;
    } else if (moveDist > 0.2 || Math.abs(scrollDelta) > 0.5) {
      legPhase += Math.max(moveDist * 0.25, 0.18);
    } else {
      legPhase += 0.02;
    }

    // --- Draw ---
    updateThread(headerH);
    drawSpider();
  }

  // --- SVG Thread ---
  function updateThread(headerH) {
    // Thread always hangs from top-center of viewport (same X as anchorX after sway)
    const ax = window.innerWidth * 0.5; // anchor is center top
    const ay = headerH;

    threadEl.setAttribute('x1', ax);
    threadEl.setAttribute('y1', ay);
    threadEl.setAttribute('x2', currentX);
    threadEl.setAttribute('y2', currentY);

    beadEl.setAttribute('cx', ax);
    beadEl.setAttribute('cy', ay + 1.5);

    // Position the canvas
    spiderCvs.style.left = (currentX - W / 2) + 'px';
    spiderCvs.style.top  = (currentY - H / 2) + 'px';
  }

  // --- Spider Draw ---
  function clearCanvas() { ctx.clearRect(0, 0, W, H); }

  function drawSpider() {
    clearCanvas();
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

    const baseLegs = [
      { startY: -4, kneeX: -8,  kneeY: -11, footX: -13, footY: -9  },
      { startY: -2, kneeX: -11, kneeY: -6,  footX: -16, footY: -4  },
      { startY:  1, kneeX: -11, kneeY:  4,  footX: -15, footY:  10 },
      { startY:  3, kneeX:  -8, kneeY:  9,  footX: -12, footY:  16 }
    ];

    for (let i = 0; i < baseLegs.length; i++) {
      const leg = baseLegs[i];
      let stepOffset = 0;
      if (!reducedMotion) {
        if (isLandedOnWeb) {
          stepOffset = Math.sin(legPhase + i * 1.2) * 0.8;
        } else if (isClimbingUp) {
          stepOffset = Math.sin(legPhase + (i % 2 === 0 ? 0 : Math.PI)) * 3.2;
        } else {
          stepOffset = Math.sin(legPhase + i * (Math.PI / 2)) * 1.8;
        }
      }
      // Left
      ctx.beginPath();
      ctx.moveTo(-2.5, leg.startY);
      ctx.lineTo(leg.kneeX + stepOffset * 0.4, leg.kneeY + stepOffset);
      ctx.lineTo(leg.footX + stepOffset, leg.footY + stepOffset * 1.2);
      ctx.stroke();
      // Right (mirrored)
      ctx.beginPath();
      ctx.moveTo(2.5, leg.startY);
      ctx.lineTo(-leg.kneeX - stepOffset * 0.4, leg.kneeY + stepOffset);
      ctx.lineTo(-leg.footX - stepOffset, leg.footY + stepOffset * 1.2);
      ctx.stroke();
    }

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
    ctx.fillRect(0.4,  -5.6, 1.2, 1.2);

    ctx.restore();
  }

  // Start immediately
  rafId = requestAnimationFrame(loop);
})();
