/**
 * 공개, 개인정보 안전 A4 이력서 PDF 를 만든다 (RPDF-SARAMIN).
 *
 * 로컬 전용 도구다 (DSN-20260829-004 ADR-007, DSN-20260901-002 계승). CI 는 이 스크립트를
 * 실행하지 않고 커밋된 public/resume/resume.pdf 를 그대로 서빙한다.
 *
 * 실행:  node scripts/build_resume.mjs   (= npm run resume:build)
 *
 * 양식: example/이력서_템플릿.pdf (사람인 포털 표준 이력서 export) 모양을 모방한다 -
 * 흰 배경 + 블루 액센트 + 회색, 상단 5카드 요약 행, 2열 항목, 아웃라인 pill 스킬 칩,
 * 섹션 제목 하단 하????라인. 덱 / PDF §4.2 팔레트(웜 페이퍼 / 번트 오렌지)는 쓰지 않는다.
 *
 * 내용 원본은 부모 저장소 content/docs/유병현_이력서_제출본.md (단일 진실) 다.
 * 이름 / 포지셔닝 / 연락처 3개 / 상태 pill 만 상수이며, 나머지는 전부 제출본을 파싱해 채운다.
 *
 * 파이프라인: HTML + 시스템 Chrome/Edge page.pdf() (Playwright). export_pdf.py 와 동일 관용구.
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
   이미 노출된 값만 쓴다. 전화 / 주소 / 생년월일 / 성별 / 나이는 넣지 않는다 (AI_ACTION.md 4.3). */
const NAME = "유병현";
const STATUS_PILL = "신입";
const ROLE_LINE = "AI 연동형 풀스택 개발자";
const CONTACT = [
  { label: "qudgus182@naver.com", href: "mailto:qudgus182@naver.com" },
  { label: "github.com/Polalise", href: "https://github.com/Polalise" },
  { label: "polalise.github.io", href: "https://polalise.github.io" }
];

const LINK_ICON =
  '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.2-1.2"/></svg></span>';

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
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/* 인라인 서식: 링크 -> URL -> 굵게 -> 백틱. escape 후 적용한다. */
function inline(raw) {
  let out = escapeHtml(raw);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_m, label, href) => `<a href="${href}">${label}</a>`);
  out = out.replace(/(?<!["=])\b(https?:\/\/[^\s<)]+[^\s<).,])/g, (url) => `<a href="${url}">${url}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/`([^`]+)`/g, "<span class=\"tag\">$1</span>");
  return out;
}

/* 한 마크다운 조각을 HTML 로 (문단 / 불릿 / 번호 / [ ] 소제목 / ### 제목). */
function renderBlock(text) {
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
      flushPara();
      openList("ul");
      parts.push(`<li>${inline(bullet[1].trim())}</li>`);
      continue;
    }
    para.push(line);
  }
  flushPara();
  closeList();
  return parts.join("\n");
}

