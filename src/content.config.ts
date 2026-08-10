import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const metricSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  scope: z.enum(["personal", "team"]),
  evidence: z.string().min(1)
});

const linkSchema = z.object({
  repository: z.url().optional(),
  demo: z.url().optional(),
  report: z.url().optional()
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string().min(1),
    displayTitle: z.string().min(1),
    order: z.number().int().min(1).max(9),
    tier: z.enum(["featured", "supporting", "archive"]),
    ownership: z.enum(["personal", "team"]),
    category: z.string().min(1),
    summary: z.string().min(1),
    period: z.string().optional(),
    teamSize: z.number().int().positive().optional(),
    role: z.string().optional(),
    technologies: z.array(z.string().min(1)).min(1),
    problem: z.string().min(1),
    actions: z.array(z.string().min(1)).min(1),
    outcomes: z.array(z.string().min(1)).min(1),
    limitation: z.string().min(1),
    metrics: z.array(metricSchema),
    links: linkSchema,
    cover: z.string().startsWith("/media/projects/"),
    coverAlt: z.string().min(1),
    coverTone: z.enum(["paper", "ink", "accent"]).default("paper")
  })
});

export const collections = { projects };
