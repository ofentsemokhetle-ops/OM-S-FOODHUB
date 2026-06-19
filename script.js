(() => {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  const sections = navLinks
    .map((a) => {
      const id = a.getAttribute('href');
      return id ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  const getActiveSection = () => {
    const topOffset = 90; // fixed nav height-ish / comfort
    const candidates = sections
      .map((sec) => {
        const rect = sec.getBoundingClientRect();
        return { sec, dist: Math.abs(rect.top - topOffset) };
      })
      .sort((a, b) => a.dist - b.dist);
    return candidates[0]?.sec || null;
  };

  const setActiveLink = () => {
    const active = getActiveSection();
    if (!active) return;

    const activeId = `#${active.id}`;
    navLinks.forEach((a) => {
      const isActive = a.getAttribute('href') === activeId;
      a.style.background = isActive ? 'rgba(0,0,0,0.08)' : '';
    });
  };

  // Smooth scroll
  navLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });

      // Update immediately for responsiveness
      setActiveLink();

      // Accessibility: move focus to section
      // (without stealing focus for screen readers too aggressively)
      const prevTabIndex = target.getAttribute('tabindex');
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (prevTabIndex === null) target.removeAttribute('tabindex');
    });
  });

  window.addEventListener('scroll', () => {
    setActiveLink();

    const btn = document.getElementById('backToTop');
    if (!btn) return;

    const show = window.scrollY > 400;
    btn.style.opacity = show ? '1' : '0';
    btn.style.pointerEvents = show ? 'auto' : 'none';
  }, { passive: true });

  // Back to top
  const backBtn = document.getElementById('backToTop');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    // initial state
    const show = window.scrollY > 400;
    backBtn.style.opacity = show ? '1' : '0';
    backBtn.style.pointerEvents = show ? 'auto' : 'none';
  }

  // Clipboard helpers (security-minded: avoid executing clipboard in non-HTTPS/unsupported cases)
  const safeCopy = async (text) => {
    const value = String(text ?? '').trim();
    if (!value) return false;

    // Prefer modern API
    if (navigator.clipboard?.writeText) {
      try {
        // Clipboard API usually requires secure context (HTTPS or localhost)
        if (window.isSecureContext) {
          await navigator.clipboard.writeText(value);
          return true;
        }
      } catch {
        // fall through to legacy
      }
    }

    // Legacy fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };


  const makeToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '24px';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(0,0,0,0.82)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 28px rgba(0,0,0,0.25)';
    toast.style.zIndex = '10000';
    toast.style.fontFamily = 'Arial, Helvetica, sans-serif';
    toast.style.fontWeight = '700';

    document.body.appendChild(toast);

    window.setTimeout(() => {
      toast.style.transition = 'opacity 200ms ease';
      toast.style.opacity = '0';
      window.setTimeout(() => toast.remove(), 250);
    }, 1700);
  };

  const copyActions = [
    {
      selector: '[data-copy="phone"]',
      value: (el) => el.getAttribute('data-value') || el.dataset.value || '',
    },
    {
      selector: '[data-copy="email"]',
      value: (el) => el.getAttribute('data-value') || el.dataset.value || '',
    },
  ];

  copyActions.forEach(({ selector, value }) => {
    document.querySelectorAll(selector).forEach((btn) => {
      const text = value(btn).trim();
      btn.addEventListener('click', async () => {
        if (!text) return;
        const ok = await safeCopy(text);
        if (ok) makeToast('Copied to clipboard!');
        else makeToast('Copy failed.');
      });
    });
  });

  // Promo message cycle/dismiss
  const promo = document.getElementById('promo');
  if (promo) {
    const dismiss = promo.querySelector('[data-action="dismiss"]');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        promo.remove();
        try {
          localStorage.setItem('foodhub_promo_dismissed', '1');
        } catch {}
      });
    }

    const dismissed = (() => {
      try {
        return localStorage.getItem('foodhub_promo_dismissed') === '1';
      } catch {
        return false;
      }
    })();

    if (dismissed) {
      promo.remove();
    } else {
      const messages = Array.from(promo.querySelectorAll('[data-promo-message]'));
      let idx = 0;

      const showAt = (i) => {
        messages.forEach((m, n) => {
          m.style.display = n === i ? 'block' : 'none';
        });
      };

      showAt(idx);
      if (messages.length > 1) {
        window.setInterval(() => {
          idx = (idx + 1) % messages.length;
          showAt(idx);
        }, 6000);
      }
    }
  }

  // Inline contact form (on main Contacts section)
  const inlineForm = document.getElementById('contactInlineForm');
  if (inlineForm) {
    const status = document.getElementById('inlineContactStatus');
    const fillDemo = document.getElementById('inlineFillDemo');

    const show = (msg, ok = true) => {
      if (!status) return;
      status.style.display = 'block';
      status.textContent = msg;
      status.style.background = ok ? 'rgba(0,160,90,0.12)' : 'rgba(200,0,0,0.10)';
    };

    const getField = (nameOrId) => inlineForm[nameOrId] || inlineForm.querySelector(`#${nameOrId}`);

    const validate = () => {
      const name = inlineForm.name.value.trim();
      const phone = inlineForm.phone.value.trim();
      const topic = inlineForm.topic.value;
      const email = (inlineForm.email.value || '').trim();
      const message = inlineForm.message.value.trim();

      if (!name) return 'Please enter your full name.';
      if (!phone) return 'Please enter your phone/WhatsApp number.';
      if (phone.replace(/\D/g, '').length < 8) return 'Phone number looks too short.';
      if (!topic) return 'Please choose a topic.';
      if (!message) return 'Please write a message.';

      if (email) {
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailOk) return 'Email address is not valid.';
      }
      return null;
    };

    inlineForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = validate();
      if (err) return show(err, false);

      // Front-end only: simulate submit
      show('Thanks! Your order/enquiry has been prepared (demo). We will contact you shortly.', true);
      inlineForm.reset();
    });

    if (fillDemo) {
      fillDemo.addEventListener('click', () => {
        inlineForm.name.value = 'John Doe';
        inlineForm.phone.value = '0711827138';
        inlineForm.topic.value = 'catering';
        inlineForm.email.value = 'john@example.com';
        inlineForm.message.value = 'Hi! I would like catering for 20 people on Saturday. Please share pricing and availability.';
        show('Demo details filled. Click Submit.', true);
      });
    }
  }

  // Ambient “alive” effects: subtle parallax + cursor glow
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const onMouse = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
    const y = (e.clientY / window.innerHeight) * 2 - 1;

    const hero = document.querySelector('#home .section-inner');
    const services = document.querySelector('#services .section-inner');
    const nav = document.querySelector('.nav');

    if (hero) hero.style.transform = `translate(${x * 6}px, ${y * 4}px)`;
    if (services) services.style.transform = `translate(${x * -4}px, ${y * 3}px)`;
    if (nav) nav.style.transform = `translateX(${x * -2}px)`;
  };

  const onMouseLeave = () => {
    const hero = document.querySelector('#home .section-inner');
    const services = document.querySelector('#services .section-inner');
    const nav = document.querySelector('.nav');
    if (hero) hero.style.transform = '';
    if (services) services.style.transform = '';
    if (nav) nav.style.transform = '';
  };

  if (!prefersReducedMotion) {
    document.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });

    // Rotating accent gradient in the body
    const root = document.documentElement;
    let t = 0;
    const animate = () => {
      t += 0.01;
      const a = (Math.sin(t) * 0.5 + 0.5) * 100;
      root.style.setProperty('--aliveHue', String(a));
      requestAnimationFrame(animate);
    };
    animate();
  }

  // Initial active link
  setActiveLink();
})();



