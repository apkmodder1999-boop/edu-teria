import { el, esc } from "../utils";
import { navigate } from "../store";
import { fetchSubjects } from "../api";
import type { Subject } from "../types";

export async function renderSubjects(
  courseId: number,
  courseName?: string
): Promise<HTMLElement> {
  const container = el("div", "fade-in flex flex-col");
  const displayName = courseName || `Batch #${courseId}`;

  container.innerHTML = `
    <!-- Breadcrumb Bar -->
    <div class="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
      <button id="btnBackToCourses" class="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-1.5 text-foreground hover:border-primary/40 hover:text-primary transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>Back to Batches</span>
      </button>
      <span>/</span>
      <span class="text-foreground line-clamp-1 font-bold">${esc(displayName)}</span>
    </div>

    <!-- Title & Stats -->
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-foreground">${esc(displayName)}</h1>
        <p class="text-xs sm:text-sm text-muted-foreground mt-1">Select a subject to browse topics and video classes</p>
      </div>
      <div id="subjectCountBadge" class="hidden shrink-0 self-start sm:self-auto rounded-full border border-sky-400/25 bg-sky-500/10 px-3.5 py-1 text-xs font-black text-sky-400">
        0 Subjects
      </div>
    </div>

    <!-- Subjects List / Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="subjectGrid">
      <div class="col-span-full py-12 text-center text-muted-foreground">
        <div class="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p class="text-xs">Loading subjects…</p>
      </div>
    </div>
  `;

  container.querySelector("#btnBackToCourses")?.addEventListener("click", () => {
    navigate({ view: "courses" });
  });

  const gridEl = container.querySelector<HTMLElement>("#subjectGrid")!;
  const countBadge = container.querySelector<HTMLElement>("#subjectCountBadge")!;

  try {
    const subjects = await fetchSubjects(courseId, "eduteria");

    if (!subjects.length) {
      gridEl.innerHTML = `
        <div class="col-span-full rounded-2xl border border-border/80 bg-card/60 p-10 text-center backdrop-blur-sm">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">
            📁
          </div>
          <h3 class="text-base font-bold text-foreground">No Subjects Found</h3>
          <p class="mt-1 text-xs text-muted-foreground">This batch does not currently have any active subjects.</p>
        </div>
      `;
      return container;
    }

    countBadge.textContent = `${subjects.length} ${subjects.length === 1 ? "Subject" : "Subjects"}`;
    countBadge.classList.remove("hidden");
    gridEl.innerHTML = "";

    subjects.forEach((s: Subject) => {
      const card = el(
        "div",
        "group flex items-center gap-4 rounded-2xl border border-border/80 bg-[#0b1220]/80 p-4.5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-[#0f172a] hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
      );

      card.innerHTML = `
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-400 group-hover:scale-105 group-hover:bg-sky-500/20 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="line-clamp-1 text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
            ${esc(s.name)}
          </h3>
          <p class="text-xs text-muted-foreground mt-0.5">
            ${s.videoCount ? `${s.videoCount} lectures recorded` : "Explore chapters & lectures"}
          </p>
        </div>
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground group-hover:bg-primary group-hover:text-black transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      `;

      card.addEventListener("click", () => {
        navigate({
          view: "topics",
          courseId,
          courseName,
          subjectId: s.id,
          subjectName: s.name,
        });
      });

      gridEl.appendChild(card);
    });
  } catch (err: any) {
    gridEl.innerHTML = `
      <div class="col-span-full rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
        <p class="font-bold">Failed to load subjects</p>
        <p class="text-xs mt-1 text-slate-400">${esc(err?.message || "Please check your network and retry.")}</p>
        <button id="retrySubBtn" class="mt-4 px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs">Retry</button>
      </div>
    `;
    container.querySelector("#retrySubBtn")?.addEventListener("click", () => {
      navigate({ view: "subjects", courseId, courseName }, true);
    });
  }

  return container;
}
