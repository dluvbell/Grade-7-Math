/* ============================================================================
   mcf-sprites.js  —  the pixel art  (v2, 2026-08-06)

   Why the art lives in a string:
     Forty-odd farm items as PNGs would be forty files to ship, cache, and get
     the relative path right for from two folder depths. As text they are one
     file that cannot 404, and a 16x16 sprite is 256 characters, so the whole
     set costs a few kilobytes and appears instantly on a slow school link.

   Format:
     Every row of a sprite is the same length; that length is its width and
     the row count is its height. Sprites are NOT all the same size — houses
     are 24 wide, field tiles are 16 — so nothing here assumes a square 16.
     A character indexes that sprite's own palette and "." is transparent.
     Palettes are per sprite so each one carries its own six or eight colours
     without a shared table that only ever grows.

   Drawing:
     MCF_SPRITES.draw(ctx, name, x, y, scale, opts). The first call bakes the
     sprite onto an offscreen canvas at 1:1; after that it is one drawImage.
     Scaling is nearest-neighbour, so pixels stay square at any size.
       opts.flip   mirror horizontally
       opts.tint   flat colour over the opaque pixels (the white hit flash)
       opts.alpha  fade
     MCF_SPRITES.dim(name) gives {w,h} for layout maths.

   Adding art: append to SPRITES with the same shape. Nothing else changes.
   ========================================================================== */

window.MCF_SPRITES = (function () {
    "use strict";

    var SPRITES = {
        eye: { p: ["#2a1440", "#9a63d6", "#6c3fa8", "#f6f2ff", "#3a86ff", "#16202b"], d: [
            "................",
            "......1111......",
            "....11111111....",
            "...1111111111...",
            "..111333333111..",
            ".11133344433111.",
            ".11334445443311.",
            "1113444555444311",
            "1113444555444311",
            ".11334445443311.",
            ".11133344433111.",
            "..111333333111..",
            "...1111111111...",
            "..2..111111..2..",
            ".2.2........2.2.",
            "2...2......2...2"
        ] },
        golem: { p: ["#2b2b33", "#8a8f9c", "#6b7180", "#c3c9d6", "#f0a63c", "#16202b"], d: [
            "................",
            "...1111111111...",
            "..133333333331..",
            "..131111111131..",
            "..131044401131..",
            "..131044401131..",
            "..131111111131..",
            "..122111111221..",
            "1111111111111111",
            "1211111111111121",
            "1211144444411121",
            "1211111111111121",
            "1111111111111111",
            "..122111111221..",
            "..111........111",
            "..222........222"
        ] },
        hero: { p: ["#16202b", "#f4c28d", "#7a4a21", "#2d6cb4", "#1f4c81", "#3b3f4a", "#241c14", "#f4b73f", "#e8e3d8"], d: [
            "................",
            "....22222222....",
            "...2222222222...",
            "...2111111112...",
            "...2101111012...",
            "...2111111112...",
            "....11111111....",
            ".....111111.....",
            "..433333333334..",
            "..433333333334..",
            "..133333333331..",
            "..1.333333331778",
            "....55555555....",
            "....55555555....",
            "...666....666...",
            "...666....666..."
        ] },
        knight: { p: ["#12131a", "#3d4250", "#5a6072", "#8e96ad", "#c0392b", "#e8e3d8"], d: [
            "......2222......",
            ".....222222.....",
            "....22333322....",
            "....23444432....",
            "....23444432....",
            "....22333322....",
            ".....211112.....",
            "...2222222222...",
            "..223333333322..",
            "..233333333332..",
            "5.233333333332.5",
            "5523311113332.55",
            ".55211111111255.",
            "..2211111111.2..",
            "..222......222..",
            "..222......222.."
        ] },
        slime: { p: ["#0d2f1a", "#5fd68a", "#3aa565", "#c9f7d9", "#16202b", "#ffffff"], d: [
            "................",
            ".....111111.....",
            "...1111111111...",
            "..111333111111..",
            ".11113311111111.",
            ".11111111111111.",
            "1114411111144111",
            "1114411111144111",
            "1111111111111111",
            "1111144444111111",
            "1111114441111111",
            "1111111111111111",
            "1112111111112111",
            "2111111111111112",
            ".22222222222222.",
            "................"
        ] }
    };

    var baked = {};

    function dim(name) {
        var s = SPRITES[name];
        if (!s) return null;
        return { w: (s.d[0] || "").length, h: s.d.length };
    }

    function bake(name) {
        if (baked[name]) return baked[name];
        var s = SPRITES[name];
        if (!s) return null;
        var d = dim(name);

        var c = document.createElement("canvas");
        c.width = d.w; c.height = d.h;
        var g = c.getContext("2d");

        for (var y = 0; y < d.h; y++) {
            var row = s.d[y] || "";
            for (var x = 0; x < d.w; x++) {
                var ch = row.charAt(x);
                if (!ch || ch === ".") continue;
                var col = s.p[+ch];
                if (!col || col === "#00000000") continue;
                g.fillStyle = col;
                g.fillRect(x, y, 1, 1);
            }
        }
        baked[name] = c;
        return c;
    }

    /* A tinted copy is baked once per colour rather than per frame; a hit
       flash runs at 60fps and re-tinting every frame was the only thing the
       arena did that was not free. */
    var tinted = {};

    function bakeTint(name, colour) {
        var key = name + "|" + colour;
        if (tinted[key]) return tinted[key];
        var base = bake(name);
        if (!base) return null;

        var c = document.createElement("canvas");
        c.width = base.width; c.height = base.height;
        var g = c.getContext("2d");
        g.drawImage(base, 0, 0);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = colour;
        g.fillRect(0, 0, c.width, c.height);
        tinted[key] = c;
        return c;
    }

    function draw(ctx, name, x, y, scale, opts) {
        opts = opts || {};
        var img = opts.tint ? bakeTint(name, opts.tint) : bake(name);
        if (!img) return;

        var w = img.width * scale, h = img.height * scale;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
        if (opts.flip) {
            ctx.translate(Math.round(x) + w, Math.round(y));
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, w, h);
        } else {
            ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
        }
        ctx.restore();
    }

    function has(name) { return !!SPRITES[name]; }
    function names() { return Object.keys(SPRITES); }

    /* kept for the arena, which was written when everything was 16x16 */
    var size = 16;

    return { draw: draw, has: has, dim: dim, names: names, size: size };
})();

