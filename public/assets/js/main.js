/**
 * Sawtooth Industrial Systems (siscontrols.com)
 * Global Shell Controller & Navigation Engine
 * 
 * Features:
 * - Mobile Slide-Out Drawer with Focus Trap & ARIA State Management
 * - Sticky Header Scroll Behavior with RAF Throttling
 * - Keyboard Accessibility for Desktop Mega-Menus
 * - Anchor Smooth Scrolling with Header Offset Compensation
 * - Technical Spec Tooltips Initialization
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Mobile Drawer Controller & Accessibility Focus Trap
  // ---------------------------------------------------------------------------
  const MobileDrawer = {
    btn: null,
    closeBtn: null,
    backdrop: null,
    panel: null,
    isOpen: false,
    focusableElements: [],
    firstFocusable: null,
    lastFocusable: null,

    init() {
      this.btn = document.getElementById('mobile-menu-btn');
      this.closeBtn = document.getElementById('mobile-drawer-close');
      this.backdrop = document.getElementById('mobile-drawer-backdrop');
      this.panel = document.getElementById('mobile-drawer-panel');

      if (!this.btn || !this.backdrop || !this.panel) return;

      this.bindEvents();
    },

    bindEvents() {
      this.btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });

      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.close();
        });
      }

      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) {
          this.close();
        }
      });

      // Keyboard Trap & Escape Key Listener
      document.addEventListener('keydown', (e) => {
        if (!this.isOpen) return;

        if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          this.close();
          return;
        }

        if (e.key === 'Tab') {
          this.handleFocusTrap(e);
        }
      });

      // Close on window resize if crossing to desktop viewport (>= 1024px)
      window.addEventListener('resize', () => {
        if (this.isOpen && window.innerWidth >= 1024) {
          this.close();
        }
      });
    },

    updateFocusableElements() {
      if (!this.panel) return;
      const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      this.focusableElements = Array.from(this.panel.querySelectorAll(selector));
      this.firstFocusable = this.focusableElements[0] || null;
      this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
    },

    handleFocusTrap(e) {
      if (this.focusableElements.length === 0) return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === this.firstFocusable) {
          e.preventDefault();
          this.lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === this.lastFocusable) {
          e.preventDefault();
          this.firstFocusable.focus();
        }
      }
    },

    open() {
      if (this.isOpen) return;
      this.isOpen = true;

      this.backdrop.classList.remove('hidden');
      this.btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';

      // RAF for smooth transition
      requestAnimationFrame(() => {
        this.backdrop.classList.remove('opacity-0');
        this.panel.classList.remove('translate-x-full');

        this.updateFocusableElements();
        if (this.closeBtn) {
          this.closeBtn.focus();
        } else if (this.firstFocusable) {
          this.firstFocusable.focus();
        }
      });
    },

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;

      this.panel.classList.add('translate-x-full');
      this.backdrop.classList.add('opacity-0');
      this.btn.setAttribute('aria-expanded', 'false');

      setTimeout(() => {
        this.backdrop.classList.add('hidden');
        document.body.style.overflow = '';
        if (this.btn) {
          this.btn.focus();
        }
      }, 300);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Sticky Header Scroll Behavior
  // ---------------------------------------------------------------------------
  const HeaderScroll = {
    header: null,
    isScrolled: false,
    ticking: false,

    init() {
      this.header = document.getElementById('site-header');
      if (!this.header) return;

      window.addEventListener('scroll', () => {
        if (!this.ticking) {
          window.requestAnimationFrame(() => {
            this.onScroll();
            this.ticking = false;
          });
          this.ticking = true;
        }
      }, { passive: true });

      // Run once on page load
      this.onScroll();
    },

    onScroll() {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollY > 20) {
        if (!this.isScrolled) {
          this.header.classList.add('header-scrolled');
          this.header.classList.add('shadow-xl');
          this.isScrolled = true;
        }
      } else {
        if (this.isScrolled) {
          this.header.classList.remove('header-scrolled');
          this.header.classList.remove('shadow-xl');
          this.isScrolled = false;
        }
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Desktop Dropdown Keyboard Access
  // ---------------------------------------------------------------------------
  const DropdownManager = {
    init() {
      const dropdownBtns = document.querySelectorAll('header nav button[aria-haspopup="true"]');
      dropdownBtns.forEach((btn) => {
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!expanded));
          } else if (e.key === 'Escape') {
            btn.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Smooth Anchor Scrolling with Sticky Offset
  // ---------------------------------------------------------------------------
  const AnchorScroller = {
    init() {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const header = document.getElementById('site-header');
          const headerOffset = header ? header.offsetHeight : 80;
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset - 16;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Focus target element for screen readers
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Technical Spec Tooltips Initializer
  // ---------------------------------------------------------------------------
  const TooltipManager = {
    init() {
      const tooltipElements = document.querySelectorAll('[data-tooltip]');
      tooltipElements.forEach((el) => {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'tooltip');
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Initialization on DOM Ready
  // ---------------------------------------------------------------------------
  function initializeSite() {
    MobileDrawer.init();
    HeaderScroll.init();
    DropdownManager.init();
    AnchorScroller.init();
    TooltipManager.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSite);
  } else {
    initializeSite();
  }

  // Expose API for external modules/tests
  window.SawtoothSite = {
    MobileDrawer,
    HeaderScroll,
    DropdownManager,
    AnchorScroller
  };
})();
