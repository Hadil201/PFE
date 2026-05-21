import { Request, Response } from 'express';
import { ffmpegService } from '../services/ffmpeg.service';
import { googleDriveService } from '../services/googleDrive.service';
import { aiService } from '../services/ai.service';
import fs from 'fs';
import path from 'path';

export class InferenceController {
    async startAnalysis(req: Request, res: Response) {
        const { url, duration, userId } = req.body;

        if (!url || !duration || !userId) {
            return res.status(400).json({ success: false, message: "Missing required fields: url, duration, userId" });
        }

        // Return early to the client as recording might take time
        // The results will be sent via WebSockets
        res.status(200).json({ success: true, message: "Analysis started" });

        try {
            // 5. Le serveur utilise FFmpeg pour enregistrer le morceau.
            const { videoId, source } = req.body;
            const videoPath = await ffmpegService.recordStream(
                url, 
                duration, 
                userId, 
                videoId || 'unknown', 
                source || 'uploads', 
                1
            );

            // 6. Une fois le morceau prêt, le serveur télécharge le morceau sur Google Drive de l’utilisateur.
            const fileStream = fs.createReadStream(videoPath);
            const fileName = path.basename(videoPath);
            
            try {
                await googleDriveService.uploadFile(fileName, 'video/mp4', fileStream);
                console.log(`Uploaded ${fileName} to Google Drive`);
            } catch (uploadError) {
                console.error('Failed to upload to Google Drive, continuing with analysis anyway:', uploadError);
            }

            // 7. Le serveur lance l’inférence / l’analyse du morceau prêt
            await aiService.analyzeSegment(videoPath, userId, duration);

            // Optional: cleanup temp file
            // fs.unlinkSync(videoPath);
            
        } catch (error) {
            console.error('Error in startAnalysis flow:', error);
            // We could notify the user via WebSocket about the error
        }
    }
}

export const inferenceController = new InferenceController();
