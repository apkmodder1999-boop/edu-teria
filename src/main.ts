import "./style.css";
import { navState, onNavigate, navigate } from "./store";
import { renderCourses } from "./views/courses";
import { renderSubjects } from "./views/subjects";
import { renderTopics } from "./views/topics";
import { renderLectures } from "./views/lectures";
import type { NavState } from "./types";

const appEl = document.getElementById("app")!;

// Build App Shell once
function initAppShell(): HTMLElement {
  appEl.innerHTML = `
    <div class="relative flex min-h-screen w-full bg-background text-foreground">
      <!-- Background Ambient Glow & Dot Grid -->
      <div class="pointer-events-none fixed inset-0 z-0 bg-dots opacity-30"></div>
      <div class="pointer-events-none fixed left-[-5%] top-[-5%] z-0 h-[350px] w-[350px] rounded-full bg-primary/20 blur-[140px]"></div>
      <div class="pointer-events-none fixed bottom-[-10%] right-[-5%] z-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[140px]"></div>

      <!-- App Sidebar -->
      <aside id="appSidebar" class="fixed z-50 flex h-screen w-[260px] shrink-0 flex-col border-r border-border bg-sidebar transition-transform duration-300 md:relative md:translate-x-0 -translate-x-full">
        <!-- Logo Area -->
        <div class="flex h-[70px] shrink-0 items-center justify-between border-b border-border px-6 sm:h-20">
          <a class="press flex items-center gap-3 cursor-pointer" id="sidebarLogo" title="Eduteria Learn Topper">
            <img src="https://learntopper.in/eduteria.jpg" alt="Eduteria logo" class="h-10 w-10 rounded-full border border-sky-400/40 object-cover shadow-sm" onerror="this.onerror=null;this.src='https://learntopper.in/logo.jpg';" />
            <span class="text-xl font-black tracking-tight text-foreground">EDUTERIA<span class="text-[#38bdf8]">LEARN TOPPER</span></span>
          </a>
          <button aria-label="Close menu" id="sidebarCloseBtn" class="text-muted-foreground md:hidden p-1.5 rounded-lg hover:text-foreground cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-5 w-5">
              <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Sidebar Navigation Menu -->
        <nav class="flex-1 space-y-8 overflow-y-auto px-3 py-5 pb-24 md:pb-5">
          <div>
            <h3 class="mb-3 px-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80">Explore</h3>
            <ul class="space-y-1.5">
              <li>
                <button id="navAllBatches" class="press w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all sm:text-sm border-l-[3px] border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8] cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-grid h-4 w-4 shrink-0 text-[#38bdf8]">
                    <rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>
                  </svg>
                  All Batches
                </button>
              </li>
              <li>
                <button id="navEnrolledBatches" class="press w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all sm:text-sm text-muted-foreground hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap h-4 w-4 shrink-0 text-[#38bdf8]">
                    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                    <path d="M22 10v6"></path>
                    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                  </svg>
                  Enrolled Batches
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="mb-3 px-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80">Connect</h3>
            <ul class="space-y-1.5">
              <li>
                <a href="https://t.me/learn_topper" target="_blank" rel="noopener noreferrer" class="press flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold text-muted-foreground transition-all hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] sm:text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send h-4 w-4 shrink-0 text-[#38bdf8]">
                    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
                    <path d="m21.854 2.147-10.94 10.939"></path>
                  </svg>
                  Join Telegram
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- Mobile Drawer Backdrop -->
      <div id="sidebarBackdrop" class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm hidden md:hidden"></div>

      <!-- Main Layout Body -->
      <div class="relative z-10 flex min-h-screen w-full flex-1 flex-col">
        <!-- Sticky Header -->
        <header class="sticky top-0 z-30 flex h-[70px] shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:h-20 sm:px-6">
          <div class="flex w-full items-center gap-4">
            <button aria-label="Open menu" id="mobileMenuBtn" class="press rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:text-foreground md:hidden cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu h-5 w-5">
                <path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path>
              </svg>
            </button>
            <div class="hidden max-w-xl flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground focus-within:border-primary/40 sm:flex">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search h-4 w-4">
                <path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle>
              </svg>
              <input id="globalSearchInput" placeholder="Search courses, batches, faculty..." class="w-full border-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground" value="${navState.search || ""}" />
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-3 sm:gap-4">
            <span class="watermark hidden select-none text-sm font-black uppercase tracking-[0.3em] text-foreground/30 sm:inline sm:text-base">LEARNTOPPER</span>
          </div>
        </header>

        <!-- Main View Dynamic Area -->
        <main class="flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pb-12 lg:px-8">
          <div id="pageContent" class="mx-auto flex w-full max-w-7xl flex-col"></div>
        </main>
      </div>

      <!-- Mobile Bottom Navigation Bar -->
      <nav class="fixed bottom-0 left-0 z-50 flex w-full items-center justify-between border-t border-border bg-background/95 px-2 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        <button id="mobileNavAll" class="press flex flex-1 shrink-0 flex-col items-center gap-1.5 transition-colors cursor-pointer text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-grid h-5 w-5">
            <rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>
          </svg>
          <span class="text-[8px] font-bold uppercase tracking-wider">All</span>
        </button>
        <button id="mobileNavEnrolled" class="press flex flex-1 shrink-0 flex-col items-center gap-1.5 transition-colors cursor-pointer text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap h-5 w-5">
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
            <path d="M22 10v6"></path>
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
          </svg>
          <span class="text-[8px] font-bold uppercase tracking-wider">Enrolled</span>
        </button>
        <a href="https://t.me/learn_topper" target="_blank" rel="noopener noreferrer" class="press flex flex-1 shrink-0 flex-col items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send h-5 w-5">
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
            <path d="m21.854 2.147-10.94 10.939"></path>
          </svg>
          <span class="text-[8px] font-bold uppercase tracking-wider">Join</span>
        </a>
      </nav>
    </div>
  `;

  // Attach Sidebar Toggle & Navigation Logic
  const sidebar = document.getElementById("appSidebar")!;
  const backdrop = document.getElementById("sidebarBackdrop")!;
  const menuBtn = document.getElementById("mobileMenuBtn")!;
  const closeBtn = document.getElementById("sidebarCloseBtn")!;

  const openSidebar = () => {
    sidebar.classList.remove("-translate-x-full");
    backdrop.classList.remove("hidden");
  };
  const closeSidebar = () => {
    sidebar.classList.add("-translate-x-full");
    backdrop.classList.add("hidden");
  };

  menuBtn.addEventListener("click", openSidebar);
  closeBtn.addEventListener("click", closeSidebar);
  backdrop.addEventListener("click", closeSidebar);

  document.getElementById("sidebarLogo")?.addEventListener("click", () => {
    closeSidebar();
    navigate({ view: "courses", tab: "all" });
  });

  document.getElementById("navAllBatches")?.addEventListener("click", () => {
    closeSidebar();
    navigate({ view: "courses", tab: "all" });
  });

  document.getElementById("navEnrolledBatches")?.addEventListener("click", () => {
    closeSidebar();
    navigate({ view: "courses", tab: "enrolled" });
  });

  document.getElementById("mobileNavAll")?.addEventListener("click", () => {
    navigate({ view: "courses", tab: "all" });
  });

  document.getElementById("mobileNavEnrolled")?.addEventListener("click", () => {
    navigate({ view: "courses", tab: "enrolled" });
  });

  return document.getElementById("pageContent")!;
}

