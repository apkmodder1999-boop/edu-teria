import { el, esc } from "../utils";
import { navigate } from "../store";
import { fetchTopics } from "../api";
import type { Topic } from "../types";

export async function renderTopics(
  courseId: number,
  subjectId: number,
  subjectName?: string,
  courseName?: string
): Promise<HTMLElement> {
  const container = el("div", "fade-in flex flex-col");
  const displayCourse = courseName || `Batch #${courseId}`;
  const displaySubject = subjectName || `Subject #${subjectId}`;

  container.innerHTML = `
    <!-- Breadcrumb Bar -->
    <div class="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
      <button id="btnBackToSubjects" class="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-1.5 text-foreground hover:border-primary/40 hover:text-primary transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>Back to Subjects</span>
      </button>
      <span>/</span>
      <button id="btnNavCourse" class="hover:text-primary transition-colors cursor-pointer">${esc(displayCourse)}</button>
      <span>/</span>
      <span class="text-foreground line-clamp-1 font-bold">${esc(displaySubject)}</span>
    </div>

    <!-- Title & Stats -->
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-foreground">${esc(displaySubject)}</h1>
        <p class="text-xs sm:text-sm text-muted-foreground mt-1">${esc(displayCourse)} &rsaquo; Select chapter / topic</p>
      </div>
      <div id="topicCountBadge" class="hidden shrink-0 self-start sm:self-auto rounded-full border border-sky-400/25 bg-sky-500/10 px-3.5 py-1 text-xs font-black text-sky-400">
        0 Chapters
      </div>
    </div>

    <!-- Topics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="topicGrid">
      <div class="col-span-full py-12 text-center text-muted-foreground">
        <div class="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p class="text-xs">Loading chapters…</p>
      </div>
    </div>
  `;

  container.querySelector("#btnBackToSubjects")?.addEventListener("click", () => {
    navigate({ view: "subjects", courseId, courseName });
  });

  container.querySelector("#btnNavCourse")?.addEventListener("click", () => {
    navigate({ view: "subjects", courseId, courseName });
  });

  const gridEl = container.querySelector<HTMLElement>("#topicGrid")!;
  const countBadge = container.querySelector<HTMLElement>("#topicCountBadge")!;

  try {
    const topics = await fetchTopics(courseId, subjectId, "eduteria");

    if (!topics.length) {
      gridEl.innerHTML = `
        <div class="col-span-full rounded-2xl border border-border/80 bg-card/60 p-10 text-center backdrop-blur-sm">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-xl text-accent">
            📂
          </div>
          <h3 class="text-base font-bold text-foreground">No Chapters Found</h3>
          <p class="mt-1 text-xs text-muted-foreground">This subject does not currently have any recorded chapters or lectures.</p>
        </div>
      `;
      return container;
    }

    countBadge.textContent = `${topics.length} ${topics.length === 1 ? "Chapter" : "Chapters"}`;
    countBadge.classList.remove("hidden");
    gridEl.innerHTML = "";

    topics.forEach((t: Topic) => {
      const card = el(
        "div",
        "group flex items-center gap-4 rounded-2xl border border-border/80 bg-[#0b1220]/80 p-4.5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-[#0f172a] hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
      );

      card.innerHTML = `
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-400 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="line-clamp-1 text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
            ${esc(t.name)}
          </h3>
          <p class="text-xs text-muted-foreground mt-0.5">
            ${t.videoCount ? `${t.videoCount} lectures in chapter` : "Watch lecture videos"}
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
          view: "lectures",
          courseId,
          courseName,
          subjectId,
          subjectName,
          topicId: t.id,
          topicName: t.name,
        });
      });

      gridEl.appendChild(card);
    });
  } catch (err: any) {
    gridEl.innerHTML = `
      <div class="col-span-full rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
        <p class="font-bold">Failed to load chapters</p>
        <p class="text-xs mt-1 text-slate-400">${esc(err?.message || "Please check your network and retry.")}</p>
        <button id="retryTopicBtn" class="mt-4 px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs">Retry</button>
      </div>
    `;
    container.querySelector("#retryTopicBtn")?.addEventListener("click", () => {
      navigate({ view: "topics", courseId, courseName, subjectId, subjectName }, true);
    });
  }

  return container;
}
