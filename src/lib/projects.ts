import { getCollection, type CollectionEntry } from "astro:content";

export async function getProjects(): Promise<CollectionEntry<"projects">[]> {
  const projects = await getCollection("projects");
  return projects.sort((a, b) => a.data.order - b.data.order);
}

export function getFeatured(projects: CollectionEntry<"projects">[]) {
  return projects.filter((project) => project.data.tier === "featured");
}

export function getArchive(projects: CollectionEntry<"projects">[]) {
  return projects.filter((project) => project.data.tier === "archive");
}