const pageContentEl = initAppShell();

function updateNavActiveStates(state: NavState) {
  const isAll = state.view === "courses" && state.tab !== "enrolled";
  const isEnrolled = state.tab === "enrolled";

  // Sidebar buttons
  const navAll = document.getElementById("navAllBatches");
  const navEnrolled = document.getElementById("navEnrolledBatches");
  if (navAll && navEnrolled) {
    if (isAll) {
      navAll.className =
        "press w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all sm:text-sm border-l-[3px] border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8] cursor-pointer";
      navEnrolled.className =
        "press w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all sm:text-sm text-muted-foreground hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] cursor-pointer";
    } else if (isEnrolled) {
      navEnrolled.className =
        "press w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all sm:text-sm border-l-[3px] border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8] cursor-pointer";
      navAll.className =
        "press w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all sm:text-sm text-muted-foreground hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] cursor-pointer";
    } else {
      navAll.className =
        "press w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all sm:text-sm text-muted-foreground hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] cursor-pointer";
      navEnrolled.className =
        "press w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all sm:text-sm text-muted-foreground hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] cursor-pointer";
    }
  }

  // Mobile bottom buttons
  const mobAll = document.getElementById("mobileNavAll");
  const mobEnrolled = document.getElementById("mobileNavEnrolled");
  if (mobAll && mobEnrolled) {
    mobAll.className = `press flex flex-1 shrink-0 flex-col items-center gap-1.5 transition-colors cursor-pointer ${
      isAll ? "text-primary" : "text-muted-foreground"
    }`;
    mobEnrolled.className = `press flex flex-1 shrink-0 flex-col items-center gap-1.5 transition-colors cursor-pointer ${
      isEnrolled ? "text-primary" : "text-muted-foreground"
    }`;
  }
}

