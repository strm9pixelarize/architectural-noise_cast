/* cast.architectural-n.net トップページのスクリプト (v4 で index.html から分離)
   元は cast-top-draft-v3.html の <script> ブロック2つを連結したもの。 */
(function () {
  "use strict";
  var API = "https://cast.architectural-n.net/api/nowplaying/nerurus_room_rest";
  var audio = document.getElementById("radio-audio");
  var song = { elapsed: 0, duration: 0 };

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }
  function fmtHMS(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return [h, m, s].map(function (n) { return String(n).padStart(2, "0"); }).join(":");
  }

  /* ===== 番組表データ =====
     SCHEDULE は実際に放送している番組 (ラジオ側 schedule/*.yaml の
     グリッドと一致させること)。PLANNED は将来その枠に入る予定の
     テーマ番組で、その間は SCHEDULE 側が放送中。 */
  var SCHEDULE = {
    monThu: { 12: "ブログトーク", 15: "ガジェットマニア", 18: "自鯖のある生活", 21: "ガジェットマニア" },
    fri:    { 12: "ブログトーク", 15: "ガジェットマニア", 18: "ガジェットマニア", 21: "ガジェットマニア" },
    sat:    { 12: "ガジェットマニア", 15: "ガジェットマニア（週末版）", 18: "自鯖のある生活（休日メンテ編）", 21: "ガジェットマニア" },
    sun:    { 12: "ガジェットマニア", 15: "ガジェットマニア", 18: "ガジェットマニア", 21: "ガジェットマニア" }
  };
  var PLANNED = {
    monThu: { 21: "ねるるの日常" },
    fri:    { 18: "土曜日、日曜日に行きたい！関東の魅力再発見！", 21: "朗読" },
    sat:    { 12: "関東お出かけガイド", 21: "ねるるの日常（週末版）" },
    sun:    { 12: "お昼、何食べる？", 18: "いま、このインディーズバンドが熱い！！！", 21: "ねるるの眠れない話" }
  };
  var SLOT_HOURS = [12, 15, 18, 21];
  function patternOf(date) {
    var d = date.getDay();
    return d === 0 ? "sun" : d === 5 ? "fri" : d === 6 ? "sat" : "monThu";
  }
  function slotStart(date, hour) {
    var t = new Date(date); t.setHours(hour, 0, 0, 0); return t;
  }
  // 現在の長編枠 (開始から60分未満なら放送中扱い) と、次の長編枠を返す
  function programState(now) {
    var pat = patternOf(now), current = null, next = null;
    SLOT_HOURS.forEach(function (h) {
      var start = slotStart(now, h);
      if (now >= start && now - start < 60 * 60 * 1000) current = { hour: h, title: SCHEDULE[pat][h] };
      if (start > now && !next) next = { at: start, title: SCHEDULE[pat][h] };
    });
    if (!next) {
      var tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
      next = { at: slotStart(tomorrow, 12), title: SCHEDULE[patternOf(tomorrow)][12] };
    }
    return { current: current, next: next };
  }
  // 次のスポット (毎時15分=交通 / 45分=天気)
  function nextSpot(now) {
    var candidates = [];
    [0, 1].forEach(function (addH) {
      [15, 45].forEach(function (min) {
        var t = new Date(now); t.setHours(now.getHours() + addH, min, 0, 0);
        if (t > now) candidates.push({ at: t, label: min === 15 ? "交通情報" : "天気情報" });
      });
    });
    candidates.sort(function (a, b) { return a.at - b.at; });
    return candidates[0];
  }

  var selectedPattern = patternOf(new Date());
  function renderSchedule() {
    document.querySelectorAll("#day-tabs button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.pattern === selectedPattern);
    });
    var now = new Date(), state = programState(now);
    var isToday = selectedPattern === patternOf(now);
    var tbody = document.getElementById("schedule-body");
    tbody.innerHTML = "";
    SLOT_HOURS.forEach(function (h) {
      var tr = document.createElement("tr");
      var onair = isToday && state.current && state.current.hour === h;
      if (onair) tr.className = "onair";
      var th = document.createElement("th"); th.className = "mono"; th.textContent = h + "時";
      var td = document.createElement("td"); td.textContent = SCHEDULE[selectedPattern][h];
      if (onair) {
        var tag = document.createElement("span"); tag.className = "onair-tag"; tag.textContent = "ON AIR";
        td.appendChild(tag);
      }
      var planned = PLANNED[selectedPattern][h];
      var note = document.createElement("span"); note.className = "planned";
      note.textContent = planned ? "将来: " + planned + "（制作中）" : "";
      td.appendChild(note);
      tr.appendChild(th); tr.appendChild(td); tbody.appendChild(tr);
    });
  }
  document.getElementById("day-tabs").addEventListener("click", function (e) {
    if (e.target.dataset && e.target.dataset.pattern) {
      selectedPattern = e.target.dataset.pattern; renderSchedule();
    }
  });

  function tickClock() {
    var now = new Date();
    document.getElementById("clock").textContent =
      [now.getHours(), now.getMinutes(), now.getSeconds()].map(function (n) {
        return String(n).padStart(2, "0");
      }).join(":");
    var state = programState(now);
    document.getElementById("countdown").textContent = fmtHMS((state.next.at - now) / 1000);
    document.getElementById("next-program").textContent =
      "次は " + state.next.at.getHours() + "時〜「" + state.next.title + "」";
    var spot = nextSpot(now);
    document.getElementById("next-spot").textContent =
      "次のスポットは " + spot.at.getHours() + ":" + String(spot.at.getMinutes()).padStart(2, "0") +
      " の" + spot.label + "（あと約" + Math.max(1, Math.round((spot.at - now) / 60000)) + "分）";
    document.getElementById("hero-program").innerHTML = state.current
      ? "この時間は <b>" + state.current.hour + "時〜「" + state.current.title + "」</b> の枠です"
      : "次の長編は <b>" + state.next.at.getHours() + "時〜「" + state.next.title + "」</b> です";
    // 曲の進行を1秒ずつ進める (API取得の合間の補間)
    if (song.duration > 0 && song.elapsed < song.duration) {
      song.elapsed += 1; renderProgress();
    }
  }

  /* ===== Now Playing ===== */
  function renderProgress() {
    var pct = song.duration > 0 ? Math.min(100, song.elapsed / song.duration * 100) : 0;
    document.getElementById("np-progress").style.width = pct + "%";
    document.getElementById("pb-progress").style.width = pct + "%";
    document.getElementById("fs-progress").style.width = pct + "%";
    document.getElementById("np-time").textContent = fmt(song.elapsed) + " / " + fmt(song.duration);
    document.getElementById("fs-time").textContent = fmt(song.elapsed) + " / " + fmt(song.duration);
  }
  function update() {
    fetch(API).then(function (r) { return r.json(); }).then(function (d) {
      var np = d.now_playing || {}, s = np.song || {};
      var title = s.title || "—", artist = s.artist || "";
      document.getElementById("now-playing").textContent = title;
      document.getElementById("now-artist").textContent = artist;
      document.getElementById("pb-title").textContent = "ON AIR // " + title;
      document.getElementById("pb-artist").textContent = artist || "ねるるラジオ";
      document.getElementById("fs-title").textContent = title;
      document.getElementById("fs-artist").textContent = artist;
      if (s.art) {
        document.getElementById("np-art").src = s.art;
        document.getElementById("pb-art").src = s.art;
        document.getElementById("fs-art").src = s.art;
        document.getElementById("fs-bg").style.backgroundImage = 'url("' + s.art + '")';
      }
      song.elapsed = np.elapsed || 0; song.duration = np.duration || 0;
      renderProgress();
      var next = d.playing_next && d.playing_next.song
        ? "次: " + (d.playing_next.song.artist ? d.playing_next.song.artist + " — " : "") + d.playing_next.song.title
        : "";
      document.getElementById("now-next").textContent = next;
      document.getElementById("fs-next").textContent = next;
      var n = d.listeners ? d.listeners.current : 0;
      document.getElementById("now-listeners").textContent = "リスナー: " + n + "人";
      document.getElementById("fs-listeners").textContent = "リスナー: " + n + "人";
      var hist = document.getElementById("history");
      hist.innerHTML = "";
      (d.song_history || []).slice(0, 5).forEach(function (h) {
        var li = document.createElement("li");
        var name = document.createElement("span");
        name.textContent = (h.song.artist ? h.song.artist + " — " : "") + h.song.title;
        var t = document.createElement("span"); t.className = "t mono";
        var played = new Date(h.played_at * 1000);
        t.textContent = played.getHours() + ":" + String(played.getMinutes()).padStart(2, "0");
        li.appendChild(name); li.appendChild(t); hist.appendChild(li);
      });
    }).catch(function () {
      document.getElementById("now-playing").textContent = "Now Playing を取得できませんでした";
    });
  }

  /* ===== 放送内容 (生成側が出す program_<枠>_latest.json を表示) =====
     鮮度ガード: 生成日時が「その枠の開始 -70分 〜 開始 +65分」の範囲内の
     JSON だけを採用する。生成失敗で前日の JSON が残っていても、昨日の
     内容を今日の放送として出さないため。 */
  function renderContent() {
    var section = document.getElementById("content-section");
    var now = new Date();
    var state = programState(now);
    var hour, start, upcoming;
    if (state.current) {
      hour = state.current.hour;
      start = slotStart(now, hour);
      upcoming = false;
    } else {
      hour = state.next.at.getHours();
      start = state.next.at;
      upcoming = true;
    }
    fetch("data/program_" + hour + "_latest.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var gen = new Date(d.generated_at);
        if (isNaN(gen) || gen < new Date(start.getTime() - 70 * 60000) ||
            gen > new Date(start.getTime() + 65 * 60000)) {
          throw new Error("stale");
        }
        var topics = Array.isArray(d.topics) ? d.topics : [];
        var pickup = d.blog_pickup || {};
        if (!topics.length && !pickup.title) throw new Error("empty");
        document.getElementById("content-heading").textContent =
          upcoming ? "次の番組の内容" : "いまの番組の内容";
        var prog = (d.program || "") + "（" + hour + "時枠";
        if (d.duration_sec) prog += " / " + fmt(d.duration_sec);
        document.getElementById("content-program").textContent = prog + "）";
        var ul = document.getElementById("content-topics");
        ul.innerHTML = "";
        topics.forEach(function (t) {
          var li = document.createElement("li");
          li.textContent = t;
          ul.appendChild(li);
        });
        ul.style.display = topics.length ? "" : "none";
        var pk = document.getElementById("content-pickup");
        pk.innerHTML = "";
        if (pickup.title) {
          pk.appendChild(document.createTextNode("ブログピックアップ: "));
          if (pickup.url) {
            var a = document.createElement("a");
            a.href = pickup.url;
            a.textContent = pickup.title;
            pk.appendChild(a);
          } else {
            pk.appendChild(document.createTextNode(pickup.title));
          }
          if (pickup.date) {
            pk.appendChild(document.createTextNode("（" + pickup.date + "）"));
          }
        }
        pk.style.display = pickup.title ? "" : "none";
        var ex = document.getElementById("content-excerpt");
        ex.textContent = pickup.excerpt || "";
        ex.style.display = pickup.excerpt ? "" : "none";
        document.getElementById("content-meta").textContent =
          "この内容は " + gen.getHours() + ":" +
          String(gen.getMinutes()).padStart(2, "0") + " に生成されました";
        section.hidden = false;
      })
      .catch(function () { section.hidden = true; });
  }

  /* ===== 再生コントロール (ヒーローとバーで同期) ===== */
  function setPlayingUI(playing) {
    document.getElementById("play-big").textContent = playing ? "⏸" : "▶";
    document.getElementById("pb-play").textContent = playing ? "⏸" : "▶";
    document.getElementById("fs-play").textContent = playing ? "⏸" : "▶";
    document.getElementById("hero").classList.toggle("playing", playing);
    document.getElementById("fs-overlay").classList.toggle("playing", playing);
  }
  function togglePlay() {
    if (audio.paused) { audio.play(); } else { audio.pause(); }
  }
  document.getElementById("play-big").addEventListener("click", togglePlay);
  document.getElementById("pb-play").addEventListener("click", togglePlay);
  document.getElementById("fs-play").addEventListener("click", togglePlay);
  audio.addEventListener("play", function () { setPlayingUI(true); });
  audio.addEventListener("pause", function () { setPlayingUI(false); });
  document.getElementById("pb-vol").addEventListener("input", function (e) {
    audio.volume = parseFloat(e.target.value);
    document.getElementById("fs-vol").value = e.target.value;
  });
  document.getElementById("fs-vol").addEventListener("input", function (e) {
    audio.volume = parseFloat(e.target.value);
    document.getElementById("pb-vol").value = e.target.value;
  });

  /* ===== 全画面プレイヤーの開閉 ===== */
  var overlay = document.getElementById("fs-overlay");
  function openFs() { overlay.classList.add("open"); document.body.classList.add("fs-lock"); }
  function closeFs() { overlay.classList.remove("open"); document.body.classList.remove("fs-lock"); }
  document.querySelector(".playerbar").addEventListener("click", function (e) {
    if (e.target.closest("button, input")) return; // 再生ボタン・音量・拡大ボタンは除外
    openFs();
  });
  document.getElementById("pb-expand").addEventListener("click", openFs);
  document.getElementById("np-art").addEventListener("click", openFs);
  document.getElementById("fs-close").addEventListener("click", closeFs);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeFs(); });
  audio.volume = 0.8;

  /* ===== スクロールでふわっと出す ===== */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) en.target.classList.add("on"); });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  renderSchedule();
  update();
  renderContent();
  setInterval(update, 30000);
  setInterval(renderContent, 30000);
  tickClock();
  setInterval(tickClock, 1000);
  setInterval(renderSchedule, 60000);
})();

