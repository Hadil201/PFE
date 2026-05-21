import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

if (ffprobe.path) {
    ffmpeg.setFfprobePath(ffprobe.path);
}