/* ==========================================================================
   skill effects — appended 2026-08-07. Lives here rather than in a file of
   its own because the arena already loads this one, and only when a fight
   is on. Draws with fillRect only, on a 2px grid, to match the sprites.
   ========================================================================== */

/* ============================================================================
   mcf-fx.js  —  skill effects for the boss arena  (draft 1, 2026-08-07)

   Everything here draws with fillRect only, snapped to a 2px block grid, so
   it matches the pixel sprites standing next to it and so the same code can
   run against a headless shim for the contact sheet.

   FX.draw(g, name, t, o)     t is 0..1 progress through the effect
   FX.boss(name, t)           how the boss itself should move/tint at time t
   FX.LEN[name]               how long the effect runs, in ms

   o describes the boss box in canvas pixels:
     { cx, cy, top, bottom, w }   centre, top edge, ground line, width
   ========================================================================== */

(function (root) {
    "use strict";

    var B = 2;                                   /* block size */

    function px(g, x, y, w, h, c) {
        x = Math.round(x / B) * B;
        y = Math.round(y / B) * B;
        w = Math.max(B, Math.round(w / B) * B);
        h = Math.max(B, Math.round(h / B) * B);
        g.fillStyle = c;
        g.fillRect(x, y, w, h);
    }

    function ease(v) { return 1 - Math.pow(1 - v, 3); }
    function cl(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    function seg(t, a, b) { return cl((t - a) / (b - a)); }
    function on(t, a, b) { return t >= a && t <= b; }
    function rnd(i) { var x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }

    /* ---------- shared shapes ---------- */

    /* a tilted disc drawn as nested bands, outermost colour first */
    function disc(g, cx, cy, rx, ry, shear, bands) {
        for (var k = 0; k < bands.length; k++) {
            var RX = rx * bands[k].r, RY = ry * bands[k].r;
            if (RX < 1 || RY < 1) continue;
            for (var dy = -RY; dy <= RY; dy += B) {
                var q = 1 - (dy * dy) / (RY * RY);
                if (q < 0) continue;
                var hw = RX * Math.sqrt(q);
                if (hw < 1) continue;
                px(g, cx - hw + dy * shear, cy + dy, hw * 2, B, bands[k].c);
            }
        }
    }

    /* an arc band: bright core, darker rim. Works at any angle because each
       sample is a square, not a bar. */
    function crescent(g, cx, cy, r, a0, a1, thick, bands, full) {
        var n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r / B));
        for (var i = 0; i <= n; i++) {
            var a = a0 + (a1 - a0) * i / n;
            var taper = full ? 1 : Math.sin(Math.PI * i / n);   /* thin at the tips */
            var th = thick * taper;
            if (th < 1) continue;
            for (var d = -th / 2; d <= th / 2; d += B) {
                var f = Math.abs(d) / (th / 2 || 1);
                var c = bands[Math.min(bands.length - 1, Math.floor(f * bands.length))];
                px(g, cx + Math.cos(a) * (r + d) - B / 2,
                      cy + Math.sin(a) * (r + d) - B / 2, B, B, c);
            }
        }
    }

    function line(g, x0, y0, x1, y1, w, c) {
        var dx = x1 - x0, dy = y1 - y0;
        var n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / B));
        for (var i = 0; i <= n; i++) {
            px(g, x0 + dx * i / n - w / 2, y0 + dy * i / n - w / 2, w, w, c);
        }
    }

    /* a jagged bolt from one point to another */
    function bolt(g, x0, y0, x1, y1, seed, jit, passes) {
        var segs = 9, pts = [], i;
        for (i = 0; i <= segs; i++) {
            var p = i / segs;
            pts.push([
                x0 + (x1 - x0) * p + (i === 0 || i === segs ? 0 : (rnd(seed + i) - 0.5) * jit),
                y0 + (y1 - y0) * p
            ]);
        }
        for (var k = 0; k < passes.length; k++) {
            for (i = 0; i < segs; i++) {
                line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1],
                     passes[k].w, passes[k].c);
            }
        }
        return pts;
    }

    /* one flame tongue growing up from a base line */
    function tongue(g, bx, by, h, wid, phase) {
        for (var y = 0; y < h; y += B) {
            var p = y / h;
            var hw = wid * Math.pow(1 - p, 0.62);
            if (hw < 1) break;
            var x = bx + Math.sin(y * 0.32 + phase) * 3.4 * p;
            px(g, x - hw, by - y, hw * 2, B, "#7f1d1d");
            if (hw > 2.5) px(g, x - hw + 2, by - y, (hw - 2) * 2, B, "#ea580c");
            if (hw > 5.5) px(g, x - hw + 5, by - y, (hw - 5) * 2, B, "#fde047");
            if (hw > 9 && p < 0.55) px(g, x - hw + 9, by - y, (hw - 9) * 2, B, "#fffbeb");
        }
    }

    function crystal(g, cx, cy, r) {
        for (var dy = -r; dy <= r; dy += B) {
            var hw = r - Math.abs(dy) * 0.85;
            if (hw < 1) continue;
            px(g, cx - hw, cy + dy, hw * 2, B, "#0c4a6e");
            if (hw > 2) px(g, cx - hw + 2, cy + dy, (hw - 2) * 2, B, "#38bdf8");
            if (hw > 4) px(g, cx - hw + 4, cy + dy, (hw - 4) * 2, B, "#e0f2fe");
        }
    }

    /* ============================================================
       the six effects
       ============================================================ */

    var FX = {};

    FX.LEN = {
        slash: 780, bolt: 900, ice: 1000, fire: 950, wind: 820, hole: 1150
    };

    /* ---------- 1. triple slash ---------- */
    FX.slash = function (g, t, o) {
        var R = o.w * 0.78;
        var Y = ["#fffbeb", "#fef08a", "#facc15", "#a16207"];

        /* thrust, straight in from the hero's side */
        var a = seg(t, 0.00, 0.30);
        if (a > 0 && a < 1) {
            var reach = ease(Math.min(1, a / 0.55)) * o.w * 1.15;
            var tip = o.cx - o.w * 0.95 + reach;
            var fade = a > 0.55 ? 1 - (a - 0.55) / 0.45 : 1;
            for (var i = 0; i < 5; i++) {
                var w = (5 - i) * 2 * fade;
                if (w < 1) continue;
                px(g, tip - i * 9, o.cy - w / 2, 9, w, Y[Math.min(3, i)]);
            }
        }

        /* overhead cut, arcing down through the boss */
        var b = seg(t, 0.28, 0.62);
        if (b > 0 && b < 1) {
            var sweep = 0.5 + ease(b) * 2.1;
            crescent(g, o.cx, o.cy - R * 0.85, R, 0.45, 0.45 + sweep,
                     10 * (1 - b * 0.4), Y);
            if (b > 0.25) crescent(g, o.cx, o.cy - R * 0.85, R, 0.45,
                     0.45 + sweep * 0.55, 4, ["#a16207"]);
        }

        /* side cut, bowing in from the left */
        var c = seg(t, 0.58, 1.0);
        if (c > 0 && c < 1) {
            var sw = 0.3 + ease(c) * 1.5;
            crescent(g, o.cx - o.w * 0.9, o.cy, o.w * 0.95, -0.75, -0.75 + sw,
                     12 * (1 - c * 0.45), Y);
            if (c > 0.25) crescent(g, o.cx - o.w * 0.9, o.cy, o.w * 0.95, -0.75,
                     -0.75 + sw * 0.55, 4, ["#a16207"]);
        }
    };

    /* ---------- 2. thunderstrike ---------- */
    FX.bolt = function (g, t, o) {
        var hitX = o.cx, hitY = o.top + 4;

        /* charge: sparks gather above */
        if (on(t, 0, 0.16)) {
            for (var i = 0; i < 7; i++) {
                var p = seg(t, 0, 0.16);
                var ang = rnd(i) * 6.28, rad = (1 - p) * 26 + 4;
                px(g, hitX + Math.cos(ang) * rad, hitY - 14 + Math.sin(ang) * rad * 0.6,
                   B, B, i % 2 ? "#e9d5ff" : "#c084fc");
            }
        }

        /* the strike itself, redrawn each frame so it crackles */
        if (on(t, 0.14, 0.44)) {
            var f = seg(t, 0.14, 0.44);
            var seed = Math.floor(f * 5) * 17 + 3;
            var pts = bolt(g, hitX + 6, -4, hitX, hitY, seed, 22, [
                { w: 8, c: "#4c1d95" },
                { w: 5, c: "#a855f7" },
                { w: 2, c: "#ffffff" }
            ]);
            /* two forks off the main channel */
            for (var k = 0; k < 2; k++) {
                var s = pts[3 + k * 3];
                bolt(g, s[0], s[1], s[0] + (k ? 20 : -22), s[1] + 20, seed + 40 + k, 10, [
                    { w: 4, c: "#7e22ce" },
                    { w: 2, c: "#f5f3ff" }
                ]);
            }
        }

        /* impact ring on the boss's crown */
        if (on(t, 0.22, 0.5)) {
            var q = seg(t, 0.22, 0.5);
            var rr = 6 + ease(q) * 30;
            crescent(g, hitX, hitY + 2, rr, -3.14, 0, 5 * (1 - q),
                     ["#ffffff", "#d8b4fe", "#7e22ce"]);
        }

        /* the x-ray: bones show through while it conducts */
        if (on(t, 0.4, 0.82)) {
            var s2 = seg(t, 0.4, 0.82);
            var flick = Math.sin(t * 90) > -0.35;
            if (flick) skull(g, o, 1 - s2 * 0.3);
            /* two arcs crawling round the outside, clear of the skull */
            for (var j = 0; j < 2; j++) {
                var yy = j ? o.bottom - 4 : o.top + 4;
                var ph = Math.floor(t * 20) + j * 7;
                bolt(g, o.cx - o.w * 0.55, yy, o.cx + o.w * 0.55, yy + (j ? -4 : 4), ph, 8, [
                    { w: 3, c: "#a855f7" }, { w: 1, c: "#ffffff" }
                ]);
            }
        }
    };

    /* a skull drawn to fit the boss box — no sprite needed, so it works for
       a slime and a knight alike */
    var SKULL = [
        "...#####...",
        "..#######..",
        ".#########.",
        ".#########.",
        ".#ooo#ooo#.",
        ".#ooo#ooo#.",
        ".#########.",
        "..###o###..",
        "..#######..",
        "...#####...",
        "..#o#o#o#..",
        "..#######.."
    ];

    function skull(g, o, a) {
        var sc = Math.max(B, Math.round((o.w * 0.66 / 11) / B) * B);
        var w = 11 * sc, h = 12 * sc;
        var x = o.cx - w / 2, y = o.cy - h * 0.52;
        var bone = a > 0.7 ? "#f8fafc" : "#cbd5e1";
        for (var r = 0; r < 12; r++) {
            for (var c = 0; c < 11; c++) {
                var ch = SKULL[r][c];
                if (ch === ".") continue;
                px(g, x + c * sc, y + r * sc, sc, sc, ch === "#" ? bone : "#1e1b4b");
            }
        }
    }

    /* ---------- 3. frostbind ---------- */
    FX.ice = function (g, t, o) {
        /* three crystals fly in */
        for (var i = 0; i < 3; i++) {
            var a = seg(t, 0.02 + i * 0.06, 0.30 + i * 0.06);
            if (a <= 0 || a >= 1) continue;
            var x0 = o.cx - o.w * 1.9, y0 = o.cy + (i - 1) * o.w * 0.45;
            var x = x0 + (o.cx - x0) * ease(a);
            var y = y0 + (o.cy - y0) * ease(a);
            crystal(g, x, y, 9);
            for (var k = 1; k < 5; k++) {                 /* trail */
                px(g, x - k * 9, y - 1, 6, B, k < 3 ? "#7dd3fc" : "#0369a1");
            }
        }

        /* the block: a lattice, so the boss still reads through it */
        var b = seg(t, 0.26, 0.78);
        if (b > 0 && b < 1) {
            var grow = ease(Math.min(1, b / 0.25));
            var w = o.w * 0.92 * grow, h = (o.bottom - o.top) * 1.02 * grow;
            var x = o.cx - w / 2, y = o.bottom - h;
            for (var yy = 0; yy < h; yy += B * 2) {
                for (var xx = 0; xx < w; xx += B * 2) {
                    if (((xx / B) + (yy / B)) % 3 !== 0) continue;   /* mostly holes */
                    var edge = xx < B * 2 || yy < B * 2 || xx > w - B * 3 || yy > h - B * 3;
                    px(g, x + xx, y + yy, B, B, edge ? "#e0f2fe" : "#7dd3fc");
                }
            }
            /* rim and highlight */
            px(g, x, y, w, B, "#e0f2fe");
            px(g, x, y, B, h, "#e0f2fe");
            px(g, x + w * 0.18, y + h * 0.1, B, h * 0.5, "#ffffff");
            /* spikes on top */
            for (var s = 0; s < 4; s++) crystal(g, x + w * (0.16 + s * 0.23), y - 4, 7);

            /* cracks before it goes */
            if (b > 0.72) {
                var c = seg(b, 0.72, 1);
                bolt(g, x + w * 0.5, y, x + w * 0.34, y + h, 11, 10 * c,
                     [{ w: 2, c: "#0c4a6e" }]);
                bolt(g, x + w * 0.5, y + h * 0.4, x + w * 0.92, y + h * 0.75, 19, 8 * c,
                     [{ w: 2, c: "#0c4a6e" }]);
            }
        }

        /* shatter */
        var d = seg(t, 0.76, 1);
        if (d > 0 && d < 1) {
            for (var m = 0; m < 12; m++) {
                var ang = rnd(m) * 6.28, sp = 20 + rnd(m + 40) * 34;
                px(g, o.cx + Math.cos(ang) * sp * d,
                      o.cy + Math.sin(ang) * sp * d - d * 8,
                      B * 2, B * 2, m % 3 ? "#7dd3fc" : "#e0f2fe");
            }
        }
    };

    /* ---------- 4. pyre ---------- */
    FX.fire = function (g, t, o) {
        var base = o.bottom;
        var rise = seg(t, 0.08, 0.52);
        var fall = seg(t, 0.58, 0.9);
        var H = (o.bottom - o.top) * 1.5;

        if (rise > 0) {
            var h = H * ease(rise) * (1 - fall * 0.92);
            if (h > 4) {
                var flick = Math.floor(t * 26);
                tongue(g, o.cx - o.w * 0.26, base, h * 0.72, o.w * 0.16, flick * 1.1);
                tongue(g, o.cx + o.w * 0.26, base, h * 0.66, o.w * 0.15, flick * 1.3 + 2);
                tongue(g, o.cx, base, h, o.w * 0.30, flick * 0.9 + 4);
            }
        }

        /* the ring of fire it stands in */
        if (on(t, 0.02, 0.95)) {
            var w = o.w * (0.5 + Math.min(1, t * 3) * 0.62);
            for (var i = -w; i < w; i += B * 2) {
                var hh = 4 + Math.abs(Math.sin(i * 0.3 + t * 30)) * 7;
                px(g, o.cx + i, base - hh, B * 2, hh, "#ea580c");
                px(g, o.cx + i, base - hh * 0.45, B * 2, hh * 0.45, "#fde047");
            }
        }

        /* embers going up as it dies down */
        var e = seg(t, 0.45, 1);
        if (e > 0) {
            for (var k = 0; k < 10; k++) {
                var sx = o.cx + (rnd(k) - 0.5) * o.w * 1.2;
                var sy = base - ((e * 1.2 + rnd(k + 9)) % 1) * H * 1.1;
                px(g, sx, sy, B, B, k % 3 ? "#fb923c" : "#fef08a");
            }
        }
    };

    /* ---------- 5. galecut ---------- */
    FX.wind = function (g, t, o) {
        var G = ["#ffffff", "#d1fae5", "#34d399", "#065f46"];
        for (var i = 0; i < 3; i++) {
            var a = seg(t, i * 0.16, 0.55 + i * 0.16);
            if (a <= 0 || a >= 1) continue;
            var y = o.cy + (i - 1) * o.w * 0.34;
            var x = o.cx - o.w * 1.5 + ease(a) * o.w * 3;
            var tilt = (i - 1) * 0.3;
            crescent(g, x, y, o.w * 0.6, -1.0 + tilt, 1.0 + tilt,
                     14 * (1 - a * 0.35), G);
            for (var k = 0; k < 3; k++) {          /* the wake, joined to the blade */
                px(g, x - o.w * 0.62 - k * 13, y - B + (i - 1) * 3,
                   11 - k * 3, B, k ? "#065f46" : "#a7f3d0");
            }
        }
        /* cuts left on the body */
        var c = seg(t, 0.35, 0.95);
        if (c > 0 && c < 1) {
            for (var j = 0; j < 3; j++) {
                var yy = o.cy + (j - 1) * o.w * 0.34;
                line(g, o.cx - o.w * 0.3, yy + 8, o.cx + o.w * 0.3, yy - 8,
                     B, j % 2 ? "#ffffff" : "#a7f3d0");
            }
        }
    };

    /* ---------- 6. singularity ---------- */
    FX.hole = function (g, t, o) {
        var hx = o.cx - o.w * 0.5, hy = o.cy;
        var open = seg(t, 0.0, 0.20);
        var shut = seg(t, 0.66, 0.82);
        var r = ease(open) * (1 - ease(shut)) * o.w * 0.62;

        if (r > 1) {
            /* jets first, so the disc sits on top of them */
            var jl = r * 1.35;
            line(g, hx - jl, hy - jl * 0.5, hx + jl, hy + jl * 0.5, B * 2, "#f59e0b");
            line(g, hx - jl, hy - jl * 0.5, hx + jl, hy + jl * 0.5, B, "#fffbeb");
            line(g, hx - jl * 0.85, hy + jl * 0.45, hx + jl * 0.85, hy - jl * 0.45, B * 2, "#b45309");
            line(g, hx - jl * 0.85, hy + jl * 0.45, hx + jl * 0.85, hy - jl * 0.45, B, "#fde68a");

            disc(g, hx, hy, r, r * 0.42, -0.55, [
                { r: 1.00, c: "#2e1065" },
                { r: 0.88, c: "#6b21a8" },
                { r: 0.74, c: "#7f1d1d" },
                { r: 0.60, c: "#c2410c" },
                { r: 0.46, c: "#f97316" },
                { r: 0.34, c: "#fbbf24" },
                { r: 0.22, c: "#000000" }
            ]);

            /* matter spiralling in */
            for (var i = 0; i < 9; i++) {
                var ph = (t * 2.2 + rnd(i)) % 1;
                var rr = r * (2.4 - ph * 2.1);
                var an = rnd(i + 30) * 6.28 + ph * 5;
                var dyv = Math.sin(an) * rr * 0.42;
                px(g, hx + Math.cos(an) * rr + dyv * -0.55, hy + dyv,
                   B, B, i % 2 ? "#fbbf24" : "#c084fc");
            }
        }

        /* collapse burst */
        var bst = seg(t, 0.74, 1);
        if (bst > 0 && bst < 1) {
            var br = 4 + ease(bst) * o.w * 0.85;
            crescent(g, hx, hy, br, 0, 6.28, 10 * (1 - bst),
                     ["#ffffff", "#fde68a", "#f97316", "#7f1d1d"], true);
        }
    };

    /* ============================================================
       what the boss does while each effect plays
       ------------------------------------------------------------
       Returned as an offset/scale/tint so the arena keeps drawing the
       boss sprite itself and nothing here needs to know which boss it is.
       ============================================================ */

    FX.boss = function (name, t) {
        var r = { dx: 0, dy: 0, s: 1, tint: null, alpha: 1 };
        var q;
        if (name === "slash") {
            [0.10, 0.42, 0.74].forEach(function (at) {
                if (on(t, at, at + 0.10)) {
                    r.dx += Math.sin((t - at) * 210) * 5;
                    r.tint = "#ffffff";
                }
            });
        } else if (name === "bolt") {
            if (on(t, 0.14, 0.30)) r.tint = "#ffffff";
            if (on(t, 0.3, 0.82)) {
                r.dx = Math.sin(t * 150) * 3;
                r.tint = Math.sin(t * 90) > -0.35 ? "#312e81" : "#a855f7";
            }
        } else if (name === "ice") {
            if (on(t, 0.26, 0.80)) { r.tint = "#075985"; r.dy = 0; }
            if (on(t, 0.76, 0.92)) r.dx = Math.sin(t * 200) * 4;
        } else if (name === "fire") {
            q = seg(t, 0.35, 0.62);
            if (q > 0) r.tint = "#1c1917";
            if (on(t, 0.86, 1)) r.tint = "#44403c";
            r.dx = on(t, 0.1, 0.6) ? Math.sin(t * 130) * 3 : 0;
        } else if (name === "wind") {
            q = seg(t, 0.25, 0.7);
            r.dx = ease(q) * 9 * (1 - seg(t, 0.7, 1));
            if (on(t, 0.25, 0.6)) r.tint = "#ffffff";
        } else if (name === "hole") {
            var pull = seg(t, 0.22, 0.62);
            var back = seg(t, 0.78, 1);
            r.s = 1 - ease(pull) * 0.85 + ease(back) * 0.85;
            r.dx = -ease(pull) * 30 + ease(back) * 30;
            r.dy = -Math.sin(ease(pull) * 3.14) * 6;
            if (pull > 0.15 && back < 0.2) r.tint = "#4c1d95";
            if (back > 0 && back < 0.45) r.tint = "#ffffff";
            if (pull >= 1 && back <= 0) r.alpha = 0;
        }
        return r;
    };

    /* how many separate blows a skill lands, and when in the animation each
       one connects. The numbers they add up to never change; only the
       number of pieces the student sees them arrive in. */
    FX.HITS = {
        slash: [0.12, 0.44, 0.76],
        wind:  [0.20, 0.36, 0.54],
        bolt:  [0.30], ice: [0.80], fire: [0.42], hole: [0.82]
    };

    FX.play = function (g, name, t, o) { if (FX[name]) FX[name](g, t, o); };

    /* ------------------------------------------------------------
       boss gear — drawn over whichever sprite is standing there, so a
       tougher boss needs no new art. Anchored on o.top, which the arena
       sets to the top of the creature rather than the top of its box.
       ------------------------------------------------------------ */
    FX.gear = function (g, tier, o, now) {
        if (!tier) return;
        var w = o.w, h = o.bottom - o.top;
        var steel = "#94a3b8", lite = "#e2e8f0", dark = "#475569";
        var gold = tier >= 3 ? "#fbbf24" : null;
        var i, k;

        if (tier >= 1) {                       /* helm band, above the eyes */
            var hy = o.top + h * 0.01;
            var bh = Math.max(B * 2, h * 0.08);
            px(g, o.cx - w * 0.28, hy, w * 0.56, bh, gold || steel);
            px(g, o.cx - w * 0.28, hy, w * 0.56, B, gold ? "#fef3c7" : lite);
            px(g, o.cx - w * 0.28, hy + bh - B, w * 0.56, B, gold ? "#b45309" : dark);
            /* a short wedge crest, not a needle */
            for (i = 0; i < 3; i++) {
                var cw = (3 - i) * B * 2;
                px(g, o.cx - cw / 2, hy - (i + 1) * B * 2, cw, B * 2,
                   i ? (gold || steel) : (gold ? "#fef3c7" : lite));
            }
        }
        if (tier >= 2) {                       /* shoulder plates */
            var py = o.top + h * 0.24;
            var ph = Math.max(B * 2, h * 0.13);
            for (k = -1; k <= 1; k += 2) {
                var sx = o.cx + k * w * 0.40 - w * 0.10;
                px(g, sx, py, w * 0.20, ph, gold || steel);
                px(g, sx, py, w * 0.20, B, gold ? "#fef3c7" : lite);
                px(g, sx, py + ph - B, w * 0.20, B, gold ? "#b45309" : dark);
            }
        }
        if (tier >= 3) {                       /* spines down the back, and motes */
            for (k = 0; k < 3; k++) {
                var bx = o.cx + w * (0.30 + k * 0.05);
                var by = o.top + h * (0.40 + k * 0.16);
                for (i = 0; i < 5; i++) {
                    px(g, bx + i * B, by - i * B * 1.5, B * 2, B * 3,
                       i < 3 ? "#fbbf24" : "#b45309");
                }
            }
            for (k = 0; k < 2; k++) {
                var a = now / 420 + k * 3.14;
                px(g, o.cx + Math.cos(a) * w * 0.52 - B,
                      o.cy + Math.sin(a) * h * 0.30 - B, B * 2, B * 2,
                   k ? "#fde68a" : "#fbbf24");
            }
        }
    };

    root.MCF_FX = FX;
})(typeof window !== "undefined" ? window : globalThis);
