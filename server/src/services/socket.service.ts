import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

export class SocketService {
    private io: SocketIOServer | null = null;
    private userSockets: Map<string, string[]> = new Map();

    initFromIo(io: SocketIOServer) {
        this.io = io;

        this.io.on('connection', (socket) => {
            const userId = socket.handshake.query.userId as string;
            if (userId) {
                const sockets = this.userSockets.get(userId) || [];
                sockets.push(socket.id);
                this.userSockets.set(userId, sockets);
                console.log(`User ${userId} connected with socket ${socket.id}`);

                socket.on('disconnect', () => {
                    const sockets = this.userSockets.get(userId) || [];
                    const index = sockets.indexOf(socket.id);
                    if (index > -1) {
                        sockets.splice(index, 1);
                    }
                    if (sockets.length === 0) {
                        this.userSockets.delete(userId);
                    } else {
                        this.userSockets.set(userId, sockets);
                    }
                    console.log(`User ${userId} disconnected from socket ${socket.id}`);
                });
            }
        });
    }

    sendToUser(userId: string, event: string, data: any) {
        const sockets = this.userSockets.get(userId);
        if (sockets && this.io) {
            sockets.forEach(socketId => {
                this.io?.to(socketId).emit(event, data);
            });
        }
    }

    broadcast(event: string, data: any) {
        this.io?.emit(event, data);
    }
}

export const socketService = new SocketService();
