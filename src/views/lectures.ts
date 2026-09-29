import { el, esc, spinner, formatDuration, skeletonLecRows, showToast, openDocViewer } from "../utils";
import { navigate } from "../store";
import { fetchLectures, fetchVideoStream, fetchTopics } from "../api";
import { buildHeader } from "./header";
import type { Lecture, Topic } from "../types";
import type { StreamResponse } from "../api";

let playerRef: any = null;
let hlsRef: any = null;

function destroyPlayer() {
  if (playerRef) {
    try {
      playerRef.destroy();
    } catch {}
    playerRef = null;
  }
  if (hlsRef) {
    try {
      hlsRef.destroy();
    } catch {}
    hlsRef = null;
  }
}

function closeModal() {
  const m = document.getElementById("vmodal");
  if (!m) return;
  const v = m.querySelector<HTMLVideoElement>("video");
  if (v) {
    v.pause();
    v.src = "";
  }
  destroyPlayer();
  m.classList.remove("open");
  setTimeout(() => m.remove(), 260);
}

function ensurePlayerLibs(cb: () => void) {
  let loaded = 0;
  const total = 2;
  const check = () => {
    loaded++;
    if (loaded >= total) cb();
  };

  // 1. Shaka Player (for MPEG-DASH & Widevine DRM)
  if ((window as any).shaka) {
    loaded++;
  } else {
    const s1 = document.createElement("script");
    s1.src = "https://cdn.jsdelivr.net/npm/shaka-player@4.9.4/dist/shaka-player.compiled.js";
    s1.onload = () => {
      try {
        (window as any).shaka.polyfill.installAll();
      } catch {}
      check();
    };
    s1.onerror = check;
    document.head.appendChild(s1);
  }

  // 2. HLS.js (for direct HLS streams)
  if ((window as any).Hls) {
    loaded++;
  } else {
    const s2 = document.createElement("script");
    s2.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js";
    s2.onload = check;
    s2.onerror = check;
    document.head.appendChild(s2);
  }

  if (loaded >= total) cb();
}

