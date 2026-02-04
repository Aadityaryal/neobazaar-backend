import { connectDatabase } from '../database/mongodb';
import mongoose from 'mongoose';

jest.setTimeout(30000);

beforeAll(async () => {
    await connectDatabase();
});

afterAll(async () => {
    await mongoose.connection.close();
});
