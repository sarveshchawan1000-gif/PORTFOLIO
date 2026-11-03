
/**
 * scrollSpider.js — Unified Scroll-Driven Spider
 *
 * Requirements:
 * 1. Thread drops straight down from ceiling directly above spider (x1 = currentX, y1 = hdr).
 *    Never attached to a single static point; follows spider naturally.
 * 2. On the string (Home & Contact):
 *    - Follows cursor horizontally (mouseX) and vertically (mouseY reels string in/out).
 *    - Reaching / climbing leg animation when moving up, relaxing when lowering.
 * 3. Scrolling Home -> About:
 *    - Descends from Home position toward the WebSplit orb-web at screen center.
 * 4. Landed on the Web (About & Journey):
 *    - STRING CUTS! Thread completely disappears (threadEl.style.display = 'none').
 *    - Spider actively crawls and follows cursor point across the web (within web radius).
 *    - Turns to face the cursor direction while walking.
 *    - 8 jointed legs actively step and walk along web strands.
 * 5. Projects & Skills (Circuit):
 *    - Spider fades out cleanly over circuit board.
 * 6. Journey -> Contact:
 *    - STRING ATTACHES AGAIN from ceiling, and spider descends on its thread into Contact.
 *    - Follows cursor on string again.
 * 7. Scrolling back up reverses seamlessly.
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
  let currentX      = window.innerWidth * 0.5;
  let currentY      = 140;
  let spiderAngle   = 0;
  let targetAngle   = 0;
  let legPhase      = 0;
  let spiderOpacity = 1;

  let lastScrollY  = window.scrollY || 0;
  let isClimbingUp = false;

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

    // Center of the screen where WebSplit orb-web sits
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
    let easeRate      = 0.12;

    // ── Cursor following calculations on string ──
    const stringFollowX = Math.max(70, Math.min(vw - 70, mouseX));
    const stringMinY    = hdr + 75;
    const stringMaxY    = Math.min(vh * 0.72, vh - 100);
    const stringFollowY = Math.max(stringMinY, Math.min(stringMaxY, mouseY));

    // ── Cursor following calculations on web ──
    const webDx = mouseX - webX;
    const webDy = mouseY - webY;
    const webDist = Math.hypot(webDx, webDy);
    const maxCrawlRadius = Math.min(vw * 0.32, vh * 0.32, 150);
    const crawlDist = Math.min(webDist * 0.65, maxCrawlRadius);

    let webTargetX = webX;
    let webTargetY = webY;
    if (webDist > 2) {
      webTargetX = webX + (webDx / webDist) * crawlDist;
      webTargetY = webY + (webDy / webDist) * crawlDist;
    }

    // Active route determined by router's IntersectionObserver
    const activeRoute = (window.portfolioRouter && window.portfolioRouter.currentRoute) || 'home';

    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 1: Home (or transitioning Home -> About)
    // ────────────────────────────────────────────────────────────────────────
    if (activeRoute === 'home') {
      const progressToAbout = Math.max(0, Math.min(1, (vh - aboutTop) / (vh - (hdr + 20))));

      if (progressToAbout < 0.92) {
        // ON STRING: follows cursor point horizontally & vertically
        const restX = stringFollowX;
        const restY = stringFollowY;

        // Descend smoothly toward web as About scrolls in
        const eased = progressToAbout * progressToAbout * (3 - 2 * progressToAbout);
        targetX = restX + (webTargetX - restX) * eased;
        targetY = restY + (webTargetY - restY) * eased;

        threadVisible = true;
        isLandedOnWeb = false;
        targetOpacity = 1;
        easeRate = 0.12;

        if (targetY < currentY - 3 || isClimbingUp) {
          targetAngle = Math.PI; // Face upward when climbing
        } else {
          targetAngle = (mouseX - currentX) * 0.004;
        }
      } else {
        // Reached the web: STRING CUTS!
        targetX = webTargetX;
        targetY = webTargetY;
        threadVisible = false;
        isLandedOnWeb = true;
        targetOpacity = 1;
        easeRate = 0.08;

        if (webDist > 6) {
          targetAngle = Math.atan2(webDy, webDx) + Math.PI / 2;
        } else {
          targetAngle = 0;
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 2: About section (LANDED ON WEB)
    // ────────────────────────────────────────────────────────────────────────
    else if (activeRoute === 'about') {
      // Spider actively crawls and follows cursor point across the web
      targetX = webTargetX;
      targetY = webTargetY;
      threadVisible = false; // STRING IS CUT!
      isLandedOnWeb = true;
      targetOpacity = 1;
      easeRate = 0.08;

      if (webDist > 6) {
        targetAngle = Math.atan2(webDy, webDx) + Math.PI / 2;
      } else {
        targetAngle = 0;
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 3: Projects & Skills (Circuit background)
    // ────────────────────────────────────────────────────────────────────────
    else if (activeRoute === 'projects' || activeRoute === 'skills') {
      targetX = webX;
      targetY = webY;
      threadVisible = false;
      isLandedOnWeb = false;
      targetOpacity = 0; // Fade out cleanly over circuit board
    }
    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 4: Journey section (LANDED ON WEB)
    // ────────────────────────────────────────────────────────────────────────
    else if (activeRoute === 'journey') {
      // Check if Contact is scrolling in near bottom
      if (contactTop < vh * 0.75) {
        // Approaching Contact: STRING ATTACHES AGAIN!
        const contactProgress = Math.max(0, Math.min(1, (vh * 0.75 - contactTop) / (vh * 0.75 - (hdr + 20))));
        const eased = contactProgress * contactProgress * (3 - 2 * contactProgress);

        targetX = webTargetX + (stringFollowX - webTargetX) * eased;
        targetY = webTargetY + (stringFollowY - webTargetY) * eased;

        threadVisible = true; // REATTACHED!
        isLandedOnWeb = false;
        targetOpacity = 1;
        easeRate = 0.12;

        if (targetY < currentY - 3 || isClimbingUp) {
          targetAngle = Math.PI;
        } else {
          targetAngle = (mouseX - currentX) * 0.004;
        }
      } else {
        // Sitting on the web in Journey: STRING IS CUT! Follows cursor on web
        targetX = webTargetX;
        targetY = webTargetY;
        threadVisible = false; // CUT!
        isLandedOnWeb = true;
        targetOpacity = 1;
        easeRate = 0.08;

        if (webDist > 6) {
          targetAngle = Math.atan2(webDy, webDx) + Math.PI / 2;
        } else {
          targetAngle = 0;
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    // SCROLL STAGE 5: Contact section (ON STRING)
    // ────────────────────────────────────────────────────────────────────────
    else {
      // Contact section: spider hangs from string, following cursor
      targetX = stringFollowX;
      targetY = stringFollowY;
      threadVisible = true; // ATTACHED!
      isLandedOnWeb = false;
      targetOpacity = 1;
      easeRate = 0.12;

      if (targetY < currentY - 3 || isClimbingUp) {
        targetAngle = Math.PI;
      } else {
        targetAngle = (mouseX - currentX) * 0.004;
      }
    }

    // ── Smooth coordinate interpolation ─────────────────────────────────────
    const prevX = currentX;
    const prevY = currentY;
    currentX += (targetX - currentX) * easeRate;
    currentY += (targetY - currentY) * easeRate;
    spiderOpacity += (targetOpacity - spiderOpacity) * 0.1;

    const moveDist = Math.hypot(currentX - prevX, currentY - prevY);

    // ── Smooth angle interpolation ──────────────────────────────────────────
    let diff = targetAngle - spiderAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    spiderAngle += diff * (isLandedOnWeb ? 0.12 : 0.16);

    // ── Leg stepping animation (Walking / Crawling) ─────────────────────────
    if (isLandedOnWeb) {
      if (moveDist > 0.12) {
        // Active crawling along web strands towards cursor
        legPhase += moveDist * 0.38;
      } else {
        // Subtle idle breathing & twitching on strands
        legPhase += 0.02;
      }
    } else if (threadVisible) {
      if (moveDist > 0.15 || Math.abs(scrollDelta) > 0.5) {
        // Climbing or reeling leg motion
        legPhase += Math.max(moveDist * 0.28, 0.2);
      } else {
        legPhase += 0.02;
      }
    }

    // ── Apply Canvas Opacity & Position ─────────────────────────────────────
    spiderCvs.style.opacity = spiderOpacity < 0.02 ? '0' : spiderOpacity.toFixed(2);
    spiderCvs.style.left    = (currentX - W / 2) + 'px';
    spiderCvs.style.top     = (currentY - H / 2) + 'px';

    // ── Render Thread & Spider ──────────────────────────────────────────────
    updateThread(hdr, threadVisible);
    drawSpider(isLandedOnWeb, moveDist);
  }

  // ── Update Thread (Vertical directly above spider) ───────────────────────
  function updateThread(hdr, visible) {
    if (!visible || spiderOpacity < 0.05) {
      threadEl.style.display = 'none';
      beadEl.style.display   = 'none';
      return;
    }

    threadEl.style.display = 'block';
    beadEl.style.display   = 'block';

    // The thread drops vertically from ceiling directly above spider
    const ax = currentX;
    const ay = hdr;

    threadEl.setAttribute('x1', ax);
    threadEl.setAttribute('y1', ay);
    threadEl.setAttribute('x2', currentX);
    threadEl.setAttribute('y2', currentY);

    beadEl.setAttribute('cx', ax);
    beadEl.setAttribute('cy', ay + 1);
  }

  // ── Draw Spider Body & Jointed Walking Legs ──────────────────────────────
  function drawSpider(isLanded, moveDist) {
    ctx.clearRect(0, 0, W, H);
    if (spiderOpacity < 0.02) return;

    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spiderAngle);

    // Dynamic drop shadow
    ctx.fillStyle = 'rgba(9, 11, 22, 0.42)';
    ctx.beginPath();
    ctx.ellipse(1, 4, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8 Delicate Jointed Spider Legs
    ctx.strokeStyle = '#E23636';
    ctx.lineWidth   = 1.35;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    const legs = [
      { sy: -4, kx: -8,  ky: -11, fx: -14, fy: -9  },
      { sy: -2, kx: -11, ky: -6,  fx: -17, fy: -4  },
      { sy:  1, kx: -11, ky:  4,  fx: -16, fy:  10 },
      { sy:  3, kx:  -8, ky:  9,  fx: -13, fy:  16 }
    ];

    const isMoving = moveDist > 0.12;

    legs.forEach((leg, i) => {
      let s = 0;
      if (!reducedMotion) {
        if (isLanded) {
          if (isMoving) {
            // Contralateral stepping gait across web strands
            const gaitPhase = legPhase + (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? 0.6 : 0);
            s = Math.sin(gaitPhase) * 2.8;
          } else {
            // Gripping web strands with subtle idle breathing
            s = Math.sin(legPhase + i * 1.2) * 0.8;
          }
        } else if (isClimbingUp) {
          // Climbing strides reaching upward
          const climbPhase = legPhase + (i % 2 === 0 ? 0 : Math.PI);
          s = Math.sin(climbPhase) * 3.4;
        } else {
          // Hanging / descending flex
          s = Math.sin(legPhase + i * (Math.PI / 2)) * 1.8;
        }
      }

      // Left leg
      ctx.beginPath();
      ctx.moveTo(-2.5, leg.sy);
      ctx.lineTo(leg.kx + s * 0.4, leg.ky + s);
      ctx.lineTo(leg.fx + s, leg.fy + s * 1.15);
      ctx.stroke();

      // Right leg (mirror)
      ctx.beginPath();
      ctx.moveTo(2.5, leg.sy);
      ctx.lineTo(-leg.kx - s * 0.4, leg.ky + s);
      ctx.lineTo(-leg.fx - s, leg.fy + s * 1.15);
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
