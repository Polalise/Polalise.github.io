/**
 * 공개, 개인정보 안전 A4 이력서 PDF 를 만든다 (RPDF-DOC / 후보 C1).
 *
 * 로컬 전용 도구다 (DSN-20260829-004 ADR-007). CI 는 이 스크립트를 실행하지 않고
 * 커밋된 public/resume/resume.pdf 를 그대로 서빙한다. 이유:
 *   - GitHub Pages Actions 의 build 잡에는 브라우저 설치 스텝이 없다.
 *   - CI 체크아웃은 서브모듈 단독이라 ../content/docs 가 없다.
 *
 * 실행:  node scripts/build_resume.mjs   (= npm run resume:build)
 *
 * 내용 원본은 부모 저장소 content/docs/유병현_이력서_제출본.md (단일 진실) 다.
 * 이름 / 포지셔닝 한 줄 / 연락처 3개만 상수이며 (신원 / 감사 계약 상수),
 * 나머지 본문은 전부 제출본을 파싱해 채운다.
 *
 * 파이프라인: HTML + 시스템 Chrome/Edge page.pdf() (Playwright). export_pdf.py 와 동일 관용구.
 * theme.css 4.2 덱 토큰은 scripts/resume/resume.css 가 재선언한다 (문서형 멤버, 디자인_시스템.md 4.5).
 *
 * 생성물:
 *   - public/resume/resume.pdf
 *   - scripts/resume/resume-snapshot.json  (최신성 게이트용: 원본 sha256 + 핵심 문자열)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SUBMODULE_ROOT = path.resolve(SCRIPT_DIR, "..");
const PARENT_ROOT = path.resolve(SUBMODULE_ROOT, "..");

export const SOURCE_REL = "content/docs/유병현_이력서_제출본.md";
export const SOURCE_PATH = path.join(PARENT_ROOT, "content", "docs", "유병현_이력서_제출본.md");
const OUTPUT_PATH = path.join(SUBMODULE_ROOT, "public", "resume", "resume.pdf");
export const SNAPSHOT_PATH = path.join(SCRIPT_DIR, "resume", "resume-snapshot.json");
const CSS_PATH = path.join(SCRIPT_DIR, "resume", "resume.css");
const FONT_DIR = path.join(
  SUBMODULE_ROOT,
  "node_modules",
  "pretendard",
  "dist",
  "public",
  "static",
  "alternative"
);

/* 신원 / 감사 계약 상수. 연락처는 audit-public.mjs 의 approvedEmail 과 공개 사이트에
   이미 노출된 값만 쓴다. 전화 / 주소 / 생년월일은 넣지 않는다 (AI_ACTION.md 4.3). */
const NAME = "유병현";
const ROLE_LINE = "AI 연동형 풀스택 개발자";
const CONTACT = [
  { label: "qudgus182@naver.com", href: "mailto:qudgus182@naver.com" },
  { label: "github.com/Polalise", href: "https://github.com/Polalise" },
  { label: "polalise.github.io", href: "https://polalise.github.io" }
];
const BACKLINK = { label: "polalise.github.io/resume/", href: "https://polalise.github.io/resume/" };

/* 렌더할 섹션과 좌측 레일 라벨 (제출본 구조 순서, 한글 라벨). */
const SECTION_LABELS = [
  { match: (t) => t === "간략 소개", label: "소개" },
  { match: (t) => t === "핵심 역량", label: "핵심 역량" },
  { match: (t) => t === "나의 스킬", label: "스킬" },
  { match: (t) => t === "학력", label: "학력" },
  { match: (t) => t.startsWith("경력") && !t.startsWith("경력기술서"), label: "경력" },
  { match: (t) => t === "경력기술서", label: "경력기술서" },
  { match: (t) => t.startsWith("경험"), label: "경험·활동·교육" },
  { match: (t) => t.startsWith("포트폴리오"), label: "포트폴리오" },
  { match: (t) => t === "기타", label: "기타" }
];

/* PDF 에 반드시 남아야 하는 사실 계약. 최신성 게이트가 이 목록으로 검사한다.
   제출본 구조가 바뀌어 아래 문자열이 원본에서 사라지면 빌드가 실패하니 함께 갱신한다. */
