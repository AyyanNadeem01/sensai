"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
// import { generateAIInsights } from "./dashboard"; // enable later

/* ==========================
   TEMP MOCK AI INSIGHTS
   ========================== */
async function generateMockInsights(industry) {
  return {
    salaryRanges: [
      {
        role: "Software Engineer",
        min: 50000,
        max: 150000,
        median: 90000,
        location: "Global",
      },
    ],
    growthRate: 10.2,
    demandLevel: "High",
    topSkills: ["JavaScript", "React", "Node.js", "SQL"],
    marketOutlook: "Positive",
    keyTrends: ["AI adoption", "Remote work", "Cloud computing"],
    recommendedSkills: ["Docker", "Kubernetes", "System Design"],
  };
}

/* ==========================
   UPDATE USER PROFILE
   ========================== */
export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const result = await db.$transaction(
      async (tx) => {
        // Check if Industry Insight exists
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // Create industry insight if not found
        if (!industryInsight) {
          const insights = await generateMockInsights(data.industry);

          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              ...insights,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // Update User profile
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        return { updatedUser, industryInsight };
      },
      { timeout: 10000 }
    );

    revalidatePath("/");
    return result.updatedUser;
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}

/* ==========================
   CHECK ONBOARDING STATUS
   ========================== */
export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { industry: true },
    });

    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}
