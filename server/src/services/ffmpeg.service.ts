import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import ytdl from '@distube/ytdl-core';

export class FfmpegService {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(process.cwd(), 'temp', 'uploads');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async recordStream(url: string, duration: number, userId: string): Promise<string> {
        let streamUrl = url;

        // If it's a YouTube URL, resolve it first
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            try {
                const info = await ytdl.getInfo(url);
                const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
                if (format) {
                    streamUrl = format.url;
                }
            } catch (error) {
                console.error('Error resolving YouTube URL:', error);
                // Continue with original URL, maybe FFmpeg can handle it (unlikely for raw YT links)
            }
        }

        const timestamp = Date.now();
        const fileName = `${userId}_${timestamp}.mp4`;
        const outputPath = path.join(this.tempDir, fileName);

        return new Promise((resolve, reject) => {
            ffmpeg(streamUrl)
                .inputOptions(['-t', duration.toString()])
                .outputOptions([
                    '-c:v libx264',
                    '-c:a aac',
                    '-strict experimental',
                    '-f mp4',
                    '-movflags frag_keyframe+empty_moov'
                ])
                .on('start', (commandLine) => {
                    console.log('Spawned Ffmpeg with command: ' + commandLine);
                })
                .on('end', () => {
                    console.log('Recording finished');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error recording stream:', err);
                    reject(err);
                })
                .save(outputPath);
        });
    }
}

export const ffmpegService = new FfmpegService();
