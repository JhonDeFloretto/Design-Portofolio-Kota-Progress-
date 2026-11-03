/* ===== Hand gesture control (MediaPipe Hands, runs locally in the browser) ===== */
(function () {
  "use strict";
  const BASE =
    "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = document.createElement("div");
  wrap.innerHTML =
    '<button class="gbtn" type="button" aria-pressed="false"><i></i>✋<span class="gt"> Gesture</span></button>' +
    '<div id="gpanel"><button class="gx" type="button" aria-label="Tutup panel gesture" title="Tutup (Esc)">×</button><div class="gcam"><video playsinline muted></video><canvas></canvas></div>' +
    '<div id="gstat">Menyiapkan…</div>' +
    '<details class="gtips" open><summary>ⓘ Panduan gerakan</summary><b>🖐 Telapak terbuka</b> geser kiri/kanan = putar · naik/turun = scroll<br><b>☝️ Telunjuk saja</b> = menunjuk<br><b>👍 Jempol naik</b> = klik<br><b>Dua tangan</b> renggang/rapat = zoom<br><i>Mundur ±50 cm, seluruh telapak terlihat.</i></details></div>';
  const btn = wrap.children[0],
    panel = wrap.children[1];
  document.body.appendChild(btn);
  document.body.appendChild(panel);
  const cur = document.createElement("div");
  cur.id = "gcur";
  document.body.appendChild(cur);
  const vid = panel.querySelector("video"),
    ov = panel.querySelector("canvas"),
    octx = ov.getContext("2d"),
    stat = panel.querySelector("#gstat");
  const say = (t) => {
    if (stat.textContent !== t) stat.textContent = t;
  };

  let hands = null,
    stream = null,
    running = false,
    sending = false,
    libP = null;
  let pinN = 0,
    sx = null,
    sy = null,
    pin = null,
    lockUntil = 0,
    lastSeen = 0,
    prevD = null,
    zy = null,
    mode = "";

  function loadLib() {
    if (window.Hands) return Promise.resolve();
    return (
      libP ||
      (libP = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = BASE + "hands.js";
        s.crossOrigin = "anonymous";
        s.onload = res;
        s.onerror = () => {
          libP = null;
          rej(new Error("lib"));
        };
        document.head.appendChild(s);
      }))
    );
  }
  async function start() {
    btn.classList.add("on");
    btn.setAttribute("aria-pressed", "true");
    panel.classList.add("on");
    say("Memuat model tangan…");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
        throw new Error("nocam");
      await loadLib();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      vid.srcObject = stream;
      await vid.play();
      ov.width = vid.videoWidth || 640;
      ov.height = vid.videoHeight || 480;
      if (!hands) {
        hands = new window.Hands({ locateFile: (f) => BASE + f });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.4,
        });
        hands.onResults(onResults);
      }
      running = true;
      say("Tunjukkan tangan ke kamera");
      tick();
    } catch (e) {
      say(
        e && e.name === "NotAllowedError"
          ? "Izin kamera ditolak. Aktifkan di pengaturan browser."
          : e && e.message === "nocam"
            ? "Kamera butuh https:// atau localhost."
            : "Gagal memuat (cek koneksi / kamera).",
      );
      stop(true);
    }
  }
  function stop(keepMsg) {
    running = false;
    pin = null;
    prevD = null;
    zy = null;
    sx = sy = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    vid.srcObject = null;
    cur.style.display = "none";
    btn.classList.remove("on");
    btn.setAttribute("aria-pressed", "false");
    if (!keepMsg) panel.classList.remove("on");
  }
  btn.addEventListener("click", () => (running ? stop() : start()));
  panel.querySelector(".gx").addEventListener("click", () => stop());
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("on")) stop();
  });

  async function tick() {
    if (!running) return;
    if (!sending && vid.readyState >= 2) {
      sending = true;
      try {
        await hands.send({ image: vid });
      } catch (e) {}
      sending = false;
    }
    if (running) requestAnimationFrame(tick);
  }

  const vw = () => vid.videoWidth || 640,
    vh = () => vid.videoHeight || 480;
  const dist = (a, b) =>
    Math.hypot((a.x - b.x) * vw(), (a.y - b.y) * vh());
  const dist3 = (a, b) =>
    Math.hypot(
      (a.x - b.x) * vw(),
      (a.y - b.y) * vh(),
      ((a.z || 0) - (b.z || 0)) * vw(),
    );
  const palm = (lm) =>
    Math.max(
      dist3(lm[0], lm[9]),
      dist3(lm[5], lm[17]),
      dist3(lm[0], lm[5]) * 0.9,
      1,
    );
  const ext = (lm, tip, pip) =>
    dist(lm[tip], lm[0]) > dist(lm[pip], lm[0]) * 1.15;

  function draw(L, pinching) {
    octx.clearRect(0, 0, ov.width, ov.height);
    L.forEach((lm) => {
      octx.fillStyle = "rgba(255,255,255,.85)";
      lm.forEach((p) => {
        octx.beginPath();
        octx.arc(p.x * ov.width, p.y * ov.height, 3, 0, 6.283);
        octx.fill();
      });
      if (pinching) {
        octx.strokeStyle = "#0d9488";
        octx.lineWidth = 3;
        octx.beginPath();
        octx.moveTo(lm[4].x * ov.width, lm[4].y * ov.height);
        octx.lineTo(lm[8].x * ov.width, lm[8].y * ov.height);
        octx.stroke();
      }
    });
  }
  function place(x, y, cls) {
    sx = sx == null ? x : sx + (x - sx) * 0.4;
    sy = sy == null ? y : sy + (y - sy) * 0.4;
    cur.style.display = "block";
    cur.style.transform = "translate(" + sx + "px," + sy + "px)";
    cur.className = cls || "";
    cur.id = "gcur";
  }
  function lost() {
    pinN = 0;
    if (pin) pin = null;
    poseNow = cand = "";
    candN = 0;
    pv = null;
    armed = true;
    prevD = null;
    zy = null;
    sx = sy = null;
    cur.style.display = "none";
    octx.clearRect(0, 0, ov.width, ov.height);
    say(
      "Tangan tidak terlihat. Mundur sedikit & tunjukkan seluruh telapak.",
    );
  }
  function flash() {
    cur.classList.add("clk");
    setTimeout(() => cur.classList.remove("clk"), 220);
  }

  function onResults(r) {
    const L = r.multiHandLandmarks || [],
      now = performance.now();
    if (!L.length) {
      draw([], false);
      if (now - lastSeen > 600) lost();
      return;
    }
    lastSeen = now;
    if (L.length >= 2) twoHands(L);
    else oneHand(L[0], now);
  }

  function twoHands(L) {
    draw(L, false);
    if (pin) {
      pin = null;
    }
    lockUntil = performance.now() + 500;
    zy = null;
    const a = L[0][9],
      b = L[1][9];
    const d = Math.hypot((a.x - b.x) * vw(), (a.y - b.y) * vh()) / vh();
    const mx = ((1 - (a.x + b.x) / 2 - 0.12) / 0.76) * innerWidth,
      my = (((a.y + b.y) / 2 - 0.1) / 0.7) * innerHeight;
    place(clamp(mx, 0, innerWidth), clamp(my, 0, innerHeight), "zm");
    if (prevD != null && d > 0.05) {
      const f = prevD / d;
      if (Math.abs(Math.log(f)) > 0.008)
        window.__hub.zoomBy(Math.pow(f, 1.4));
    }
    prevD = prevD == null ? d : prevD + (d - prevD) * 0.5;
    say(
      window.__hub.busy()
        ? "Dua tangan (zoom aktif di tampilan 3D)"
        : "Zoom dua tangan",
    );
  }

  const mapX = (v) => clamp((1 - v - 0.12) / 0.76, 0, 1) * innerWidth,
    mapY = (v) => clamp((v - 0.1) / 0.7, 0, 1) * innerHeight;
  let cand = "",
    candN = 0,
    poseNow = "",
    armed = true,
    clickLock = 0,
    lastPt = null,
    pv = null;

  function classify(lm, ratio) {
    const i = ext(lm, 8, 6),
      m = ext(lm, 12, 10),
      r = ext(lm, 16, 14),
      k = ext(lm, 20, 18);
    const thumbOut =
      dist3(lm[4], lm[5]) > palm(lm) * 0.55 &&
      dist(lm[4], lm[0]) > dist(lm[2], lm[0]) * 1.1;
    if (i && m && r && k) return "palm";
    if (i && m && !r && !k && ratio > 0.5) return "peace";
    if (i && !m && !r && !k) return "point";
    if (!i && !m && !r && !k && thumbOut && lm[4].y < lm[2].y)
      return "thumb";
    return "other";
  }

  function oneHand(lm, now) {
    prevD = null;
    const H = window.__hub,
      ratio = dist3(lm[4], lm[8]) / palm(lm);
    const raw = classify(lm, ratio);
    candN = raw === cand ? candN + 1 : 1;
    cand = raw;
    if (candN >= 2 && raw !== poseNow) {
      poseNow = raw;
      pv = null;
      zy = null;
      if (raw !== "thumb") armed = true;
    }
    draw([lm], poseNow === "thumb");
    const pose = poseNow;
    const cx = mapX(lm[9].x),
      cy = mapY(lm[9].y);

    if (pose === "point") {
      /* menunjuk */
      place(mapX(lm[8].x), mapY(lm[8].y), "");
      lastPt = { x: sx, y: sy, t: now };
      H.hover(sx, sy);
      say("☝️ Menunjuk");
      return;
    }
    if (pose === "thumb") {
      /* klik */
      const pt =
        lastPt && now - lastPt.t < 2500 ? lastPt : { x: cx, y: cy };
      place(pt.x, pt.y, "pin");
      sx = pt.x;
      sy = pt.y;
      if (armed && now > clickLock) {
        armed = false;
        clickLock = now + 800;
        flash();
        H.click(pt.x, pt.y);
        say("👍 Klik!");
      } else say("👍 Klik! (turunkan jempol untuk klik lagi)");
      return;
    }
    if (pose === "peace") {
      /* zoom satu tangan */
      place(cx, cy, "zm");
      const yy = lm[9].y;
      if (zy != null) H.zoomBy(Math.exp((yy - zy) * 4));
      zy = yy;
      say("✌️ Zoom: naik = perbesar, turun = perkecil");
      return;
    }
    if (pose === "palm") {
      /* geser / scroll */
      sx = sy = null;
      place(cx, cy, "zm");
      sx = cx;
      sy = cy;
      lastPt = { x: cx, y: cy, t: now };
      if (pv) {
        const dx = cx - pv.x,
          dy = cy - pv.y,
          ax = Math.abs(dx),
          ay = Math.abs(dy);
        if (ax > 1.5 || ay > 1.5) {
          if (ax > ay * 1.4) {
            H.rotate(dx, 0);
            say(H.busy() ? "🖐 Geser kiri/kanan" : "🖐 Putar kiri/kanan");
          } else if (ay > ax * 1.4) {
            if (H.busy()) H.scroll(dy * 1.5);
            else H.rotate(0, dy);
            say(
              H.busy()
                ? "🖐 Scroll atas/bawah"
                : "🖐 Miringkan atas/bawah",
            );
          }
        } else say("🖐 Telapak: geser kiri/kanan atau naik/turun");
      } else say("🖐 Telapak: geser kiri/kanan atau naik/turun");
      pv = { x: cx, y: cy };
      return;
    }
    place(cx, cy, "");
    pv = null;
    say("Tunjukkan telapak, telunjuk, atau jempol");
  }
})();

