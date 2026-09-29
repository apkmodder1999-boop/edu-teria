import express from "express";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";
import path from "path";
import dns from "dns";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";

dns.setDefaultResultOrder("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ─── Platform Registry (Eduteria Only) ──────────────────────────────────────
const PLATFORMS = [
  {
    id: "eduteria",
    name: "Eduteria",
    description: "BPSC, UPSC & State PCS Online Batches",
    available: true,
    icon: "book",
    color: "#6366f1",
  },
];

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
    timeout: 8000,
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

// ─── Fetch direct non-DRM HLS URL via getVideoDetails ───────────────────────
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
    return hlsUrl;
  } catch (err: any) {
    console.warn(`[fetchNonDrmUrl] Failed for vdcId ${vdcId}:`, err.message);
    return null;
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/platforms
app.get(["/api/platforms", "/api/:platform/platforms"], (_req: Request, res: Response) => {
  res.json({ success: true, data: PLATFORMS });
});

// GET /api/courses
async function handleGetCourses(_req: Request, res: Response) {
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
    res.json({ success: true, platform: "eduteria", data: courses });
  } catch (err) {
    console.error("[/api/courses]", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
app.get("/api/courses", handleGetCourses);
app.get("/api/:platform/courses", handleGetCourses);

// GET /api/course/subjects
async function handleGetSubjects(req: Request, res: Response) {
  try {
    const courseId = String(req.query.courseId || "");
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
    res.json({ success: true, platform: "eduteria", data: subjects });
  } catch (err) {
    console.error("[/api/course/subjects]", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
app.get("/api/course/subjects", handleGetSubjects);
app.get("/api/:platform/course/subjects", handleGetSubjects);

// GET /api/course/topics
async function handleGetTopics(req: Request, res: Response) {
  try {
    const courseId = String(req.query.courseId || "");
    const subjectId = String(req.query.subjectId || "");
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
    res.json({ success: true, platform: "eduteria", data: topics });
  } catch (err) {
    console.error("[/api/course/topics]", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
app.get("/api/course/topics", handleGetTopics);
app.get("/api/:platform/course/topics", handleGetTopics);

// GET /api/course/lectures
async function handleGetLectures(req: Request, res: Response) {
  try {
    const courseId = String(req.query.courseId || "");
    const topicId = String(req.query.topicId || "");
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
    res.json({ success: true, platform: "eduteria", data: lectures });
  } catch (err) {
    console.error("[/api/course/lectures]", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
app.get("/api/course/lectures", handleGetLectures);
app.get("/api/:platform/course/lectures", handleGetLectures);

// GET /api/video/stream
async function handleGetVideoStream(req: Request, res: Response) {
  try {
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

    // Fetch DRM stream info AND direct HLS URL in parallel
    const [stream, directUrl] = await Promise.all([
      resolveDrmStream(vdcId).catch(() => null),
      fetchNonDrmUrl(vdcId).catch(() => null),
    ]);

    if (!stream && !directUrl) {
      return res.status(403).json({
        success: false,
        error: "This video is locked or requires student authorization on Eduteria.",
        isLocked: true,
      });
    }

    res.json({
      success: true,
      url: stream?.url || "",
      token: stream?.token || "",
      type: stream?.type || "dash",
      licenseUrl: stream?.licenseUrl || "",
      directUrl: directUrl || "",
    });
  } catch (err: any) {
    console.error("[/api/video/stream]", err.message);
    res.status(500).json({ success: false, error: String(err.message || err) });
  }
}
app.get("/api/video/stream", handleGetVideoStream);
app.get("/api/:platform/video/stream", handleGetVideoStream);

// ─── Stream Proxy Handler ───────────────────────────────────────────────────
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

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
      Referer: "https://eduteria.live/",
      Origin: "https://eduteria.live",
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
              return `URI="${proxyBase}?url=${encodeURIComponent(abs)}"`;
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
          return `${proxyBase}?url=${encodeURIComponent(abs.toString())}`;
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
    console.log(`\x1b[36m\u2713 Eduteria API server running\x1b[0m at http://0.0.0.0:${PORT}`);
  });
}
