import { CreateUserDTO, LoginUserDTO, AdminCreateUserDTO, AdminUpdateUserDTO, UpdateSelfDTO } from "../dtos/user.dto";
import { UserRepository } from "../repositories/user.repository";
import bcryptjs from "bcryptjs"
import { HttpError } from "../errors/http-error";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";

let userRepository = new UserRepository();

export class UserService {
    async createUser(data: CreateUserDTO | AdminCreateUserDTO) {
        // business logic before creating user
        const emailCheck = await userRepository.getUserByEmail(data.email);
        if (emailCheck) {
            throw new HttpError(403, "Email already in use");
        }
        const usernameCheck = await userRepository.getUserByUsername(data.username);
        if (usernameCheck) {
            throw new HttpError(403, "Username already in use");
        }
        // hash password
        const hashedPassword = await bcryptjs.hash(data.password, 10); // 10 - complexity
        data.password = hashedPassword;

        // create user
        const newUser = await userRepository.createUser(data);

        // Remove password from response
        const { password, ...userWithoutPassword } = newUser.toObject();
        return userWithoutPassword;
    }

    async getAllUsers() {
        const users = await userRepository.getAllUsers();
        return users.map((user) => {
            const { password, ...userWithoutPassword } = user.toObject();
            return userWithoutPassword;
        });
    }

    async getUserById(id: string) {
        const user = await userRepository.getUserById(id);
        if (!user) {
            throw new HttpError(404, "User not found");
        }
        const { password, ...userWithoutPassword } = user.toObject();
        return userWithoutPassword;
    }

    async updateUser(id: string, updateData: AdminUpdateUserDTO | UpdateSelfDTO) {
        if (updateData.password) {
            updateData.password = await bcryptjs.hash(updateData.password, 10);
        }

        const updatedUser = await userRepository.updateUser(id, updateData);
        if (!updatedUser) {
            throw new HttpError(404, "User not found");
        }
        const { password, ...userWithoutPassword } = updatedUser.toObject();
        return userWithoutPassword;
    }

    async deleteUser(id: string) {
        const deleted = await userRepository.deleteUser(id);
        if (!deleted) {
            throw new HttpError(404, "User not found");
        }
        return true;
    }

    async loginUser(data: LoginUserDTO) {
        const user = await userRepository.getUserByEmail(data.email);
        if (!user) {
            throw new HttpError(404, "User not found");
        }
        // compare password
        const validPassword = await bcryptjs.compare(data.password, user.password);
        // plaintext, hashed
        if (!validPassword) {
            throw new HttpError(401, "Invalid credentials");
        }
        // generate jwt
        const payload = { // user identifier
            id: user._id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        }
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); // 30 days

        // Remove password from response
        const { password, ...userWithoutPassword } = user.toObject();
        return { token, user: userWithoutPassword }
    }
}