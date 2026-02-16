type UserLike = {
    name?: string;
    emailVerified?: boolean;
    location?: string;
    kycStatus?: "draft" | "submitted" | "verified" | "rejected";
};

export function computeProfileCompletenessScore(user: UserLike): number {
    const checks = [
        Boolean(user.name?.trim()),
        Boolean(user.emailVerified),
        Boolean(user.location?.trim()),
        user.kycStatus === "verified",
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
}

export function toPublicUser(user: any) {
    const { passwordHash, _id, __v, ...rest } = user;
    return {
        ...rest,
        profileCompletenessScore: computeProfileCompletenessScore(rest),
    };
}
