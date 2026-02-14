import z from "zod";
import { UserSchema } from "../types/user.type";
// re-use UserSchema from types
export const CreateUserDTO = UserSchema.pick(
    {
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        password: true
    }
).extend( // add new attribute to zod
    {
        confirmPassword: z.string().min(6),
        image: z.string().optional()
    }
).refine( // extra validation for confirmPassword
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    }
)
export type CreateUserDTO = z.infer<typeof CreateUserDTO>;

export const AdminCreateUserDTO = UserSchema.pick(
    {
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        password: true,
        role: true
    }
).extend(
    {
        confirmPassword: z.string().min(6),
        image: z.string().optional()
    }
).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    }
);
export type AdminCreateUserDTO = z.infer<typeof AdminCreateUserDTO>;

export const AdminUpdateUserDTO = UserSchema.pick(
    {
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        password: true,
        role: true
    }
).partial().extend(
    {
        image: z.string().optional()
    }
);
export type AdminUpdateUserDTO = z.infer<typeof AdminUpdateUserDTO>;

export const UpdateSelfDTO = UserSchema.pick(
    {
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        password: true
    }
).partial().extend(
    {
        image: z.string().optional()
    }
);
export type UpdateSelfDTO = z.infer<typeof UpdateSelfDTO>;

export const LoginUserDTO = z.object({
    email: z.email(),
    password: z.string().min(6)
});
export type LoginUserDTO = z.infer<typeof LoginUserDTO>;

export const ForgotPasswordDTO = z.object({
    email: z.email()
});
export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordDTO>;

export const ResetPasswordDTO = z.object({
    token: z.string(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6)
}).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    }
);
export type ResetPasswordDTO = z.infer<typeof ResetPasswordDTO>;