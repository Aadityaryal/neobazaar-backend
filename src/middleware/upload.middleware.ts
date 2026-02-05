import fs from "fs";
import path from "path";
import multer from "multer";

function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function sanitizeFilename(fileName: string): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${Date.now()}-${safeName}`;
}

const userUploadDir = path.join(process.cwd(), "uploads", "users");
const productUploadDir = path.join(process.cwd(), "uploads", "products");
ensureDir(userUploadDir);
ensureDir(productUploadDir);

const userStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, userUploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, sanitizeFilename(file.originalname));
    },
});

const productStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, productUploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, sanitizeFilename(file.originalname));
    },
});

export const userImageUpload = multer({ storage: userStorage });
export const productImageUpload = multer({ storage: productStorage });