function openPlayer(
  title: string,
  streamInfo: StreamResponse | string,
  bitrates?: { title: string; url: string }[],
  _platform = "eduteria"
) {
  document.getElementById("vmodal")?.remove();
  const modal = el("div", "vmodal");
  modal.id = "vmodal";

  const streamUrl = typeof streamInfo === "string" ? streamInfo : streamInfo.url;
  const licenseUrl = typeof streamInfo === "string" ? undefined : streamInfo.licenseUrl;
  const hasDirectHls = typeof streamInfo !== "string" && !!(streamInfo as any).directUrl;
  const effectiveUrl = hasDirectHls ? (streamInfo as any).directUrl : streamUrl;
  let activePlayingUrl = effectiveUrl;

  let qualitySelectorHtml = "";
  if (bitrates && bitrates.length > 1) {
    qualitySelectorHtml = `
      <div class="vmodal-qualities">
        <span>Quality:</span>
        ${bitrates
          .map(
            (b, idx) =>
              `<button class="quality-btn" data-url="${esc(b.url)}" style="background:${idx === 0 ? "var(--ac)" : "var(--sf2)"}; color:${idx === 0 ? "#fff" : "var(--tx)"};">${esc(b.title)}p</button>`
          )
          .join("")}
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="vmodal-backdrop"></div>
    <div class="vmodal-box">
      <div class="vmodal-hdr">
        <span class="vmodal-title">${esc(title)}</span>
        <button class="vmodal-close" title="Close player">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="vmodal-player">
        <video id="hls-video" controls playsinline></video>
      </div>
      ${qualitySelectorHtml}
      <div class="vmodal-info">
        <span class="vmodal-live-dot"></span>
        <span class="vmodal-stream-label">Stream active &bull; Unlocked HD Playback</span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add("open"));
  modal.querySelector(".vmodal-close")!.addEventListener("click", closeModal);
  modal.querySelector(".vmodal-backdrop")!.addEventListener("click", closeModal);

  const video = modal.querySelector<HTMLVideoElement>("#hls-video")!;

  function playSource(url: string, lic?: string, fallbackHls?: string) {
    activePlayingUrl = url;
    destroyPlayer();

    ensurePlayerLibs(async () => {
      const shaka = (window as any).shaka;
      const Hls = (window as any).Hls;
      const isDash = url.includes(".mpd");

      // Helper: play via HLS.js
      function playHls(hlsUrl: string) {
        if (Hls?.isSupported()) {
          const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
          hlsRef = hls;
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
            if (data?.levels && data.levels.length > 1) {
              const qualityHtml = `
                <div class="vmodal-qualities">
                  <span>Quality:</span>
                  <button class="hls-quality-btn" data-level="-1" style="background:var(--ac); color:#fff;">Auto</button>
                  ${data.levels
                    .map(
                      (lvl: any, idx: number) =>
                        `<button class="hls-quality-btn" data-level="${idx}" style="background:var(--sf2); color:var(--tx);">${lvl.height ? lvl.height + "p" : "Level " + (idx + 1)}</button>`
                    )
                    .join("")}
                </div>
              `;
              const existingQualities = modal.querySelector(".vmodal-qualities");
              if (existingQualities) {
                existingQualities.outerHTML = qualityHtml;
              } else {
                const playerBox = modal.querySelector(".vmodal-player");
                if (playerBox) playerBox.insertAdjacentHTML("afterend", qualityHtml);
              }
              modal.querySelectorAll<HTMLButtonElement>(".hls-quality-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                  modal.querySelectorAll(".hls-quality-btn").forEach((b) => {
                    (b as HTMLElement).style.background = "var(--sf2)";
                    (b as HTMLElement).style.color = "var(--tx)";
                  });
                  btn.style.background = "var(--ac)";
                  btn.style.color = "#fff";
                  const lvl = parseInt(btn.getAttribute("data-level") || "-1", 10);
                  hls.currentLevel = lvl;
                });
              });
            }
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_: unknown, d: { fatal: boolean }) => {
            if (d.fatal) {
              destroyPlayer();
              video.src = `/api/proxy/stream?url=${encodeURIComponent(hlsUrl)}`;
              video.play().catch(() => {});
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS
          video.src = hlsUrl;
          video.play().catch(() => {});
        } else {
          video.src = `/api/proxy/stream?url=${encodeURIComponent(hlsUrl)}`;
          video.play().catch(() => {});
        }
      }

      // Case 1: direct non-DRM HLS url is provided — play it immediately
      if (!isDash && url.includes(".m3u8")) {
        playHls(url);
        return;
      }

      // Case 2: DASH stream — try Shaka Player (Widevine DRM)
      if (isDash && shaka) {
        try {
          const player = new shaka.Player(video);
          playerRef = player;

          player.addEventListener("error", (event: any) => {
            console.error("Shaka error:", event.detail?.code, event.detail?.message);
          });

          if (lic) {
            player.configure({
              drm: {
                servers: { "com.widevine.alpha": lic },
              },
            });
          }

          await player.load(url);
          await video.play().catch(() => {});
          return;
        } catch (err) {
          console.warn("Shaka DASH failed, trying HLS fallback:", err);
          destroyPlayer();
        }
      }

      // Case 3: Fallback to non-DRM HLS
      if (fallbackHls) {
        playHls(fallbackHls);
        return;
      }

      // Last resort: direct src
      video.src = url;
      video.play().catch(() => {});
    });
  }

  const effectiveLic = hasDirectHls ? undefined : licenseUrl;
  const fallbackHls = hasDirectHls ? undefined : (typeof streamInfo !== "string" ? (streamInfo as any).directUrl : undefined);

  playSource(effectiveUrl, effectiveLic, fallbackHls);

  modal.querySelectorAll<HTMLButtonElement>(".quality-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".quality-btn").forEach((b) => {
        (b as HTMLElement).style.background = "var(--sf2)";
        (b as HTMLElement).style.color = "var(--tx)";
      });
      btn.style.background = "var(--ac)";
      btn.style.color = "#fff";
      const qUrl = btn.getAttribute("data-url");
      if (qUrl) playSource(qUrl, licenseUrl);
    });
  });
}

function buildFolderRow(lec: Lecture, onNavigate: (l: Lecture) => void): HTMLElement {
  const row = el("div", "list-row");
  const vcnt = (lec as any).videoCount;
  row.innerHTML = `
    <div class="row-icon folder">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <div class="row-body">
      <div class="row-title">${esc(lec.name)}</div>
      ${vcnt ? `<div class="row-meta"><span class="row-badge">${vcnt} videos</span></div>` : ""}
    </div>
    <div class="row-arrow">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  `;
  row.addEventListener("click", () => onNavigate(lec));
  return row;
}

