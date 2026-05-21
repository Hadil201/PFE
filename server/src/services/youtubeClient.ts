import fs from "fs";
import { Readable } from "stream";
import ytdl from "@distube/ytdl-core";
import type { Innertube as InnertubeConstructor } from "youtubei.js";

type InnertubeInstance = Awaited<ReturnType<typeof InnertubeConstructor.create>>;

export interface YouTubeBasicInfo {
    videoId: string;
    title: string;
    duration: number;
    author: string;
    description: string;
    thumbnail: string;
    publishedAt: string;
}

const PLAYER_CLIENTS: NonNullable<ytdl.getInfoOptions["playerClients"]> = [
    "WEB",
    "WEB_EMBEDDED",
    "IOS",
    "ANDROID",
    "TV",
];

let agentLoaded = false;
let cachedAgent: ytdl.Agent | undefined;
let innertubePromise: Promise<InnertubeInstance> | undefined;
let cookiesLoaded = false;
let cachedCookies: unknown[] | undefined;

const parseCookies = (rawCookies: string, source: string): unknown[] | undefined => {
    try {
        const parsed = JSON.parse(rawCookies);
        if (!Array.isArray(parsed)) {
            console.warn(`${source} must contain an exported YouTube cookies JSON array.`);
            return undefined;
        }
        return parsed;
    } catch (error) {
        console.warn(`Failed to parse ${source}:`, error);
        return undefined;
    }
};

const loadCookies = (): unknown[] | undefined => {
    if (cookiesLoaded) {
        return cachedCookies;
    }
    cookiesLoaded = true;

    const cookieJson = process.env.YOUTUBE_COOKIES_JSON;
    const cookieFile = process.env.YOUTUBE_COOKIES_FILE;
    cachedCookies = cookieJson
        ? parseCookies(cookieJson, "YOUTUBE_COOKIES_JSON")
        : cookieFile && fs.existsSync(cookieFile)
            ? parseCookies(fs.readFileSync(cookieFile, "utf8"), "YOUTUBE_COOKIES_FILE")
            : undefined;

    return cachedCookies;
};

const getCookieHeader = (): string | undefined => {
    const cookies = loadCookies();
    if (!cookies) {
        return undefined;
    }

    const cookiePairs = cookies.flatMap((cookie) => {
        if (
            typeof cookie === "object" &&
            cookie !== null &&
            "name" in cookie &&
            "value" in cookie &&
            typeof cookie.name === "string" &&
            typeof cookie.value === "string"
        ) {
            return [`${cookie.name}=${cookie.value}`];
        }
        return [];
    });

    return cookiePairs.length > 0 ? cookiePairs.join("; ") : undefined;
};

const getAgent = (): ytdl.Agent | undefined => {
    if (agentLoaded) {
        return cachedAgent;
    }
    agentLoaded = true;

    const cookies = loadCookies();
    if (cookies) {
        cachedAgent = ytdl.createAgent(cookies as Parameters<typeof ytdl.createAgent>[0]);
    }

    return cachedAgent;
};

export const isYouTubeUrl = (url: string): boolean =>
    /(^https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);

export const extractYouTubeVideoId = (url: string): string | null => {
    const match = url.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/|live\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/);
    if (match?.[1] && match[1].length === 11) {
        return match[1];
    }

    try {
        const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
        if (parsed.hostname.includes("youtube.com")) {
            const videoId = parsed.searchParams.get("v") || parsed.searchParams.get("vi");
            return videoId && videoId.length === 11 ? videoId : null;
        }
        if (parsed.hostname.includes("youtu.be")) {
            const videoId = parsed.pathname.substring(1).split("/")[0];
            return videoId && videoId.length === 11 ? videoId : null;
        }
    } catch {
        return null;
    }

    return null;
};

const getInnertube = async (): Promise<InnertubeInstance> => {
    if (!innertubePromise) {
        innertubePromise = import("youtubei.js").then(({ Innertube, Platform }) => {
            Platform.shim.eval = async (data: { output: string }) => new Function(data.output)();
            const cookie = getCookieHeader();
            return cookie ? Innertube.create({ cookie }) : Innertube.create();
        });
    }
    return innertubePromise;
};

export const getYouTubeBasicInfo = async (url: string): Promise<YouTubeBasicInfo> => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        throw new Error("Invalid YouTube URL");
    }

    const youtube = await getInnertube();
    const info = await youtube.getInfo(videoId);
    const basic = info.basic_info;

    return {
        videoId: basic.id || videoId,
        title: basic.title || `YouTube Video (${videoId})`,
        duration: Number(basic.duration || 0),
        author: basic.author || basic.channel?.name || "Unknown",
        description: basic.short_description || "",
        thumbnail: basic.thumbnail?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: "",
    };
};

export const getYouTubeOptions = (): ytdl.getInfoOptions => {
    const agent = getAgent();
    return agent ? { playerClients: PLAYER_CLIENTS, agent } : { playerClients: PLAYER_CLIENTS };
};

export const getYouTubeInfo = (url: string): Promise<ytdl.videoInfo> =>
    ytdl.getInfo(url, getYouTubeOptions());

export const createYouTubeStream = (
    url: string,
    options: ytdl.downloadOptions = {}
): Promise<Readable> => createYouTubeStreamWithInnertube(url, options)
    .catch((error) => {
        console.warn("YouTube.js stream failed, falling back to ytdl-core:", error);
        return ytdl(url, {
            ...getYouTubeOptions(),
            filter: "audioandvideo",
            quality: "highest",
            highWaterMark: 1 << 25,
            ...options,
        }) as Readable;
    });

const createYouTubeStreamWithInnertube = async (
    url: string,
    options: ytdl.downloadOptions
): Promise<Readable> => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        throw new Error("Invalid YouTube URL");
    }

    const filter = options.filter;
    const type = filter === "audioonly" || filter === "audio"
        ? "audio"
        : filter === "videoonly" || filter === "video"
            ? "video"
            : "video+audio";

    const youtube = await getInnertube();
    const webStream = await youtube.download(videoId, {
        type,
        quality: "best",
        format: "any",
    });

    return Readable.fromWeb(webStream as unknown as Parameters<typeof Readable.fromWeb>[0]);
};

export const getYouTubePlaybackError = (error: unknown): Error => {
    const message = error instanceof Error ? error.message : String(error);
    if (/playable formats|No such format|unavailable|private|copyright|region/i.test(message)) {
        return new Error(
            "Impossible de lire cette video YouTube. Elle peut etre restreinte, privee, bloquee par region, ou necessiter des cookies YouTube via YOUTUBE_COOKIES_FILE."
        );
    }
    return error instanceof Error ? error : new Error(message);
};
