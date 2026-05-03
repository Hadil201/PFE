import ytdl from 'ytdl-core';
import { promises as fs } from 'fs';
import path from 'path';
import { videoProcessingService } from './videoProcessing.service';

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  duration: number;
  author: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export class YouTubeService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'youtube');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating YouTube temp directory:', error);
    }
  }

  async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    try {
      const info = await ytdl.getInfo(url);
      
      return {
        videoId: info.videoDetails.videoId,
        title: info.videoDetails.title,
        duration: parseInt(info.videoDetails.lengthSeconds) || 0,
        author: info.videoDetails.author.name,
        description: info.videoDetails.description || '',
        thumbnail: (info.videoDetails.thumbnails[0]?.url) || '',
        publishedAt: info.videoDetails.publishDate || '',
      };
    } catch (error) {
      console.error('Error getting YouTube video info:', error);
      throw new Error('Failed to get YouTube video info');
    }
  }

  async downloadVideo(
    url: string,
    quality: string = 'highest',
    sessionId: string = Date.now().toString()
  ): Promise<string> {
    try {
      const info = await ytdl.getInfo(url);
      const videoId = info.videoDetails.videoId;
      const sanitizedTitle = this.sanitizeFileName(info.videoDetails.title);
      const fileName = `${sessionId}-${videoId}-${sanitizedTitle}.mp4`;
      const outputPath = path.join(this.tempDir, fileName);

      return new Promise((resolve, reject) => {
        const stream = ytdl(url, { quality });
        const writeStream = require('fs').createWriteStream(outputPath);

        stream.pipe(writeStream);

        writeStream.on('finish', () => {
          console.log(`YouTube video downloaded: ${outputPath}`);
          resolve(outputPath);
        });

        writeStream.on('error', (error: Error) => {
          console.error('Error writing YouTube video:', error);
          reject(error);
        });

        stream.on('error', (error: Error) => {
          console.error('Error streaming YouTube video:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error downloading YouTube video:', error);
      throw error;
    }
  }

  async downloadAndChunk(
    url: string,
    chunkDuration: number = 5,
    sessionId: string = Date.now().toString()
  ): Promise<{ videoInfo: YouTubeVideoInfo; chunks: any[] }> {
    try {
      const videoInfo = await this.getVideoInfo(url);
      const videoPath = await this.downloadVideo(url, 'highest', sessionId);
      const chunks = await videoProcessingService.chunkVideo(videoPath, chunkDuration, sessionId);

      return {
        videoInfo,
        chunks,
      };
    } catch (error) {
      console.error('Error downloading and chunking YouTube video:', error);
      throw error;
    }
  }

  async getAudioOnly(url: string, sessionId: string = Date.now().toString()): Promise<string> {
    try {
      const info = await ytdl.getInfo(url);
      const videoId = info.videoDetails.videoId;
      const sanitizedTitle = this.sanitizeFileName(info.videoDetails.title);
      const fileName = `${sessionId}-${videoId}-${sanitizedTitle}.mp3`;
      const outputPath = path.join(this.tempDir, fileName);

      return new Promise((resolve, reject) => {
        const stream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
        const writeStream = require('fs').createWriteStream(outputPath);

        stream.pipe(writeStream);

        writeStream.on('finish', () => {
          console.log(`YouTube audio downloaded: ${outputPath}`);
          resolve(outputPath);
        });

        writeStream.on('error', (error: Error) => {
          console.error('Error writing YouTube audio:', error);
          reject(error);
        });

        stream.on('error', (error: Error) => {
          console.error('Error streaming YouTube audio:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error downloading YouTube audio:', error);
      throw error;
    }
  }

  async getVideoFormats(url: string): Promise<ytdl.videoFormat[]> {
    try {
      const info = await ytdl.getInfo(url);
      return info.formats;
    } catch (error) {
      console.error('Error getting YouTube video formats:', error);
      throw error;
    }
  }

  async getBestQuality(url: string): Promise<ytdl.videoFormat | null> {
    try {
      const formats = await this.getVideoFormats(url);
      return ytdl.chooseFormat(formats, { quality: 'highest' });
    } catch (error) {
      console.error('Error getting best quality format:', error);
      return null;
    }
  }

  async isVideoAvailable(url: string): Promise<boolean> {
    try {
      await ytdl.getInfo(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getVideoThumbnail(url: string): Promise<string> {
    try {
      const info = await ytdl.getInfo(url);
      return info.videoDetails.thumbnails[0]?.url || '';
    } catch (error) {
      console.error('Error getting YouTube video thumbnail:', error);
      return '';
    }
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, 50); // Limit length
  }

  async cleanupTempFiles(sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        // Clean up specific session files
        const files = await fs.readdir(this.tempDir);
        
        for (const file of files) {
          if (file.includes(sessionId)) {
            await fs.unlink(path.join(this.tempDir, file));
          }
        }
      } else {
        // Clean up all temp files older than 2 hours
        const files = await fs.readdir(this.tempDir);
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < twoHoursAgo) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up YouTube temp files:', error);
    }
  }
}

export const youtubeService = new YouTubeService();
