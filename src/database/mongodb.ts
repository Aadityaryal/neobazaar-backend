import mongoose from "mongoose";
import {
    MONGODB_CONNECT_TIMEOUT_MS,
    MONGODB_DNS_FAMILY,
    MONGODB_FORCE_TLS,
    MONGODB_MAX_POOL_SIZE,
    MONGODB_MIN_POOL_SIZE,
    MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    MONGODB_SOCKET_TIMEOUT_MS,
    MONGODB_TLS_ALLOW_INVALID_CERTIFICATES,
    MONGODB_TLS_ALLOW_INVALID_HOSTNAMES,
    MONGODB_URI,
} from "../config";

function maskMongoUri(uri: string): string {
    // Avoid leaking credentials in logs.
    return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^@]+)@/i, "$1***:***@");
}

function setupMongoConnectionLogging(): void {
    const connection = mongoose.connection;

    connection.on("connected", () => {
        console.info("MongoDB connected");
    });

    connection.on("disconnected", () => {
        console.warn("MongoDB disconnected");
    });

    connection.on("reconnected", () => {
        console.info("MongoDB reconnected");
    });

    connection.on("error", (error) => {
        console.error("MongoDB connection error", error);
    });
}

export async function connectDatabase(){
    try {
        setupMongoConnectionLogging();

        const connectOptions: mongoose.ConnectOptions = {
            serverSelectionTimeoutMS: MONGODB_SERVER_SELECTION_TIMEOUT_MS,
            connectTimeoutMS: MONGODB_CONNECT_TIMEOUT_MS,
            socketTimeoutMS: MONGODB_SOCKET_TIMEOUT_MS,
            maxPoolSize: MONGODB_MAX_POOL_SIZE,
            minPoolSize: MONGODB_MIN_POOL_SIZE,
            family: MONGODB_DNS_FAMILY,
        };

        if (MONGODB_URI.startsWith("mongodb+srv://") || MONGODB_FORCE_TLS) {
            connectOptions.tls = true;
        }

        if (MONGODB_TLS_ALLOW_INVALID_CERTIFICATES) {
            connectOptions.tlsAllowInvalidCertificates = true;
        }

        if (MONGODB_TLS_ALLOW_INVALID_HOSTNAMES) {
            connectOptions.tlsAllowInvalidHostnames = true;
        }

        await mongoose.connect(MONGODB_URI, connectOptions);
        await dropLegacyUserIndexes();
        console.info("Connected to MongoDB", {
            uri: maskMongoUri(MONGODB_URI),
            options: {
                serverSelectionTimeoutMS: MONGODB_SERVER_SELECTION_TIMEOUT_MS,
                connectTimeoutMS: MONGODB_CONNECT_TIMEOUT_MS,
                socketTimeoutMS: MONGODB_SOCKET_TIMEOUT_MS,
                maxPoolSize: MONGODB_MAX_POOL_SIZE,
                minPoolSize: MONGODB_MIN_POOL_SIZE,
                family: MONGODB_DNS_FAMILY,
                tls: connectOptions.tls ?? false,
                tlsAllowInvalidCertificates: MONGODB_TLS_ALLOW_INVALID_CERTIFICATES,
                tlsAllowInvalidHostnames: MONGODB_TLS_ALLOW_INVALID_HOSTNAMES,
            },
        });
    } catch (error) {
        console.error("Database Error:", {
            uri: maskMongoUri(MONGODB_URI),
            error,
        });
        process.exit(1); // Exit process with failure
    }
}

async function dropLegacyUserIndexes() {
    const db = mongoose.connection.db;
    if (!db) {
        return;
    }

    const usersCollection = db.collection("users");
    const indexes = await usersCollection.indexes();
    const legacyIndexes = ["username_1", "role_1", "firstName_1", "lastName_1"];

    for (const legacyIndex of legacyIndexes) {
        if (indexes.some((index) => index.name === legacyIndex)) {
            await usersCollection.dropIndex(legacyIndex);
        }
    }
}