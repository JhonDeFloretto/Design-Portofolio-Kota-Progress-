/* Splash screen + loader shader */
(function () {
  "use strict";
  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS =
    "precision mediump float;uniform vec2 uC;uniform float uT,uP,uS,uBg;" +
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
    "void main(){vec2 p=gl_FragCoord.xy-uC;float r=length(p)/uS;float ang=atan(p.y,p.x);" +
    "vec3 c1=vec3(.23,.36,.99);vec3 c2=vec3(.05,.58,.53);vec3 col=mix(c1,c2,.5+.5*sin(ang+uT));float a=0.;" +
    "float t=fract((-ang+uT*2.8)/6.28318);float ring=1.-smoothstep(0.,.035,abs(r-1.));" +
    "a+=ring*(.12+pow(t,2.2)*.88);" +
    "if(uP>=0.){float rp=1.-smoothstep(0.,.03,abs(r-1.22));float pa=fract((1.5707963-ang)/6.28318);a+=rp*(pa<uP?.9:.1);}" +
    "if(uBg>.5){float pu=fract(uT*.5);float pr=1.-smoothstep(0.,.04,abs(r-(1.+pu*3.5)));a+=pr*(1.-pu)*.22;" +
    "vec2 g=gl_FragCoord.xy/22.;vec2 f=fract(g);vec2 id=floor(g);float bx=step(.2,f.x)*step(f.x,.8)*step(.2,f.y)*step(f.y,.8);" +
    "float on=step(.9,h(id+floor(uT*1.5+h(id)*5.)));a+=on*bx*smoothstep(7.,2.,r)*.35;}" +
    "a=clamp(a,0.,1.);gl_FragColor=vec4(col*a,a);}";

  /* tiny reusable shader spinner */
  window.__Sh = function (canvas, o) {
    try {
      var g = canvas.getContext("webgl", {
        premultipliedAlpha: true,
        alpha: true,
      });
      if (!g) return null;
      var mk = function (t, s) {
        var x = g.createShader(t);
        g.shaderSource(x, s);
        g.compileShader(x);
        return x;
      };
      var p = g.createProgram();
      g.attachShader(p, mk(g.VERTEX_SHADER, VS));
      g.attachShader(p, mk(g.FRAGMENT_SHADER, FS));
      g.linkProgram(p);
      if (!g.getProgramParameter(p, g.LINK_STATUS)) return null;
      g.useProgram(p);
      g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
      g.bufferData(
        g.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        g.STATIC_DRAW,
      );
      var l = g.getAttribLocation(p, "a");
      g.enableVertexAttribArray(l);
      g.vertexAttribPointer(l, 2, g.FLOAT, false, 0, 0);
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      g.clearColor(0, 0, 0, 0);
      var U = function (n) {
          return g.getUniformLocation(p, n);
        },
        uC = U("uC"),
        uT = U("uT"),
        uP = U("uP"),
        uS = U("uS"),
        uBg = U("uBg");
      var raf = 0,
        t0 = performance.now(),
        P = -1,
        d = 1;
      function size() {
        d = Math.min(window.devicePixelRatio || 1, 2);
        var b = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, b.width * d);
        canvas.height = Math.max(1, b.height * d);
        g.viewport(0, 0, canvas.width, canvas.height);
      }
      function draw() {
        raf = requestAnimationFrame(draw);
        var c = o.center(canvas.getBoundingClientRect());
        g.clear(g.COLOR_BUFFER_BIT);
        g.uniform2f(uC, c[0] * d, canvas.height - c[1] * d);
        g.uniform1f(uT, (performance.now() - t0) / 1000);
        g.uniform1f(uP, P);
        g.uniform1f(uS, o.S * d);
        g.uniform1f(uBg, o.bg ? 1 : 0);
        g.drawArrays(g.TRIANGLES, 0, 3);
      }
      window.addEventListener("resize", size);
      return {
        start: function () {
          if (!raf) {
            size();
            draw();
          }
        },
        stop: function () {
          cancelAnimationFrame(raf);
          raf = 0;
        },
        set: function (v) {
          P = v;
        },
      };
    } catch (e) {
      return null;
    }
  };

  /* page loader */
  var sp = document.getElementById("splash"),
        bar = sp.querySelector(".ld i");
  var lines = [
      "loading 3D engine",
      "compiling shaders",
      "building scene",
      "ready",
    ],
    stage = 0,
    fin = false,
    cbs = [],
    t0 = performance.now(),
    fonts = false;
  var sh = window.__Sh(document.getElementById("shl"), {
    S: 58,
    bg: 1,
    center: function () {
      var m = sp.querySelector(".mark").getBoundingClientRect();
      return [m.left + m.width / 2, m.top + m.height / 2];
    },
  });
  document.documentElement.classList.add("lock");
  function render() {
    bar.style.width = ((stage + 1) / lines.length) * 100 + "%";
    if (sh) sh.set((stage + 1) / lines.length);
  }
  function finish() {
    if (fin) return;
    fin = true;
    sp.classList.add("done");
    document.documentElement.classList.remove("lock");
    setTimeout(function () {
      if (sh) sh.stop();
      sp.remove();
    }, 1000);
    cbs.forEach(function (f) {
      f();
    });
  }
  function maybe() {
    if (fin || stage < 3 || !fonts) return;
    setTimeout(finish, Math.max(0, 1200 - (performance.now() - t0)));
  }
  (document.fonts && document.fonts.ready
    ? document.fonts.ready
    : Promise.resolve()
  ).then(function () {
    fonts = true;
    maybe();
  });
  setTimeout(function () {
    fonts = true;
    maybe();
  }, 4500);
  render();
  if (sh) sh.start();
  sp.addEventListener("click", finish);
  window.__ld = {
    step: function (n) {
      if (n > stage) {
        stage = n;
        render();
        maybe();
      }
    },
    then: function (f) {
      fin ? f() : cbs.push(f);
    },
  };
})();