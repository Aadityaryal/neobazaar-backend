import express, { Application, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { sendError, sendSuccess } from './core/api-response';
import authRoutes from "./routes/mvp-auth.route";
import productRoutes from "./routes/product.route";
import transactionRoutes from "./routes/transaction.route";
import bidRoutes from "./routes/bid.route";
import chatRoutes from "./routes/chat.route";
import userRoutes from "./routes/user.route";
import questRoutes from "./routes/quest.route";
import leaderboardRoutes from "./routes/leaderboard.route";
import adminRoutes from "./routes/admin.route";
import extensionRoutes from "./routes/extension.route";
import walletRoutes from "./routes/wallet.route";
import offerRoutes from "./routes/offer.route";
import orderRoutes from "./routes/order.route";
import reviewRoutes from "./routes/review.route";
import campaignRoutes from "./routes/campaign.route";
import sellerRoutes from "./routes/seller.route";
import notificationRoutes from "./routes/notification.route";
import referralRoutes from "./routes/referral.route";
import riskRoutes from "./routes/risk.route";
import { requestContextMiddleware } from './middleware/request-context.middleware';
import { responseEnvelopeMiddleware } from './middleware/response-envelope.middleware';
import { getErrorBudgetSnapshot } from './services/observability.service';

const app: Application = express();

const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:3005'],
    optionsSuccessStatus: 200,
    credentials: true,
};
app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(requestContextMiddleware);
app.use(responseEnvelopeMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api', extensionRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/bids', bidRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/quests', questRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/risk', riskRoutes);
app.use('/api/v1', extensionRoutes);

app.get('/', (req: Request, res: Response) => {
    return sendSuccess(res, 200, "Welcome to the API", { version: "v1" }, { path: req.originalUrl });
});

app.get('/api/ops/error-budget', (req: Request, res: Response) => {
    return sendSuccess(res, 200, 'Error budget snapshot', getErrorBudgetSnapshot(), {
        path: req.originalUrl,
    });
});

app.get('/api/v1/ops/error-budget', (req: Request, res: Response) => {
    return sendSuccess(res, 200, 'Error budget snapshot', getErrorBudgetSnapshot(), {
        path: req.originalUrl,
    });
});

app.use((req: Request, res: Response) => {
    return sendError(res, 404, "Route not found", [
        { code: "NOT_FOUND", detail: `${req.method} ${req.originalUrl}` },
    ]);
});

app.use((error: Error, req: Request, res: Response, _next: unknown) => {
    console.error(
        JSON.stringify({
            requestId: req.requestId,
            path: req.originalUrl,
            message: error.message,
        })
    );

    return sendError(res, 500, "Internal server error", [
        { code: "INTERNAL_SERVER_ERROR", detail: error.message },
    ]);
});

export default app;