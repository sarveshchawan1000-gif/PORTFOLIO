/**
 * Scroll-based Router
 * - Nav links smooth-scroll to sections (all always visible)
 * - IntersectionObserver updates active nav link as user scrolls
 * - Background canvas switches based on which section is most visible
 * - Hash in URL is kept in sync for bookmarking
 */
(function() {
  const ROUTES = ['home', 'about', 'projects', 'skills', 'journey', 'contact'];

  const ROUTE_META = {
    home: {
      title: 'Sarvesh Chavan — 1st-Year B.Tech CSE (AI/ML) & Front-End Developer',
      description: 'Personal portfolio of Sarvesh Chavan. 1st-year B.Tech CSE (AI/ML) student focusing on front-end development, responsive web design, and accessible interfaces.',
      scene: 'nightcity'
    },
    about: {
      title: 'About — Sarvesh Chavan',
      description: 'About Sarvesh Chavan — 1st-year B.Tech CSE (AI/ML) student, front-end developer, with interests in ground sports, Minecraft, and anime.',
      scene: 'webSplit'
    },
    projects: {
      title: 'Projects — Sarvesh Chavan',
      description: 'Front-end web applications and interfaces by Sarvesh Chavan, including AMENDMENT (Hacktoberfest Winner at NST) and Zip Up Nation.',
      scene: 'circuit'
    },
    skills: {
      title: 'Skills — Sarvesh Chavan',
      description: 'Technical competencies in HTML5, CSS3, JavaScript, responsive layouts, Canvas 2D, and web accessibility.',
      scene: 'circuit'
    },
    journey: {
      title: 'Journey — Sarvesh Chavan',
      description: 'Chronological timeline of academic milestones, front-end builds, and hackathon wins.',
      scene: 'webSplit'
    },
    contact: {
      title: 'Contact — Sarvesh Chavan',
      description: 'Get in touch with Sarvesh Chavan for mentorship, internships, and front-end development collaborations.',
      scene: 'nightcity'
    }
  };

  class Router {
    constructor() {
      this.currentRoute = 'home';
      this.scrollTimer = null;
      this.init();
    }

    init() {
      // Wire nav links to smooth-scroll
      document.querySelectorAll('a.nav-link[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
          const href = link.getAttribute('href');
          const route = href.replace(/^#\/?/, '').trim().toLowerCase();
          if (ROUTES.includes(route)) {
            e.preventDefault();
            this.scrollTo(route);
          }
        });
      });

      // Also wire brand logo
      const brand = document.querySelector('.site-brand[href^="#"]');
      if (brand) {
        brand.addEventListener('click', e => {
          e.preventDefault();
          this.scrollTo('home');
        });
      }

      // Set up IntersectionObserver to track which section is in view
      this.setupObserver();

      // Handle initial hash on load
      window.addEventListener('load', () => {
        const initialHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
        if (ROUTES.includes(initialHash) && initialHash !== 'home') {
          // Small delay to allow layout to settle
          setTimeout(() => this.scrollTo(initialHash, false), 80);
        } else {
          this.activate('home', null);
        }
      });

      // Arrow key navigation
      window.addEventListener('keydown', e => this.handleKeydown(e));

      // Handle hash change from browser back/forward
      window.addEventListener('hashchange', () => {
        const route = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
        if (ROUTES.includes(route)) {
          this.scrollTo(route, false);
        }
      });
    }

    scrollTo(route, smooth = true) {
      const section = document.getElementById(`view-${route}`);
      if (!section) return;
      const headerH = document.querySelector('.site-header')?.offsetHeight || 60;
      const top = section.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
    }

    setupObserver() {
      const headerH = document.querySelector('.site-header')?.offsetHeight || 60;

      // Use a rootMargin that fires when the section crosses ~30% into the viewport
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const route = entry.target.id.replace('view-', '');
            if (ROUTES.includes(route) && route !== this.currentRoute) {
              this.activate(route, entry.target);
            }
          }
        });
      }, {
        rootMargin: `-${headerH + 10}px 0px -55% 0px`,
        threshold: 0
      });

      ROUTES.forEach(route => {
        const el = document.getElementById(`view-${route}`);
        if (el) observer.observe(el);
      });
    }

    activate(route, _el) {
      if (this.currentRoute === route) return;
      const prev = this.currentRoute;
      this.currentRoute = route;

      this.updateNav(route);
      this.updateMetadata(route);

      // Update URL hash without triggering a scroll
      history.replaceState(null, '', `#${route}`);

      // Dispatch event so canvas background can switch
      window.dispatchEvent(new CustomEvent('portfolio:route-changed', {
        detail: {
          route,
          prevRoute: prev,
          scene: (ROUTE_META[route] || {}).scene || 'nightcity'
        }
      }));
    }

    updateNav(route) {
      document.querySelectorAll('.nav-link[data-route]').forEach(link => {
        const target = link.getAttribute('data-route');
        if (target === route) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        } else {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        }
      });
    }

    updateMetadata(route) {
      const meta = ROUTE_META[route];
      if (!meta) return;
      document.title = meta.title;
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', meta.description);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', meta.title);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', meta.description);
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', `https://portfolio-20-beryl.vercel.app/#${route}`);
    }

    navigate(direction) {
      const idx = ROUTES.indexOf(this.currentRoute || 'home');
      let next = direction === 'next'
        ? (idx + 1) % ROUTES.length
        : (idx - 1 + ROUTES.length) % ROUTES.length;
      this.scrollTo(ROUTES[next]);
    }

    handleKeydown(e) {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigate('next');
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigate('prev');
      }
    }
  }

  window.portfolioRouter = new Router();
})();
