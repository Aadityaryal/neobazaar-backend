import { connectDatabase } from './database/mongodb';
import { PORT } from './config';
import app from './app';
import http from "http";
import { initIO } from "./utils/io.util";
import { startAuctionSettlementCron } from "./services/auction-cron.service";
import { startReputationRecomputeCron } from "./services/reputation-recompute.service";

async function startServer() {
    await connectDatabase();

    const server = http.createServer(app);
    initIO(server);
    startAuctionSettlementCron();
    startReputationRecomputeCron();

    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Server: http://0.0.0.0:${PORT}`);
    });
}

startServer();