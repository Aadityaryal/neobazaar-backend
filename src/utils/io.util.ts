import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { recordWebsocketDisconnect } from "../services/observability.service";

let ioInstance: SocketIOServer | null = null;

export function initIO(server: HttpServer): SocketIOServer {
    ioInstance = new SocketIOServer(server, {
        cors: {
            origin: ["http://localhost:3000", "http://localhost:3003", "http://localhost:3005"],
            credentials: true,
        },
    });

    ioInstance.on("connection", (socket) => {
        socket.on("disconnect", () => {
            recordWebsocketDisconnect();
        });
    });

    return ioInstance;
}

export function getIO(): SocketIOServer | null {
    return ioInstance;
}
