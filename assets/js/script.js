"use strict";

// ─────────────────────────────────────────────────────────────
// CONFIGURAÇÕES FÁCEIS DE EDITAR
// ─────────────────────────────────────────────────────────────
const YOUTUBE_VIDEO_ID = "f7gcY9_4Cw4";

const RELATIONSHIP_START = {
  date: "2026-06-04",
  time: "11:00",
  timezone: "America/Sao_Paulo"
};

const COUPLE = {
  person1: "Kelvin",
  person2: "Livia",
  months: 2,
  relationshipDate: "04·06·2026"
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = { started: false, isPlaying: false };
let youtubePlayer = null;
let youtubeReady = false;
let requestedMusicStart = false;
let youtubeApiLoading = false;

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

// ─────────────────────────────────────────────────────────────
// CONTEÚDO CONFIGURÁVEL
// ─────────────────────────────────────────────────────────────
function applyCoupleData() {
  $$('[data-person="1"]').forEach((el) => { el.textContent = COUPLE.person1; });
  $$('[data-person="2"]').forEach((el) => { el.textContent = COUPLE.person2; });
  $$('[data-date]').forEach((el) => { el.textContent = COUPLE.relationshipDate; });
}

// ─────────────────────────────────────────────────────────────
// CONTADOR DO RELACIONAMENTO — CALENDÁRIO NO FUSO DE SÃO PAULO
// ─────────────────────────────────────────────────────────────
const relationshipFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RELATIONSHIP_START.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function getZonedParts(date) {
  return relationshipFormatter.formatToParts(date).reduce((parts, part) => {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
    return parts;
  }, {});
}

function zonedDateToUtc(parts) {
  let timestamp = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const desiredAsUtc = timestamp;

  // Corrige o palpite UTC usando o offset real do timezone na data escolhida.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getZonedParts(new Date(timestamp));
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const correction = desiredAsUtc - actualAsUtc;
    timestamp += correction;
    if (correction === 0) break;
  }
  return new Date(timestamp);
}

function getRelationshipStartParts() {
  const [year, month, day] = RELATIONSHIP_START.date.split("-").map(Number);
  const [hour, minute] = RELATIONSHIP_START.time.split(":").map(Number);
  return { year, month, day, hour, minute, second: 0 };
}

function addCalendarMonths(parts, amount) {
  const firstOfTargetMonth = new Date(Date.UTC(parts.year, parts.month - 1 + amount, 1));
  const year = firstOfTargetMonth.getUTCFullYear();
  const month = firstOfTargetMonth.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { ...parts, year, month, day: Math.min(parts.day, lastDay) };
}

