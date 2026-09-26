/* =====================================================================
   B+B's Umerica Adventure 2026 — script.js
   Vanilla JS only, no dependencies. Organized by feature:
     1. Tab / section navigation
     2. Countdown + "Day X" adventure counter (Pacific / Las Vegas time)
     3. Confetti engine
     4. Checklist (localStorage persistence)
     5. Easter eggs (10+, see comments at each one)
   ===================================================================== */
(function () {
  "use strict";

  /* -------------------------------------------------------------------
     TRIP CONFIG — edit here if the date ever changes
     ------------------------------------------------------------------- */
  // Arrival date, expressed as Las Vegas / Pacific *wall clock* time.
  // Handled with real timezone math below (handles PST/PDT automatically).
  var TRIP_YEAR = 2026, TRIP_MONTH = 11, TRIP_DAY = 1; // November 1, 2026
  var TRIP_TZ = "America/Los_Angeles";

  /* Returns the millisecond offset between UTC and America/Los_Angeles
     for the given Date instant. Works correctly across the DST boundary
     because it derives the offset from the actual calendar date, not a
     hardcoded UTC-7/UTC-8 assumption. */
  function tzOffsetMs(date, timeZone) {
    var utcString = date.toLocaleString("en-US", { timeZone: "UTC" });
    var tzString = date.toLocaleString("en-US", { timeZone: timeZone });
    return new Date(utcString).getTime() - new Date(tzString).getTime();
  }

  /* Builds the exact UTC instant corresponding to a Y/M/D 00:00:00
     wall-clock time in the given IANA timezone. */
  function zonedMidnightUTC(year, month, day, timeZone) {
    // First guess: treat the wall-clock numbers as if they were UTC.
    var guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    var offset = tzOffsetMs(guess, timeZone);
    return new Date(guess.getTime() + offset);
  }

  var TRIP_START_UTC = zonedMidnightUTC(TRIP_YEAR, TRIP_MONTH, TRIP_DAY, TRIP_TZ);

  /* -------------------------------------------------------------------
     1. TAB / SECTION NAVIGATION
     ------------------------------------------------------------------- */
  var tocButtons = document.querySelectorAll(".toc-btn");
  var pages = document.querySelectorAll(".page");

  function showPage(id, opts) {
    opts = opts || {};
    var found = false;
    pages.forEach(function (p) {
      var match = p.id === id;
      if (match) found = true;
      p.classList.toggle("active", match);
      if (match) p.hidden = false;
    });
    if (!found) return;
    tocButtons.forEach(function (b) {
      var isMatch = b.dataset.target === id;
      if (isMatch) {
        b.setAttribute("aria-current", "page");
      } else {
        b.removeAttribute("aria-current");
      }
    });
    if (!opts.skipHash) {
      history.replaceState(null, "", "#" + id);
    }
    if (!opts.skipScroll) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  tocButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      showPage(btn.dataset.target);
    });
  });

  // Deep-link support: open directly to a hash if present & valid.
  (function initialPage() {
    var hash = window.location.hash.replace("#", "");
    var valid = hash && document.getElementById(hash) && document.getElementById(hash).classList.contains("page");
    // skipHash avoids a browser quirk where rewriting the URL fragment to
    // match an element's id (even via replaceState) can trigger an
    // auto-scroll to that element on initial load.
    showPage(valid ? hash : "home", { skipScroll: true, skipHash: true });
  })();

  /* -------------------------------------------------------------------
     2. COUNTDOWN + DAY-OF-ADVENTURE COUNTER
     ------------------------------------------------------------------- */
  var countdownState = document.getElementById("countdownState");
  var celebrationState = document.getElementById("celebrationState");
  var elDays = document.getElementById("cd-days");
  var elHours = document.getElementById("cd-hours");
  var elMins = document.getElementById("cd-mins");
  var elSecs = document.getElementById("cd-secs");
  var dayOfCount = document.getElementById("dayOfCount");
  var dayOfDate = document.getElementById("dayOfDate");

  var celebrationTriggered = false;

  function pad(n) { return String(n).padStart(2, "0"); }

  function tick() {
    var now = new Date();
    var diff = TRIP_START_UTC.getTime() - now.getTime();

    if (diff <= 0) {
      if (!celebrationTriggered) {
        celebrationTriggered = true;
        enterCelebrationMode();
      }
      updateDayOfAdventure(now);
      return;
    }

    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var mins = Math.floor((totalSeconds % 3600) / 60);
    var secs = totalSeconds % 60;

    elDays.textContent = pad(days);
    elHours.textContent = pad(hours);
    elMins.textContent = pad(mins);
    elSecs.textContent = pad(secs);
  }

  function enterCelebrationMode() {
    countdownState.hidden = true;
    celebrationState.hidden = false;
    launchConfetti(4000);
  }

  function updateDayOfAdventure(now) {
    var msSinceStart = now.getTime() - TRIP_START_UTC.getTime();
    var dayNumber = Math.floor(msSinceStart / 86400000) + 1;
    dayOfCount.textContent = dayNumber;
    dayOfDate.textContent = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: TRIP_TZ
    }) + " (Vegas time)";
  }

  // If we happen to load the page after the trip has already started
  // (e.g. testing, or just... it's November now), show the right state
  // immediately instead of waiting for the first tick to flip it.
  if (Date.now() >= TRIP_START_UTC.getTime()) {
    celebrationTriggered = true;
    countdownState.hidden = true;
    celebrationState.hidden = false;
    updateDayOfAdventure(new Date());
  }

  tick();
  setInterval(tick, 1000);

  /* Easter egg: double-click the countdown to see a silly "alternate
     stat" — how many days you two have been talking, framed as a joke. */
  var countdownEl = document.getElementById("countdown");
  var altStatShown = false;
  countdownEl.addEventListener("dblclick", function () {
    if (altStatShown) return;
    altStatShown = true;
    var original = countdownEl.innerHTML;
    countdownEl.innerHTML =
      '<p style="font-family:var(--font-hand);font-size:1.1rem;max-width:22em;">' +
      "regardless of how many days this countdown clock reads at time of viewing I can confidently say it's way too long" +
      "</p>";
    setTimeout(function () {
      countdownEl.innerHTML = original;
      // re-grab refs since innerHTML replaced the nodes
      elDays = document.getElementById("cd-days");
      elHours = document.getElementById("cd-hours");
      elMins = document.getElementById("cd-mins");
      elSecs = document.getElementById("cd-secs");
      altStatShown = false;
    }, 3200);
  });

  /* -------------------------------------------------------------------
     3. CONFETTI ENGINE (canvas-based, no dependencies)
     ------------------------------------------------------------------- */
  var canvas = document.getElementById("confettiCanvas");
  var ctx = canvas.getContext("2d");
  var confettiPieces = [];
  var confettiRunning = false;
  var confettiColors = ["#ff2d55", "#ffd23f", "#3ddcff", "#9c5cff", "#d4ff3a", "#ff8c00"];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function makePiece() {
    return {
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      speedY: 2 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 2
    };
  }

  var confettiTimer = null;
  function launchConfetti(durationMs) {
    var count = 160;
    for (var i = 0; i < count; i++) confettiPieces.push(makePiece());
    canvas.style.display = "block";
    if (!confettiRunning) {
      confettiRunning = true;
      requestAnimationFrame(confettiLoop);
    }
    if (confettiTimer) clearTimeout(confettiTimer);
    confettiTimer = setTimeout(function () {
      confettiPieces = [];
    }, durationMs || 3000);
  }

  function confettiLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (confettiPieces.length === 0) {
      confettiRunning = false;
      canvas.style.display = "none";
      return;
    }
    confettiPieces.forEach(function (p) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    confettiPieces = confettiPieces.filter(function (p) { return p.y < canvas.height + 30; });
    requestAnimationFrame(confettiLoop);
  }

  /* -------------------------------------------------------------------
     4. CHECKLIST (localStorage persistence)
     ------------------------------------------------------------------- */
  var TODO_STORAGE_KEY = "bb-umerica-todo-state-v1";
  var todoInputs = document.querySelectorAll("#todoList input[type=checkbox]");
  var todoProgress = document.getElementById("todoProgress");

  function loadTodoState() {
    try {
      var raw = localStorage.getItem(TODO_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveTodoState(state) {
    try {
      localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage unavailable (private mode etc.) — fail silently */
    }
  }

  function refreshTodoProgress() {
    var total = todoInputs.length;
    var done = 0;
    todoInputs.forEach(function (i) { if (i.checked) done++; });
    todoProgress.textContent = done + " / " + total + " done. " +
      (done === total ? "EVERYTHING IS DONE?! who even are you." : "no pressure. (some pressure.)");
    todoProgress.classList.toggle("all-done", done === total && total > 0);
    if (done === total && total > 0) {
      launchConfetti(2500);
    }
  }

  (function initTodos() {
    var state = loadTodoState();
    todoInputs.forEach(function (input) {
      var id = input.dataset.id;
      if (state[id]) input.checked = true;
      input.addEventListener("change", function () {
        var s = loadTodoState();
        s[id] = input.checked;
        saveTodoState(s);
        refreshTodoProgress();
      });
    });
    refreshTodoProgress();
  })();

  /* =====================================================================
     5. EASTER EGGS
     Each one is intentionally small and self-contained.
     ===================================================================== */

  /* Egg 1: click the big site title -> shake animation + mini confetti. */
  var siteTitle = document.getElementById("siteTitle");
  siteTitle.addEventListener("click", function () {
    siteTitle.classList.remove("title-shake");
    void siteTitle.offsetWidth; // restart animation
    siteTitle.classList.add("title-shake");
    launchConfetti(1500);
  });
  siteTitle.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      siteTitle.click();
    }
  });

  /* Egg 2: click the heart doodle 5 times to reveal a secret message. */
  var doodleHeart = document.getElementById("doodleHeart");
  var doodleHeartMsg = document.getElementById("doodleHeartMsg");
  var heartClicks = 0;
  doodleHeart.addEventListener("click", function () {
    heartClicks++;
    doodleHeart.style.transform = "scale(" + (1 + heartClicks * 0.08) + ")";
    if (heartClicks >= 5) {
      doodleHeartMsg.hidden = false;
      heartClicks = 0;
      setTimeout(function () { doodleHeart.style.transform = ""; }, 400);
    }
  });

  /* Egg 3: hover-triggered joke sticker (see CSS .sticker + data-joke). */
  document.querySelectorAll("[data-joke]").forEach(function (el) {
    var tip = null;
    el.addEventListener("mouseenter", function () {
      tip = document.createElement("span");
      tip.textContent = el.dataset.joke;
      tip.style.cssText =
        "position:absolute;background:#16121f;color:#f6f1e4;padding:6px 10px;" +
        "font-family:var(--font-zine);font-size:.75rem;max-width:220px;z-index:50;" +
        "border:2px solid var(--yellow);margin-top:8px;pointer-events:none;";
      el.style.position = "relative";
      el.appendChild(tip);
    });
    el.addEventListener("mouseleave", function () {
      if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
      tip = null;
    });
  });

  /* Egg 4: fake "system error" that's actually a love note. */
  var doNotClickBtn = document.getElementById("doNotClickBtn");
  var fakeErrorBox = document.getElementById("fakeErrorBox");
  doNotClickBtn.addEventListener("click", function () {
    fakeErrorBox.hidden = false;
    fakeErrorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  fakeErrorBox.querySelector(".fake-error-close").addEventListener("click", function () {
    fakeErrorBox.hidden = true;
  });

  /* Egg 5: mini quiz in the History of Us section. */
  var quizOptions = document.getElementById("quizOptions");
  var quizResult = document.getElementById("quizResult");
  if (quizOptions) {
    var quizButtons = quizOptions.querySelectorAll("button");
    var quizClicked = new Set();
    quizButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        quizClicked.add(btn);
        quizResult.hidden = false;
        quizResult.textContent = quizClicked.size >= quizButtons.length
          ? "Heheh trick question I'm just trying not to go completely crazy in anticipation for your arrival"
          : "Wrong - try again";
      });
    });
  }

  /* Egg 6: slot machine wildcard date-idea generator. */
  var slotBtn = document.getElementById("slotMachineBtn");
  var slotResult = document.getElementById("slotResult");
  var slotIdeas = [
    "Order the weirdest thing on a diner menu at 2am.",
    "Find the tackiest souvenir shop on the Strip and buy each other something ugly.",
    "Photobooth strip at a random casino, no questions asked.",
    "Karaoke. Yes, really. [PLACEHOLDER: pick a spot]",
    "Rooftop bar, one drink each, watch the lights.",
    "Rent bikes and ride somewhere neither of you has been.",
    "Skip the plan entirely and just wander until something looks fun.",
    "Ice cream at midnight. No justification needed."
  ];
  if (slotBtn) {
    slotBtn.addEventListener("click", function () {
      slotBtn.classList.add("spinning");
      slotBtn.disabled = true;
      var spins = 0;
      var spinInterval = setInterval(function () {
        slotResult.textContent = slotIdeas[Math.floor(Math.random() * slotIdeas.length)];
        spins++;
        if (spins > 10) {
          clearInterval(spinInterval);
          slotBtn.classList.remove("spinning");
          slotBtn.disabled = false;
        }
      }, 90);
    });
  }

  /* Egg 7: generic click-to-wiggle for any .wiggle-on-click element. */
  document.querySelectorAll(".wiggle-on-click").forEach(function (el) {
    el.addEventListener("click", function () {
      el.classList.remove("wiggling");
      void el.offsetWidth;
      el.classList.add("wiggling");
    });
  });

  /* Egg 8: footer year click -> joke "established" date. */
  var footerYear = document.getElementById("footerYear");
  var footerSecret = document.getElementById("footerSecret");
  if (footerYear) {
    footerYear.addEventListener("click", function () {
      footerSecret.hidden = !footerSecret.hidden;
    });
  }

  /* Egg 9: type "BETTY" anywhere on the page -> hearts rain down. */
  var typedBuffer = "";
  var heartsLayer = document.getElementById("heartsLayer");
  window.addEventListener("keydown", function (e) {
    if (e.key.length !== 1) return; // ignore non-character keys (also covers Konami arrows, handled separately)
    typedBuffer = (typedBuffer + e.key).slice(-5).toUpperCase();
    if (typedBuffer === "BETTY") {
      rainHearts();
      typedBuffer = "";
    }
  });

  function rainHearts() {
    for (var i = 0; i < 40; i++) {
      (function (i) {
        setTimeout(function () {
          var h = document.createElement("div");
          h.className = "falling-heart";
          h.textContent = ["💕", "💖", "🖤", "💌", "✨"][Math.floor(Math.random() * 5)];
          h.style.left = Math.random() * 100 + "vw";
          h.style.animationDuration = 2.5 + Math.random() * 2.5 + "s";
          h.style.fontSize = 1 + Math.random() * 1.4 + "rem";
          heartsLayer.appendChild(h);
          setTimeout(function () { h.remove(); }, 5500);
        }, i * 40);
      })(i);
    }
  }

  /* Egg 10: Konami code -> confetti storm + unlock secret "Jackpot" tab. */
  var konamiSequence = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  var konamiProgress = 0;
  var secretUnlocked = false;
  window.addEventListener("keydown", function (e) {
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    var expected = konamiSequence[konamiProgress];
    if (key === expected) {
      konamiProgress++;
      if (konamiProgress === konamiSequence.length) {
        konamiProgress = 0;
        unlockSecretSection();
      }
    } else {
      konamiProgress = (key === konamiSequence[0]) ? 1 : 0;
    }
  });

  function unlockSecretSection() {
    launchConfetti(5000);
    if (!secretUnlocked) {
      secretUnlocked = true;
      document.getElementById("secretTocItem").hidden = false;
    }
    showPage("secret");
  }

  /* Egg 11: console message for anyone who opens devtools. */
  console.log(
    "%cHi. Yes, you. If you're reading this in devtools, you're exactly the " +
    "kind of nerd this website was built for. There's a Konami code hidden " +
    "on this site (↑ ↑ ↓ ↓ ← → ← → B A). Go find it.",
    "color:#ff2d55;font-size:14px;font-weight:bold;"
  );

  /* Egg 12: long-press (5 quick clicks) on any .figure-frame reveals a
     small trivia toast — tucked into the History of Vegas page. */
  document.querySelectorAll(".figure-frame").forEach(function (frame) {
    var clicks = 0;
    var resetTimer = null;
    frame.style.cursor = "pointer";
    frame.addEventListener("click", function () {
      clicks++;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { clicks = 0; }, 1500);
      if (clicks >= 5) {
        clicks = 0;
        var toast = document.createElement("p");
        toast.textContent = "trivia unlocked: the Neon Museum's boneyard includes the original Stardust sign. [PLACEHOLDER: verify/replace with your own fun fact]";
        toast.style.cssText = "font-family:var(--font-hand);background:var(--yellow);border:2px solid var(--ink);padding:8px;margin-top:8px;";
        frame.appendChild(toast);
        setTimeout(function () { toast.remove(); }, 4000);
      }
    });
  });

  /* =====================================================================
     6. "HOMEMADE WEB" CHROME — letters, typewriter, hit counter,
        guestbook, webring, cursor customizer + trail, idle mascot.
     ===================================================================== */

  /* --- Hover-reactive per-letter headers -------------------------------- */
  function wrapLetters(el) {
    var text = el.textContent;
    el.textContent = "";
    var i = 0;
    text.split("").forEach(function (ch) {
      if (ch === " ") {
        el.appendChild(document.createTextNode(" "));
        return;
      }
      var span = document.createElement("span");
      span.className = "ch";
      span.style.setProperty("--i", i);
      span.textContent = ch;
      el.appendChild(span);
      i++;
    });
  }
  document.querySelectorAll(".letters").forEach(wrapLetters);

  /* --- Typewriter reveal on the History of Us intro ---------------------- */
  var historyTypewriter = document.getElementById("historyTypewriter");
  var typewriterPlayed = false;
  var TYPEWRITER_TEXT = "Loading our whole timeline via the internet";
  function playTypewriter() {
    if (typewriterPlayed || !historyTypewriter) return;
    typewriterPlayed = true;
    historyTypewriter.classList.add("typing");
    var i = 0;
    var timer = setInterval(function () {
      historyTypewriter.textContent = TYPEWRITER_TEXT.slice(0, i + 1);
      i++;
      if (i >= TYPEWRITER_TEXT.length) {
        clearInterval(timer);
        setTimeout(function () { historyTypewriter.classList.remove("typing"); }, 1500);
      }
    }, 28);
  }
  var historyTocBtn = document.querySelector('.toc-btn[data-target="history-of-us"]');
  if (historyTocBtn) historyTocBtn.addEventListener("click", playTypewriter);
  if (document.getElementById("history-of-us") && document.getElementById("history-of-us").classList.contains("active")) {
    playTypewriter();
  }

  /* --- Odometer-style hit counter (decorative only, no backend) --------- */
  (function initHitCounter() {
    var el = document.getElementById("hitCounter");
    if (!el) return;
    var digits = "000000".split("");
    el.innerHTML = "";
    digits.forEach(function (d) {
      var span = document.createElement("span");
      span.textContent = d;
      el.appendChild(span);
    });
  })();

  /* --- Webring widget: loops through the site's own tabs ----------------- */
  (function initWebring() {
    var prevBtn = document.getElementById("webringPrev");
    var nextBtn = document.getElementById("webringNext");
    if (!prevBtn || !nextBtn) return;
    var order = Array.prototype.map.call(tocButtons, function (b) { return b.dataset.target; })
      .filter(function (id) { return id !== "secret"; });
    function currentIndex() {
      var current = document.querySelector(".page.active");
      var idx = current ? order.indexOf(current.id) : 0;
      return idx === -1 ? 0 : idx;
    }
    nextBtn.addEventListener("click", function () {
      var idx = (currentIndex() + 1) % order.length;
      showPage(order[idx]);
    });
    prevBtn.addEventListener("click", function () {
      var idx = (currentIndex() - 1 + order.length) % order.length;
      showPage(order[idx]);
    });
  })();

  /* --- Cursor customizer (2-3 alternate cursors + easy way back) --------- */
  (function initCursorCustomizer() {
    var buttons = document.querySelectorAll("#cursorOptions button");
    if (!buttons.length) return;
    var CURSOR_KEY = "bb-umerica-cursor-v1";
    var cursorClasses = ["cursor-heart", "cursor-star", "cursor-sparkle"];

    function applyCursor(choice) {
      cursorClasses.forEach(function (c) { document.body.classList.remove(c); });
      if (choice && choice !== "default") document.body.classList.add("cursor-" + choice);
      buttons.forEach(function (b) { b.classList.toggle("active", b.dataset.cursor === choice); });
      try { localStorage.setItem(CURSOR_KEY, choice); } catch (e) { /* ignore */ }
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () { applyCursor(btn.dataset.cursor); });
    });

    var saved = "default";
    try { saved = localStorage.getItem(CURSOR_KEY) || "default"; } catch (e) { /* ignore */ }
    applyCursor(saved);
  })();

  /* --- Cursor-trail sparkles (toggleable in case it's distracting) ------- */
  (function initCursorTrail() {
    var toggle = document.getElementById("trailToggle");
    if (!toggle) return;
    var TRAIL_KEY = "bb-umerica-trail-v1";
    var trailChars = ["✨", "💖", "⭐"];
    var lastSpawn = 0;
    var enabled = false;

    function spawnTrail(x, y) {
      var now = Date.now();
      if (now - lastSpawn < 60) return; // throttle
      lastSpawn = now;
      var el = document.createElement("span");
      el.className = "cursor-sparkle-trail";
      el.textContent = trailChars[Math.floor(Math.random() * trailChars.length)];
      el.style.left = x + "px";
      el.style.top = y + "px";
      document.body.appendChild(el);
      setTimeout(function () { el.remove(); }, 750);
    }

    function onMove(e) { spawnTrail(e.clientX, e.clientY); }

    function setEnabled(val) {
      enabled = val;
      toggle.checked = val;
      if (val) {
        window.addEventListener("mousemove", onMove);
      } else {
        window.removeEventListener("mousemove", onMove);
      }
      try { localStorage.setItem(TRAIL_KEY, val ? "1" : "0"); } catch (e) { /* ignore */ }
    }

    toggle.addEventListener("change", function () { setEnabled(toggle.checked); });

    var saved = false;
    try { saved = localStorage.getItem(TRAIL_KEY) === "1"; } catch (e) { /* ignore */ }
    setEnabled(saved);
  })();

  /* --- Idle pixel mascot: reacts when clicked ----------------------------- */
  (function initMascot() {
    var mascot = document.getElementById("mascot");
    var bubble = document.getElementById("mascotBubble");
    if (!mascot || !bubble) return;
    var lines = [
      "Whoa mama",
      "is it November yet",
      "Where are you",
      "Are u also freaking out"
    ];
    var reactTimer = null;
    mascot.addEventListener("click", function () {
      mascot.classList.add("reacting");
      bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
      bubble.hidden = false;
      clearTimeout(reactTimer);
      reactTimer = setTimeout(function () {
        mascot.classList.remove("reacting");
        bubble.hidden = true;
      }, 1800);
    });
  })();

})();
