import mongoose, { Document, Schema } from "mongoose";

export type ExportJobStatus = "queued" | "processing" | "completed" | "failed";

export interface IExportJob extends Document {
    exportJobId: string;
    requestedByUserId: string;
    format: "csv" | "pdf";
    status: ExportJobStatus;
    progress: number;
    artifactPath?: string;
    errorMessage?: string;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ExportJobSchema = new Schema<IExportJob>(
    {
        exportJobId: { type: String, required: true, unique: true, index: true },
        requestedByUserId: { type: String, required: true, index: true },
        format: { type: String, enum: ["csv", "pdf"], required: true },
        status: {
            type: String,
            enum: ["queued", "processing", "completed", "failed"],
            required: true,
            default: "queued",
        },
        progress: { type: Number, required: true, default: 0 },
        artifactPath: { type: String },
        errorMessage: { type: String },
        expiresAt: { type: Date },
    },
    { timestamps: true }
);

ExportJobSchema.index({ createdAt: -1 });

export const ExportJobModel = mongoose.model<IExportJob>("ExportJob", ExportJobSchema);
