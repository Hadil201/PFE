import '../config/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { createYouTubeStream, getYouTubePlaybackError, isYouTubeUrl } from './youtubeClient';

export class FfmpegService {
    private baseTempDir: string;

    constructor() {
        this.baseTempDir = path.join(process.cwd(), 'temp');
        this.ensureDirs();
    }

    private ensureDirs() {
        const dirs = ['uploads', 'videos', 'youtube', 'thumbnails'];
        dirs.forEach(dir => {
            const dirPath = path.join(this.baseTempDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    async generateThumbnail(url: string, videoId: string): Promise<string> {
        const fileName = `thumb-${videoId}.jpg`;
        const outputPath = path.join(this.baseTempDir, 'thumbnails', fileName);
        
        // Ensure input is absolute if it's a local file
        let input = url;
        if (!url.startsWith('http') && !path.isAbsolute(url)) {
            input = path.resolve(process.cwd(), url);
        }

        return new Promise((resolve, reject) => {
            ffmpeg(input)
                .inputOptions('-ss 1') // Seek before input for faster processing
                .outputOptions(['-vframes 1', '-s 320x240', '-update 1'])
                .on('end', () => {
                    console.log('Thumbnail generated:', outputPath);
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error generating thumbnail:', err);
                    reject(err);
                })
                .save(outputPath);
        });
    }

    async recordStream(
        url: string, 
        duration: number, 
        userId: string, 
        videoId: string, 
        source: string, 
        index: number = 1
    ): Promise<string> {
        // Map source to folder
        let folder = 'uploads';
        if (source === 'stream') folder = 'videos';
        else if (source === 'youtube') folder = 'youtube';

        const fileName = `${userId}-${videoId}-morceau[${index}].mp4`;
        const outputPath = path.join(this.baseTempDir, folder, fileName);
        
        const youtubeInput = isYouTubeUrl(url);
        const streamInput = youtubeInput ? await createYouTubeStream(url) : url;

        return new Promise((resolve, reject) => {
            let settled = false;
            const fail = (error: Error) => {
                if (settled) return;
                settled = true;
                const playbackError = youtubeInput ? getYouTubePlaybackError(error) : error;
                console.error('Error recording stream:', playbackError);
                reject(playbackError);
            };

            if (youtubeInput && typeof streamInput !== 'string') {
                streamInput.once('error', fail);
            }

            ffmpeg(streamInput)
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
                    if (settled) return;
                    settled = true;
                    console.log('Recording finished:', outputPath);
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    fail(err);
                })
                .save(outputPath);
        });
    }
}

export const ffmpegService = new FfmpegService();
