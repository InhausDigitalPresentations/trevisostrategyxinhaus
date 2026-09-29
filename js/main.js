/* ==========================================================================
   THE FIRST BITE — horizontal presentation engine
   Native horizontal scroll (no scroll-jacking) + wheel translation,
   keyboard nav, chapter menu, progress, embeds with graceful fallbacks.
   ========================================================================== */
(function () {
  'use strict';

  var viewport = document.getElementById('viewport');
  var track = document.getElementById('track');
  var panels = Array.prototype.slice.call(track.querySelectorAll('.panel'));
  var progressBar = document.getElementById('progressBar');
  var sceneCount = document.getElementById('sceneCount');
  var chapterLabel = document.getElementById('chapterLabel');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var menuBtn = document.getElementById('menuBtn');
  var menu = document.getElementById('chapterMenu');
  var fsBtn = document.getElementById('fsBtn');
  var hint = document.getElementById('hint');
  var hintDismiss = document.getElementById('hintDismiss');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileQuery = window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1100px)');

  function isHorizontal() { return !mobileQuery.matches; }
  function scroller() { return isHorizontal() ? viewport : window; }

  /* ---------- helpers ---------- */
  function currentIndex() {
    var pos, best = 0, bestDist = Infinity;
    if (isHorizontal()) {
      pos = viewport.scrollLeft + viewport.clientWidth / 2;
      panels.forEach(function (p, i) {
        var c = p.offsetLeft + p.offsetWidth / 2;
        var d = Math.abs(c - pos);
        if (d < bestDist) { bestDist = d; best = i; }
      });
    } else {
      pos = window.scrollY + window.innerHeight / 2;
      panels.forEach(function (p, i) {
        var r = p.getBoundingClientRect();
        var c = r.top + window.scrollY + r.height / 2;
        var d = Math.abs(c - pos);
        if (d < bestDist) { bestDist = d; best = i; }
      });
    }
    return best;
  }

  function goTo(index) {
    index = Math.max(0, Math.min(panels.length - 1, index));
    if (isHorizontal()) {
      var left = panels[index].offsetLeft;
      // Smooth only for nearby moves — chapter jumps land instantly instead of
      // flying through dozens of scenes.
      var far = Math.abs(left - viewport.scrollLeft) > viewport.clientWidth * 3;
      viewport.scrollTo({ left: left, behavior: (reducedMotion || far) ? 'auto' : 'smooth' });
    } else {
      var behavior = reducedMotion ? 'auto' : 'smooth';
      panels[index].scrollIntoView({ behavior: behavior, block: 'start' });
    }
  }

  /* ---------- wheel: translate vertical intent to horizontal ---------- */
  viewport.addEventListener('wheel', function (e) {
    if (!isHorizontal()) return;
    // Trackpads emit deltaX natively — let those pass untouched.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.ctrlKey) return; // pinch-zoom
    e.preventDefault();
    var delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 24; // line mode (Firefox)
    // Fine-grained trackpad deltas map directly; discrete mouse-wheel notches
    // glide via native smooth scrolling (compositor-driven, no rAF needed).
    if (reducedMotion || Math.abs(delta) < 90) {
      viewport.scrollLeft += delta;
    } else {
      viewport.scrollBy({ left: delta * 2.4, behavior: 'smooth' });
    }
  }, { passive: false });

  /* ---------- keyboard ---------- */
  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (!menu.hidden && e.key === 'Escape') { toggleMenu(false); return; }
    switch (e.key) {
      case 'ArrowRight':
      case 'Right':
      case 'PageDown':
        e.preventDefault(); goTo(currentIndex() + 1); break;
      case 'ArrowLeft':
      case 'Left':
      case 'PageUp':
        e.preventDefault(); goTo(currentIndex() - 1); break;
      case 'Home':
        e.preventDefault(); goTo(0); break;
      case 'End':
        e.preventDefault(); goTo(panels.length - 1); break;
      case ' ':
        if (isHorizontal()) { e.preventDefault(); goTo(currentIndex() + (e.shiftKey ? -1 : 1)); }
        break;
    }
  });

  prevBtn.addEventListener('click', function () { goTo(currentIndex() - 1); });
  nextBtn.addEventListener('click', function () { goTo(currentIndex() + 1); });

  /* ---------- progress + scene count + chapter label ---------- */
  var ticking = false;
  function onScroll() {
    updateActive();
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var p;
      if (isHorizontal()) {
        var max = viewport.scrollWidth - viewport.clientWidth;
        p = max > 0 ? viewport.scrollLeft / max : 0;
      } else {
        var maxY = document.documentElement.scrollHeight - window.innerHeight;
        p = maxY > 0 ? window.scrollY / maxY : 0;
      }
      progressBar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)) + ')';
      var idx = currentIndex();
      sceneCount.textContent = String(idx + 1).padStart(2, '0') + ' / ' + panels.length;
      var ch = panels[idx].getAttribute('data-chapter');
      if (ch && chapterLabel.textContent !== ch) chapterLabel.textContent = ch;
    });
  }
  viewport.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- active panels: reveals + embed pause ---------- */
  // Scroll-driven activation (cheap arithmetic, no observer): a panel activates
  // when ≥25% of it (or of the viewport) is visible. Deactivating re-arms the
  // reveals, so a scene replays every time the visitor comes back to it.
  function updateActive() {
    var horizontal = isHorizontal();
    var vStart = horizontal ? viewport.scrollLeft : window.scrollY;
    var vSize = horizontal ? viewport.clientWidth : window.innerHeight;
    var vEnd = vStart + vSize;
    panels.forEach(function (p) {
      var pStart = horizontal ? p.offsetLeft : p.offsetTop;
      var pSize = horizontal ? p.offsetWidth : p.offsetHeight;
      var overlap = Math.min(vEnd, pStart + pSize) - Math.max(vStart, pStart);
      var visible = overlap / Math.min(pSize, vSize) >= 0.25;
      if (visible) {
        p.classList.add('is-active');
        playPanelVideo(p); // idempotent — resumes if a first attempt raced the load
      } else if (p.classList.contains('is-active')) {
        p.classList.remove('is-active');
        pauseEmbeds(p);
        pausePanelVideo(p);
      }
    });
  }

  /* ---------- ambient background videos (lazy, muted, looped) ---------- */
  function playPanelVideo(panel) {
    var video = panel.querySelector('video[data-video-src]');
    if (!video || reducedMotion) return;
    if (!video.src) {
      video.src = video.getAttribute('data-video-src');
      video.addEventListener('error', function () { video.remove(); }, { once: true });
    }
    if (!video.paused) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }
  function pausePanelVideo(panel) {
    var video = panel.querySelector('video[data-video-src]');
    if (video && !video.paused) video.pause();
  }

  /* ---------- menu ---------- */
  function toggleMenu(open) {
    var willOpen = typeof open === 'boolean' ? open : menu.hidden;
    menu.hidden = !willOpen;
    menuBtn.setAttribute('aria-expanded', String(willOpen));
    menuBtn.textContent = willOpen ? 'Close' : 'Chapters';
  }
  menuBtn.addEventListener('click', function () { toggleMenu(); });
  menu.addEventListener('click', function (e) {
    var link = e.target.closest('[data-menu]');
    if (!link) { toggleMenu(false); return; }
    e.preventDefault();
    toggleMenu(false);
    var target = document.querySelector(link.getAttribute('href'));
    if (target) goTo(panels.indexOf(target));
  });

  /* ---------- fullscreen ---------- */
  fsBtn.addEventListener('click', function () {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });
  if (!document.documentElement.requestFullscreen) fsBtn.style.display = 'none';

  /* ---------- first-load hint ---------- */
  function dismissHint() {
    hint.classList.add('is-hidden');
    viewport.focus({ preventScroll: true });
  }
  hintDismiss.addEventListener('click', dismissHint);
  hint.addEventListener('click', function (e) { if (e.target === hint) dismissHint(); });
  window.addEventListener('keydown', function once() {
    // Hide without stealing focus — focus() would cancel an in-flight smooth scroll.
    hint.classList.add('is-hidden');
    window.removeEventListener('keydown', once);
  });
  // Auto-dismiss if the user simply starts scrolling.
  var autoHide = function () { dismissHint(); viewport.removeEventListener('scroll', autoHide); window.removeEventListener('scroll', autoHide); };
  viewport.addEventListener('scroll', autoHide, { passive: true });
  window.addEventListener('scroll', autoHide, { passive: true });

  /* ---------- embeds: click-to-load facades, pause on leave ---------- */
  function loadEmbed(container) {
    var src = container.getAttribute('data-embed-src');
    var title = container.getAttribute('data-embed-title') || 'Embedded reference';
    var facade = container.querySelector('.embed__facade');
    if (!src || container.querySelector('iframe')) return;
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title;
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    container.insertBefore(iframe, facade);
    facade.hidden = true;
  }

  function unloadEmbed(container) {
    var iframe = container.querySelector('iframe');
    var facade = container.querySelector('.embed__facade');
    if (iframe) iframe.remove();
    if (facade) facade.hidden = false;
  }

  function pauseEmbeds(panel) {
    panel.querySelectorAll('[data-embed]').forEach(function (container) {
      var kind = container.getAttribute('data-embed');
      var iframe = container.querySelector('iframe');
      if (!iframe) return;
      if (kind === 'youtube') {
        try {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        } catch (err) { unloadEmbed(container); }
      } else {
        // Drive / Instagram expose no pause API — restore the facade instead.
        unloadEmbed(container);
      }
    });
  }

  document.querySelectorAll('[data-embed]').forEach(function (container) {
    var facade = container.querySelector('.embed__facade');
    if (facade) facade.addEventListener('click', function () { loadEmbed(container); });
  });

  /* ---------- init ---------- */
  onScroll();
  // Re-run once layout has definitely settled (fonts/images can shift offsets).
  window.addEventListener('load', onScroll);
  setTimeout(onScroll, 200);
  setTimeout(onScroll, 800);
  // Safety net for environments where scroll events are throttled or dropped
  // (embedded webviews): keep the active scene in sync on a slow tick.
  setInterval(updateActive, 300);
  // Ensure the presentation starts at the cover even after reload mid-way.
  if (location.hash) {
    var target = document.querySelector(location.hash);
    if (target) setTimeout(function () { goTo(panels.indexOf(target)); }, 60);
  }
})();