function addCalendarDays(parts, amount) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return { ...parts, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function calculateRelationshipTime(now = new Date()) {
  const startParts = getRelationshipStartParts();
  const start = zonedDateToUtc(startParts);
  if (now < start) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  const nowParts = getZonedParts(now);
  let months = ((nowParts.year - startParts.year) * 12) + (nowParts.month - startParts.month);
  let monthCursorParts = addCalendarMonths(startParts, months);
  let monthCursor = zonedDateToUtc(monthCursorParts);

  while (monthCursor > now && months > 0) {
    months -= 1;
    monthCursorParts = addCalendarMonths(startParts, months);
    monthCursor = zonedDateToUtc(monthCursorParts);
  }
  while (zonedDateToUtc(addCalendarMonths(startParts, months + 1)) <= now) {
    months += 1;
    monthCursorParts = addCalendarMonths(startParts, months);
    monthCursor = zonedDateToUtc(monthCursorParts);
  }

  const cursorDateNumber = Date.UTC(monthCursorParts.year, monthCursorParts.month - 1, monthCursorParts.day);
  const nowDateNumber = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  let days = Math.max(0, Math.floor((nowDateNumber - cursorDateNumber) / 86400000));
  let dayCursor = zonedDateToUtc(addCalendarDays(monthCursorParts, days));

  while (dayCursor > now && days > 0) {
    days -= 1;
    dayCursor = zonedDateToUtc(addCalendarDays(monthCursorParts, days));
  }
  while (zonedDateToUtc(addCalendarDays(monthCursorParts, days + 1)) <= now) {
    days += 1;
    dayCursor = zonedDateToUtc(addCalendarDays(monthCursorParts, days));
  }

  let remainder = Math.max(0, now.getTime() - dayCursor.getTime());
  const hours = Math.floor(remainder / 3600000);
  remainder %= 3600000;
  const minutes = Math.floor(remainder / 60000);
  const seconds = Math.floor((remainder % 60000) / 1000);
  return { months, days, hours, minutes, seconds };
}

function updateCounterValue(unit, value) {
  const element = $(`[data-counter="${unit}"]`);
  const formatted = String(value).padStart(2, "0");
  if (!element || element.textContent === formatted) return;
  element.textContent = formatted;

  if (unit === "seconds" && !reducedMotion) {
    element.classList.remove("is-ticking");
    void element.offsetWidth;
    element.classList.add("is-ticking");
  }
}

function updateRelationshipCounter() {
  const elapsed = calculateRelationshipTime();
  Object.entries(elapsed).forEach(([unit, value]) => updateCounterValue(unit, value));
  $("#relationship-timer")?.setAttribute(
    "aria-label",
    `${elapsed.months} meses, ${elapsed.days} dias, ${elapsed.hours} horas, ${elapsed.minutes} minutos e ${elapsed.seconds} segundos de namoro`
  );
}

function setupRelationshipCounter() {
  updateRelationshipCounter();
  const millisecondsToNextSecond = 1000 - (Date.now() % 1000);
  window.setTimeout(() => {
    updateRelationshipCounter();
    window.setInterval(updateRelationshipCounter, 1000);
  }, millisecondsToNextSecond);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateRelationshipCounter();
  });
}

// ─────────────────────────────────────────────────────────────
// PLACEHOLDERS QUE EVITAM QUE A PÁGINA QUEBRE
// ─────────────────────────────────────────────────────────────
function setupMediaFallbacks() {
  $$(".media-frame img").forEach((image) => {
    const markMissing = () => image.closest(".media-frame")?.classList.add("is-missing");
    image.addEventListener("error", markMissing, { once: true });
    if (image.complete && image.naturalWidth === 0) markMissing();
  });

  $$("[data-video-shell]").forEach((shell) => {
    const video = $("video", shell);
    video.addEventListener("loadedmetadata", () => shell.classList.remove("is-missing"));
    video.addEventListener("error", () => shell.classList.add("is-missing"), { once: true });
  });
}

// ─────────────────────────────────────────────────────────────
// YOUTUBE IFRAME PLAYER API
// ─────────────────────────────────────────────────────────────
function loadYouTubeAPI() {
  if (window.YT?.Player) {
    createYouTubePlayer();
    return;
  }
  if (youtubeApiLoading || $("script[data-youtube-api]") || $("script[src*='youtube.com/iframe_api']")) return;

  youtubeApiLoading = true;
  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  script.async = true;
  script.referrerPolicy = "strict-origin-when-cross-origin";
  script.dataset.youtubeApi = "true";
  script.onerror = () => {
    youtubeApiLoading = false;
    script.remove();
    console.error("YouTube Player Error: não foi possível carregar a IFrame API");
    setMusicUI("error", "Não foi possível carregar nossa música.");
  };
  document.head.appendChild(script);
}

window.onYouTubeIframeAPIReady = function () {
  youtubeApiLoading = false;
  createYouTubePlayer();
};

function createYouTubePlayer() {
  if (youtubePlayer || !window.YT?.Player || !$("#youtube-player")) return;

  const playerVars = {
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    enablejsapi: 1,
    fs: 0,
    playsinline: 1,
    rel: 0
  };
  if (/^https?:$/.test(window.location.protocol)) playerVars.origin = window.location.origin;

  youtubePlayer = new window.YT.Player("youtube-player", {
    width: "200",
    height: "200",
    videoId: YOUTUBE_VIDEO_ID,
    playerVars,
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
      onAutoplayBlocked
    }
  });
}

