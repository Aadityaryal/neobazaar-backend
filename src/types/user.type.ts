import z from "zod";

export const UserSchema = z.object({
    username: z.string().min(1),
    email: z.email(),
    password: z.string().min(6),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    image: z.string().optional(),
    role: z.enum(["user", "admin"]).default("user"),
    resetPasswordToken: z.string().optional(),
    resetPasswordExpiry: z.date().optional(),
});

export type UserType = z.infer<typeof UserSchema>;