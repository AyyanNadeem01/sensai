"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";

// Initialize Gemini AI like in dashboard
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to generate content using Gemini
async function runLLM(prompt, model = "gemini-2.5-flash") {
  for (let i = 0; i < 3; i++) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      return result.text?.trim() || "";
    } catch (err) {
      if (err.status === 503) {
        await new Promise(r => setTimeout(r, 2000)); // wait 2s
        continue;
      }
      throw err;
    }
  }
  throw new Error("AI model unavailable after retries.");
}

// Save or update resume
export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const resume = await db.resume.upsert({
    where: { userId: user.id },
    update: { content },
    create: { userId: user.id, content },
  });

  revalidatePath("/resume");
  return resume;
}

// Get resume content
export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({ where: { userId: user.id } });
}

// Improve resume with AI (same style as dashboard)
export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });
  if (!user) throw new Error("User not found");

  const prompt = `
As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
Make it more impactful, quantifiable, and aligned with industry standards.
Current content: "${current}"

Requirements:
1. Use action verbs
2. Include metrics and results
3. Highlight technical skills
4. Keep it concise
5. Focus on achievements over responsibilities
6. Use industry-specific keywords

Format as a single paragraph without extra text.
`;

  try {
    // Using the same method as dashboard
    const improvedContent = await runLLM(prompt, "gemini-2.5-flash");
    return improvedContent;
  } catch (error) {
    console.error("Error improving resume content:", error);
    throw new Error("Failed to improve resume content");
  }
}
