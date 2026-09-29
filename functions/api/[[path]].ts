import crypto from "node:crypto";
import { Buffer } from "node:buffer";

// ─── Eduteria Credentials & Cryptography ────────────────────────────────────
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
  const resp = await fetch(`https://appapi.videocrypt.in/data_model/${endpoint}`, {
    method: "POST",
    headers: EDUTERIA_HEADERS,
    body: JSON.stringify(enc),
  });
  const raw = await resp.text();
  return decryptResponse(raw, EDUTERIA_G_VAL);
}

// In-memory cache in worker instance
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
  } catch {
    return "147237";
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

async function resolveDrmStream(vdcId: string) {
  if (!vdcId) return null;
  try {
    const res = await fetch("https://api.videocrypt.com/getVideoDetailsDrm", {
      method: "POST",
      headers: VC_HEADERS,
      body: JSON.stringify({ name: vdcId, flag: 1 }),
    });
    const json: any = await res.json();
    const link = json?.data?.link;
    const url = link?.file_url || "";
    const token = link?.token || "";
    if (!url) return null;
    const type = url.includes(".mpd") ? "dash" : "hls";
    const licenseUrl = token
      ? `https://license.videocrypt.com/validateLicense?pallyconCustomdataV2=${encodeURIComponent(token)}`
      : "";
    return { url, token, type, licenseUrl };
  } catch {
    return null;
  }
}

async function fetchNonDrmUrl(vdcId: string): Promise<string | null> {
  if (!vdcId) return null;
  try {
    const res = await fetch("https://api.videocrypt.com/getVideoDetails", {
      method: "POST",
      headers: VC_HEADERS,
      body: JSON.stringify({ name: vdcId }),
    });
    const json: any = await res.json();
    const d = json?.data;
    return d?.file_url_hls || d?.link?.file_url_hls || d?.bitrate_urls?.[0]?.url || null;
  } catch {
    return null;
  }
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

// ─── Cloudflare Pages Function Router ───────────────────────────────────────
export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS Options
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  // 1. GET /api/platforms
  if (path === "/api/platforms" || path.endsWith("/platforms")) {
    return jsonResponse({
      success: true,
      data: [
        {
          id: "eduteria",
          name: "Eduteria",
          description: "BPSC, UPSC & State PCS Online Batches",
          available: true,
          icon: "book",
          color: "#38bdf8",
        },
      ],
    });
  }

  // 2. GET /api/courses
  if (path === "/api/courses" || path.endsWith("/courses")) {
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
      return jsonResponse({ success: true, platform: "eduteria", data: courses });
    } catch (err: any) {
      return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
    }
  }

  // 3. GET /api/course/subjects
  if (path === "/api/course/subjects" || path.endsWith("/course/subjects")) {
    try {
      const courseId = url.searchParams.get("courseId") || "";
      if (!courseId) return jsonResponse({ success: false, error: "courseId is required" }, 400);
      const tileId = url.searchParams.get("tileId") || (await getVideoTileId(courseId));
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
      return jsonResponse({ success: true, platform: "eduteria", data: subjects });
    } catch (err: any) {
      return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
    }
  }

  // 4. GET /api/course/topics
  if (path === "/api/course/topics" || path.endsWith("/course/topics")) {
    try {
      const courseId = url.searchParams.get("courseId") || "";
      const subjectId = url.searchParams.get("subjectId") || "";
      if (!courseId || !subjectId) {
        return jsonResponse({ success: false, error: "courseId and subjectId are required" }, 400);
      }
      const tileId = url.searchParams.get("tileId") || (await getVideoTileId(courseId));
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
      return jsonResponse({ success: true, platform: "eduteria", data: topics });
    } catch (err: any) {
      return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
    }
  }

  // 5. GET /api/course/lectures
  if (path === "/api/course/lectures" || path.endsWith("/course/lectures")) {
    try {
      const courseId = url.searchParams.get("courseId") || "";
      const topicId = url.searchParams.get("topicId") || "";
      const subjectId = url.searchParams.get("subjectId") || "";
      if (!courseId || !topicId) {
        return jsonResponse({ success: false, error: "courseId and topicId are required" }, 400);
      }
      const tileId = url.searchParams.get("tileId") || (await getVideoTileId(courseId));
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
      return jsonResponse({ success: true, platform: "eduteria", data: lectures });
    } catch (err: any) {
      return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
    }
  }

  // 6. GET /api/video/stream or /api/stream/videocrypt
  if (path === "/api/video/stream" || path.endsWith("/video/stream") || path.includes("/stream/videocrypt")) {
    try {
      const directVideoUrl = url.searchParams.get("url") || "";
      if (directVideoUrl && directVideoUrl.startsWith("http")) {
        return jsonResponse({
          success: true,
          directUrl: directVideoUrl,
          url: directVideoUrl,
          type: directVideoUrl.includes(".mpd") ? "dash" : directVideoUrl.includes(".m3u8") ? "hls" : "mp4",
        });
      }

      const vdcId = url.searchParams.get("vdcId") || "";
      if (!vdcId) return jsonResponse({ success: false, error: "vdcId or url is required" }, 400);

      const [stream, directUrl] = await Promise.all([
        resolveDrmStream(vdcId).catch(() => null),
        fetchNonDrmUrl(vdcId).catch(() => null),
      ]);

      if (!stream && !directUrl) {
        return jsonResponse({
          success: false,
          error: "This video is locked or requires student authorization on Eduteria.",
          isLocked: true,
        }, 403);
      }

      return jsonResponse({
        success: true,
        url: stream?.url || "",
        token: stream?.token || "",
        type: stream?.type || "dash",
        licenseUrl: stream?.licenseUrl || "",
        directUrl: directUrl || "",
      });
    } catch (err: any) {
      return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
    }
  }

  // 7. GET /api/proxy/stream
  if (path === "/api/proxy/stream" || path.endsWith("/proxy/stream")) {
    const rawTarget = url.searchParams.get("url");
    if (!rawTarget) return new Response("url query parameter required", { status: 400 });
    const target = decodeURIComponent(rawTarget);

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
      Referer: "https://eduteria.live/",
      Origin: "https://eduteria.live",
    };
    const range = request.headers.get("Range");
    if (range) headers["Range"] = range;

    const isM3u8 = target.includes(".m3u8") || url.searchParams.get("type") === "hls";

    try {
      const upstream = await fetch(target, { headers });
      if (isM3u8) {
        const text = await upstream.text();
        const proxyBase = `${url.origin}/api/proxy/stream`;
        const lines = text.split(/\r?\n/);
        const rewritten = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
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

        return new Response(rewritten.join("\n"), {
          status: upstream.status,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": "no-cache",
          },
        });
      }

      // Binary stream
      const resHeaders = new Headers(upstream.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Headers", "*");
      resHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      resHeaders.set("Cache-Control", "public, max-age=86400");

      return new Response(upstream.body, {
        status: upstream.status,
        headers: resHeaders,
      });
    } catch (err: any) {
      return new Response("Proxy error: " + String(err?.message || err), { status: 502 });
    }
  }

  // 8. GET /api/img - Image Proxy
  if (path === "/api/img" || path.endsWith("/img")) {
    const imgUrl = url.searchParams.get("u") || url.searchParams.get("url");
    if (!imgUrl) return new Response("Image URL required", { status: 400 });
    try {
      const resp = await fetch(decodeURIComponent(imgUrl), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://eduteria.live/",
        },
      });
      const resHeaders = new Headers(resp.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Cache-Control", "public, max-age=604800, immutable");
      return new Response(resp.body, { status: resp.status, headers: resHeaders });
    } catch {
      return new Response("Failed to fetch image", { status: 502 });
    }
  }

  return jsonResponse({ success: false, error: "API route not found" }, 404);
};