let currentRenderToken = 0;

async function renderApp(state: NavState) {
  const token = ++currentRenderToken;
  updateNavActiveStates(state);

  let viewEl: HTMLElement;

  try {
    switch (state.view) {
      case "subjects":
        if (state.courseId) {
          viewEl = await renderSubjects(state.courseId, state.courseName);
        } else {
          viewEl = await renderCourses();
        }
        break;

      case "topics":
        if (state.courseId && state.subjectId !== undefined) {
          viewEl = await renderTopics(
            state.courseId,
            state.subjectId,
            state.subjectName,
            state.courseName
          );
        } else if (state.courseId) {
          viewEl = await renderSubjects(state.courseId, state.courseName);
        } else {
          viewEl = await renderCourses();
        }
        break;

      case "lectures":
        if (state.courseId && state.topicId !== undefined) {
          viewEl = await renderLectures(
            state.courseId,
            state.topicId,
            state.topicName,
            state.courseName,
            state.subjectId,
            "eduteria"
          );
        } else {
          viewEl = await renderCourses();
        }
        break;

      case "courses":
      default:
        viewEl = await renderCourses();
        break;
    }
  } catch (err: any) {
    console.error("[renderApp error]", err);
    viewEl = document.createElement("div");
    viewEl.className = "rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400";
    viewEl.innerHTML = `
      <h3 class="text-base font-bold">Something went wrong</h3>
      <p class="text-xs mt-1 text-slate-400">${err?.message || "An unexpected error occurred while loading this view."}</p>
      <button class="mt-4 px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs" id="btn-home-fallback">Back to Batches</button>
    `;
    viewEl.querySelector("#btn-home-fallback")?.addEventListener("click", () => {
      navigate({ view: "courses" });
    });
  }

  // Prevent race conditions with fast navigation
  if (token === currentRenderToken) {
    pageContentEl.innerHTML = "";
    pageContentEl.appendChild(viewEl);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

// Subscribe to route changes
onNavigate((state) => {
  renderApp(state);
});

// Setup Telegram Popup
function setupTgPopup() {
  const tgPopup = document.getElementById("tgPopup");
  const closePopupBtn = document.getElementById("closePopup");
  const joinBtn = document.getElementById("joinBtn");

  if (closePopupBtn && tgPopup) {
    closePopupBtn.addEventListener("click", function () {
      tgPopup.classList.remove("active");
    });
  }

  if (joinBtn && tgPopup) {
    joinBtn.addEventListener("click", function () {
      tgPopup.classList.remove("active");
    });
  }

  if (tgPopup) {
    tgPopup.addEventListener("click", function (e) {
      if (e.target === tgPopup) {
        tgPopup.classList.remove("active");
      }
    });
  }
}
setupTgPopup();

// Initial boot
renderApp(navState);
