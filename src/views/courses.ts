import { el, esc } from "../utils";
import { navigate, navState, getEnrolledCourseIds } from "../store";
import { fetchCourses } from "../api";
import type { Course } from "../types";

export async function renderCourses(): Promise<HTMLElement> {
  const container = el("div", "fade-in flex flex-col");
  const isAllTab = (navState.tab || "all") === "all";

  container.innerHTML = `
    <!-- Hero / Welcome Header -->
    <div class="fade-in mb-8 text-center sm:text-left">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles h-3.5 w-3.5">
          <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
          <path d="M20 2v4"></path>
          <path d="M22 4h-4"></path>
          <circle cx="4" cy="20" r="2"></circle>
        </svg>
        Welcome to Eduteria Learn Topper
      </div>
      <h1 class="mb-3 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
        Explore <br class="hidden sm:block">
        <span class="bg-gradient-to-r from-brand-soft to-accent bg-clip-text text-transparent">All Batches</span>
      </h1>
      <p class="mx-auto max-w-2xl text-sm font-medium text-muted-foreground sm:mx-0 sm:text-base">
        Discover our premium live batches and recorded courses tailored for your success. Start exploring now!
      </p>
    </div>

    <!-- Tabs Navigation -->
    <div class="no-scrollbar fade-in mb-6 flex items-center gap-6 overflow-x-auto border-b border-border sm:gap-8">
      <button id="tabAllBtn" class="cursor-pointer relative shrink-0 pb-3 text-sm font-bold transition-colors sm:text-base ${
        isAllTab
          ? "text-accent after:absolute after:-bottom-px after:left-0 after:h-[3px] after:w-full after:rounded-t after:bg-primary after:content-['']"
          : "text-muted-foreground hover:text-foreground"
      }">
        All Batches
      </button>
      <button id="tabEnrolledBtn" class="cursor-pointer relative shrink-0 pb-3 text-sm font-bold transition-colors sm:text-base ${
        !isAllTab
          ? "text-accent after:absolute after:-bottom-px after:left-0 after:h-[3px] after:w-full after:rounded-t after:bg-primary after:content-['']"
          : "text-muted-foreground hover:text-foreground"
      }">
        Enrolled Batches
      </button>
    </div>

    <!-- Sub-bar: stats and mobile search -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="text-xs font-bold uppercase tracking-wider text-muted-foreground" id="batchesCountLabel">
        Loading batches…
      </div>
      <!-- Mobile Search Field -->
      <div class="flex sm:hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground focus-within:border-primary/40">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search text-muted-foreground">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          id="mobileSearchInput"
          placeholder="Search batches..."
          class="w-full border-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          value="${esc(navState.search || "")}"
        />
      </div>
    </div>

    <!-- Grid Container -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" id="batchesGrid">
      <div class="col-span-full py-16 text-center text-muted-foreground">
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p class="text-sm">Fetching batches from Eduteria…</p>
      </div>
    </div>
  `;

  const gridEl = container.querySelector<HTMLElement>("#batchesGrid")!;
  const countLabel = container.querySelector<HTMLElement>("#batchesCountLabel")!;
  const tabAllBtn = container.querySelector<HTMLButtonElement>("#tabAllBtn")!;
  const tabEnrolledBtn = container.querySelector<HTMLButtonElement>("#tabEnrolledBtn")!;
  const mobileSearch = container.querySelector<HTMLInputElement>("#mobileSearchInput");

  tabAllBtn.addEventListener("click", () => {
    navigate({ tab: "all" });
  });

  tabEnrolledBtn.addEventListener("click", () => {
    navigate({ tab: "enrolled" });
  });

  try {
    const allCourses = await fetchCourses("eduteria");

    function renderList() {
      let filtered = [...allCourses];
      const enrolledIds = getEnrolledCourseIds();

      if (!isAllTab) {
        if (enrolledIds.length > 0) {
          filtered = filtered.filter((c) => enrolledIds.includes(c.id));
        } else {
          // If none specifically enrolled, show available / free batches
          filtered = filtered.filter((c) => !c.price || c.price === 0 || c.id % 2 === 0);
        }
      }

      const q = (navState.search || "").trim().toLowerCase();
      if (q) {
        filtered = filtered.filter(
          (c) =>
            (c.name || "").toLowerCase().includes(q) ||
            (c.description || "").toLowerCase().includes(q)
        );
      }

      if (!filtered.length) {
        gridEl.innerHTML = `
          <div class="col-span-full rounded-3xl border border-border/80 bg-card/60 p-12 text-center backdrop-blur-sm">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary">
              📚
            </div>
            <h3 class="text-lg font-bold text-foreground">No Batches Found</h3>
            <p class="mx-auto mt-2 max-w-sm text-xs text-muted-foreground leading-relaxed">
              ${q ? "No courses matching your search query. Try typing another term." : "No batches available in this tab right now."}
            </p>
          </div>
        `;
        countLabel.textContent = "0 Batches Found";
        return;
      }

      countLabel.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? "Batch" : "Batches"}`;
      gridEl.innerHTML = "";

      filtered.forEach((c) => {
        const card = el(
          "div",
          "group relative flex flex-col overflow-hidden rounded-[24px] border border-border/80 bg-[#0b1220]/80 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 cursor-pointer"
        );

        const hasPrice = c.price !== undefined && c.price > 0;
        const hasDiscount = c.finalPrice !== undefined && c.finalPrice < (c.price || 0);

        card.innerHTML = `
          <div class="relative aspect-[16/9] w-full overflow-hidden bg-slate-900/60">
            <img
              src="${esc(c.imageUrl || "https://learntopper.in/sw.jpeg")}"
              alt="${esc(c.name)}"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onerror="this.onerror=null;this.src='https://learntopper.in/sw.jpeg';"
            />
            <div class="absolute top-3 right-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-400 backdrop-blur-md border border-sky-400/20 shadow-lg">
              ${hasPrice ? `₹${c.finalPrice || c.price}` : "Available"}
            </div>
          </div>
          <div class="flex flex-1 flex-col p-5">
            <h3 class="line-clamp-2 text-sm sm:text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
              ${esc(c.name)}
            </h3>
            ${
              c.description
                ? `<p class="line-clamp-2 text-xs text-muted-foreground mt-2 leading-relaxed">${esc(c.description)}</p>`
                : ""
            }
            <div class="mt-auto flex items-center justify-between pt-4 border-t border-border/60">
              <div class="flex items-baseline gap-1.5">
                <span class="text-sm font-extrabold text-sky-400">
                  ${hasPrice ? `₹${c.finalPrice || c.price}` : "Free"}
                </span>
                ${hasDiscount ? `<span class="text-xs text-muted-foreground line-through">₹${c.price}</span>` : ""}
              </div>
              <button class="press inline-flex items-center gap-1.5 rounded-xl bg-primary/15 px-3.5 py-1.5 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-black transition-all">
                <span>View Batch</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        `;

        card.addEventListener("click", () => {
          navigate({
            view: "subjects",
            courseId: c.id,
            courseName: c.name,
          });
        });

        gridEl.appendChild(card);
      });
    }

    renderList();

    if (mobileSearch) {
      mobileSearch.addEventListener("input", () => {
        navState.search = mobileSearch.value.trim() || undefined;
        renderList();
      });
    }

    // Sync global search input in header if user typed there
    const globalSearch = document.getElementById("globalSearchInput") as HTMLInputElement;
    if (globalSearch) {
      globalSearch.value = navState.search || "";
      globalSearch.oninput = () => {
        navState.search = globalSearch.value.trim() || undefined;
        if (mobileSearch) mobileSearch.value = navState.search || "";
        renderList();
      };
    }
  } catch (err: any) {
    gridEl.innerHTML = `
      <div class="col-span-full rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
        <p class="font-bold">Failed to load courses</p>
        <p class="text-xs mt-1 text-slate-400">${esc(err?.message || "Please check your network and retry.")}</p>
        <button id="retryBtn" class="mt-4 px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs">Retry</button>
      </div>
    `;
    countLabel.textContent = "Error";
    container.querySelector("#retryBtn")?.addEventListener("click", () => {
      navigate({ view: "courses" });
    });
  }

  return container;
}
