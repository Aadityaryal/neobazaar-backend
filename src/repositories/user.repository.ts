import { UserModel, IUser } from "../models/user.model";

export interface PaginationResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IUserRepository {
    getUserByEmail(email: string): Promise<IUser | null>;
    getUserByUsername(username: string): Promise<IUser | null>;
    // Additional
    // 5 common database queries for entity
    createUser(userData: Partial<IUser>): Promise<IUser>;
    getUserById(id: string): Promise<IUser | null>;
    getAllUsers(): Promise<IUser[]>;
    getAllUsersPaginated(page: number, limit: number, search?: string): Promise<PaginationResult<IUser>>;
    updateUser(id: string, updateData: Partial<IUser>): Promise<IUser | null>;
    deleteUser(id: string): Promise<boolean>;
}
// MongoDb Implementation of UserRepository
export class UserRepository implements IUserRepository {
    async createUser(userData: Partial<IUser>): Promise<IUser> {
        const user = new UserModel(userData); 
        return await user.save();
    }
    async getUserByEmail(email: string): Promise<IUser | null> {
        const user = await UserModel.findOne({ "email": email })
        return user;
    }
    async getUserByUsername(username: string): Promise<IUser | null> {
        const user = await UserModel.findOne({ "username": username })
        return user;
    }

    async getUserById(id: string): Promise<IUser | null> {
        // UserModel.findOne({ "_id": id });
        const user = await UserModel.findById(id);
        return user;
    }
    async getAllUsers(): Promise<IUser[]> {
        const users = await UserModel.find();
        return users;
    }

    async getAllUsersPaginated(page: number, limit: number, search?: string): Promise<PaginationResult<IUser>> {
        const skip = (page - 1) * limit;
        
        // Build search query
        const query: any = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const [users, total] = await Promise.all([
            UserModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            UserModel.countDocuments(query)
        ]);

        return {
            data: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async updateUser(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
        // UserModel.updateOne({ _id: id }, { $set: updateData });
        const updatedUser = await UserModel.findByIdAndUpdate(
            id, updateData, { new: true } // return the updated document
        );
        return updatedUser;
    }
    async deleteUser(id: string): Promise<boolean> {
        // UserModel.deleteOne({ _id: id });
        const result = await UserModel.findByIdAndDelete(id);
        return result ? true : false;
    }
}