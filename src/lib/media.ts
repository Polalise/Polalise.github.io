import type { CollectionEntry } from "astro:content";

export const projectCoverDimensions = {
  desktop: { width: 1600, height: 1000 },
  mobile: { width: 960, height: 720 },
  og: { width: 1200, height: 630 }
} as const;

export function projectCoverMedia(slug: string) {
  const directory = `/media/projects/${slug}`;
  return {
    desktop: {
      src: `${directory}/cover.webp`,
      srcset: `${directory}/cover-480w.webp 480w, ${directory}/cover-960w.webp 960w, ${directory}/cover.webp 1600w`,
      ...projectCoverDimensions.desktop
    },
    mobile: {
      src: `${directory}/cover-mobile.webp`,
      srcset: `${directory}/cover-mobile-480w.webp 480w, ${directory}/cover-mobile.webp 960w`,
      ...projectCoverDimensions.mobile
    },
    og: {
      src: `${directory}/cover-og.webp`,
      ...projectCoverDimensions.og
    }
  } as const;
}

export function projectVisualMedia(slug: string, id: string) {
  const directory = `/media/projects/${slug}/visuals`;
  return {
    src: `${directory}/${id}.webp`,
    srcset: `${directory}/${id}-480w.webp 480w, ${directory}/${id}-960w.webp 960w, ${directory}/${id}.webp 1600w`,
    width: 1600,
    height: 1000
  } as const;
}

export function projectCoverEvidenceText(project: CollectionEntry<"projects">) {
  const { source, index } = project.data.cover.evidence;
  if (source === "metric") {
    const metric = project.data.metrics[index!];
    const scope = metric.scope === "personal" ? "개인 결과" : "팀 전체";
    return `${metric.value} · ${metric.label} · ${scope} · ${metric.evidence}`;
  }
  if (source === "action") return project.data.actions[index!];
  if (source === "outcome") return project.data.outcomes[index!];
  if (source === "role") return project.data.role!;
  return project.data.limitation;
}
