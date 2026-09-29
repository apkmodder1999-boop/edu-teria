import express from "express";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";
import path from "path";
import dns from "dns";
import { fileURLToPath } from "url";
import type { Request, Response, NextFunction } from "express";

dns.setDefaultResultOrder("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// ─── Platform Resolver & Middleware ─────────────────────────────────────────
export function getPlatform(req: Request): string {
  const headerPlat = (req.headers["x-platform"] || req.headers["platform"]) as string;
  if (headerPlat) {
    const p = headerPlat.trim().toLowerCase();
    if (p === "nexttoppers" || p === "next-toppers") return "next-toppers";
    return p;
  }
  const paramPlat = req.params.platform as string;
  if (paramPlat) {
    const p = paramPlat.trim().toLowerCase();
    if (p === "nexttoppers" || p === "next-toppers") return "next-toppers";
    return p;
  }
  const queryPlat = req.query.platform as string;
  if (queryPlat) {
    const p = queryPlat.trim().toLowerCase();
    if (p === "nexttoppers" || p === "next-toppers") return "next-toppers";
    return p;
  }
  return "eduteria";
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const plat = getPlatform(req);
  res.setHeader("x-platform", plat);
  res.setHeader("x-api-platform", plat);
  res.setHeader("x-real-api", "true");
  next();
});

// ─── Platform Registry ──────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: "eduteria",
    name: "Eduteria",
    description: "BPSC, UPSC & State PCS Online Batches",
    available: true,
    icon: "book",
    color: "#6366f1",
  },
  {
    id: "vidyagram",
    name: "Vidyagram",
    description: "IIT-JEE, NEET & Board Exam Preparation",
    available: true,
    icon: "award",
    color: "#f59e0b",
  },
  {
    id: "next-toppers",
    name: "Next Toppers",
    description: "IOQM, Olympiads, CBSE & Crash Courses",
    available: true,
    icon: "award",
    color: "#8b5cf6",
  },
  {
    id: "parmar",
    name: "Parmar Academy",
    description: "SSC, Railway, State Exams & Combo Batches",
    available: true,
    icon: "book",
    color: "#f97316",
  },
  {
    id: "raksha",
    name: "Raksha Academy",
    description: "Coming soon",
    available: false,
    icon: "shield",
    color: "#10b981",
  },
];

