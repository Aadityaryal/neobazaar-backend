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
        confirmPassword: z.string().min(6)
    }
).refine( // extra validation for confirmPassword
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    }
)
export type CreateUserDTO = z.infer<typeof CreateUserDTO>;

export const LoginUserDTO = z.object({
    email: z.email(),
    password: z.string().min(6)
});
export type LoginUserDTO = z.infer<typeof LoginUserDTO>;