import mongoose, { Schema } from "mongoose";
import { IUserTask } from "../types/userTask";

const UserTaskSchema: Schema<IUserTask> = new Schema<IUserTask>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    is_completed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export const UserTask = mongoose.model<IUserTask>("UserTask", UserTaskSchema);
