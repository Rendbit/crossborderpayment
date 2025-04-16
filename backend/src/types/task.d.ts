import mongoose, { Document } from "mongoose";

export interface ITask extends Document {
  name: string;
  description: string;
  xp: number;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}
