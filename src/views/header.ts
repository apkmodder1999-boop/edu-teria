import { el, esc } from "../utils";
import { navigate } from "../store";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export function buildHeader(
  onBack?: () => void,
  breadcrumbs?: BreadcrumbItem[]
): HTMLElement {
  const header = el("header", "app-hdr");

  let backBtnHtml = "";
  if (onBack) {
    backBtnHtml = `
      <button class="hdr-back-btn" id="hdr-back" title="Go back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    `;
  }

  let breadcrumbsHtml = "";
  if (breadcrumbs && breadcrumbs.length > 0) {
    breadcrumbsHtml = `
      <div class="hdr-breadcrumbs">
        ${breadcrumbs
          .map((b, idx) => {
            if (b.active || !b.onClick) {
              return `<span class="bc-item active" title="${esc(b.label)}">${esc(b.label)}</span>`;
            }
            return `<button class="bc-item btn-link" data-bc="${idx}" title="${esc(b.label)}">${esc(b.label)}</button><span class="bc-sep">/</span>`;
          })
          .join("")}
      </div>
    `;
  }

  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const isDark = currentTheme === "dark";

  header.innerHTML = `
    <div class="hdr-container">
      <div class="hdr-left">
        ${backBtnHtml}
        <div class="hdr-brand" id="hdr-logo" title="Eduteria Courses">
          <div class="brand-badge">E</div>
          <div class="brand-text">
            <span class="brand-name">Eduteria</span>
            <span class="brand-sub">Course Explorer</span>
          </div>
        </div>
        ${breadcrumbsHtml}
      </div>
      <div class="hdr-right">
        <button class="theme-toggle-btn" id="theme-btn" title="Toggle theme">
          <svg class="theme-icon-moon" style="display:${isDark ? "none" : "block"};" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <svg class="theme-icon-sun" style="display:${isDark ? "block" : "none"};" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
      </div>
    </div>
  `;

  if (onBack) {
    header.querySelector("#hdr-back")?.addEventListener("click", onBack);
  }

  header.querySelector("#hdr-logo")?.addEventListener("click", () => {
    navigate({ view: "courses", platform: "eduteria" });
  });

  if (breadcrumbs) {
    header.querySelectorAll<HTMLButtonElement>("[data-bc]").forEach((btn) => {
      const idx = Number(btn.getAttribute("data-bc"));
      const b = breadcrumbs[idx];
      if (b && b.onClick) {
        btn.addEventListener("click", b.onClick);
      }
    });
  }

  const themeBtn = header.querySelector("#theme-btn")!;
  themeBtn.addEventListener("click", () => {
    const active = document.documentElement.getAttribute("data-theme") || "dark";
    const next = active === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cwv-theme", next);
    const moon = themeBtn.querySelector<HTMLElement>(".theme-icon-moon");
    const sun = themeBtn.querySelector<HTMLElement>(".theme-icon-sun");
    if (moon && sun) {
      moon.style.display = next === "dark" ? "none" : "block";
      sun.style.display = next === "dark" ? "block" : "none";
    }
  });

  return header;
}
