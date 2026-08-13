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

const coverEvidenceSchema = z.object({
  source: z.enum(["metric", "action", "outcome", "role", "limitation"]),
  index: z.number().int().nonnegative().optional()
}).superRefine((evidence, context) => {
  const indexedSource = ["metric", "action", "outcome"].includes(evidence.source);
  if (indexedSource && evidence.index === undefined) {
    context.addIssue({
      code: "custom",
      path: ["index"],
      message: `${evidence.source} cover evidence requires an index`
    });
  }
  if (!indexedSource && evidence.index !== undefined) {
    context.addIssue({
      code: "custom",
      path: ["index"],
      message: `${evidence.source} cover evidence must not declare an index`
    });
  }
});

const coverSchema = z.object({
  kind: z.enum(["workflow", "routing", "product", "validation", "architecture", "scope"]),
  tone: z.enum(["paper", "ink", "accent"]),
  alt: z.string().min(1),
  evidence: coverEvidenceSchema
});

const visualSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  alt: z.string().min(1),
  caption: z.string().min(1),
  scope: z.enum(["personal", "team"]),
  evidence: z.string().min(1)
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
    cover: coverSchema,
    visuals: z.array(visualSchema).default([])
  }).superRefine((project, context) => {
    const { source, index } = project.cover.evidence;
    const indexedCollections = {
      metric: project.metrics,
      action: project.actions,
      outcome: project.outcomes
    } as const;

    if (source === "role" && !project.role) {
      context.addIssue({
        code: "custom",
        path: ["cover", "evidence", "source"],
        message: "role cover evidence requires the project role field"
      });
    }

    if (
      project.ownership === "team" &&
      source === "metric" &&
      index !== undefined &&
      project.metrics[index]?.scope === "personal"
    ) {
      context.addIssue({
        code: "custom",
        path: ["cover", "evidence", "index"],
        message: "team project covers cannot use a personal metric as their primary evidence"
      });
    }

    if (source === "metric" || source === "action" || source === "outcome") {
      const collection = indexedCollections[source];
      if (index !== undefined && index >= collection.length) {
        context.addIssue({
          code: "custom",
          path: ["cover", "evidence", "index"],
          message: `${source} cover evidence index ${index} is outside the ${collection.length}-item collection`
        });
      }
    }
  })
});

export const collections = { projects };
