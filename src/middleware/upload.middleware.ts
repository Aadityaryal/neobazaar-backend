import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDir = path.join(process.cwd(), "uploads", "users");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uniqueName = `${Date.now()}-${safeName}`;
        cb(null, uniqueName);
    },
});

export const userImageUpload = multer({ storage });