function onPlayerReady(event) {
  youtubeReady = true;
  const iframe = event.target.getIframe();
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

  if (requestedMusicStart) {
    setMusicUI("loading", "iniciando nossa música…");
    event.target.playVideo();
  } else setMusicUI("paused", "pronta para tocar");
}

function onPlayerStateChange(event) {
  if (!window.YT?.PlayerState) return;
  switch (event.data) {
    case window.YT.PlayerState.PLAYING:
      setMusicUI("playing", "tocando agora");
      break;
    case window.YT.PlayerState.PAUSED:
      requestedMusicStart = false;
      setMusicUI("paused", "pausada");
      break;
    case window.YT.PlayerState.ENDED:
      if (requestedMusicStart) {
        event.target.seekTo(0, true);
        event.target.playVideo();
      } else setMusicUI("paused", "toque para ouvir");
      break;
    case window.YT.PlayerState.BUFFERING:
      setMusicUI("loading", "carregando música…");
      break;
    case window.YT.PlayerState.CUED:
      if (!requestedMusicStart) setMusicUI("paused", "pronta para tocar");
      break;
    default:
      break;
  }
}

function onAutoplayBlocked() {
  console.warn("[YT] Autoplay bloqueado");
  requestedMusicStart = false;
  setMusicUI("paused", "toque para ouvir nossa música");
}

function onPlayerError(event) {
  console.error("YouTube Player Error:", event.data);
  requestedMusicStart = false;
  setMusicUI("error", "Não foi possível carregar nossa música.");
}

function setMusicUI(status, label) {
  const playing = status === "playing";
  state.isPlaying = playing;
  const playerUI = $("#music-player");
  const toggle = $("#music-toggle");
  playerUI.classList.toggle("is-paused", !playing);
  playerUI.classList.toggle("is-loading", status === "loading");
  playerUI.classList.toggle("has-error", status === "error");
  playerUI.setAttribute("aria-busy", String(status === "loading"));
  toggle.setAttribute("aria-pressed", String(playing));
  toggle.setAttribute("aria-label", playing ? "Pausar nossa música" : "Tocar nossa música");
  $("#music-status").textContent = label;
}

function requestMusicPlayback() {
  requestedMusicStart = true;
  if (!youtubeReady && !youtubePlayer) loadYouTubeAPI();
  setMusicUI("loading", youtubeReady ? "iniciando nossa música…" : "preparando música…");
  if (youtubeReady && youtubePlayer && typeof youtubePlayer.playVideo === "function") {
    youtubePlayer.playVideo();
  }
}

function pauseMusic() {
  requestedMusicStart = false;
  if (youtubeReady && youtubePlayer && typeof youtubePlayer.pauseVideo === "function") {
    youtubePlayer.pauseVideo();
  } else setMusicUI("paused", "pausada");
}

function setupMusicControl() {
  $("#music-toggle").addEventListener("click", () => {
    if (state.isPlaying) pauseMusic(); else requestMusicPlayback();
  });
}

// ─────────────────────────────────────────────────────────────
// ABERTURA DA EXPERIÊNCIA
// ─────────────────────────────────────────────────────────────
function startExperience() {
  if (state.started) return;
  state.started = true;
  $("#music-player").classList.add("is-visible");
  requestMusicPlayback();

  const opening = $("#opening");
  const experience = $("#experience");
  experience.setAttribute("aria-hidden", "false");

  const complete = () => {
    opening.hidden = true;
    document.body.classList.remove("is-locked");
    window.scrollTo(0, 0);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    $("#inicio").focus?.({ preventScroll: true });
  };

  if (window.gsap && !reducedMotion) {
    const timeline = window.gsap.timeline({ onComplete: complete });
    timeline
      .to(".opening__content, .opening__corner", { opacity: 0, y: -18, duration: .65, ease: "power2.in" })
      .to(opening, { clipPath: "inset(0 0 100% 0)", duration: 1.05, ease: "power3.inOut" }, "-=.1")
      .fromTo(".hero-moment__media", { scale: 1.08, filter: "blur(12px)", opacity: .1 }, { scale: 1, filter: "blur(0px)", opacity: 1, duration: 1.35, ease: "power2.out" }, "-=.65")
      .from(".hero-moment__caption", { opacity: 0, y: 24, duration: .8 }, "-=.6");
  } else complete();
}

