/*
  Curriculum vitae: builds a PDF of this page in the browser, with no library.

  The content is read from the page itself, so the PDF always matches it: each section is an <h2>
  with a data-cv key, followed by its lists, key-value tables, paragraphs or timeline (Experience,
  Education). The PDF uses the standard Helvetica fonts (nothing to embed), real selectable text and
  clickable links.

  Configuration: edit DEFAULTS below, set window.CV_PDF_CONFIG before this script runs, or pass
  overrides to window.okzgnCvPdf.generate({...}) or .download({...}) from the console. Overrides are
  merged one level deep, so { titles: { skills: 'Skills' } } changes only that title.
*/
(function () {
    'use strict';

    var DEFAULTS = {
        fileName: 'Elias_Alvarado_Soshina_CV.pdf',
        page: 'letter',             // 'letter' (216 x 279 mm) or 'a4' (210 x 297 mm)
        margin: 42,                 // points (72 per inch)
        fontSize: 9,                // body size; the other sizes scale from it
        lineHeight: 1.38,
        fitOnePage: true,           // shrink the type, down to minFontSize, when that fits it on one page
        minFontSize: 8.5,
        // Sections in print order, by their data-cv key. Details and links feed the header instead.
        sections: ['profile', 'skills', 'experience', 'projects', 'education', 'certifications', 'languages', 'tools'],
        titles: {
            profile: 'Professional Summary',
            skills: 'Technical Skills',
            experience: 'Professional Experience',
            projects: 'Open Source Projects',
            education: 'Education',
            certifications: 'Certifications',
            languages: 'Languages',
            tools: 'Digital Tools'
        },
        // How each section is laid out: paragraphs, list (one block per item), bullets, inline (the
        // items on one line) or entries (dated roles, from the timeline).
        layout: {
            profile: 'paragraphs',
            skills: 'list',
            experience: 'entries',
            projects: 'bullets',
            education: 'entries',
            certifications: 'bullets',
            languages: 'inline',
            tools: 'list'
        },
        // Paragraphs that follow a section's list are printed as a note only for these sections.
        notes: ['certifications'],
        headline: null,             // null: the Role from Details
        // Header contact line, by label, from Details or Professional Links.
        contact: ['Email', 'Website', 'GitHub', 'LinkedIn', 'Based in'],
        extraContact: [],           // more items for the contact line, e.g. a phone not shown on the site
        footer: true,               // the page URL and the page number
        colors: {
            name: '#004E9B',
            title: '#004E9B',
            text: '#2B3441',
            muted: '#667383',
            rule: '#D5DEE8',
            link: '#0065CA'
        }
    };

    /* ---------------------------------------------------------------- Fonts and text */

    // Helvetica and Helvetica-Bold advance widths (1/1000 em) for ASCII 32-126, from the standard AFMs.
    var WIDTHS = {
        R: '278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584',
        B: '278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584'
    };
    Object.keys(WIDTHS).forEach(function (k) { WIDTHS[k] = WIDTHS[k].split(' ').map(Number); });
    WIDTHS.I = WIDTHS.R; // Helvetica-Oblique shares the regular widths.

    var SPECIAL_WIDTHS = {
        '•': [350, 350], '–': [556, 556], '—': [1000, 1000], '·': [278, 278],
        '‘': [222, 278], '’': [222, 278], '“': [333, 500], '”': [333, 500],
        '…': [1000, 1000], '€': [556, 556], '©': [737, 737], '®': [737, 737],
        '°': [400, 400], '×': [584, 584], ' ': [278, 278]
    };

    // Unicode to WinAnsiEncoding for the characters outside Latin-1 that it holds.
    var WIN_ANSI = {
        '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86,
        '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C,
        'Ž': 0x8E, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95,
        '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B,
        'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F
    };
    var REPLACE = { '−': '-', '→': '->', '←': '<-', '≈': '~', '≤': '<=', '≥': '>=' };

    function charWidth(ch, font) {
        var code = ch.charCodeAt(0);
        var table = WIDTHS[font];
        if (code >= 32 && code <= 126) { return table[code - 32]; }
        if (SPECIAL_WIDTHS[ch]) { return SPECIAL_WIDTHS[ch][font === 'B' ? 1 : 0]; }
        var base = ch.normalize('NFD').charAt(0); // an accented letter is as wide as its base letter
        code = base.charCodeAt(0);
        if (code >= 32 && code <= 126) { return table[code - 32]; }
        return 556;
    }

    function textWidth(text, font, size, spacing) {
        var w = 0;
        for (var i = 0; i < text.length; i++) { w += charWidth(text.charAt(i), font); }
        return w * size / 1000 + (spacing || 0) * text.length;
    }

    // A PDF literal string in WinAnsiEncoding, one byte per character.
    function pdfString(text) {
        var out = '';
        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (REPLACE[ch]) { out += pdfString(REPLACE[ch]).slice(1, -1); continue; }
            var code = ch.charCodeAt(0);
            if (WIN_ANSI[ch]) { code = WIN_ANSI[ch]; }
            else if (code > 255 || (code >= 0x80 && code < 0xA0)) { code = 63; } // '?'
            var c = String.fromCharCode(code);
            out += (c === '(' || c === ')' || c === '\\') ? '\\' + c : c;
        }
        return '(' + out + ')';
    }

    function rgb(hex) {
        var n = parseInt(hex.replace('#', ''), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return (v / 255).toFixed(3); }).join(' ');
    }

    function num(v) { return (Math.round(v * 100) / 100).toString(); }

    /* ---------------------------------------------------------------- Reading the page */

    function clean(text) { return text.replace(/\s+/g, ' ').trim(); }

    // Links resolve against the canonical URL, so a PDF made from a preview or a mirror still points at
    // the public site.
    function abs(a) {
        var canonical = document.querySelector('link[rel="canonical"]');
        try { return new URL(a.getAttribute('href'), canonical ? canonical.href : location.href).href; }
        catch (e) { return a.href; }
    }

    // Rich text runs of a node: plain text, bold (<b>, <strong>) and links (<a>, made absolute).
    function runsOf(node, style) {
        var runs = [];
        style = style || {};
        node.childNodes.forEach(function (child) {
            if (child.nodeType === 3) {
                runs.push({ t: child.nodeValue.replace(/\s+/g, ' '), b: style.b, href: style.href });
            } else if (child.nodeType === 1) {
                var tag = child.tagName;
                if (tag === 'UL' || tag === 'OL') { return; }
                var next = { b: style.b || tag === 'B' || tag === 'STRONG', href: style.href };
                if (tag === 'A') { next.href = abs(child); }
                runs = runs.concat(runsOf(child, next));
            }
        });
        return trimRuns(runs);
    }

    function trimRuns(runs) {
        runs = runs.filter(function (r) { return r.t; });
        if (runs.length) {
            runs[0].t = runs[0].t.replace(/^\s+/, '');
            runs[runs.length - 1].t = runs[runs.length - 1].t.replace(/\s+$/, '');
        }
        return runs.filter(function (r) { return r.t; });
    }

    function sectionNodes(key) {
        var head = document.querySelector('h2[data-cv="' + key + '"]');
        var nodes = [];
        for (var el = head && head.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
            nodes.push(el);
        }
        return nodes;
    }

    function readPage() {
        var data = { details: {}, links: {}, sections: {} };

        sectionNodes('details').forEach(function (el) {
            el.querySelectorAll('div').forEach(function (row) {
                var dt = row.querySelector('dt'), dd = row.querySelector('dd');
                if (!dt || !dd) { return; }
                var a = dd.querySelector('a');
                data.details[clean(dt.textContent)] = { text: clean(dd.textContent), href: a ? abs(a) : null };
            });
        });

        // Links: rows of a key-value table (or list items with a bold label).
        sectionNodes('links').forEach(function (el) {
            el.querySelectorAll('dl > div, li').forEach(function (row) {
                var label = row.querySelector('dt, b'), a = row.querySelector('a');
                if (!label || !a) { return; }
                data.links[clean(label.textContent).replace(/:$/, '')] = { text: clean(a.textContent), href: abs(a) };
            });
        });

        Array.prototype.forEach.call(document.querySelectorAll('h2[data-cv]'), function (h) {
            var key = h.getAttribute('data-cv');
            if (key === 'details' || key === 'links') { return; }
            var section = { items: [], entries: [], paragraphs: [], notes: [] };
            sectionNodes(key).forEach(function (el) {
                if (el.tagName === 'OL' && el.classList.contains('timeline')) {
                    Array.prototype.forEach.call(el.children, function (li) {
                        var year = li.querySelector('.timeline-year');
                        var head = li.querySelector('p');
                        var role = head && head.querySelector('b');
                        var org = head ? clean(head.textContent.replace(role ? role.textContent : '', '')).replace(/^[·\-|,]\s*/, '') : '';
                        section.entries.push({
                            dates: year ? clean(year.textContent) : '',
                            role: role ? clean(role.textContent) : '',
                            org: org,
                            bullets: Array.prototype.map.call(li.querySelectorAll('ul > li'), function (b) { return runsOf(b); })
                        });
                    });
                } else if (el.tagName === 'UL' || el.tagName === 'OL') {
                    Array.prototype.forEach.call(el.children, function (li) { section.items.push(runsOf(li)); });
                } else if (el.tagName === 'DL') {
                    // A key-value table: each row prints as "Label: value", the label in bold.
                    Array.prototype.forEach.call(el.children, function (row) {
                        var dt = row.querySelector('dt'), dd = row.querySelector('dd');
                        if (dt && dd) { section.items.push([{ t: clean(dt.textContent) + ': ', b: true }].concat(runsOf(dd))); }
                    });
                } else if (el.tagName === 'P') {
                    (section.items.length || section.entries.length ? section.notes : section.paragraphs).push(runsOf(el));
                }
            });
            data.sections[key] = section;
        });
        return data;
    }

    /* ---------------------------------------------------------------- Layout */

    function Layout(cfg) {
        var size = cfg.page === 'a4' ? [595.28, 841.89] : [612, 792];
        this.cfg = cfg;
        this.W = size[0];
        this.H = size[1];
        this.x = cfg.margin;
        this.width = this.W - 2 * cfg.margin;
        this.fs = cfg.fontSize;
        this.lh = cfg.fontSize * cfg.lineHeight;
        this.bottom = this.H - cfg.margin - (cfg.footer ? cfg.fontSize * 1.6 : 0);
        this.pages = [];
        this.newPage();
    }

    Layout.prototype.newPage = function () {
        this.page = { ops: [], annots: [] };
        this.pages.push(this.page);
        this.y = this.cfg.margin;
    };

    // Moves down by h, starting a page first when h does not fit.
    Layout.prototype.room = function (h) {
        if (this.y + h > this.bottom) { this.newPage(); }
    };

    Layout.prototype.text = function (str, x, baseline, font, size, color, spacing, href) {
        var y = this.H - baseline;
        this.page.ops.push('BT /F' + font + ' ' + num(size) + ' Tf ' + rgb(color) + ' rg ' +
            (spacing ? num(spacing) + ' Tc ' : '') + '1 0 0 1 ' + num(x) + ' ' + num(y) + ' Tm ' + pdfString(str) + ' Tj ' +
            (spacing ? '0 Tc ' : '') + 'ET');
        if (href) {
            var w = textWidth(str, font, size, spacing);
            this.page.annots.push({ rect: [x, y - size * 0.22, x + w, y + size * 0.78], href: href });
        }
    };

    Layout.prototype.rule = function (y, color, weight) {
        var py = this.H - y;
        this.page.ops.push(rgb(color) + ' RG ' + num(weight) + ' w ' + num(this.x) + ' ' + num(py) + ' m ' +
            num(this.x + this.width) + ' ' + num(py) + ' l S');
    };

    // Splits runs into lines no wider than width (the first line may have its own width).
    Layout.prototype.wrap = function (runs, size, width, firstWidth) {
        var tokens = [];
        runs.forEach(function (r) {
            r.t.split(/(\s+)/).forEach(function (piece) {
                if (!piece) { return; }
                var font = r.b ? 'B' : 'R';
                tokens.push({ t: piece.replace(/\s+/g, ' '), b: r.b, href: r.href, c: r.c, space: /^\s+$/.test(piece),
                    w: textWidth(piece.replace(/\s+/g, ' '), font, size) });
            });
        });
        var lines = [[]], lineW = 0, limit = firstWidth || width;
        tokens.forEach(function (tok) {
            var line = lines[lines.length - 1];
            if (tok.space) {
                if (line.length) { line.push(tok); lineW += tok.w; }
                return;
            }
            if (line.length && lineW + tok.w > limit) {
                while (line.length && line[line.length - 1].space) { lineW -= line.pop().w; }
                lines.push([]);
                line = lines[lines.length - 1];
                lineW = 0;
                limit = width;
            }
            line.push(tok);
            lineW += tok.w;
        });
        return lines.filter(function (l) { return l.length; });
    };

    Layout.prototype.drawLine = function (tokens, x, baseline, size, align, width) {
        var self = this, colors = this.cfg.colors;
        var total = tokens.reduce(function (s, t) { return s + t.w; }, 0);
        if (align === 'center') { x += (width - total) / 2; }
        // Adjacent tokens with the same style are drawn as one string.
        var segs = [];
        tokens.forEach(function (t) {
            var last = segs[segs.length - 1];
            if (last && last.b === t.b && last.href === t.href && last.c === t.c) { last.t += t.t; last.w += t.w; }
            else { segs.push({ t: t.t, b: t.b, href: t.href, c: t.c, w: t.w }); }
        });
        segs.forEach(function (s) {
            var color = s.c ? colors[s.c] : (s.href ? colors.link : colors.text);
            self.text(s.t, x, baseline, s.b ? 'B' : 'R', size, color, 0, s.href);
            x += s.w;
        });
    };

    // A block of rich text; indent moves every line, hang moves the lines after the first.
    Layout.prototype.paragraph = function (runs, opt) {
        opt = opt || {};
        var size = opt.size || this.fs, lh = size * this.cfg.lineHeight;
        var indent = opt.indent || 0, hang = opt.hang || 0;
        // With a marker (a bullet) every line starts after it; otherwise only the lines after the first hang.
        var firstShift = opt.marker ? hang : 0;
        var lines = this.wrap(runs, size, this.width - indent - hang, this.width - indent - firstShift - (opt.firstReserve || 0));
        var self = this;
        lines.forEach(function (line, i) {
            self.room(lh);
            var baseline = self.y + size;
            if (i === 0 && opt.marker) {
                self.text(opt.marker, self.x + indent, baseline, 'R', size, self.cfg.colors.muted);
            }
            self.drawLine(line, self.x + indent + (i === 0 ? firstShift : hang), baseline, size, opt.align, self.width);
            if (i === 0 && opt.onFirstLine) { opt.onFirstLine(baseline); }
            self.y += lh;
        });
    };

    Layout.prototype.gap = function (h) { this.y += h; };

    Layout.prototype.heading = function (title) {
        var size = this.fs + 1, c = this.cfg.colors;
        this.room(size * 2.2 + this.lh * 2); // keep the title with its first lines
        if (this.y > this.cfg.margin + 1) { this.gap(this.fs * 1.05); }
        var baseline = this.y + size;
        this.text(title.toUpperCase(), this.x, baseline, 'B', size, c.title, 0.6);
        this.rule(baseline + size * 0.45, c.rule, 0.6);
        this.y = baseline + size * 0.45 + this.fs * 0.55;
    };

    Layout.prototype.header = function (data) {
        var cfg = this.cfg, c = cfg.colors, fs = this.fs;
        var name = data.details.Name ? data.details.Name.text : document.title;
        var nameSize = fs * 2.05;
        this.text(name, this.x + (this.width - textWidth(name, 'B', nameSize)) / 2, this.y + nameSize * 0.8, 'B', nameSize, c.name);
        this.y += nameSize * 1.15;

        var role = cfg.headline || (data.details.Role ? data.details.Role.text : '');
        if (role) {
            role = role.replace(/;\s*/g, ' | ').replace(/\|\s+([a-z])/, function (m, ch) { return '| ' + ch.toUpperCase(); });
            this.paragraph([{ t: role, c: 'muted' }], { size: fs + 1.5, align: 'center' });
        }

        var items = [];
        cfg.contact.forEach(function (label) {
            var d = data.details[label] || data.links[label];
            if (d) { items.push({ t: d.text, href: d.href }); }
        });
        cfg.extraContact.forEach(function (t) { items.push(typeof t === 'string' ? { t: t } : t); });
        var runs = [];
        items.forEach(function (it, i) {
            if (i) { runs.push({ t: '  |  ', c: 'rule' }); }
            runs.push({ t: it.t, href: it.href });
        });
        if (runs.length) { this.paragraph(runs, { size: fs - 0.5, align: 'center' }); }
        this.gap(fs * 0.2);
    };

    Layout.prototype.section = function (key, sec) {
        var self = this, cfg = this.cfg, fs = this.fs, kind = cfg.layout[key] || 'list';
        if (!sec || (!sec.items.length && !sec.entries.length && !sec.paragraphs.length)) { return; }
        this.heading(cfg.titles[key] || key);

        sec.paragraphs.forEach(function (runs, i) {
            if (i) { self.gap(fs * 0.35); }
            self.paragraph(runs);
        });

        if (kind === 'entries') {
            sec.entries.forEach(function (e, i) {
                if (i) { self.gap(fs * 0.55); }
                var dateW = textWidth(e.dates, 'R', fs - 0.5);
                var head = [{ t: e.role, b: true }];
                if (e.org) { head.push({ t: '  |  ', c: 'rule' }, { t: e.org }); }
                self.room(self.lh * 2);
                self.paragraph(head, {
                    firstReserve: dateW + 12,
                    onFirstLine: function (baseline) {
                        self.text(e.dates, self.x + self.width - dateW, baseline, 'R', fs - 0.5, cfg.colors.muted);
                    }
                });
                e.bullets.forEach(function (runs) {
                    self.gap(fs * 0.12);
                    self.paragraph(runs, { marker: '•', indent: fs * 0.4, hang: fs * 1.1 });
                });
            });
        } else if (kind === 'inline') {
            var runs = [];
            sec.items.forEach(function (item, i) {
                if (i) { runs.push({ t: '   ·   ', c: 'muted' }); }
                item = item.map(function (r) { return { t: r.t, b: r.b, href: r.href }; });
                item[item.length - 1].t = item[item.length - 1].t.replace(/\.$/, '');
                runs = runs.concat(item);
            });
            this.paragraph(runs);
        } else {
            sec.items.forEach(function (runs, i) {
                if (i) { self.gap(fs * (kind === 'list' ? 0.22 : 0.12)); }
                if (kind === 'bullets') { self.paragraph(runs, { marker: '•', indent: fs * 0.4, hang: fs * 1.1 }); }
                else { self.paragraph(runs); }
            });
        }

        if (cfg.notes.indexOf(key) !== -1) {
            sec.notes.forEach(function (runs) {
                self.gap(fs * 0.3);
                self.paragraph(runs.map(function (r) { return { t: r.t, b: r.b, href: r.href, c: r.href ? null : 'muted' }; }), { size: fs - 0.5 });
            });
        }
    };

    Layout.prototype.footers = function (url) {
        var self = this, c = this.cfg.colors, size = this.cfg.fontSize - 1.5, total = this.pages.length;
        var baseline = this.H - this.cfg.margin + size;
        this.pages.forEach(function (page, i) {
            self.page = page;
            var shown = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
            self.text(shown, self.x, baseline, 'R', size, c.muted, 0, url);
            var label = 'Page ' + (i + 1) + ' of ' + total;
            self.text(label, self.x + self.width - textWidth(label, 'R', size), baseline, 'R', size, c.muted);
        });
    };

    /* ---------------------------------------------------------------- PDF file */

    function serialize(layout, info) {
        var objects = [];
        function add(body) { objects.push(body); return objects.length; }

        var catalog = add(null), pagesObj = add(null);
        var fonts = { R: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
                      B: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
                      I: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>') };
        var kids = [];
        layout.pages.forEach(function (page) {
            var stream = page.ops.join('\n');
            var content = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
            var annots = page.annots.map(function (a) {
                return add('<< /Type /Annot /Subtype /Link /Border [0 0 0] /Rect [' + a.rect.map(num).join(' ') +
                    '] /A << /S /URI /URI ' + pdfString(a.href) + ' >> >>');
            });
            kids.push(add('<< /Type /Page /Parent ' + pagesObj + ' 0 R /MediaBox [0 0 ' + num(layout.W) + ' ' + num(layout.H) +
                '] /Resources << /Font << /FR ' + fonts.R + ' 0 R /FB ' + fonts.B + ' 0 R /FI ' + fonts.I + ' 0 R >> >> /Contents ' +
                content + ' 0 R' + (annots.length ? ' /Annots [' + annots.map(function (n) { return n + ' 0 R'; }).join(' ') + ']' : '') + ' >>'));
        });
        objects[catalog - 1] = '<< /Type /Catalog /Pages ' + pagesObj + ' 0 R /ViewerPreferences << /DisplayDocTitle true >> >>';
        objects[pagesObj - 1] = '<< /Type /Pages /Kids [' + kids.map(function (n) { return n + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>';

        var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
        var stamp = 'D:' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
        var infoObj = add('<< /Title ' + pdfString(info.title) + ' /Author ' + pdfString(info.author) + ' /Subject ' + pdfString(info.subject) +
            ' /Creator ' + pdfString(info.creator) + ' /Producer ' + pdfString('OKZGN CV builder') + ' /CreationDate ' + pdfString(stamp) + ' >>');

        var out = '%PDF-1.4\n%âãÏÓ\n', offsets = [];
        objects.forEach(function (body, i) {
            offsets.push(out.length);
            out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
        });
        var xref = out.length;
        out += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
        offsets.forEach(function (o) { out += ('000000000' + o).slice(-10) + ' 00000 n \n'; });
        out += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + infoObj + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';

        var bytes = new Uint8Array(out.length);
        for (var i = 0; i < out.length; i++) { bytes[i] = out.charCodeAt(i) & 255; }
        return bytes;
    }

    /* ---------------------------------------------------------------- Public API */

    function merge(base, extra) {
        var out = {};
        Object.keys(base).forEach(function (k) { out[k] = base[k]; });
        Object.keys(extra || {}).forEach(function (k) {
            var v = extra[k];
            out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]))
                ? merge(base[k], v) : v;
        });
        return out;
    }

    function layoutAll(cfg, data, url) {
        var layout = new Layout(cfg);
        layout.header(data);
        cfg.sections.forEach(function (key) { layout.section(key, data.sections[key]); });
        if (cfg.footer) { layout.footers(url); }
        return layout;
    }

    function generate(overrides) {
        var cfg = merge(merge(DEFAULTS, window.CV_PDF_CONFIG), overrides);
        var data = readPage();
        var canonical = document.querySelector('link[rel="canonical"]');
        var url = canonical ? canonical.href : location.href;
        var layout = layoutAll(cfg, data, url);
        // Fit on one page: step the type down to the minimum size. When even that is not enough, the
        // original size is kept and the content flows onto more pages, rather than shrinking for nothing.
        if (cfg.fitOnePage && layout.pages.length > 1) {
            var trial = cfg, fitted = null;
            while (trial.fontSize - 0.25 >= cfg.minFontSize) {
                trial = merge(trial, { fontSize: trial.fontSize - 0.25 });
                var attempt = layoutAll(trial, data, url);
                if (attempt.pages.length === 1) { fitted = attempt; break; }
            }
            if (fitted) { layout = fitted; }
        }
        var name = data.details.Name ? data.details.Name.text : 'Curriculum Vitae';
        return serialize(layout, {
            title: name + ' - Curriculum Vitae',
            author: name,
            subject: data.details.Role ? data.details.Role.text : 'Curriculum vitae',
            creator: url
        });
    }

    function download(overrides) {
        var cfg = merge(merge(DEFAULTS, window.CV_PDF_CONFIG), overrides);
        var blob = new Blob([generate(overrides)], { type: 'application/pdf' });
        var href = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = href;
        a.download = cfg.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(href); }, 4000);
    }

    window.okzgnCvPdf = { defaults: DEFAULTS, generate: generate, download: download, readPage: readPage };

    // The button stays hidden without this script, so the page never shows a control that does nothing.
    document.addEventListener('DOMContentLoaded', function () {
        var button = document.getElementById('cv-pdf');
        if (!button) { return; }
        button.closest('[hidden]') && button.closest('[hidden]').removeAttribute('hidden');
        button.addEventListener('click', function () {
            try { download(); }
            catch (e) { console.error('CV PDF:', e); }
        });
    });
})();