export const KEY_STRINGS = [
  "AI 연동형 풀스택 개발자",
  "총 1년 4개월",
  "2022.10 ~ 2024.01",
  "엘케이시스㈜",
  "수원농생명과학고등학교",
  "핵심 역량",
  "경력기술서",
  "OCI에 배포해 실사용자가 사용하는 환경에서 운영",
  "개인 PR 66건",
  "교육과정 과제",
  "RMSE 0.3602",
  "2026.06 ~ 2026.08",
  "2025.12 ~ 2026.06",
  "Streamlit Community Cloud"
];

/* 공백을 모두 제거해 비교한다. pdfjs 텍스트 추출이 줄바꿈 위치마다 공백을 넣어
   토큰을 쪼개므로, audit-public.mjs 의 최신성 검사도 같은 정규화를 쓴다. */
export function squeeze(text) {
  return text.replace(/\s+/g, "");
}

/* 공개 경계 정규화: em / en 대시는 audit-public.mjs 가 차단하므로 ASCII 로 바꾼다
   (AI_ACTION.md 11: 탐지 정규식을 약화하지 말고 생성 쪽을 고친다). 원본은 안 바꾼다.
   정규식에 대시 리터럴을 두면 이 소스 파일이 감사에 걸리므로 코드포인트로 짓는다. */
const PUBLIC_DASH_RE = new RegExp("\\s*[\\u2013\\u2014]\\s*", "g");
export function normalizeForPublic(text) {
  return text.replace(PUBLIC_DASH_RE, " - ");
}