// ─────────────────────────────────────────────────────────────
// VÍDEOS: AUTOPLAY MUDO AO ENTRAR NA TELA
// ─────────────────────────────────────────────────────────────
function setupVideos() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target: video, isIntersecting }) => {
      const shell = video.closest("[data-video-shell]");
      if (isIntersecting && !shell.classList.contains("is-missing")) {
        video.play().catch(() => {});
      } else video.pause();
    });
  }, { threshold: .42 });

  $$("[data-video-shell]").forEach((shell) => {
    const video = $("video", shell);
    const control = $(".video-control", shell);
    observer.observe(video);
    video.addEventListener("play", () => { control.textContent = "II"; control.setAttribute("aria-label", "Pausar vídeo"); });
    video.addEventListener("pause", () => { control.textContent = "▶"; control.setAttribute("aria-label", "Reproduzir vídeo"); });
    control.addEventListener("click", () => { if (video.paused) video.play().catch(() => {}); else video.pause(); });
  });
}

// ─────────────────────────────────────────────────────────────
// CARTA
// ─────────────────────────────────────────────────────────────
function setupLetter() {
  const modal = $("#letter-modal");
  const open = $("#open-letter");
  const close = $("#close-letter");

  const openLetter = () => {
    modal.showModal();
    document.body.classList.add("is-locked");
    modal.scrollTop = 0;
    if (window.gsap && !reducedMotion) {
      window.gsap.fromTo(".letter-paper", { yPercent: 12, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .7, ease: "power3.out" });
    }
  };
  const closeLetter = () => {
    modal.close();
    document.body.classList.remove("is-locked");
  };

  open.addEventListener("click", openLetter);
  close.addEventListener("click", closeLetter);
  $("[data-close-letter]", modal).addEventListener("click", closeLetter);
  modal.addEventListener("cancel", (event) => { event.preventDefault(); closeLetter(); });
  setupLetterDownload(modal);
}

let jsPdfPromise = null;

function loadJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPdfPromise) return jsPdfPromise;

  jsPdfPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error("jsPDF indisponível"));
    script.onerror = () => reject(new Error("Não foi possível carregar o gerador de PDF"));
    document.head.appendChild(script);
  }).catch((error) => {
    jsPdfPromise = null;
    throw error;
  });
  return jsPdfPromise;
}

async function createLetterPdf() {
  const JsPdf = await loadJsPdf();
  const pdf = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 25;
  const textWidth = pageWidth - (margin * 2);
  const bottomLimit = pageHeight - 27;
  let y = 0;

  const decoratePage = () => {
    pdf.setFillColor(242, 237, 227);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    pdf.setDrawColor(120, 31, 42);
    pdf.setLineWidth(.45);
    pdf.line(margin, 20, margin + 22, 20);
    pdf.setTextColor(104, 94, 85);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("KELVIN + LIVIA  ·  02 MESES", pageWidth - margin, 21, { align: "right" });
    y = 34;
  };

  const nextPage = () => {
    pdf.addPage();
    decoratePage();
  };

  const writeLines = (lines, lineHeight = 6.3, style = { font: "times", variant: "normal", size: 11.5, color: [57, 50, 44] }) => {
    const applyStyle = () => {
      pdf.setFont(style.font, style.variant);
      pdf.setFontSize(style.size);
      pdf.setTextColor(...style.color);
    };
    applyStyle();
    lines.forEach((line) => {
      if (y + lineHeight > bottomLimit) {
        nextPage();
        applyStyle();
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    });
  };

  decoratePage();
  pdf.setTextColor(40, 35, 31);
  pdf.setFont("times", "normal");
  pdf.setFontSize(24);
  pdf.text($("#letter-title").textContent.trim(), margin, y);
  y += 16;

  $$(".letter-paper__body p").forEach((paragraph) => {
    const lines = pdf.splitTextToSize(paragraph.textContent.trim(), textWidth);
    writeLines(lines, 6.4);
    y += 5;
  });

  if (y + 24 > bottomLimit) nextPage();
  const signatureLines = $(".letter-paper__signature").innerText.trim().split(/\n+/);
  writeLines(signatureLines.slice(0, 1), 7);
  writeLines(signatureLines.slice(1), 8, { font: "times", variant: "italic", size: 17, color: [57, 50, 44] });

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setTextColor(132, 120, 109);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`${String(page).padStart(2, "0")} / ${String(pages).padStart(2, "0")}`, pageWidth / 2, pageHeight - 14, { align: "center" });
  }
  pdf.save("carta-kelvin-para-livia.pdf");
}

