/**
 * Main Application Engine
 * Handles:
 * - Canvas lifecycle, DPR capping at 2, single RAF loop
 * - Tab visibility pausing & Low-FPS (<30fps) particle throttling
 * - Scene transitions (switch scene & fade in from dark over ~25 frames)
 * - Projects JSON fetching and rendering
 * - Project card 3D tilt up to 4 degrees
 * - Typewriter role cycling on home view
 */
(function() {
  'use strict';

  // --- Configuration & State ---
  const CANVAS_ID = 'bg-canvas';
  const MAX_DPR = 2;
  const FADE_TRANSITION_FRAMES = 25;

  const TYPEWRITER_PHRASES = [
    'Software engineer in progress',
    'Game systems tinkerer',
    'Local AI experimenter',
    'Web builder'
  ];

  let canvas, ctx;
  let dpr = 1;
  let canvasWidth = 0;
  let canvasHeight = 0;

  // Background scene instances
  let scenes = {};
  let currentSceneKey = 'nightcity';
  let activeScene = null;

  // Transition state
  let transitionStep = 0;
  let isTransitioning = false;

  // Reduced motion preference
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;
  motionQuery.addEventListener('change', (e) => {
    reducedMotion = e.matches;
  });

  // RAF & Performance monitoring
  let animationFrameId = null;
  let lastTime = 0;
  let fpsHistory = [];
  let lowFpsMode = false;

  // --- Initializer ---
  function init() {
    initCanvas();
    initScenes();
    bindEvents();
    loadProjects();
    initTypewriter();
    initFeaturedProject();
    startLoop();
  }

  // --- Canvas Setup ---
  function initCanvas() {
    canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: false });
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Notify active scenes
    Object.values(scenes).forEach(scene => {
      if (scene && typeof scene.resize === 'function') {
        scene.resize(canvasWidth, canvasHeight);
      }
    });
  }

  function getSceneForRoute(route) {
    if (['about', 'journey'].includes(route)) return 'spiderweb';
    if (['projects', 'skills'].includes(route)) return 'circuit';
    return 'nightcity';
  }

  function initScenes() {
    if (window.NightCityBackground) scenes.nightcity = new window.NightCityBackground();
    if (window.SpiderWebBackground) {
      scenes.spiderweb = new window.SpiderWebBackground();
      scenes.sakura = scenes.spiderweb;
    } else if (window.SakuraBackground) {
      scenes.spiderweb = new window.SakuraBackground();
      scenes.sakura = scenes.spiderweb;
    }
    if (window.CircuitBackground) scenes.circuit = new window.CircuitBackground();

    // Determine initial scene from URL hash
    const initialHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    currentSceneKey = getSceneForRoute(initialHash);
    activeScene = scenes[currentSceneKey] || scenes.nightcity;

    if (activeScene) {
      activeScene.init(canvasWidth, canvasHeight);
    }

    // No blackout on initial load
    isTransitioning = false;
    transitionStep = 0;
  }

  // --- Scene Switching with Fade-in from Dark ---
  function switchScene(sceneKey) {
    if (currentSceneKey === sceneKey && activeScene) return;
    if (!scenes[sceneKey]) return;

    currentSceneKey = sceneKey;
    activeScene = scenes[sceneKey];
    if (activeScene && !activeScene.initialized) {
      activeScene.init(canvasWidth, canvasHeight);
    }

    // Trigger ~25 frame fade in from dark
    transitionStep = FADE_TRANSITION_FRAMES;
    isTransitioning = true;
  }

  // --- Event Bindings ---
  function bindEvents() {
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 100);
    });

    // Cursor tracking
    window.addEventListener('mousemove', (e) => {
      if (activeScene && typeof activeScene.setMouse === 'function') {
        activeScene.setMouse(e.clientX, e.clientY);
      }
    });

    // Touch support for mobile canvas interaction
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0] && activeScene && typeof activeScene.setMouse === 'function') {
        activeScene.setMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // Route change listener from router.js
    window.addEventListener('portfolio:route-changed', (e) => {
      const { scene } = e.detail;
      if (scene) {
        switchScene(scene);
      }
    });

    // Tab visibility handling: pause RAF when hidden to preserve battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      } else {
        lastTime = performance.now();
        startLoop();
      }
    });
  }

  // --- Master Canvas Animation Loop ---
  function startLoop() {
    if (animationFrameId) return;
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(loop);
  }

  function loop(now) {
    animationFrameId = requestAnimationFrame(loop);

    const delta = now - lastTime;
    lastTime = now;

    // Monitor FPS to automatically drop particle counts if < 30fps
    if (delta > 0) {
      const fps = 1000 / delta;
      fpsHistory.push(fps);
      if (fpsHistory.length > 45) {
        fpsHistory.shift();
        const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
        lowFpsMode = avgFps < 30;
      }
    }

    if (!activeScene || !ctx) return;

    // Update active scene
    activeScene.update(reducedMotion, lowFpsMode);

    // Draw active scene
    activeScene.draw(ctx, canvasWidth, canvasHeight, reducedMotion, lowFpsMode);

    // Apply fade-in from dark overlay over ~25 frames on scene transition
    if (isTransitioning) {
      const darknessAlpha = transitionStep / FADE_TRANSITION_FRAMES;
      ctx.fillStyle = `rgba(9, 11, 22, ${darknessAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      transitionStep--;
      if (transitionStep <= 0) {
        isTransitioning = false;
      }
    }
  }

  // --- Card Tilt Interaction ---
  function bindTiltToCards() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        if (reducedMotion) return;

        const rect = card.getBoundingClientRect();
        const cardX = rect.left + rect.width / 2;
        const cardY = rect.top + rect.height / 2;

        const offsetX = (e.clientX - cardX) / (rect.width / 2);
        const offsetY = (e.clientY - cardY) / (rect.height / 2);

        // Tilt up to 4 degrees toward the cursor
        const maxDeg = 4;
        const tiltX = -offsetY * maxDeg;
        const tiltY = offsetX * maxDeg;

        card.style.transform = `perspective(800px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-2px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  }

  // --- Projects Data Fetching & Rendering ---
  async function loadProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;

    try {
      const response = await fetch('./data/projects.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const projects = await response.json();
      renderProjects(projects, container);
    } catch (err) {
      console.warn('Could not load projects.json via fetch, rendering inline fallback:', err);
      // Fallback in case of local file:// execution without http server
      renderProjects(getInlineProjectsFallback(), container);
    }
  }

  function renderProjects(projects, container) {
    let html = '';

    projects.forEach(project => {
      const tags = project.stack.map(s => `<span class="tag-pill">${escapeHTML(s)}</span>`).join('');

      html += `
        <article class="panel project-card tilt-card" id="project-${project.id}">
          <div class="web-corner top-right"></div>
          <div class="web-corner bottom-left"></div>
          
          <div class="project-header">
            <span class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">${escapeHTML(project.status)}</span>
            </span>
            <div class="project-links">
              <a href="${escapeHTML(project.links.github)}" class="btn-subtle" target="_blank" rel="noopener noreferrer">Code ↗</a>
              <a href="${escapeHTML(project.links.demo)}" class="btn-subtle" target="_blank" rel="noopener noreferrer">Live Demo ↗</a>
            </div>
          </div>

          <h3 class="project-title thread-heading">${escapeHTML(project.title)}</h3>
          <p class="project-summary">${escapeHTML(project.summary)}</p>

          <div class="case-study-details">
            <div class="detail-block">
              <h4 class="label-heading">Problem</h4>
              <p class="detail-body">${escapeHTML(project.problem)}</p>
            </div>
            <div class="detail-block">
              <h4 class="label-heading">Approach</h4>
              <p class="detail-body">${escapeHTML(project.approach)}</p>
            </div>
          </div>

          <div class="project-footer">
            <div class="stack-tags" aria-label="Technology Stack">
              ${tags}
            </div>
            ${project.metrics ? `<div class="project-metrics">${escapeHTML(project.metrics)}</div>` : ''}
          </div>
        </article>
      `;
    });

    // Add the dashed "Next Build" card
    html += `
      <article class="panel project-card tilt-card next-build-card">
        <div class="web-corner top-right"></div>
        <div class="web-corner bottom-left"></div>
        
        <div class="project-header">
          <span class="status-indicator">
            <span class="status-dot next-dot"></span>
            <span class="status-text">In R&D</span>
          </span>
        </div>

        <h3 class="project-title thread-heading">Next Build: Autonomous Multi-Agent Canvas Sim</h3>
        <p class="project-summary">A physics-driven web simulation where autonomous local agent swarms negotiate shared resource topologies via lightweight browser-side compute.</p>

        <div class="case-study-details">
          <div class="detail-block">
            <h4 class="label-heading">Problem</h4>
            <p class="detail-body">Simulating multi-agent spatial coordination without heavy cloud compute or complex WebGL dependencies.</p>
          </div>
          <div class="detail-block">
            <h4 class="label-heading">Approach</h4>
            <p class="detail-body">Spatial grid partitioning, deterministic state vectors in WebAssembly / modern JS, and continuous 60fps canvas rendering.</p>
          </div>
        </div>

        <div class="project-footer">
          <div class="stack-tags" aria-label="Planned Stack">
            <span class="tag-pill">WebAssembly</span>
            <span class="tag-pill">Canvas 2D</span>
            <span class="tag-pill">Web Workers</span>
          </div>
          <div class="project-metrics">Prototyping phase</div>
        </div>
      </article>
    `;

    container.innerHTML = html;
    bindTiltToCards();
  }

  function getInlineProjectsFallback() {
    return [
      {
        id: "amendment",
        status: "Active experiment",
        title: "AMENDMENT",
        summary: "A board game where players rewrite the rules mid-match. A local Gemma model via Ollama proposes and interprets amendments; a deterministic engine enforces them.",
        problem: "Dynamic rule-making in tabletop games traditionally leads to ambiguity and game-breaking edge cases. Generative models can invent creative twists, but unconstrained LLM outputs easily hallucinate impossible mechanics or break game-state continuity.",
        approach: "Engineered a dual-engine architecture: a local Gemma model running in Ollama translates player intent into structured JSON rule contracts, while a deterministic Python state machine validates mathematical invariants before merging amendments into active gameplay.",
        stack: ["Python", "FastAPI", "Ollama", "Gemma"],
        links: {
          github: "[github-repo-url]",
          demo: "[demo-link]"
        },
        metrics: "Local sub-300ms inference • Zero cloud dependencies"
      },
      {
        id: "fashion-store",
        status: "Live concept",
        title: "Fashion Store",
        summary: "A premium clothing storefront with parallax scenes and sideways motion, cream/black/cyan identity, and INR pricing.",
        problem: "Standard e-commerce layouts feel mechanical and grid-bound, failing to deliver the sensory atmosphere and editorial depth needed for high-end boutique apparel.",
        approach: "Built a bespoke zero-framework storefront utilizing multi-layer CSS parallax, horizontal swipe kinematics, a high-contrast cream/black/cyan color system, and instant localized INR pricing calculations without layout shifting.",
        stack: ["HTML5", "CSS3", "JavaScript"],
        links: {
          github: "[github-repo-url]",
          demo: "[demo-link]"
        },
        metrics: "60fps sideways scroll • 0kB external runtime"
      }
    ];
  }

  // --- Typewriter Effect for Home Role Line ---
  function initTypewriter() {
    const el = document.getElementById('role-typewriter');
    if (!el) return;

    if (reducedMotion) {
      el.textContent = TYPEWRITER_PHRASES[0];
      return;
    }

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function typeTick() {
      const currentPhrase = TYPEWRITER_PHRASES[phraseIdx];

      if (isDeleting) {
        charIdx--;
        el.textContent = currentPhrase.substring(0, charIdx);
      } else {
        charIdx++;
        el.textContent = currentPhrase.substring(0, charIdx);
      }

      let typeSpeed = isDeleting ? 38 : 75;

      if (!isDeleting && charIdx === currentPhrase.length) {
        // Pause at complete phrase
        typeSpeed = 1900;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        // Move to next phrase
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % TYPEWRITER_PHRASES.length;
        typeSpeed = 450;
      }

      setTimeout(typeTick, typeSpeed);
    }

    typeTick();
  }

  // --- Featured Project Tile Interactivity ---
  function initFeaturedProject() {
    // Add tilt to home highlight tiles
    const highlightCards = document.querySelectorAll('.highlight-tile');
    highlightCards.forEach(card => {
      card.classList.add('tilt-card');
    });
    bindTiltToCards();
  }

  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