/* 演出エフェクト: カーソル軌跡 + クリックバースト (本家 effects.js の移植・軽量版)
   ヘッダーの FX ボタンで ON/OFF、状態は localStorage 保存。
   prefers-reduced-motion の環境では初回 OFF。粒子が無いときは描画停止。 */
(function () {
  "use strict";
  var KEY = "cast-fx-enabled", BRAND = "252,167,63", SUB = "14,165,233";
  var btn = document.getElementById("fx-toggle");
  var saved = localStorage.getItem(KEY);
  var enabled = saved === "on" ? true : saved === "off" ? false
    : !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = null, ctx = null, raf = null, particles = [], lastTrail = 0;
  function applyBtn() { btn.setAttribute("aria-pressed", String(enabled)); }
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90;";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    var resize = function () {
      var dpr = window.devicePixelRatio || 1;
      canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); addEventListener("resize", resize);
  }
  function loop() {
    if (!enabled) { raf = null; return; }
    raf = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter(function (p) { return p.life > 0; });
    particles.forEach(function (p) {
      p.life -= p.decay;
      if (p.type === "trail") {
        p.y -= 0.3;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size * p.life), 0, 7);
        ctx.fillStyle = "rgba(" + p.color + "," + 0.55 * p.life + ")"; ctx.fill();
      } else if (p.type === "spark") {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12;
        if (p.y > innerHeight - 4) { p.y = innerHeight - 4; p.vy *= -0.45; }
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size * p.life), 0, 7);
        ctx.fillStyle = "rgba(" + p.color + "," + 0.85 * p.life + ")"; ctx.fill();
      } else {
        p.r += 2.6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.strokeStyle = "rgba(" + p.color + "," + 0.6 * p.life + ")"; ctx.lineWidth = 2; ctx.stroke();
      }
    });
    if (!particles.length) { cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function kick() { if (enabled && raf === null) { ensureCanvas(); raf = requestAnimationFrame(loop); } }
  addEventListener("mousemove", function (e) {
    if (!enabled || performance.now() - lastTrail < 24) return;
    lastTrail = performance.now();
    particles.push({ type: "trail", x: e.clientX + (Math.random() - .5) * 8, y: e.clientY + (Math.random() - .5) * 8,
      size: 2 + Math.random() * 2.5, life: 1, decay: 0.03 + Math.random() * 0.02,
      color: Math.random() < 0.75 ? BRAND : SUB });
    kick();
  });
  addEventListener("click", function (e) {
    if (!enabled) return;
    particles.push({ type: "ring", x: e.clientX, y: e.clientY, r: 2, life: 1, decay: 0.045, color: BRAND });
    for (var i = 0; i < 10; i++) {
      var a = Math.PI * 2 * i / 10 + Math.random() * 0.4, sp = 1.6 + Math.random() * 2.4;
      particles.push({ type: "spark", x: e.clientX, y: e.clientY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        size: 2 + Math.random() * 2, life: 1, decay: 0.02 + Math.random() * 0.015,
        color: Math.random() < 0.75 ? BRAND : SUB });
    }
    kick();
  });
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    enabled = !enabled;
    localStorage.setItem(KEY, enabled ? "on" : "off");
    applyBtn();
    if (!enabled && ctx) ctx.clearRect(0, 0, innerWidth, innerHeight);
  });
  applyBtn();
})();
