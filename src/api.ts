import type { Course, Subject, Topic, Lecture, Platform } from "./types";
import { navState } from "./store";

const BASE = "/api";
const USE_REAL_API_CALLS = true;

export interface StreamResponse {
  url: string;
  token?: string;
  type?: "dash" | "hls";
  licenseUrl?: string;
  directUrl?: string;
}

async function get<T>(path: string, platform?: string): Promise<T> {
  const plat = (platform || navState.platform || "eduteria").toLowerCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(BASE + path, {
      signal: controller.signal,
      headers: {
        "x-platform": plat,
        platform: plat,
        "x-api-platform": plat,
        "x-real-api": USE_REAL_API_CALLS ? "true" : "false",
      },
    });
    if (!response.ok) {
      let errMessage = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson?.error) errMessage = errJson.error;
      } catch {}
      throw new Error(errMessage);
    }
    const json = await response.json();
    if (json.success === false) throw new Error(json.error || "API error");
    return (json.data ?? json) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchPlatforms(): Promise<Platform[]> {
  const data = await get<Platform[]>("/platforms");
  return Array.isArray(data) ? data : [];
}

export async function fetchCourses(platform?: string): Promise<Course[]> {
  const data = await get<Course[]>("/courses", platform);
  return Array.isArray(data) ? data : [];
}

export async function fetchSubjects(courseId: number, platform?: string): Promise<Subject[]> {
  const data = await get<Subject[]>(`/course/subjects?courseId=${courseId}`, platform);
  return Array.isArray(data) ? data : [];
}

export async function fetchTopics(courseId: number, subjectId: number, platform?: string): Promise<Topic[]> {
  const data = await get<Topic[]>(`/course/topics?courseId=${courseId}&subjectId=${subjectId}`, platform);
  return Array.isArray(data) ? data : [];
}

export async function fetchLectures(
  courseId: number,
  topicId: number,
  subjectId?: number,
  platform?: string
): Promise<Lecture[]> {
  const subParam = subjectId !== undefined && subjectId !== null ? `&subjectId=${subjectId}` : "";
  const data = await get<Lecture[]>(
    `/course/lectures?courseId=${courseId}&topicId=${topicId}${subParam}`,
    platform
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchVideoStream(vdcId: string, platform?: string): Promise<StreamResponse> {
  return get<StreamResponse>(`/video/stream?vdcId=${encodeURIComponent(vdcId)}`, platform);
}