function setupLetterDownload(modal) {
  const area = $("#letter-download");
  const button = $("#download-letter");
  const label = $("span", button);
  const status = $("#letter-download-status");
  const originalLabel = label.textContent;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => area.classList.toggle("is-visible", entry.isIntersecting));
    }, { root: modal, threshold: .35 });
    observer.observe(area);
  } else area.classList.add("is-visible");

  button.addEventListener("click", async () => {
    button.disabled = true;
    label.textContent = "Preparando sua carta…";
    status.textContent = "";
    try {
      await createLetterPdf();
      label.textContent = "Agora ela é sua ♥";
      window.setTimeout(() => { label.textContent = originalLabel; button.disabled = false; }, 3200);
    } catch (error) {
      console.error("Falha ao gerar a carta em PDF:", error);
      label.textContent = originalLabel;
      button.disabled = false;
      status.textContent = "Não consegui preparar a carta agora :(";
    }
  });
}

// ─────────────────────────────────────────────────────────────
// ANIMAÇÕES GSAP + SCROLLTRIGGER
// ─────────────────────────────────────────────────────────────
function splitQuote() {
  const quote = $("[data-split-words]");
  const parts = quote.innerHTML.split(/(\s+|<br>)/g);
  quote.innerHTML = parts.map((part) => {
    if (part === "<br>" || /^\s+$/.test(part)) return part;
    return `<span class="word">${part}</span>`;
  }).join("");
}

