import mongoose, { Schema } from "mongoose";
import { ITask } from "../types/task";

const TaskSchema: Schema<ITask> = new Schema<ITask>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    xp: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
      default: "/",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export const Task = mongoose.model<ITask>("Task", TaskSchema);
