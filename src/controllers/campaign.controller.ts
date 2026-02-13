import { Response } from "express";
import { randomUUID } from "crypto";
import { CampaignModel } from "../models/campaign.model";
import { AuthenticatedRequest } from "../types/auth.type";

export class CampaignController {
    async createCampaign(req: AuthenticatedRequest, res: Response) {
        const ownerUserId = req.auth?.userId;
        if (!ownerUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            title: string;
            description?: string;
            startsAt: Date;
            endsAt: Date;
            budgetTokens: number;
        };

        const campaign = await CampaignModel.create({
            campaignId: randomUUID(),
            ownerUserId,
            title: input.title,
            description: input.description,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            budgetTokens: input.budgetTokens,
            spendTokens: 0,
            status: "draft",
        });

        return res.status(201).json({ success: true, data: campaign });
    }

    async listCampaigns(req: AuthenticatedRequest, res: Response) {
        const ownerUserId = req.auth?.userId;
        if (!ownerUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const campaigns = await CampaignModel.find({ ownerUserId }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: campaigns });
    }

    async updateCampaignStatus(req: AuthenticatedRequest, res: Response) {
        const ownerUserId = req.auth?.userId;
        if (!ownerUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as { status: "draft" | "active" | "paused" | "ended" };
        const campaign = await CampaignModel.findOne({ campaignId: req.params.campaignId });
        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }
        if (campaign.ownerUserId !== ownerUserId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        campaign.status = input.status;
        await campaign.save();

        return res.status(200).json({ success: true, data: campaign });
    }
}
