import { spot, summarize } from '../utils/inference';
import { User } from '../models/User';
import { socketService } from './socket.service';

export class AiService {
    async analyzeSegment(
        videoPath: string, 
        userId: string, 
        videoId: string, 
        duration: number = 5,
        inferenceType: 'action-spotting' | 'summarization' = 'action-spotting'
    ) {
        try {
            let result;
            if (inferenceType === 'summarization') {
                result = summarize(videoPath);
                if (result.success) {
                    socketService.broadcast('inference:summary', { videoId, summary: (result.data as any).summary });
                }
            } else {
                result = spot(videoPath, duration);
                if (result.success && (result.data as any).detectedActions.length > 0) {
                    for (const event of (result.data as any).detectedActions) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        socketService.broadcast('inference:event', { videoId, event });
                        socketService.broadcast('inference:playhead', { videoId, position: event.end });
                    }
                }
            }

            socketService.broadcast('inference:completed', {
                videoId,
                events: (result.data as any).detectedActions || [],
                summary: (result.data as any).summary || ""
            });

            await this.updateUserQuota(userId);

            return result;
        } catch (error) {
            console.error('Error in AI analysis:', error);
            throw error;
        }
    }

    private async updateUserQuota(userId: string) {
        try {
            const user = await User.findById(userId);
            if (user) {
                user.quota.dailyUsed += 1;
                user.quota.weeklyUsed += 1;
                user.quota.monthlyUsed += 1;
                await user.save();

                // 10- et on la met a jour au niveau de BD pour qu'on puisse la visualisation au niveau du client
                socketService.sendToUser(userId, 'quota_update', user.quota);
            }
        } catch (error) {
            console.error('Error updating user quota:', error);
        }
    }
}

export const aiService = new AiService();
