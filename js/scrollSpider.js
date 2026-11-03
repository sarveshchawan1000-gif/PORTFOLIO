/**
 * scrollSpider.js — Unified Scroll-Driven Spider
 *
 * Requirements:
 * 1. Thread is NEVER pinned to an arbitrary single static point (no diagonal slashes across text).
 *    The thread drops straight down from the ceiling directly above the spider (x1 = currentX).
 * 2. On Home: Spider hangs on its silk thread in the hero area, swaying gently.
 * 3. Scrolling Home -> About: Spider descends down to the orb-web in the About section.
 * 4. Landing on About web: THE STRING CUTS! Thread completely disappears.
 *    The spider perches freely on the web with no string attached.
 * 5. Projects / Skills: Spider fades during circuit board sections.
 * 6. Journey -> Contact: At Journey, as user scrolls towards Contact,
 *    THE STRING ATTACHES AGAIN from the ceiling, and the spider descends
 *    down on its thread into the Contact section (Night City).
 * 7. Scrolling back up reverses the process seamlessly (spider climbs string,
 *    string cuts on the web, reattaches when climbing back to Home).
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

  // ── Motion preference ────────────────────────────────────────────────────
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', e => { reducedMotion = e.matches; });

  // ── Mouse Tracking ───────────────────────────────────────────────────────
  let mouseX = window.innerWidth  * 0.5;
  let mouseY = window.innerHeight * 0.3;
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // ── State ────────────────────────────────────────────────────────────────
  let currentX    = window.innerWidth * 0.5;
  let currentY    = 130;
  let spiderAngle = 0;
  let targetAngle = 0;
  let legPhase    = 0;
  let spiderOpacity = 1;

  let lastScrollY  = window.scrollY || 0;
  let isClimbingUp = false;

  // Signal to background scenes (nightcity, webSplit) that unified overlay is active
  window.scrollSpiderActive = true;
  rig.classList.add('is-visible');

  const headerH = () => document.querySelector('.site-header')?.offsetHeight || 60;

  // ── Animation Loop ───────────────────────────────────────────────────────
  function loop() {
    requestAnimationFrame(loop);

    const scrollY     = window.scrollY || window.pageYOffset || 0;
    const scrollDelta = scrollY - lastScrollY;
    if (Math.abs(scrollDelta) > 0.8) {
      isClimbingUp = scrollDelta < 0;
    }
    lastScrollY = scrollY;

    const hdr = headerH();
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;

    // Web landing coordinates (center of screen, where WebSplit orb-web sits)
    const webX = vw * 0.5;
    const webY = vh * 0.5;

    // Section bounding rects
    const aboutEl    = document.getElementById('view-about');
    const projectsEl = document.getElementById('view-projects');
    const journeyEl  = document.getElementById('view-journey');
    const contactEl  = document.getElementById('view-contact');

    const aboutTop    = aboutEl    ? aboutEl.getBoundingClientRect().top    : 9999;
    const projectsTop = projectsEl ? projectsEl.getBoundingClientRect().top : 9999;
    const journeyTop  = journeyEl  ? journeyEl.getBoundingClientRect().top  : 9999;
    const contactTop  = contactEl  ? contactEl.getBoundingClientRect().top  : 9999;

    let targetX = webX;
    let targetY = webY;
    let threadVisible = false;
    let targetOpacity = 1;
    let isLandedOnWeb  = false;

    // Mouse influence (subtle cursor drift, not hard-pinned)
    const mouseDriftX = (mouseX - vw * 0.5) * 0.15;
    const mouseDriftY = Math.max(-20, Math.min(50, (mouseY - 200) * 0.18));

    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 1: Home -> About
    // ────────────────────────────────────────────────────────────────────────
    if (aboutTop > hdr + 20) {
      // Home section is in view, descending towards About
      const progressToAbout = Math.max(0, Math.min(1, (vh - aboutTop) / (vh - (hdr + 20))));

      if (progressToAbout < 0.94) {
        // Spider is hanging from the top on its thread
        const restX = vw * 0.5 + mouseDriftX;
        const restY = hdr + 120 + mouseDriftY;

        // Smoothly descend toward webX, webY as About approaches
        const eased = progressToAbout * progressToAbout * (3 - 2 * progressToAbout);
        targetX = restX + (webX - restX) * eased;
        targetY = restY + (webY - restY) * eased;

        // String is ATTACHED and descending
        threadVisible = true;
        isLandedOnWeb = false;
        targetOpacity = 1;
      } else {
        // Lands on the web: STRING CUTS!
        targetX = webX;
        targetY = webY;
        threadVisible = false; // CUT!
        isLandedOnWeb = true;
        targetOpacity = 1;
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 2: About section
    // ────────────────────────────────────────────────────────────────────────
    else if (projectsTop > vh * 0.5) {
      // Comfortably inside About section
      // Spider sits on the web, STRING IS CUT
      targetX = webX + (mouseX - vw * 0.5) * 0.04;
      targetY = webY + (mouseY - vh * 0.5) * 0.04;
      threadVisible = false; // CUT!
      isLandedOnWeb = true;
      targetOpacity = 1;
    }
    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 3: Projects & Skills (Circuit background)
    // ────────────────────────────────────────────────────────────────────────
    else if (journeyTop > vh * 0.6) {
      // In Projects or Skills: fade spider out cleanly so it does not float over cards
      targetX = webX;
      targetY = webY;
      threadVisible = false;
      isLandedOnWeb = false;
      targetOpacity = 0;
    }
    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 4: Journey (WebSplit background)
    // ────────────────────────────────────────────────────────────────────────
    else if (contactTop > vh * 0.85) {
      // In Journey section: spider is back on the web! STRING IS STILL CUT.
      targetX = webX + (mouseX - vw * 0.5) * 0.04;
      targetY = webY + (mouseY - vh * 0.5) * 0.04;
      threadVisible = false; // CUT!
      isLandedOnWeb = true;
      targetOpacity = 1;
    }
    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 5: Journey -> Contact transition
    // "again attach at journey when it will go to the contacts page"
    // ────────────────────────────────────────────────────────────────────────
    else {
      // Transitioning into Contact section (Night City)
      // STRING ATTACHES AGAIN! Spider drops down into Contact on its thread.
      const contactProgress = Math.max(0, Math.min(1, (vh - contactTop) / (vh - (hdr + 20))));
      const eased = contactProgress * contactProgress * (3 - 2 * contactProgress);

      const contactRestX = vw * 0.5 + mouseDriftX;
      const contactRestY = hdr + 130 + mouseDriftY;

      targetX = webX + (contactRestX - webX) * eased;
      targetY = webY + (contactRestY - webY) * eased;

      // The thread attaches again!
      threadVisible = true;
      isLandedOnWeb = false;
      targetOpacity = 1;
    }

    // ── Smooth coordinate interpolation ─────────────────────────────────────
    const prevX = currentX;
    const prevY = currentY;
    const easeRate = isLandedOnWeb ? 0.18 : 0.12;
    currentX += (targetX - currentX) * easeRate;
    currentY += (targetY - currentY) * easeRate;
    spiderOpacity += (targetOpacity - spiderOpacity) * 0.1;

    const moveDist = Math.hypot(currentX - prevX, currentY - prevY);

    // ── Orientation Angle ───────────────────────────────────────────────────
    if (isLandedOnWeb) {
      targetAngle = 0;
    } else if (isClimbingUp && threadVisible) {
      // Facing up toward ceiling thread when climbing
      targetAngle = Math.PI;
    } else {
      // Facing down when hanging or descending
      targetAngle = 0;
    }

    let diff = targetAngle - spiderAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    spiderAngle += diff * 0.15;

    // ── Leg stepping animation ──────────────────────────────────────────────
    if (isLandedOnWeb) {
      legPhase += 0.02; // Subtle idle breathing on web
    } else if (moveDist > 0.2 || Math.abs(scrollDelta) > 0.5) {
      legPhase += Math.max(moveDist * 0.25, 0.2); // Striding along string
    } else {
      legPhase += 0.02;
    }

    // ── Apply Opacity to Canvas ─────────────────────────────────────────────
    spiderCvs.style.opacity = spiderOpacity < 0.02 ? '0' : spiderOpacity.toFixed(2);

    // ── Render Thread & Spider ──────────────────────────────────────────────
    updateThread(hdr, threadVisible);
    drawSpider(isLandedOnWeb);
  }

  // ── Update Thread (Directly Vertical, Never Hard-Pinned to Single Point) ──
  function updateThread(hdr, visible) {
    if (!visible || spiderOpacity < 0.05) {
      threadEl.style.display = 'none';
      beadEl.style.display   = 'none';
      return;
    }

    threadEl.style.display = 'block';
    beadEl.style.display   = 'block';

    // The thread drops vertically from the ceiling directly above the spider:
    // x1 = currentX, so the line is ALWAYS vertical and NEVER angles diagonally across text!
    const ax = currentX;
    const ay = hdr;

    threadEl.setAttribute('x1', ax);
    threadEl.setAttribute('y1', ay);
    threadEl.setAttribute('x2', currentX);
    threadEl.setAttribute('y2', currentY);

    beadEl.setAttribute('cx', ax);
    beadEl.setAttribute('cy', ay + 1);

    spiderCvs.style.left = (currentX - W / 2) + 'px';
    spiderCvs.style.top  = (currentY - H / 2) + 'px';
  }

  // ── Draw Spider Body & Jointed Legs ──────────────────────────────────────
  function drawSpider(isLanded) {
    ctx.clearRect(0, 0, W, H);
    if (spiderOpacity < 0.02) return;

    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spiderAngle);

    // Shadow
    ctx.fillStyle = 'rgba(9, 11, 22, 0.4)';
    ctx.beginPath();
    ctx.ellipse(1, 4, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8 Delicate Jointed Spider Legs
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
        if (isLanded) {
          // Spread legs gripping web strands with gentle pulse
          s = Math.sin(legPhase + i * 1.2) * 0.9;
        } else if (isClimbingUp) {
          // Climbing strides reaching upward
          s = Math.sin(legPhase + (i % 2 === 0 ? 0 : Math.PI)) * 3.2;
        } else {
          // Hanging / descending gentle flex
          s = Math.sin(legPhase + i * (Math.PI / 2)) * 1.6;
        }
      }

      // Left leg
      ctx.beginPath();
      ctx.moveTo(-2.5, leg.sy);
      ctx.lineTo(leg.kx + s * 0.4, leg.ky + s);
      ctx.lineTo(leg.fx + s, leg.fy + s * 1.2);
      ctx.stroke();

      // Right leg (mirror)
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

    // Diamond dorsal marking
    ctx.fillStyle = 'rgba(243, 241, 234, 0.88)';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(2, 5.5);
    ctx.lineTo(0, 9);
    ctx.lineTo(-2, 5.5);
    ctx.closePath();
    ctx.fill();

    // Cephalothorax (head)
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

  // Start immediately
  requestAnimationFrame(loop);
})();
