"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Helper function to generate content using Gemini API
async function runLLM(prompt) {
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return result.text?.trim() || "";
}

// Generate industry insights using AI
export const generateAIInsights = async (industry) => {
  const prompt = `
Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format, without any additional notes:

{
  "salaryRanges": [
    { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
  ],
  "growthRate": number,
  "demandLevel": "High" | "Medium" | "Low",
  "topSkills": ["skill1", "skill2"],
  "marketOutlook": "Positive" | "Neutral" | "Negative",
  "keyTrends": ["trend1", "trend2"],
  "recommendedSkills": ["skill1", "skill2"]
}

Include at least 5 common roles for salary ranges, 5 skills and trends, and provide growth rate as a percentage.
Return ONLY the JSON, no extra text or markdown.
`;

  try {
    const text = await runLLM(prompt);
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating AI insights:", error);
    throw new Error("Failed to generate AI insights");
  }
};

// Fetch or generate industry insights for dashboard
export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  // Generate insights if not existing
  if (!user.industryInsight) {
    try {
      const insights = await generateAIInsights(user.industry);

      const industryInsight = await db.industryInsight.create({
        data: {
          industry: user.industry,
          ...insights,
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return industryInsight;
    } catch (error) {
      console.error("Error generating industry insights, returning fallback:", error);

      return {
        id: "fallback",
        industry: user.industry ?? "unknown",
        salaryRanges: [],
        growthRate: 0,
        demandLevel: "Medium",
        topSkills: [],
        marketOutlook: "Neutral",
        keyTrends: [],
        recommendedSkills: [],
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }
  }

  return user.industryInsight;
}
