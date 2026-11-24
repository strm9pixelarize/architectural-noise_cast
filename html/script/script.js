/* cast.architectural-n.net トップページのスクリプト (v4 で index.html から分離)
   元は cast-top-draft-v3.html の <script> ブロック2つを連結したもの。 */
(function () {
  "use strict";
  /* ===== ステーション切替 (通常 / ALL DAY) =====
     コマンド all-day で、深夜枠の「健全なものリスト」を終日流す
     別ステーション (nerurus_room_allday) に切り替える。 */
  var BASE = "https://cast.architectural-n.net";
  var STATIONS = {
    normal: { code: "nerurus_room_rest", id: 11 },
    allday: { code: "nerurus_room_allday", id: 12 }
  };
  var mode = "normal";
  try { if (localStorage.getItem("cast-mode") === "allday") mode = "allday"; } catch (e) {}
  function st() { return STATIONS[mode]; }
  function apiUrl() { return BASE + "/api/nowplaying/" + st().code; }
  function reqApiUrl() { return BASE + "/api/station/" + st().code + "/requests"; }
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
    fetch(apiUrl()).then(function (r) { return r.json(); }).then(function (d) {
      var np = d.now_playing || {}, s = np.song || {};
      var title = s.title || "—", artist = s.artist || "";
      document.getElementById("now-playing").textContent = title;
      document.getElementById("now-artist").textContent = artist;
      document.getElementById("pb-title").textContent = "ON AIR // " + title;
      document.getElementById("pb-artist").textContent = artist || "ねるるラジオ";
      document.getElementById("fs-title").textContent = title;
      document.getElementById("fs-artist").textContent = artist;
      renderArtistInfo(artist);
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
      // 歌詞 (API の song.lyrics。無い曲ではブロックごと隠す)
      var lyrics = (s.lyrics || "").trim();
      [["np-lyrics", "np-lyrics-body"], ["fs-lyrics", "fs-lyrics-body"]].forEach(function (pair) {
        var box = document.getElementById(pair[0]);
        var bodyEl = document.getElementById(pair[1]);
        if (!box || !bodyEl) return;
        if (lyrics) {
          if (bodyEl.textContent !== lyrics) {
            bodyEl.textContent = lyrics;
            if (box.tagName === "DETAILS") box.open = false;
          }
          box.hidden = false;
        } else {
          box.hidden = true;
          bodyEl.textContent = "";
        }
      });
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
        document.getElementById("content-topics-label").hidden = !topics.length;
        var ak = document.getElementById("content-akiba");
        ak.innerHTML = "";
        var akiba = Array.isArray(d.akiba_pickup) ? d.akiba_pickup : [];
        akiba.forEach(function (a2) {
          var p = document.createElement("p"); p.className = "pickup";
          p.appendChild(document.createTextNode("AKIBAピックアップ: "));
          if (a2.url) {
            var link = document.createElement("a");
            link.href = a2.url; link.textContent = a2.title || a2.url;
            p.appendChild(link);
          } else {
            p.appendChild(document.createTextNode(a2.title || ""));
          }
          ak.appendChild(p);
          if (a2.excerpt) {
            var ep = document.createElement("p"); ep.className = "pickup-excerpt";
            ep.textContent = a2.excerpt;
            ak.appendChild(ep);
          }
        });
        ak.hidden = !akiba.length;
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
        var fp = d.friend_pickup || {};
        var fk = document.getElementById("content-friend");
        fk.innerHTML = "";
        if (fp.title) {
          fk.appendChild(document.createTextNode(
            "友人のブログ「" + (fp.blog_name || "エレクトロライフ") + "」: "));
          if (fp.url) {
            var fa = document.createElement("a");
            fa.href = fp.url; fa.textContent = fp.title;
            fk.appendChild(fa);
          } else {
            fk.appendChild(document.createTextNode(fp.title));
          }
          if (fp.date) {
            fk.appendChild(document.createTextNode("（" + fp.date + "）"));
          }
        }
        fk.style.display = fp.title ? "" : "none";
        var fx = document.getElementById("content-friend-excerpt");
        fx.textContent = fp.excerpt || "";
        fx.style.display = fp.excerpt ? "" : "none";
        document.getElementById("content-meta").textContent =
          "この内容は " + gen.getHours() + ":" +
          String(gen.getMinutes()).padStart(2, "0") + " に生成されました";
        section.hidden = false;
      })
      .catch(function () { section.hidden = true; });
  }

  /* ===== 再生コントロール (ヒーローとバーで同期) ===== */
  var ICON_PLAY = '<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  function setPlayingUI(playing) {
    var icon = playing ? ICON_PAUSE : ICON_PLAY;
    document.getElementById("play-big").innerHTML = icon;
    document.getElementById("pb-play").innerHTML = icon;
    document.getElementById("fs-play").innerHTML = icon;
    document.getElementById("hero").classList.toggle("playing", playing);
    document.getElementById("fs-overlay").classList.toggle("playing", playing);
  }
  function togglePlay() {
    if (audio.paused) { audio.play(); } else { audio.pause(); }
  }
  document.getElementById("play-big").addEventListener("click", togglePlay);
  document.getElementById("pb-play").addEventListener("click", togglePlay);
  document.getElementById("fs-play").addEventListener("click", togglePlay);
  audio.addEventListener("play", function () { setPlayingUI(true); stopPreview(); });
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
  var fsScrollY = null; // 全画面表示前のスクロール位置 (背面固定と復元用)
  function openFs() {
    if (fsScrollY === null) {
      fsScrollY = window.scrollY || 0;
      document.body.style.top = "-" + fsScrollY + "px";
    }
    overlay.classList.add("open");
    document.body.classList.add("fs-lock");
  }
  function closeFs() {
    overlay.classList.remove("open");
    document.body.classList.remove("fs-lock");
    if (fsScrollY !== null) {
      document.body.style.top = "";
      window.scrollTo(0, fsScrollY);
      fsScrollY = null;
    }
  }
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

  /* ===== リンク (links.json で設定。読めなければ静的リンクのまま) ===== */
  function renderLinks() {
    var box = document.getElementById("links-list");
    if (!box) return;
    fetch("links.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var links = Array.isArray(d.links) ? d.links : [];
        if (!links.length) return;
        box.innerHTML = "";
        links.forEach(function (item) {
          if (!item || !item.url || !item.title) return;
          var a = document.createElement("a");
          a.className = "link-card"; a.href = item.url;
          if (item.image) {
            var img = document.createElement("img");
            img.className = "link-thumb"; img.src = item.image; img.alt = "";
            a.appendChild(img);
          }
          var body = document.createElement("span"); body.className = "link-body";
          var t = document.createElement("span"); t.className = "link-title";
          t.textContent = item.title;
          body.appendChild(t);
          if (item.description) {
            var ds = document.createElement("span"); ds.className = "link-desc";
            ds.textContent = item.description;
            body.appendChild(ds);
          }
          a.appendChild(body);
          box.appendChild(a);
        });
      })
      .catch(function () { });
  }


  /* ===== アーティスト情報 (artists.json で設定。再生中のアーティストと
     name または aliases が一致したら、紹介カードを出す) ===== */
  var artistEntries = null;
  var artistInfoKey = null;
  function loadArtists() {
    fetch("artists.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        artistEntries = Array.isArray(d.artists) ? d.artists : [];
        var cur = document.getElementById("now-artist");
        renderArtistInfo(cur ? cur.textContent : "");
      })
      .catch(function () { artistEntries = []; });
  }
  function findArtist(artist) {
    if (!artistEntries || !artist) return null;
    var key = String(artist).trim();
    for (var i = 0; i < artistEntries.length; i++) {
      var e = artistEntries[i];
      if (!e || !e.name) continue;
      if (e.name === key) return e;
      var aliases = Array.isArray(e.aliases) ? e.aliases : [];
      for (var k = 0; k < aliases.length; k++) { if (aliases[k] === key) return e; }
    }
    return null;
  }
  function buildArtistCard(e) {
    var card = document.createElement("div");
    card.className = "artist-card";
    if (e.image) {
      var img = document.createElement("img");
      img.className = "link-thumb"; img.src = e.image; img.alt = "";
      card.appendChild(img);
    }
    var body = document.createElement("div"); body.className = "link-body";
    var t = document.createElement("span"); t.className = "link-title";
    t.textContent = e.name;
    body.appendChild(t);
    if (e.description) {
      var ds = document.createElement("span"); ds.className = "link-desc";
      ds.textContent = e.description;
      body.appendChild(ds);
    }
    var links = document.createElement("div"); links.className = "artist-links";
    if (e.url) {
      var a1 = document.createElement("a");
      a1.className = "artist-link"; a1.href = e.url;
      a1.target = "_blank"; a1.rel = "noopener";
      a1.textContent = "公式サイト";
      links.appendChild(a1);
    }
    var socials = Array.isArray(e.social) ? e.social.slice() : [];
    if (e.x) socials.push({ label: "X", url: e.x });
    socials.forEach(function (s) {
      if (!s || !s.url) return;
      var a2 = document.createElement("a");
      a2.className = "artist-link"; a2.href = s.url;
      a2.target = "_blank"; a2.rel = "noopener";
      a2.textContent = s.label || "リンク";
      links.appendChild(a2);
    });
    if (links.children.length) body.appendChild(links);
    card.appendChild(body);
    return card;
  }
  function renderArtistInfo(artist) {
    var e = findArtist(artist);
    var key = e ? e.name : "";
    if (key === artistInfoKey) return;
    artistInfoKey = key;
    ["np-artist-info", "fs-artist-info"].forEach(function (id) {
      var box = document.getElementById(id);
      if (!box) return;
      box.innerHTML = "";
      if (e) { box.appendChild(buildArtistCard(e)); box.hidden = false; }
      else { box.hidden = true; }
    });
  }

  /* ===== 曲のリクエスト (AzuraCast 公開API) =====
     一覧: GET /api/station/<shortcode>/requests
     送信: POST <request_url> (一覧の各曲に付いているパス)
     制限 (同じ曲・連続リクエスト) は AzuraCast 側が判定し、理由が返る。 */
  // 番組・スポットは曲ではないのでリクエスト一覧に出さない
  var REQ_EXCLUDE_TITLES = { "ネルラジニュース": true, "交通情報": true, "天気情報": true };
  var reqArtist = "*"; // アーティスト絞り込み ("*" = すべて)
  var REQ_NO_ARTIST = "アーティストなし";
  var reqSongs = [];
  var reqDone = {}; // request_id -> true (このページで送信済みの曲)

  /* ===== 試聴 (AzuraCast のオンデマンド再生) ===== */
  var preview = new Audio();
  preview.preload = "none";
  var previewId = null; // 試聴中の request_id
  var previewBtn = null; // 試聴中ボタンの表示を戻すため
  function stopPreview() {
    preview.pause();
    if (previewBtn) {
      previewBtn.textContent = "試聴";
      previewBtn.classList.remove("on");
    }
    previewId = null;
    previewBtn = null;
  }
  preview.addEventListener("ended", stopPreview);
  preview.addEventListener("error", function () {
    if (previewId) reqStatus("この曲は試聴できませんでした", "err");
    stopPreview();
  });
  function togglePreview(item, btn) {
    if (previewId === item.request_id) { stopPreview(); return; }
    stopPreview();
    if (!audio.paused) audio.pause(); // 本編と同時に鳴らさない
    preview.src = BASE + "/api/station/" + st().id + "/ondemand/download/"
      + item.request_id;
    previewId = item.request_id;
    previewBtn = btn;
    btn.textContent = "停止";
    btn.classList.add("on");
    var p = preview.play();
    if (p && p.catch) p.catch(function () { /* 失敗表示は error 側で処理 */ });
  }
  function reqStatus(msg, kind) {
    var el = document.getElementById("req-status");
    el.textContent = msg;
    el.className = "req-status" + (kind ? " " + kind : "");
  }
  function renderRequests(filter) {
    var list = document.getElementById("req-list");
    list.innerHTML = "";
    var q = (filter || "").trim().toLowerCase();
    var shown = 0;
    reqSongs.forEach(function (item) {
      var s = item.song || {};
      if (reqArtist !== "*" && (s.artist || "") !== reqArtist) return;
      var hay = ((s.title || "") + " " + (s.artist || "") + " " + (s.text || "")).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      shown++;
      var li = document.createElement("li"); li.className = "req-item";
      var img = document.createElement("img");
      img.src = s.art || "default-album-art-v2.png"; img.alt = "";
      li.appendChild(img);
      var info = document.createElement("div"); info.className = "req-info";
      var tt = document.createElement("div"); tt.className = "req-title";
      tt.textContent = s.title || s.text || "—";
      var ar = document.createElement("div"); ar.className = "req-artist";
      ar.textContent = s.artist || "";
      info.appendChild(tt); info.appendChild(ar); li.appendChild(info);
      var pv = document.createElement("button");
      pv.className = "req-pv-btn"; pv.type = "button";
      if (previewId === item.request_id) {
        pv.textContent = "停止"; pv.classList.add("on"); previewBtn = pv;
      } else {
        pv.textContent = "試聴";
      }
      pv.addEventListener("click", function () { togglePreview(item, pv); });
      li.appendChild(pv);
      var btn = document.createElement("button");
      btn.className = "req-btn"; btn.type = "button";
      if (reqDone[item.request_id]) {
        btn.textContent = "受付済み"; btn.disabled = true; btn.classList.add("done");
      } else {
        btn.textContent = "リクエスト";
      }
      btn.addEventListener("click", function () { sendRequest(item, btn); });
      li.appendChild(btn);
      list.appendChild(li);
    });
    if (!shown) {
      reqStatus("条件に一致する曲がありません");
    } else if (!q && reqArtist === "*") {
      reqStatus("リクエストできる曲は " + reqSongs.length + " 曲です");
    } else {
      reqStatus(shown + " 曲を表示しています");
    }
  }
  function buildReqChips() {
    var box = document.getElementById("req-chips");
    box.innerHTML = "";
    var counts = {};
    reqSongs.forEach(function (item) {
      var a = (item.song || {}).artist || "";
      counts[a] = (counts[a] || 0) + 1;
    });
    var names = Object.keys(counts).sort(function (x, y) {
      return counts[y] - counts[x] || x.localeCompare(y);
    });
    function addChip(value, label, count) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "req-chip" + (reqArtist === value ? " on" : "");
      b.textContent = label + " (" + count + ")";
      b.addEventListener("click", function () {
        reqArtist = value;
        buildReqChips();
        renderRequests(document.getElementById("req-search").value);
      });
      box.appendChild(b);
    }
    addChip("*", "すべて", reqSongs.length);
    names.forEach(function (a) { addChip(a, a || REQ_NO_ARTIST, counts[a]); });
  }
  function sendRequest(item, btn) {
    btn.disabled = true; btn.textContent = "送信中…";
    fetch(BASE + item.request_url, { method: "POST" })
      .then(function (r) {
        return r.json().catch(function () { return {}; })
          .then(function (j) { return { ok: r.ok, j: j }; });
      })
      .then(function (res) {
        var j = res.j || {};
        if (res.ok && j.success !== false) {
          reqDone[item.request_id] = true;
          btn.textContent = "受付済み"; btn.classList.add("done");
          reqStatus("「" + ((item.song || {}).title || "") +
            "」のリクエストを受け付けました。順番が来たら流れます。", "ok");
        } else {
          btn.disabled = false; btn.textContent = "リクエスト";
          reqStatus(j.message || j.error ||
            "リクエストできませんでした (制限中の可能性があります)", "err");
        }
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = "リクエスト";
        reqStatus("送信に失敗しました。通信環境を確認してもう一度お試しください", "err");
      });
  }
  function loadRequests() {
    fetch(reqApiUrl()).then(function (r) { return r.json(); }).then(function (d) {
      reqSongs = (Array.isArray(d) ? d : []).filter(function (item) {
        var t = (item.song || {}).title || "";
        // パワープレイ版 (タイトル末尾が「(パワープレイ)」) も曲として出さない
        return !REQ_EXCLUDE_TITLES[t] && !/[（(]パワープレイ[）)]$/.test(t);
      });
      buildReqChips();
      renderRequests(document.getElementById("req-search").value);
    }).catch(function () {
      reqStatus("曲リストを取得できませんでした", "err");
    });
  }
  document.getElementById("req-search").addEventListener("input", function (e) {
    renderRequests(e.target.value);
  });

  /* ===== モード切替の適用 ===== */
  function applyMode(next) {
    if (next === mode) return;
    mode = next;
    try { localStorage.setItem("cast-mode", next); } catch (e) {}
    var wasPlaying = !audio.paused;
    stopPreview();
    audio.src = BASE + "/listen/" + st().code + "/radio.mp3";
    audio.load();
    if (wasPlaying) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    }
    document.getElementById("mode-badge").hidden = next !== "allday";
    reqDone = {};
    reqArtist = "*";
    update();
    loadRequests();
  }

  /* ===== コマンド (all-day / normal) ===== */
  var cmdOverlay = document.getElementById("cmd-overlay");
  var cmdInput = document.getElementById("cmd-input");
  var cmdMsg = document.getElementById("cmd-msg");
  var warnOverlay = document.getElementById("warn-overlay");
  function openCmd() {
    cmdOverlay.hidden = false;
    cmdMsg.textContent = "";
    cmdInput.value = "";
    setTimeout(function () { cmdInput.focus(); }, 30);
  }
  function closeCmd() { cmdOverlay.hidden = true; }
  function runCommand() {
    var c = cmdInput.value.trim().toLowerCase();
    if (c === "all-day" || c === "allday") {
      if (mode === "allday") { cmdMsg.textContent = "すでに ALL DAY モードです"; return; }
      closeCmd();
      warnOverlay.hidden = false;
      document.getElementById("warn-ok").focus();
    } else if (c === "normal" || c === "reset") {
      if (mode === "normal") { cmdMsg.textContent = "すでに通常モードです"; return; }
      closeCmd();
      applyMode("normal");
    } else if (c === "") {
      cmdMsg.textContent = "コマンドを入力してください (all-day / normal)";
    } else {
      cmdMsg.textContent = "そのコマンドはありません。対応コマンド: all-day / normal";
    }
  }
  document.getElementById("cmd-open").addEventListener("click", openCmd);
  document.getElementById("warn-ok").addEventListener("click", function () {
    warnOverlay.hidden = true;
    applyMode("allday");
  });
  document.getElementById("warn-cancel").addEventListener("click", function () {
    warnOverlay.hidden = true;
  });
  cmdInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") runCommand();
  });
  [cmdOverlay, warnOverlay].forEach(function (ov) {
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.hidden = true; });
  });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (cmdOverlay.hidden) openCmd(); else closeCmd();
    }
    if (e.key === "Escape") { closeCmd(); warnOverlay.hidden = true; }
  });

  if (mode === "allday") {
    audio.src = BASE + "/listen/" + st().code + "/radio.mp3";
    document.getElementById("mode-badge").hidden = false;
  }
  renderSchedule();
  update();
  loadRequests();
  renderContent();
  renderLinks();
  loadArtists();
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
