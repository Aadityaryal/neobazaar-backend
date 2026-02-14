import { connectDatabase } from '../database/mongodb';
import mongoose from 'mongoose';

beforeAll(async () => {
    await connectDatabase();
});

afterAll(async () => {
    await mongoose.connection.close();
});