const PARMAR_COURSES = [
  { id: 9001, name: "PARMAR'S COMPLETE COMBO TOPPERS BATCH", category: "COMBO", validity: "24 Months", finalPrice: 2199, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-09-05-0.679714023497747.jpg" },
  { id: 9002, name: "UPSSSC GK DIGITAL NOTES", category: "STATE EXAMS", validity: "12 Months", finalPrice: 99, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-09-11-0.6380789833119838.jpg" },
  { id: 9003, name: "PARMAR'S GK 5.0 TOPPERS BATCH", category: "SSC", validity: "12 Months", finalPrice: 1299, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-09-06-0.7484256320833926.jpg" },
  { id: 9004, name: "PARMAR'S MATHS TOPPERS BATCH", category: "SSC", validity: "24 Months", finalPrice: 999, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-09-05-0.7338438769888199.jpg" },
  { id: 9005, name: "PARMAR'S REASONING TOPPERS BATCH", category: "SSC", validity: "12 Months", finalPrice: 699, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-09-05-0.3474174751283987.jpg" },
  { id: 9006, name: "PARMAR'S ENGLISH TOPPERS BATCH", category: "SSC", validity: "12 Months", finalPrice: 699, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-09-05-0.4412125057752688.jpg" },
  { id: 9007, name: "PARMAR'S MATHS + REASONING COMBO TOPPERS BATCH", category: "COMBO", validity: "24 Months", finalPrice: 1599, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-09-05-0.35175366650733675.jpg" },
  { id: 9008, name: "PARMAR'S MATHS + GK/GS COMBO TOPPERS BATCH", category: "COMBO", validity: "24 Months", finalPrice: 1899, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-09-05-0.5434778853862384.jpg" },
  { id: 9009, name: "PARMAR RAILWAY COMPLETE COMBO BATCH", category: "RAILWAY", validity: "12 Months", finalPrice: 1499, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-08-22-0.5795875231109067.jpg" },
  { id: 9010, name: "PARMAR RAILWAY GENERAL SCIENCE BATCH", category: "RAILWAY", validity: "12 Months", finalPrice: 599, imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-08-20-0.4077871953841511.jpg" },
];

const PARMAR_API_BASE = "https://parmaracademyapi.classx.co.in";
const PARMAR_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Client-Service": "Appx",
  "Auth-Key": "appxapi",
  source: "website",
  Origin: "https://www.parmaracademy.in",
  Referer: "https://www.parmaracademy.in/",
  "User-Agent": "Mozilla/5.0",
};

async function getParmar(path: string, params: Record<string, string | number>) {
  const response = await axios.get(`${PARMAR_API_BASE}${path}`, {
    params,
    headers: PARMAR_HEADERS,
    timeout: 12000,
    validateStatus: () => true,
  });
  if (response.status === 401) {
    const error = new Error("Parmar content requires sign in or course purchase");
    (error as any).status = 401;
    throw error;
  }
  if (response.status >= 400) throw new Error(`Parmar API HTTP ${response.status}`);
  return response.data?.data ?? [];
}

async function getParmarCourses(): Promise<any[]> {
  const categories = [
    { id: 8, name: "SSC" },
    { id: 1, name: "RAILWAY" },
    { id: 9, name: "STATE EXAMS" },
    { id: 13, name: "COMBO" },
  ];
  const results = await Promise.all(
    categories.map((category) => getParmar("/get/courselist", { exam_id: category.id, exam_name: category.name, start: 0 }))
  );
  const byId = new Map<number, any>();
  results.flat().forEach((course: any) => {
    const id = Number(course.id);
    if (!id || byId.has(id)) return;
    const categories = String(course.exam_category || course.exam_name || "").split(",").map((value) => value.trim()).filter(Boolean);
    byId.set(id, {
      id,
      slug: course.course_slug,
      name: course.course_name || "Parmar Course",
      category: categories.includes("COMBO") ? "COMBO" : categories[0] || "SSC",
      validity: course.validity ? `${course.validity} ${String(course.validity_type || "MONTHS").toLowerCase()}` : "",
      imageUrl: course.course_thumbnail || "",
      price: Number(course.mrp) || 0,
      finalPrice: Number(course.price || course.course_sp || course.mrp) || 0,
      description: course.course_description || "",
    });
  });
  return [...byId.values()];
}

function mapParmarSubject(subject: any) {
  return {
    id: Number(subject.id || subject.subject_id),
    name: subject.subject_name || subject.name || subject.title || "Subject",
    videoCount: Number(subject.video_count || subject.videos_count || subject.total) || undefined,
  };
}

function mapParmarTopic(topic: any) {
  return {
    id: Number(topic.id || topic.topic_id),
    name: topic.topic_name || topic.name || topic.title || "Topic",
    videoCount: Number(topic.video_count || topic.videos_count || topic.total) || undefined,
    isLeaf: true,
  };
}

function mapParmarLecture(lecture: any) {
  return {
    id: Number(lecture.id || lecture.class_id || lecture.lecture_id),
    name: lecture.lecture_name || lecture.lesson_name || lecture.name || lecture.title || "Lecture",
    contentType: 2,
    duration: Number(lecture.duration || lecture.video_duration) || 0,
    thumbnailUrl: lecture.thumbnail || lecture.image || "",
    videoUrl: lecture.file_link || lecture.video_url || lecture.url || "",
    vdcId: lecture.vdc_id || "",
    isLocked: lecture.is_locked === 1 || lecture.is_locked === "1",
    originalLocked: lecture.is_locked === 1 || lecture.is_locked === "1",
  };
}

// ─── Eduteria Videocrypt Credentials & Constants ────────────────────────────
const EDUTERIA_USER_ID = "53993137";
const EDUTERIA_JWT =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjUzOTkzMTM3IiwiZGV2aWNlX3R5cGUiOiI0IiwidmVyc2lvbl9jb2RlIjoiMSIsImlhdCI6MTc4NTc0MTE1OCwiZXhwIjoxODQ4ODEzMTU4fQ.0pHptHXr2PwVyg9EmBlDBYvmD6mcYwtrYx5_Fjr4RhQ";

const EDUTERIA_HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  appid: "166",
  authorization: "Bearer 01*#NerglnwwebOI)30@I*Dm'@@",
  "cache-control": "no-cache",
  "content-type": "application/json",
  devicetype: "4",
  jwt: EDUTERIA_JWT,
  lang: "1",
  origin: "https://eduteria.live",
  pragma: "no-cache",
  priority: "u=1, i",
  referer: "https://eduteria.live/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  userid: EDUTERIA_USER_ID,
  version: "1",
};

const CIPHER_ALGO = "aes-128-cbc";
const KEY_SEED = "%!F*&^$)_*%3f&B+";
const IV_SEED = "#*$DJvyw2w%!_-$@";
const PAD_LEN = 16;
const EDUTERIA_G_VAL = (
  EDUTERIA_USER_ID ? EDUTERIA_USER_ID + "0161086410274515" : "00161086410274515"
).substring(0, 16);

const pad16 = (s: string) => (s.length < PAD_LEN ? s.padEnd(PAD_LEN, "0") : s.slice(0, PAD_LEN));

function mapChars(template: string, keyVal: string): string {
  const chars = template.split("");
  const digits = String(keyVal).split("");
  let res = "";
  digits.forEach((ch) => {
    res += chars[Number(ch)] || "";
  });
  return res;
}

function encryptPayload(plainText: string, gVal: string): string {
  const keyStr = gVal ? mapChars(KEY_SEED, gVal) : KEY_SEED;
  const ivStr = gVal ? mapChars(IV_SEED, gVal) : IV_SEED;
  const cipher = crypto.createCipheriv(CIPHER_ALGO, Buffer.from(pad16(keyStr)), Buffer.from(ivStr));
  let enc = cipher.update(plainText, "utf8", "base64");
  enc += cipher.final("base64");
  return enc + ":" + Buffer.from("1234567890123456").toString("base64");
}

function decryptResponse(data: string, gVal: string): any {
  try {
    const keyStr = gVal ? mapChars(KEY_SEED, gVal) : KEY_SEED;
    const ivStr = gVal ? mapChars(IV_SEED, gVal) : IV_SEED;
    const [cipherB64] = data.split(":");
    const decipher = crypto.createDecipheriv(CIPHER_ALGO, Buffer.from(pad16(keyStr)), Buffer.from(ivStr));
    const dec = Buffer.concat([decipher.update(Buffer.from(cipherB64, "base64")), decipher.final()]);
    return JSON.parse(dec.toString("utf8"));
  } catch {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

async function callEduteria(endpoint: string, payload: object): Promise<any> {
  const enc = encryptPayload(JSON.stringify(payload), EDUTERIA_G_VAL);
  const res = await axios.post(`https://appapi.videocrypt.in/data_model/${endpoint}`, JSON.stringify(enc), {
    headers: EDUTERIA_HEADERS,
    timeout: 6000,
  });
  const raw = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  return decryptResponse(raw, EDUTERIA_G_VAL);
}

// ─── Cache video tile IDs per course ────────────────────────────────────────
const tileCache = new Map<string, string>();

async function getVideoTileId(courseId: string): Promise<string> {
  if (tileCache.has(courseId)) return tileCache.get(courseId)!;
  try {
    const details = await callEduteria("course_deprecated/get_course_detail", {
      course_id: courseId,
      parent_id: courseId,
    });
    const tiles: any[] = details?.data?.tiles || [];
    const videoTile =
      tiles.find((t) => t.type === "video" || (t.tile_name || "").toLowerCase().includes("video")) || tiles[0];
    const tileId = videoTile?.id ? String(videoTile.id) : "147237";
    tileCache.set(courseId, tileId);
    return tileId;
  } catch (err) {
    console.error(`[getVideoTileId] Failed for course ${courseId}:`, err);
    return "147237";
  }
}

// ─── Resolve DRM Stream for any video by vdc_id ─────────────────────────────
interface DrmStreamResult {
  url: string;
  token?: string;
  type: "dash" | "hls";
  licenseUrl?: string;
}

const drmStreamCache = new Map<string, DrmStreamResult>();
const nonDrmCache = new Map<string, string>();
const ntStreamCache = new Map<string, string>();
// --- Resolve Next Toppers HLS Stream via their own media-headers endpoint ---
let ntVcHeadersCache: Record<string, string> | null = null;
let ntVcHeadersExpiry = 0;

async function getNTVcHeaders(): Promise<Record<string, string> | null> {
  const now = Date.now();
  if (ntVcHeadersCache && ntVcHeadersExpiry > now) return ntVcHeadersCache;
  try {
    const res = await axios.get(
      'https://nexttoppers.com/api/media-headers?deviceType=1&userId=0',
      {
        headers: {
          ...getNTHeaders(),
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
          Referer: 'https://nexttoppers.com/',
          Origin: 'https://nexttoppers.com',
        },
        timeout: 6000,
        validateStatus: (status) => status < 400,
      }
    );
    if (res.data && typeof res.data === 'object') {
      const h: Record<string, string> = { ...res.data, 'Content-Type': 'application/json' };
      ntVcHeadersCache = h;
      ntVcHeadersExpiry = now + 10 * 60 * 1000;
      return h;
    }
    return null;
  } catch {
    // Upstream nexttoppers.com endpoint requires student authorization or is restricted by ALB
    return null;
  }
}

async function resolveNTStream(vdcId: string): Promise<string | null> {
  if (!vdcId) return null;
  if (ntStreamCache.has(vdcId)) return ntStreamCache.get(vdcId)!;

  try {
    const headers = await getNTVcHeaders();
    if (headers) {
      const res = await axios.post(
        'https://api.videocrypt.com/getVideoDetailsDrm',
        { name: vdcId, flag: 1 },
        { headers, timeout: 12000, validateStatus: (status) => status < 400 }
      );
      const m3u8Url: string = res.data?.data?.link?.file_url || '';
      if (m3u8Url) {
        ntStreamCache.set(vdcId, m3u8Url);
        return m3u8Url;
      }
    }

    // Fallback: Check if direct non-DRM stream is available
    const fallbackHls = await fetchNonDrmUrl(vdcId).catch(() => null);
    if (fallbackHls) {
      ntStreamCache.set(vdcId, fallbackHls);
      return fallbackHls;
    }

    return null;
  } catch (err: any) {
    console.warn(`[resolveNTStream] Video ${vdcId} requires student authorization: ${err.message}`);
    return null;
  }
}



const VC_HEADERS = {
  "device-name": "1",
  "account-id": "10000386",
  "device-id": "71d3548555586126ed7071102e663619",
  "device-type": "1",
  version: "1",
  "user-id": EDUTERIA_USER_ID,
  accessKey: Buffer.from("D1LC3K5NZJRBS0OYHU4A").toString("base64"),
  secretKey: Buffer.from("e+Dy5Z/bGvEnrABg3sRkmqCMTpN2Y4Io8S=VcHJ6").toString("base64"),
  "Content-Type": "application/json",
};

async function resolveDrmStream(vdcId: string): Promise<DrmStreamResult | null> {
  if (!vdcId) return null;
  if (drmStreamCache.has(vdcId)) return drmStreamCache.get(vdcId)!;

  try {
    const res = await axios.post(
      "https://api.videocrypt.com/getVideoDetailsDrm",
      { name: vdcId, flag: 1 },
      { headers: VC_HEADERS, timeout: 15000 }
    );
    const link = res.data?.data?.link;
    const url = link?.file_url || "";
    const token = link?.token || "";
    if (!url) return null;

    const type = url.includes(".mpd") ? "dash" : "hls";
    const licenseUrl = token
      ? `https://license.videocrypt.com/validateLicense?pallyconCustomdataV2=${encodeURIComponent(token)}`
      : "";

    const result: DrmStreamResult = { url, token, type, licenseUrl };
    drmStreamCache.set(vdcId, result);
    return result;
  } catch (err: any) {
    console.error(`[resolveDrmStream] Failed for vdcId ${vdcId}:`, err.message);
    return null;
  }
}

// ─── Fetch direct non-DRM HLS URL (file_url_hls) via getVideoDetails ─────────
async function fetchNonDrmUrl(vdcId: string): Promise<string | null> {
  if (!vdcId) return null;
  if (nonDrmCache.has(vdcId)) return nonDrmCache.get(vdcId)!;

  try {
    const res = await axios.post(
      "https://api.videocrypt.com/getVideoDetails",
      { name: vdcId },
      { headers: VC_HEADERS, timeout: 15000 }
    );
    const d = res.data?.data;
    const hlsUrl: string =
      d?.file_url_hls ||
      d?.link?.file_url_hls ||
      d?.bitrate_urls?.[0]?.url ||
      "";
    if (!hlsUrl) return null;
    nonDrmCache.set(vdcId, hlsUrl);
    console.log(`[fetchNonDrmUrl] Got direct HLS for vdcId ${vdcId}:`, hlsUrl.substring(0, 80));
    return hlsUrl;
  } catch (err: any) {
    console.warn(`[fetchNonDrmUrl] Failed for vdcId ${vdcId}:`, err.message);
    return null;
  }
}

// ─── Vidyagram (arvidyapeeth / ClassX / Appx) Integration ──────────────────
const VIDYAGRAM_BASE = "https://armathsapi.akamai.net.in";
const VIDYAGRAM_TENANT = "arvidyapeeth";
const VIDYAGRAM_APPX_HEADERS: Record<string, string> = {
  "Client-Service": "Appx",
  "Auth-Key": "appxapi",
  source: "website",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  Origin: "https://vidyagram.online",
  Referer: "https://vidyagram.online/",
};
const VG_AES_KEY = "638udh3829162018";
const VG_AES_IV  = "fedcba9876543210";

function decryptVidyagramFileLink(fileLink: string): string {
  try {
    if (!fileLink) return "";
    const colonIdx = fileLink.lastIndexOf(":");
    let cipherB64 = fileLink;
    let ivBuf = Buffer.from(VG_AES_IV, "utf8");
    if (colonIdx > 0 && colonIdx < fileLink.length - 1) {
      cipherB64 = fileLink.substring(0, colonIdx);
      const decoded = Buffer.from(fileLink.substring(colonIdx + 1), "base64");
      if (decoded.length >= 16) ivBuf = decoded.subarray(0, 16);
    }
    const key = Buffer.from(VG_AES_KEY, "utf8");
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, ivBuf);
    const dec = Buffer.concat([decipher.update(Buffer.from(cipherB64, "base64")), decipher.final()]);
    return dec.toString("utf8").trim();
  } catch { return ""; }
}

let vgAuthToken: string | null = null;
let vgUserId: string | null = null;
let vgUserName: string | null = null;
let vgAutoLoginPromise: Promise<void> | null = null;

async function ensureVgAuth(): Promise<void> {
  if (vgAuthToken) return;
  if (vgAutoLoginPromise) return vgAutoLoginPromise;

  vgAutoLoginPromise = (async () => {
    try {
      const params = new URLSearchParams();
      params.append("email", "7678664945");
      params.append("password", "a9931695204");
      params.append("source", "website");
      params.append("extra_details", "1");

      const resp = await axios.post(
        `${VIDYAGRAM_BASE}/post/userLogin`,
        params.toString(),
        {
          headers: {
            ...VIDYAGRAM_APPX_HEADERS,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 10000,
          validateStatus: () => true,
        }
      );

      const d = resp.data;
      if (d && d.status === 200 && d.data) {
        vgAuthToken = d.data.token || "";
        vgUserId = String(d.data.userid || d.data.id || "");
        vgUserName = d.data.name || "Default Account";
        console.log("[Vidyagram] Auto-logged in successfully as", vgUserName);
      }
    } catch (e: any) {
      console.warn("[Vidyagram] Auto-login failed:", e.message);
    } finally {
      vgAutoLoginPromise = null;
    }
  })();

  return vgAutoLoginPromise;
}

function getVgHeaders(): Record<string, string> {
  const h: Record<string, string> = { ...VIDYAGRAM_APPX_HEADERS };
  if (vgAuthToken) h["Authorization"] = vgAuthToken;
  if (vgUserId)    h["User-ID"]        = vgUserId;
  return h;
}

async function callVidyagram<T = any>(method: "get" | "post", apiPath: string, data?: object): Promise<T> {
  const url = `${VIDYAGRAM_BASE}${apiPath}`;
  const resp = method === "post"
    ? await axios.post(url, data || {}, { headers: getVgHeaders(), timeout: 15000 })
    : await axios.get(url, { headers: getVgHeaders(), timeout: 15000, params: data });
  return resp.data as T;
}

const vgSubjectsCache = new Map<string, any[]>();
const vgTopicsCache   = new Map<string, any[]>();
const vgLecturesCache = new Map<string, any[]>();

let vgCoursesCache: any[] | null = null;
let vgCoursesCacheTime = 0;

async function getVidyagramCourses(): Promise<any[]> {
  const now = Date.now();
  if (vgCoursesCache && now - vgCoursesCacheTime < 60000 && !vgAuthToken) {
    return vgCoursesCache;
  }

  const results: any[] = [];
  const seen = new Set<number>();

  // If user is authenticated, load user's purchased/enrolled courses first
  if (vgAuthToken && vgUserId) {
    try {
      const resp = await axios.get(`${VIDYAGRAM_BASE}/get/userfiltercourse`, {
        headers: getVgHeaders(),
        params: { courseid: 0 },
        timeout: 10000,
        validateStatus: () => true,
      });
      const rawUserCourses: any[] = resp.data?.data || [];
      if (Array.isArray(rawUserCourses)) {
        for (const c of rawUserCourses) {
          const id = Number(c.id || c.course_id);
          if (id && !seen.has(id)) {
            seen.add(id);
            results.push({
              id,
              name: c.course_name || c.title || c.name || "Enrolled Course",
              imageUrl: c.course_thumbnail || c.thumbnail || c.image || "",
              price: Number(c.price || 0),
              finalPrice: Number(c.price || 0),
              description: c.course_description || "Enrolled Batch",
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("[getVidyagramCourses] userfiltercourse error:", e.message);
    }
  }

  // Fetch online courses from Vidyagram folder_courses API (parent_id=58)
  try {
    for (let start = 0; start < 100; start += 20) {
      const resp = await axios.get(`${VIDYAGRAM_BASE}/get/folder_courses`, {
        headers: VIDYAGRAM_APPX_HEADERS,
        params: { start, parent_id: 58 },
        timeout: 10000,
      });
      const list: any[] = resp.data?.data || [];
      if (!Array.isArray(list) || list.length === 0) break;
      for (const c of list) {
        const id = Number(c.id);
        if (id && !seen.has(id)) {
          seen.add(id);
          results.push({
            id,
            name: c.course_name || c.folder_name || c.title || "Vidyagram Course",
            imageUrl: c.course_thumbnail || c.thumbnail || c.image || "",
            price: Number(c.price || c.mrp || 0),
            finalPrice: Number(c.price || 0),
            description: c.course_description || c.exam_name || "",
          });
        }
      }
    }
  } catch (err: any) {
    console.warn("[getVidyagramCourses] Failed to fetch folder_courses:", err.message);
  }

  // Also fetch any extra courses from Vidyagram homepage __NEXT_DATA__ as fallback
  try {
    const htmlResp = await axios.get("https://vidyagram.online/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 12000,
    });
    const html = htmlResp.data;
    if (typeof html === "string") {
      const idx = html.indexOf("__NEXT_DATA__");
      if (idx !== -1) {
        const sub = html.substring(idx);
        const start = sub.indexOf("{");
        const end = sub.indexOf("</script>");
        if (start !== -1 && end !== -1) {
          const parsed = JSON.parse(sub.substring(start, end));
          const pp = parsed?.props?.pageProps?.pageProps || {};
          const list = [...(pp.newCourses || []), ...(pp.courses || [])];
          for (const c of list) {
            const id = Number(c.id);
            if (id && !seen.has(id)) {
              seen.add(id);
              results.push({
                id,
                name: c.course_name || c.title || c.name || "Vidyagram Course",
                imageUrl: c.course_thumbnail || c.thumbnail || c.image || "",
                price: Number(c.price || c.mrp || 0),
                finalPrice: Number(c.price || 0),
                description: c.course_description || c.exam_name || "",
              });
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn("[getVidyagramCourses] Failed to scrape catalog:", err.message);
  }

  // Fallback defaults in case network was down
  if (results.length === 0) {
    results.push(
      {
        id: 128,
        name: "प्रहार 3.0 Combo Batch (By Team Vidyagram)",
        imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-08-30-0_618132284403733.png",
        price: 1499,
        finalPrice: 1499,
        description: "Complete preparation batch for IIT-JEE, NEET & Foundation",
      },
      {
        id: 101,
        name: "SSC GD 2027 (भारत Batch)",
        imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-08-06-0_5599608922305652.jpeg",
        price: 599,
        finalPrice: 599,
        description: "Live & recorded batch for SSC GD 2027",
      },
      {
        id: 35,
        name: "SSC CGL | CHSL Mains VOD Batch by Aditya Ranjan Sir",
        imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-08-06-0_31934981507807114.jpeg",
        price: 799,
        finalPrice: 799,
        description: "VOD complete syllabus coverage by Aditya Ranjan Sir",
      },
      {
        id: 108,
        name: "UPSI + UP Constable Combo Batch",
        imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-08-06-0_5540312683128573.jpeg",
        price: 1199,
        finalPrice: 1199,
        description: "Complete combo batch for UP Police and SI exams",
      }
    );
  }

  if (!vgAuthToken) {
    vgCoursesCache = results;
    vgCoursesCacheTime = now;
  }
  return results;
}

async function getVidyagramSubjects(batchId: string): Promise<any[]> {
  await ensureVgAuth();
  if (vgSubjectsCache.has(batchId)) return vgSubjectsCache.get(batchId)!;
  let raw: any[] = [];
  try {
    const resp = await callVidyagram("get", `/get/allsubjectfrmlivecourseclass`, {
      courseid: batchId,
      start: -1,
    });
    raw = resp?.data || [];
  } catch (e: any) {
    console.warn(`[getVidyagramSubjects] /get/allsubjectfrmlivecourseclass:`, e.message);
  }

  let result = (Array.isArray(raw) ? raw : []).map((s: any) => ({
    id: Number(s.id || s.subject_id),
    name: s.subject_name || s.name || s.title || "Subject",
    videoCount: Number(s.video_count || s.videos_count || s.total || 0) || undefined,
  }));

  // Fallback if course has no explicit subjects array
  if (result.length === 0) {
    result = [{ id: 0, name: "All Topics & Classes", videoCount: undefined }];
  }

  vgSubjectsCache.set(batchId, result);
  return result;
}

async function getVidyagramTopics(batchId: string, subjectId: string): Promise<any[]> {
  await ensureVgAuth();
  const cacheKey = `${batchId}:${subjectId}`;
  if (vgTopicsCache.has(cacheKey)) return vgTopicsCache.get(cacheKey)!;
  let raw: any[] = [];
  try {
    const resp = await callVidyagram("get", `/get/alltopicfrmlivecourseclass`, {
      courseid: batchId,
      subjectid: subjectId,
      start: -1,
    });
    raw = resp?.data || [];
  } catch (e: any) {
    console.warn(`[getVidyagramTopics] /get/alltopicfrmlivecourseclass:`, e.message);
  }

  let result: { id: number; name: any; videoCount?: number; isLeaf?: boolean }[] = (Array.isArray(raw) ? raw : []).map((t: any) => ({
    id: Number(t.id || t.topic_id),
    name: t.topic_name || t.name || t.title || "Topic",
    videoCount: Number(t.video_count || t.videos_count || t.total || 0) || undefined,
  }));

  // Fallback if subject has no explicit topics array
  if (result.length === 0) {
    result = [{ id: 0, name: "All Video Lectures", videoCount: undefined, isLeaf: true }];
  }

  vgTopicsCache.set(cacheKey, result);
  return result;
}

async function getVidyagramLectures(batchId: string, subjectId: string, topicId: string): Promise<any[]> {
  await ensureVgAuth();
  const cacheKey = `${batchId}:${subjectId}:${topicId}`;
  if (vgLecturesCache.has(cacheKey)) return vgLecturesCache.get(cacheKey)!;
  let raw: any[] = [];

  const subIdNum = subjectId === "0" || !subjectId ? -1 : subjectId;
  const topIdNum = topicId === "0" || !topicId ? -1 : topicId;

  try {
    const resp = await callVidyagram("get", `/get/livecourseclassbycoursesubtopconceptapiv3`, {
      courseid: batchId,
      subjectid: subIdNum,
      topicid: topIdNum,
      conceptid: -1,
      windowsapp: 0,
      start: 0,
    });
    raw = resp?.data || [];
  } catch (e: any) {
    console.warn(`[getVidyagramLectures]:`, e.message);
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    try {
      const resp2 = await callVidyagram("get", `/get/livecourseclassbycoursesubtopconceptapiv3`, {
        courseid: batchId,
        subjectid: 0,
        topicid: 0,
        conceptid: -1,
        windowsapp: 0,
        start: 0,
      });
      raw = resp2?.data || [];
    } catch {}
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    try {
      const resp3 = await callVidyagram("get", `/get/folder_courses`, {
        start: 0,
        parent_id: batchId,
      });
      raw = resp3?.data || [];
    } catch {}
  }

  const result = (Array.isArray(raw) ? raw : []).map((l: any) => {
    const rawLink: string = l.file_link || l.video_url || l.url || "";
    let videoUrl = "";
    if (rawLink) {
      const dec = decryptVidyagramFileLink(rawLink);
      if (dec && (dec.startsWith("http") || dec.includes(".m3u8"))) {
        videoUrl = dec;
      } else if (rawLink.startsWith("http")) {
        videoUrl = rawLink;
      }
    }
    const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") || l.video_type === 1;
    return {
      id: Number(l.id || l.lecture_id),
      name: l.lecture_name || l.lesson_name || l.name || l.title || "Lecture",
      contentType: isYouTube ? 1 : 2,
      duration: Number(l.duration || l.video_duration || 0),
      thumbnailUrl: l.thumbnail || l.image || "",
      videoUrl,
      isLocked: false,
      originalLocked: false,
      isYouTube,
    };
  });
  if (result.length > 0) vgLecturesCache.set(cacheKey, result);
  return result;
}

// ─── Next-Toppers Integration ───────────────────────────────────────────────
const NEXT_TOPPERS_HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "content-type": "application/json",
  platform: "3",
  version: "1",
  Version: "1",
  app_id: "1770981347",
  extra_value: "NEXT400",
  "x-app-id": "1770981347",
  "x-extra-value": "NEXT400",
  origin: "https://nexttoppers.com",
  referer: "https://nexttoppers.com/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
};

let nextToppersAuthToken: string | null = null;
let nextToppersCookie: string | null = null;

function getNTHeaders(): Record<string, string> {
  const h: Record<string, string> = { ...NEXT_TOPPERS_HEADERS };
  if (nextToppersAuthToken) {
    h["Authorization"] = nextToppersAuthToken.startsWith("Bearer ")
      ? nextToppersAuthToken
      : `Bearer ${nextToppersAuthToken}`;
    h["token"] = nextToppersAuthToken;
  }
  if (nextToppersCookie) {
    h["cookie"] = nextToppersCookie;
  }
  return h;
}

let ntCoursesCache: any[] | null = null;
let ntCoursesExpiry = 0;

interface FuturekulClass {
  id: number;
  name: string;
  subject: string;
  link: string;
  duration?: number;
  isLocked?: boolean;
  bitrateUrls: { title: string; url: string }[];
}

interface FuturekulCourseDetail {
  course: any;
  free_class?: any[];
  paid_class?: any[];
}

let futurekulCatalogCache: any[] | null = null;
const futurekulDetailCache = new Map<number, FuturekulCourseDetail>();
let futurekulBuildId = "";

async function getFuturekulCatalog(): Promise<any[]> {
  if (futurekulCatalogCache) return futurekulCatalogCache;
  const html = (await axios.get("https://www.futurekul.com/courses", { timeout: 12000 })).data as string;
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Futurekul course data was not found");
  const page = JSON.parse(match[1]);
  futurekulBuildId = page?.buildId || futurekulBuildId;
  const props = page?.props?.pageProps || {};
  futurekulCatalogCache = [
    ...(props.onlineCoursesList || props.liveCoursesList || []),
    ...(props.offlineCoursesList || []),
  ];
  return futurekulCatalogCache;
}

async function getFuturekulCourseDetail(courseId: number): Promise<FuturekulCourseDetail> {
  const cached = futurekulDetailCache.get(courseId);
  if (cached) return cached;
  const course = (await getFuturekulCatalog()).find((item: any) => Number(item.id) === courseId);
  if (!course?.slug) throw new Error(`Futurekul course ${courseId} was not found`);
  let detail: FuturekulCourseDetail | undefined;
  if (futurekulBuildId) {
    try {
      const response = await axios.get(
        `https://www.futurekul.com/_next/data/${futurekulBuildId}/en-US/courses/${encodeURIComponent(course.slug)}/${courseId}.json`,
        { params: { slug: course.slug, id: courseId }, timeout: 12000 }
      );
      detail = response.data?.pageProps?.courseDetail;
    } catch (err: any) {
      console.warn(`[getFuturekulCourseDetail] Data endpoint failed for ${courseId}:`, err.message);
    }
  }

  if (!detail) {
    const html = (
      await axios.get(`https://www.futurekul.com/courses/${encodeURIComponent(course.slug)}/${courseId}`, {
        timeout: 12000,
      })
    ).data as string;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) throw new Error("Futurekul course details were not found");
    detail = JSON.parse(match[1])?.props?.pageProps?.courseDetail;
  }
  if (!detail) throw new Error(`Futurekul course details are unavailable for ${courseId}`);
  futurekulDetailCache.set(courseId, detail);
  return detail;
}

async function getFuturekulBitrates(link: string): Promise<{ title: string; url: string }[]> {
  if (!link || !link.includes(".m3u8")) return [];
  try {
    const playlist = String((await axios.get(link, { timeout: 10000, responseType: "text" })).data);
    const lines = playlist.split(/\r?\n/).map((line) => line.trim());
    const bitrates: { title: string; url: string }[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const metadata = lines[index];
      if (!metadata.startsWith("#EXT-X-STREAM-INF:")) continue;
      const variant = lines.slice(index + 1).find((line) => line && !line.startsWith("#"));
      if (!variant) continue;
      const resolution = metadata.match(/RESOLUTION=\d+x(\d+)/i)?.[1];
      const bandwidth = metadata.match(/BANDWIDTH=(\d+)/i)?.[1];
      const title = resolution || (bandwidth ? `${Math.round(Number(bandwidth) / 1000)}k` : "Auto");
      bitrates.push({ title, url: new URL(variant, link).toString() });
    }
    return bitrates;
  } catch (err: any) {
    console.warn(`[getFuturekulBitrates] Failed for ${link}:`, err.message);
    return [];
  }
}

async function mapFuturekulClass(item: any, index: number, includeBitrates = true): Promise<FuturekulClass> {
  const link = String(item.link || "");
  return {
    id: Number(item.class_id || item.id || index + 1),
    name: String(item.description || item.class_name || item.title || "Futurekul Class")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim(),
    subject: String(item.custom_tag_1 || "Other").trim() || "Other",
    link,
    duration: Number(item.duration) || 0,
    isLocked: item.is_buy === 1 || item.is_buy === "1",
    bitrateUrls: includeBitrates ? await getFuturekulBitrates(link) : [],
  };
}

async function getFuturekulClasses(courseId: number, includeBitrates = true): Promise<FuturekulClass[]> {
  const detail = await getFuturekulCourseDetail(courseId);
  const freeClasses = (detail.free_class || []) as any[];
  const paidGroups = (detail.paid_class || []) as any[];
  const paidClasses = paidGroups.flatMap((group) => (Array.isArray(group?.class) ? group.class : []));
  const entries = [...freeClasses, ...paidClasses].filter(
    (item) => item && (item.class_id || item.id || item.link || item.class_name || item.title)
  );
  return Promise.all(entries.map((item, index) => mapFuturekulClass(item, index, includeBitrates)));
}

async function getFuturekulSubjects(courseId: number): Promise<{ id: number; name: string; videoCount: number }[]> {
  const classes = await getFuturekulClasses(courseId, false);
  const names = [...new Set(classes.map((item) => item.subject).filter(Boolean))];
  return [
    { id: 1, name: "All Classes", videoCount: classes.length },
    ...names.map((name, index) => ({
      id: index + 2,
      name,
      videoCount: classes.filter((item) => item.subject === name).length,
    })),
  ];
}

async function getNextToppersCourses(): Promise<any[]> {
  const now = Date.now();
  if (ntCoursesCache && ntCoursesExpiry > now) {
    return ntCoursesCache;
  }

  const res = await axios.post(
    "https://course.nexttoppers.com/course/all-course",
    {
      page: "1",
      limit: "100",
      keyword: "",
      cat_id: "",
      cat_parent_id: "",
      is_trending: "",
      view_type: "all",
    },
    { headers: getNTHeaders(), timeout: 12000 }
  );

  const courseSection = res.data?.data?.find((s: any) => s.layout_type === "course_list_layout");
  const rawList: any[] = courseSection?.list || [];

  const courses = rawList.map((c: any) => {
    const mrp = parseFloat(c.mrp) || 0;
    const offerPrice = parseFloat(c.offer_price) || 0;
    return {
      id: Number(c.id),
      name: c.title || c.name || "Untitled Course",
      imageUrl: c.cover_image || c.thumbnail || "",
      price: mrp,
      finalPrice: offerPrice || undefined,
      description: c.cat_title || c.slug || "",
    };
  });

  if (courses.length > 0) {
    ntCoursesCache = courses;
    ntCoursesExpiry = now + 5 * 60 * 1000;
  }
  return courses;
}

const ntTabCache = new Map<string, string>();

async function getNextToppersTabId(courseId: string): Promise<string> {
  if (ntTabCache.has(courseId)) return ntTabCache.get(courseId)!;
  try {
    const res = await axios.post(
      "https://course.nexttoppers.com/course/course-details",
      { course_id: String(courseId), parent_id: "0" },
      { headers: getNTHeaders(), timeout: 8000 }
    );
    const tabs: any[] = res.data?.data || [];
    const contentTab = tabs.find((t: any) => t.type === "content");
    const tabId = contentTab ? String(contentTab.tab_id || contentTab.id) : "124";
    ntTabCache.set(courseId, tabId);
    return tabId;
  } catch (err: any) {
    console.warn(`[getNextToppersTabId] Failed for course ${courseId}:`, err.message);
    return "124";
  }
}

async function getNextToppersSubjects(courseId: string): Promise<any[]> {
  const tabId = await getNextToppersTabId(courseId);
  const res = await axios.post(
    "https://course.nexttoppers.com/course/all-content",
    {
      course_id: String(courseId),
      folder_id: "0",
      page: "1",
      limit: "100",
      keyword: "",
      parent_course_id: "0",
      tab_type: "content",
      is_free: "",
      tab_id: String(tabId),
    },
    { headers: getNTHeaders(), timeout: 12000 }
  );

  const rawList: any[] = res.data?.data || [];
  return rawList.map((item: any) => {
    const d = item.data || {};
    const counts = d.content_counts || {};
    const totalVideos = (counts.video?.free || 0) + (counts.video?.paid || 0);
    return {
      id: Number(item.entity_id || d.id),
      name: item.title || d.title || "Subject",
      videoCount: totalVideos || undefined,
      tileId: String(tabId),
    };
  });
}

async function getNextToppersTopics(courseId: string, subjectId: string): Promise<any[]> {
  const tabId = await getNextToppersTabId(courseId);
  const res = await axios.post(
    "https://course.nexttoppers.com/course/all-content",
    {
      course_id: String(courseId),
      folder_id: String(subjectId),
      page: "1",
      limit: "100",
      keyword: "",
      parent_course_id: "0",
      tab_type: "content",
      is_free: "",
      tab_id: String(tabId),
    },
    { headers: getNTHeaders(), timeout: 12000 }
  );

  const rawList: any[] = res.data?.data || [];
  const folders = rawList.filter((i: any) => i.type === "folder");
  const files = rawList.filter((i: any) => i.type === "file" || i.type === "test");

  if (folders.length > 0) {
    return folders.map((item: any) => {
      const d = item.data || {};
      const counts = d.content_counts || {};
      const totalVideos = (counts.video?.free || 0) + (counts.video?.paid || 0);
      return {
        id: Number(item.entity_id || d.id),
        name: item.title || d.title || "Topic",
        videoCount: totalVideos || undefined,
        tileId: String(tabId),
      };
    });
  }

  if (files.length > 0) {
    return [
      {
        id: Number(subjectId),
        name: "All Lectures & Notes",
        videoCount: files.length,
        tileId: String(tabId),
        isLeaf: true,
      },
    ];
  }

  return [];
}

async function getNextToppersLectures(courseId: string, topicId: string): Promise<any[]> {
  const tabId = await getNextToppersTabId(courseId);
  const res = await axios.post(
    "https://course.nexttoppers.com/course/all-content",
    {
      course_id: String(courseId),
      folder_id: String(topicId),
      page: "1",
      limit: "100",
      keyword: "",
      parent_course_id: "0",
      tab_type: "content",
      is_free: "",
      tab_id: String(tabId),
    },
    { headers: getNTHeaders(), timeout: 12000 }
  );

  const rawList: any[] = res.data?.data || [];

  // If this folder contains sub-folders, return them as navigable items (contentType: 0 = folder)
  const folders = rawList.filter((i: any) => i.type === "folder");
  if (folders.length > 0) {
    return folders.map((item: any) => {
      const d = item.data || {};
      const counts = d.content_counts || {};
      const totalVideos = (counts.video?.free || 0) + (counts.video?.paid || 0);
      return {
        id: Number(item.entity_id || d.id),
        name: item.title || d.title || "Folder",
        contentType: 0,           // 0 = sub-folder / navigable
        duration: 0,
        thumbnailUrl: d.thumbnail || item.thumbnail || "",
        videoUrl: "",
        vdcId: "",
        bitrateUrls: [],
        isLocked: false,
        originalLocked: false,
        videoCount: totalVideos || undefined,
      };
    });
  }

  // Otherwise return files/tests as playable lectures
  return rawList
    .filter((item: any) => item.type === "file" || item.type === "test")
    .map((item: any) => {
      const d = item.data || {};
      const isDoc = d.file_type === 1;
      const isTest = item.type === "test";
      const contentType = isTest ? 5 : (isDoc ? 3 : 2);
      // download_urls comes as a JSON string from the NT API — parse it
      let parsedDownloadUrls: any[] = [];
      if (d.download_urls) {
        if (typeof d.download_urls === "string") {
          try { parsedDownloadUrls = JSON.parse(d.download_urls); } catch { parsedDownloadUrls = []; }
        } else if (Array.isArray(d.download_urls)) {
          parsedDownloadUrls = d.download_urls;
        }
      }

      // For YouTube videos (video_type === 1): extract YouTube ID from thumbnail URL
      const isYouTube = d.video_type === 1;
      let videoUrl = "";
      if (isYouTube) {
        const ytMatch = (d.thumbnail || "").match(/\/vi\/([^/]+)\//);
        videoUrl = ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : "";
      } else {
        // Direct stream only if it is a playable mp4 or m3u8.
        // DO NOT use download_urls here because they are raw offline files, not playable streams!
        const cand = d.file_url || d.download_url || "";
        if (cand && (cand.includes(".mp4") || cand.includes(".m3u8"))) {
          videoUrl = cand;
        }
      }

      const duration = typeof d.duration === "number" ? d.duration : parseInt(d.duration || "0", 10) || 0;

      // Thumbnail: prefer explicit thumbnail, fall back to YouTube thumbnail, then default
      let thumbnailUrl = d.thumbnail || item.thumbnail || "";
      if (thumbnailUrl && !thumbnailUrl.trim()) thumbnailUrl = "";
      if (!thumbnailUrl && isYouTube) {
        const ytMatch2 = (d.thumbnail || "").match(/\/vi\/([^/]+)\//);
        if (ytMatch2) thumbnailUrl = `https://i.ytimg.com/vi/${ytMatch2[1]}/hqdefault.jpg`;
      }
      if (!thumbnailUrl && contentType === 2) {
        thumbnailUrl = "https://admin.nexttoppers.com/public/assets/dist/img/new-image/videoThumbnailImg.png";
      }

      return {
        id: Number(item.entity_id || d.id),
        name: item.title || d.title || (isDoc ? "Study Note PDF" : "Lecture"),
        contentType,
        duration,
        thumbnailUrl,
        videoUrl,
        vdcId: d.vdc_id || "",
        bitrateUrls: d.vdc_id ? [] : parsedDownloadUrls.filter((b: any) => b?.url && (b.url.includes(".m3u8") || b.url.includes(".mp4"))),
        isLocked: d.is_locked === 1 || d.is_locked === "1",
        originalLocked: d.is_locked === 1 || d.is_locked === "1",
        isYouTube,
      };
    });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/platforms
app.get(["/api/platforms", "/api/:platform/platforms"], (_req: Request, res: Response) => {
  res.json({ success: true, data: PLATFORMS });
});

// ─── Vidyagram Auth Routes ──────────────────────────────────────────────────
app.get(["/api/vidyagram/auth-status"], (_req: Request, res: Response) => {
  res.json({ success: true, isLoggedIn: Boolean(vgAuthToken), userId: vgUserId || null, userName: vgUserName || null });
});

app.post(["/api/vidyagram/login"], async (req: Request, res: Response) => {
  try {
    const { mobile, password } = req.body || {};
    if (!mobile || !password) {
      return res.json({ success: false, error: "Mobile/User ID and password are required" });
    }

    const params = new URLSearchParams();
    params.append("email", String(mobile).trim());
    params.append("password", String(password));
    params.append("source", "website");
    params.append("extra_details", "1");

    const resp = await axios.post(
      `${VIDYAGRAM_BASE}/post/userLogin`,
      params.toString(),
      {
        headers: {
          ...VIDYAGRAM_APPX_HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000,
        validateStatus: () => true,
      }
    );

    const d = resp.data;
    if (!d || d.status !== 200) {
      const msg = d?.message || d?.msg || (d?.status === 203 ? "Invalid Login Credentials" : "Login failed");
      return res.json({ success: false, error: msg });
    }

    const userData = d.data || {};
    const token: string = userData.token || userData.auth_token || userData.authToken || "";
    const userId: string = String(userData.id || userData.user_id || userData.userId || "");
    const name: string = userData.name || userData.full_name || userData.username || String(mobile);

    if (!token) {
      return res.json({ success: false, error: d.message || "No auth token received from Vidyagram" });
    }

    vgAuthToken = token;
    vgUserId = userId;
    vgUserName = name;
    vgCoursesCache = null;
    vgSubjectsCache.clear();
    vgTopicsCache.clear();
    vgLecturesCache.clear();

    return res.json({
      success: true,
      message: `Logged in as ${name}`,
      userId,
      userName: name,
    });
  } catch (err: any) {
    console.error("[/api/vidyagram/login]", err.message);
    const msg = err.response?.data?.message || err.message || "Login request failed";
    return res.json({ success: false, error: String(msg) });
  }
});

app.post(["/api/vidyagram/logout"], (_req: Request, res: Response) => {
  vgAuthToken = null; vgUserId = null; vgUserName = null;
  vgSubjectsCache.clear(); vgTopicsCache.clear(); vgLecturesCache.clear();
  res.json({ success: true, message: "Logged out from Vidyagram" });
});

// Next-Toppers Credentials Config
app.get(["/api/nt/config", "/api/:platform/nt/config"], (_req: Request, res: Response) => {
  res.json({
    success: true,
    hasAuthToken: Boolean(nextToppersAuthToken),
    hasCookie: Boolean(nextToppersCookie),
  });
});

app.post(["/api/nt/config", "/api/:platform/nt/config"], (req: Request, res: Response) => {
  const { authToken, cookie } = req.body || {};
  if (authToken !== undefined) nextToppersAuthToken = authToken ? String(authToken).trim() : null;
  if (cookie !== undefined) nextToppersCookie = cookie ? String(cookie).trim() : null;
  res.json({
    success: true,
    message: "Next-Toppers settings updated",
    hasAuthToken: Boolean(nextToppersAuthToken),
    hasCookie: Boolean(nextToppersCookie),
  });
});

// Handler for courses
async function handleGetCourses(req: Request, res: Response) {
  const platform = getPlatform(req);

  if (platform === "vidyagram") {
    try {
      const courses = await getVidyagramCourses();
      return res.json({ success: true, platform, data: courses });
    } catch (err: any) {
      console.error("[/api/courses vidyagram]", err.message);
      return res.status(500).json({ success: false, error: String(err.message || err) });
    }
  }

  if (platform === "futurekul") {
    try {
      const courses = (await getFuturekulCatalog()).map((course: any) => ({
        id: Number(course.id),
        slug: course.slug,
        name: course.title || "Futurekul Course",
        imageUrl: course.image2 || course.banner || "",
        price: Number(course.price) || 0,
        description: course.short_description || course.main_cat_name || "",
      }));
      return res.json({ success: true, platform, data: courses });
    } catch (err) {
      console.error("[/api/courses futurekul]", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  if (platform === "next-toppers") {
    try {
      const courses = await getNextToppersCourses();
      return res.json({ success: true, platform, data: courses });
    } catch (err) {
      console.error("[/api/courses next-toppers]", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  if (platform === "parmar") {
    try {
      const courses = await getParmarCourses();
      return res.json({ success: true, platform, data: courses.length ? courses : PARMAR_COURSES });
    } catch (err: any) {
      console.error("[/api/courses parmar]", err.message);
      return res.json({ success: true, platform, data: PARMAR_COURSES });
    }
  }

  if (platform !== "eduteria") {
    return res.status(501).json({
      success: false,
      error: `Platform '${platform}' is coming soon. Currently supported: eduteria, vidyagram, next-toppers, futurekul, parmar`,
    });
  }

  try {
    const resp = await callEduteria("course/get_courses", {
      course_type: 0,
      slug: "",
      page: 1,
      sub_cat: 1,
      main_cat: 0,
    });
    const rawList: any[] = resp?.data?.course_list || (Array.isArray(resp?.data) ? resp.data : []);
    const courses = rawList.map((c: any) => ({
      id: Number(c.id),
      name: c.title || c.name || "Untitled Course",
      imageUrl: c.desc_header_image || c.cover_image || c.image || "",
      price: Number(c.mrp) || 0,
      finalPrice: Number(c.course_sp) || undefined,
      description: c.description || "",
    }));
    res.json({ success: true, platform, data: courses });
  } catch (err) {
    console.error("[/api/courses]", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

app.get("/api/courses", handleGetCourses);
app.get("/api/:platform/courses", handleGetCourses);

// Handler for subjects
async function handleGetSubjects(req: Request, res: Response) {
  const platform = getPlatform(req);

  if (platform === "parmar") {
    try {
      const courseId = String(req.query.courseId || "");
      if (!courseId) return res.status(400).json({ success: false, error: "courseId is required" });
      const subjects = await getParmar("/get/allsubjectfrmlivecourseclass", { courseid: courseId, start: -1 });
      return res.json({ success: true, platform, data: Array.isArray(subjects) ? subjects.map(mapParmarSubject) : [] });
    } catch (err: any) {
      console.error("[/api/course/subjects parmar]", err.message);
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  if (platform === "vidyagram") {
    try {
      const courseId = String(req.query.courseId || "");
      if (!courseId) return res.status(400).json({ success: false, error: "courseId is required" });
      const subjects = await getVidyagramSubjects(courseId);
      return res.json({ success: true, platform, data: subjects });
    } catch (err: any) {
      console.error("[/api/course/subjects vidyagram]", err.message);
      return res.status(500).json({ success: false, error: String(err.message || err) });
    }
  }

  if (platform === "futurekul") {
    const courseId = Number(req.query.courseId);
    if (!courseId) return res.status(400).json({ success: false, error: "courseId is required" });
    return res.json({
      success: true,
      platform,
      data: await getFuturekulSubjects(courseId),
    });
  }

  if (platform === "next-toppers") {
    try {
      const courseId = String(req.query.courseId);
      if (!courseId) return res.status(400).json({ success: false, error: "courseId is required" });
      const subjects = await getNextToppersSubjects(courseId);
      return res.json({ success: true, platform, data: subjects });
    } catch (err) {
      console.error("[/api/course/subjects next-toppers]", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  if (platform !== "eduteria") {
    return res.status(501).json({ success: false, error: `Platform '${platform}' is coming soon.` });
  }

  try {
    const courseId = String(req.query.courseId);
    if (!courseId) return res.status(400).json({ success: false, error: "courseId is required" });
    const tileId = (req.query.tileId as string) || (await getVideoTileId(courseId));
    const resp = await callEduteria("course/get_master_data", {
      course_id: courseId,
      tile_id: tileId,
      type: "video",
      revert_api: "0#0#0#0",
      layer: 1,
      page: 1,
      parent_id: "",
    });
    const rawList: any[] = resp?.data?.list || (Array.isArray(resp?.data) ? resp.data : []);
    const subjects = rawList.map((s: any) => ({
      id: Number(s.id),
      name: s.title || s.name || s.subject_name || "Subject",
      videoCount: Number(s.total) || undefined,
      tileId,
    }));
    res.json({ success: true, platform, data: subjects });
  } catch (err) {
    console.error("[/api/course/subjects]", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

app.get("/api/course/subjects", handleGetSubjects);
app.get("/api/:platform/course/subjects", handleGetSubjects);

// Handler for topics
async function handleGetTopics(req: Request, res: Response) {
  const platform = getPlatform(req);

  if (platform === "parmar") {
    try {
      const courseId = String(req.query.courseId || "");
      const subjectId = String(req.query.subjectId || "");
      if (!courseId || !subjectId) return res.status(400).json({ success: false, error: "courseId and subjectId are required" });
      const topics = await getParmar("/get/alltopicfrmlivecourseclass", { courseid: courseId, subjectid: subjectId, start: -1 });
      return res.json({ success: true, platform, data: Array.isArray(topics) ? topics.map(mapParmarTopic) : [] });
    } catch (err: any) {
      console.error("[/api/course/topics parmar]", err.message);
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  if (platform === "vidyagram") {
    try {
      const courseId  = String(req.query.courseId  || "");
      const subjectId = String(req.query.subjectId || "");
      if (!courseId || !subjectId)
        return res.status(400).json({ success: false, error: "courseId and subjectId are required" });
      const topics = await getVidyagramTopics(courseId, subjectId);
      return res.json({ success: true, platform, data: topics });
    } catch (err: any) {
      console.error("[/api/course/topics vidyagram]", err.message);
      return res.status(500).json({ success: false, error: String(err.message || err) });
    }
  }

  if (platform === "futurekul") {
    const courseId = Number(req.query.courseId);
    const subjectId = Number(req.query.subjectId || 1);
    if (!courseId) return res.status(400).json({ success: false, error: "courseId is required" });
    const classes = await getFuturekulClasses(courseId, false);
    const subjects = await getFuturekulSubjects(courseId);
    const selectedSubject = subjects.find((subject) => subject.id === subjectId);
    const filteredClasses = subjectId === 1 || !selectedSubject
      ? classes
      : classes.filter((item) => item.subject === selectedSubject.name);
    return res.json({
      success: true,
      platform,
      data: filteredClasses.map((item) => ({
        id: item.id,
        name: item.name,
        videoCount: 1,
        isLeaf: true,
      })),
    });
  }

  if (platform === "next-toppers") {
    try {
      const courseId = String(req.query.courseId);
      const subjectId = String(req.query.subjectId);
      if (!courseId || !subjectId)
        return res.status(400).json({ success: false, error: "courseId and subjectId are required" });
      const topics = await getNextToppersTopics(courseId, subjectId);
      return res.json({ success: true, platform, data: topics });
    } catch (err) {
      console.error("[/api/course/topics next-toppers]", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  if (platform !== "eduteria") {
    return res.status(501).json({ success: false, error: `Platform '${platform}' is coming soon.` });
  }

  try {
    const courseId = String(req.query.courseId);
    const subjectId = String(req.query.subjectId);
    if (!courseId || !subjectId)
      return res.status(400).json({ success: false, error: "courseId and subjectId are required" });
    const tileId = (req.query.tileId as string) || (await getVideoTileId(courseId));
    const resp = await callEduteria("course/get_master_data", {
      course_id: courseId,
      tile_id: tileId,
      type: "video",
      revert_api: "0#0#0#0",
      subject_id: subjectId,
      layer: 2,
      page: 1,
      parent_id: "",
    });
    const rawList: any[] = resp?.data?.list || (Array.isArray(resp?.data) ? resp.data : []);
    const topics = rawList.map((t: any) => ({
      id: Number(t.id),
      name: t.title || t.name || t.topic_name || "Topic",
      videoCount: Number(t.total) || undefined,
      tileId,
    }));
    res.json({ success: true, platform, data: topics });
  } catch (err) {
    console.error("[/api/course/topics]", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

app.get("/api/course/topics", handleGetTopics);
app.get("/api/:platform/course/topics", handleGetTopics);

// Handler for lectures
async function handleGetLectures(req: Request, res: Response) {
  const platform = getPlatform(req);

  if (platform === "parmar") {
    try {
      const courseId = String(req.query.courseId || "");
      const subjectId = String(req.query.subjectId || "0");
      const topicId = String(req.query.topicId || "0");
      if (!courseId || !topicId) return res.status(400).json({ success: false, error: "courseId and topicId are required" });
      const lectures = await getParmar("/get/livecourseclassbycoursesubtopconceptapiv3", {
        courseid: courseId,
        subjectid: subjectId,
        topicid: topicId,
        conceptid: -1,
        windowsapp: 0,
        start: 0,
      });
      return res.json({ success: true, platform, data: Array.isArray(lectures) ? lectures.map(mapParmarLecture) : [] });
    } catch (err: any) {
      console.error("[/api/course/lectures parmar]", err.message);
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  }

  if (platform === "vidyagram") {
    try {
      const courseId  = String(req.query.courseId  || "");
      const subjectId = String(req.query.subjectId ?? "0");
      const topicId   = String(req.query.topicId   ?? "0");
      if (!courseId)
        return res.status(400).json({ success: false, error: "courseId is required" });
      const lectures = await getVidyagramLectures(courseId, subjectId, topicId);
      return res.json({ success: true, platform, data: lectures });
    } catch (err: any) {
      console.error("[/api/course/lectures vidyagram]", err.message);
      return res.status(500).json({ success: false, error: String(err.message || err) });
    }
  }

  if (platform === "futurekul") {
    const courseId = Number(req.query.courseId);
    const topicId = Number(req.query.topicId);
    if (!courseId || !topicId)
      return res.status(400).json({ success: false, error: "courseId and topicId are required" });
    const item = (await getFuturekulClasses(courseId)).find((entry) => entry.id === topicId);
    if (!item) return res.status(404).json({ success: false, error: "Futurekul class not found" });
    return res.json({
      success: true,
      platform,
      data: [{
        id: item.id,
        name: item.name,
        contentType: 2,
        duration: item.duration || 0,
        videoUrl: item.link,
        bitrateUrls: item.bitrateUrls,
        isLocked: item.isLocked,
        originalLocked: item.isLocked,
      }],
    });
  }

  if (platform === "next-toppers") {
    try {
      const courseId = String(req.query.courseId);
      const topicId = String(req.query.topicId);
      if (!courseId || !topicId)
        return res.status(400).json({ success: false, error: "courseId and topicId are required" });
      const lectures = await getNextToppersLectures(courseId, topicId);
      return res.json({ success: true, platform, data: lectures });
    } catch (err) {
      console.error("[/api/course/lectures next-toppers]", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  if (platform !== "eduteria") {
    return res.status(501).json({ success: false, error: `Platform '${platform}' is coming soon.` });
  }

  try {
    const courseId = String(req.query.courseId);
    const topicId = String(req.query.topicId);
    const subjectId = (req.query.subjectId as string) || "";
    if (!courseId || !topicId)
      return res.status(400).json({ success: false, error: "courseId and topicId are required" });
    const tileId = (req.query.tileId as string) || (await getVideoTileId(courseId));
    const resp = await callEduteria("course/get_master_data", {
      course_id: courseId,
      tile_id: tileId,
      type: "video",
      revert_api: "0#0#0#0",
      subject_id: subjectId,
      topic_id: topicId,
      layer: 3,
      page: 1,
      parent_id: "",
    });
    const rawList: any[] = resp?.data?.list || (Array.isArray(resp?.data) ? resp.data : []);
    const lectures = rawList.map((l: any) => {
      const videoUrl = l.file_url || (l.bitrate_urls && l.bitrate_urls.length ? l.bitrate_urls[0].url : "");
      return {
        id: Number(l.id),
        name: l.title || l.name || "Lecture",
        contentType: 2,
        duration: Number(l.video_duration) || 0,
        thumbnailUrl: l.thumbnail_url || "",
        videoUrl,
        vdcId: l.vdc_id || "",
        bitrateUrls: l.bitrate_urls || [],
        isLocked: false,
        originalLocked: l.is_locked === "1",
      };
    });
    res.json({ success: true, platform, data: lectures });
  } catch (err) {
    console.error("[/api/course/lectures]", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

app.get("/api/course/lectures", handleGetLectures);
app.get("/api/:platform/course/lectures", handleGetLectures);

// Handler for video stream
async function handleGetVideoStream(req: Request, res: Response) {
  try {
    const platform = getPlatform(req);
    const directVideoUrl = (req.query.url as string) || "";
    if (directVideoUrl && directVideoUrl.startsWith("http")) {
      return res.json({
        success: true,
        directUrl: directVideoUrl,
        url: directVideoUrl,
        type: directVideoUrl.includes(".mpd") ? "dash" : (directVideoUrl.includes(".m3u8") ? "hls" : "mp4"),
      });
    }

    const vdcId = req.query.vdcId as string;
    if (!vdcId) return res.status(400).json({ success: false, error: "vdcId or url is required" });

    // Next Toppers: use NT's own media-headers + getVideoDetailsDrm for non-DRM HLS
    if (platform === "next-toppers") {
      const m3u8Url = await resolveNTStream(vdcId);
      if (!m3u8Url) {
        return res.status(403).json({
          success: false,
          error: "This video is locked or requires student authorization on Next Toppers.",
          isLocked: true,
        });
      }
      return res.json({
        success: true,
        url: m3u8Url,
        directUrl: m3u8Url,
        type: "hls",
        licenseUrl: "",
        token: "",
      });
    }

    // Eduteria: Fetch DRM stream info AND direct HLS URL in parallel
    const [stream, directUrl] = await Promise.all([
      resolveDrmStream(vdcId).catch(() => null),
      fetchNonDrmUrl(vdcId).catch(() => null),
    ]);

    if (!stream && !directUrl) {
      return res.status(403).json({
        success: false,
        error: "This video is locked or requires student authorization.",
        isLocked: true,
      });
    }

    res.json({
      success: true,
      // DRM DASH stream (may require Widevine in browser)
      url: stream?.url || "",
      token: stream?.token || "",
      type: stream?.type || "dash",
      licenseUrl: stream?.licenseUrl || "",
      // Direct non-DRM HLS — always playable, use as primary fallback
      directUrl: directUrl || "",
    });
  } catch (err: any) {
    console.error("[/api/video/stream]", err.message);
    res.status(500).json({ success: false, error: String(err.message || err) });
  }
}

app.get("/api/video/stream", handleGetVideoStream);
app.get("/api/:platform/video/stream", handleGetVideoStream);

// Handler for proxy stream
async function handleProxyStream(req: Request, res: Response) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    return res.sendStatus(204);
  }

  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) return res.status(400).send("url parameter required");
    const target = decodeURIComponent(rawUrl);

    const platformParam = (req.params.platform || req.query.platform || "").toString().toLowerCase();
    const isNextToppers =
      platformParam === "next-toppers" ||
      target.includes("nexttoppers") ||
      target.includes("dylnd2lqy6eys");
    const isVidyagram =
      platformParam === "vidyagram" ||
      target.includes("vidyagram") ||
      target.includes("akamai.net.in") ||
      target.includes("classx");

    let referer = "https://eduteria.live/";
    let origin = "https://eduteria.live";
    if (isNextToppers) {
      referer = "https://nexttoppers.com/";
      origin = "https://nexttoppers.com";
    } else if (isVidyagram) {
      referer = "https://vidyagram.online/";
      origin = "https://vidyagram.online";
    }

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
      Referer: referer,
      Origin: origin,
    };
    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const isM3u8 = target.includes(".m3u8") || req.query.type === "hls";

    if (isM3u8) {
      const upstream = await axios.get(target, {
        responseType: "text",
        timeout: 25000,
        headers,
        validateStatus: (status) => status < 400,
      });

      const host = req.get("host") || "localhost:3000";
      const proto =
        req.protocol === "https" || req.headers["x-forwarded-proto"] === "https"
          ? "https"
          : "http";
      const proxyBase = `${proto}://${host}/api/proxy/stream`;

      res.status(upstream.status);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Cache-Control", "no-cache");

      const text = typeof upstream.data === "string" ? upstream.data : JSON.stringify(upstream.data);
      const lines = text.split(/\r?\n/);
      const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Tags that contain URIs (e.g. #EXT-X-KEY or #EXT-X-MAP)
        if (trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
            try {
              const abs = new URL(uri, target).toString();
              return `URI="${proxyBase}?platform=${encodeURIComponent(platformParam)}&url=${encodeURIComponent(abs)}"`;
            } catch {
              return _match;
            }
          });
        }

        // Playlist variants or media segments (.ts, .m3u8, .mp4, .m4s)
        try {
          const abs = new URL(trimmed, target);
          if (!abs.search && new URL(target).search) {
            abs.search = new URL(target).search;
          }
          return `${proxyBase}?platform=${encodeURIComponent(platformParam)}&url=${encodeURIComponent(abs.toString())}`;
        } catch {
          return line;
        }
      });

      return res.send(rewritten.join("\n"));
    }

    // Binary segment or direct stream (.ts, .mp4, .m4s, key file)
    const upstream = await axios.get(target, {
      responseType: "stream",
      timeout: 30000,
      headers,
      validateStatus: (status) => status < 400,
    });

    res.status(upstream.status);
    for (const [key, val] of Object.entries(upstream.headers)) {
      if (key.toLowerCase() !== "access-control-allow-origin") {
        res.setHeader(key, val as string);
      }
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Cache-Control", "public, max-age=86400");

    upstream.data.pipe(res);
  } catch (err: any) {
    console.error("[/api/proxy/stream]", err.message);
    res.status(502).send("Proxy error: " + String(err.message || err));
  }
}

app.options("/api/proxy/stream", handleProxyStream);
app.options("/api/:platform/proxy/stream", handleProxyStream);
app.get("/api/proxy/stream", handleProxyStream);
app.get("/api/:platform/proxy/stream", handleProxyStream);

export { app };

// If executed directly (e.g. node server/index.ts)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const PORT = 3000;
  const distDir = path.join(__dirname, "..", "dist");
  app.use(express.static(distDir));
  app.get("*", (req: Request, res: Response) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ success: false, error: "API route not found" });
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\x1b[36m\u2713 Multi-platform API server running\x1b[0m at http://0.0.0.0:${PORT}`);
  });
}
