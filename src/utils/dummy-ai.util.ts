export interface DummyAIResult {
    aiSuggestedPrice: number;
    aiCondition: string;
    aiVerified: true;
}

export function getDummyAIForCategory(categoryInput: string): DummyAIResult {
    const category = categoryInput.trim().toLowerCase();

    if (category === "phone") {
        return { aiSuggestedPrice: 28500, aiCondition: "Excellent", aiVerified: true };
    }

    if (category === "laptop") {
        return { aiSuggestedPrice: 55000, aiCondition: "Good", aiVerified: true };
    }

    if (category === "furniture") {
        return { aiSuggestedPrice: 12000, aiCondition: "Fair", aiVerified: true };
    }

    if (category === "clothing") {
        return { aiSuggestedPrice: 1500, aiCondition: "Good", aiVerified: true };
    }

    if (category.startsWith("electronics") || category === "electronics") {
        return { aiSuggestedPrice: 27000, aiCondition: "Good", aiVerified: true };
    }

    return { aiSuggestedPrice: 10000, aiCondition: "Fair", aiVerified: true };
}
