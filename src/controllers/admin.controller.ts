import { Request, Response } from "express";
import z from "zod";
import { UserService } from "../services/user.service";
import { AdminCreateUserDTO, AdminUpdateUserDTO } from "../dtos/user.dto";

const userService = new UserService();

export class AdminController {
    async createUser(req: Request, res: Response) {
        try {
            const imagePath = req.file ? `/uploads/users/${req.file.filename}` : undefined;
            const parsedData = AdminCreateUserDTO.safeParse({
                ...req.body,
                image: imagePath,
            });
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error),
                });
            }
            const newUser = await userService.createUser(parsedData.data);
            return res.status(201).json({ success: true, message: "User Created", data: newUser });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async getAllUsers(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;

            const result = await userService.getAllUsersPaginated(page, limit, search);
            return res.status(200).json({ success: true, ...result });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async getUserById(req: Request, res: Response) {
        try {
            const user = await userService.getUserById(req.params.id);
            return res.status(200).json({ success: true, data: user });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const imagePath = req.file ? `/uploads/users/${req.file.filename}` : undefined;
            const parsedData = AdminUpdateUserDTO.safeParse({
                ...req.body,
                image: imagePath,
            });
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error),
                });
            }
            const updatedUser = await userService.updateUser(req.params.id, parsedData.data);
            return res.status(200).json({ success: true, message: "User Updated", data: updatedUser });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            await userService.deleteUser(req.params.id);
            return res.status(200).json({ success: true, message: "User Deleted" });
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
}
