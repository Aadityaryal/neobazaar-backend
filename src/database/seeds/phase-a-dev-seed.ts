import { connectDatabase } from "../mongodb";
import { CampaignModel } from "../../models/campaign.model";
import { NotificationModel } from "../../models/notification.model";
import { OfferModel } from "../../models/offer.model";
import { ReferralModel } from "../../models/referral.model";
import { ProductModel, type ProductMode } from "../../models/product.model";
import { UserModel } from "../../models/user.model";
import bcrypt from "bcryptjs";

type SeedProduct = {
    productId: string;
    sellerId: string;
    title: string;
    description: string;
    category: string;
    images: string[];
    priceListed: number;
    aiSuggestedPrice: number;
    aiCondition: string;
    aiVerified: boolean;
    aiConfidence: number;
    imageHash: string;
    mode: ProductMode;
    flagged: boolean;
    location: string;
};

type SeedUser = {
    userId: string;
    name: string;
    email: string;
    role?: "user" | "admin";
    location: string;
    neoTokens?: number;
    xp?: number;
    reputationScore?: number;
    completedTransactions?: number;
    completedQuests?: number;
};

const imageUrls = [
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-01.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-02.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-03.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-04.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-05.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-06.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-07.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-08.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-09.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-10.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-11.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-12.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-13.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-14.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-15.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-16.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-17.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-18.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-19.svg`,
    `${process.env.SEED_IMAGE_BASE_URL || "http://localhost:5050/static/seed-products"}/product-20.svg`,
];

const seedProducts: SeedProduct[] = [
    { productId: "seed-product-1", sellerId: "seed-seller-1", title: "MacBook Pro M2 13-inch", description: "Well-kept MacBook with charger and protective sleeve.", category: "Electronics", images: [imageUrls[0]], priceListed: 135000, aiSuggestedPrice: 132000, aiCondition: "excellent", aiVerified: true, aiConfidence: 0.96, imageHash: "seed-image-hash-1", mode: "buy_now", flagged: false, location: "Kathmandu" },
    { productId: "seed-product-2", sellerId: "seed-seller-2", title: "Gaming Laptop RTX 3060", description: "High FPS setup for esports and content creation.", category: "Electronics", images: [imageUrls[1]], priceListed: 122000, aiSuggestedPrice: 118000, aiCondition: "good", aiVerified: true, aiConfidence: 0.93, imageHash: "seed-image-hash-2", mode: "auction", flagged: false, location: "Pokhara" },
    { productId: "seed-product-3", sellerId: "seed-seller-3", title: "Canon M50 Camera Kit", description: "Mirrorless camera with 15-45mm lens and bag.", category: "Photography", images: [imageUrls[2]], priceListed: 68000, aiSuggestedPrice: 65500, aiCondition: "good", aiVerified: true, aiConfidence: 0.94, imageHash: "seed-image-hash-3", mode: "buy_now", flagged: false, location: "Lalitpur" },
    { productId: "seed-product-4", sellerId: "seed-seller-1", title: "PS5 Digital Edition", description: "Console with one controller and cooling stand.", category: "Gaming", images: [imageUrls[3]], priceListed: 72000, aiSuggestedPrice: 70000, aiCondition: "excellent", aiVerified: true, aiConfidence: 0.95, imageHash: "seed-image-hash-4", mode: "buy_now", flagged: false, location: "Bhaktapur" },
    { productId: "seed-product-5", sellerId: "seed-seller-4", title: "Mountain Bike 27.5", description: "Aluminum frame, hydraulic brakes, recently serviced.", category: "Sports", images: [imageUrls[4]], priceListed: 36000, aiSuggestedPrice: 34500, aiCondition: "good", aiVerified: true, aiConfidence: 0.9, imageHash: "seed-image-hash-5", mode: "auction", flagged: false, location: "Chitwan" },
    { productId: "seed-product-6", sellerId: "seed-seller-2", title: "Ergonomic Office Chair", description: "Mesh back, adjustable lumbar and arm support.", category: "Furniture", images: [imageUrls[5]], priceListed: 14500, aiSuggestedPrice: 13800, aiCondition: "good", aiVerified: true, aiConfidence: 0.89, imageHash: "seed-image-hash-6", mode: "buy_now", flagged: false, location: "Kathmandu" },
    { productId: "seed-product-7", sellerId: "seed-seller-5", title: "Mechanical Keyboard RGB", description: "Hot-swappable switches with custom keycaps.", category: "Accessories", images: [imageUrls[6]], priceListed: 8500, aiSuggestedPrice: 7900, aiCondition: "excellent", aiVerified: true, aiConfidence: 0.97, imageHash: "seed-image-hash-7", mode: "buy_now", flagged: false, location: "Butwal" },
    { productId: "seed-product-8", sellerId: "seed-seller-3", title: "iPhone 13 128GB", description: "Battery health 89%, no repairs, boxed.", category: "Electronics", images: [imageUrls[7]], priceListed: 76000, aiSuggestedPrice: 74200, aiCondition: "good", aiVerified: true, aiConfidence: 0.92, imageHash: "seed-image-hash-8", mode: "auction", flagged: false, location: "Lalitpur" },
    { productId: "seed-product-9", sellerId: "seed-seller-1", title: "Study Desk Minimal", description: "Compact desk perfect for dorm and home office.", category: "Furniture", images: [imageUrls[8]], priceListed: 9800, aiSuggestedPrice: 9100, aiCondition: "fair", aiVerified: true, aiConfidence: 0.88, imageHash: "seed-image-hash-9", mode: "buy_now", flagged: false, location: "Kathmandu" },
    { productId: "seed-product-10", sellerId: "seed-seller-4", title: "Acoustic Guitar Yamaha", description: "Solid beginner/intermediate guitar with soft case.", category: "Music", images: [imageUrls[9]], priceListed: 17500, aiSuggestedPrice: 16900, aiCondition: "good", aiVerified: true, aiConfidence: 0.9, imageHash: "seed-image-hash-10", mode: "buy_now", flagged: false, location: "Dharan" },
    { productId: "seed-product-11", sellerId: "seed-seller-5", title: "Arduino Starter Bundle", description: "Full electronics starter kit with sensors and guide.", category: "Education", images: [imageUrls[10]], priceListed: 6200, aiSuggestedPrice: 5900, aiCondition: "excellent", aiVerified: true, aiConfidence: 0.94, imageHash: "seed-image-hash-11", mode: "donate", flagged: false, location: "Pokhara" },
    { productId: "seed-product-12", sellerId: "seed-seller-2", title: "Samsung 27in Curved Monitor", description: "1080p 144Hz monitor for gaming and productivity.", category: "Electronics", images: [imageUrls[11]], priceListed: 28000, aiSuggestedPrice: 27200, aiCondition: "good", aiVerified: true, aiConfidence: 0.91, imageHash: "seed-image-hash-12", mode: "buy_now", flagged: false, location: "Biratnagar" },
    { productId: "seed-product-13", sellerId: "seed-seller-3", title: "Fitness Dumbbell Set", description: "Adjustable home gym dumbbells with rack.", category: "Sports", images: [imageUrls[12]], priceListed: 15000, aiSuggestedPrice: 14300, aiCondition: "good", aiVerified: true, aiConfidence: 0.9, imageHash: "seed-image-hash-13", mode: "buy_now", flagged: false, location: "Hetauda" },
    { productId: "seed-product-14", sellerId: "seed-seller-4", title: "Air Fryer 4L", description: "Healthy cooking air fryer, lightly used.", category: "Home Appliances", images: [imageUrls[13]], priceListed: 8900, aiSuggestedPrice: 8400, aiCondition: "excellent", aiVerified: true, aiConfidence: 0.95, imageHash: "seed-image-hash-14", mode: "auction", flagged: false, location: "Kathmandu" },
    { productId: "seed-product-15", sellerId: "seed-seller-5", title: "Winter Jacket North Face", description: "Warm insulated jacket, size M, clean condition.", category: "Fashion", images: [imageUrls[14]], priceListed: 6400, aiSuggestedPrice: 6100, aiCondition: "good", aiVerified: true, aiConfidence: 0.89, imageHash: "seed-image-hash-15", mode: "buy_now", flagged: false, location: "Lalitpur" },
    { productId: "seed-product-16", sellerId: "seed-seller-1", title: "Road Bicycle Helmet", description: "Certified lightweight helmet for daily rides.", category: "Sports", images: [imageUrls[15]], priceListed: 3200, aiSuggestedPrice: 3000, aiCondition: "excellent", aiVerified: true, aiConfidence: 0.93, imageHash: "seed-image-hash-16", mode: "donate", flagged: false, location: "Pokhara" },
    { productId: "seed-product-17", sellerId: "seed-seller-2", title: "External SSD 1TB", description: "USB-C NVMe external drive with high transfer speed.", category: "Accessories", images: [imageUrls[16]], priceListed: 11800, aiSuggestedPrice: 11200, aiCondition: "excellent", aiVerified: true, aiConfidence: 0.96, imageHash: "seed-image-hash-17", mode: "buy_now", flagged: false, location: "Kathmandu" },
    { productId: "seed-product-18", sellerId: "seed-seller-3", title: "Coffee Grinder Burr", description: "Manual burr grinder for consistent brew quality.", category: "Kitchen", images: [imageUrls[17]], priceListed: 2900, aiSuggestedPrice: 2700, aiCondition: "good", aiVerified: true, aiConfidence: 0.88, imageHash: "seed-image-hash-18", mode: "buy_now", flagged: false, location: "Bhaktapur" },
    { productId: "seed-product-19", sellerId: "seed-seller-4", title: "Study Lamp LED", description: "Adjustable warm/cool light desk lamp.", category: "Home Decor", images: [imageUrls[18]], priceListed: 1800, aiSuggestedPrice: 1650, aiCondition: "good", aiVerified: true, aiConfidence: 0.9, imageHash: "seed-image-hash-19", mode: "donate", flagged: false, location: "Chitwan" },
    { productId: "seed-product-20", sellerId: "seed-seller-5", title: "Wireless Earbuds Pro", description: "Noise-canceling earbuds with charging case.", category: "Electronics", images: [imageUrls[19]], priceListed: 7200, aiSuggestedPrice: 6900, aiCondition: "excellent", aiVerified: true, aiConfidence: 0.94, imageHash: "seed-image-hash-20", mode: "auction", flagged: false, location: "Birgunj" },
];

const seedUsers: SeedUser[] = [
    { userId: "seed-seller-1", name: "Seed Seller 1", email: "seed-seller-1@neobazaar.local", location: "Kathmandu", neoTokens: 1500, reputationScore: 72, completedTransactions: 9 },
    { userId: "seed-seller-2", name: "Seed Seller 2", email: "seed-seller-2@neobazaar.local", location: "Pokhara", neoTokens: 1400, reputationScore: 68, completedTransactions: 7 },
    { userId: "seed-seller-3", name: "Seed Seller 3", email: "seed-seller-3@neobazaar.local", location: "Lalitpur", neoTokens: 1300, reputationScore: 64, completedTransactions: 6 },
    { userId: "seed-seller-4", name: "Seed Seller 4", email: "seed-seller-4@neobazaar.local", location: "Chitwan", neoTokens: 1200, reputationScore: 61, completedTransactions: 5 },
    { userId: "seed-seller-5", name: "Seed Seller 5", email: "seed-seller-5@neobazaar.local", location: "Birgunj", neoTokens: 1100, reputationScore: 58, completedTransactions: 4 },
    { userId: "seed-buyer-1", name: "Seed Buyer 1", email: "seed-buyer-1@neobazaar.local", location: "Kathmandu", neoTokens: 2000, reputationScore: 55, completedTransactions: 3 },
    { userId: "seed-user-1", name: "Seed User 1", email: "seed-user-1@neobazaar.local", location: "Bhaktapur", neoTokens: 800, reputationScore: 40, completedTransactions: 1 },
    { userId: "seed-user-2", name: "Seed User 2", email: "seed-user-2@neobazaar.local", location: "Hetauda", neoTokens: 800, reputationScore: 39, completedTransactions: 1 },
];

async function seedPhaseA() {
    await connectDatabase();

    const passwordHash = await bcrypt.hash("Pass12345", 10);

    await Promise.all(
        seedUsers.map((user) =>
            UserModel.updateOne(
                { userId: user.userId },
                {
                    $set: {
                        userId: user.userId,
                        name: user.name,
                        email: user.email,
                        role: user.role ?? "user",
                        emailVerified: true,
                        location: user.location,
                        passwordHash,
                        neoTokens: user.neoTokens ?? 500,
                        xp: user.xp ?? 0,
                        reputationScore: user.reputationScore ?? 0,
                        kycVerified: false,
                        kycStatus: "draft",
                        badges: [],
                        completedTransactions: user.completedTransactions ?? 0,
                        completedQuests: user.completedQuests ?? 0,
                    },
                },
                { upsert: true }
            )
        )
    );

    await Promise.all(
        seedProducts.map((product) =>
            ProductModel.updateOne({ productId: product.productId }, { $set: product }, { upsert: true })
        )
    );

    await Promise.all([
        OfferModel.updateOne(
            { offerId: "seed-offer-1" },
            {
                $set: {
                    offerId: "seed-offer-1",
                    productId: "seed-product-1",
                    buyerId: "seed-buyer-1",
                    sellerId: "seed-seller-1",
                    amount: 220,
                    status: "pending",
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
                },
            },
            { upsert: true }
        ),
        NotificationModel.updateOne(
            { notificationId: "seed-notification-1" },
            {
                $set: {
                    notificationId: "seed-notification-1",
                    userId: "seed-buyer-1",
                    type: "order_update",
                    title: "Order moved to escrow",
                    body: "Your payment is now in escrow.",
                    route: "/buyer/orders/seed-order-1",
                },
            },
            { upsert: true }
        ),
        ReferralModel.updateOne(
            { referralId: "seed-referral-1" },
            {
                $set: {
                    referralId: "seed-referral-1",
                    referrerUserId: "seed-user-1",
                    referredUserId: "seed-user-2",
                    code: "NEO-SEED-REF",
                    status: "qualified",
                },
            },
            { upsert: true }
        ),
        CampaignModel.updateOne(
            { campaignId: "seed-campaign-1" },
            {
                $set: {
                    campaignId: "seed-campaign-1",
                    ownerUserId: "seed-seller-1",
                    title: "Local Flash Deals",
                    description: "Seed campaign for integration tests",
                    status: "active",
                    startsAt: new Date(Date.now() - 1000 * 60 * 60),
                    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                    budgetTokens: 5000,
                    spendTokens: 1200,
                },
            },
            { upsert: true }
        ),
    ]);

    console.log(`Phase A dev/test seed complete with ${seedUsers.length} users and ${seedProducts.length} products.`);
    process.exit(0);
}

seedPhaseA().catch((error) => {
    console.error("Phase A seed failed", error);
    process.exit(1);
});
