import { spot } from '../utils/inference';
import { User } from '../models/User';
import { socketService } from './socket.service';

export class AiService {
    async analyzeSegment(videoPath: string, userId: string, videoId: string, duration: number = 5) {
        try {
            // 7. Le serveur lance l’inférence / l’analyse du morceau prêt
            const result = spot(videoPath, duration);
            console.log(result); // Debug log for inference result

            // 8. Une fois le résultat d’analyse est prêt le serveur l’envoie au client en utilisant le WebSocket.
            // Match frontend expectations
            if (result.success && result.data.detectedActions.length > 0) {
                for (const event of result.data.detectedActions) {
                    // Simulate progressive emission like the original controller
                    await new Promise(resolve => setTimeout(resolve, 500));
                    socketService.broadcast('inference:event', { videoId, event });
                    socketService.broadcast('inference:playhead', { videoId, position: event.end });
                }
            }

            socketService.broadcast('inference:completed', {
                videoId,
                events: result.data.detectedActions
            });

            // 10-lorsqu'on morceau est traité , on met a jour la quota quotidienne pour l'utilisateur
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