function setupMotion() {
  if (!window.gsap || !window.ScrollTrigger || reducedMotion) return;
  const { gsap, ScrollTrigger } = window;
  document.documentElement.classList.add("motion-ready");
  gsap.registerPlugin(ScrollTrigger);

  gsap.to(".hero-moment__media img", { scale: 1.1, yPercent: 3, ease: "none", scrollTrigger: { trigger: ".hero-moment", start: "top top", end: "bottom top", scrub: 1 } });

  gsap.from(".photo-card--left", { xPercent: -55, rotate: -7, opacity: 0, scrollTrigger: { trigger: ".photo-card--left", start: "top 88%", end: "top 45%", scrub: 1 } });
  gsap.from(".photo-card--right", { xPercent: 55, rotate: 7, opacity: 0, scrollTrigger: { trigger: ".photo-card--right", start: "top 90%", end: "top 50%", scrub: 1 } });
  gsap.from(".photo-card--center", { yPercent: 30, scale: .88, opacity: 0, scrollTrigger: { trigger: ".photo-card--center", start: "top 92%", end: "top 50%", scrub: 1 } });

  gsap.to(".quote-moment__text .word", { opacity: 1, stagger: .12, ease: "none", scrollTrigger: { trigger: ".quote-moment", start: "top 60%", end: "center 45%", scrub: .8 } });
  gsap.from(".quote-moment__photo", { clipPath: "inset(14% 7% 14% 7%)", scale: .94, opacity: .35, ease: "none", scrollTrigger: { trigger: ".quote-moment", start: "top 82%", end: "top 28%", scrub: 1 } });
  gsap.to(".quote-moment__photo img", { yPercent: 3, scale: 1.045, ease: "none", scrollTrigger: { trigger: ".quote-moment", start: "top bottom", end: "bottom top", scrub: 1 } });

  gsap.from(".video-moment--large .video-shell", { clipPath: "inset(10% 0 10% 0)", scale: .96, opacity: .45, duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: ".video-moment--large", start: "top 62%" } });
  gsap.from(".video-moment--small .video-shell", { scale: .86, opacity: 0, duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: ".video-moment--small", start: "top 62%" } });
  gsap.from(".video-moment--cinema .video-shell", { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)", opacity: .5, duration: 1.25, ease: "power3.inOut", scrollTrigger: { trigger: ".video-moment--cinema", start: "top 62%" } });
  gsap.from(".video-moment--intimate .video-shell", { y: 45, scale: .92, opacity: 0, duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: ".video-moment--intimate", start: "top 65%" } });

  $$(".memory").forEach((card, index) => {
    gsap.from(card, { y: 100 + index * 10, x: index % 2 ? 40 : -40, opacity: 0, ease: "power2.out", scrollTrigger: { trigger: card, start: "top 94%", end: "top 66%", scrub: .7 } });
  });

  gsap.from(".relationship-counter__intro, .love-time, .relationship-counter__footer", {
    y: 38,
    opacity: 0,
    stagger: .16,
    duration: 1,
    ease: "power2.out",
    scrollTrigger: { trigger: ".relationship-counter", start: "top 62%" }
  });

  const layered = gsap.timeline({ scrollTrigger: { trigger: ".layered-memories", start: "top top", end: "bottom bottom", scrub: 1 } });
  layered.fromTo(".layered-photo--back", { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: .55, ease: "none" })
    .from(".layered-photo--front", { yPercent: 55, xPercent: 18, rotate: 7, opacity: 0, duration: .35, ease: "power2.out" }, .38)
    .from(".layered-memories__caption", { y: 24, opacity: 0, duration: .25 }, .58)
    .to(".layered-photo--back img", { scale: 1.045, duration: .4, ease: "none" }, .6);

  const expand = gsap.timeline({ scrollTrigger: { trigger: ".expanding-photo", start: "top top", end: "bottom bottom", scrub: 1 } });
  expand.to(".expanding-photo__media", { width: "100vw", height: "100vh", maxWidth: "none", ease: "none" })
    .to(".expanding-photo__shade", { opacity: 1, duration: .25 }, .7)
    .to(".expanding-photo figcaption", { opacity: 1, y: -10, duration: .3 }, .7);

  const flashTimeline = gsap.timeline({ scrollTrigger: { trigger: ".flashes", start: "top top", end: "bottom bottom", scrub: .55 } });
  $$(".flash").forEach((flash, index) => {
    flashTimeline.fromTo(flash,
      { opacity: 0, scale: index % 2 ? 1.1 : .86, xPercent: index % 2 ? 8 : -8, clipPath: "inset(12% 8% 12% 8%)" },
      { opacity: 1, scale: 1, xPercent: 0, clipPath: "inset(0% 0% 0% 0%)", duration: .7, ease: "power2.out" }
    ).to(flash, { opacity: 0, scale: 1.035, duration: .3 });
  });

  gsap.from(".letter-invitation__content", { y: 45, opacity: 0, duration: 1, ease: "power2.out", scrollTrigger: { trigger: ".letter-invitation", start: "top 65%" } });
  gsap.from(".final-moment__content", { y: 35, opacity: 0, duration: 1.2, ease: "power2.out", scrollTrigger: { trigger: ".final-moment", start: "top 55%" } });
  gsap.to(".final-moment__media img", { scale: 1.08, duration: 12, ease: "none", scrollTrigger: { trigger: ".final-moment", start: "top 70%", toggleActions: "play none none reverse" } });
}

// ─────────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────────
function init() {
  applyCoupleData();
  splitQuote();
  setupMediaFallbacks();
  setupMusicControl();
  setupVideos();
  setupLetter();
  setupRelationshipCounter();
  loadYouTubeAPI();

  $("#start-experience").addEventListener("click", startExperience);
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      $("#loader").classList.add("is-done");
      setupMotion();
    }, 750);
  }, { once: true });
}

init();
