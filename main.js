/**
 * LA CHORRERA – LANDING PAGE JAVASCRIPT
 * Form validation, analytics events, A/B testing, scroll animations
 */

/* =========================================================
   A/B TEST MODULE
   Usage: append ?variant=B to URL to activate variant B
   Variant B changes: headline text + CTA button color
   ========================================================= */
(function initABTest() {
  const params = new URLSearchParams(window.location.search);
  const variant = params.get('variant') || 'A';

  // Store variant in dataLayer for GA4
  window.abVariant = variant;

  if (variant === 'B') {
    // Override CTA color to green instead of red
    document.documentElement.style.setProperty('--cta-color', '#2D6A4F');
    document.documentElement.style.setProperty('--cta-hover-color', '#1B4332');

    // Override hero headline text
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
      heroTitle.innerHTML =
        '¿Tu último día libre fue hace meses? <span>Es hora de respirar en La Chorrera</span>';
    }
    // Override CTA button text
    const ctaBtns = document.querySelectorAll('[data-ab="cta-text"]');
    ctaBtns.forEach(btn => {
      btn.textContent = '🌿 Reservar mi experiencia ahora';
    });
  }
})();


/* =========================================================
   ANALYTICS HELPERS
   ========================================================= */
function trackEvent(eventName, params = {}) {
  // Google Analytics 4
  if (typeof gtag === 'function') {
    gtag('event', eventName, { ab_variant: window.abVariant, ...params });
  }
  // Facebook Pixel
  if (typeof fbq === 'function') {
    if (eventName === 'generate_lead') fbq('track', 'Lead', params);
    if (eventName === 'cta_click')     fbq('track', 'InitiateCheckout', params);
  }
}

// Track CTA clicks (above-the-fold and in-form)
document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-track]');
  if (btn) {
    const event = btn.dataset.track;
    const label = btn.dataset.label || btn.textContent.trim();
    trackEvent(event, { button_label: label, ab_variant: window.abVariant });
  }
});


/* =========================================================
   SCROLL FADE-IN ANIMATION
   ========================================================= */
(function initScrollAnimations() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
})();


/* =========================================================
   FORM VALIDATION & SUBMISSION
   ========================================================= */
(function initLeadForm() {
  const form = document.getElementById('lead-form');
  if (!form) return;

  const fields = {
    name:    { el: document.getElementById('f-name'),    validate: v => v.trim().length >= 2 },
    email:   { el: document.getElementById('f-email'),   validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
    phone:   { el: document.getElementById('f-phone'),   validate: v => /^[\+]?[\d\s\-\(\)]{7,}$/.test(v) },
  };
  const privacyChk  = document.getElementById('f-privacy');
  const submitBtn   = document.getElementById('form-submit');

  // Real-time validation
  Object.values(fields).forEach(({ el, validate }) => {
    if (!el) return;
    el.addEventListener('blur', () => validateField(el, validate(el.value)));
    el.addEventListener('input', () => {
      if (el.classList.contains('error')) validateField(el, validate(el.value));
    });
  });

  function validateField(el, isValid) {
    el.classList.toggle('error', !isValid);
    return isValid;
  }

  // Privacy checkbox → enable/disable button
  if (privacyChk && submitBtn) {
    privacyChk.addEventListener('change', () => {
      submitBtn.disabled = !privacyChk.checked;
    });
    // Init state
    submitBtn.disabled = !privacyChk.checked;
  }

  // Form submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    let allValid = true;
    Object.values(fields).forEach(({ el, validate }) => {
      if (!el) return;
      const ok = validateField(el, validate(el.value));
      if (!ok) allValid = false;
    });

    if (!privacyChk || !privacyChk.checked) {
      allValid = false;
      privacyChk.parentElement.style.outline = '2px solid #E63946';
      setTimeout(() => privacyChk.parentElement.style.outline = '', 2000);
    }

    if (!allValid) return;

    // Gather data
    const data = {
      name:  fields.name.el.value.trim(),
      email: fields.email.el.value.trim(),
      phone: fields.phone.el.value.trim(),
      ab_variant: window.abVariant,
      timestamp: new Date().toISOString(),
      source: document.referrer || 'direct',
    };

    // Show loading state
    submitBtn.disabled = true;
    const origText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⌛ Enviando...';

    // Fire analytics BEFORE redirect
    trackEvent('generate_lead', {
      lead_name:  data.name,
      ab_variant: data.ab_variant,
    });

    // -------------------------------------------------------
    // OPTIONAL: POST to backend / n8n webhook
    // Uncomment and replace URL to activate:
    //
    // fetch('https://your-n8n-webhook-url.com/webhook/chorrera-lead', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data),
    // }).catch(console.error);
    // -------------------------------------------------------

    // Redirect to thank-you page after short delay
    setTimeout(() => {
      const params = new URLSearchParams({
        name: data.name,
        variant: data.ab_variant,
      });
      window.location.href = 'gracias.html?' + params.toString();
    }, 600);
  });
})();


/* =========================================================
   THANK YOU PAGE LOGIC
   ========================================================= */
(function initGraciasPage() {
  const heading = document.getElementById('gracias-name');
  if (!heading) return;

  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');

  if (name) {
    heading.textContent = name.split(' ')[0]; // First name only
  }

  // Fire conversion pixel on load
  trackEvent('purchase_complete', { page: 'gracias' });
})();


/* =========================================================
   SMOOTH SCROLL FOR IN-PAGE ANCHORS
   ========================================================= */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
