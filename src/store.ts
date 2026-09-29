import type { NavState, ViewType } from "./types";

function parseUrlState(): NavState {
  const params = new URLSearchParams(window.location.search);
  const rawView = params.get("view");
  const view: ViewType =
    rawView === "subjects" || rawView === "topics" || rawView === "lectures"
      ? rawView
      : "courses";

  const courseId = params.get("courseId") ? Number(params.get("courseId")) : undefined;
  const courseName = params.get("courseName") || undefined;
  const subjectId = params.get("subjectId") ? Number(params.get("subjectId")) : undefined;
  const subjectName = params.get("subjectName") || undefined;
  const topicId = params.get("topicId") ? Number(params.get("topicId")) : undefined;
  const topicName = params.get("topicName") || undefined;
  const search = params.get("search") || undefined;
  const tab = (params.get("tab") as "all" | "enrolled") || "all";

  return {
    view,
    platform: "eduteria",
    courseId,
    courseName,
    subjectId,
    subjectName,
    topicId,
    topicName,
    search,
    tab,
  };
}

export const navState: NavState = parseUrlState();

export function getEnrolledCourseIds(): number[] {
  try {
    const raw = localStorage.getItem("enrolled_batches");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function toggleEnrollCourse(id: number): boolean {
  const current = getEnrolledCourseIds();
  const idx = current.indexOf(id);
  let enrolled = false;
  if (idx > -1) {
    current.splice(idx, 1);
    enrolled = false;
  } else {
    current.push(id);
    enrolled = true;
  }
  localStorage.setItem("enrolled_batches", JSON.stringify(current));
  return enrolled;
}

type Listener = (state: NavState) => void;
const listeners: Listener[] = [];

export function onNavigate(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function navigate(next: Partial<NavState>, replace = false) {
  Object.assign(navState, next);
  navState.platform = "eduteria"; // Always keep Eduteria

  // Update browser URL
  const params = new URLSearchParams();
  if (navState.view && navState.view !== "courses") {
    params.set("view", navState.view);
  }
  if (navState.tab && navState.tab !== "all") params.set("tab", navState.tab);
  if (navState.courseId) params.set("courseId", String(navState.courseId));
  if (navState.courseName) params.set("courseName", navState.courseName);
  if (navState.subjectId) params.set("subjectId", String(navState.subjectId));
  if (navState.subjectName) params.set("subjectName", navState.subjectName);
  if (navState.topicId) params.set("topicId", String(navState.topicId));
  if (navState.topicName) params.set("topicName", navState.topicName);
  if (navState.search) params.set("search", navState.search);

  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;

  if (replace) {
    window.history.replaceState({ ...navState }, "", url);
  } else {
    window.history.pushState({ ...navState }, "", url);
  }

  listeners.forEach((fn) => fn(navState));
}

// Handle browser back/forward buttons
window.addEventListener("popstate", () => {
  const parsed = parseUrlState();
  Object.assign(navState, parsed);
  listeners.forEach((fn) => fn(navState));
});
