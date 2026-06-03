import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const questions = await prisma.question.findMany({
    select: { code: true },
  });

  const questionUrls: MetadataRoute.Sitemap = questions.map((q) => ({
    url: `https://www.examleet.com/problems/${q.code}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: "https://www.examleet.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: "https://www.examleet.com/problems",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://www.examleet.com/contests",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.examleet.com/leaderboard",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    ...questionUrls,
  ];
}
