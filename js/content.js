/**
 * content.js — Dynamic Content Engine & On-Page Editor
 *
 * Responsibilities:
 * 1. Loads content from localStorage ('portfolio_content') or falls back to /data/content.json.
 * 2. Renders all dynamic sections: Home, About, Projects, Skills, Journey, Contact, and Footer.
 * 3. Provides an accessible, on-page editor (via 'Edit' button or #edit URL token) allowing:
 *    - Editing About text
 *    - Adding, editing, and deleting Projects
 *    - Exporting (downloading updated content.json)
 *    - Importing (loading a custom content.json file)
 *    - Resetting to default published content
 *    - Saving to localStorage with clear browser-only notice
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'portfolio_content';
  let defaultContent = null;
  let activeContent = null;

  // --- HTML Escape Helper ---
  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Content Loading ---
  async function loadContent() {
    try {
      const response = await fetch('./data/content.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      defaultContent = await response.json();
    } catch (err) {
      console.warn('Could not fetch /data/content.json, using bundled fallback:', err);
      defaultContent = getBundledFallback();
    }

    // Check localStorage for saved edits
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        activeContent = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse localStorage content, resetting to default:', e);
        activeContent = JSON.parse(JSON.stringify(defaultContent));
      }
    } else {
      activeContent = JSON.parse(JSON.stringify(defaultContent));
    }

    window.portfolioContent = activeContent;
    renderAll();
    initEditorUI();
    checkEditHash();
  }

  // --- Render All Sections ---
  function renderAll() {
    if (!activeContent) return;
    renderHome();
    renderAbout();
    renderProjects();
    renderSkills();
    renderJourney();
    renderContact();
    renderFooter();

    // Rebind tilt interactions to newly rendered panels
    if (typeof window.bindTiltToCards === 'function') {
      window.bindTiltToCards();
    }
  }

  // --- 1. Render Home View ---
  function renderHome() {
    const p = activeContent.personal || {};

    const nameEl = document.getElementById('home-name-heading');
    if (nameEl) nameEl.textContent = p.name || 'Sarvesh Chavan';

    const taglineEl = document.getElementById('home-tagline-text');
    if (taglineEl) taglineEl.textContent = p.tagline || '';

    // Update typewriter phrases if available
    if (Array.isArray(p.roles) && p.roles.length > 0 && Array.isArray(window.TYPEWRITER_PHRASES)) {
      window.TYPEWRITER_PHRASES.length = 0;
      p.roles.forEach(r => window.TYPEWRITER_PHRASES.push(r));
    }

    // Profile card on home
    const bioTextEl = document.getElementById('home-bio-text');
    if (bioTextEl && activeContent.about) {
      bioTextEl.textContent = activeContent.about.lead || '';
    }

    const statFocusEl = document.getElementById('stat-focus-value');
    if (statFocusEl) statFocusEl.textContent = 'Frontend Development';

    const statStudyEl = document.getElementById('stat-study-value');
    if (statStudyEl) statStudyEl.textContent = p.study || 'B.Tech CSE (AI/ML) - 1st Year';

    // Home highlights
    renderHomeHighlights();
  }

  function renderHomeHighlights() {
    const container = document.getElementById('home-highlights-container');
    if (!container || !activeContent.projects) return;

    let html = '';
    const featured = activeContent.projects.slice(0, 2);

    featured.forEach(proj => {
      const isProgress = !proj.link || proj.link.toLowerCase().includes('progress');
      const arrowText = isProgress ? 'Inspect project &rarr;' : 'View project &rarr;';
      const dest = '#projects';

      html += `
        <a href="${dest}" class="panel highlight-tile tilt-card" aria-label="Project: ${escapeHTML(proj.title)}">
          <div class="web-corner top-right"></div>
          <div class="web-corner bottom-left"></div>
          <div>
            <span class="highlight-label">${escapeHTML(proj.status || 'Featured Build')}</span>
            <h2 class="highlight-title thread-heading">${escapeHTML(proj.title)}</h2>
            <p class="highlight-desc">${escapeHTML(proj.summary || proj.description || '')}</p>
          </div>
          <span class="tile-arrow">${arrowText}</span>
        </a>
      `;
    });

    container.innerHTML = html;
  }

  // --- 2. Render About View ---
  function renderAbout() {
    const about = activeContent.about;
    if (!about) return;

    const leadEl = document.getElementById('about-lead-text');
    if (leadEl) leadEl.textContent = about.lead || '';

    const bodyEl = document.getElementById('about-body-text');
    if (bodyEl) bodyEl.textContent = about.body || '';

    // Interests chips
    const chipsEl = document.getElementById('about-interests-chips');
    if (chipsEl && Array.isArray(about.interests)) {
      chipsEl.innerHTML = about.interests.map(i => `
        <span class="interest-chip">
          <span class="chip-tag">#</span> ${escapeHTML(i)}
        </span>
      `).join('');
    }

    // Principles
    const principlesEl = document.getElementById('about-principles-list');
    if (principlesEl && Array.isArray(about.principles)) {
      principlesEl.innerHTML = about.principles.map(pr => `
        <div class="principle-item">
          <h3 class="principle-title">${escapeHTML(pr.title)}</h3>
          <p class="principle-desc">${escapeHTML(pr.description)}</p>
        </div>
      `).join('');
    }
  }

  // --- 3. Render Projects View ---
  function renderProjects() {
    const container = document.getElementById('projects-container');
    if (!container || !Array.isArray(activeContent.projects)) return;

    let html = '';

    activeContent.projects.forEach(project => {
      const tags = (project.stack || []).map(s => `<span class="tag-pill">${escapeHTML(s)}</span>`).join('');
      const isProgress = !project.link || project.link.toLowerCase().includes('progress');

      let linkAction = '';
      if (isProgress) {
        linkAction = `<span class="tag-pill tag-status-pill">In Progress</span>`;
      } else {
        linkAction = `<a href="${escapeHTML(project.link)}" class="btn-subtle" target="_blank" rel="noopener noreferrer">View Project &rarr;</a>`;
      }

      html += `
        <article class="panel project-card tilt-card" id="project-${escapeHTML(project.id || '')}">
          <div class="web-corner top-right"></div>
          <div class="web-corner bottom-left"></div>
          
          <div class="project-header">
            <span class="status-indicator">
              <span class="status-dot ${isProgress ? 'next-dot' : ''}"></span>
              <span class="status-text">${escapeHTML(project.status || '')}</span>
            </span>
            <div class="project-links">
              ${linkAction}
            </div>
          </div>

          <h3 class="project-title thread-heading">${escapeHTML(project.title)}</h3>
          <p class="project-summary">${escapeHTML(project.summary || project.description || '')}</p>

          <div class="case-study-details">
            <div class="detail-block">
              <h4 class="label-heading">Problem</h4>
              <p class="detail-body">${escapeHTML(project.problem || '')}</p>
            </div>
            <div class="detail-block">
              <h4 class="label-heading">What I Did</h4>
              <p class="detail-body">${escapeHTML(project.whatIDid || '')}</p>
            </div>
          </div>

          <div class="project-footer">
            <div class="stack-tags" aria-label="Technology Stack">
              ${tags}
            </div>
          </div>
        </article>
      `;
    });

    container.innerHTML = html;
  }

  // --- 4. Render Skills View ---
  function renderSkills() {
    const container = document.getElementById('skills-container');
    if (!container || !Array.isArray(activeContent.skills)) return;

    let html = '';

    activeContent.skills.forEach(cat => {
      const isBadge = !!cat.badge;
      const itemsHtml = (cat.items || []).map(it => {
        const isTodo = (it.name || '').startsWith('TODO:');
        return `
          <li class="skill-item ${isTodo ? 'skill-item-todo' : ''}">
            <span class="skill-name">${escapeHTML(it.name)}</span>
            <span class="skill-context">${escapeHTML(it.context)}</span>
          </li>
        `;
      }).join('');

      html += `
        <div class="panel tilt-card ${isBadge ? 'learning-next-panel' : ''}">
          <div class="web-corner top-right"></div>
          <div class="web-corner bottom-left"></div>
          ${isBadge ? `<div class="learning-next-badge">${escapeHTML(cat.badge)}</div>` : ''}
          <h2 class="skill-panel-title thread-heading">${escapeHTML(cat.category)}</h2>
          <ul class="skill-list">
            ${itemsHtml}
          </ul>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- 5. Render Journey View ---
  function renderJourney() {
    const container = document.getElementById('journey-container');
    if (!container || !Array.isArray(activeContent.journey)) return;

    let html = '';

    activeContent.journey.forEach(entry => {
      const isTodo = (entry.title || '').startsWith('TODO:');
      html += `
        <article class="timeline-entry ${isTodo ? 'timeline-entry-todo' : ''}">
          <div class="timeline-bead" aria-hidden="true"></div>
          <div class="timeline-date">${escapeHTML(entry.date)}</div>
          <h2 class="timeline-title thread-heading">${escapeHTML(entry.title)}</h2>
          <p class="timeline-body">${escapeHTML(entry.body)}</p>
        </article>
      `;
    });

    container.innerHTML = html;
  }

  // --- 6. Render Contact View ---
  function renderContact() {
    const c = activeContent.contact || {};

    const statusEl = document.getElementById('contact-status-text');
    if (statusEl) statusEl.textContent = c.availabilityStatus || 'Active & Available';

    const availBodyEl = document.getElementById('contact-availability-body');
    if (availBodyEl) availBodyEl.textContent = c.availabilityText || '';

    const locationEl = document.getElementById('contact-location-text');
    if (locationEl) locationEl.textContent = `Location: ${c.location || 'India (Open to remote)'}`;

    const emailLinkEl = document.getElementById('contact-email-link');
    if (emailLinkEl && c.email) {
      emailLinkEl.href = `mailto:${c.email}`;
      emailLinkEl.querySelector('.link-text').textContent = `Email: ${c.email}`;
    }

    const githubLinkEl = document.getElementById('contact-github-link');
    if (githubLinkEl && c.github) {
      githubLinkEl.href = c.github;
    }

    const linkedinLinkEl = document.getElementById('contact-linkedin-link');
    if (linkedinLinkEl && c.linkedin) {
      linkedinLinkEl.href = c.linkedin;
    }

    // Resume button: Only show if resume link is real (hide dead link)
    const resumeEl = document.getElementById('contact-resume-link');
    if (resumeEl) {
      if (c.resume && c.resume !== '[file]' && c.resume.trim() !== '') {
        resumeEl.style.display = '';
        resumeEl.href = c.resume;
      } else {
        resumeEl.style.display = 'none';
      }
    }
  }

  // --- 7. Render Footer ---
  function renderFooter() {
    const footerMetaEl = document.getElementById('site-footer-meta');
    if (footerMetaEl && activeContent.personal) {
      footerMetaEl.innerHTML = `
        <span>&copy; ${new Date().getFullYear()} ${escapeHTML(activeContent.personal.name || 'Sarvesh Chavan')}</span>
        <span class="footer-bullet" aria-hidden="true">&bull;</span>
        <span>${escapeHTML(activeContent.personal.study || '1st-year B.Tech CSE (AI/ML)')}</span>
        <span class="footer-bullet" aria-hidden="true">&bull;</span>
        <span>Front-end Developer</span>
      `;
    }
  }

  // --- On-Page Editor Logic ---
  function initEditorUI() {
    const openBtn = document.getElementById('open-editor-btn');
    const modal = document.getElementById('content-editor-modal');
    const closeBtn = document.getElementById('editor-close-btn');

    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openEditor();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeEditor();
      });
    }

    // Close on backdrop click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditor();
      });
    }

    // Escape key listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
        closeEditor();
      }
    });

    // Wire Save button
    const saveBtn = document.getElementById('editor-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => saveEditorData());
    }

    // Wire Export button
    const exportBtn = document.getElementById('editor-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => exportContentJSON());
    }

    // Wire Import button
    const importInput = document.getElementById('editor-import-file');
    const importBtn = document.getElementById('editor-import-btn');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', handleImportFile);
    }

    // Wire Reset button
    const resetBtn = document.getElementById('editor-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => resetToDefault());
    }

    // Wire Add Project button
    const addProjectBtn = document.getElementById('editor-add-project-btn');
    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', () => addNewProjectFromForm());
    }
  }

  function checkEditHash() {
    if (window.location.hash.toLowerCase() === '#edit') {
      openEditor();
    }
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash.toLowerCase() === '#edit') {
      openEditor();
    }
  });

  function openEditor() {
    const modal = document.getElementById('content-editor-modal');
    if (!modal) return;

    modal.removeAttribute('hidden');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Populate form fields
    populateEditorFields();

    // Focus first editable field
    const firstField = document.getElementById('edit-about-lead');
    if (firstField) firstField.focus();
  }

  function closeEditor() {
    const modal = document.getElementById('content-editor-modal');
    if (!modal) return;

    modal.setAttribute('hidden', '');
    modal.classList.remove('is-open');
    document.body.style.overflow = '';

    // If hash was #edit, return to current route or #home
    if (window.location.hash.toLowerCase() === '#edit') {
      window.location.hash = window.portfolioRouter ? `#${window.portfolioRouter.currentRoute || 'home'}` : '#home';
    }
  }

  function populateEditorFields() {
    if (!activeContent) return;

    // About fields
    const leadField = document.getElementById('edit-about-lead');
    if (leadField) leadField.value = (activeContent.about && activeContent.about.lead) || '';

    const bodyField = document.getElementById('edit-about-body');
    if (bodyField) bodyField.value = (activeContent.about && activeContent.about.body) || '';

    // Tagline field
    const taglineField = document.getElementById('edit-home-tagline');
    if (taglineField) taglineField.value = (activeContent.personal && activeContent.personal.tagline) || '';

    // Projects list inside editor
    renderEditorProjectsList();
  }

  function renderEditorProjectsList() {
    const listEl = document.getElementById('editor-projects-list');
    if (!listEl || !Array.isArray(activeContent.projects)) return;

    let html = '';

    activeContent.projects.forEach((proj, idx) => {
      html += `
        <div class="editor-project-row" data-idx="${idx}">
          <div class="editor-proj-info">
            <strong>${escapeHTML(proj.title)}</strong>
            <span class="editor-proj-status">(${escapeHTML(proj.status || 'No status')})</span>
            <p class="editor-proj-desc">${escapeHTML(proj.summary || proj.description || '')}</p>
          </div>
          <div class="editor-proj-actions">
            <button type="button" class="btn btn-subtle edit-proj-btn" data-idx="${idx}">Edit</button>
            <button type="button" class="btn btn-subtle delete-proj-btn" data-idx="${idx}">Delete</button>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;

    // Wire edit & delete buttons
    listEl.querySelectorAll('.delete-proj-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (confirm(`Delete project "${activeContent.projects[idx].title}"?`)) {
          activeContent.projects.splice(idx, 1);
          renderEditorProjectsList();
          saveActiveContentToStorage();
          renderAll();
        }
      });
    });

    listEl.querySelectorAll('.edit-proj-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        loadProjectIntoForm(idx);
      });
    });
  }

  function loadProjectIntoForm(idx) {
    const proj = activeContent.projects[idx];
    if (!proj) return;

    document.getElementById('edit-proj-id').value = proj.id || '';
    document.getElementById('edit-proj-title').value = proj.title || '';
    document.getElementById('edit-proj-status').value = proj.status || '';
    document.getElementById('edit-proj-summary').value = proj.summary || proj.description || '';
    document.getElementById('edit-proj-problem').value = proj.problem || '';
    document.getElementById('edit-proj-what').value = proj.whatIDid || '';
    document.getElementById('edit-proj-stack').value = (proj.stack || []).join(', ');
    document.getElementById('edit-proj-link').value = proj.link || '';
    document.getElementById('edit-proj-index').value = idx.toString();

    document.getElementById('editor-add-project-btn').textContent = 'Update Project';
  }

  function addNewProjectFromForm() {
    const idxVal = document.getElementById('edit-proj-index').value;
    const title = document.getElementById('edit-proj-title').value.trim();
    if (!title) {
      alert('Please enter a project title.');
      return;
    }

    const status = document.getElementById('edit-proj-status').value.trim() || 'In Progress';
    const summary = document.getElementById('edit-proj-summary').value.trim();
    const problem = document.getElementById('edit-proj-problem').value.trim();
    const whatIDid = document.getElementById('edit-proj-what').value.trim();
    const stackRaw = document.getElementById('edit-proj-stack').value.trim();
    const stack = stackRaw ? stackRaw.split(',').map(s => s.trim()).filter(Boolean) : ['HTML5', 'CSS3', 'JavaScript'];
    const link = document.getElementById('edit-proj-link').value.trim() || 'In Progress';
    const id = document.getElementById('edit-proj-id').value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const projectObj = {
      id,
      title,
      status,
      summary,
      problem,
      whatIDid,
      stack,
      link
    };

    if (idxVal !== '') {
      const idx = parseInt(idxVal, 10);
      activeContent.projects[idx] = projectObj;
    } else {
      activeContent.projects.push(projectObj);
    }

    // Reset project form
    resetProjectForm();
    renderEditorProjectsList();
    saveActiveContentToStorage();
    renderAll();
  }

  function resetProjectForm() {
    document.getElementById('edit-proj-id').value = '';
    document.getElementById('edit-proj-title').value = '';
    document.getElementById('edit-proj-status').value = '';
    document.getElementById('edit-proj-summary').value = '';
    document.getElementById('edit-proj-problem').value = '';
    document.getElementById('edit-proj-what').value = '';
    document.getElementById('edit-proj-stack').value = '';
    document.getElementById('edit-proj-link').value = '';
    document.getElementById('edit-proj-index').value = '';
    document.getElementById('editor-add-project-btn').textContent = 'Add Project';
  }

  function saveEditorData() {
    if (!activeContent) return;

    if (!activeContent.about) activeContent.about = {};
    if (!activeContent.personal) activeContent.personal = {};

    activeContent.about.lead = document.getElementById('edit-about-lead').value.trim();
    activeContent.about.body = document.getElementById('edit-about-body').value.trim();
    activeContent.personal.tagline = document.getElementById('edit-home-tagline').value.trim();

    saveActiveContentToStorage();
    renderAll();

    // Show temporary feedback banner
    showToast('Changes saved to browser storage!');
  }

  function saveActiveContentToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeContent, null, 2));
    window.portfolioContent = activeContent;
  }

  function exportContentJSON() {
    saveEditorData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeContent, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "content.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Downloaded updated content.json');
  }

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported || typeof imported !== 'object') {
          throw new Error('Invalid JSON format');
        }
        activeContent = imported;
        saveActiveContentToStorage();
        populateEditorFields();
        renderAll();
        showToast('Successfully imported content.json!');
      } catch (err) {
        alert('Could not import file: Invalid JSON structure (' + err.message + ')');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  }

  function resetToDefault() {
    if (confirm('Reset all content back to published defaults? Any browser-only edits will be discarded.')) {
      localStorage.removeItem(STORAGE_KEY);
      activeContent = JSON.parse(JSON.stringify(defaultContent || getBundledFallback()));
      window.portfolioContent = activeContent;
      populateEditorFields();
      resetProjectForm();
      renderAll();
      showToast('Reset to default published content.');
    }
  }

  function showToast(msg) {
    let toast = document.getElementById('editor-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'editor-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-visible');
    setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2800);
  }

  // --- Bundled Fallback (if fetch fails on local file://) ---
  function getBundledFallback() {
    return {
      personal: {
        name: "Sarvesh Chavan",
        study: "B.Tech CSE (AI/ML) - 1st Year",
        tagline: "1st-year B.Tech CSE (AI/ML) student focusing on front-end development, building responsive, accessible web interfaces.",
        roles: ["1st-year B.Tech CSE (AI/ML) student", "Front-end developer", "Web interface builder"],
        location: "India",
        availabilityStatus: "Active & Available",
        availabilityText: "1st-year B.Tech CSE (AI/ML) student open to mentorship, internships, and front-end collaborations."
      },
      about: {
        heading: "About Sarvesh Chavan",
        lead: "I am Sarvesh Chavan, a 1st-year B.Tech CSE (AI/ML) student with a strong focus on front-end development.",
        body: "I enjoy crafting clean, responsive, and accessible web interfaces from first principles. I focus on semantic HTML, modern CSS, and vanilla JavaScript without unnecessary complexity. Outside of coding, I enjoy playing ground sports, building in Minecraft, and watching anime.",
        interests: ["Frontend development", "Ground sports", "Minecraft", "Anime"],
        principles: [
          { title: "1. Structure & Accessibility First", description: "Prioritize semantic HTML landmarks, clear readable typography, and complete keyboard navigability." },
          { title: "2. Build Small & Test Often", description: "Construct modular, tested components and responsive layouts that adapt smoothly across all screen sizes." },
          { title: "3. Keep It Honest", description: "Show ground-truth code and real implementations rather than superficial percentage bars or inflated claims." }
        ]
      },
      projects: [
        {
          id: "amendment",
          title: "AMENDMENT",
          status: "Hacktoberfest Winner",
          summary: "An interactive board game interface where players propose and vote on dynamic rule changes mid-match.",
          problem: "Displaying constantly evolving game rules and active match states clearly to players without confusing layout shifts or visual clutter.",
          whatIDid: "Designed and implemented the complete front-end user interface, responsive component layouts, and typography. Won the Hacktoberfest event organized at NST.",
          stack: ["HTML5", "CSS3", "JavaScript"],
          link: "https://github.com/sarveshchawan1000-gif"
        },
        {
          id: "zip-up-nation",
          title: "Zip Up Nation",
          status: "In Progress",
          summary: "E-commerce & community web platform currently in active development.",
          problem: "TODO: Define the primary problem and user experience challenge being solved by Zip Up Nation.",
          whatIDid: "Designing the front-end user experience, typography, and responsive interface components.",
          stack: ["HTML5", "CSS3", "JavaScript"],
          link: "In Progress"
        }
      ],
      skills: [
        {
          category: "Languages",
          items: [
            { name: "HTML5", context: "Semantic structure, WCAG accessibility, landmarks" },
            { name: "CSS3", context: "Flexbox, Grid, custom properties, responsive math" },
            { name: "JavaScript", context: "Vanilla ES6+, DOM APIs, clean client-side logic" },
            { name: "TODO: Add Language", context: "TODO: Specify other programming languages studied in 1st year (e.g. C, Python)" }
          ]
        },
        {
          category: "Frontend & Design",
          items: [
            { name: "Responsive Layout", context: "Mobile-first, fluid scales, media queries" },
            { name: "Canvas 2D", context: "Interactive canvas graphics & animation loops" },
            { name: "Accessibility", context: "Screen-reader flow, keyboard navigation, contrast" },
            { name: "UI Engineering", context: "3D card tilt, clean typography, state management" }
          ]
        },
        {
          category: "Tools & Workflow",
          items: [
            { name: "Git & GitHub", context: "Version control, commits, open-source workflow" },
            { name: "VS Code", context: "Development environment, linting, debugging" },
            { name: "Browser DevTools", context: "DOM inspection, performance profiling, responsive preview" },
            { name: "TODO: Tooling", context: "TODO: Add other developer tools you use" }
          ]
        },
        {
          category: "Learning Next",
          badge: "Frontier",
          items: [
            { name: "React / Modern UI", context: "Component architectures and stateful frontends" },
            { name: "TypeScript", context: "Type-safe front-end web engineering" },
            { name: "TODO: Next Goal", context: "TODO: Add your target technology for 2nd semester" }
          ]
        }
      ],
      journey: [
        {
          date: "2024",
          title: "Started B.Tech CSE (AI/ML) — 1st Year",
          body: "Commenced undergraduate studies in Computer Science & Engineering (AI/ML). Focused on computing foundations, discrete problem solving, and modern web interfaces."
        },
        {
          date: "2024",
          title: "AMENDMENT — Hacktoberfest Winner (NST)",
          body: "Collaborated on AMENDMENT as the lead front-end designer. Designed the full web user interface, which won the Hacktoberfest event organized at NST."
        },
        {
          date: "2025",
          title: "Zip Up Nation (In Progress)",
          body: "Currently designing the front-end user experience and developing responsive interface components for Zip Up Nation."
        },
        {
          date: "TODO: Year",
          title: "TODO: Next Milestone",
          body: "TODO: Supply upcoming hackathon, semester milestone, or internship."
        }
      ],
      contact: {
        email: "sarvesh.chawan1000@gmail.com",
        github: "https://github.com/sarveshchawan1000-gif",
        linkedin: "https://www.linkedin.com/in/sarvesh-chavan-a57080414/",
        location: "Remote / Open to relocation",
        availabilityStatus: "Active & Available",
        availabilityText: "1st-year B.Tech CSE (AI/ML) student open to mentorship, internships, and front-end collaborations.",
        resume: null
      }
    };
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContent);
  } else {
    loadContent();
  }
})();

