import { getIO } from "../utils/io.util";
import { SocketEventName } from "../core/socket-events";

interface RealtimeEventRecord {
    eventId: string;
    eventName: SocketEventName;
    payload: unknown;
    emittedAt: Date;
}

const MAX_REPLAY_EVENTS = 300;
const replayBuffer: RealtimeEventRecord[] = [];

export function emitRealtimeEvent(eventName: SocketEventName, payload: unknown) {
    const record: RealtimeEventRecord = {
        eventId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        eventName,
        payload,
        emittedAt: new Date(),
    };

    replayBuffer.push(record);
    if (replayBuffer.length > MAX_REPLAY_EVENTS) {
        replayBuffer.shift();
    }

    const io = getIO();
    io?.emit(eventName, payload);
}

export function getRealtimeReplay(since?: Date, limit = 100) {
    const boundedLimit = Math.min(Math.max(limit, 1), 500);
    const filtered = since
        ? replayBuffer.filter((item) => item.emittedAt.getTime() > since.getTime())
        : replayBuffer;

    return filtered.slice(-boundedLimit);
}
