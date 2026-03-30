import { AdminActivity } from "./models";
import connectDB from "./db";

export async function logAdminActivity({
  adminEmail,
  action,
  targetId,
  targetName,
  details
}: {
  adminEmail: string;
  action: string;
  targetId?: string;
  targetName?: string;
  details?: string;
}) {
  try {
    await connectDB();
    await AdminActivity.create({
      adminEmail,
      action,
      targetId,
      targetName,
      details
    });
  } catch (error) {
    console.error("Failed to log admin activity:", error);
  }
}
