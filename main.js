/* 3D hub, panes, flip cards, lightbox, cursor effects */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s),
    $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches,
    fine = matchMedia("(pointer: fine)").matches,
  isMobile = matchMedia("(max-width: 860px), (pointer: coarse)").matches;
  const mk = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    document.body.appendChild(e);
    return e;
  };
  const LD = window.__ld || {
    step() {},
    then(f) {
      f();
    },
  };

  /* ---------- reveal ---------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("vis");
          io.unobserve(e.target);
          setTimeout(() => e.target.classList.remove("rv"), 1000);
        }),
      { threshold: 0.06 },
    );
    $$(".rv").forEach((e) => io.observe(e));
  } else $$(".rv").forEach((e) => e.classList.add("vis"));

  /* ---------- footers ---------- */
  const ft = $("#ftpl");
  $$(".pane").forEach((p) => p.appendChild(ft.content.cloneNode(true)));

  /* ---------- flip (cards, photo, projects) ---------- */
  $$(".flip").forEach((f) => {
    $$(".face", f).forEach((face) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "flipbtn";
      b.innerHTML = face.classList.contains("front")
        ? "<span>↻</span>Tap to flip"
        : "<span>↻</span>Back";
      b.setAttribute(
        "aria-label",
        face.classList.contains("front")
          ? "Flip card to see details"
          : "Flip card back",
      );
      face.appendChild(b);
    });
  });
  function flip(f) {
    if (f._b) return;
    f._b = 1;
    f.classList.add("seen");
    const fl = $(".fl", f);
    if (reduce) {
      f.classList.toggle("on");
      f._b = 0;
      return;
    }
    fl.style.transition = "transform .22s ease-in";
    fl.style.transform = "perspective(900px) rotateY(90deg)";
    setTimeout(() => {
      f.classList.toggle("on");
      fl.style.transition = "none";
      fl.style.transform = "perspective(900px) rotateY(-90deg)";
      void fl.offsetWidth;
      fl.style.transition = "transform .32s ease-out";
      fl.style.transform = "perspective(900px) rotateY(0deg)";
      setTimeout(() => {
        fl.style.cssText = "";
        f._b = 0;
      }, 340);
    }, 220);
  }
  document.addEventListener("click", (e) => {
    const f = e.target.closest(".flip");
    if (
      f &&
      (e.target.closest(".flipbtn") ||
        !e.target.closest("a,button,[data-lightbox]"))
    )
      flip(f);
  });
  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.classList &&
      e.target.classList.contains("flip")
    ) {
      e.preventDefault();
      flip(e.target);
    }
  });

  /* ---------- lightbox ---------- */
  const lb = mk("div", "", "<img alt=''><p></p>");
  lb.id = "lb";
  document.addEventListener("click", (e) => {
    const p = e.target.closest("[data-lightbox]");
    if (p) {
      $("img", lb).src = p.getAttribute("data-lightbox");
      $("p", lb).textContent = p.getAttribute("data-cap") || "";
      lb.classList.add("on");
    } else if (e.target.closest("#lb")) lb.classList.remove("on");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      lb.classList.contains("on")
        ? lb.classList.remove("on")
        : closePane();
  });

  /* ---------- cursor ---------- */
  let cx = -100,
    cy = -100,
    rx = -100,
    ry = -100,
    cd,
    cr,
    crTxt;
  if (fine) {
    document.documentElement.classList.add("has-cur");
    cd = mk(
      "div",
      "cd off",
      '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b8dfd"/><stop offset="1" stop-color="#0d9488"/></linearGradient></defs><g stroke="url(#cg)" stroke-width="2"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.8L12 6.3l2.5-2.5M9.5 20.2L12 17.7l2.5 2.5" stroke-width="1.4"/></g></svg>',
    );
    cr = mk("div", "cr off", "<span></span>");
    crTxt = cr.firstChild;
    (function tick() {
      rx += (cx - rx) * 0.16;
      ry += (cy - ry) * 0.16;
      cd.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      cr.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      requestAnimationFrame(tick);
    })();
    document.documentElement.addEventListener("pointerleave", () => {
      cd.classList.add("off");
      cr.classList.add("off");
    });
    document.documentElement.addEventListener("pointerenter", () => {
      cd.classList.remove("off");
      cr.classList.remove("off");
    });
  }
  function setCursor(hov, text) {
    if (!cd) return;
    cd.classList.toggle("hov", hov);
    cr.classList.toggle("hov", hov);
    cr.classList.toggle("has", !!text);
    if (text) crTxt.textContent = text;
  }

  /* ---------- hover FX ---------- */
  let lastC = null,
    lastM = null;
  function domFx(e) {
    const t = e.target;
    if (!t.closest) return;
    const c = t.closest(".card,.tile,.badge");
    if (lastC && lastC !== c) lastC.style.transform = "";
    if (c) {
      const r = c.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
      c.style.setProperty("--mx", x + "px");
      c.style.setProperty("--my", y + "px");
      if (
        !reduce &&
        c.matches(".tile,.badge") &&
        !c.classList.contains("rv")
      )
        c.style.transform =
          "perspective(800px) rotateX(" +
          -(y / r.height - 0.5) * 5 +
          "deg) rotateY(" +
          (x / r.width - 0.5) * 6 +
          "deg)";
    }
    lastC = c;
    const m = t.closest(".btn,.hubbtn,.view,.links a,.more a");
    if (lastM && lastM !== m) lastM.style.transform = "";
    if (m && !reduce) {
      const q = m.getBoundingClientRect();
      m.style.transform =
        "translate(" +
        (e.clientX - q.left - q.width / 2) * 0.22 +
        "px," +
        (e.clientY - q.top - q.height / 2) * 0.3 +
        "px)";
    }
    lastM = m;
    const el = t.closest("a,button,[data-lightbox],.tile,.flip");
    const txt = t.closest("[data-lightbox]")
      ? "zoom"
      : t.closest(".flipbtn") || (t.closest(".flip") && !t.closest("a"))
        ? "flip"
        : t.closest("a,button")
          ? "open"
          : "";
    if (t.id !== "gl") setCursor(!!el, txt);
  }

  /* ---------- click FX ---------- */
  const FS =
    "precision mediump float;uniform vec2 uR;uniform vec2 uC;uniform float uT;" +
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
    "void main(){vec2 p=gl_FragCoord.xy;float d=distance(p,uC);float R=uT*max(uR.x,uR.y)*.55;float fd=1.-uT;" +
    "float ring=exp(-abs(d-R)*.06)*fd;vec2 cell=floor(p/16.);vec2 f=fract(p/16.);" +
    "float box=step(.14,f.x)*step(f.x,.86)*step(.14,f.y)*step(f.y,.86);" +
    "float band=smoothstep(R-190.,R,d)*step(d,R+4.);" +
    "float on=step(.55,h(cell+floor(uT*9.)))*band*box*fd;" +
    "vec3 c1=vec3(.23,.36,.99);vec3 c2=vec3(.05,.58,.53);vec3 col=mix(c1,c2,h(cell));" +
    "float a=clamp(ring*.9+on*.75,0.,1.);vec3 rgb=mix(c1,col,on/(on+ring+.001));gl_FragColor=vec4(rgb*a,a);}";
  const ripple = (() => {
    try {
      return null;
      const c = mk("canvas");
      c.id = "fx";
      const g = c.getContext("webgl", { premultipliedAlpha: true });
      if (!g) return null;
      const sh = (t, s) => {
        const o = g.createShader(t);
        g.shaderSource(o, s);
        g.compileShader(o);
        return o;
      };
      const p = g.createProgram();
      g.attachShader(
        p,
        sh(
          g.VERTEX_SHADER,
          "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}",
        ),
      );
      g.attachShader(p, sh(g.FRAGMENT_SHADER, FS));
      g.linkProgram(p);
      g.useProgram(p);
      g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
      g.bufferData(
        g.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        g.STATIC_DRAW,
      );
      const l = g.getAttribLocation(p, "a");
      g.enableVertexAttribArray(l);
      g.vertexAttribPointer(l, 2, g.FLOAT, false, 0, 0);
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      g.clearColor(0, 0, 0, 0);
      const uR = g.getUniformLocation(p, "uR"),
        uC = g.getUniformLocation(p, "uC"),
        uT = g.getUniformLocation(p, "uT");
      const size = () => {
        c.width = innerWidth;
        c.height = innerHeight;
        g.viewport(0, 0, c.width, c.height);
      };
      size();
      addEventListener("resize", size);
      let run = 0;
      return (x, y) => {
        const t0 = performance.now();
        run = t0;
        (function f() {
          if (run !== t0) return;
          const t = (performance.now() - t0) / 950;
          g.clear(g.COLOR_BUFFER_BIT);
          if (t >= 1) return;
          g.uniform2f(uR, c.width, c.height);
          g.uniform2f(uC, x, c.height - y);
          g.uniform1f(uT, t);
          g.drawArrays(g.TRIANGLES, 0, 3);
          requestAnimationFrame(f);
        })();
      };
    } catch (err) {
      return null;
    }
  })();
  const GLY = ["❄", "❅", "❆"];
  let trT = 0;
  function trail(x, y) {
    if (reduce || !fine) return;
    const n = performance.now();
    if (n - trT < 50) return;
    trT = n;
    const s = mk("span", "bt", "❄"),
      dx = Math.random() * 36 - 18;
    s.style.fontSize = 8 + Math.random() * 9 + "px";
    s.style.color = "#7aa8e6";
    s.animate(
      [
        {
          transform: "translate(" + x + "px," + y + "px) rotate(0)",
          opacity: 0.95,
        },
        {
          transform:
            "translate(" +
            (x + dx) +
            "px," +
            (y + 34 + Math.random() * 20) +
            "px) rotate(160deg)",
          opacity: 0,
        },
      ],
      { duration: 900, easing: "ease-out" },
    ).onfinish = () => s.remove();
  }
  function burst(x, y) {
    if (reduce) return;
    for (let i = 0; i < (isMobile ? 10 : 28); i++) {
      const s = mk("span", "bt", GLY[(Math.random() * GLY.length) | 0]);
      s.style.color = i % 3 ? "#ffffff" : "#bfe0ff";
      s.style.fontSize = 9 + Math.random() * 14 + "px";
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4,
        d = 30 + Math.random() * 80,
        ux = x + Math.cos(a) * d,
        uy = y + Math.sin(a) * d,
        fx = ux + Math.random() * 80 - 40,
        fy = uy + 90 + Math.random() * 130;
      s.animate(
        [
          {
            transform:
              "translate(" + x + "px," + y + "px) scale(.4) rotate(0deg)",
            opacity: 1,
          },
          {
            transform:
              "translate(" +
              ux +
              "px," +
              uy +
              "px) scale(1) rotate(" +
              Math.random() * 120 +
              "deg)",
            opacity: 1,
            offset: 0.35,
          },
          {
            transform:
              "translate(" +
              fx +
              "px," +
              fy +
              "px) scale(.8) rotate(" +
              Math.random() * 360 +
              "deg)",
            opacity: 0,
          },
        ],
        {
          duration: 1300 + Math.random() * 900,
          easing: "cubic-bezier(.2,.7,.4,1)",
        },
      ).onfinish = () => s.remove();
    }
  }
  addEventListener("pointerdown", (e) => {
    if (cr) cr.classList.add("down");
    burst(e.clientX, e.clientY);
  });
  addEventListener("pointerup", () => {
    if (cr) cr.classList.remove("down");
  });
  addEventListener("pointermove", (e) => {
    cx = e.clientX;
    cy = e.clientY;
    trail(cx, cy);
    if (cd) {
      if (rx < 0) {
        rx = cx;
        ry = cy;
      }
      cd.classList.remove("off");
      cr.classList.remove("off");
    }
    domFx(e);
  });

  /* ---------- panes (single page navigation) ---------- */
  const view = $("#view"),
    PAGES = [
      "home",
      "about",
      "experience",
      "skills",
      "projects",
      "contact",
    ];
  let cur = null,
    moving = false,
    paused = false,
    flyTo = (id, cb) => cb(),
    flyBack = () => {},
    wake = () => {};
  function showPane(id) {
    cur = id;
    paused = false;
    $$(".dock button").forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-go") === id),
    );
    $$(".pane").forEach((p) =>
      p.classList.toggle("on", p.id === "p-" + id),
    );
    document.body.classList.add("paned");
    view.classList.add("on");
    view.scrollTop = 0;
  }
  function openPane(id, push) {
    if (PAGES.indexOf(id) < 0 || moving || cur === id) return;
    if (push !== false) {
      try {
        history.pushState({ p: id }, "", "#" + id);
      } catch (e) {}
    }
    if (cur) {
      paused = false;
      wake();
      flyTo(id, () => {});
      showPane(id);
      return;
    }
    moving = true;
    flyTo(id, () => {
      showPane(id);
      moving = false;
    });
  }
  function closePane(push) {
    if (!cur) return;
    cur = null;
    paused = false;
    wake();
    $$(".dock button").forEach((b) => b.classList.remove("on"));
    document.body.classList.remove("paned");
    view.classList.remove("on");
    setTimeout(() => {
      if (!cur) $$(".pane").forEach((p) => p.classList.remove("on"));
    }, 480);
    flyBack();
    if (push !== false && location.hash) {
      try {
        history.pushState(null, "", location.pathname + location.search);
      } catch (e) {}
    }
  }
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]");
    if (g) {
      e.preventDefault();
      openPane(g.getAttribute("data-go"));
      return;
    }
    if (e.target.closest("[data-close]")) closePane();
  });
  addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    PAGES.indexOf(id) > -1 ? openPane(id, false) : closePane(false);
  });

  /* ---------- 3D hub ---------- */
  const T = window.THREE,
    cv = $("#gl");
  let R = null;
  try {
    if (T)
      R = new T.WebGLRenderer({
        canvas: cv,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
  } catch (err) {
    R = null;
  }
  if (!R) {
    document.body.classList.add("no3d");
    LD.step(3);
    LD.then(() => {
      const h = location.hash.slice(1);
      if (PAGES.indexOf(h) > -1) openPane(h, false);
    });
    return;
  }
  LD.step(1);
  let dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
  R.setPixelRatio(dpr);
  R.setSize(innerWidth, innerHeight, false);
  R.setClearColor(0xf4f7fc, 0);
  R.outputEncoding = T.sRGBEncoding;
  R.toneMapping = T.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.2;
  R.shadowMap.enabled = true;
  R.shadowMap.type = T.PCFSoftShadowMap;
  const sc = new T.Scene();
  sc.fog = new T.FogExp2(0x0d1838, 0.0017);
  const cam = new T.PerspectiveCamera(
    55,
    innerWidth / innerHeight,
    1,
    1600,
  );
  const BLUE = 0x3b5bfd,
    TEAL = 0x0d9488,
    VIO = 0x4f46e5;

  /* ---------- realistic lighting + environment ---------- */
  const C = (h) => new T.Color(h).convertSRGBToLinear();
  sc.environment = (() => {
    const pm = new T.PMREMGenerator(R),
      e = new T.Scene();
    const g = new T.SphereGeometry(60, 32, 16),
      p = g.attributes.position,
      col = new Float32Array(p.count * 3);
    const top = new T.Color(0x1b2a55),
      mid = new T.Color(0x0f1836),
      bot = new T.Color(0x070b1c),
      c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 60;
      c.copy(mid).lerp(y > 0 ? top : bot, Math.abs(y));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new T.BufferAttribute(col, 3));
    e.add(
      new T.Mesh(
        g,
        new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide }),
      ),
    );
    [
      [0, 34, 14, 36, 16, 0xaec6ff, 2.2],
      [-36, 8, 14, 10, 26, 0x6f8fe8, 1.6],
      [36, 6, -12, 10, 24, 0x34e0c4, 1.1],
      [0, -4, 40, 40, 6, 0x8fb0ff, 0.8],
      [-20, 22, -30, 30, 6, 0xaec6ff, 1.2],
    ].forEach((l) => {
      const m = new T.Mesh(
        new T.PlaneGeometry(l[3], l[4]),
        new T.MeshBasicMaterial({
          color: new T.Color(l[5]).multiplyScalar(l[6]),
          side: T.DoubleSide,
        }),
      );
      m.position.set(l[0], l[1], l[2]);
      m.lookAt(0, 0, 0);
      e.add(m);
    });
    const t = pm.fromScene(e, 0.02).texture;
    pm.dispose();
    return t;
  })();
  sc.add(new T.HemisphereLight(0x7f9be0, 0x1a2447, 0.75));
  sc.add(new T.AmbientLight(0x3a4d90, 0.45));
  const key = new T.DirectionalLight(0xb4ccff, 1.5);
  key.position.set(-34, 46, 34);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1536 : 3072, isMobile ? 1536 : 3072);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 5;
  Object.assign(key.shadow.camera, {
    left: -112,
    right: 112,
    top: 112,
    bottom: -112,
    near: 1,
    far: 330,
  });
  sc.add(key);
  const uM = { value: new T.Vector2(9, 9) },
    uAsp = { value: innerWidth / innerHeight };
  const rim = new T.DirectionalLight(0x6f8fe8, 0.7);
  rim.position.set(-9, 4, -8);
  sc.add(rim);
  const tealL = new T.PointLight(0x2dd4bf, 0, 40);
  tealL.position.set(10, -4, 6);
  sc.add(tealL);

  /* ---------- diorama city (morning) ---------- */
  const LAMPS = [],
    bgU = [],
    debris = [],
    bgRings = [],
    tokG = new T.Group();
  const CITY = (function () {
    const cn = (w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    };
    const rn = (a, b) => a + Math.random() * (b - a);
    const tx = (c) => {
      const t = new T.CanvasTexture(c);
      t.encoding = T.sRGBEncoding;
      t.anisotropy = 8;
      t.wrapS = t.wrapT = T.RepeatWrapping;
      return t;
    };
    const std = (c, o) =>
      new T.MeshStandardMaterial(
        Object.assign({ color: c, roughness: 0.85 }, o || {}),
      );
    const roof = std(0xf3f6fa, { roughness: 0.9 }),
      cream = std(0xe9eef4),
      dk = std(0x2a3040, { roughness: 0.5, metalness: 0.3 }),
      conc = std(0xc9cfdc, { roughness: 0.95 }),
      orange = std(0xff9f1c, { roughness: 0.5 }),
      white = std(0xf4f6fa, { roughness: 0.5 });
    /* one facade "bay" tile: wall, framed glass window, slab edge, optional brick / balcony rail */
    function fac(base, dark, brick, bal) {
      const c = cn(128, 128),
        x = c.getContext("2d");
      x.fillStyle = base;
      x.fillRect(0, 0, 128, 128);
      if (brick) {
        x.strokeStyle = dark;
        x.globalAlpha = 0.22;
        for (let y = 0; y < 128; y += 8) {
          x.beginPath();
          x.moveTo(0, y);
          x.lineTo(128, y);
          x.stroke();
          for (let xx = ((y / 8) % 2) * 8; xx < 128; xx += 16) {
            x.beginPath();
            x.moveTo(xx, y);
            x.lineTo(xx, y + 8);
            x.stroke();
          }
        }
        x.globalAlpha = 1;
      }
      for (let i = 0; i < 600; i++) {
        x.fillStyle = "rgba(0,0,0," + Math.random() * 0.07 + ")";
        x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
      }
      x.fillStyle = "rgba(255,255,255,.2)";
      x.fillRect(0, 110, 128, 6);
      x.fillStyle = "rgba(0,0,0,.28)";
      x.fillRect(0, 116, 128, 12);
      x.fillStyle = dark;
      x.fillRect(26, 18, 76, 76);
      const g = x.createLinearGradient(30, 22, 98, 90);
      g.addColorStop(0, "#c5dcee");
      g.addColorStop(0.5, "#6f93b5");
      g.addColorStop(1, "#a9c4dc");
      x.fillStyle = g;
      x.fillRect(31, 23, 66, 66);
      x.fillStyle = "rgba(255,255,255,.3)";
      x.beginPath();
      x.moveTo(31, 23);
      x.lineTo(64, 23);
      x.lineTo(31, 66);
      x.fill();
      x.fillStyle = dark;
      x.fillRect(63, 23, 2, 66);
      x.fillRect(31, 54, 66, 2);
      x.fillStyle = "rgba(255,255,255,.6)";
      x.fillRect(24, 94, 80, 4);
      x.fillStyle = "rgba(0,0,0,.3)";
      x.fillRect(26, 18, 76, 4);
      if (bal) {
        x.fillStyle = "rgba(255,255,255,.35)";
        x.fillRect(18, 98, 92, 12);
        x.strokeStyle = "rgba(40,40,40,.7)";
        for (let i = 20; i < 110; i += 6) {
          x.beginPath();
          x.moveTo(i, 98);
          x.lineTo(i, 110);
          x.stroke();
        }
      }
      return c;
    }
    const VAR = [
      ["#b4492f", "#3b1a12", 1, 0],
      ["#8f8c3c", "#3a3815", 0, 1],
      ["#e6a883", "#6a3a24", 0, 0],
      ["#ece5d3", "#5a5a62", 0, 0],
      ["#dcc260", "#5b4a1a", 0, 1],
      ["#aab7c7", "#2a3342", 0, 0],
      ["#8e3b29", "#2d130e", 1, 0],
      ["#4a78b8", "#1b2c4f", 0, 0],
    ];
    const WC = [
      ["#ffe9a8", "#ffb347"],
      ["#ffd27a", "#ff9a3c"],
      ["#e6f0ff", "#ffd9a0"],
    ];
    function winC(k) {
      const c = cn(128, 128),
        x = c.getContext("2d");
      x.fillStyle = "#000";
      x.fillRect(0, 0, 128, 128);
      const g = x.createLinearGradient(31, 23, 97, 89);
      g.addColorStop(0, WC[k][0]);
      g.addColorStop(1, WC[k][1]);
      x.fillStyle = g;
      x.fillRect(31, 23, 66, 66);
      x.fillStyle = "#000";
      x.fillRect(63, 23, 2, 66);
      x.fillRect(31, 54, 66, 2);
      return c;
    }
    const WT = [0, 1, 2].map((k) => tx(winC(k)));
    const FM = VAR.map((v, vi) => {
      const t = tx(fac(v[0], v[1], v[2], v[3]));
      return new T.MeshStandardMaterial({
        map: t,
        bumpMap: t,
        bumpScale: 1.2,
        roughness: 0.8,
        emissive: 0xffffff,
        emissiveMap: WT[vi % 3],
        emissiveIntensity: 1.5,
      });
    });
    const AG = new T.BoxGeometry(1, 1, 1),
      acM = std(0xcfd3da);
    const bo = (P, w, h, d, x, y, z, m) => {
      const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
      o.position.set(x, y + h / 2, z);
      o.castShadow = o.receiveShadow = true;
      P.add(o);
      return o;
    };
    const cy = (P, a, b, h, x, y, z, m, s) => {
      const o = new T.Mesh(new T.CylinderGeometry(a, b, h, s || 24), m);
      o.position.set(x, y + h / 2, z);
      o.castShadow = true;
      P.add(o);
      return o;
    };
    function bld(P, w, h, d, x, y0, z, vi, ac) {
      const g = new T.BoxGeometry(w, h, d),
        uv = g.attributes.uv,
        fl = Math.max(1, Math.round(h / 3.4));
      for (let f = 0; f < 6; f++) {
        const u =
          f < 2
            ? Math.max(1, Math.round(d / 4))
            : f < 4
              ? 1
              : Math.max(1, Math.round(w / 4));
        for (let k = 0; k < 4; k++) {
          const i = f * 4 + k;
          uv.setXY(i, uv.getX(i) * u, uv.getY(i) * fl);
        }
      }
      const m = new T.Mesh(g, [
        FM[vi],
        FM[vi],
        roof,
        roof,
        FM[vi],
        FM[vi],
      ]);
      m.position.set(x, y0 + h / 2, z);
      m.castShadow = m.receiveShadow = true;
      P.add(m);
      bo(P, w + 0.5, 0.5, d + 0.5, x, y0 + h - 0.2, z, cream);
      if (ac)
        for (let i = 0; i < 3; i++) {
          const a = new T.Mesh(AG, acM);
          a.scale.set(rn(1, 1.8), rn(0.6, 1.1), rn(1, 1.6));
          a.position.set(
            x + rn(-w / 3, w / 3),
            y0 + h + 0.3 + a.scale.y / 2,
            z + rn(-d / 3, d / 3),
          );
          a.castShadow = true;
          P.add(a);
        }
      return m;
    }
    function cylB(P, r, h, x, y0, z, vi) {
      const g = new T.CylinderGeometry(r, r, h, 40, 1),
        uv = g.attributes.uv,
        u = Math.round((6.283 * r) / 4),
        fl = Math.max(1, Math.round(h / 3.4));
      for (let i = 0; i < 82; i++)
        uv.setXY(i, uv.getX(i) * u, uv.getY(i) * fl);
      const m = new T.Mesh(g, [FM[vi], roof, roof]);
      m.position.set(x, y0 + h / 2, z);
      m.castShadow = true;
      P.add(m);
      return m;
    }
    function sign(P, t, bg, x, y, z, w, h) {
      const c = cn(256, 96),
        k = c.getContext("2d");
      k.fillStyle = bg;
      k.fillRect(0, 0, 256, 96);
      k.fillStyle = "#fff";
      k.font = "bold 64px Arial,sans-serif";
      k.textAlign = "center";
      k.fillText(t, 128, 68);
      const tt = new T.CanvasTexture(c);
      tt.encoding = T.sRGBEncoding;
      const mt = new T.MeshBasicMaterial({ map: tt });
      const b = new T.Mesh(new T.BoxGeometry(w, h, 0.3), [
        dk,
        dk,
        dk,
        dk,
        mt,
        mt,
      ]);
      b.position.set(x, y + h / 2 + 1.2, z);
      P.add(b);
      [-1, 1].forEach((s) =>
        cy(P, 0.1, 0.1, 1.4, x + s * (w / 2 - 0.4), y, z, dk, 6),
      );
    }
    const tileC = cn(128, 128),
      tk = tileC.getContext("2d");
    tk.fillStyle = "#b8532f";
    tk.fillRect(0, 0, 128, 128);
    tk.strokeStyle = "rgba(60,20,10,.45)";
    tk.lineWidth = 2;
    for (let y = 0; y < 128; y += 10) {
      tk.beginPath();
      tk.moveTo(0, y);
      tk.lineTo(128, y);
      tk.stroke();
      for (let x = ((y / 10) % 2) * 8; x < 128; x += 16) {
        tk.beginPath();
        tk.moveTo(x, y);
        tk.lineTo(x, y + 10);
        tk.stroke();
      }
    }
    const tileT = tx(tileC);
    tileT.repeat.set(10, 2);
    const tileM = new T.MeshStandardMaterial({
      map: tileT,
      bumpMap: tileT,
      bumpScale: 1.5,
      roughness: 0.7,
    });
    tileM.color.setHex(0xe4eaf1);
    /* menu landmarks */
    const LM = {
      home(g) {
        bld(g, 12, 13, 10, 0, 0, 0, 2, 1);
        bld(g, 7.5, 3.6, 5.5, -1.8, 13.4, -1, 2);
        bo(g, 5, 0.35, 2.6, 0, 3.3, 5.9, std(0xa33a2e));
        [-2, 2].forEach((s) => cy(g, 0.12, 0.12, 3.3, s, 0, 6.9, dk, 6));
        bo(g, 4.6, 0.3, 1.6, 0, 0, 6.2, cream);
        for (let i = 0; i < 6; i++) {
          cy(
            g,
            0.55,
            0.55,
            0.45,
            3.4 + (i % 2) * 1.7,
            13.5,
            -2.2 + (i >> 1) * 2.2,
            white,
            12,
          );
        }
        bo(g, 1, 0.6, 7, 5.4, 13.5, 0, std(0x3f8f4a));
      },
      about(g) {
        cylB(g, 4.6, 34, 0, 0, 0, 1);
        cy(g, 4.9, 4.9, 0.6, 0, 34, 0, cream, 40);
        cylB(g, 2.5, 4, 0, 34.6, 0, 1);
        cy(g, 0.1, 0.12, 8, 0, 38.6, 0, dk, 6);
      },
      experience(g) {
        bld(g, 9, 44, 9, 0, 0, 0, 6, 0);
        bld(g, 6.5, 8, 6.5, 0, 44.4, 0, 6);
        bo(g, 4.5, 1.6, 4.5, 0, 52.6, 0, cream);
        cy(g, 0.1, 0.14, 12, 0, 54, 0, dk, 6);
      },
      skills(g) {
        bld(g, 8, 34, 8, 0, 0, 0, 4, 0);
        cylB(g, 3.2, 6, 0, 34.4, 0, 4);
        cy(g, 0.3, 0.3, 3, 0, 40.4, 0, dk, 8);
        const d = new T.Mesh(
          new T.SphereGeometry(2.6, 24, 12, 0, 6.283, 0, 1),
          new T.MeshStandardMaterial({
            color: 0xf2f5fa,
            roughness: 0.35,
            metalness: 0.5,
            side: T.DoubleSide,
          }),
        );
        d.position.set(0, 44, 0);
        d.rotation.set(0.5, 0, 0.2);
        d.castShadow = true;
        g.add(d);
        cy(g, 0.08, 0.1, 8, -2, 40, -2, dk, 6);
      },
      projects(g) {
        bld(g, 12, 6.8, 10, 0, 0, 0, 5, 0);
        for (let i = 0; i < 3; i++) {
          const y = 6.8 + i * 3.4;
          bo(g, 12, 0.5, 10, 0, y, 0, conc);
          [-5.5, 0, 5.5].forEach((x) =>
            [-4.5, 4.5].forEach((z) =>
              bo(g, 0.7, 3.4, 0.7, x, y + 0.5, z, conc),
            ),
          );
        }
        bo(g, 0.9, 32, 0.9, 9.5, 0, -6, orange);
        bo(g, 26, 0.8, 0.8, -2.5, 31, -6, orange);
        bo(g, 4, 2.2, 1.6, 12, 29.6, -6, dk);
        bo(g, 1.6, 1.6, 1.6, 9.5, 29.4, -6, dk);
        cy(g, 0, 1, 5, 9.5, 32, -6, orange, 4);
        cy(g, 0.05, 0.05, 18, -11, 12.4, -6, dk, 6);
        bo(g, 0.8, 1, 0.8, -11, 11.4, -6, orange);
        bo(g, 2.2, 0.9, 1.4, -4, 0, 7, std(0xb5502e));
        bo(g, 2.2, 0.9, 1.4, -1.5, 0, 7, std(0xb5502e));
      },
      contact(g) {
        cylB(g, 5, 14, 0, 0, 0, 0);
        const c = new T.Mesh(new T.ConeGeometry(5.7, 5, 40), tileM);
        c.position.y = 16.5;
        c.castShadow = true;
        g.add(c);
        cy(g, 0.6, 0.6, 1.2, 0, 19, 0, dk, 12);
        cy(g, 0.08, 0.1, 8, 0, 20, 0, dk, 6);
      },
      cv(g) {
        bld(g, 8, 10, 6, 0, 0, 0, 3, 1);
        bo(g, 6, 0.3, 1.8, 0, 3.2, 3.7, std(0x2563eb));
        sign(g, "CV", "#2563eb", 0, 10.4, 0, 4, 1.6);
      },
      github(g) {
        bld(g, 7, 12, 7, 0, 0, 0, 5, 1);
        sign(g, "</>", "#161b22", 0, 12.4, 0, 4.2, 1.6);
      },
      linkedin(g) {
        bld(g, 7, 15, 6, 0, 0, 0, 7, 1);
        sign(g, "in", "#0a66c2", 0, 15.4, 0, 3.2, 1.8);
      },
    };
    const N = [
      {
        id: "home",
        m: "home",
        t: "Home",
        s: "Overview",
        k: "page",
        x: 9,
        z: 13,
        h: 19,
        fp: [12, 10],
      },
      {
        id: "about",
        m: "about",
        t: "About",
        s: "Profile & education",
        k: "page",
        x: -19,
        z: -15,
        h: 47,
        fp: [10, 10],
      },
      {
        id: "experience",
        m: "experience",
        t: "Experience",
        s: "Work & mentoring",
        k: "page",
        x: 5,
        z: -18,
        h: 66,
        fp: [10, 10],
      },
      {
        id: "skills",
        m: "skills",
        t: "Skills",
        s: "Tools & stack",
        k: "page",
        x: 21,
        z: -14,
        h: 50,
        fp: [9, 9],
      },
      {
        id: "projects",
        m: "projects",
        t: "Projects",
        s: "9 projects · 1 paper",
        k: "page",
        x: -20,
        z: 12,
        h: 34,
        fp: [26, 12],
      },
      {
        id: "contact",
        m: "contact",
        t: "Contact",
        s: "Say hello",
        k: "page",
        x: 24,
        z: 12,
        h: 29,
        fp: [11, 11],
      },
      {
        id: "cv",
        m: "cv",
        t: "CV",
        s: "Download résumé",
        k: "link",
        x: -26,
        z: -7,
        h: 14,
        fp: [8, 6],
        u: "https://drive.google.com/file/d/1fjqSUigGa7xUplwuHCnjZhvGOA30FbG3/view?usp=sharing",
      },
      {
        id: "github",
        m: "github",
        t: "GitHub",
        s: "Code & repositories",
        k: "link",
        x: -11,
        z: -9,
        h: 17,
        fp: [7, 7],
        u: "https://github.com/JhonDeFloretto",
      },
      {
        id: "linkedin",
        m: "linkedin",
        t: "LinkedIn",
        s: "Let’s connect",
        k: "link",
        x: 16,
        z: -4,
        h: 20,
        fp: [7, 6],
        u: "https://www.linkedin.com/in/jhon-de-floretto-67709a324",
      },
    ];
    /* layout: fillers, trees */
    const onSt = (x, z, m) =>
      (Math.abs(z - 2) < 2.5 + m && Math.abs(x) < 33) ||
      (Math.abs(x + 4) < 2.5 + m && Math.abs(z) < 33);
    const LOTS = N.map((n) => ({
      x: n.x,
      z: n.z,
      w: n.fp[0] + 3,
      d: n.fp[1] + 3,
      r: Math.max(n.fp[0], n.fp[1]) / 2 + 1.5,
    }));
    LOTS.push({ x: -12, z: 23, w: 10, d: 9, r: 6 });
    const free = (x, z, r) =>
      !LOTS.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r);
    for (let a = 0, nf = 0; a < 1600 && nf < 30; a++) {
      const an = rn(0, 6.283),
        rr = rn(7, 29),
        x = Math.cos(an) * rr,
        z = Math.sin(an) * rr,
        w = rn(5.5, 9.5),
        d = rn(5.5, 9.5),
        r = Math.max(w, d) / 2 + 1.2;
      if (onSt(x, z, r) || !free(x, z, r + 1)) continue;
      LOTS.push({ x, z, w: w + 3, d: d + 3, r });
      nf++;
      {
        const hh = rn(8, 15) + (rr > 15 ? rn(0, 14) : 0);
        bld(sc, w, hh, d, x, 0, z, (Math.random() * 8) | 0, 1);
        if (hh > 19) cy(sc, 0.07, 0.1, 5, x, hh + 0.3, z, dk, 6);
      }
    }
    /* ground texture painted top-down */
    const S = 2048 / 84.8,
      px = (X) => 1024 + X * S,
      pz = (Z) => 1024 + Z * S;
    const gc = cn(2048, 2048),
      x = gc.getContext("2d"),
      RC = (x0, z0, x1, z1, c) => {
        x.fillStyle = c;
        x.fillRect(px(x0), pz(z0), (x1 - x0) * S, (z1 - z0) * S);
      };
    x.save();
    x.beginPath();
    x.arc(1024, 1024, 42.4 * S, 0, 7);
    x.clip();
    x.fillStyle = "#eef4fa";
    x.fillRect(0, 0, 2048, 2048);
    for (let i = 0; i < 7000; i++) {
      x.fillStyle =
        "rgba(" +
        ((200 + Math.random() * 40) | 0) +
        "," +
        ((215 + Math.random() * 30) | 0) +
        ",245,.55)";
      x.fillRect(Math.random() * 2048, Math.random() * 2048, 5, 5);
    }
    for (let i = 0; i < 300; i++) {
      x.fillStyle = ["#ffffff", "#dbe9f7", "#c9dcf0"][i % 3];
      x.beginPath();
      x.arc(Math.random() * 2048, Math.random() * 2048, 2.2, 0, 7);
      x.fill();
    }
    LOTS.forEach((o) => {
      x.fillStyle = "#d9dfe6";
      x.fillRect(px(o.x - o.w / 2), pz(o.z - o.d / 2), o.w * S, o.d * S);
      const tx2 = Math.abs(o.z - 2) < Math.abs(o.x + 4) ? o.x : -4,
        tz2 = Math.abs(o.z - 2) < Math.abs(o.x + 4) ? 2 : o.z;
      x.strokeStyle = "#e3e8ee";
      x.lineWidth = 1.6 * S;
      x.beginPath();
      x.moveTo(px(o.x), pz(o.z));
      x.lineTo(px(tx2), pz(tz2));
      x.stroke();
    });
    RC(-16, 19.5, -8, 26.5, "#a9d6ee");
    x.strokeStyle = "#fff";
    x.lineWidth = 0.25 * S;
    x.strokeRect(px(-15.7), pz(19.8), 7.4 * S, 6.4 * S);
    x.beginPath();
    x.ellipse(px(-12), pz(23), 3.2 * S, 2.2 * S, 0, 0, 7);
    x.stroke();
    x.beginPath();
    x.moveTo(px(-12), pz(19.8));
    x.lineTo(px(-12), pz(26.2));
    x.stroke();
    x.strokeStyle = "#d3dae2";
    x.lineWidth = 2.6 * S;
    x.beginPath();
    x.arc(1024, 1024, 32.7 * S, 0, 7);
    x.stroke();
    RC(-32, -2.2, 32, 6.2, "#d3dae2");
    RC(-8.2, -32, 0.2, 32, "#d3dae2");
    RC(-32, -0.5, 32, 4.5, "#3b4049");
    RC(-6.5, -32, -1.5, 32, "#3b4049");
    x.strokeStyle = "#3b4049";
    x.lineWidth = 8 * S;
    x.beginPath();
    x.arc(1024, 1024, 38 * S, 0, 7);
    x.stroke();
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = "rgba(150,160,180,.08)";
      x.fillRect(Math.random() * 2048, Math.random() * 2048, 3, 3);
    }
    x.strokeStyle = "#f2f2f2";
    x.lineWidth = 0.22 * S;
    x.setLineDash([2.2 * S, 2.2 * S]);
    [36, 40].forEach((r) => {
      x.beginPath();
      x.arc(1024, 1024, r * S, 0, 7);
      x.stroke();
    });
    [
      [-31, 2, -8.6, 2],
      [1, 2, 31, 2],
      [-4, -31, -4, -3],
      [-4, 7, -4, 31],
    ].forEach((l) => {
      x.beginPath();
      x.moveTo(px(l[0]), pz(l[1]));
      x.lineTo(px(l[2]), pz(l[3]));
      x.stroke();
    });
    x.setLineDash([]);
    x.strokeStyle = "#e8e8e8";
    x.lineWidth = 0.2 * S;
    [34.2, 41.8].forEach((r) => {
      x.beginPath();
      x.arc(1024, 1024, r * S, 0, 7);
      x.stroke();
    });
    x.fillStyle = "#f2f2f2";
    for (let z = -0.2; z < 4.5; z += 1)
      RC(-10.5, z, -7.5, z + 0.5, "#f2f2f2");
    for (let xx = -6.2; xx < -1.6; xx += 1)
      RC(xx, 8, xx + 0.5, 11, "#f2f2f2");
    [0.4, 1.9, 3.6, 5.1].forEach((th) => {
      x.save();
      x.translate(1024, 1024);
      x.rotate(th);
      for (let r = 34.6; r < 41.6; r += 1)
        x.fillRect((r - 0.25) * S, -1.5 * S, 0.5 * S, 3 * S);
      x.restore();
    });
    x.restore();
    x.strokeStyle = "#d8d3c8";
    x.lineWidth = 0.7 * S;
    x.beginPath();
    x.arc(1024, 1024, 42.1 * S, 0, 7);
    x.stroke();
    const gt = tx(gc);
    gt.wrapS = gt.wrapT = T.ClampToEdgeWrapping;
    const top = new T.Mesh(
      new T.CircleGeometry(42.4, 128),
      new T.MeshStandardMaterial({ map: gt, roughness: 0.9 }),
    );
    top.rotation.x = -Math.PI / 2;
    top.receiveShadow = true;
    sc.add(top);
    const base = new T.Mesh(
      new T.CylinderGeometry(42.4, 41.2, 2.6, 96),
      std(0x30343c, { roughness: 0.9 }),
    );
    base.position.y = -1.32;
    /* trees */
    const TR = [];
    for (let a = 0; a < 2200 && TR.length < 200; a++) {
      const an = rn(0, 6.283),
        rr = rn(4, 30.5),
        X = Math.cos(an) * rr,
        Z = Math.sin(an) * rr;
      if (onSt(X, Z, 2.3) || !free(X, Z, 0.8)) continue;
      TR.push([X, Z, Math.random() < 0.2]);
    }
    for (let k = 0; k < 48; k++) {
      const an = (k * Math.PI) / 24;
      TR.push([Math.cos(an) * 31.3, Math.sin(an) * 31.3, false]);
    }
    const nb = TR.filter((q) => !q[2]).length * 3,
      npn = TR.filter((q) => q[2]).length * 3;
    const fo = new T.InstancedMesh(
        new T.IcosahedronGeometry(1, 1),
        std(0xffffff, { roughness: 0.95 }),
        nb,
      ),
      pn = new T.InstancedMesh(
        new T.ConeGeometry(1, 2.4, 8),
        std(0xffffff, { roughness: 0.95 }),
        npn,
      ),
      trk = new T.InstancedMesh(
        new T.CylinderGeometry(0.18, 0.26, 2.4, 6),
        std(0x5b4030),
        TR.length,
      );
    const dm = new T.Object3D(),
      col = new T.Color();
    let fi = 0,
      pi = 0;
    TR.forEach((q, i) => {
      dm.rotation.set(0, 0, 0);
      dm.scale.set(1, 1, 1);
      dm.position.set(q[0], 1.2, q[1]);
      dm.updateMatrix();
      trk.setMatrixAt(i, dm.matrix);
      if (q[2])
        for (let j = 0; j < 3; j++) {
          const s = 2 - j * 0.5;
          dm.position.set(q[0], 2.4 + j * 1.5, q[1]);
          dm.scale.set(s, 1.1, s);
          dm.updateMatrix();
          pn.setMatrixAt(pi, dm.matrix);
          pn.setColorAt(
            pi++,
            col
              .setRGB(
                0.08 + Math.random() * 0.08,
                0.3 + Math.random() * 0.14,
                0.16 + Math.random() * 0.06,
              )
              .convertSRGBToLinear(),
          );
        }
      else
        for (let j = 0; j < 3; j++) {
          const s = rn(1.4, 2.3);
          dm.position.set(
            q[0] + rn(-0.8, 0.8),
            3.4 + rn(0, 1.4),
            q[1] + rn(-0.8, 0.8),
          );
          dm.scale.setScalar(s);
          dm.updateMatrix();
          fo.setMatrixAt(fi, dm.matrix);
          fo.setColorAt(
            fi++,
            col
              .setRGB(
                0.12 + Math.random() * 0.12,
                0.36 + Math.random() * 0.16,
                0.16 + Math.random() * 0.06,
              )
              .convertSRGBToLinear(),
          );
        }
    });
    [fo, pn, trk].forEach((m) => {
      m.castShadow = true;
      m.frustumCulled = false;
      sc.add(m);
    });
    /* street lamps */
    const LP = [];
    for (let k = 0; k < 24; k++) {
      const an = (k * Math.PI) / 12;
      LP.push([Math.cos(an) * 33.4, Math.sin(an) * 33.4]);
    }
    for (let t = -28; t <= 28; t += 14) {
      LP.push([t, -1.2], [t, 5.2]);
    }
    const lp = new T.InstancedMesh(
        new T.CylinderGeometry(0.08, 0.12, 5.5, 6),
        dk,
        LP.length,
      ),
      lh = new T.InstancedMesh(
        new T.BoxGeometry(0.9, 0.2, 0.4),
        std(0xfff3c4, { emissive: 0xffe2a0, emissiveIntensity: 3 }),
        LP.length,
      );
    LP.forEach((q, i) => {
      dm.position.set(q[0], 2.75, q[1]);
      dm.updateMatrix();
      lp.setMatrixAt(i, dm.matrix);
      dm.position.set(q[0], 5.5, q[1]);
      dm.updateMatrix();
      lh.setMatrixAt(i, dm.matrix);
      LAMPS.push([q[0], 5.4, q[1]]);
    });
    sc.add(lp, lh);
    /* vehicles: cars + buses with wheels and glass */
    const NV = 34,
      V = [],
      body = new T.InstancedMesh(
        new T.BoxGeometry(1, 1, 1),
        new T.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.3,
          metalness: 0.5,
        }),
        NV,
      ),
      cab = new T.InstancedMesh(
        new T.BoxGeometry(1, 1, 1),
        new T.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.1,
          metalness: 0.8,
        }),
        NV,
      ),
      wh = new T.InstancedMesh(
        new T.CylinderGeometry(0.38, 0.38, 0.28, 14),
        std(0x15171c),
        NV * 4,
      );
    const CC = [
      0xd33a3a, 0x2f6fe0, 0xf2f2f4, 0x1f2430, 0xf2b134, 0x2aa88f,
    ];
    for (let i = 0; i < NV; i++) {
      const bus = i % 11 === 5,
        v = { bus, L: bus ? 3.4 : 1.35, W: bus ? 1.1 : 0.9 };
      if (i < 28) {
        v.ring = 1;
        v.r = i % 2 ? 36 : 40;
        v.dir = i % 2 ? -1 : 1;
        v.a = rn(0, 6.28);
        v.sp = rn(6, 9);
      } else {
        v.ring = 0;
        v.l = i % 2 ? 0.9 : 3.1;
        v.dir = i % 2 ? -1 : 1;
        v.t = rn(-30, 30);
        v.sp = rn(5, 8);
      }
      V.push(v);
      body.setColorAt(
        i,
        col.setHex(bus ? 0xffb454 : CC[i % 6]).convertSRGBToLinear(),
      );
      cab.setColorAt(i, col.setHex(0x2b3d52).convertSRGBToLinear());
    }
    [body, cab, wh].forEach((m) => {
      m.castShadow = true;
      m.frustumCulled = false;
      sc.add(m);
    });
    const q90 = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(0, 0, 1),
        Math.PI / 2,
      ),
      qy = new T.Quaternion(),
      UP = new T.Vector3(0, 1, 0);
    let lastT = 0;
    function update(t) {
      const dt = Math.min(Math.max(t - lastT, 0), 0.1);
      lastT = t;
      for (let i = 0; i < NV; i++) {
        const v = V[i];
        let X, Z, dx, dz;
        if (v.ring) {
          v.a += ((v.dir * v.sp) / v.r) * dt;
          X = v.r * Math.cos(v.a);
          Z = v.r * Math.sin(v.a);
          dx = -Math.sin(v.a) * v.dir;
          dz = Math.cos(v.a) * v.dir;
        } else {
          v.t += v.dir * v.sp * dt;
          if (v.t > 31) v.t = -31;
          if (v.t < -31) v.t = 31;
          X = v.t;
          Z = v.l;
          dx = v.dir;
          dz = 0;
        }
        const b = v.bus,
          ry = Math.atan2(dx, dz);
        qy.setFromAxisAngle(UP, ry);
        dm.quaternion.copy(qy);
        dm.position.set(X, b ? 1.7 : 0.62, Z);
        dm.scale.set(b ? 2.5 : 1.9, b ? 2.6 : 0.8, b ? 10 : 4.2);
        dm.updateMatrix();
        body.setMatrixAt(i, dm.matrix);
        dm.position.set(
          X - (b ? 0 : dx * 0.3),
          b ? 2.3 : 1.2,
          Z - (b ? 0 : dz * 0.3),
        );
        dm.scale.set(b ? 2.52 : 1.6, b ? 0.95 : 0.55, b ? 9.2 : 2.2);
        dm.updateMatrix();
        cab.setMatrixAt(i, dm.matrix);
        dm.scale.set(1, 1, 1);
        dm.quaternion.copy(qy).multiply(q90);
        for (let k = 0; k < 4; k++) {
          const sx = k & 1 ? 1 : -1,
            sz = k & 2 ? 1 : -1;
          dm.position.set(
            X + dz * v.W * sx + dx * v.L * sz,
            0.38,
            Z - dx * v.W * sx + dz * v.L * sz,
          );
          dm.updateMatrix();
          wh.setMatrixAt(i * 4 + k, dm.matrix);
        }
      }
      body.instanceMatrix.needsUpdate =
        cab.instanceMatrix.needsUpdate =
        wh.instanceMatrix.needsUpdate =
          true;
    }
    body.instanceColor.needsUpdate = cab.instanceColor.needsUpdate = true;
    update(0);
    return { N, LM, update };
  })();
  bgU.push({
    set value(t) {
      CITY.update(t);
    },
  });
  const N = CITY.N;

  /* realistic materials + rounded geometry */
  const PM = (h, o) =>
    new T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: C(h),
          roughness: 0.35,
          metalness: 0,
          clearcoat: 0.6,
          clearcoatRoughness: 0.2,
          envMapIntensity: 0.9,
        },
        o || {},
      ),
    );
  function kit(col) {
    return {
      w: PM(0xe9eefb, { roughness: 0.32 }),
      a: PM(col),
      b: PM(col === BLUE ? 0x0d9488 : 0x3b5bfd),
      d: PM(0x16223f, { roughness: 0.42 }),
      m: PM(0xdfe6f5, {
        metalness: 1,
        roughness: 0.2,
        clearcoat: 0,
        envMapIntensity: 1.3,
      }),
    };
  }
  function part(g, geo, k, x, y, z, rx, ry, rz) {
    const p = new T.Mesh(geo, g.userData.k[k]);
    p.position.set(x || 0, y || 0, z || 0);
    p.rotation.set(rx || 0, ry || 0, rz || 0);
    p.castShadow = p.receiveShadow = true;
    g.add(p);
    return p;
  }
  function Box(w, h, d, r) {
    r = Math.min(r || 0.08, w / 2.3, h / 2.3, d / 2.3);
    const a = w / 2 - r,
      b = h / 2 - r,
      s = new T.Shape();
    s.moveTo(-a, -b - r);
    s.lineTo(a, -b - r);
    s.quadraticCurveTo(a + r, -b - r, a + r, -b);
    s.lineTo(a + r, b);
    s.quadraticCurveTo(a + r, b + r, a, b + r);
    s.lineTo(-a, b + r);
    s.quadraticCurveTo(-a - r, b + r, -a - r, b);
    s.lineTo(-a - r, -b);
    s.quadraticCurveTo(-a - r, -b - r, -a, -b - r);
    const geo = new T.ExtrudeGeometry(s, {
      depth: Math.max(0.001, d - 2 * r),
      bevelEnabled: true,
      bevelSize: r * 0.6,
      bevelThickness: r,
      bevelSegments: 3,
      curveSegments: 5,
    });
    geo.translate(0, 0, -(d - 2 * r) / 2);
    return geo;
  }
  const Sph = (r, x, y) => new T.SphereGeometry(r, x || 28, y || 18);
  function rod(g, a, b, k) {
    const va = new T.Vector3().fromArray(a),
      vb = new T.Vector3().fromArray(b),
      d = vb.clone().sub(va);
    const p = part(
      g,
      new T.CylinderGeometry(0.08, 0.08, d.length(), 16),
      k || "m",
      (va.x + vb.x) / 2,
      (va.y + vb.y) / 2,
      (va.z + vb.z) / 2,
    );
    p.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      d.normalize(),
    );
  }
  function gear(n, ro, ri, hole, d) {
    const s = new T.Shape(),
      st = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++)
      [
        [0, ri],
        [0.18, ro],
        [0.48, ro],
        [0.66, ri],
      ].forEach((q, j) => {
        const a = (i + q[0]) * st,
          x = Math.cos(a) * q[1],
          y = Math.sin(a) * q[1];
        i === 0 && j === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
      });
    s.closePath();
    const h = new T.Path();
    h.absarc(0, 0, hole, 0, Math.PI * 2, true);
    s.holes.push(h);
    const geo = new T.ExtrudeGeometry(s, {
      depth: d,
      bevelEnabled: true,
      bevelSize: 0.05,
      bevelThickness: 0.06,
      bevelSegments: 2,
    });
    geo.translate(0, 0, -d / 2);
    return geo;
  }
  (() => {
    /* clouds */
    const cc = document.createElement("canvas");
    cc.width = cc.height = 128;
    const g = cc.getContext("2d"),
      r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    r.addColorStop(0, "rgba(255,255,255,.95)");
    r.addColorStop(0.55, "rgba(255,255,255,.45)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    const ctx = new T.CanvasTexture(cc),
      cl = [];
    for (let i = 0; i < 16; i++) {
      const p = new T.Sprite(
          new T.SpriteMaterial({
            map: ctx,
            transparent: true,
            color: 0x3a4f86,
            opacity: 0.42,
            depthWrite: false,
            fog: false,
          }),
        ),
        a = (i / 16) * 6.283,
        rr = 150 + (i % 4) * 30;
      p.scale.set(95 + (i % 3) * 30, 34 + (i % 2) * 12, 1);
      sc.add(p);
      cl.push({
        p,
        a,
        rr,
        y: 105 + (i % 5) * 10,
        s: 0.004 + (i % 4) * 0.0012,
      });
    }
    /* snowmen on the ring sidewalk */
    const sw = new T.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
      }),
      cm = new T.MeshStandardMaterial({
        color: 0xff7a1a,
        roughness: 0.6,
      }),
      sf = new T.MeshStandardMaterial({
        color: 0xd8343a,
        roughness: 0.8,
      }),
      kb = new T.MeshStandardMaterial({ color: 0x222222 });
    for (let k = 0; k < 10; k++) {
      const a = ((k * 4 + 2) * Math.PI) / 24,
        sm = new T.Group(),
        add = (geo, m, y, z) => {
          const o = new T.Mesh(geo, m);
          o.position.set(0, y, z || 0);
          o.castShadow = true;
          sm.add(o);
          return o;
        };
      add(new T.SphereGeometry(0.95, 16, 12), sw, 0.95);
      add(new T.SphereGeometry(0.68, 16, 12), sw, 2.25);
      add(new T.SphereGeometry(0.46, 16, 12), sw, 3.2);
      add(new T.ConeGeometry(0.09, 0.55, 8), cm, 3.2, 0.52).rotation.x =
        Math.PI / 2;
      add(new T.TorusGeometry(0.42, 0.09, 8, 16), sf, 2.78).rotation.x =
        Math.PI / 2;
      [-0.16, 0.16].forEach((x) => {
        const e = add(new T.SphereGeometry(0.05, 6, 6), kb, 3.3, 0.42);
        e.position.x = x;
      });
      sm.position.set(Math.cos(a) * 32.6, 0, Math.sin(a) * 32.6);
      sm.rotation.y = -a + Math.PI / 2;
      sm.scale.setScalar(0.8);
      sc.add(sm);
    }
    /* skaters on the rink */
    const sk = [];
    [0xd33a3a, 0x2f6fe0, 0xf2b134, 0x2aa88f].forEach((c, i) => {
      const p = new T.Group(),
        m = new T.MeshStandardMaterial({ color: c, roughness: 0.6 }),
        b = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, 1, 10), m),
        h = new T.Mesh(
          new T.SphereGeometry(0.26, 10, 8),
          new T.MeshStandardMaterial({ color: 0xf0c9a4 }),
        );
      b.position.y = 0.7;
      h.position.y = 1.4;
      b.castShadow = h.castShadow = true;
      p.add(b, h);
      sc.add(p);
      sk.push({ p, o: i * 1.57, sp: 0.5 + i * 0.12 });
    });
    /* helicopter */
    const hc = new T.Group(),
      hm = new T.MeshStandardMaterial({
        color: 0xd33a3a,
        roughness: 0.35,
        metalness: 0.4,
      }),
      hw = new T.MeshStandardMaterial({
        color: 0xf4f6fa,
        roughness: 0.4,
      }),
      hd = new T.MeshStandardMaterial({ color: 0x20252f });
    const hb = new T.Mesh(new T.SphereGeometry(1.5, 16, 12), hm);
    hb.scale.set(1.5, 1, 1);
    hc.add(hb);
    const tl = new T.Mesh(new T.BoxGeometry(4.6, 0.35, 0.35), hm);
    tl.position.x = -3.6;
    hc.add(tl);
    const rot = new T.Group();
    rot.position.y = 1.5;
    [0, 1.5708].forEach((a) => {
      const bl = new T.Mesh(new T.BoxGeometry(7.5, 0.06, 0.35), hd);
      bl.rotation.y = a;
      rot.add(bl);
    });
    hc.add(rot);
    const trr = new T.Mesh(new T.BoxGeometry(0.06, 1.3, 0.2), hd);
    trr.position.set(-5.8, 0.4, 0.2);
    hc.add(trr);
    const lg = new T.Mesh(new T.BoxGeometry(3, 0.1, 0.1), hw);
    [-0.9, 0.9].forEach((z) => {
      const q = lg.clone();
      q.position.set(0, -1.5, z);
      hc.add(q);
    });
    const bk = new T.Mesh(
      new T.SphereGeometry(0.18, 8, 8),
      new T.MeshBasicMaterial({ color: 0xff3030 }),
    );
    bk.position.set(-6.1, 0.1, 0);
    hc.add(bk);
    hc.scale.setScalar(1.1);
    sc.add(hc);
    /* falling snow that dodges the cursor */
    const SN = isMobile ? 3500 : 9000,
      BX = 125,
      BY = 70,
      base = new Float32Array(SN * 3),
      off = new Float32Array(SN * 3),
      fall = new Float32Array(SN),
      ph = new Float32Array(SN),
      pos = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) {
      base[i * 3] = (Math.random() - 0.5) * 2 * BX;
      base[i * 3 + 1] = Math.random() * BY - 3;
      base[i * 3 + 2] = (Math.random() - 0.5) * 2 * BX;
      fall[i] = 1.6 + Math.random() * 2.4;
      ph[i] = Math.random() * 6.283;
    }
    const sg = new T.BufferGeometry();
    sg.setAttribute("position", new T.BufferAttribute(pos, 3));
    const fc = document.createElement("canvas");
    fc.width = fc.height = 64;
    const f = fc.getContext("2d"),
      fr = f.createRadialGradient(32, 32, 2, 32, 32, 30);
    fr.addColorStop(0, "rgba(255,255,255,1)");
    fr.addColorStop(0.5, "rgba(255,255,255,.85)");
    fr.addColorStop(0.8, "rgba(205,225,250,.35)");
    fr.addColorStop(1, "rgba(200,220,250,0)");
    f.fillStyle = fr;
    f.fillRect(0, 0, 64, 64);
    const snow = new T.Points(
      sg,
      new T.PointsMaterial({
        map: new T.CanvasTexture(fc),
        size: 1.0,
        transparent: true,
        depthWrite: false,
        sizeAttenuation: true,
        fog: false,
        opacity: 0.95,
      }),
    );
    snow.frustumCulled = false;
    sc.add(snow);
    let blast = 0,
      lastT = 0;
    addEventListener("pointerdown", () => {
      blast = 1;
    });
    const vo = new T.Vector3(),
      vd = new T.Vector3();
    bgU.push({
      set value(t) {
        const dt = Math.min(Math.max(t - lastT, 0), 0.1);
        lastT = t;
        cl.forEach((o) => {
          const a = o.a + t * o.s;
          o.p.position.set(Math.cos(a) * o.rr, o.y, Math.sin(a) * o.rr);
        });
        sk.forEach((q) => {
          const a = q.o + t * q.sp;
          q.p.position.set(
            -12 + Math.cos(a) * 3.2,
            0,
            23 + Math.sin(a) * 2.2,
          );
          q.p.rotation.y = -a + Math.PI;
        });
        const ha = t * 0.13;
        hc.position.set(
          Math.cos(ha) * 54,
          36 + Math.sin(t * 0.5) * 2,
          Math.sin(ha) * 54,
        );
        hc.rotation.set(0, -ha - Math.PI / 2, Math.sin(t * 0.5) * 0.06);
        rot.rotation.y = t * 30;
        bk.visible = Math.sin(t * 4) > 0;
        const act = hasPtr;
        if (act) {
          ray.setFromCamera(ndc, cam);
          vo.copy(ray.ray.origin);
          vd.copy(ray.ray.direction);
        }
        const rel = Math.exp(-dt * 0.7),
          rk = 0.07 + blast * 0.13,
          ks = 16 + blast * 60;
        blast *= Math.exp(-dt * 2.6);
        for (let i = 0; i < SN; i++) {
          const j = i * 3;
          let x = base[j],
            y = base[j + 1] - fall[i] * dt,
            z = base[j + 2];
          x += (Math.sin(t * 0.6 + ph[i]) * 0.7 + 0.5) * dt;
          z += Math.cos(t * 0.5 + ph[i] * 1.3) * 0.5 * dt;
          if (y < -3) {
            y = BY - 3;
            x = (Math.random() - 0.5) * 2 * BX;
            z = (Math.random() - 0.5) * 2 * BX;
            off[j] = off[j + 1] = off[j + 2] = 0;
          }
          if (x > BX) x -= 2 * BX;
          else if (x < -BX) x += 2 * BX;
          if (z > BX) z -= 2 * BX;
          else if (z < -BX) z += 2 * BX;
          base[j] = x;
          base[j + 1] = y;
          base[j + 2] = z;
          let ox = off[j] * rel,
            oy = off[j + 1] * rel,
            oz = off[j + 2] * rel;
          if (act) {
            const px = x + ox - vo.x,
              py = y + oy - vo.y,
              pz = z + oz - vo.z,
              t0 = px * vd.x + py * vd.y + pz * vd.z;
            if (t0 > 1) {
              const dx = px - vd.x * t0,
                dy = py - vd.y * t0,
                dz = pz - vd.z * t0,
                dd = Math.sqrt(dx * dx + dy * dy + dz * dz),
                R = t0 * rk;
              if (dd < R) {
                const w = 1 - dd / R,
                  k =
                    (w * w * ks * t0 * 0.02 * dt * 60) / 60 / (dd + 0.3);
                ox += dx * k;
                oy += dy * k;
                oz += dz * k;
              }
            }
          }
          off[j] = ox;
          off[j + 1] = oy;
          off[j + 2] = oz;
          pos[j] = x + ox;
          pos[j + 1] = y + oy;
          pos[j + 2] = z + oz;
        }
        sg.attributes.position.needsUpdate = true;
      },
    });
  })();
  (() => {
    const PI = Math.PI,
      rn = (a, b) => a + Math.random() * (b - a);
    const M = (c, o) =>
      new T.MeshStandardMaterial(
        Object.assign({ color: c, roughness: 0.85 }, o || {}),
      );
    const dm = new T.Object3D(),
      col = new T.Color();
    const dk = M(0x2a3040, { roughness: 0.5, metalness: 0.3 }),
      stoneM = M(0xe4dfd3, { roughness: 0.9 }),
      snowW = M(0xffffff, { roughness: 0.95 });
    const flat = (geo, mat, x, y, z) => {
      const m = new T.Mesh(geo, mat);
      m.rotation.x = -PI / 2;
      m.position.set(x, y, z);
      m.receiveShadow = true;
      sc.add(m);
      return m;
    };
    const mesh = (g, geo, mat, x, y, z, cast) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = cast !== false;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const polar = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
    const nearAve = (ang, r, pad) => {
      const q = ((ang % (PI / 4)) + PI / 4) % (PI / 4);
      return Math.abs(q - PI / 8) * r < pad;
    };
    const CIV = [0, 70, 27],
      PRK = [-78, 30, 31];
    const inZone = (x, z, pad) =>
      Math.hypot(x - CIV[0], z - CIV[1]) < CIV[2] + pad ||
      Math.hypot(x - PRK[0], z - PRK[1]) < PRK[2] + pad;
    const wallEm = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      g.fillStyle = "#000";
      g.fillRect(0, 0, 128, 128);
      const q = g.createLinearGradient(34, 24, 94, 88);
      q.addColorStop(0, "#ffe9a8");
      q.addColorStop(1, "#ffa940");
      g.fillStyle = q;
      g.fillRect(34, 24, 60, 64);
      g.fillStyle = "#000";
      g.fillRect(62, 24, 4, 64);
      g.fillRect(34, 54, 60, 3);
      const t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.encoding = T.sRGBEncoding;
      return t;
    };
    const wallTex = (wall, win) => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      g.fillStyle = wall;
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = "rgba(0,0,0,.12)";
      g.fillRect(0, 112, 128, 16);
      g.fillStyle = "rgba(0,0,0,.35)";
      g.fillRect(30, 20, 68, 72);
      g.fillStyle = win;
      g.fillRect(34, 24, 60, 64);
      g.fillStyle = "rgba(255,255,255,.35)";
      g.fillRect(34, 24, 30, 64);
      g.fillStyle = wall;
      g.fillRect(62, 24, 4, 64);
      g.fillRect(34, 54, 60, 3);
      g.fillStyle = "rgba(255,255,255,.55)";
      g.fillRect(28, 92, 72, 4);
      const t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.encoding = T.sRGBEncoding;
      t.anisotropy = 4;
      return t;
    };
    function wallBox(g, w, h, d, mat, x, y, z) {
      const geo = new T.BoxGeometry(w, h, d),
        uv = geo.attributes.uv,
        fl = Math.max(1, Math.round(h / 3.2));
      for (let f = 0; f < 6; f++) {
        const u =
          f < 2
            ? Math.max(1, Math.round(d / 4))
            : f < 4
              ? 1
              : Math.max(1, Math.round(w / 4));
        for (let k = 0; k < 4; k++) {
          const i = f * 4 + k;
          uv.setXY(i, uv.getX(i) * u, uv.getY(i) * fl);
        }
      }
      return mesh(g, geo, mat, x, y + h / 2, z);
    }

    /* ---- terrain, roads ---- */
    const nc = document.createElement("canvas");
    nc.width = nc.height = 256;
    const ng = nc.getContext("2d");
    ng.fillStyle = "#f1f6fb";
    ng.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      ng.fillStyle =
        "rgba(" +
        ((185 + Math.random() * 40) | 0) +
        "," +
        ((205 + Math.random() * 30) | 0) +
        ",240,.28)";
      ng.fillRect(
        Math.random() * 256,
        Math.random() * 256,
        2 + Math.random() * 3,
        2 + Math.random() * 3,
      );
    }
    const nt = new T.CanvasTexture(nc);
    nt.wrapS = nt.wrapT = T.RepeatWrapping;
    nt.repeat.set(70, 70);
    nt.encoding = T.sRGBEncoding;
    flat(
      new T.CircleGeometry(430, 96),
      M(0xffffff, { map: nt, roughness: 0.95 }),
      0,
      -0.05,
      0,
    );
    const roadM = M(0x454b55, { roughness: 0.9 });
    flat(new T.RingGeometry(47.2, 52.8, 160), roadM, 0, 0.03, 0);
    flat(new T.RingGeometry(88, 93, 200), roadM, 0, 0.03, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k * PI) / 4 + PI / 8,
        m = flat(
          new T.PlaneGeometry(6.4, 55),
          roadM,
          Math.cos(a) * 69,
          0.03,
          Math.sin(a) * 69,
        );
      m.rotation.set(-PI / 2, 0, PI / 2 - a);
    }
    const edge = M(0xf2f5f9, { roughness: 0.9 });
    flat(new T.RingGeometry(52.8, 53.6, 160), edge, 0, 0.035, 0);
    flat(new T.RingGeometry(46.4, 47.2, 160), edge, 0, 0.035, 0);

    /* ---- ordinary houses (perumahan) ---- */
    const houseM = M(0xffffff, {
      map: wallTex("#ffffff", "#7fa5c9"),
      emissive: 0xffffff,
      emissiveMap: wallEm(),
      emissiveIntensity: 1.4,
    });
    const PAL = [
        0xe8553f, 0xf2a23a, 0xf5d547, 0x4fb477, 0x3fa9d8, 0x4f7bea,
        0x9a6bd8, 0xe869a6, 0x2ec4b6, 0xd9793a, 0x8fcf4e, 0xc94a5c,
      ],
      RF = [
        0x7a2e2a, 0x2f3d6b, 0x2f6b4a, 0x5a3a2a, 0x8a3b1f, 0x3a3f4a,
        0x1f5f7a, 0x6a2f5a,
      ],
      H = [];
    [58, 65, 72, 79, 99, 106, 113].forEach((r) => {
      const n = Math.floor((2 * PI * r) / 10);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * 2 * PI + rn(-0.015, 0.015),
          p = polar(ang, r + rn(-0.8, 0.8)),
          x = p[0],
          z = p[1];
        if (
          nearAve(ang, r, 7.5) ||
          inZone(x, z, 3) ||
          Math.random() < 0.06
        )
          continue;
        const two = Math.random() < 0.25;
        H.push({
          x,
          z,
          w: rn(5.5, 8),
          d: rn(5, 7),
          h: two ? rn(6.6, 7.6) : rn(3.6, 4.8),
          ry: Math.atan2(-Math.cos(ang), -Math.sin(ang)),
          rh: rn(1.8, 2.7),
          c: PAL[(Math.random() * PAL.length) | 0],
        });
      }
    });
    const nH = H.length,
      roofG = new T.ConeGeometry(1, 1, 4, 1);
    roofG.rotateY(PI / 4);
    const bodyI = new T.InstancedMesh(
        new T.BoxGeometry(1, 1, 1),
        houseM,
        nH,
      ),
      roofI = new T.InstancedMesh(
        roofG,
        M(0xffffff, { roughness: 0.95 }),
        nH,
      ),
      chI = new T.InstancedMesh(
        new T.BoxGeometry(1, 1, 1),
        M(0x9c4a38),
        nH,
      );
    H.forEach((o, i) => {
      dm.rotation.set(0, o.ry, 0);
      dm.scale.set(o.w, o.h, o.d);
      dm.position.set(o.x, o.h / 2, o.z);
      dm.updateMatrix();
      bodyI.setMatrixAt(i, dm.matrix);
      bodyI.setColorAt(i, col.setHex(o.c).convertSRGBToLinear());
      dm.scale.set(o.w * 0.79, o.rh, o.d * 0.79);
      dm.position.set(o.x, o.h + o.rh / 2, o.z);
      dm.updateMatrix();
      roofI.setMatrixAt(i, dm.matrix);
      roofI.setColorAt(
        i,
        col
          .setHex(RF[(Math.random() * RF.length) | 0])
          .convertSRGBToLinear(),
      );
      const lx = o.w * 0.2,
        lz = o.d * 0.12,
        c = Math.cos(o.ry),
        sn = Math.sin(o.ry);
      dm.scale.set(0.8, 2.2, 0.8);
      dm.position.set(
        o.x + lx * c + lz * sn,
        o.h + o.rh * 0.45,
        o.z - lx * sn + lz * c,
      );
      dm.updateMatrix();
      chI.setMatrixAt(i, dm.matrix);
    });
    [bodyI, roofI, chI].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      sc.add(m);
    });

    /* ---- trees ---- */
    function trees(L, cast) {
      const P = L.filter((q) => q[2]),
        D = L.filter((q) => !q[2]),
        leaf = M(0xffffff, { roughness: 0.95 });
      if (P.length) {
        const pm = new T.InstancedMesh(
          new T.ConeGeometry(1, 2.4, 8),
          leaf,
          P.length * 3,
        );
        let k = 0;
        P.forEach((q) => {
          for (let j = 0; j < 3; j++) {
            const s = (2 - j * 0.5) * q[3];
            dm.rotation.set(0, Math.random() * 6, 0);
            dm.scale.set(s, 1.1 * q[3], s);
            dm.position.set(q[0], (2.4 + j * 1.5) * q[3], q[1]);
            dm.updateMatrix();
            pm.setMatrixAt(k, dm.matrix);
            pm.setColorAt(
              k++,
              col
                .setRGB(
                  0.08 + Math.random() * 0.08,
                  0.3 + Math.random() * 0.14,
                  0.16 + Math.random() * 0.06,
                )
                .convertSRGBToLinear(),
            );
          }
        });
        pm.castShadow = !!cast;
        pm.frustumCulled = false;
        sc.add(pm);
      }
      if (D.length) {
        const dc = new T.InstancedMesh(
          new T.IcosahedronGeometry(1, 1),
          leaf,
          D.length * 3,
        );
        let k = 0;
        D.forEach((q) => {
          for (let j = 0; j < 3; j++) {
            const s = rn(1.4, 2.3) * q[3];
            dm.rotation.set(0, 0, 0);
            dm.scale.setScalar(s);
            dm.position.set(
              q[0] + rn(-0.8, 0.8) * q[3],
              (3.4 + rn(0, 1.4)) * q[3],
              q[1] + rn(-0.8, 0.8) * q[3],
            );
            dm.updateMatrix();
            dc.setMatrixAt(k, dm.matrix);
            dc.setColorAt(
              k++,
              col
                .setRGB(
                  0.12 + Math.random() * 0.12,
                  0.36 + Math.random() * 0.16,
                  0.16 + Math.random() * 0.06,
                )
                .convertSRGBToLinear(),
            );
          }
        });
        dc.castShadow = !!cast;
        dc.frustumCulled = false;
        sc.add(dc);
      }
      const tk = new T.InstancedMesh(
        new T.CylinderGeometry(0.18, 0.26, 2.4, 6),
        M(0x5b4030),
        L.length,
      );
      L.forEach((q, i) => {
        dm.rotation.set(0, 0, 0);
        dm.scale.setScalar(q[3]);
        dm.position.set(q[0], 1.2 * q[3], q[1]);
        dm.updateMatrix();
        tk.setMatrixAt(i, dm.matrix);
      });
      tk.frustumCulled = false;
      sc.add(tk);
    }
    const R1 = [];
    for (let a = 0; a < 900 && R1.length < 220; a++) {
      const an = rn(0, 2 * PI),
        rr = rn(55, 112),
        p = polar(an, rr),
        x = p[0],
        z = p[1];
      if (
        Math.abs(rr - 50) < 5.5 ||
        Math.abs(rr - 90.5) < 5.5 ||
        nearAve(an, rr, 5) ||
        inZone(x, z, 1) ||
        H.some((o) => Math.hypot(o.x - x, o.z - z) < 6.5)
      )
        continue;
      R1.push([x, z, Math.random() < 0.5, rn(0.8, 1.3)]);
    }
    trees(R1, false);
    const FO = [];
    for (let i = 0; i < 850; i++) {
      const an = rn(0, 2 * PI),
        p = polar(an, rn(120, 190));
      FO.push([p[0], p[1], Math.random() < 0.85, rn(0.9, 1.9)]);
    }
    trees(FO, false);
    const K = [];
    for (let a = 0; a < 700 && K.length < 52; a++) {
      const an = rn(0, 2 * PI),
        rr = rn(5, 25.5),
        x = PRK[0] + Math.cos(an) * rr,
        z = PRK[1] + Math.sin(an) * rr,
        ex = (x - PRK[0]) / 16,
        ez = (z - PRK[1]) / 12;
      if (
        ex * ex + ez * ez < 1 ||
        Math.abs(x - PRK[0]) < 2.6 ||
        Math.abs(z - PRK[1]) < 2.6
      )
        continue;
      K.push([x, z, Math.random() < 0.5, rn(0.9, 1.5)]);
    }
    trees(K, true);
    const PZ = [];
    [
      [-17, 56],
      [17, 56],
      [-20, 68],
      [20, 68],
      [-14, 78],
      [14, 78],
      [-6, 50],
      [6, 50],
    ].forEach((q) => PZ.push([q[0], q[1], true, rn(1, 1.3)]));
    trees(PZ, true);

    /* ---- shared props ---- */
    const woodM = M(0x6b4a33),
      lampH = M(0xfff3c4, { emissive: 0xffd98a, emissiveIntensity: 3 });
    function bench(x, z, tx, tz) {
      const g = new T.Group();
      mesh(g, new T.BoxGeometry(2.2, 0.18, 0.7), woodM, 0, 0.55, 0);
      const b = mesh(
        g,
        new T.BoxGeometry(2.2, 0.6, 0.14),
        woodM,
        0,
        0.95,
        -0.3,
      );
      b.rotation.x = -0.15;
      mesh(
        g,
        new T.BoxGeometry(2.2, 0.08, 0.74),
        snowW,
        0,
        0.68,
        0,
        false,
      );
      [-1, 1].forEach((q) =>
        mesh(g, new T.BoxGeometry(0.12, 0.55, 0.6), dk, q * 0.9, 0.27, 0),
      );
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(tx - x, tz - z);
      sc.add(g);
    }
    function lamp(x, z) {
      const g = new T.Group();
      mesh(g, new T.CylinderGeometry(0.08, 0.12, 5, 6), dk, 0, 2.5, 0);
      mesh(g, new T.SphereGeometry(0.3, 8, 6), lampH, 0, 5.1, 0, false);
      g.position.set(x, 0, z);
      sc.add(g);
      LAMPS.push([x, 5.1, z]);
    }
    const LPS = [];
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * 2 * PI;
      if (!nearAve(a, 54, 4)) LPS.push(polar(a, 54.3));
    }
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * 2 * PI;
      if (!nearAve(a, 86.6, 4)) LPS.push(polar(a, 86.6));
    }
    const lpI = new T.InstancedMesh(
        new T.CylinderGeometry(0.08, 0.12, 5, 6),
        dk,
        LPS.length,
      ),
      lhI = new T.InstancedMesh(
        new T.SphereGeometry(0.28, 8, 6),
        lampH,
        LPS.length,
      );
    LPS.forEach((q, i) => {
      dm.rotation.set(0, 0, 0);
      dm.scale.setScalar(1);
      dm.position.set(q[0], 2.5, q[1]);
      dm.updateMatrix();
      lpI.setMatrixAt(i, dm.matrix);
      dm.position.set(q[0], 5.1, q[1]);
      dm.updateMatrix();
      lhI.setMatrixAt(i, dm.matrix);
      LAMPS.push([q[0], 5.0, q[1]]);
    });
    lpI.frustumCulled = lhI.frustumCulled = false;
    sc.add(lpI, lhI);
    const walkers = [],
      PC = [
        0xd33a3a, 0x2f6fe0, 0xf2b134, 0x2aa88f, 0x8e5bd6, 0xe36b9b,
        0x333a46,
      ];
    function person(cx, cz, a, b, sp) {
      const g = new T.Group();
      mesh(
        g,
        new T.CylinderGeometry(0.24, 0.3, 1, 8),
        M(PC[(Math.random() * PC.length) | 0], { roughness: 0.7 }),
        0,
        0.75,
        0,
      );
      mesh(g, new T.SphereGeometry(0.23, 10, 8), M(0xf0c9a4), 0, 1.5, 0);
      mesh(
        g,
        new T.SphereGeometry(0.25, 10, 6, 0, 6.283, 0, 1.4),
        M(0xffffff),
        0,
        1.56,
        0,
        false,
      );
      sc.add(g);
      walkers.push({ g, cx, cz, a, b, sp, ph: rn(0, 6.28) });
    }

    /* ---- city hall (balai kota) ---- */
    const hall = new T.Group(),
      civicM = M(0xffffff, {
        map: wallTex("#ece6d6", "#6f93b5"),
        emissive: 0xffffff,
        emissiveMap: wallEm(),
        emissiveIntensity: 1.4,
      }),
      copper = M(0x5f9d8f, { metalness: 0.3, roughness: 0.5 });
    [
      [30, 14, 0],
      [28, 12.4, 0.5],
      [26.4, 11, 1],
    ].forEach((q) =>
      mesh(
        hall,
        new T.BoxGeometry(q[0], 0.5, q[1]),
        stoneM,
        0,
        q[2] + 0.25,
        1.2,
      ),
    );
    wallBox(hall, 24, 8.5, 9, civicM, 0, 1.5, 0);
    mesh(hall, new T.BoxGeometry(25, 0.8, 10), stoneM, 0, 10.4, 0);
    mesh(hall, new T.BoxGeometry(25.3, 0.35, 10.3), snowW, 0, 10.97, 0);
    [-9, -5.4, -1.8, 1.8, 5.4, 9].forEach((x) =>
      mesh(
        hall,
        new T.CylinderGeometry(0.55, 0.62, 8.3, 14),
        stoneM,
        x,
        5.65,
        5.9,
      ),
    );
    mesh(hall, new T.BoxGeometry(21.6, 0.7, 2.8), stoneM, 0, 10.15, 5.9);
    const ps = new T.Shape();
    ps.moveTo(-10.8, 0);
    ps.lineTo(10.8, 0);
    ps.lineTo(0, 3.4);
    ps.closePath();
    const pd = mesh(
      hall,
      new T.ExtrudeGeometry(ps, { depth: 1.4, bevelEnabled: false }),
      stoneM,
      0,
      10.5,
      5.1,
    );
    const pc = new T.Shape();
    pc.moveTo(-11.1, -0.1);
    pc.lineTo(0, 3.65);
    pc.lineTo(11.1, -0.1);
    pc.closePath();
    const ph = new T.Path();
    ph.moveTo(-9.6, -0.1);
    ph.lineTo(0, 3.0);
    ph.lineTo(9.6, -0.1);
    ph.closePath();
    pc.holes.push(ph);
    mesh(
      hall,
      new T.ExtrudeGeometry(pc, { depth: 1.7, bevelEnabled: false }),
      snowW,
      0,
      10.5,
      4.95,
      false,
    );
    wallBox(hall, 6.4, 12, 6.4, civicM, 0, 11.15, -0.5);
    const clk = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      g.fillStyle = "#ece6d6";
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(64, 64, 52, 0, 7);
      g.fill();
      g.strokeStyle = "#2a3040";
      g.lineWidth = 5;
      g.stroke();
      g.lineWidth = 3;
      for (let k = 0; k < 12; k++) {
        const a = (k * PI) / 6;
        g.beginPath();
        g.moveTo(64 + Math.sin(a) * 43, 64 - Math.cos(a) * 43);
        g.lineTo(64 + Math.sin(a) * 49, 64 - Math.cos(a) * 49);
        g.stroke();
      }
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(64, 64);
      g.lineTo(64 + Math.sin(5.24) * 26, 64 - Math.cos(5.24) * 26);
      g.stroke();
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(64, 64);
      g.lineTo(64 + Math.sin(1.05) * 38, 64 - Math.cos(1.05) * 38);
      g.stroke();
      const t = new T.CanvasTexture(c);
      t.encoding = T.sRGBEncoding;
      return t;
    })();
    const cm = new T.MeshBasicMaterial({ map: clk }),
      cg = new T.PlaneGeometry(3.6, 3.6);
    [
      [0, 3.75, 0],
      [0, -4.77, PI],
      [3.27 + 0, -0.5, PI / 2],
      [-3.27, -0.5, -PI / 2],
    ].forEach((q, i) => {
      const m = new T.Mesh(cg, cm);
      if (i < 2) m.position.set(0, 19.2, q[1]);
      else m.position.set(q[0], 19.2, -0.5);
      m.rotation.y = q[2];
      hall.add(m);
    });
    mesh(hall, new T.BoxGeometry(7.6, 0.7, 7.6), stoneM, 0, 23.15, -0.5);
    mesh(
      hall,
      new T.ConeGeometry(5.3, 6, 4),
      copper,
      0,
      27.2,
      -0.5,
    ).rotation.y = PI / 4;
    mesh(
      hall,
      new T.ConeGeometry(1.9, 2.1, 4),
      snowW,
      0,
      29.4,
      -0.5,
      false,
    ).rotation.y = PI / 4;
    mesh(
      hall,
      new T.CylinderGeometry(0.07, 0.07, 4, 6),
      dk,
      0,
      32.4,
      -0.5,
    );
    const flag = mesh(
      hall,
      new T.PlaneGeometry(2.2, 1.3),
      new T.MeshStandardMaterial({ color: 0xd33a3a, side: T.DoubleSide }),
      1.15,
      33.4,
      -0.5,
      false,
    );
    hall.position.set(0, 0, 83.5);
    hall.rotation.y = PI;
    sc.add(hall);
    [
      [-14, 60.5],
      [14, 60.5],
    ].forEach((q) => {
      const g = new T.Group();
      mesh(g, new T.CylinderGeometry(0.08, 0.1, 9, 6), dk, 0, 4.5, 0);
      mesh(
        g,
        new T.PlaneGeometry(2, 1.2),
        new T.MeshStandardMaterial({
          color: q[0] < 0 ? 0x2f6fe0 : 0xf2f2f4,
          side: T.DoubleSide,
        }),
        1.05,
        8.2,
        0,
        false,
      );
      g.position.set(q[0], 0, q[1] + 8);
      sc.add(g);
    });
    flat(
      new T.CircleGeometry(16, 64),
      M(0xdfe4ea, { roughness: 0.9 }),
      0,
      0.04,
      66,
    );
    flat(
      new T.CircleGeometry(6.5, 48),
      M(0xeef2f6, { roughness: 0.9 }),
      0,
      0.05,
      66,
    );
    flat(
      new T.PlaneGeometry(7, 14),
      M(0xdfe4ea, { roughness: 0.9 }),
      0,
      0.045,
      78,
    );

    /* ---- statue (patung) ---- */
    const bronze = M(0x7fb1a1, { metalness: 0.5, roughness: 0.45 }),
      st = new T.Group();
    mesh(st, new T.BoxGeometry(4.4, 0.7, 4.4), stoneM, 0, 0.35, 0);
    mesh(st, new T.BoxGeometry(3.2, 2.4, 3.2), stoneM, 0, 1.9, 0);
    mesh(st, new T.BoxGeometry(3.8, 0.5, 3.8), stoneM, 0, 3.35, 0);
    mesh(st, new T.BoxGeometry(2.6, 0.15, 2.6), snowW, 0, 3.65, 0, false);
    mesh(
      st,
      new T.CylinderGeometry(0.5, 0.95, 2.8, 12),
      bronze,
      0,
      5.1,
      0,
    );
    mesh(
      st,
      new T.CylinderGeometry(0.5, 0.5, 1.1, 12),
      bronze,
      0,
      6.8,
      0,
    );
    mesh(st, new T.SphereGeometry(0.42, 14, 10), bronze, 0, 7.65, 0);
    const arm = mesh(
      st,
      new T.CylinderGeometry(0.14, 0.14, 2.3, 8),
      bronze,
      0.8,
      7.5,
      0,
    );
    arm.rotation.z = -0.35;
    mesh(
      st,
      new T.SphereGeometry(0.26, 10, 8),
      M(0xffa43a, { emissive: 0xff8a1a, emissiveIntensity: 3 }),
      1.3,
      8.7,
      0,
      false,
    );
    mesh(
      st,
      new T.SphereGeometry(0.3, 10, 6, 0, 6.283, 0, 1.3),
      snowW,
      0,
      7.98,
      0,
      false,
    );
    st.position.set(0, 0, 66);
    sc.add(st);
    const iceM = M(0xbfe3f5, { roughness: 0.08, metalness: 0.25 });
    [
      [-7, 59.5],
      [7, 59.5],
    ].forEach((q) => {
      const g = new T.Group();
      mesh(
        g,
        new T.CylinderGeometry(2.7, 2.9, 0.9, 20),
        stoneM,
        0,
        0.45,
        0,
      );
      mesh(
        g,
        new T.CylinderGeometry(2.3, 2.3, 0.15, 20),
        iceM,
        0,
        0.88,
        0,
        false,
      );
      mesh(g, new T.ConeGeometry(0.45, 2.6, 8), iceM, 0, 2, 0);
      g.position.set(q[0], 0, q[1]);
      sc.add(g);
    });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * PI + 0.2,
        x = Math.cos(a) * 13.8,
        z = 66 + Math.sin(a) * 13.8;
      if (z < 79) bench(x, z, 0, 66);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * PI + 0.39;
      lamp(Math.cos(a) * 15.6, 66 + Math.sin(a) * 15.6);
    }
    for (let k = 0; k < 8; k++)
      person(0, 66, 11.5, 11.5, (k % 2 ? -1 : 1) * rn(0.05, 0.08));

    /* ---- city park (taman kota) ---- */
    const px = PRK[0],
      pz = PRK[1];
    flat(
      new T.CircleGeometry(27, 64),
      M(0xf8fcff, { roughness: 0.95 }),
      px,
      0.045,
      pz,
    );
    const hedge = new T.Mesh(
      new T.TorusGeometry(26.5, 0.9, 6, 64),
      M(0x5f7f6a, { roughness: 0.95 }),
    );
    hedge.rotation.x = PI / 2;
    hedge.position.set(px, 0.6, pz);
    hedge.castShadow = true;
    sc.add(hedge);
    const hs = new T.Mesh(new T.TorusGeometry(26.5, 0.55, 6, 64), snowW);
    hs.rotation.x = PI / 2;
    hs.position.set(px, 1.15, pz);
    sc.add(hs);
    const pathM = M(0xd2cdc3, { roughness: 0.95 });
    let m = flat(new T.RingGeometry(0.93, 1.07, 64), pathM, px, 0.07, pz);
    m.scale.set(13.5, 9.5, 1);
    m = flat(new T.PlaneGeometry(3, 54), pathM, px, 0.06, pz);
    m = flat(new T.PlaneGeometry(54, 3), pathM, px, 0.06, pz);
    m = flat(
      new T.CircleGeometry(1, 48),
      M(0xe9eef4, { roughness: 0.9 }),
      px,
      0.08,
      pz,
    );
    m.scale.set(12, 8, 1);
    m = flat(new T.CircleGeometry(1, 48), iceM, px, 0.1, pz);
    m.scale.set(11, 7, 1);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * 2 * PI + 0.3,
        r = new T.Mesh(
          new T.IcosahedronGeometry(rn(0.5, 0.9), 0),
          M(0x9aa4b2, { flatShading: true }),
        );
      r.position.set(
        px + Math.cos(a) * 11.4,
        0.3,
        pz + Math.sin(a) * 7.4,
      );
      r.castShadow = true;
      sc.add(r);
      const c = new T.Mesh(
        new T.SphereGeometry(0.55, 8, 5, 0, 6.283, 0, 1.2),
        snowW,
      );
      c.position.set(r.position.x, 0.6, r.position.z);
      sc.add(c);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * PI + 0.4;
      bench(px + Math.cos(a) * 15.4, pz + Math.sin(a) * 11.2, px, pz);
    }
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * 2 * PI + 0.15;
      lamp(px + Math.cos(a) * 14.6, pz + Math.sin(a) * 10.6);
    }
    const gz = new T.Group();
    mesh(gz, new T.CylinderGeometry(3.5, 3.6, 0.4, 6), stoneM, 0, 0.2, 0);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 2 * PI;
      mesh(
        gz,
        new T.CylinderGeometry(0.18, 0.18, 3.6, 8),
        woodM,
        Math.cos(a) * 3.1,
        2.2,
        Math.sin(a) * 3.1,
      );
    }
    mesh(gz, new T.ConeGeometry(4.5, 2.2, 6), snowW, 0, 5.4, 0);
    mesh(gz, new T.CylinderGeometry(0.08, 0.08, 1, 6), dk, 0, 6.9, 0);
    gz.position.set(px + 12, 0, pz + 18);
    sc.add(gz);
    const mon = new T.Group();
    mesh(mon, new T.BoxGeometry(2.4, 0.6, 2.4), stoneM, 0, 0.3, 0);
    mesh(
      mon,
      new T.CylinderGeometry(0.5, 0.95, 7, 4),
      stoneM,
      0,
      4.1,
      0,
    ).rotation.y = PI / 4;
    mesh(
      mon,
      new T.ConeGeometry(0.55, 1.2, 4),
      bronze,
      0,
      8.2,
      0,
    ).rotation.y = PI / 4;
    mon.position.set(px - 13, 0, pz - 19);
    sc.add(mon);
    for (let k = 0; k < 8; k++)
      person(px, pz, 13.5, 9.5, (k % 2 ? -1 : 1) * rn(0.04, 0.07));

    /* ---- mountains: forest foot, rock body, snow cap ---- */
    const rockM = M(0x6d7d9a, { flatShading: true, roughness: 0.95 }),
      capM = M(0xf2f7ff, {
        flatShading: true,
        roughness: 0.9,
        emissive: 0x1a2a55,
        emissiveIntensity: 0.4,
      });
    const GM = [0x2d6a45, 0x275c3d, 0x356f48, 0x2a6350].map((c) =>
        M(c, { flatShading: true, roughness: 0.95 }),
      ),
      MTR = [];
    function peak(x, z, h, r) {
      const g = new T.Group();
      const a = new T.Mesh(
        new T.ConeGeometry(r, h, 7, 1),
        GM[(Math.random() * 4) | 0],
      );
      a.position.y = h / 2;
      const b = new T.Mesh(
        new T.ConeGeometry(r * 0.67, h * 0.66, 7, 1),
        rockM,
      );
      b.position.y = h * 0.67;
      const c = new T.Mesh(
        new T.ConeGeometry(r * 0.27, h * 0.26, 7, 1),
        capM,
      );
      c.position.y = h * 0.87;
      g.add(a, b, c);
      g.position.set(x, -1, z);
      g.rotation.y = rn(0, 6);
      sc.add(g);
      for (let i = 0, n = Math.min(26, Math.round(r / 5)); i < n; i++) {
        const an = rn(0, 2 * PI),
          d = r * rn(0.66, 0.86);
        MTR.push([
          x + Math.cos(an) * d,
          -1.5 + h * (1 - d / r),
          z + Math.sin(an) * d,
          rn(2.4, 4),
        ]);
      }
    }
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * 2 * PI + rn(-0.05, 0.05),
        r = rn(225, 262),
        h = rn(80, 150),
        p = polar(a, r);
      peak(p[0], p[1], h, h * rn(0.55, 0.8));
      const q = polar(a + 0.06, r - 10);
      peak(q[0], q[1], h * 0.55, h * 0.4);
    }
    rockM.color.setHex(0x7d8fa8);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * 2 * PI + rn(-0.08, 0.08),
        p = polar(a, rn(320, 350)),
        h = rn(130, 210);
      peak(p[0], p[1], h, h * rn(0.6, 0.85));
    }
    const hillM = M(0x3a7550, { roughness: 0.95 });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * 2 * PI + rn(-0.06, 0.06),
        p = polar(a, rn(195, 215)),
        s = rn(22, 40),
        sy = rn(8, 15),
        h = new T.Mesh(new T.SphereGeometry(1, 18, 10), hillM);
      h.scale.set(s, sy, s);
      h.position.set(p[0], -2, p[1]);
      h.receiveShadow = true;
      sc.add(h);
      for (let k = 0; k < 22; k++) {
        const an = rn(0, 2 * PI),
          d = s * rn(0.1, 0.78);
        MTR.push([
          p[0] + Math.cos(an) * d,
          -2 + sy * Math.sqrt(1 - (d / s) * (d / s)) - 0.3,
          p[1] + Math.sin(an) * d,
          rn(1.6, 2.4),
        ]);
      }
    }
    const tpi = new T.InstancedMesh(
      new T.ConeGeometry(1, 2.8, 7),
      M(0xffffff, { flatShading: true, roughness: 0.95 }),
      MTR.length * 2,
    );
    MTR.forEach((q, i) => {
      const s = q[3];
      for (let j = 0; j < 2; j++) {
        const w = (1.9 - j * 0.6) * s;
        dm.rotation.set(0, Math.random() * 6, 0);
        dm.scale.set(w, s, w);
        dm.position.set(q[0], q[1] + (1.6 + j * 1.5) * s, q[2]);
        dm.updateMatrix();
        tpi.setMatrixAt(i * 2 + j, dm.matrix);
        tpi.setColorAt(
          i * 2 + j,
          col
            .setRGB(
              0.06 + Math.random() * 0.08,
              0.26 + Math.random() * 0.16,
              0.15 + Math.random() * 0.06,
            )
            .convertSRGBToLinear(),
        );
      }
    });
    tpi.frustumCulled = false;
    sc.add(tpi);

    /* ---- outer ring traffic ---- */
    const NC = 24,
      cb = new T.InstancedMesh(
        new T.BoxGeometry(1, 1, 1),
        M(0xffffff, { roughness: 0.3, metalness: 0.5 }),
        NC,
      ),
      cc = new T.InstancedMesh(
        new T.BoxGeometry(1, 1, 1),
        M(0xffffff, { roughness: 0.1, metalness: 0.8 }),
        NC,
      ),
      CV = [],
      CCOL = [0xd33a3a, 0x2f6fe0, 0xf2f2f4, 0x1f2430, 0xf2b134, 0x2aa88f];
    for (let i = 0; i < NC; i++) {
      const lane = i % 2,
        r = i < 12 ? (lane ? 48.8 : 51.2) : lane ? 89.6 : 91.4;
      CV.push({ r, dir: lane ? -1 : 1, a: rn(0, 2 * PI), sp: rn(5, 8) });
      cb.setColorAt(i, col.setHex(CCOL[i % 6]).convertSRGBToLinear());
      cc.setColorAt(i, col.setHex(0x2b3d52).convertSRGBToLinear());
    }
    [cb, cc].forEach((q) => {
      q.castShadow = true;
      q.frustumCulled = false;
      sc.add(q);
    });
    let lastT = 0;
    bgU.push({
      set value(t) {
        const dt = Math.min(Math.max(t - lastT, 0), 0.1);
        lastT = t;
        CV.forEach((v, i) => {
          v.a += ((v.dir * v.sp) / v.r) * dt;
          const x = v.r * Math.cos(v.a),
            z = v.r * Math.sin(v.a),
            dx = -Math.sin(v.a) * v.dir,
            dz = Math.cos(v.a) * v.dir;
          dm.rotation.set(0, Math.atan2(dx, dz), 0);
          dm.scale.set(1.9, 0.8, 4.2);
          dm.position.set(x, 0.62, z);
          dm.updateMatrix();
          cb.setMatrixAt(i, dm.matrix);
          dm.scale.set(1.6, 0.55, 2.2);
          dm.position.set(x - dx * 0.3, 1.2, z - dz * 0.3);
          dm.updateMatrix();
          cc.setMatrixAt(i, dm.matrix);
        });
        cb.instanceMatrix.needsUpdate =
          cc.instanceMatrix.needsUpdate = true;
        walkers.forEach((w) => {
          const a = w.ph + t * w.sp,
            s = w.sp < 0 ? -1 : 1;
          w.g.position.set(
            w.cx + Math.cos(a) * w.a,
            Math.abs(Math.sin(t * 6 + w.ph)) * 0.05,
            w.cz + Math.sin(a) * w.b,
          );
          w.g.rotation.y = Math.atan2(
            -Math.sin(a) * w.a * s,
            Math.cos(a) * w.b * s,
          );
        });
        flag.rotation.y = Math.sin(t * 2.2) * 0.35;
        flag.position.x = 1.15 + Math.sin(t * 2.2) * 0.05;
      },
    });
  })();
  /* ===== NIGHT SKY, LAMP GLOW, ANIMALS, CLICK SNOW ===== */
  (() => {
    const PI = Math.PI,
      rn = (a, b) => a + Math.random() * (b - a),
      M = (c, o) =>
        new T.MeshStandardMaterial(
          Object.assign({ color: c, roughness: 0.85 }, o || {}),
        );
    const cvs = (w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    };
    const glow = (st) => {
      const c = cvs(128, 128),
        g = c.getContext("2d"),
        r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      st.forEach((q) => r.addColorStop(q[0], q[1]));
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
      const t = new T.CanvasTexture(c);
      t.encoding = T.sRGBEncoding;
      return t;
    };
    const ADD = {
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      fog: false,
    };

    /* stars, moon, aurora, shooting star */
    const sp = [];
    for (let i = 0; i < 2200; i++) {
      const a = rn(0, 2 * PI),
        y = rn(0.04, 0.95),
        r = Math.sqrt(1 - y * y);
      sp.push(Math.cos(a) * r * 900, y * 900, Math.sin(a) * r * 900);
    }
    const stg = new T.BufferGeometry();
    stg.setAttribute("position", new T.Float32BufferAttribute(sp, 3));
    const stm = new T.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
      fog: false,
      depthWrite: false,
    });
    sc.add(new T.Points(stg, stm));
    const mc = cvs(256, 256),
      mg = mc.getContext("2d"),
      mr = mg.createRadialGradient(128, 128, 20, 128, 128, 128);
    mr.addColorStop(0, "rgba(255,250,225,.55)");
    mr.addColorStop(0.35, "rgba(190,210,255,.18)");
    mr.addColorStop(1, "rgba(150,180,255,0)");
    mg.fillStyle = mr;
    mg.fillRect(0, 0, 256, 256);
    mg.fillStyle = "#fff7dc";
    mg.beginPath();
    mg.arc(128, 128, 46, 0, 7);
    mg.fill();
    mg.fillStyle = "rgba(200,190,160,.45)";
    [
      [112, 114, 9],
      [142, 140, 12],
      [130, 104, 6],
      [108, 148, 7],
    ].forEach((q) => {
      mg.beginPath();
      mg.arc(q[0], q[1], q[2], 0, 7);
      mg.fill();
    });
    const moon = new T.Sprite(
      new T.SpriteMaterial({
        map: new T.CanvasTexture(mc),
        transparent: true,
        fog: false,
        depthWrite: false,
      }),
    );
    moon.scale.set(240, 240, 1);
    moon.position.set(-380, 360, -600);
    sc.add(moon);
    const ac = cvs(256, 128),
      ag = ac.getContext("2d");
    for (let x = 0; x < 256; x++) {
      const g = ag.createLinearGradient(0, 128, 0, 0),
        k = 0.5 + 0.5 * Math.sin((x / 256) * PI * 6);
      g.addColorStop(0, "rgba(45,212,191,0)");
      g.addColorStop(0.25, "rgba(52,235,160," + (0.25 + 0.35 * k) + ")");
      g.addColorStop(0.6, "rgba(80,160,255," + (0.12 + 0.2 * k) + ")");
      g.addColorStop(1, "rgba(150,90,255,0)");
      ag.fillStyle = g;
      ag.fillRect(x, 0, 1, 128);
    }
    const au = [];
    [
      [0.2, 1.3],
      [2.4, 1.1],
      [4.1, 1.0],
    ].forEach((q, i) => {
      const t = new T.CanvasTexture(ac);
      t.wrapS = T.RepeatWrapping;
      t.repeat.set(2, 1);
      const mt = new T.MeshBasicMaterial(
        Object.assign({ map: t, side: T.BackSide, opacity: 0.5 }, ADD),
      );
      const m = new T.Mesh(
        new T.CylinderGeometry(
          560 + i * 30,
          560 + i * 30,
          150,
          64,
          1,
          true,
          q[0],
          q[1],
        ),
        mt,
      );
      m.position.y = 190 + i * 14;
      sc.add(m);
      au.push(mt);
    });
    const ssc = cvs(128, 8),
      ssg = ssc.getContext("2d"),
      ssl = ssg.createLinearGradient(0, 0, 128, 0);
    ssl.addColorStop(0, "rgba(255,255,255,0)");
    ssl.addColorStop(1, "rgba(255,255,255,1)");
    ssg.fillStyle = ssl;
    ssg.fillRect(0, 2, 128, 4);
    const shoot = new T.Sprite(
      new T.SpriteMaterial(
        Object.assign(
          { map: new T.CanvasTexture(ssc), opacity: 0, rotation: -0.5 },
          ADD,
        ),
      ),
    );
    shoot.scale.set(90, 4, 1);
    sc.add(shoot);
    const sh = { t: 4, life: 0, v: new T.Vector3() },
      bx = new T.Vector3(),
      by = new T.Vector3(),
      bz = new T.Vector3();

    /* every lamp lit: glow halo + pool of light on the snow */
    const warm = glow([
      [0, "rgba(255,236,170,1)"],
      [0.25, "rgba(255,200,100,.55)"],
      [1, "rgba(255,170,60,0)"],
    ]);
    const lg = new T.BufferGeometry();
    lg.setAttribute(
      "position",
      new T.Float32BufferAttribute(LAMPS.flat(), 3),
    );
    sc.add(
      new T.Points(
        lg,
        new T.PointsMaterial(Object.assign({ map: warm, size: 8 }, ADD)),
      ),
    );
    const pool = new T.InstancedMesh(
        new T.CircleGeometry(1, 24),
        new T.MeshBasicMaterial(
          Object.assign(
            {
              map: glow([
                [0, "rgba(255,210,130,.75)"],
                [1, "rgba(255,190,90,0)"],
              ]),
            },
            ADD,
          ),
        ),
        LAMPS.length,
      ),
      od = new T.Object3D();
    LAMPS.forEach((q, i) => {
      od.position.set(q[0], 0.12, q[2]);
      od.rotation.set(-PI / 2, 0, 0);
      od.scale.setScalar(7);
      od.updateMatrix();
      pool.setMatrixAt(i, od.matrix);
    });
    pool.frustumCulled = false;
    sc.add(pool);
    const PRK = [-78, 30];
    const bp = [
      ["about", 0, 46.8, 0],
      ["experience", 0, 66.2, 0],
      ["skills", -2, 48.2, -2],
      ["projects", 9.5, 37.4, -6],
      ["contact", 0, 28.4, 0],
    ].map((q) => {
      const n = N.find((o) => o.id === q[0]);
      return [n.x + q[1], q[2], n.z + q[3]];
    });
    const bg = new T.BufferGeometry();
    bg.setAttribute(
      "position",
      new T.Float32BufferAttribute(bp.flat(), 3),
    );
    const bm = new T.PointsMaterial(
      Object.assign(
        {
          map: glow([
            [0, "rgba(255,90,90,1)"],
            [0.3, "rgba(255,50,50,.6)"],
            [1, "rgba(255,40,40,0)"],
          ]),
          size: 9,
        },
        ADD,
      ),
    );
    sc.add(new T.Points(bg, bm));
    [
      [0xffa43a, 1.8, 46, 0, 9.5, 66],
      [0xffd9a0, 1.6, 60, 0, 12, 74],
    ].forEach((q) => {
      const l = new T.PointLight(q[0], q[1], q[2]);
      l.position.set(q[3], q[4], q[5]);
      sc.add(l);
    });

    /* campfire in the park */
    const fx = PRK[0] - 8,
      fz = PRK[1] + 17,
      fire = new T.Group(),
      fl = [];
    for (let k = 0; k < 5; k++) {
      const l = new T.Mesh(
        new T.CylinderGeometry(0.18, 0.18, 2, 6),
        M(0x4a2f1c),
      );
      const a = (k / 5) * 2 * PI;
      l.position.set(Math.cos(a) * 0.6, 0.25, Math.sin(a) * 0.6);
      l.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
      fire.add(l);
    }
    [
      [0.7, 0xff8a1a],
      [0.5, 0xffc43a],
      [0.3, 0xfff0a0],
    ].forEach((q) => {
      const f = new T.Mesh(
        new T.ConeGeometry(q[0], q[0] * 3.2, 7),
        new T.MeshBasicMaterial({
          color: q[1],
          transparent: true,
          opacity: 0.92,
          fog: false,
        }),
      );
      f.position.y = q[0] * 1.6 + 0.3;
      fire.add(f);
      fl.push(f);
    });
    const fh = new T.Sprite(
      new T.SpriteMaterial(Object.assign({ map: warm }, ADD)),
    );
    fh.scale.set(12, 12, 1);
    fh.position.y = 1.6;
    fire.add(fh);
    const fpl = new T.PointLight(0xff9a3c, 2.6, 52);
    fpl.position.y = 2.5;
    fire.add(fpl);
    fire.position.set(fx, 0, fz);
    sc.add(fire);

    /* fireflies */
    const FN = 140,
      fp = new Float32Array(FN * 3),
      fb = [];
    for (let i = 0; i < FN; i++) {
      const a = rn(0, 2 * PI),
        r = rn(4, 30),
        c = i % 3 ? PRK : [rn(-160, 160), rn(-160, 160)];
      fb.push([
        c[0] + Math.cos(a) * r,
        rn(1.5, 7),
        c[1] + Math.sin(a) * r,
        rn(0, 6.28),
      ]);
    }
    const fg = new T.BufferGeometry();
    fg.setAttribute("position", new T.BufferAttribute(fp, 3));
    const fm = new T.PointsMaterial(
      Object.assign(
        {
          map: glow([
            [0, "rgba(220,255,140,1)"],
            [0.3, "rgba(190,255,100,.5)"],
            [1, "rgba(160,255,80,0)"],
          ]),
          size: 2.6,
        },
        ADD,
      ),
    );
    sc.add(new T.Points(fg, fm));

    /* animals */
    const leg = (g, x, z, y, len, m, r) => {
      const geo = new T.CylinderGeometry(r, r * 0.8, len, 6);
      geo.translate(0, -len / 2, 0);
      const l = new T.Mesh(geo, m);
      l.position.set(x, y, z);
      l.castShadow = true;
      g.add(l);
      return l;
    };
    const ball = (g, r, m, x, y, z, sx, sy, sz) => {
      const o = new T.Mesh(new T.SphereGeometry(r, 10, 8), m);
      o.position.set(x, y, z);
      o.scale.set(sx || 1, sy || 1, sz || 1);
      o.castShadow = true;
      g.add(o);
      return o;
    };
    const cone = (g, r, h, m, x, y, z, rx, rz) => {
      const o = new T.Mesh(new T.ConeGeometry(r, h, 6), m);
      o.position.set(x, y, z);
      o.rotation.set(rx || 0, 0, rz || 0);
      g.add(o);
      return o;
    };
    const KIND = {
      deer() {
        const g = new T.Group(),
          b = M(0x9b6b44),
          w = M(0xf2e9d8),
          dk = M(0x2a1d14);
        ball(g, 1, b, 0, 1.9, 0, 1.5, 0.72, 0.65);
        ball(g, 0.3, w, -1.5, 2.2, 0);
        const nk = new T.Mesh(
          new T.CylinderGeometry(0.22, 0.32, 1.2, 7),
          b,
        );
        nk.position.set(1.3, 2.6, 0);
        nk.rotation.z = -0.7;
        g.add(nk);
        ball(g, 0.36, b, 1.85, 3.15, 0, 1.4, 0.9, 0.9);
        ball(g, 0.12, dk, 2.3, 3.05, 0);
        [-1, 1].forEach((z) =>
          cone(g, 0.07, 0.95, w, 1.7, 3.85, z * 0.25, z * 0.5, 0),
        );
        return {
          g,
          legs: [
            [0.9, 0.28],
            [0.9, -0.28],
            [-0.9, 0.28],
            [-0.9, -0.28],
          ].map((q) => leg(g, q[0], q[1], 1.4, 1.4, b, 0.1)),
          s: 1.7,
          e: "🦌",
        };
      },
      rabbit() {
        const g = new T.Group(),
          m = M(Math.random() < 0.5 ? 0xf1f3f7 : 0xb9b2a8, {
            roughness: 0.95,
          });
        ball(g, 0.5, m, 0, 0.55, 0, 1.2, 0.9, 0.9);
        ball(g, 0.3, m, 0.62, 0.85, 0);
        ball(g, 0.15, M(0xffffff), -0.62, 0.6, 0);
        [-1, 1].forEach((z) =>
          cone(g, 0.1, 0.7, m, 0.55, 1.35, z * 0.13, z * 0.15, -0.15),
        );
        return { g, legs: [], s: 1.8, e: "🐇", hop: 1 };
      },
      fox() {
        const g = new T.Group(),
          o = M(0xe2762a),
          w = M(0xffffff),
          dk = M(0x2a1d14);
        ball(g, 1, o, 0, 1.1, 0, 1.2, 0.5, 0.5);
        ball(g, 0.38, o, 1.3, 1.35, 0);
        cone(g, 0.16, 0.5, o, 1.75, 1.3, 0, 0, -PI / 2);
        ball(g, 0.07, dk, 2.05, 1.3, 0);
        [-1, 1].forEach((z) =>
          cone(g, 0.12, 0.35, o, 1.2, 1.8, z * 0.22),
        );
        ball(g, 0.45, o, -1.5, 1.15, 0, 1.6, 0.5, 0.5);
        ball(g, 0.2, w, -2.1, 1.15, 0, 1.2, 0.8, 0.8);
        return {
          g,
          legs: [
            [0.7, 0.22],
            [0.7, -0.22],
            [-0.7, 0.22],
            [-0.7, -0.22],
          ].map((q) => leg(g, q[0], q[1], 0.85, 0.85, dk, 0.08)),
          s: 1.6,
          e: "🦊",
        };
      },
      penguin() {
        const g = new T.Group(),
          k = M(0x1b1f2b),
          w = M(0xffffff),
          o = M(0xff9a2a);
        ball(g, 0.6, k, 0, 0.95, 0, 0.8, 1.2, 0.7);
        ball(g, 0.5, w, 0.22, 0.9, 0, 0.6, 1.05, 0.6);
        ball(g, 0.32, k, 0.05, 1.95, 0);
        cone(g, 0.09, 0.35, o, 0.35, 1.9, 0, 0, -PI / 2);
        [-1, 1].forEach((z) => {
          const f = new T.Mesh(new T.BoxGeometry(0.5, 0.08, 0.22), k);
          f.position.set(-0.1, 1, z * 0.55);
          f.rotation.x = z * 0.5;
          g.add(f);
          const ft = new T.Mesh(new T.BoxGeometry(0.4, 0.06, 0.25), o);
          ft.position.set(0.15, 0.06, z * 0.25);
          g.add(ft);
        });
        return { g, legs: [], s: 1.5, e: "🐧", sway: 1 };
      },
      owl() {
        const g = new T.Group(),
          b = M(0x8a7458),
          w = M(0xe9dcc3),
          ey = new T.MeshBasicMaterial({ color: 0xffd24a });
        ball(g, 0.5, b, 0, 0, 0, 1.1, 0.8, 0.8);
        ball(g, 0.35, w, 0.55, 0.25, 0);
        [-1, 1].forEach((z) => ball(g, 0.09, ey, 0.85, 0.32, z * 0.17));
        const wings = [-1, 1].map((z) => {
          const geo = new T.BoxGeometry(0.7, 0.06, 1.7);
          geo.translate(0, 0, z * 0.85);
          const m = new T.Mesh(geo, b);
          g.add(m);
          return m;
        });
        cone(g, 0.1, 0.3, M(0xe0a030), 1, 0.22, 0, 0, -PI / 2);
        return { g, legs: [], wings, s: 2.6, e: "🦉" };
      },
    };
    const A = [],
      turn = (a, b, k) =>
        a + (((b - a + PI * 3) % (2 * PI)) - PI) * Math.min(1, k);
    function add(kind, x, z, R, sp, extra) {
      const o = KIND[kind]();
      o.g.scale.setScalar(o.s);
      o.g.rotation.order = "YXZ";
      o.g.position.set(x, 0, z);
      sc.add(o.g);
      A.push(
        Object.assign(
          o,
          {
            kind,
            x,
            z,
            hx: x,
            hz: z,
            tx: x,
            tz: z,
            R,
            sp,
            th: rn(0, 6.28),
            wait: rn(0, 3),
            flee: 0,
            fth: 0,
            ph: rn(0, 6.28),
          },
          extra || {},
        ),
      );
    }
    const ring = (a, b) => {
      const an = rn(0, 2 * PI),
        r = rn(a, b);
      return [Math.cos(an) * r, Math.sin(an) * r];
    };
    for (let i = 0; i < 8; i++) {
      const p = ring(125, 175);
      add("deer", p[0], p[1], 20, 4);
    }
    for (let i = 0; i < 10; i++) {
      const p = ring(120, 180);
      add("rabbit", p[0], p[1], 14, 3);
    }
    for (let i = 0; i < 6; i++) {
      const p = ring(0, 18);
      add("rabbit", PRK[0] + p[0], PRK[1] + p[1], 16, 3);
    }
    for (let i = 0; i < 5; i++) {
      const p = ring(125, 180);
      add("fox", p[0], p[1], 24, 5);
    }
    for (let i = 0; i < 6; i++) {
      const p = ring(0, 4);
      add("penguin", PRK[0] + p[0], PRK[1] + p[1], 5, 1.6, { y0: 0.12 });
    }
    for (let i = 0; i < 7; i++)
      add("owl", 0, 0, rn(30, 120), 0, {
        fly: 1,
        ang: rn(0, 6.28),
        w: rn(0.03, 0.07) * (i % 2 ? -1 : 1),
        y: rn(25, 60),
        lift: 0,
      });
    function scare(p) {
      let best = null,
        bd = 1e9;
      A.forEach((a) => {
        const x = a.fly ? Math.cos(a.ang) * a.R : a.x,
          z = a.fly ? Math.sin(a.ang) * a.R : a.z,
          d = Math.hypot(x - p.x, z - p.z);
        if (d < 48) {
          a.flee = 2.4 + rn(0, 1);
          a.fth = Math.atan2(z - p.z, x - p.x) + rn(-0.4, 0.4);
          a.wait = 0;
          if (d < bd) {
            bd = d;
            best = a;
          }
        }
      });
      return best;
    }
    const pop = (e, x, y) => {
      const s = mk("span", "bt", e);
      s.style.fontSize = "26px";
      s.animate(
        [
          {
            transform:
              "translate(" +
              (x - 12) +
              "px," +
              (y - 12) +
              "px) scale(.5)",
            opacity: 0,
          },
          {
            transform:
              "translate(" +
              (x - 12) +
              "px," +
              (y - 40) +
              "px) scale(1.2)",
            opacity: 1,
            offset: 0.3,
          },
          {
            transform:
              "translate(" + (x - 12) + "px," + (y - 80) + "px) scale(1)",
            opacity: 0,
          },
        ],
        { duration: 1400, easing: "ease-out" },
      ).onfinish = () => s.remove();
    };

    /* click: snow bursts out of the world and scares nearby animals */
    const PN = 400,
      pp = new Float32Array(PN * 3).fill(-999),
      pv = new Float32Array(PN * 3),
      pl = new Float32Array(PN);
    let pc = 0;
    const pg = new T.BufferGeometry();
    pg.setAttribute("position", new T.BufferAttribute(pp, 3));
    const puff = new T.Points(
      pg,
      new T.PointsMaterial({
        map: glow([
          [0, "rgba(255,255,255,1)"],
          [0.55, "rgba(255,255,255,.85)"],
          [1, "rgba(210,230,255,0)"],
        ]),
        size: 2.4,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    puff.frustumCulled = false;
    sc.add(puff);
    const rc = new T.Raycaster(),
      pt = new T.Vector2(),
      plane = new T.Plane(new T.Vector3(0, 1, 0), 0),
      gp = new T.Vector3();
    cv.addEventListener("click", (e) => {
      if (moved > 6) return;
      pt.set(
        (e.clientX / innerWidth) * 2 - 1,
        (-e.clientY / innerHeight) * 2 + 1,
      );
      rc.setFromCamera(pt, cam);
      if (
        !rc.ray.intersectPlane(plane, gp) ||
        gp.distanceTo(cam.position) > 700
      )
        rc.ray.at(150, gp);
      for (let k = 0; k < 80; k++) {
        const i = pc++ % PN,
          a = rn(0, 2 * PI),
          s = rn(4, 18) * rn(0.3, 1);
        pp[i * 3] = gp.x;
        pp[i * 3 + 1] = Math.max(gp.y, 0) + 0.5;
        pp[i * 3 + 2] = gp.z;
        pv[i * 3] = Math.cos(a) * s;
        pv[i * 3 + 1] = rn(12, 36);
        pv[i * 3 + 2] = Math.sin(a) * s;
        pl[i] = rn(1.8, 3.2);
      }
      const b = scare(gp);
      if (b) {
        const v = b.g.position.clone().project(cam);
        pop(
          b.e,
          (v.x * 0.5 + 0.5) * innerWidth,
          (-v.y * 0.5 + 0.5) * innerHeight,
        );
      }
    });

    let lastT = 0;
    bgU.push({
      set value(t) {
        const dt = Math.min(Math.max(t - lastT, 0), 0.1);
        lastT = t;
        stm.opacity = 0.75 + 0.2 * Math.sin(t * 1.3);
        au.forEach((m, i) => {
          m.map.offset.x = t * 0.006 * (i + 1);
          m.opacity = 0.42 + 0.18 * Math.sin(t * 0.4 + i * 2);
        });
        bm.opacity = Math.sin(t * 3) > 0 ? 1 : 0.25;
        sh.t -= dt;
        if (sh.t < 0 && sh.life <= 0) {
          cam.matrixWorld.extractBasis(bx, by, bz);
          shoot.position
            .copy(cam.position)
            .addScaledVector(bz, -650)
            .addScaledVector(bx, rn(-380, 80))
            .addScaledVector(by, rn(150, 330));
          sh.v
            .copy(bx)
            .multiplyScalar(560 * Math.cos(0.5))
            .addScaledVector(by, -560 * Math.sin(0.5));
          sh.life = 1;
          sh.t = rn(5, 11);
        }
        if (sh.life > 0) {
          sh.life -= dt * 1.6;
          shoot.position.addScaledVector(sh.v, dt);
          shoot.material.opacity = Math.max(
            0,
            Math.sin(Math.max(0, sh.life) * PI),
          );
        }
        fl.forEach((f, i) => {
          f.scale.set(
            1 + 0.12 * Math.sin(t * 13 + i),
            1 + 0.25 * Math.sin(t * 9 + i * 2),
            1 + 0.12 * Math.cos(t * 11 + i),
          );
        });
        fpl.intensity =
          2.4 + 0.6 * Math.sin(t * 17) + 0.3 * Math.sin(t * 7);
        fm.opacity = 0.6 + 0.4 * Math.sin(t * 2.3);
        fb.forEach((q, i) => {
          fp[i * 3] = q[0] + Math.sin(t * 0.6 + q[3]) * 2.5;
          fp[i * 3 + 1] = q[1] + Math.sin(t * 0.9 + q[3] * 2) * 1.2;
          fp[i * 3 + 2] = q[2] + Math.cos(t * 0.5 + q[3]) * 2.5;
        });
        fg.attributes.position.needsUpdate = true;
        for (let i = 0; i < PN; i++) {
          if (pl[i] <= 0) {
            pp[i * 3 + 1] = -999;
            continue;
          }
          pl[i] -= dt;
          const j = i * 3;
          if (pp[j + 1] > 0) {
            pv[j + 1] -= 24 * dt;
            pp[j] += pv[j] * dt;
            pp[j + 1] += pv[j + 1] * dt;
            pp[j + 2] += pv[j + 2] * dt;
            if (pp[j + 1] < 0) pp[j + 1] = 0;
          }
        }
        pg.attributes.position.needsUpdate = true;
        A.forEach((a) => {
          const g = a.g;
          a.flee = Math.max(0, a.flee - dt);
          if (a.fly) {
            a.lift +=
              ((a.flee > 0 ? 22 : 0) - a.lift) * Math.min(1, dt * 2);
            a.ang += a.w * dt * (a.flee > 0 ? 3 : 1);
            const x = Math.cos(a.ang) * a.R,
              z = Math.sin(a.ang) * a.R,
              sg = a.w < 0 ? -1 : 1;
            g.position.set(
              x,
              a.y + Math.sin(t * 0.5 + a.R) * 3 + a.lift,
              z,
            );
            g.rotation.set(
              0,
              -Math.atan2(Math.cos(a.ang) * sg, -Math.sin(a.ang) * sg),
              0,
            );
            a.wings[0].rotation.x = Math.sin(t * 8 + a.R) * 0.6;
            a.wings[1].rotation.x = -a.wings[0].rotation.x;
            return;
          }
          const run = a.flee > 0;
          let dx = a.tx - a.x,
            dz = a.tz - a.z,
            d = Math.hypot(dx, dz);
          if (run) {
            if (Math.hypot(a.x - a.hx, a.z - a.hz) > a.R * 2.2)
              a.fth = Math.atan2(a.hz - a.z, a.hx - a.x);
            a.th = turn(a.th, a.fth, dt * 8);
          } else if (a.wait > 0) a.wait -= dt;
          else if (d < 1) {
            a.wait = rn(1.5, 5);
            const q = rn(0, 6.28),
              r = rn(0, a.R);
            a.tx = a.hx + Math.cos(q) * r;
            a.tz = a.hz + Math.sin(q) * r;
          } else a.th = turn(a.th, Math.atan2(dz, dx), dt * 3);
          const mv = run || (a.wait <= 0 && d >= 1),
            v = run ? a.sp * 3.2 : a.sp;
          if (mv) {
            a.x += Math.cos(a.th) * v * dt;
            a.z += Math.sin(a.th) * v * dt;
            a.ph += dt * v * (a.hop ? 1.6 : 1.1);
          }
          g.position.set(
            a.x,
            (a.y0 || 0) +
              (mv && a.hop ? Math.abs(Math.sin(a.ph * 2)) * 0.9 : 0),
            a.z,
          );
          g.rotation.set(
            a.sway && mv ? Math.sin(a.ph * 2) * 0.18 : 0,
            -a.th,
            a.hop && mv ? Math.cos(a.ph * 2) * 0.25 : 0,
          );
          a.legs.forEach((l, i) => {
            l.rotation.z = mv
              ? Math.sin(a.ph * 3 + (i % 2 ? PI : 0) + (i > 1 ? PI : 0)) *
                0.6
              : 0;
          });
        });
      },
    });
  })();

  const nodes = [],
    hit = [],
    pulses = [],
    labels = [];
  N.forEach((n, i) => {
    const g = new T.Group();
    g.position.set(n.x, 0, n.z);
    CITY.LM[n.m](g);
    sc.add(g);
    const hb = new T.Mesh(
      new T.BoxGeometry(n.fp[0] + 2, n.h, n.fp[1] + 2),
      new T.MeshBasicMaterial({ visible: false }),
    );
    hb.position.y = n.h / 2;
    hb.userData.i = i;
    g.add(hb);
    const rr = Math.max(n.fp[0], n.fp[1]) * 0.75,
      ring = new T.Mesh(
        new T.RingGeometry(rr, rr + 0.35, 64),
        new T.MeshBasicMaterial({
          color: 0x3b5bfd,
          transparent: true,
          opacity: 0.12,
          side: T.DoubleSide,
          depthWrite: false,
        }),
      );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    nodes.push({
      by: 0,
      ap: 0,
      g,
      model: g,
      ring,
      sat: [],
      cloud: null,
      k: {},
      hotv: 0,
      prox: 0,
      spin: 0,
      sc: 1,
    });
    hit.push(hb);
    const lab = mk(
      "div",
      "nl",
      "<b>" + n.t + "</b><small>" + n.s + "</small>",
    );
    lab.style.opacity = 0;
    labels.push(lab);
  });
  LD.step(2);

  /* camera / orbit state */
  const hubC = new T.Vector3(0, 7, 0),
    tgt = hubC.clone(),
    tgtT = hubC.clone();
  const MINZ = 22,
    MAXZ = 340,
    hubRad = () =>
      Math.min(330, 155 * Math.max(1, 1.3 / (innerWidth / innerHeight)));
  let thU = 0.6,
    phU = 1.0,
    th = thU,
    ph = phU,
    zoom = hubRad(),
    rad = 220,
    radT = 220,
    mode = "hub",
    vth = 0,
    vph = 0,
    idleAt = 0;
  const act = (i) => {
    const n = N[i];
    n.k === "link"
      ? window.open(n.u, "_blank", "noopener")
      : openPane(n.id);
  };
  flyTo = (id, cb) => {
    const n = N[N.findIndex((x) => x.id === id)];
    mode = "node";
    tgtT.set(n.x, n.h * 0.4, n.z);
    radT = Math.max(36, n.h * 1.15);
    setTimeout(cb, reduce ? 0 : 700);
  };
  flyBack = () => {
    mode = "hub";
    tgtT.copy(hubC);
    radT = zoom;
    idleAt = performance.now();
  };
  const setZoom = (z) => {
    zoom = clamp(z, MINZ, MAXZ);
    if (mode === "hub") radT = zoom;
    idleAt = performance.now();
    wake();
  };
  let introAt = 1e15,
    off = 0,
    scrollTh = 0,
    mxs = 0,
    mys = 0,
    hasPtr = false;
  const mSm = new T.Vector2(9, 9),
    lookP = new T.Vector3();
  LD.then(() => {
    radT = zoom;
    introAt = performance.now();
    let h = "";
    try {
      h = location.hash.slice(1);
    } catch (e) {}
    if (PAGES.indexOf(h) > -1) setTimeout(() => openPane(h, false), 600);
  });

  /* input: drag to orbit, wheel / pinch to zoom */
  const ray = new T.Raycaster(),
    mv = new T.Vector2(),
    ndc = new T.Vector2(),
    ptrs = new Map();
  let drag = false,
    moved = 0,
    lx = 0,
    ly = 0,
    pd = 0,
    pz = 0,
    hov = -1;
  const hitAt = (e) => {
    mv.set(
      (e.clientX / innerWidth) * 2 - 1,
      -(e.clientY / innerHeight) * 2 + 1,
    );
    ray.setFromCamera(mv, cam);
    const h = ray.intersectObjects(hit)[0];
    return h ? h.object.userData.i : -1;
  };
  cv.addEventListener("pointerdown", (e) => {
    if (mode !== "hub" || cur) return;
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    idleAt = performance.now();
    if (ptrs.size === 1) {
      drag = true;
      moved = 0;
      lx = e.clientX;
      ly = e.clientY;
      vth = vph = 0;
      cv.style.cursor = "grabbing";
    } else if (ptrs.size === 2) {
      const v = Array.from(ptrs.values());
      pd = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
      pz = zoom;
      drag = false;
      moved = 99;
    }
  });
  cv.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    idleAt = performance.now();
    if (ptrs.size === 2) {
      const v = Array.from(ptrs.values());
      setZoom(
        (pz * pd) /
          Math.max(20, Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1])),
      );
    } else if (drag) {
      const dx = e.clientX - lx,
        dy = e.clientY - ly;
      moved += Math.abs(dx) + Math.abs(dy);
      lx = e.clientX;
      ly = e.clientY;
      thU -= dx * 0.006;
      phU = clamp(phU - dy * 0.005, 0.4, 1.5);
      vth = -dx * 0.0035;
      vph = -dy * 0.003;
    }
  });
  const release = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const was = ptrs.size;
    ptrs.delete(e.pointerId);
    cv.style.cursor = "";
    if (was === 1 && drag && moved < 6) {
      const h = hitAt(e);
      if (h > -1) act(h);
    }
    if (!ptrs.size) drag = false;
  };
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", release);
  cv.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (mode === "hub")
        setZoom(zoom * Math.exp(e.deltaY * 0.0012 * (e.ctrlKey ? 3 : 1)));
    },
    { passive: false },
  );
  addEventListener("pointermove", (e) => {
    ndc.set(
      (e.clientX / innerWidth) * 2 - 1,
      -(e.clientY / innerHeight) * 2 + 1,
    );
    if (!hasPtr) {
      hasPtr = true;
      mSm.copy(ndc);
    }
    if (e.target === cv && !drag && mode === "hub") {
      hov = hitAt(e);
      setCursor(hov > -1, hov > -1 ? N[hov].t : "");
      cv.style.cursor = hov > -1 ? "pointer" : "";
    } else if (e.target !== cv) hov = -1;
  });
  $$(".zc button").forEach((b) =>
    b.addEventListener("click", () => {
      const a = b.getAttribute("data-z");
      if (a === "in") setZoom(zoom * 0.78);
      else if (a === "out") setZoom(zoom * 1.28);
      else {
        thU = 0.6;
        phU = 1.0;
        vth = vph = 0;
        setZoom(hubRad());
      }
    }),
  );
  document.documentElement.addEventListener("pointerleave", () => {
    hasPtr = false;
  });
  addEventListener("resize", () => {
    uAsp.value = innerWidth / innerHeight;
    R.setSize(innerWidth, innerHeight, false);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    wake();
  });

  /* external control API (hand gestures) */
  window.__hub = {
    busy: () => mode !== "hub" || !!cur,
    rotate(dx, dy) {
      if (mode !== "hub" || cur) return;
      thU -= dx * 0.006;
      phU = clamp(phU - dy * 0.005, 0.4, 1.5);
      vth = vph = 0;
      idleAt = performance.now();
      wake();
    },
    zoomBy(f) {
      if (mode === "hub" && !cur) setZoom(zoom * f);
    },
    scroll(dy) {
      if (cur) view.scrollTop -= dy * 1.6;
    },
    hover(x, y) {
      ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
      if (!hasPtr) {
        hasPtr = true;
        mSm.copy(ndc);
      }
      if (mode === "hub" && !cur && !drag) {
        hov = hitAt({ clientX: x, clientY: y });
        setCursor(hov > -1, hov > -1 ? N[hov].t : "");
      } else hov = -1;
      idleAt = performance.now();
      wake();
    },
    click(x, y) {
      const el = document.elementFromPoint(x, y);
      if (!el || el === cv) {
        if (mode === "hub" && !cur) {
          const h = hitAt({ clientX: x, clientY: y });
          if (h > -1) act(h);
        }
        return;
      }
      (
        el.closest(
          "a,button,[data-go],[data-close],summary,input,label",
        ) || el
      ).click();
    },
  };

  /* adaptive quality + lag shader */
  const busyEl = $("#busy"),
    busySh = window.__Sh($("#shb"), {
      S: 14,
      bg: false,
      center: (b) => [b.width / 2, b.height / 2],
    });
  let ema = 1 / 60,
    slowT = 0,
    fastT = 0,
    busyOn = false;
  function showBusy(on) {
    if (on === busyOn) return;
    busyOn = on;
    busyEl.classList.toggle("on", on);
    if (busySh)
      on
        ? busySh.start()
        : setTimeout(() => {
            if (!busyOn) busySh.stop();
          }, 350);
  }
  function perf(dt) {
    ema += (dt - ema) * 0.1;
    if (ema > 0.036) {
      slowT += dt;
      fastT = 0;
    } else {
      slowT = 0;
      fastT += dt;
    }
    if (slowT > 1.2) {
      slowT = 0;
      showBusy(true);
      if (dpr > 0.8) {
        dpr = Math.max(0.75, dpr - 0.4);
        R.setPixelRatio(dpr);
        R.setSize(innerWidth, innerHeight, false);
      }
    }
    if (fastT > 3) showBusy(false);
  }

  /* render loop */
  const dummy = new T.Object3D(),
    up = new T.Vector3(0, 1, 0),
    tmp = new T.Vector3(),
    tmp2 = new T.Vector3();
  let last = performance.now(),
    frames = 0,
    lblA = 0,
    dirty = true;
  wake = () => {
    dirty = true;
    last = performance.now();
  };
  function loop(now) {
    requestAnimationFrame(loop);
    if (paused && !dirty) return;
    dirty = false;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const t = now / 1000;
    if (frames > 4) perf(dt);
    const k = 1 - Math.exp(-dt * 5);
    if (!drag && !reduce && now - idleAt > 2500 && ptrs.size === 0)
      thU += dt * (mode === "hub" ? 0.05 : 0.025);
    const f60 = dt * 60;
    thU += vth * f60;
    phU = clamp(phU + vph * f60, 0.4, 1.5);
    vth *= Math.pow(0.92, f60);
    vph *= Math.pow(0.92, f60);
    const sT = cur
      ? clamp(
          view.scrollTop / Math.max(1, view.scrollHeight - innerHeight),
          0,
          1,
        ) * 1.1
      : 0;
    scrollTh += (sT - scrollTh) * k;
    mxs += (ndc.x - mxs) * k * 0.6;
    mys += (ndc.y - mys) * k * 0.6;
    th += (thU + scrollTh + mxs * 0.14 - th) * k;
    ph += (clamp(phU - mys * 0.09, 0.35, 1.52) - ph) * k;
    rad += (radT - rad) * k;
    tgt.lerp(tgtT, k);
    off += ((cur && innerWidth > 860 ? 3.4 : 0) - off) * k;
    tmp
      .set(
        rad * Math.sin(ph) * Math.sin(th),
        rad * Math.cos(ph),
        rad * Math.sin(ph) * Math.cos(th),
      )
      .add(tgt);
    cam.position.copy(tmp);
    lookP.set(
      tgt.x - Math.cos(th) * off,
      tgt.y,
      tgt.z + Math.sin(th) * off,
    );
    cam.lookAt(lookP);
    if (hasPtr) mSm.lerp(ndc, 1 - Math.exp(-dt * 14));
    else mSm.set(9, 9);
    uM.value.copy(mSm);
    const asp = innerWidth / innerHeight,
      show =
        !cur &&
        !moving &&
        mode === "hub" &&
        document.body.classList.contains("paned") === false &&
        !document.getElementById("splash");
    lblA += ((show ? 1 : 0) - lblA) * Math.min(1, k * 2);
    nodes.forEach((n, i) => {
      tmp2.copy(n.g.position);
      tmp2.y += N[i].h * 0.5;
      tmp2.project(cam);
      const d = Math.hypot((tmp2.x - ndc.x) * asp, tmp2.y - ndc.y);
      n.prox += (Math.max(0, 1 - d / 0.35) - n.prox) * 0.12;
      const hot = Math.max(fine ? n.prox : 0, hov === i ? 1 : 0);
      n.spin += dt * hot * 2.2;

      const ap = clamp((now - introAt - i * 90) / 900, 0, 1),
        eb = 1 + 2.7 * Math.pow(ap - 1, 3) + 1.7 * Math.pow(ap - 1, 2);
      n.g.position.y = n.by;
      n.ring.material.opacity = 0.4 + n.hotv * 0.6;
      n.hotv += (hot - n.hotv) * 0.12;
      for (const q in n.k) n.k[q].emissiveIntensity = n.hotv * 0.35;
      n.sc += (1 + hot * 0.03 - n.sc) * 0.08;
      n.g.scale.setScalar(Math.max(0.001, n.sc * eb));
      n.sat.forEach((s) => {
        const a = t * s.userData.s + s.userData.o;
        s.position.set(
          Math.cos(a) * s.userData.r,
          s.userData.y,
          Math.sin(a) * s.userData.r,
        );
      });
      const l = labels[i];
      if (lblA > 0.02 && tmp2.z < 1) {
        tmp2.copy(n.g.position);
        tmp2.y += N[i].h * n.sc * Math.min(1, eb) + 2;
        tmp2.project(cam);
        l.style.transform =
          "translate(" +
          (tmp2.x * 0.5 + 0.5) * innerWidth +
          "px," +
          (-tmp2.y * 0.5 + 0.5) * innerHeight +
          "px) translate(-50%,-100%)";
        l.style.opacity = lblA;
        l.classList.toggle("hot", hot > 0.55);
      } else l.style.opacity = 0;
    });
    pulses.forEach((p) => {
      const u = p.userData;
      u.t = (u.t + u.s * dt) % 1;
      p.position.lerpVectors(u.a, u.b, u.t);
    });
    tokG.children.forEach((s) => {
      s.position.y =
        s.userData.b + Math.sin(t * 0.4 + s.userData.o) * 0.6;
    });
    bgU.forEach((u) => {
      u.value = t;
    });
    bgRings.forEach((r, i) => {
      r.rotation.z = t * (0.03 + i * 0.015) * (i % 2 ? -1 : 1);
    });
    debris.forEach((q, qi) =>
      q.d.forEach((o, i) => {
        dummy.position.set(
          o.x + Math.sin(t * 0.2 + o.o) * 1.2,
          o.y + Math.sin(t * 0.4 + o.o) * 0.9,
          o.z,
        );
        dummy.rotation.set(
          o.r[0] + t * o.v,
          o.r[1] + t * o.v * 0.8,
          o.r[2],
        );
        dummy.scale.setScalar(o.s);
        dummy.updateMatrix();
        q.m.setMatrixAt(i, dummy.matrix);
        if (i === q.d.length - 1) q.m.instanceMatrix.needsUpdate = true;
      }),
    );
    R.render(sc, cam);
    if (++frames === 3) LD.step(3);
  }
  requestAnimationFrame(loop);
})();