function fail(message) {
  console.error(`이력서 PDF 빌드 실패: ${message}`);
  process.exit(1);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* 인라인 서식: 링크 -> URL -> 굵게 -> 백틱 태그. escape 후 적용한다. */
function inline(raw) {
  let out = escapeHtml(raw);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_m, label, href) => {
    return `<a href="${href}">${label}</a>`;
  });
  out = out.replace(/(?<!["=])\b(https?:\/\/[^\s<)]+[^\s<).,])/g, (url) => {
    return `<a href="${url}">${url}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/`([^`]+)`/g, '<span class="tag">$1</span>');
  return out;
}

/* 한 섹션 본문(마크다운 조각)을 HTML 로 변환한다.
   dropBareLinks: 간략 소개의 끝 URL 불릿은 헤더 연락처와 겹치므로 버린다. */
function renderBlock(text, { dropBareLinks = false } = {}) {
  const lines = text.split(/\r?\n/);
  const parts = [];
  let para = [];
  let listTag = null;

  const flushPara = () => {
    if (para.length) {
      parts.push(`<p>${inline(para.join(" ").trim())}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (listTag) {
      parts.push(`</${listTag}>`);
      listTag = null;
    }
  };
  const openList = (tag) => {
    if (listTag && listTag !== tag) closeList();
    if (!listTag) {
      parts.push(`<${tag}>`);
      listTag = tag;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "" || line === "---") {
      flushPara();
      closeList();
      continue;
    }

    const heading = line.match(/^#{3,4}\s+(.+)$/);
    if (heading) {
      flushPara();
      closeList();
      parts.push(`<h3>${inline(heading[1])}</h3>`);
      continue;
    }

    const tagLine = line.match(/^(`[^`]+`\s*)+$/);
    if (tagLine) {
      flushPara();
      closeList();
      const tags = [...line.matchAll(/`([^`]+)`/g)].map(
        (m) => `<span class="tag">${escapeHtml(m[1])}</span>`
      );
      parts.push(`<p class="tags">${tags.join("")}</p>`);
      continue;
    }

    const boldOnly = line.match(/^\*\*(.+)\*\*$/);
    if (boldOnly) {
      flushPara();
      closeList();
      parts.push(`<p class="meta">${inline(boldOnly[1])}</p>`);
      continue;
    }

    const bracket = line.match(/^\[([^\]]+)\](?!\()\s*(.*)$/);
    if (bracket) {
      flushPara();
      closeList();
      const rest = bracket[2] ? ` ${inline(bracket[2])}` : "";
      parts.push(`<p class="bracket"><strong>${escapeHtml(bracket[1])}</strong>${rest}</p>`);
      continue;
    }

    const ordered = line.match(/^(\d+)\.\s+(.+)$/);
    if (ordered) {
      flushPara();
      openList("ol");
      parts.push(`<li>${inline(ordered[2])}</li>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      const content = bullet[1].trim();
      if (dropBareLinks && /^https?:\/\/\S+$/.test(content)) continue;
      flushPara();
      openList("ul");
      parts.push(`<li>${inline(content)}</li>`);
      continue;
    }

    para.push(line);
  }

  flushPara();
  closeList();
  return parts.join("\n");
}

/* 제출본 마크다운을 파싱한다. 첫 `## ` 이전(이름 h1, 나이 / 성별 줄, 연락처 표,
   스킬 태그 줄)은 전부 버린다. */
export function parseSubmitted(rawMd) {
  const versionMatch = rawMd.match(/hiring-document-version:\s*(v[\d.]+)/i);
  const version = versionMatch ? versionMatch[1] : "unknown";

  const md = normalizeForPublic(rawMd);
  const firstHeading = md.indexOf("\n## ");
  if (firstHeading < 0) fail(`${SOURCE_REL} 에서 '## ' 섹션을 찾지 못했습니다`);
  const rest = md.slice(firstHeading + 1);

  const chunks = rest.split(/\n## /).map((c, i) => (i === 0 ? c.replace(/^## /, "") : c));
  const sections = [];
  for (const chunk of chunks) {
    const nl = chunk.indexOf("\n");
    const title = (nl < 0 ? chunk : chunk.slice(0, nl)).trim();
    const body = nl < 0 ? "" : chunk.slice(nl + 1).trim();
    const spec = SECTION_LABELS.find((s) => s.match(title));
    if (!spec) continue;

    let bodyHtml = "";
    const careerTotal = title.match(/^경력\s+(.+)$/);
    if (careerTotal) {
      bodyHtml += `<p class="meta">${escapeHtml(careerTotal[1])}</p>\n`;
    }
    bodyHtml += renderBlock(body, { dropBareLinks: title === "간략 소개" });
    sections.push({ label: spec.label, html: bodyHtml });
  }
  return { version, sections };
}

function buildHtml({ sections }, css, fontFaces) {
  const contactHtml = CONTACT.map((c) => `<a href="${c.href}">${c.label}</a>`).join(
    '<span class="sep">|</span>'
  );

  const sectionsHtml = sections
    .map(
      (s) => `<section class="rsection">
  <div class="rsection__label">${escapeHtml(s.label)}</div>
  <div class="rsection__body">
${s.html}
  </div>
</section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${NAME} 이력서</title>
<style>
${fontFaces}
${css}
</style>
</head>
<body>
<main class="page">
  <header class="rhead">
    <h1 class="rhead__name">${NAME}</h1>
    <div class="rhead__tick" aria-hidden="true"></div>
    <p class="rhead__role">${ROLE_LINE}</p>
    <p class="rhead__contact">${contactHtml}</p>
  </header>
${sectionsHtml}
  <p class="backlink">전체 이력과 프로젝트 근거는 <a href="${BACKLINK.href}">${BACKLINK.label}</a> 에서 확인할 수 있습니다.</p>
</main>
</body>
</html>`;
}

async function fontFace(family, file, weight) {
  const buffer = await readFile(path.join(FONT_DIR, file)).catch(() => {
    fail(
      `Pretendard 폰트가 없습니다: ${file}. 서브모듈에서 'npm ci' 를 실행하세요 (${path.relative(
        SUBMODULE_ROOT,
        FONT_DIR
      )}).`
    );
  });
  const base64 = buffer.toString("base64");
  return `@font-face{font-family:"${family}";src:url("data:font/ttf;base64,${base64}") format("truetype");font-weight:${weight};font-style:normal;font-display:swap;}`;
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function launchChromium() {
  const { chromium } = await import("@playwright/test");
  const envChannel = process.env.RESUME_PDF_CHANNEL;
  const candidates = envChannel
    ? [envChannel]
    : process.platform === "win32"
      ? ["msedge", "chrome"]
      : ["chrome", "chromium"];
  let lastError;
  for (const channel of candidates) {
    try {
      if (channel === "chromium") return await chromium.launch();
      return await chromium.launch({ channel });
    } catch (error) {
      lastError = error;
    }
  }
  try {
    return await chromium.launch();
  } catch (error) {
    lastError = error;
  }
  fail(
    `시스템 Chrome / Edge 를 열지 못했습니다 (${candidates.join(", ")}). ` +
      `Chrome 또는 Edge 설치 후 다시 실행하거나 RESUME_PDF_CHANNEL 로 지정하세요. 원인: ${lastError}`
  );
}

/* 소스를 읽어 파싱 + HTML 조립까지 한다 (브라우저 없음). 프리뷰 / 테스트가 재사용한다. */
export async function renderResumeHtml({ embedFonts = true } = {}) {
  const mdBytes = await readFile(SOURCE_PATH).catch(() => {
    fail(
      `이력서 원본을 찾지 못했습니다: ${SOURCE_REL}. ` +
        `이 스크립트는 부모 저장소가 있는 로컬에서만 실행합니다 (ADR-007).`
    );
  });
  const md = mdBytes.toString("utf8");

  const missingInSource = KEY_STRINGS.filter((s) => !md.includes(s));
  if (missingInSource.length) {
    fail(
      `제출본 구조가 바뀌어 핵심 문자열이 사라졌습니다: ${JSON.stringify(missingInSource)}. ` +
        `build_resume.mjs 의 KEY_STRINGS 를 현재 제출본에 맞게 갱신하세요.`
    );
  }

  const parsed = parseSubmitted(md);
  if (parsed.sections.length < 8) {
    fail(`파싱된 섹션이 ${parsed.sections.length}개뿐입니다. 제출본 구조를 확인하세요.`);
  }

  const css = await readFile(CSS_PATH, "utf8");
  const fontFaces = embedFonts
    ? [
        await fontFace("Pretendard", "Pretendard-Regular.ttf", 400),
        await fontFace("Pretendard", "Pretendard-Bold.ttf", 700)
      ].join("\n")
    : "";

  const html = buildHtml(parsed, css, fontFaces);

  const plain = squeeze(stripTags(html));
  const missingInRender = KEY_STRINGS.filter((s) => !plain.includes(squeeze(s)));
  if (missingInRender.length) {
    fail(`렌더 결과에 핵심 문자열이 빠졌습니다: ${JSON.stringify(missingInRender)}. 템플릿을 확인하세요.`);
  }

  // 원본 파일 바이트를 그대로 해시한다 (부모 scripts/check_resume_pdf_fresh.py 와 정합).
  const sourceSha256 = createHash("sha256").update(mdBytes).digest("hex");
  return { html, parsed, sourceSha256, plainText: plain };
}

async function main() {
  for (const stream of [process.stdout, process.stderr]) {
    if (typeof stream.reconfigure === "function") {
      stream.reconfigure({ encoding: "utf-8", errors: "replace" });
    }
  }

  const { html, parsed, sourceSha256 } = await renderResumeHtml();

  const browser = await launchChromium();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: "print" });
    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await page.pdf({
      path: OUTPUT_PATH,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate:
        '<div style="width:100%;font-size:7pt;color:#A8A196;padding:0 17mm;text-align:right;"><span class="pageNumber"></span></div>',
      margin: { top: "15mm", right: "17mm", bottom: "14mm", left: "17mm" }
    });
  } finally {
    await browser.close();
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sourceFile: SOURCE_REL,
    sourceVersion: parsed.version,
    sourceSha256,
    keyStrings: KEY_STRINGS
  };
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  const sizeKb = ((await readFile(OUTPUT_PATH)).length / 1024).toFixed(1);
  console.log(
    `이력서 PDF 생성: ${path.relative(SUBMODULE_ROOT, OUTPUT_PATH)} (${sizeKb} KB, ${parsed.sections.length}개 섹션, ${parsed.version})`
  );
  console.log(
    `스냅샷 기록: ${path.relative(SUBMODULE_ROOT, SNAPSHOT_PATH)} (sha256 ${sourceSha256.slice(0, 12)}...)`
  );
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => fail(String(error && error.stack ? error.stack : error)));
}
