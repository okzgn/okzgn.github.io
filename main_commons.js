document.addEventListener('DOMContentLoaded', function () {
  var
    UP_OFFSET = 480,
    reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initHeader();
  initBackToTop();
  initCopyButtons();
  initToc();

  // Site header: frosted once the page scrolls, mobile menu, and the current section on the landing.
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) { return; }

    var toggle = header.querySelector('.site-menu-toggle'), ticking = false;

    function update() {
      header.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();

    function setOpen(open) {
      header.classList.toggle('open', open);
      if (toggle) {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      }
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        setOpen(!header.classList.contains('open'));
      });
    }

    header.addEventListener('click', function (event) {
      if (event.target.closest('.site-nav a')) { setOpen(false); }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && header.classList.contains('open')) {
        setOpen(false);
        if (toggle) { toggle.focus(); }
      }
    });

    document.addEventListener('click', function (event) {
      if (header.classList.contains('open') && !header.contains(event.target)) { setOpen(false); }
    });

    // Highlight the link of the section in view (same-page links only).
    var links = header.querySelectorAll('.site-nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) { return; }

    var sections = [];
    Array.prototype.forEach.call(links, function (link) {
      var section = document.getElementById(link.getAttribute('href').slice(1));
      if (section) { sections.push(section); }
    });

    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var hash = '#' + entry.target.id;
        Array.prototype.forEach.call(links, function (link) {
          if (entry.isIntersecting) {
            link.classList.toggle('is-current', link.getAttribute('href') === hash);
          }
          else if (link.getAttribute('href') === hash) {
            link.classList.remove('is-current');
          }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  // Floating back to top button, present on every page.
  function initBackToTop() {
    var upButton = document.getElementById('up'), ticking = false;
    if (!upButton) { return; }

    function update() {
      upButton.classList.toggle('show', window.scrollY > UP_OFFSET);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();

    upButton.addEventListener('click', function (event) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  // Code blocks: clicking a block copies its code.
  function initCopyButtons() {
    var
      preCodes = document.getElementsByTagName('pre'),
      i = preCodes.length;

    while (i--) {
      preCodes[i].addEventListener('click', (function(element) {
        return function (event) {
          event.preventDefault();
          var code = element.querySelector('code'), btn = element.querySelector('button.copy');
          if (!code) { return; }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code.textContent);
            if (btn) {
              btn.textContent = 'Copied';
              setTimeout(function () {
                btn.textContent = 'Copy';
              }, 567);
            }
          }
        }
      })(preCodes[i]));
    }
  }

  // Table of contents built from the headings, with scroll-spy (subpages only).
  function initToc() {
    var
      nav = document.querySelector('.toc'),
      navTitle = document.querySelector('.nav-title'),
      menu = document.getElementById('menu'),
      mainTitle = document.querySelector('.main-title'),
      menuListContainer = document.querySelector('.toc .menu-list'),
      menuList = document.querySelector('.toc .menu-list ol'),
      sidebar = window.matchMedia ? window.matchMedia('(min-width: 1100px)') : { matches: false },
      points = document.querySelectorAll('main h2, main h3, main h4, main h5, main h6');

    if (!nav || !navTitle || !menu || !mainTitle || !menuListContainer || !menuList) { return; }

    var prevTitle = navTitle.textContent;
    mainTitle = mainTitle.textContent;

    function iterateByCond(elements, cond, mode) {
      var
        prev = true,
        next = false,
        _prev = [],
        _next = [],
        current;

      if (mode) {
        var i = elements.length;
        while (i--) {
          if (next) {
            _next.push(elements[i]);
          }

          if (cond.call(elements[i])) {
            prev = false;
            current = elements[i];
            next = true;
          }

          if (prev) {
            _prev.push(elements[i]);
          }
        }
      }
      else {
        for (var i = 0; i < elements.length; i++) {
          if (next) {
            _next.push(elements[i]);
          }

          if (cond.call(elements[i])) {
            prev = false;
            current = elements[i];
            next = true;
          }

          if (prev) {
            _prev.push(elements[i]);
          }
        }
      }

      if (!current) { return null; }
      return { prev: _prev, current: current, next: _next };
    }

    function observer(selector, showFn, hideFn) {
      if (typeof showFn != 'function' && typeof hideFn != 'function') {
        return;
      }

      // Thresholds every 2% of the visible ratio.
      var _thresholds = [];
      for (var threshold = 0; threshold <= 1; threshold += 0.02) {
        _thresholds.push(Number(threshold.toFixed(2)));
      }

      var
        _handlerElements = new WeakMap(),
        _handler = new IntersectionObserver(function (intersections) {

        intersections.forEach(function (entry, index, array) {
          // The first observation has no previous position, so its direction stays unknown.
          if (!_handlerElements.has(entry.target)) {
            _handlerElements.set(entry.target, { x: entry.boundingClientRect.x, y: entry.boundingClientRect.y });
          }

          var
            previous = _handlerElements.get(entry.target),
            previousX = previous.x,
            previousY = previous.y,
            currentXDirection = 'unknown',
            currentYDirection = 'unknown',
            currentX = entry.boundingClientRect.x,
            currentY = entry.boundingClientRect.y;

          if (currentX < previousX) {
            currentXDirection = 'right';
          }
          else if (currentX > previousX) {
            currentXDirection = 'left';
          }

          if (currentY < previousY) {
            currentYDirection = 'down';
          }
          else if (currentY > previousY) {
            currentYDirection = 'up';
          }

          if (entry.isIntersecting) {
            var
              _index = entry.intersectionRect,
              _array = ((_index.width * _index.height) / (window.innerWidth * window.innerHeight));

              if (entry.intersectionRatio > 0.74 || _array > 0.74) {
                showFn.call(entry.target, currentXDirection, currentYDirection, 75, _index, entry);
              }
              else if (entry.intersectionRatio > 0.49 || _array > 0.49) {
                showFn.call(entry.target, currentXDirection, currentYDirection, 50, _index, entry);
              }
              else if (entry.intersectionRatio > 0.24 || _array > 0.24) {
                showFn.call(entry.target, currentXDirection, currentYDirection, 25, _index, entry);
              }
              else {
                hideFn.call(entry.target, currentXDirection, currentYDirection, entry);
              }
          }
          else {
            hideFn.call(entry.target, currentXDirection, currentYDirection, entry);
          }

          previousX = currentX;
          previousY = currentY;
          _handlerElements.set(entry.target, { x: previousX, y: previousY });
        });
      }, { threshold: _thresholds });

      var _elements = (typeof selector !== 'string' ? (typeof selector === 'object' && selector ? (selector.length ? selector : [selector]) : null) : document.querySelectorAll(selector));
      if (_elements) {
        _elements.forEach(function (element) {
          _handler.observe(element);
        });
      }

      return _handler;
    }

    // The collapsed bar shows the page title once the title block has scrolled away (not in the sidebar).
    function scrollOperation() {
      var state = false;

      function showOrHide() {
        var scroll = window.scrollY;
        if (scroll > 100 && !sidebar.matches) {
          navTitle.textContent = mainTitle;
        }
        else if (scroll < 80 || sidebar.matches) {
          navTitle.textContent = prevTitle;
        }

        state = false;
      }

      return function () {
        if (!state) {
          state = true;
          requestAnimationFrame(showOrHide);
        }
      }
    }

    function menuState(state) {
      return typeof state === 'undefined' ? (menu.getAttribute('aria-expanded') === 'false' ? false : true) : menu.setAttribute('aria-expanded', (state ? 'true' : 'false'));
    }

    function scrollSituate(scrollContainer, element) {
      clearTimeout(scrollSituate.timeout);
      scrollSituate.timeout = setTimeout(function () {
        var
          rectContainer = scrollContainer.getBoundingClientRect(),
          rectElement = element.getBoundingClientRect(),
          visibleDistance = rectElement.top - rectContainer.top,
          totalDistance = visibleDistance + scrollContainer.scrollTop;

        scrollContainer.scrollTo({ top: totalDistance });
      }, 100);
    }

    function menuOperation(event) {
      if (!menuState()) {
        menuState(true);
        menu.setAttribute('aria-label', 'Close menu');

        var selectedAnchors = iterateByCond(anchors, function () { return this.classList.contains('is-active'); });
        if (selectedAnchors) {
          scrollSituate(menuListContainer, selectedAnchors.current);
        }
        return nav.classList.add('expanded');
      }

      menuState(false);
      menu.setAttribute('aria-label', 'Open menu');
      nav.classList.remove('expanded');
    }

    window.addEventListener('scroll', scrollOperation(), { passive: true });

    menu.addEventListener('click', menuOperation);

    function setPoints(point) {
      this.index = this.index || Object.create(null);
      this.count = this.count || 1;

      var anchor = point.id || point.textContent.replace(/['"\(\)\[\]]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/^\-|\-$/g, '').replace(/\-+/g, '-').toLowerCase();
      var visibleAnchor = point.textContent.replace(/^[^a-zA-Z0-9]|[^a-zA-Z0-9]$/g, '');

      var upperAnchor;
      try {
        upperAnchor = Number(point.tagName.slice(1)) - 1;
        upperAnchor = isNaN(upperAnchor) ? [] : menuList.querySelectorAll('.H' + upperAnchor);
        upperAnchor = upperAnchor.length ? upperAnchor[upperAnchor.length - 1].getAttribute('href').replace(/\#/g, '') : '';
      }
      catch(e) {
        console.error(e.message);
      }

      anchor = (upperAnchor ? upperAnchor + '-' : '') + anchor;

      this.index[anchor] = (!this.index[anchor] ? anchor : (anchor + '-' + this.count++));
      anchor = this.index[anchor];

      point.id = anchor;
      point.addEventListener('click', function () {
        window.location = '#' + anchor;
      });

      var menuListItem = document.createElement('li');
      var menuListItemLink = document.createElement('a');
      menuListItemLink.className = point.tagName;
      menuListItemLink.href = '#' + anchor;
      menuListItemLink.textContent = visibleAnchor;
      menuListItem.appendChild(menuListItemLink);
      menuList.appendChild(menuListItem);

      menuListItemLink.addEventListener('click', function () {
        if (menuState()) { menuOperation(); }
      });
    }

    points.forEach(setPoints);

    var anchors = document.querySelectorAll('.toc .menu-list a');
    if (!anchors.length) { return; }

    function show(scrollXDirection, scrollYDirection, visibleRatio) {
      var id = this.id;

      clearTimeout(observerShow);
      observerShow = setTimeout(function () {
        var elements = iterateByCond((function () { return anchors; })(), function () { return this.getAttribute('href') === '#' + id; });
        if (!elements) { return; }

        elements.current.classList.add('is-active');
        elements.prev.forEach(function (element) {
          element.classList.add('is-active');
        });
        scrollSituate(menuListContainer, elements.current);
      }, 200);
    }

    function hide(scrollXDirection, scrollYDirection, intersectionEntry) {
      var id = this.id;

      clearTimeout(observerHide);
      observerHide = setTimeout(function () {
        var elements = iterateByCond((function () { return anchors; })(), function () { return this.getAttribute('href') === '#' + id; });
        if (!elements) { return; }

        if (scrollYDirection === 'up') {
          elements.current.classList.remove('is-active');
          elements.next.forEach(function (element) {
            element.classList.remove('is-active');
          });

          if (elements.prev.length) {
            scrollSituate(menuListContainer, elements.prev[elements.prev.length - 1]);
          }
        }
      }, 200);
    }

    var observerShow, observerHide, observerHandler = observer(points, show, hide);
    window['_TOC_OBSERVER_RESET'] = function(mode) {
      observerHandler.disconnect();
      points = document.querySelectorAll('main h2, main h3, main h4, main h5, main h6');
      menuList.textContent = '';
      points.forEach(setPoints);
      anchors = document.querySelectorAll('.toc .menu-list a');
      observerHandler = observer(points, show, hide);
      if (!mode) {
        goHashLocation();
      }
    };

    function goHashLocation(){
      var hash = window.location.hash + '';
      if (hash) {
        var element = iterateByCond(anchors, function () { return this.getAttribute('href') === hash; });
        if (element) {
          element.current.click();
          var target = document.getElementById(element.current.getAttribute('href').slice(1));
          if (target) {
            var details = target.closest('details');
            if (details) {
              details.open = true;
            }
          }
        }
      }
    }

    goHashLocation();
  }
});
