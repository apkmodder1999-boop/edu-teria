export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function esc(t: string | number | undefined): string {
  if (t == null) return "";
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatDuration(secs?: number): string {
  if (!secs) return "";
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const spinner = (n = 28) =>
  `<svg class="spin" width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="15" stroke-linecap="round"/></svg>`;

export const chevron = () =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

export function skeletonCourseGrid(count = 8): string {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="skel-card">
        <div class="skel-thumb"></div>
        <div class="skel-body">
          <div class="skel-line full"></div>
          <div class="skel-line short"></div>
        </div>
      </div>
    `
    )
    .join("");
}

export function skeletonListRows(count = 6): string {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="skel-row">
        <div class="skel-icon"></div>
        <div class="skel-text">
          <div class="skel-line med"></div>
          <div class="skel-line short"></div>
        </div>
      </div>
    `
    )
    .join("");
}

export function skeletonLecRows(count = 6): string {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="skel-lec">
        <div class="skel-lec-thumb"></div>
        <div class="skel-text">
          <div class="skel-line full"></div>
          <div class="skel-line short"></div>
        </div>
        <div class="skel-btn"></div>
      </div>
    `
    )
    .join("");
}

export function showToast(message: string, type: "info" | "error" | "success" = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:90vw;";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  const bg = type === "error" ? "var(--er, #ef4444)" : (type === "success" ? "#16a34a" : "var(--sf2, #1e293b)");
  const border = type === "error" ? "#dc2626" : (type === "success" ? "#15803d" : "rgba(255,255,255,0.15)");
  toast.style.cssText = `pointer-events:auto;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:500;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);display:flex;align-items:center;gap:10px;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);transform:translateY(12px);opacity:0;background:${bg};color:#fff;border:1px solid ${border};`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  });
  setTimeout(() => {
    toast.style.transform = "translateY(12px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function openDocViewer(title: string, url: string) {
  document.getElementById("docmodal")?.remove();
  const modal = document.createElement("div");
  modal.id = "docmodal";
  modal.className = "vmodal open";
  modal.innerHTML = `
    <div class="vmodal-box" style="max-width:860px;width:95%;height:85vh;display:flex;flex-direction:column;">
      <div class="vmodal-head">
        <span class="vmodal-title">${esc(title)}</span>
        <div style="display:flex;align-items:center;gap:12px;">
          <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="btn" style="padding:4px 10px;font-size:12px;background:var(--ac);color:#fff;text-decoration:none;border-radius:6px;">Direct Link</a>
          <button class="vmodal-close" id="doc-close-btn">&times;</button>
        </div>
      </div>
      <div style="flex:1;overflow:hidden;background:#000;border-radius:0 0 12px 12px;">
        <iframe src="${esc(url)}" style="width:100%;height:100%;border:none;" title="${esc(title)}"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#doc-close-btn")?.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

