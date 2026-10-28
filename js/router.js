/**
 * Hash Router with keyboard navigation, history support, and metadata management
 */
(function() {
  const ROUTES = ['home', 'about', 'projects', 'skills', 'journey', 'contact'];

  const ROUTE_META = {
    home: {
      title: '[Your Name] — Builds things that think, move, and ship',
      description: 'Personal engineering portfolio of [Your Name]. Local AI, board game rule engines, and creative web engineering.',
      scene: 'nightcity'
    },
    about: {
      title: 'About — [Your Name]',
      description: 'Engineering mindset, creative interests in Minecraft, Spider-Man, and anime, and working principles.',
      scene: 'spiderweb'
    },
    projects: {
      title: 'Projects — [Your Name]',
      description: 'Case studies including AMENDMENT LLM rule engine and high-performance Fashion Store.',
      scene: 'circuit'
    },
    skills: {
      title: 'Skills — [Your Name]',
      description: 'Technical competencies across Python, FastAPI, local AI models, and creative front-end.',
      scene: 'circuit'
    },
    journey: {
      title: 'Journey — [Your Name]',
      description: 'Chronological timeline of milestones, engineering experiments, and future directions.',
      scene: 'spiderweb'
    },
    contact: {
      title: 'Contact — [Your Name]',
      description: 'Direct contact channels, GitHub, LinkedIn, email, and resume downloads.',
      scene: 'nightcity'
    }
  };

  class Router {
    constructor() {
      this.currentRoute = null;
      this.init();
    }

    init() {
      // Listen to hash changes and browser back/forward
      window.addEventListener('hashchange', () => this.handleRoute());
      window.addEventListener('load', () => this.handleRoute());

      // Arrow key navigation (Left/Right)
      window.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    getRouteFromHash() {
      const raw = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
      if (ROUTES.includes(raw)) {
        return raw;
      }
      return 'home';
    }

    handleRoute() {
      const route = this.getRouteFromHash();

      // If URL hash was invalid or empty, normalize it without triggering infinite event
      if (window.location.hash !== `#${route}`) {
        window.history.replaceState(null, '', `#${route}`);
      }

      if (this.currentRoute === route) return;

      const prevRoute = this.currentRoute;
      this.currentRoute = route;

      this.updateDOM(route);
      this.updateMetadata(route);

      // Dispatch route change event for canvas background transitions
      window.dispatchEvent(new CustomEvent('portfolio:route-changed', {
        detail: {
          route,
          prevRoute,
          scene: ROUTE_META[route].scene
        }
      }));
    }

    updateDOM(route) {
      // Toggle view visibility
      const views = document.querySelectorAll('.page-view');
      views.forEach(view => {
        const isTarget = view.id === `view-${route}`;
        if (isTarget) {
          view.removeAttribute('hidden');
          view.classList.add('is-active');
        } else {
          view.setAttribute('hidden', '');
          view.classList.remove('is-active');
        }
      });

      // Update Nav active state
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        const target = link.getAttribute('data-route');
        if (target === route) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        } else {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        }
      });

      // Reset scroll position to top
      window.scrollTo(0, 0);
    }

    updateMetadata(route) {
      const meta = ROUTE_META[route];
      if (!meta) return;

      document.title = meta.title;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', meta.description);
      }

      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', meta.title);
      }

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute('content', meta.description);
      }
    }

    navigate(direction) {
      const currentIndex = ROUTES.indexOf(this.currentRoute || 'home');
      let targetIndex;
      if (direction === 'next') {
        targetIndex = (currentIndex + 1) % ROUTES.length;
      } else {
        targetIndex = (currentIndex - 1 + ROUTES.length) % ROUTES.length;
      }
      window.location.hash = `#${ROUTES[targetIndex]}`;
    }

    handleKeydown(e) {
      // Ignore if user is interacting with form controls or editable elements
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigate('next');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigate('prev');
      }
    }
  }

  window.portfolioRouter = new Router();
})();

