import { connectDatabase } from "../mongodb";
import { CampaignModel } from "../../models/campaign.model";
import { DisputeModel } from "../../models/dispute.model";
import { IdempotencyKeyModel } from "../../models/idempotency-key.model";
import { NotificationModel } from "../../models/notification.model";
import { OfferModel } from "../../models/offer.model";
import { OrderModel } from "../../models/order.model";
import { ReferralModel } from "../../models/referral.model";
import { ReviewModel } from "../../models/review.model";

async function runMigration() {
    await connectDatabase();

    await Promise.all([
        OrderModel.createCollection(),
        OfferModel.createCollection(),
        DisputeModel.createCollection(),
        ReviewModel.createCollection(),
        NotificationModel.createCollection(),
        ReferralModel.createCollection(),
        CampaignModel.createCollection(),
        IdempotencyKeyModel.createCollection(),
    ]);

    await Promise.all([
        OrderModel.syncIndexes(),
        OfferModel.syncIndexes(),
        DisputeModel.syncIndexes(),
        ReviewModel.syncIndexes(),
        NotificationModel.syncIndexes(),
        ReferralModel.syncIndexes(),
        CampaignModel.syncIndexes(),
        IdempotencyKeyModel.syncIndexes(),
    ]);

    console.log("Phase A migration applied: entity collections + indexes created.");
    process.exit(0);
}

runMigration().catch((error) => {
    console.error("Phase A migration failed", error);
    process.exit(1);
});
