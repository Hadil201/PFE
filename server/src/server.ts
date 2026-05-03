import "dotenv/config";
import app from "./app";
import { createServer } from "http";
import { Server } from "socket.io";
import { createInferenceSocketHandler } from "./sockets/inference.socket";

const PORT = Number(process.env.PORT ?? 5000);
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    },
});

// Initialize inference socket handler
const inferenceHandler = createInferenceSocketHandler(io);

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

httpServer.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
        console.error(
            `Port ${PORT} is already in use. Stop the other server or set a different PORT in server/.env.`
        );
        process.exit(1);
    }
    throw error;
});