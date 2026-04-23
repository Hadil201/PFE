import app from "./app";
import { createServer } from "http";
import { Server } from "socket.io";
import { initRealtime } from "./controllers/video.controller";

const PORT = 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    },
});

initRealtime(io);

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});