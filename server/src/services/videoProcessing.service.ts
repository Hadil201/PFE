import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface VideoChunk {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  filePath: string;
  size: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
}

export class VideoProcessingService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'videos');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFps(videoStream.r_frame_rate || '0/1'),
          bitrate: parseInt(String(metadata.format.bit_rate) || '0'),
          format: metadata.format.format_name || '',
        });
      });
    });
  }

  private parseFps(rFrameRate: string): number {
    const [numerator, denominator] = rFrameRate.split('/').map(Number);
    return (denominator && numerator) ? numerator / denominator : (numerator || 0);
  }

  async chunkVideo(
    videoPath: string,
    chunkDuration: number = 5,
    sessionId: string = uuidv4()
  ): Promise<VideoChunk[]> {
    try {
      const metadata = await this.getVideoMetadata(videoPath);
      const chunks: VideoChunk[] = [];
      const totalDuration = metadata.duration;
      const numChunks = Math.ceil(totalDuration / chunkDuration);

      for (let i = 0; i < numChunks; i++) {
        const startTime = i * chunkDuration;
        const endTime = Math.min((i + 1) * chunkDuration, totalDuration);
        const duration = endTime - startTime;

        const chunkId = `${sessionId}-chunk-${i}`;
        const chunkPath = path.join(this.tempDir, `${chunkId}.mp4`);

        await this.createChunk(videoPath, chunkPath, startTime, duration);

        const stats = await fs.stat(chunkPath);
        
        chunks.push({
          id: chunkId,
          startTime,
          endTime,
          duration,
          filePath: chunkPath,
          size: stats.size,
        });
      }

      return chunks;
    } catch (error) {
      console.error('Error chunking video:', error);
      throw error;
    }
  }

  private async createChunk(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .on('end', () => {
          console.log(`Chunk created: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error creating chunk:', err);
          reject(err);
        })
        .run();
    });
  }

  async extractFrames(
    videoPath: string,
    outputDir: string,
    frameRate: number = 1
  ): Promise<string[]> {
    try {
      await fs.mkdir(outputDir, { recursive: true });
      const framePattern = path.join(outputDir, 'frame_%04d.jpg');
      
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([`-vf fps=${frameRate}`])
          .output(framePattern)
          .on('end', () => {
            console.log('Frames extracted successfully');
            resolve(this.getFramePaths(outputDir));
          })
          .on('error', (err) => {
            console.error('Error extracting frames:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      console.error('Error extracting frames:', error);
      throw error;
    }
  }

  private getFramePaths(outputDir: string): string[] {
    const frameFiles: string[] = [];
    const files = fs.readdir(outputDir);
    
    // This is a simplified version - in production you'd want to sort properly
    files.then(files => {
      files.forEach(file => {
        if (file.startsWith('frame_') && file.endsWith('.jpg')) {
          frameFiles.push(path.join(outputDir, file));
        }
      });
    });

    return frameFiles;
  }

  async cleanupTempFiles(sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        // Clean up specific session files
        const sessionPattern = `${sessionId}-chunk-`;
        const files = await fs.readdir(this.tempDir);
        
        for (const file of files) {
          if (file.includes(sessionPattern)) {
            await fs.unlink(path.join(this.tempDir, file));
          }
        }
      } else {
        // Clean up all temp files older than 1 hour
        const files = await fs.readdir(this.tempDir);
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < oneHourAgo) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  async convertToMp4(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .on('end', () => {
          console.log(`Video converted: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Error converting video:', err);
          reject(err);
        })
        .run();
    });
  }

  async getVideoThumbnail(videoPath: string, outputPath: string, time: string = '00:00:01'): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(time)
        .frames(1)
        .output(outputPath)
        .on('end', () => {
          console.log(`Thumbnail created: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Error creating thumbnail:', err);
          reject(err);
        })
        .run();
    });
  }
}

export const videoProcessingService = new VideoProcessingService();