function buildRow(lec: Lecture, onPlay: (l: Lecture) => void): HTMLElement {
  const isVid = lec.contentType === 2;
  const isPdf = lec.contentType === 3;
  const dur = formatDuration(lec.duration);
  const row = el("div", "lec-row");

  const typePill = isPdf
    ? `<span class="type-pill d">PDF</span>`
    : `<span class="type-pill v">Video</span>`;

  const statusBadge = lec.originalLocked
    ? `<span class="badge-status unlocked">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 11V7a5 5 0 0 1 9.9-1"/><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/></svg>
        Unlocked
      </span>`
    : `<span class="badge-status available">Available</span>`;

  const actionButtons = `
    <button class="play-btn" title="${isVid ? "Play lecture" : "Open document"}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
      </svg>
    </button>
  `;

  row.innerHTML = `
    <div class="lec-thumb ${isVid ? "v" : "d"}">
      ${
        lec.thumbnailUrl
          ? `<img src="${esc(lec.thumbnailUrl)}" alt="" loading="lazy"/>`
          : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`
      }
      <div class="play-overlay"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
    </div>
    <div class="lec-body">
      <div class="lec-title">${esc(lec.name)}</div>
      <div class="lec-meta">
        ${typePill}
        ${dur ? `<span class="dur">${dur}</span>` : ""}
        ${statusBadge}
      </div>
    </div>
    ${actionButtons}
  `;

  const play = () => onPlay(lec);
  row.querySelector(".play-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    play();
  });
  row.addEventListener("click", play);
  return row;
}

export async function renderLectures(
  courseId: number,
  topicId: number,
  topicName?: string,
  courseName?: string,
  subjectId?: number,
  platform = "eduteria"
): Promise<HTMLElement> {
  const wrap = el("div", "page");

  const displayCourse = courseName || `Course ${courseId}`;
  const displayTopic = topicName || `Topic ${topicId}`;
  const platName = platform === "next-toppers" ? "Next Toppers" : (platform.charAt(0).toUpperCase() + platform.slice(1));

  // Header with full URL breadcrumbs
  wrap.appendChild(
    buildHeader(
      () =>
        navigate({
          view: "topics",
          platform,
          courseId,
          courseName,
          subjectId,
        }),
      [
        { label: platName, onClick: () => navigate({ view: "courses", platform }) },
        { label: String(courseId), onClick: () => navigate({ view: "subjects", platform, courseId, courseName }) },
        ...(subjectId
          ? [
              {
                label: `Subject ${subjectId}`,
                onClick: () =>
                  navigate({
                    view: "topics",
                    platform,
                    courseId,
                    courseName,
                    subjectId,
                  }),
              },
            ]
          : []),
        { label: topicName || String(topicId), active: true },
      ]
    )
  );

  const body = el("div");
  body.innerHTML = `
    <div class="page-title-bar">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <h1 id="topic-title">${esc(displayTopic)}</h1>
        <span id="lec-count-pill" style="display:none;" class="row-badge"></span>
      </div>
      <div class="breadcrumb">${esc(platName)} &rsaquo; ${esc(displayCourse)}</div>
    </div>
    <div class="list-wrap" id="lec-list">${skeletonLecRows(8)}</div>
  `;
  wrap.appendChild(body);
  const listEl = body.querySelector("#lec-list")!;

  // If topicName was not passed (direct URL visit), resolve topic name
  if (!topicName && subjectId) {
    fetchTopics(courseId, subjectId, platform)
      .then((topics) => {
        const found = topics.find((t: Topic) => t.id === topicId);
        if (found) {
          const h1 = body.querySelector("#topic-title");
          if (h1) h1.textContent = found.name;
        }
      })
      .catch(() => {});
  }

  async function playLec(lec: Lecture) {
    if (lec.contentType === 3 || lec.contentType === 1) {
      if (lec.videoUrl) {
        openDocViewer(lec.name, lec.videoUrl);
        return;
      }
      showToast("This document is locked or requires student authorization.", "info");
      return;
    }

    // YouTube video handling
    if ((lec as any).isYouTube && lec.videoUrl) {
      openPlayer(lec.name, lec.videoUrl, lec.bitrateUrls, platform);
      return;
    }

    // If lecture has a vdcId, always unlock the fresh .m3u8 stream!
    if (lec.vdcId) {
      const overlay = el(
        "div",
        "global-loading",
        `${spinner(36)}<span style="font-weight:600; font-size:14px; letter-spacing:-.2px;">Unlocking HD video stream…</span>`
      );
      document.body.appendChild(overlay);
      try {
        const streamInfo = await fetchVideoStream(lec.vdcId, platform);
        const playUrl = streamInfo.directUrl || streamInfo.url;
        lec.videoUrl = playUrl;
        document.body.removeChild(overlay);
        openPlayer(lec.name, streamInfo, lec.bitrateUrls, platform);
      } catch (e: any) {
        document.body.removeChild(overlay);
        const msg = e?.message || "This video is locked or requires student authorization.";
        showToast(msg, "error");
      }
      return;
    }

    // Direct playable stream URL (.m3u8, .mpd, .mp4)
    if (lec.videoUrl && !lec.videoUrl.includes("/download/")) {
      openPlayer(lec.name, lec.videoUrl, lec.bitrateUrls, platform);
      return;
    }

    showToast("No stream available for this lecture.", "info");
  }

  try {
    const lectures = await fetchLectures(courseId, topicId, subjectId, platform);
    if (!lectures.length) {
      listEl.innerHTML = `<div class="empty"><div style="font-size:2rem;margin-bottom:8px;">🎬</div>No lectures found in this topic</div>`;
      return wrap;
    }
    listEl.innerHTML = "";

    const countPill = body.querySelector<HTMLElement>("#lec-count-pill");
    if (countPill) {
      countPill.textContent = `${lectures.length} ${lectures.length === 1 ? "lecture" : "lectures"}`;
      countPill.style.display = "inline-block";
    }

    lectures.forEach((l: any) => {
      if (l.contentType === 0) {
        listEl.appendChild(buildFolderRow(l, (folder) => {
          navigate({
            view: "lectures",
            platform,
            courseId,
            courseName,
            subjectId,
            topicId: folder.id,
            topicName: folder.name,
          });
        }));
      } else {
        listEl.appendChild(buildRow(l, playLec));
      }
    });
  } catch (e) {
    listEl.innerHTML = `<div class="error-box">Failed to load lectures.<br/><small>${esc(String(e))}</small></div>`;
  }
  return wrap;
}
