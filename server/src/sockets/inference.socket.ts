import { Server, Socket } from 'socket.io';
import { mlInferenceService } from '../services/mlInference.service';
import { youtubeService } from '../services/youtube.service';
import { videoProcessingService } from '../services/videoProcessing.service';
import { googleDriveService } from '../services/googleDrive.service';

export interface InferenceSession {
  id: string;
  videoId: string;
  userId: string;
  type: 'action-spotting' | 'summarization';
  modelName: string;
  selectedClasses?: string[];
  chunkDuration: number;
  confidenceThreshold: number;
  status: 'starting' | 'processing' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  events: any[];
  summary?: string | undefined;
  error?: string | undefined;
}

export class InferenceSocketHandler {
  private sessions: Map<string, InferenceSession> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join inference session
      socket.on('inference:join', (sessionId: string) => {
        socket.join(`session:${sessionId}`);
        console.log(`Client ${socket.id} joined session: ${sessionId}`);
      });

      // Leave inference session
      socket.on('inference:leave', (sessionId: string) => {
        socket.leave(`session:${sessionId}`);
        console.log(`Client ${socket.id} left session: ${sessionId}`);
      });

      // Start inference
      socket.on('inference:start', async (data) => {
        try {
          await this.handleInferenceStart(socket, data);
        } catch (error) {
          console.error('Error starting inference:', error);
          socket.emit('inference:error', {
            sessionId: data.sessionId,
            error: 'Failed to start inference',
          });
        }
      });

      // Cancel inference
      socket.on('inference:cancel', async (data) => {
        try {
          await this.handleInferenceCancel(socket, data);
        } catch (error) {
          console.error('Error canceling inference:', error);
        }
      });

      // Get session status
      socket.on('inference:status', (data) => {
        const session = this.sessions.get(data.sessionId);
        if (session) {
          socket.emit('inference:status-update', session);
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private async handleInferenceStart(socket: Socket, data: any): Promise<void> {
    const {
      sessionId,
      videoId,
      videoUrl,
      videoSource,
      type,
      modelName,
      selectedClasses,
      chunkDuration = 5,
      confidenceThreshold = 0.7,
    } = data;

    // Create session
    const session: InferenceSession = {
      id: sessionId,
      videoId,
      userId: socket.id,
      type,
      modelName,
      selectedClasses,
      chunkDuration,
      confidenceThreshold,
      status: 'starting',
      startTime: new Date(),
      events: [],
    };

    this.sessions.set(sessionId, session);

    // Notify client that inference is starting
    this.io.to(`session:${sessionId}`).emit('inference:started', {
      sessionId,
      videoId,
      type,
      modelName,
      chunkDuration,
    });

    try {
      // Process video based on source
      let videoPath: string;

      if (videoSource === 'youtube') {
        const result = await youtubeService.downloadAndChunk(videoUrl, chunkDuration, sessionId);
        videoPath = result.chunks[0]?.filePath || '';
        // Store video metadata separately from events
        session.events = [];
      } else if (videoSource === 'upload') {
        // For uploaded videos, assume the videoUrl is the local path
        videoPath = videoUrl;
        const chunks = await videoProcessingService.chunkVideo(videoPath, chunkDuration, sessionId);
        session.events = chunks;
      } else {
        throw new Error(`Unsupported video source: ${videoSource}`);
      }

      session.status = 'processing';

      // Run inference based on type
      if (type === 'action-spotting') {
        const result = await mlInferenceService.runActionSpotting(videoPath, {
          modelType: 'action-spotting',
          modelName,
          selectedClasses,
          confidenceThreshold,
          chunkDuration,
        });

        session.events = result.events;
      } else if (type === 'summarization') {
        const result = await mlInferenceService.runSummarization(videoPath, {
          modelType: 'summarization',
          modelName,
          selectedClasses,
          confidenceThreshold,
          chunkDuration,
        });

        if (result.summary) {
          session.summary = result.summary;
        }
      }

      session.status = 'completed';
      session.endTime = new Date();

      // Send final results
      this.io.to(`session:${sessionId}`).emit('inference:completed', {
        sessionId,
        events: session.events,
        summary: session.summary,
        processingTime: session.endTime.getTime() - session.startTime.getTime(),
      });

    } catch (error) {
      console.error('Error during inference:', error);
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';

      this.io.to(`session:${sessionId}`).emit('inference:error', {
        sessionId,
        error: session.error,
      });
    }
  }

  private async handleInferenceCancel(socket: Socket, data: any): Promise<void> {
    const { sessionId } = data;
    const session = this.sessions.get(sessionId);

    if (session) {
      session.status = 'error';
      session.error = 'Canceled by user';
      session.endTime = new Date();

      // Clean up resources
      await this.cleanupSession(sessionId);

      this.io.to(`session:${sessionId}`).emit('inference:canceled', {
        sessionId,
      });
    }
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    try {
      // Clean up temporary files
      await videoProcessingService.cleanupTempFiles(sessionId);
      await youtubeService.cleanupTempFiles(sessionId);

      // Remove session from memory
      this.sessions.delete(sessionId);
    } catch (error) {
      console.error('Error cleaning up session:', error);
    }
  }

  public getSession(sessionId: string): InferenceSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getActiveSessions(): InferenceSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'starting' || session.status === 'processing'
    );
  }

  public broadcastProgress(sessionId: string, progress: number, message?: string): void {
    this.io.to(`session:${sessionId}`).emit('inference:progress', {
      sessionId,
      progress,
      message,
    });
  }

  public broadcastEvent(sessionId: string, event: any): void {
    this.io.to(`session:${sessionId}`).emit('inference:event', {
      sessionId,
      event,
    });
  }

  public broadcastPlayhead(sessionId: string, position: number): void {
    this.io.to(`session:${sessionId}`).emit('inference:playhead', {
      sessionId,
      position,
    });
  }
}

export const createInferenceSocketHandler = (io: Server): InferenceSocketHandler => {
  return new InferenceSocketHandler(io);
};
