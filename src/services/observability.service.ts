interface HttpMetric {
    status: number;
    durationMs: number;
    at: number;
}

const WINDOW_MS = 1000 * 60 * 15;
const httpMetrics: HttpMetric[] = [];
let websocketDisconnects = 0;

export function recordHttpMetric(status: number, durationMs: number) {
    const now = Date.now();
    httpMetrics.push({ status, durationMs, at: now });
    trim(now);
}

export function recordWebsocketDisconnect() {
    websocketDisconnects += 1;
}

function trim(now: number) {
    while (httpMetrics.length > 0 && now - httpMetrics[0].at > WINDOW_MS) {
        httpMetrics.shift();
    }
}

export function getErrorBudgetSnapshot() {
    const now = Date.now();
    trim(now);

    const total = httpMetrics.length;
    const total5xx = httpMetrics.filter((item) => item.status >= 500).length;
    const durations = httpMetrics.map((item) => item.durationMs).sort((a, b) => a - b);
    const p95Index = durations.length === 0 ? 0 : Math.floor(durations.length * 0.95) - 1;
    const p95LatencyMs = durations.length === 0 ? 0 : durations[Math.max(p95Index, 0)];

    return {
        windowMinutes: WINDOW_MS / (1000 * 60),
        requests: total,
        fiveXxCount: total5xx,
        fiveXxRate: total > 0 ? total5xx / total : 0,
        p95LatencyMs,
        websocketDisconnects,
        generatedAt: new Date(now).toISOString(),
    };
}
