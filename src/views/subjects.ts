import { el, esc, showToast } from "../utils";
import { navigate, isCourseEnrolled, toggleEnrollCourse } from "../store";
import { fetchSubjects } from "../api";
import type { Subject } from "../types";

export async function renderSubjects(
  courseId: number,
  courseName?: string
): Promise<HTMLElement> {
  const container = el("div", "fade-in flex flex-col");
  const displayName = courseName || `Batch #${courseId}`;
  let isEnrolled = isCourseEnrolled(courseId);

  container.innerHTML = `
    <!-- Breadcrumb Bar -->
    <div class="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
      <button id="btnBackToCourses" class="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-1.5 text-foreground hover:border-primary/40 hover:text-primary transition-all cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>Back to Batches</span>
      </button>
      <span>/</span>
      <span class="text-foreground line-clamp-1 font-bold">${esc(displayName)}</span>
    </div>

    <!-- Title & Stats -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-foreground">${esc(displayName)}</h1>
        <p class="text-xs sm:text-sm text-muted-foreground mt-1">Select a subject to browse topics and video classes</p>
      </div>
      <div id="subjectCountBadge" class="hidden shrink-0 self-start sm:self-auto rounded-full border border-sky-400/25 bg-sky-500/10 px-3.5 py-1 text-xs font-black text-sky-400">
        0 Subjects
      </div>
    </div>

    <!-- Enrollment & Price Banner (Exact Match to User UI) -->
    <div class="mb-8 rounded-2xl border border-border/80 bg-[#0b1220]/90 p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="text-sm sm:text-base font-bold text-slate-400 line-through decoration-red-400/80">₹999</span>
            <span class="text-2xl sm:text-3xl font-black text-[#00e699]">FREE</span>
          </div>
        </div>

        <!-- Enroll Button -->
        <button id="enrollSubjectTopBtn" class="press inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-black transition-all cursor-pointer ${
          isEnrolled
            ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
            : "border-sky-400/40 bg-sky-500/10 text-sky-400 hover:bg-sky-400/20"
        }">
          <svg class="enroll-sub-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${
              isEnrolled
                ? '<polyline points="20 6 9 17 4 12"></polyline>'
                : '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>'
            }
          </svg>
          <span id="enrollSubjectTopText">${isEnrolled ? "ENROLLED" : "ENROLL NOW"}</span>
        </button>
      </div>

      <!-- Full-width Action: LET'S STUDY ▶ -->
      <button id="btnScrollToSubjects" class="press w-full rounded-full bg-[#0284c7] hover:bg-[#0369a1] active:scale-[0.98] py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-md shadow-sky-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer">
        <span>LET'S STUDY</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6 4 20 12 6 20 6 4"></polygon>
        </svg>
      </button>
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

  // "LET'S STUDY" scrolls directly to subject list
  container.querySelector("#btnScrollToSubjects")?.addEventListener("click", () => {
    const grid = container.querySelector("#subjectGrid");
    grid?.scrollIntoView({ behavior: "smooth" });
  });

  // Handle enrollment button on subjects header
  const enrollBtn = container.querySelector<HTMLButtonElement>("#enrollSubjectTopBtn")!;
  enrollBtn.addEventListener("click", () => {
    const enrolledNow = toggleEnrollCourse(courseId);
    isEnrolled = enrolledNow;
    if (enrolledNow) {
      enrollBtn.className =
        "press inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-black transition-all cursor-pointer border-emerald-400/50 bg-emerald-500/20 text-emerald-300";
      enrollBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>ENROLLED</span>
      `;
      showToast(`Enrolled in "${displayName}"!`, "success");
    } else {
      enrollBtn.className =
        "press inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-black transition-all cursor-pointer border-sky-400/40 bg-sky-500/10 text-sky-400 hover:bg-sky-400/20";
      enrollBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
          <path d="M22 10v6"></path>
          <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
        </svg>
        <span>ENROLL NOW</span>
      `;
      showToast(`Removed from enrolled batches`, "info");
    }
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
