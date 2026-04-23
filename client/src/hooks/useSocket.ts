import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function useSocket() {
    return socket;
}