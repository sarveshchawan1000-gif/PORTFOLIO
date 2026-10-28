# Personal Engineering Portfolio

A high-craft, distinctive, static personal engineering portfolio with zero external framework dependencies or build steps. Featuring an original multi-scene canvas animation system behind a clean, thin-line "spider-web" UI style.

## Architecture & Features

- **Zero Build Step**: Native ES6+ JavaScript, CSS3 custom properties, and semantic HTML5.
- **Dynamic Canvas Backgrounds**: A single unified `requestAnimationFrame` loop that seamlessly transitions between three code-drawn scenes across routes:
  - **Night City (`#home`, `#contact`)**: 3-layer parallax skyline responding to cursor offset, flickering amber windows, twinkling stars, and an interactive pendulum silk thread ending in a code-drawn red spider.
  - **Web Split (`#about`, `#journey`)**: Comic-panel style diagonal split between muted red (`#611519`) and muted blue (`#162F74`) over `#090B16` with a jagged bright seam line that eases toward the cursor, tilts with pointer Y, and sweeps across on page transition. Features a centered 16-spoke, 13-ring orb web with sagging catenary ring threads, anchor threads, interactive cursor deflection, and traveling vibration pulses.
  - **Circuit Board (`#projects`, `#skills`)**: Dark green printed circuit board on a 44px grid with ~45 right-angle traces, solder pads, IC packages with pin notches, and light pulses that accelerate when near the cursor.
- **Client-Side Hash Router**: Clean hash tokens (`#home`, `#about`, `#projects`, `#skills`, `#journey`, `#contact`), browser back/forward history support, automatic fallbacks to `#home`, dynamic SEO/Open Graph metadata updates, and keyboard navigation (Left/Right arrow keys with wrap-around).
- **Spider-Web UI Motif**: Delicate corner spider-webs (inline SVG data-URIs) on panels, and section headings underlined with a 1px thread ending in a signature red bead (`#E23636`).
- **Interactive Project Cards**: 3D tilt up to 4 degrees tracking cursor position, rendered dynamically from `data/projects.json`.
- **Accessibility & Performance**:
  - Semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`, `<article>`).
  - Full keyboard navigability with visible focus rings.
  - High-DPI canvas scaling capped at `devicePixelRatio = 2`.
  - Automatic low-FPS detection (drops ring and particle counts if frame rate drops below 30 fps).
  - Pauses canvas loop when tab is hidden via Page Visibility API.
  - Comprehensive `prefers-reduced-motion` compliance.

---

## How to Run Locally

Because the portfolio fetches `data/projects.json`, serve it via any static local HTTP server:

### Option A: Python 3 (Recommended)
```bash
python3 -m http.server 8000
```
Then open: [http://localhost:8000](http://localhost:8000)

### Option B: Node.js (npx)
```bash
npx serve .
```

### Option C: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

*(Note: Even if opened directly via `file://` protocol where browser cross-origin fetch is restricted, `main.js` contains a built-in inline fallback for projects so the UI will still render smoothly.)*

---

## How to Add a New Project

Project case studies are driven by `/data/projects.json`. To add a new project, open `data/projects.json` and append a new object to the array:

```json
{
  "id": "my-new-system",
  "status": "Shipped",
  "title": "Autonomous Tool Router",
  "summary": "One-line executive summary of the system, architecture, and purpose.",
  "problem": "Clear articulation of the bottleneck, concurrency challenge, or system limitation.",
  "approach": "Architectural solution, data structures, algorithms, and models chosen.",
  "stack": ["Rust", "WebAssembly", "TypeScript", "Canvas"],
  "links": {
    "github": "https://github.com/your-username/my-new-system",
    "demo": "https://my-new-system-demo.com"
  },
  "metrics": "Sub-10ms latency • Zero GC pauses"
}
```

The Projects view will automatically render the new card with 3D tilt interaction, tags, and status dots.

---

## How to Add a New Journey Timeline Entry

The engineering timeline lives in `index.html` within the `#view-journey` section inside `<div class="timeline-container">`.

To add a new milestone, insert an `<article class="timeline-entry">` block:

```html
<article class="timeline-entry">
  <div class="timeline-bead" aria-hidden="true"></div>
  <div class="timeline-date">2026</div>
  <h2 class="timeline-title thread-heading">Distributed Systems Lead</h2>
  <p class="timeline-body">
    Led development of local agent communication protocols, cutting orchestration overhead by 60% and publishing open specifications.
  </p>
</article>
```

---

## Placeholders Checklist

Below is the short checklist of all placeholders in the codebase to replace with your personal information:

| Item | Location | Placeholder Token | Description |
| :--- | :--- | :--- | :--- |
| **Full Name** | `index.html`, `js/router.js` | `[Your Name]` | Replace with your real name across titles, brand header, and headings. |
| **Email Address** | `index.html` | `[email]` | In `mailto:[email]` and button label on `#contact`. |
| **GitHub URL** | `index.html`, `data/projects.json` | `[url]`, `[github-repo-url]` | Replace with your profile URL and project repository links. |
| **LinkedIn URL** | `index.html` | `[url]` | Replace with your LinkedIn profile URL. |
| **Resume File** | `index.html` | `[file]` | Replace with path to your resume PDF (e.g., `./resume.pdf`). |
| **Project Demo Links** | `data/projects.json` | `[demo-link]` | Replace with live deployment URLs for AMENDMENT and Fashion Store. |
| **Portfolio Domain** | `index.html` | `[portfolio-domain]` | In Open Graph meta tags (e.g., `sarveshchavan.dev`). |
| **Timeline Years** | `index.html` | `[year]` | Under Journey section (`#view-journey`) for Foundation, First builds, AI, and Next. |
| **Copyright Year** | `index.html` | `[year]` | In the site footer. |

---

## Directory Structure
```text
/PORTFOLIO
├── index.html                  # Semantic multi-page shell, landmarks, SEO & OG tags
├── styles.css                  # Responsive design, typography, thin-line web motif, card tilt
├── favicon.svg                 # Code-drawn thin-line spider web favicon with red bead
├── README.md                   # Documentation and customization guide
├── data/
│   └── projects.json           # AMENDMENT, Fashion Store, and project data
└── js/
    ├── router.js               # Hash routing, keyboard shortcuts, history, SEO updater
    ├── main.js                 # Central canvas loop, DPR scaling, card tilt, typewriter
    └── backgrounds/
        ├── nightcity.js        # Night city skyline, flickering amber windows, spider pendulum
        ├── webSplit.js         # Comic-panel red/blue split, jagged seam, 16-spoke orb web, pulses
        └── circuit.js          # Dark green PCB, 44px grid traces, IC chips, accelerated pulses
```
