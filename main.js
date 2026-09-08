/*
  Welcome to OKZGN main landing page script.
  The entire website was written by Elias Alvarado Soshina.
  https://github.com/okzgn
  hello@okzgn.com

  Psalm 73:25... I used to think so, but I found out that I'm not that good.
*/

document.addEventListener('DOMContentLoaded', function () {
    var menuButton = document.getElementById('menu');
    var checkoutButton = document.getElementById('checkout');
    var cart = document.getElementById('cart');
    var cartList = document.getElementById('cart-list');
    var cartTotal = document.getElementById('cart-total');
    var cartOrder = document.getElementById('cart-order');
    var cartContact = document.getElementById('cart-contact');
    var clientInput = document.getElementById('cart-client-name');
    var WHATSAPP_URL = 'https://wa.me/593980670720';
    var currentOrderId = null;
    var lastOrderLines = [];
    var services = document.getElementById('services');

    var billingSwitch = document.querySelector('.billing-switch');
    var billingOpts = document.querySelectorAll('.billing-opt');
    var billingCopies = document.querySelectorAll('[data-billing-copy]');
    var billingMap = [];
    var billingMode = 'ondemand';
    var BILLING_LABELS = { ondemand: 'On Demand', retainer: 'Retainer', subscription: 'Subscription' };

    Array.prototype.forEach.call(services ? services.querySelectorAll('.list li') : [], function (li) {
        var price = li.querySelector('.price');
        if (!price) { return; }
        var base = price.textContent;
        li._billingPrices = {
            ondemand: base,
            retainer: base.replace('/hr', '/mo'),
            subscription: base
        };
    });

    Array.prototype.forEach.call(document.querySelectorAll('#services section.ondemand'), function (section) {
        Array.prototype.forEach.call(section.querySelectorAll('.price sub'), function (sub) {
            if (sub.textContent.trim() === '/hr') {
                billingMap.push({ el: sub, ondemand: '/hr', retainer: '/mo' });
            }
        });
    });

    function refreshStaleModes() {
        Array.prototype.forEach.call(selectedItems(), function (li) {
            var stale = !!li.closest('section.ondemand') && li.getAttribute('data-billing') !== billingMode;
            li.classList.toggle('mode-stale', stale);
        });
    }

    function applyUnits() {
        billingMap.forEach(function (item) {
            var li = item.el.closest('li');
            var unit = billingMode;
            if (li && li.classList.contains('mode-stale') && item[li.getAttribute('data-billing')]) {
                unit = li.getAttribute('data-billing');
            }
            item.el.textContent = item[unit];
        });
    }

    function syncBillingVisuals() {
        refreshStaleModes();
        applyUnits();
    }

    function applyBilling(mode) {
        billingMode = mode;
        Array.prototype.forEach.call(billingCopies, function (p) {
            p.hidden = p.getAttribute('data-billing-copy') !== mode;
        });
        Array.prototype.forEach.call(billingOpts, function (btn) {
            var active = btn.getAttribute('data-billing') === mode;
            btn.classList.toggle('selected', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        if (modelSelect && !modelTouched && BILLING_LABELS[mode]) { modelSelect.value = mode; }
        syncBillingVisuals();
        if (selectedItems().length > 0) { renderCart(); }
    }

    if (billingSwitch) {
        billingSwitch.addEventListener('click', function (event) {
            var btn = event.target.closest('.billing-opt');
            if (!btn) { return; }
            applyBilling(btn.getAttribute('data-billing'));
        });
    }

    var TRASH_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<polyline points="3 6 5 6 21 6"></polyline>'
        + '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>'
        + '<path d="M10 11v6M14 11v6"></path>'
        + '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>'
        + '</svg>';

    function pad2(v) { return (v < 10 ? '0' : '') + v; }

    function newOrderId() {
        var d = new Date();
        return 'ORD-' + String(d.getFullYear()).slice(2) + pad2(d.getMonth() + 1) + pad2(d.getDate())
            + '-' + Date.now().toString(36).toUpperCase().slice(-5);
    }

    function selectedItems() {
        return Array.prototype.slice.call(
            services ? services.querySelectorAll('.list li.selected') : []
        );
    }

    function updateUp() {
        var up = window.scrollY > 480;
        checkoutButton.classList.toggle('up', up);
        cart.classList.toggle('up', up);
    }

    function toggleMenu() {
        menuButton.classList.toggle('show', window.scrollY > 480);
    }

    window.addEventListener('scroll', function () {
        toggleMenu();
        updateUp();
    });
    toggleMenu();
    updateUp();

    menuButton.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    function isCartOpen() {
        return cart.classList.contains('open');
    }

    function openCart() {
        renderCart();
        cart.classList.add('open');
        cart.setAttribute('aria-hidden', 'false');
        checkoutButton.classList.add('open');
        checkoutButton.setAttribute('aria-expanded', 'true');
    }

    function closeCart() {
        cart.classList.remove('open');
        cart.setAttribute('aria-hidden', 'true');
        checkoutButton.classList.remove('open');
        checkoutButton.setAttribute('aria-expanded', 'false');
    }

    function syncCount() {
        var count = selectedItems().length;
        if (count > 0 && !currentOrderId) {
            currentOrderId = newOrderId();
        }
        if (count === 0) {
            currentOrderId = null;
        }
        checkoutButton.setAttribute('data-count', count);
        checkoutButton.classList.toggle('show', count > 0);
        if (cartTotal) {
            cartTotal.textContent = count + (count === 1 ? ' service' : ' services');
        }
        if (cartOrder) {
            cartOrder.textContent = currentOrderId || '';
        }
        if (count === 0 && isCartOpen()) {
            closeCart();
        }
    }

    function deselect(li) {
        li.classList.remove('selected', 'mode-stale');
        li.removeAttribute('data-billing');
        var link = li.querySelector('a');
        if (link) { link.setAttribute('aria-pressed', 'false'); }
        syncBillingVisuals();
    }

    function renderCart() {
        if (!cartList) { return; }
        cartList.textContent = '';
        var orderLines = [];
        selectedItems().forEach(function (li) {
            var name = li.querySelector('b');
            var price = li.querySelector('.price');
            var icon = li.querySelector('.icon img');
            var mode = li.getAttribute('data-billing') || '';
            var modeLabel = BILLING_LABELS[mode] || '';
            var priceText = (li._billingPrices && li._billingPrices[mode]) || (price ? price.textContent : '');

            var row = document.createElement('li');

            var ico = document.createElement('span');
            ico.className = 'cart-ico';
            if (icon) {
                var img = document.createElement('img');
                img.src = icon.getAttribute('src');
                img.alt = '';
                img.loading = 'lazy';
                img.decoding = 'async';
                ico.appendChild(img);
            }
            row.appendChild(ico);

            var info = document.createElement('div');
            info.className = 'cart-info';
            var b = document.createElement('b');
            b.textContent = name ? name.textContent : 'Service';
            info.appendChild(b);
            if (modeLabel) {
                var tag = document.createElement('span');
                tag.className = 'cart-mode';
                tag.textContent = modeLabel;
                info.appendChild(tag);
            }
            row.appendChild(info);

            if (priceText) {
                var pr = document.createElement('span');
                pr.className = 'cart-price';
                pr.textContent = priceText;
                row.appendChild(pr);
            }

            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'cart-remove';
            remove.setAttribute('aria-label', 'Remove ' + b.textContent);
            remove.innerHTML = TRASH_SVG;
            remove.addEventListener('click', function () {
                deselect(li);
                syncCount();
                renderCart();
            });
            row.appendChild(remove);

            cartList.appendChild(row);

            orderLines.push((orderLines.length + 1) + '. ' + b.textContent + (priceText ? ' - ' + priceText : '') + (modeLabel ? ' [' + modeLabel + ']' : ''));
        });

        lastOrderLines = orderLines;
        updateCheckoutLink();
    }

    function updateCheckoutLink() {
        if (!cartContact) { return; }
        var client = clientInput ? clientInput.value.trim() : '';
        var message = 'OKZGN - Service Order\n\n'
            + 'Date: ' + new Date().toISOString().slice(0, 10) + '\n'
            + 'Order: ' + (currentOrderId || 'N/A') + '\n'
            + 'Client: ' + (client || 'Not provided') + '\n'
            + 'Status: Pending confirmation\n\n'
            + 'Services requested:\n'
            + lastOrderLines.join('\n') + '\n\n'
            + 'Total: ' + lastOrderLines.length + (lastOrderLines.length === 1 ? ' item' : ' items') + '\n\n'
            + 'I would like to receive a formal proposal covering scope, estimated timeline, and commercial terms for the services above, and to know the next steps.';
        cartContact.href = WHATSAPP_URL + '?text=' + encodeURIComponent(message);
    }

    if (clientInput) {
        clientInput.addEventListener('input', function () {
            updateCheckoutLink();
        });
    }

    var revealParagraphs = document.querySelectorAll('#services > p, #services .category > p, #articles > p, #projects > p');
    var HINT_GAP = 650;
    var HINT_HOLD = 1400;
    var hintQueueTail = 0;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function stopHint(p) {
        if (p._hintTimers) {
            p._hintTimers.forEach(function (t) { clearTimeout(t); });
            p._hintTimers = null;
        }
        var span = p.querySelector('span');
        if (span) { span.classList.remove('cart-hint-on', 'cart-hint-off'); }
    }

    function startHint(p, span, inDelay, outDelay) {
        stopHint(p);
        p._hintTimers = [
            setTimeout(function () {
                if (p.classList.contains('show')) { span.classList.add('cart-hint-on'); }
            }, inDelay),
            setTimeout(function () {
                span.classList.remove('cart-hint-on');
                span.classList.add('cart-hint-off');
                p._hintTimers = null;
            }, outDelay)
        ];
    }

    function cascadeHints(list) {
        if (!list.length) { return; }
        var now = Date.now();
        var base = Math.min(Math.max(now, hintQueueTail), now + 1300);
        var n = list.length;
        var lastEntry = base + (n - 1) * HINT_GAP;
        list.forEach(function (p, i) {
            var span = p.querySelector('span');
            var inAt = reduceMotion ? now : base + i * HINT_GAP;
            var outAt = reduceMotion ? now + HINT_GAP + HINT_HOLD : lastEntry + HINT_HOLD + (n - 1 - i) * HINT_GAP;
            hintQueueTail = Math.max(hintQueueTail, outAt);
            startHint(p, span, inAt - now, outAt - now);
        });
    }

    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            var entering = [];
            entries.forEach(function (entry) {
                var p = entry.target;
                p.classList.toggle('show', entry.isIntersecting);
                if (!p.querySelector('span')) { return; }
                if (entry.isIntersecting) { entering.push(p); }
                else { stopHint(p); }
            });
            cascadeHints(entering);
        }, { rootMargin: '0px 0px -8% 0px' });
        Array.prototype.forEach.call(revealParagraphs, function (p) {
            revealObserver.observe(p);
        });
    }
    else {
        Array.prototype.forEach.call(revealParagraphs, function (p) {
            p.classList.add('show');
            if (p.querySelector('span')) { startHint(p, p.querySelector('span'), 0, HINT_GAP + HINT_HOLD); }
        });
    }

    if (services) {
        services.addEventListener('click', function (event) {
            var link = event.target.closest('#services .list li > a');
            if (!link) { return; }

            event.preventDefault();
            var li = link.parentElement;
            var selected = li.classList.toggle('selected');
            if (selected) {
                li.classList.remove('mode-stale');
                li.dataset.billing = li.closest('section.ondemand') ? billingMode : 'subscription';
            } else {
                li.classList.remove('mode-stale');
                li.removeAttribute('data-billing');
            }
            syncBillingVisuals();
            link.setAttribute('aria-pressed', selected ? 'true' : 'false');
            syncCount();
            if (isCartOpen()) { renderCart(); }
        });
    }

    checkoutButton.addEventListener('click', function () {
        if (isCartOpen()) { closeCart(); } else { openCart(); }
    });

    if (cart) {
        cart.addEventListener('click', function (event) {
            var cta = event.target.closest('a');
            if (!cta) { return; }
            var name = clientInput ? clientInput.value.trim() : '';
            if (cta === cartContact && (name.length < 2 || name.length > 48)) {
                event.preventDefault();
                if (clientInput) { clientInput.focus(); }
                return;
            }
            closeCart();
        });
    }

    document.addEventListener('keydown', function (event) {
        var link = event.target.closest('#services .list li > a');
        if (link && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          link.click();
        }
        else if (event.key === 'Escape' && isCartOpen()) { closeCart(); }
    });

    var contactForm = document.getElementById('contact-form');
    var contactSubmit = document.getElementById('cf-submit');
    var contactStatus = document.getElementById('cf-status');
    var modelSelect = document.getElementById('cf-model');
    var modelTouched = false;
    var CONTACT_ENDPOINT = 'https://inquiry.okzgn.com/';

    function setFormStatus(kind, text) {
        if (!contactStatus) { return; }
        contactStatus.textContent = text;
        contactStatus.className = 'form-status' + (kind ? ' form-' + kind : '');
    }

    if (modelSelect) {
        modelSelect.addEventListener('change', function () { modelTouched = true; });
    }

    if (contactForm && contactSubmit) {
        contactForm.addEventListener('submit', function (event) {
            if (!window.fetch) { return; }
            event.preventDefault();
            if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }
            var data = new FormData(contactForm);
            if ((data.get('website') || '').length) {
                setFormStatus('ok', 'Inquiry received.');
                return;
            }
            if (selectedItems().length > 0) { renderCart(); }
            var payload = {
                source: 'https://okzgn.com',
                page: location.pathname,
                referrer: document.referrer || '',
                locale: navigator.language || '',
                timestamp: new Date().toISOString(),
                name: data.get('name').trim(),
                email: data.get('email').trim(),
                company: (data.get('company') || '').trim(),
                phone: (data.get('phone') || '').trim(),
                service: data.get('service'),
                model: data.get('model'),
                message: data.get('message').trim(),
                order: { id: newOrderId(), items: (selectedItems().length > 0 ? lastOrderLines.slice() : ['Without items']) }
            };
            contactSubmit.disabled = true;
            setFormStatus('info', 'Sending...');
            fetch(CONTACT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function (res) {
                if (!res.ok) { throw new Error('HTTP ' + res.status); }
                contactForm.reset();
                modelTouched = false;
                setFormStatus('ok', 'Inquiry sent. A response typically arrives within 7 business days.');
            }).catch(function () {
                setFormStatus('err', 'Connection failed. Retry, or use WhatsApp or email.');
            }).then(function () {
                contactSubmit.disabled = false;
            });
        });
    }

    syncCount();
});
