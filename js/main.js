(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ Sticky nav + mobile drawer ============ */
  var header = document.getElementById('siteHeader');
  var toggle = document.getElementById('navToggle');
  var drawer = document.getElementById('navDrawer');

  function onScrollNav() {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  function closeDrawer() {
    drawer.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }
  function openDrawer() {
    drawer.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
  }
  toggle.addEventListener('click', function () {
    if (drawer.classList.contains('open')) closeDrawer(); else openDrawer();
  });
  drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeDrawer); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  /* ============ Hero: line-reveal on load + canvas fallback ============ */
  var heroContent = document.querySelector('.hero-content');
  if (reduceMotion) {
    heroContent.classList.add('revealed');
  } else {
    window.requestAnimationFrame(function () {
      setTimeout(function () { heroContent.classList.add('revealed'); }, 200);
    });
  }

  /* ============ Hero logo: fade in on load, fade out on scroll ============ */
  var heroEl = document.getElementById('hero');
  var heroLogoWrap = document.getElementById('heroLogoWrap');
  if (heroLogoWrap) {
    if (reduceMotion) {
      heroLogoWrap.classList.add('revealed');
    } else {
      window.requestAnimationFrame(function () {
        setTimeout(function () { heroLogoWrap.classList.add('revealed'); }, 300);
      });

      /* Once the load fade-in has finished, hand opacity over to the scroll
         handler below with the CSS transition turned off, so the fade-out
         tracks scroll position 1:1 instead of lagging behind it. */
      heroLogoWrap.addEventListener('transitionend', function onLoadIn(e) {
        if (e.propertyName !== 'opacity') return;
        heroLogoWrap.removeEventListener('transitionend', onLoadIn);
        heroLogoWrap.style.transition = 'none';
      });

      var heroLogoTicking = false;
      function updateHeroLogoFade() {
        heroLogoTicking = false;
        var heroHeight = heroEl.offsetHeight;
        var progress = heroHeight > 0 ? Math.min(Math.max(window.scrollY / heroHeight, 0), 1) : 0;
        heroLogoWrap.style.opacity = String(1 - progress);
      }
      window.addEventListener('scroll', function () {
        if (!heroLogoTicking) {
          heroLogoTicking = true;
          window.requestAnimationFrame(updateHeroLogoFade);
        }
      }, { passive: true });
    }
  }

  var heroVideo = document.getElementById('heroVideo');
  var canvas = document.getElementById('heroCanvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    /* Soft drifting leaves + light motes — a stand-in for real hero footage.
       Auto-hides the moment a real <video> starts playing (see below). */
    var LEAF_COUNT = 26;
    var leaves = [];
    function makeLeaf() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        size: 5 + Math.random() * 9,
        speedY: 0.15 + Math.random() * 0.35,
        speedX: (Math.random() - 0.5) * 0.4,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.005 + Math.random() * 0.01,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.01,
        alpha: 0.15 + Math.random() * 0.35,
        hue: Math.random() > 0.5 ? '76,124,53' : '168,217,62'
      };
    }
    function seedLeaves() {
      leaves = [];
      for (var i = 0; i < LEAF_COUNT; i++) leaves.push(makeLeaf());
    }

    function drawLeaf(l) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = 'rgba(' + l.hue + ',' + l.alpha + ')';
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < leaves.length; i++) {
        var l = leaves[i];
        l.y += l.speedY;
        l.sway += l.swaySpeed;
        l.x += l.speedX + Math.sin(l.sway) * 0.3;
        l.rot += l.rotSpeed;
        if (l.y > H + 20) { l.y = -20; l.x = Math.random() * W; }
        if (l.x > W + 20) l.x = -20;
        if (l.x < -20) l.x = W + 20;
        drawLeaf(l);
      }
      rafId = window.requestAnimationFrame(frame);
    }

    var rafId = null;
    resizeCanvas();
    seedLeaves();

    if (reduceMotion) {
      // Single static frame — motion off, but still an intentional composed look.
      ctx.clearRect(0, 0, W, H);
      leaves.forEach(drawLeaf);
    } else {
      rafId = window.requestAnimationFrame(frame);
    }

    window.addEventListener('resize', function () {
      resizeCanvas();
      if (reduceMotion) { ctx.clearRect(0, 0, W, H); leaves.forEach(drawLeaf); }
    });

    if (heroVideo) {
      heroVideo.addEventListener('playing', function () {
        if (rafId) window.cancelAnimationFrame(rafId);
        canvas.style.transition = 'opacity 0.6s ease';
        canvas.style.opacity = '0';
      });
      var p = heroVideo.play();
      if (p && typeof p.then === 'function') p.catch(function () {});
    }
  }

  /* ============ Scroll reveal (IntersectionObserver) ============ */
  var revealEls = document.querySelectorAll('[data-reveal], [data-reveal-lines], [data-reveal-img]');
  if (reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add('revealed'); });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });

    /* Safety net: on a very fast scroll (flick, Page Down, smooth-scroll to an
       anchor) a threshold crossing can occasionally get skipped entirely,
       leaving an element stuck at opacity:0 forever. If anything not yet
       revealed has already scrolled fully past the viewport, reveal it
       immediately — there's no visible animation to lose at that point. */
    var revealFallbackTicking = false;
    function catchMissedReveals() {
      revealFallbackTicking = false;
      revealEls.forEach(function (el) {
        if (el.classList.contains('revealed')) return;
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight * 4) {
          el.classList.add('revealed');
          io.unobserve(el);
        }
      });
    }
    window.addEventListener('scroll', function () {
      if (!revealFallbackTicking) {
        revealFallbackTicking = true;
        window.requestAnimationFrame(catchMissedReveals);
      }
    }, { passive: true });
  } else {
    revealEls.forEach(function (el) { el.classList.add('revealed'); });
  }

  /* ============ Before / after slider ============ */
  (function () {
    var slider = document.getElementById('baSlider');
    if (!slider) return;
    var dragging = false;

    function setPos(pct) {
      pct = Math.max(0, Math.min(100, pct));
      slider.style.setProperty('--pos', pct + '%');
      slider.setAttribute('aria-valuenow', Math.round(pct));
    }
    function setFullWidth() {
      slider.style.setProperty('--full-w', slider.getBoundingClientRect().width + 'px');
    }
    function pctFromClientX(clientX) {
      var rect = slider.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    slider.addEventListener('pointerdown', function (e) {
      dragging = true;
      if (slider.setPointerCapture) slider.setPointerCapture(e.pointerId);
      setPos(pctFromClientX(e.clientX));
    });
    slider.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      setPos(pctFromClientX(e.clientX));
    });
    ['pointerup', 'pointercancel'].forEach(function (evt) {
      slider.addEventListener(evt, function () { dragging = false; });
    });

    slider.addEventListener('keydown', function (e) {
      var current = parseFloat(slider.style.getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft') { setPos(current - 5); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setPos(current + 5); e.preventDefault(); }
      else if (e.key === 'Home') { setPos(0); e.preventDefault(); }
      else if (e.key === 'End') { setPos(100); e.preventDefault(); }
    });

    setFullWidth();
    setPos(50);
    window.addEventListener('resize', setFullWidth);
  })();

  /* ============ Gallery lightbox ============ */
  (function () {
    var items = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
    if (!items.length) return;

    var lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Project photo viewer');
    lightbox.innerHTML =
      '<div class="lightbox-inner">' +
        '<button type="button" class="lightbox-close" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>' +
        '<button type="button" class="lightbox-prev" aria-label="Previous photo">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
        '</button>' +
        '<img class="lightbox-img" alt="">' +
        '<p class="lightbox-cap"></p>' +
        '<button type="button" class="lightbox-next" aria-label="Next photo">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
        '</button>' +
      '</div>';
    document.body.appendChild(lightbox);

    var imgEl = lightbox.querySelector('.lightbox-img');
    var capEl = lightbox.querySelector('.lightbox-cap');
    var closeBtn = lightbox.querySelector('.lightbox-close');
    var prevBtn = lightbox.querySelector('.lightbox-prev');
    var nextBtn = lightbox.querySelector('.lightbox-next');
    var focusable = [closeBtn, prevBtn, nextBtn];

    var currentIndex = -1;
    var triggerEl = null;

    function show(index) {
      currentIndex = (index + items.length) % items.length;
      var item = items[currentIndex];
      imgEl.src = item.getAttribute('data-full');
      imgEl.alt = item.querySelector('img').alt;
      capEl.textContent = item.getAttribute('data-caption') || '';
    }

    function open(index, trigger) {
      triggerEl = trigger;
      show(index);
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
      if (triggerEl) triggerEl.focus();
    }

    items.forEach(function (item, i) {
      item.addEventListener('click', function () { open(i, item); });
    });
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { show(currentIndex - 1); });
    nextBtn.addEventListener('click', function () { show(currentIndex + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowLeft') { show(currentIndex - 1); return; }
      if (e.key === 'ArrowRight') { show(currentIndex + 1); return; }
      if (e.key === 'Tab') {
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    });
  })();
})();
