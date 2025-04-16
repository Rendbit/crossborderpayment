import mongoose, { Document, Types } from "mongoose";

export interface IUserTask extends Document {
  user: Types.ObjectId;
  task: Types.ObjectId;
  is_completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