/* 간략 소개: 문단 + 끝 URL 불릿 3줄을 아이콘 링크 행으로. */
function renderIntro(text) {
  const kept = [];
  const links = [];
  for (const raw of text.split(/\r?\n/)) {
    const b = raw.trim().match(/^-\s+(https?:\/\/\S+?)(?:\s+\((.+)\))?$/);
    if (b) {
      links.push({ href: b[1].replace(/[.,]$/, ""), note: b[2] || "" });
      continue;
    }
    kept.push(raw);
  }
  let html = renderBlock(kept.join("\n"));
  if (links.length) {
    html += `<div class="linklist">${links
      .map(
        (l) =>
          `<div class="linkrow">${LINK_ICON}<a href="${l.href}">${escapeHtml(
            l.href.replace(/^https?:\/\//, "")
          )}</a>${l.note ? ` <span class="note">${escapeHtml(l.note)}</span>` : ""}</div>`
      )
      .join("")}</div>`;
  }
  return html;
}

/* 나의 스킬: 백틱 토큰 전부를 아웃라인 pill 칩으로. */
function renderSkillsChips(text) {
  const tokens = [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  return `<div class="chips">${tokens.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>`;
}

/* 2열 항목 (학력 / 경력 / 경험). **날짜** 줄로 항목을 나눈다.
   좌: 날짜 + 기간/상태. 우: 기관(굵게) + 역할(회색) + 라벨/불릿. */
function renderEntries(text) {
  const entries = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const dateLine = raw.trim().match(/^\*\*(.+)\*\*$/);
    if (dateLine) {
      if (cur) entries.push(cur);
      cur = { meta: dateLine[1].trim(), body: [] };
      continue;
    }
    if (!cur) {
      if (raw.trim()) cur = { meta: "", body: [raw] };
      continue;
    }
    cur.body.push(raw);
  }
  if (cur) entries.push(cur);

  return entries
    .map((entry) => {
      const [date, ...durRest] = entry.meta.split(" · ");
      const dur = durRest.join(" · ");
      const bodyLines = entry.body.slice();
      while (bodyLines.length && !bodyLines[0].trim()) bodyLines.shift();

      let titleHtml = "";
      const first = bodyLines[0] ? bodyLines[0].trim() : "";
      if (first && !/^[-*[#]/.test(first) && !/^\d+\.\s/.test(first)) {
        bodyLines.shift();
        const roleSplit = first.match(/^(.*?)\s+(사원\/팀원.*)$/);
        const org = roleSplit ? roleSplit[1] : first;
        const role = roleSplit ? roleSplit[2] : "";
        titleHtml = `<p class="entry__title">${inline(org)}${
          role ? `<span class="role">${inline(role)}</span>` : ""
        }</p>`;
      }

      const inner = renderBlock(bodyLines.join("\n"));
      return `<div class="entry">
  <div class="entry__meta"><span class="date">${escapeHtml(date || "")}</span>${
        dur ? `<span class="dur">${escapeHtml(dur)}</span>` : ""
      }</div>
  <div class="entry__body">${titleHtml}${inner}</div>
</div>`;
    })
    .join("\n");
}

/* 포트폴리오: **포트폴리오** - {문서명} 블록마다 라벨-값 줄. "배포 후 관측" 문단은 공개본 생략. */
function renderPortfolio(text) {
  const KV = /^(작업기간|작업 툴|작업인원|GitHub|배포|시연 영상|작품소개)\s+(.+)$/;
  const blocks = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const name = line.match(/^\*\*포트폴리오\*\*\s*-\s*(.+)$/);
    if (name) {
      if (cur) blocks.push(cur);
      cur = { name: name[1], rows: [] };
      continue;
    }
    if (!cur || !line || line === "---" || /^배포 후 관측/.test(line)) continue;
    const kv = line.match(KV);
    if (kv) {
      cur.rows.push([kv[1], kv[2]]);
      continue;
    }
    if (cur.rows.length) cur.rows[cur.rows.length - 1][1] += ` ${line}`;
  }
  if (cur) blocks.push(cur);

  return blocks
    .map(
      (b) => `<div class="pf">
  <p class="pf__name"><span class="label">포트폴리오</span>${LINK_ICON}${inline(b.name)}</p>
  ${b.rows
    .map(([k, v]) => `<p class="kv"><span class="k">${escapeHtml(k)}</span>${inline(v)}</p>`)
    .join("\n  ")}
</div>`
    )
    .join("\n");
}

const SECTIONS = [
  { match: (t) => t === "간략 소개", title: "간략 소개", render: renderIntro },
  { match: (t) => t === "핵심 역량", title: "핵심 역량", render: renderBlock },
  { match: (t) => t === "나의 스킬", title: "나의 스킬", render: renderSkillsChips },
  { match: (t) => t === "학력", title: "학력", render: renderEntries },
  {
    match: (t) => t.startsWith("경력") && !t.startsWith("경력기술서"),
    title: "경력",
    total: (t) => t.replace(/^경력\s*/, "").trim(),
    render: renderEntries
  },
  { match: (t) => t === "경력기술서", title: "경력기술서", cls: "desc", render: renderBlock },
  { match: (t) => t.startsWith("경험"), title: "경험 / 활동 / 교육", render: renderEntries },
  { match: (t) => t.startsWith("포트폴리오"), title: "포트폴리오 및 기타문서", render: renderPortfolio },
  { match: (t) => t === "기타", title: "기타", render: renderBlock }
];

/* 제출본 프리앰블 표에서 요약 카드 값을 뽑는다.
   | 학력 | ... | / | 경력 | ... | / | 희망연봉 | ... | / | 포트폴리오 | ... | */
function parseSummaryCards(preamble) {
  const table = {};
  for (const m of preamble.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)) {
    table[m[1].trim()] = m[2].trim();
  }
  const eduRaw = table["학력"] || "";
  const eduSub = eduRaw.match(/\s(졸업|재학|수료|중퇴)\s*$/);
  return [
    { label: "학력", value: eduSub ? eduRaw.slice(0, eduSub.index).trim() : eduRaw, sub: eduSub ? eduSub[1] : "" },
    { label: "직무", value: ROLE_LINE, sub: "" },
    { label: "경력", value: table["경력"] || "", sub: "" },
    { label: "희망연봉", value: table["희망연봉"] || "", sub: "" },
    { label: "포트폴리오", value: table["포트폴리오"] || "", sub: "" }
  ];
}

/* 제출본 마크다운을 파싱한다. 첫 `## ` 이전(이름 h1, 성별/나이 줄, 연락처 표, 스킬 태그 줄)은
   요약 표만 읽고 나머지는 버린다. */
export function parseSubmitted(rawMd) {
  const versionMatch = rawMd.match(/hiring-document-version:\s*(v[\d.]+)/i);
  const version = versionMatch ? versionMatch[1] : "unknown";

  const md = normalizeForPublic(rawMd);
  const firstHeading = md.indexOf("\n## ");
  if (firstHeading < 0) fail(`${SOURCE_REL} 에서 '## ' 섹션을 찾지 못했습니다`);

  const preamble = md.slice(0, firstHeading);
  const cards = parseSummaryCards(preamble);

  const rest = md.slice(firstHeading + 1);
  const chunks = rest.split(/\n## /).map((c, i) => (i === 0 ? c.replace(/^## /, "") : c));
  const sections = [];
  for (const chunk of chunks) {
    const nl = chunk.indexOf("\n");
    const rawTitle = (nl < 0 ? chunk : chunk.slice(0, nl)).trim();
    const body = nl < 0 ? "" : chunk.slice(nl + 1).trim();
    const spec = SECTIONS.find((s) => s.match(rawTitle));
    if (!spec) continue;
    sections.push({
      title: spec.title,
      total: spec.total ? spec.total(rawTitle) : "",
      cls: spec.cls || "",
      html: spec.render(body)
    });
  }
  return { version, cards, sections };
}

function buildHtml({ cards, sections }, css, fontFaces) {
  const contactHtml = CONTACT.map((c) => `<a href="${c.href}">${c.label}</a>`).join(
    '<span class="sep">|</span>'
  );

  const cardsHtml = cards
    .map(
      (c) => `<div class="card">
  <p class="card__label">${escapeHtml(c.label)}</p>
  <p class="card__value">${escapeHtml(c.value)}</p>${
        c.sub ? `\n  <p class="card__sub">${escapeHtml(c.sub)}</p>` : ""
      }
</div>`
    )
    .join("\n");

  const sectionsHtml = sections
    .map(
      (s) => `<section class="section${s.cls ? ` ${s.cls}` : ""}">
  <h2>${escapeHtml(s.title)}${s.total ? ` <span class="total">${escapeHtml(s.total)}</span>` : ""}</h2>
${s.html}
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
    <h1 class="rhead__name">${NAME} <span class="rhead__pill">${escapeHtml(STATUS_PILL)}</span></h1>
    <p class="rhead__role">${ROLE_LINE}</p>
    <p class="rhead__contact">${contactHtml}</p>
  </header>
  <section class="summary">
${cardsHtml}
  </section>
${sectionsHtml}
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
  return `@font-face{font-family:"${family}";src:url("data:font/ttf;base64,${buffer.toString(
    "base64"
  )}") format("truetype");font-weight:${weight};font-style:normal;font-display:swap;}`;
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
  if (parsed.cards.some((c) => !c.value)) {
    fail(`요약 카드 값이 비었습니다: ${JSON.stringify(parsed.cards)}. 제출본 상단 표를 확인하세요.`);
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
    // 여백은 resume.css 의 @page / @page :first 가 정한다 (1쪽 50/110/50/100px,
    // 2쪽부터 아래 60px). page.pdf 마진은 0 으로 두고 CSS 에 맡긴다.
    await page.pdf({
      path: OUTPUT_PATH,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" }
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
