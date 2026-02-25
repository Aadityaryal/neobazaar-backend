import mongoose from "mongoose";
import { UserModel } from "../models/user.model";

const BADGE_RULES = {
    firstTrade: "First Trade",
    trustworthy: "Trustworthy",
    questMaster: "Quest Master",
};

async function findUser(userId: string, session?: mongoose.ClientSession) {
    const query = UserModel.findOne({ userId });
    if (session) {
        query.session(session);
    }
    return query;
}

export async function applyTransactionProgress(userId: string, session?: mongoose.ClientSession): Promise<void> {
    const user = await findUser(userId, session);
    if (!user) {
        return;
    }

    user.completedTransactions += 1;
    user.reputationScore += 5;

    if (user.completedTransactions >= 1 && !user.badges.includes(BADGE_RULES.firstTrade)) {
        user.badges.push(BADGE_RULES.firstTrade);
    }
    if (user.completedTransactions >= 5 && !user.badges.includes(BADGE_RULES.trustworthy)) {
        user.badges.push(BADGE_RULES.trustworthy);
    }

    await user.save(session ? { session } : undefined);
}

export async function applyQuestProgress(userId: string, session?: mongoose.ClientSession): Promise<void> {
    const user = await findUser(userId, session);
    if (!user) {
        return;
    }

    user.completedQuests += 1;
    user.reputationScore += 2;

    if (user.completedQuests >= 10 && !user.badges.includes(BADGE_RULES.questMaster)) {
        user.badges.push(BADGE_RULES.questMaster);
    }

    await user.save(session ? { session } : undefined);
}
