import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptPath = fileURLToPath(import.meta.url);
export const projectRoot = path.resolve(path.dirname(scriptPath), "..");
export const sourceRoot = path.join(projectRoot, "source", "project-covers");
export const publicRoot = path.join(projectRoot, "public", "media", "projects");
export const manifestPath = path.join(sourceRoot, "manifest.json");

export const PROJECT_COVER_SLUGS = Object.freeze([
  "hajacheck",
  "ml-economics-answers",
  "machine-learning-oil",
  "plushome",
  "deep-learning-sleep",
  "advanced-project",
  "pet-platform-project",
  "project-final",
  "bmi-calculator"
]);

export const PROJECT_MEDIA_VARIANTS = Object.freeze({
  "cover.webp": { width: 1600, height: 1000, maxBytes: 250_000, source: "desktop" },
  "cover-960w.webp": { width: 960, height: 600, maxBytes: 140_000, source: "desktop" },
  "cover-480w.webp": { width: 480, height: 300, maxBytes: 70_000, source: "desktop" },
  "cover-mobile.webp": { width: 960, height: 720, maxBytes: 140_000, source: "mobile" },
  "cover-mobile-480w.webp": { width: 480, height: 360, maxBytes: 70_000, source: "mobile" },
  "cover-og.webp": { width: 1200, height: 630, maxBytes: 180_000, source: "desktop", fit: "cover" }
});

const SCREEN_PROJECTS = new Set([
  "machine-learning-oil",
  "bmi-calculator",
  "hajacheck",
  "ml-economics-answers",
  "deep-learning-sleep"
]);
const MEDIA_MANIFEST_VERSION = 4;
export const PROJECT_DETAIL_MEDIA = Object.freeze({
  hajacheck: [
    { id: "dashboard", source: "dashboard.jpg" },
    { id: "ai-detection", source: "ai-detection.jpg" }
  ],
  "ml-economics-answers": [
    { id: "app", source: "app.jpg" },
    { id: "rag-relevance", source: "rag-relevance.jpg" }
  ],
  "machine-learning-oil": [
    { id: "actual-vs-pred", source: "actual-vs-pred.jpg" },
    { id: "feature-contribution", source: "feature-contribution.jpg" }
  ],
  "deep-learning-sleep": [
    { id: "forecast-app", source: "forecast-app.png" },
    { id: "roc-pr", source: "roc-pr.webp" },
    { id: "bootstrap-ci", source: "bootstrap-ci.webp" }
  ],
  "bmi-calculator": [
    { id: "history", source: "history.png" },
    { id: "statistics", source: "statistics.webp" }
  ]
});
// SCREEN_PROJECTS 대표 커버의 원본 이미지·오버레이 문구. machine-learning-oil·bmi-calculator는
// 기존 public/media/projects/ 아래 평면 webp를 그대로 쓰고, 나머지는 PROJECT_DETAIL_MEDIA와
// 같은 실제 화면(source/project-visuals/)을 커버로도 재사용한다.
const SCREEN_EVIDENCE = Object.freeze({
  "machine-learning-oil": {
    input: path.join(publicRoot, "machine-learning-oil-dashboard.webp"),
    title: "48개월 테스트 · R² 0.9278",
    desktopSubtitle: "실제 Streamlit 대시보드 · 과거 테스트 성능",
    mobileSubtitle: "실제 Streamlit 대시보드",
    mobilePosition: "north"
  },
  "bmi-calculator": {
    input: path.join(publicRoot, "bmi-calculator-example-result.webp"),
    title: "실제 UI · 3계층 · 주요 라우트 11개",
    desktopSubtitle: "예시 입력값만 사용 · routes → services → models",
    mobileSubtitle: "예시 입력값만 사용",
    mobilePosition: "centre"
  },
  hajacheck: {
    input: path.join(projectRoot, "source", "project-visuals", "hajacheck", "dashboard.jpg"),
    title: "실제 대시보드 화면",
    desktopSubtitle: "시설물 현황 · AI 주간 브리핑 · 처리 대기 하자",
    mobileSubtitle: "시설물 현황 · AI 주간 브리핑",
    mobilePosition: "north"
  },
  "ml-economics-answers": {
    input: path.join(projectRoot, "source", "project-visuals", "ml-economics-answers", "app.jpg"),
    title: "실제 Streamlit 실행 화면",
    desktopSubtitle: "질문 입력부터 근거가 포함된 답변까지",
    mobileSubtitle: "질문부터 근거 포함 답변까지",
    mobilePosition: "north"
  },
  "deep-learning-sleep": {
    input: path.join(projectRoot, "source", "project-visuals", "deep-learning-sleep", "forecast-app.png"),
    title: "실제 Streamlit 실행 화면",
    desktopSubtitle: "취침 전 입력만으로 오늘 밤 수면 예측",
    mobileSubtitle: "취침 전 입력으로 수면 예측",
    mobilePosition: "north"
  }
});

export const PROJECT_DETAIL_VARIANTS = Object.freeze({
  ".webp": { width: 1600, height: 1000, maxBytes: 300_000 },
  "-960w.webp": { width: 960, height: 600, maxBytes: 180_000 },
  "-480w.webp": { width: 480, height: 300, maxBytes: 90_000 }
});
const palette = { paper: "#F2F0EA", ink: "#161914", muted: "#696B64", rule: "#C9C7BE", accent: "#C2410C", soft: "#E9DED1", white: "#FFFFFF" };
const PROJECT_NUMBERS = Object.fromEntries(PROJECT_COVER_SLUGS.map((slug, index) => [slug, String(index + 1).padStart(2, "0")]));

const escapeXml = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const text = (x, y, value, size = 26, weight = 500, fill = palette.ink, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="Polalise Sans, Pretendard, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
const monoText = (x, y, value, size = 18, weight = 600, fill = palette.ink, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="IBM Plex Mono, Consolas, monospace" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
const line = (x1, y1, x2, y2, color = palette.rule, width = 2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
const box = (x, y, w, h, label, sub = "", accent = false, font = 26) => [
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${accent ? palette.ink : palette.white}" stroke="${accent ? palette.ink : palette.rule}" stroke-width="2"/>`,
  text(x + w / 2, y + h / 2 - (sub ? 5 : -8), label, font, 700, accent ? palette.paper : palette.ink, "middle"),
  sub ? text(x + w / 2, y + h / 2 + 30, sub, 18, 500, accent ? "#D6D8D0" : palette.muted, "middle") : ""
].join("");
const arrow = (x1, y1, x2, y2) => `${line(x1, y1, x2, y2, palette.accent, 3)}<path d="M ${x2} ${y2} l -14 -8 v 16 z" fill="${palette.accent}"/>`;
const arrowDown = (x, y1, y2) => `${line(x, y1, x, y2, palette.accent, 3)}<path d="M ${x} ${y2} l -8 -14 h 16 z" fill="${palette.accent}"/>`;

function frame(width, height, slug, kicker, _title, subtitle, body) {
  const pad = width >= 1200 ? 72 : 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(subtitle)}">
  <rect width="${width}" height="${height}" fill="${palette.paper}"/>
  <rect width="18" height="${height}" fill="${palette.accent}"/>
  ${line(pad, 72, width - pad, 72, palette.ink, 2)}
  ${monoText(pad, 116, `PROJECT / ${PROJECT_NUMBERS[slug]} · ${slug.toUpperCase()}`, 17, 700, palette.accent)}
  ${monoText(pad, 158, kicker.toUpperCase(), 18, 600, palette.muted)}
  ${text(pad, 213, subtitle, width >= 1200 ? 32 : 24, 700, palette.ink)}
  ${body}
  ${line(pad, height - 76, width - pad, height - 76, palette.rule, 2)}
  ${monoText(pad, height - 35, `PROJECT / ${PROJECT_NUMBERS[slug]}`, 16, 700, palette.muted)}
  ${monoText(width - pad, height - 35, "POLALISE / EVIDENCE COVER", 16, 500, palette.muted, "end")}
  </svg>`;
}

function hajacheck(w, h) {
  const mobile = w < 1200; const y = mobile ? 330 : 390; const gap = mobile ? 18 : 24; const bw = (w - (mobile ? 96 : 144) - gap * 3) / 4; const x0 = mobile ? 48 : 72;
  const labels = [["01", "사진 업로드"], ["02", "AI 탐지·등급화"], ["03", "사람 검수"], ["04", "LLM 보고서 초안"]];
  let body = "";
  labels.forEach(([n, label], i) => { const x = x0 + i * (bw + gap); body += text(x, y - 24, n, 17, 700, palette.accent); body += box(x, y, bw, mobile ? 126 : 160, label, i === 2 ? "최종 판단" : "", i === 2, mobile ? 19 : 25); if (i < 3) body += arrow(x + bw, y + (mobile ? 63 : 80), x + bw + gap - 4, y + (mobile ? 63 : 80)); });
  body += text(x0, y + (mobile ? 180 : 226), "AI가 최종 판단하지 않는다 · 사람 검수 이후 보고서 초안 생성", mobile ? 19 : 24, 600, palette.muted);
  return frame(w, h, "hajacheck", "AI-assisted defect management", "HajaCheck", "탐지에서 검수와 보고서 초안까지 이어지는 팀 서비스 흐름", body);
}

function economics(w, h) {
  const mobile = w < 1200; const x = mobile ? 48 : 72; const y = mobile ? 318 : 340; const routerW = mobile ? 180 : 280;
  let body = box(x, y, routerW, mobile ? 120 : 176, "질문 라우터", "7개 답변 모드", true, mobile ? 19 : 30);
  const modes = ["API 조회", "시계열 분석", "ML 예측", "RAG 근거", "복합 모드", "지원 불가", "상태 점검"];
  const gridX = x + routerW + (mobile ? 30 : 76); const cols = mobile ? 3 : 4; const bw = mobile ? 190 : 250; const bh = mobile ? 60 : 72; const gx = mobile ? 12 : 20; const gy = mobile ? 12 : 16;
  body += arrow(x + routerW, y + (mobile ? 60 : 88), gridX - 8, y + (mobile ? 60 : 88));
  modes.forEach((m, i) => { const xx = gridX + (i % cols) * (bw + gx); const yy = y + Math.floor(i / cols) * (bh + gy); body += box(xx, yy, bw, bh, m, "", false, mobile ? 18 : 21); });
  const metricY = mobile ? 548 : 670; body += text(x, metricY, "독립 수기 HOLDOUT · 75문항", mobile ? 18 : 21, 700, palette.muted); body += text(x, metricY + 62, "41.3%", mobile ? 46 : 62, 800); body += arrow(x + (mobile ? 170 : 220), metricY + 44, x + (mobile ? 300 : 390), metricY + 44); body += text(x + (mobile ? 330 : 430), metricY + 62, "80.0%", mobile ? 46 : 62, 800, palette.accent);
  return frame(w, h, "ml-economics-answers", "Evidence-routed economic Q&A", "ML Economics Answers", "질문마다 필요한 데이터·분석·예측·근거 경로만 실행", body);
}

function plushome(w, h) {
  const mobile = w < 1200;
  const inputY = mobile ? 300 : 330;
  const inputX = mobile ? 48 : 72;
  const inputW = mobile ? 220 : 260;
  const inputH = mobile ? 78 : 92;
  const inputGap = mobile ? 18 : 24;
  const dashboardX = mobile ? 196 : 550;
  const dashboardY = mobile ? 430 : 430;
  const dashboardW = mobile ? 420 : 470;
  const dashboardH = mobile ? 120 : 250;
  const outputX = mobile ? 690 : 1170;
  let body = "";
  ["주문", "예약", "견적"].forEach((label, index) => {
    const x = inputX + index * (inputW + inputGap);
    body += box(x, inputY, inputW, inputH, label, "업무 요청", false, mobile ? 18 : 22);
    body += line(x + inputW / 2, inputY + inputH, dashboardX + dashboardW / 2, dashboardY, palette.accent, 2);
  });
  body += box(dashboardX, dashboardY, dashboardW, dashboardH, "기업 회원 대시보드", "조회 · 처리 · PDF 출력", true, mobile ? 21 : 30);
  body += arrow(dashboardX + dashboardW, dashboardY + dashboardH * .35, outputX - 10, dashboardY + dashboardH * .35);
  body += arrow(dashboardX + dashboardW, dashboardY + dashboardH * .72, outputX - 10, dashboardY + dashboardH * .72);
  body += box(outputX, dashboardY + (mobile ? 4 : 16), mobile ? 220 : 300, mobile ? 68 : 88, "통계 API", "집계 조회", false, mobile ? 17 : 22);
  body += box(outputX, dashboardY + (mobile ? 84 : 142), mobile ? 220 : 300, mobile ? 68 : 88, "DB", "저장 · 조회", false, mobile ? 17 : 22);
  body += text(inputX, mobile ? 624 : 785, "담당 범위 · 초기 구조·DB 설계 / 기업 회원·관리자 / 이미지·통계 API", mobile ? 17 : 22, 650, palette.muted);
  return frame(w,h,"plushome","Housing commerce workflow","PlusHome","쇼핑과 인테리어 상담을 역할별 업무 흐름으로 연결",body);
}

function sleep(w,h) {
  const mobile=w<1200,x=mobile?48:72,y=mobile?326:350,barW=mobile?650:1080;
  let body=text(x,y,"처음 · 같은 날짜로 결합",mobile?18:22,700,palette.muted); body+=`<rect x="${x}" y="${y+28}" width="${barW*.38}" height="76" fill="#D9E4F5"/><rect x="${x+barW*.38}" y="${y+28}" width="${barW*.62}" height="76" fill="#F1B6A5"/>`; body+=text(x+barW*.19,y+76,"취침 전",mobile?18:23,700,palette.ink,"middle"); body+=text(x+barW*.69,y+76,"수면 중·후 데이터 누수",mobile?18:23,700,palette.ink,"middle");
  const y2=y+(mobile?150:180); body+=text(x,y2,"수정 · 예측 시점을 수면 시작으로 고정",mobile?18:22,700,palette.muted); body+=`<rect x="${x}" y="${y2+28}" width="${barW*.62}" height="76" fill="#BCDDA3"/><rect x="${x+barW*.62}" y="${y2+28}" width="${barW*.38}" height="76" fill="#E5E3DC"/>`; body+=text(x+barW*.31,y2+76,"사용 가능",mobile?18:23,700,palette.ink,"middle"); body+=text(x+barW*.81,y2+76,"입력 제외",mobile?18:23,700,palette.muted,"middle");
  body+=text(mobile?735:1280,mobile?635:750,"0.6492",mobile?50:76,800,palette.accent,"end"); body+=text(mobile?735:1280,mobile?675:795,"Held-out Balanced Accuracy",mobile?16:22,600,palette.muted,"end");
  return frame(w,h,"deep-learning-sleep","Leakage-aware sleep forecasting","Deep Learning Sleep","수면 이후 정보를 제거해 실제 취침 전 예측 문제로 재정의",body);
}

function advanced(w,h) {
  const mobile=w<1200;
  const mapX=mobile?48:72,mapY=mobile?294:310,mapW=mobile?500:790,mapH=mobile?260:420;
  const panelX=mobile?582:960,panelW=mobile?330:560;
  let body=`<rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" rx="8" fill="${palette.soft}" stroke="${palette.rule}" stroke-width="2"/>`;
  for(let i=1;i<5;i++) body+=line(mapX,Math.round(mapY+mapH*i/5),mapX+mapW,Math.round(mapY+mapH*i/5),palette.white,2);
  for(let i=1;i<6;i++) body+=line(Math.round(mapX+mapW*i/6),mapY,Math.round(mapX+mapW*i/6),mapY+mapH,palette.white,2);
  [[.22,.32],[.55,.62],[.78,.27]].forEach(([px,py],index)=>{const x=mapX+mapW*px,y=mapY+mapH*py;body+=`<circle cx="${x}" cy="${y}" r="${mobile?12:17}" fill="${index===1?palette.ink:palette.accent}"/><circle cx="${x}" cy="${y}" r="${mobile?4:6}" fill="${palette.paper}"/>`;});
  body+=monoText(mapX+20,mapY+34,"01 / 매물 탐색",mobile?15:19,700,palette.ink);
  body+=box(panelX,mapY,panelW,mobile?112:174,"상세 비교","매물 정보 확인",true,mobile?20:29);
  body+=box(panelX+(mobile?56:120),mapY+(mobile?146:246),panelW-(mobile?56:120),mobile?112:174,"상담 예약","예약 · 일정",false,mobile?20:29);
  body+=arrowDown(panelX+panelW/2,mapY+(mobile?112:174),mapY+(mobile?136:230));
  body+=monoText(mapX,mobile?596:790,"TEAM SERVICE SCOPE",mobile?16:20,700,palette.accent);
  body+=text(mapX,mobile?626:832,"팀 산출물 · 개인 담당 범위 미확인",mobile?17:22,600,palette.muted);
  return frame(w,h,"advanced-project","Verified team-service scope","PPAP 부동산 플랫폼","지도 타일과 출처 불명 매물 사진 없이 확인된 서비스 범위만 표현",body);
}

function pet(w,h) {
  const mobile=w<1200,cx=w/2,bw=mobile?620:760,bh=mobile?64:96,gap=mobile?20:30;
  const y0=mobile?286:300;
  let body=box(cx-bw/2,y0,bw,bh,"Browser","요청",false,mobile?19:25);
  body+=arrowDown(cx,y0+bh,y0+bh+gap-4);
  body+=box(cx-bw/2,y0+bh+gap,bw,bh,"Servlet","요청 처리",true,mobile?19:25);
  body+=arrowDown(cx,y0+(bh+gap)*2-gap,y0+(bh+gap)*2-4);
  const splitY=y0+(bh+gap)*2;
  body+=box(cx-bw/2,splitY,bw*.47,bh,"JSP","화면 렌더링",false,mobile?18:24);
  body+=box(cx+bw*.03,splitY,bw*.47,bh,"JDBC","데이터 접근",false,mobile?18:24);
  body+=line(cx-bw*.265,splitY+bh,cx,splitY+bh+gap,palette.accent,2);
  body+=line(cx+bw*.265,splitY+bh,cx,splitY+bh+gap,palette.accent,2);
  body+=box(cx-bw/2,splitY+bh+gap,bw,bh,"Oracle","관계형 데이터 저장",false,mobile?19:25);
  body+=monoText(mobile?48:72,mobile?634:824,"TEAM PROJECT · 구조만 요약",mobile?15:20,700,palette.accent);
  return frame(w,h,"pet-platform-project","Traditional Java web architecture","Pet Platform Project","Servlet/JSP 요청 처리와 Oracle 데이터 연동 구조",body);
}

function finalProject(w,h) {
  const mobile=w<1200,cx=w/2,cy=mobile?480:545,centerW=mobile?270:360,centerH=mobile?118:150;let body=box(cx-centerW/2,cy-centerH/2,centerW,centerH,"마이페이지","계정 중심 활동 허브",true,mobile?22:30);const nodes=mobile?[[180,355,"찜"],[780,355,"신고"],[180,625,"거래 목록"],[780,625,"리뷰"]]:[[280,390,"찜"],[1320,390,"신고"],[280,720,"거래 목록"],[1320,720,"리뷰"]];nodes.forEach(([x,y,label])=>{const bw=mobile?180:260,bh=mobile?78:96;body+=box(x-bw/2,y-bh/2,bw,bh,label,"",false,mobile?20:27);body+=line(cx+(x<cx?-centerW/2:centerW/2),cy,x+(x<cx?bw/2:-bw/2),y,palette.accent,3)});body+=text(mobile?48:72,mobile?690:845,"개인 담당으로 기록된 기능 범위",mobile?17:21,700,palette.accent);
  return frame(w,h,"project-final","Account-centered activity history","Project Final","찜·신고·거래·리뷰 이력을 마이페이지에서 연결",body);
}

const SOURCE_BUILDERS={
  "hajacheck":hajacheck,"ml-economics-answers":economics,"plushome":plushome,"deep-learning-sleep":sleep,
  "advanced-project":advanced,"pet-platform-project":pet,"project-final":finalProject
};

async function writeIfChanged(file, contents) {
  const buffer=Buffer.isBuffer(contents)?contents:Buffer.from(contents); let same=false;
  try { same=(await readFile(file)).equals(buffer); } catch {}
  if(!same){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,buffer)}
}

// 좌표 계산에서 나오는 반복 소수(예: 335.33 이 열세 자리까지 이어지는 값)를
// 2자리로 줄인다. 소수점을 뺀 13자리 연속 숫자가 audit-public 의 주민등록번호
// 패턴(6자리 + 1~4 로 시작하는 7자리)에 걸려 공개 감사가 멈춘다.
// 1600x1000 캔버스에서 0.01px 차이는 렌더링에 드러나지 않는다.
// 주석에 그 숫자를 예시로 적는 것도 같은 이유로 안 된다. 감사는 소스도 스캔한다.
function trimDecimals(svg){
  return String(svg).replace(/\d+\.\d{3,}/g,(n)=>String(Math.round(Number(n)*100)/100));
}

async function buildDiagramSources(slug,builder){
  await writeIfChanged(path.join(sourceRoot,slug,"desktop.svg"),trimDecimals(builder(1600,1000)));
  await writeIfChanged(path.join(sourceRoot,slug,"mobile.svg"),trimDecimals(builder(960,720)));
}

async function buildScreenSources(slug){
  const {input,title,desktopSubtitle,mobileSubtitle,mobilePosition}=SCREEN_EVIDENCE[slug];
  const desktopOverlay=Buffer.from(`<svg width="1600" height="1000" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="850" width="1600" height="150" fill="#161914" fill-opacity=".94"/><text x="64" y="920" font-family="Pretendard,Arial,sans-serif" font-size="34" font-weight="700" fill="#F2F0EA">${escapeXml(title)}</text><text x="64" y="962" font-family="Pretendard,Arial,sans-serif" font-size="20" fill="#C7C8C1">${escapeXml(desktopSubtitle)}</text></svg>`);
  const mobileOverlay=Buffer.from(`<svg width="960" height="720" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="590" width="960" height="130" fill="#161914" fill-opacity=".94"/><text x="40" y="650" font-family="Pretendard,Arial,sans-serif" font-size="28" font-weight="700" fill="#F2F0EA">${escapeXml(title)}</text><text x="40" y="690" font-family="Pretendard,Arial,sans-serif" font-size="17" fill="#C7C8C1">${escapeXml(mobileSubtitle)}</text></svg>`);
  const desktop=await sharp(input).resize(1600,1000,{fit:"cover",position:"north"}).composite([{input:desktopOverlay}]).png({compressionLevel:9}).toBuffer();
  const mobile=await sharp(input).resize(960,720,{fit:"cover",position:mobilePosition}).composite([{input:mobileOverlay}]).png({compressionLevel:9}).toBuffer();
  await writeIfChanged(path.join(sourceRoot,slug,"desktop.png"),desktop); await writeIfChanged(path.join(sourceRoot,slug,"mobile.png"),mobile);
}

function projectSourceFiles(root, slug) {
  const extension = SCREEN_PROJECTS.has(slug) ? "png" : "svg";
  const files = [
    path.join(root, "source", "project-covers", slug, `desktop.${extension}`),
    path.join(root, "source", "project-covers", slug, `mobile.${extension}`)
  ];
  if (SCREEN_PROJECTS.has(slug)) {
    files.push(SCREEN_EVIDENCE[slug].input);
  }
  return files;
}

async function mediaFingerprint(root = projectRoot) {
  const hash = createHash("sha256");
  hash.update(`project-media-manifest-v${MEDIA_MANIFEST_VERSION}\0`);
  const inputs = [
    path.join(root, "scripts", "project-media.mjs"),
    ...PROJECT_COVER_SLUGS.flatMap((slug) => projectSourceFiles(root, slug)),
    ...Object.entries(PROJECT_DETAIL_MEDIA).flatMap(([slug, visuals]) =>
      visuals.map(({ source }) => path.join(root, "source", "project-visuals", slug, source))
    )
  ];
  for (const input of inputs) {
    hash.update(`${path.relative(root, input).split(path.sep).join("/")}\0`);
    const extension = path.extname(input).toLowerCase();
    const contents = await readFile(input);
    hash.update(
      extension === ".mjs" || extension === ".svg"
        ? Buffer.from(contents.toString("utf8").replace(/\r\n?/g, "\n"))
        : contents
    );
    hash.update("\0");
  }
  return hash.digest("hex").match(/.{2}/g).join(":");
}

function mediaOutputFiles(root = projectRoot) {
  const covers = PROJECT_COVER_SLUGS.flatMap((slug) =>
    Object.keys(PROJECT_MEDIA_VARIANTS).map((name) => path.join(
      root,
      "public",
      "media",
      "projects",
      slug,
      name
    ))
  );
  const details = Object.entries(PROJECT_DETAIL_MEDIA).flatMap(([slug, visuals]) =>
    visuals.flatMap(({ id }) => Object.keys(PROJECT_DETAIL_VARIANTS).map((suffix) => path.join(
      root,
      "public",
      "media",
      "projects",
      slug,
      "visuals",
      `${id}${suffix}`
    )))
  );
  return [...covers, ...details];
}

async function fileSha256(file) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex")
    .match(/.{2}/g)
    .join(":");
}

async function writeMediaManifest(root = projectRoot) {
  const outputs = {};
  for (const output of mediaOutputFiles(root)) {
    outputs[path.relative(root, output).split(path.sep).join("/")] = await fileSha256(output);
  }
  const manifest = {
    version: MEDIA_MANIFEST_VERSION,
    inputFingerprint: await mediaFingerprint(root),
    outputs
  };
  await writeFile(
    path.join(root, "source", "project-covers", "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

export async function buildProjectMedia(root=projectRoot){
  if(path.resolve(root)!==projectRoot) throw new Error("Custom build roots are not supported; validation roots are supported.");
  for(const slug of PROJECT_COVER_SLUGS){
    if(SCREEN_PROJECTS.has(slug)) await buildScreenSources(slug); else await buildDiagramSources(slug,SOURCE_BUILDERS[slug]);
    const ext=SCREEN_PROJECTS.has(slug)?"png":"svg";
    const destination=path.join(publicRoot,slug); await mkdir(destination,{recursive:true});
    for(const [name,spec] of Object.entries(PROJECT_MEDIA_VARIANTS)){
      const source=path.join(sourceRoot,slug,`${spec.source}.${ext}`); let pipeline=sharp(source).resize(spec.width,spec.height,{fit:spec.fit??"fill",position:"centre"});
      pipeline=SCREEN_PROJECTS.has(slug)?pipeline.webp({quality:84,effort:6}):pipeline.webp({lossless:true,effort:6});
      // Always rewrite generated outputs so mtime-based freshness remains meaningful
      // after the generator itself changes, even when encoded bytes are identical.
      await writeFile(path.join(destination,name),await pipeline.toBuffer());
    }
  }
  for(const [slug,visuals] of Object.entries(PROJECT_DETAIL_MEDIA)){
    const destination=path.join(publicRoot,slug,"visuals"); await mkdir(destination,{recursive:true});
    for(const {id,source} of visuals){
      const input=path.join(projectRoot,"source","project-visuals",slug,source);
      for(const [suffix,spec] of Object.entries(PROJECT_DETAIL_VARIANTS)){
        const output=path.join(destination,`${id}${suffix}`);
        await writeFile(output,await sharp(input)
          .resize(spec.width,spec.height,{fit:"contain",position:"centre",background:palette.paper})
          .webp({quality:84,effort:6})
          .toBuffer());
      }
    }
  }
  await writeMediaManifest(root);
  const errors=await validateProjectMedia(root); if(errors.length) throw new Error(`Generated project media failed validation:\n${errors.join("\n")}`);
}

export async function validateProjectMedia(root=projectRoot){
  const errors=[]; const rootSource=path.join(root,"source","project-covers"); const rootPublic=path.join(root,"public","media","projects");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(rootSource, "manifest.json"), "utf8"));
    if (manifest.version !== MEDIA_MANIFEST_VERSION || manifest.inputFingerprint !== await mediaFingerprint(root)) {
      errors.push("source/project-covers/manifest.json: stale; run npm run media:build");
    }
    const expectedOutputs = mediaOutputFiles(root)
      .map((file) => path.relative(root, file).split(path.sep).join("/"))
      .sort();
    const declaredOutputs = manifest.outputs && typeof manifest.outputs === "object"
      ? Object.keys(manifest.outputs).sort()
      : [];
    if (JSON.stringify(declaredOutputs) !== JSON.stringify(expectedOutputs)) {
      errors.push("source/project-covers/manifest.json: output set does not match the media contract");
    }
  } catch (error) {
    errors.push(`source/project-covers/manifest.json: missing or unreadable manifest (${error.code??error.message})`);
  }
  for(const slug of PROJECT_COVER_SLUGS){
    const ext=SCREEN_PROJECTS.has(slug)?"png":"svg"; const sources=[path.join(rootSource,slug,`desktop.${ext}`),path.join(rootSource,slug,`mobile.${ext}`)];
    for(const suffix of [".webp","-960w.webp","-480w.webp"]){const legacy=path.join(rootPublic,`${slug}${suffix}`);try{if((await stat(legacy)).isFile())errors.push(`${path.relative(root,legacy)}: legacy flat cover must be removed`)}catch{}}
    if(SCREEN_PROJECTS.has(slug)){
      const evidence=SCREEN_EVIDENCE[slug].input;
      try{await stat(evidence)}catch(error){errors.push(`${path.relative(root,evidence)}: missing screen evidence (${error.code??error.message})`)}
    }
    for(const source of sources){try{const meta=await sharp(source).metadata();const expected=source.includes("mobile")?[960,720]:[1600,1000];if(meta.width!==expected[0]||meta.height!==expected[1])errors.push(`${path.relative(root,source)}: expected ${expected.join("x")}, got ${meta.width}x${meta.height}`)}catch(error){errors.push(`${path.relative(root,source)}: missing or unreadable source (${error.code??error.message})`)}}
    for(const [name,spec] of Object.entries(PROJECT_MEDIA_VARIANTS)){const file=path.join(rootPublic,slug,name);try{const s=await stat(file);const meta=await sharp(file).metadata();const manifestKey=path.relative(root,file).split(path.sep).join("/");if(meta.format!=="webp")errors.push(`${path.relative(root,file)}: expected WebP, got ${meta.format??"unknown"}`);if(meta.width!==spec.width||meta.height!==spec.height)errors.push(`${path.relative(root,file)}: expected ${spec.width}x${spec.height}, got ${meta.width}x${meta.height}`);if(s.size>spec.maxBytes)errors.push(`${path.relative(root,file)}: ${s.size} bytes exceeds ${spec.maxBytes} byte limit`);if(manifest?.outputs?.[manifestKey]&&manifest.outputs[manifestKey]!==await fileSha256(file))errors.push(`${path.relative(root,file)}: content hash differs from source/project-covers/manifest.json`)}catch(error){errors.push(`${path.relative(root,file)}: missing or unreadable output (${error.code??error.message})`)}}
  }
  for(const [slug,visuals] of Object.entries(PROJECT_DETAIL_MEDIA)){
    for(const {id,source} of visuals){
      try{await sharp(path.join(root,"source","project-visuals",slug,source)).metadata()}catch(error){errors.push(`source/project-visuals/${slug}/${source}: missing or unreadable source (${error.code??error.message})`)}
      for(const [suffix,spec] of Object.entries(PROJECT_DETAIL_VARIANTS)){
        const file=path.join(rootPublic,slug,"visuals",`${id}${suffix}`);
        try{const s=await stat(file);const meta=await sharp(file).metadata();const manifestKey=path.relative(root,file).split(path.sep).join("/");if(meta.format!=="webp")errors.push(`${path.relative(root,file)}: expected WebP, got ${meta.format??"unknown"}`);if(meta.width!==spec.width||meta.height!==spec.height)errors.push(`${path.relative(root,file)}: expected ${spec.width}x${spec.height}, got ${meta.width}x${meta.height}`);if(s.size>spec.maxBytes)errors.push(`${path.relative(root,file)}: ${s.size} bytes exceeds ${spec.maxBytes} byte limit`);if(manifest?.outputs?.[manifestKey]&&manifest.outputs[manifestKey]!==await fileSha256(file))errors.push(`${path.relative(root,file)}: content hash differs from source/project-covers/manifest.json`)}catch(error){errors.push(`${path.relative(root,file)}: missing or unreadable output (${error.code??error.message})`)}
      }
    }
  }
  return errors;
}

async function main(){
  const mode=process.argv[2];
  if(mode==="--build"){await buildProjectMedia();console.log(`Built and validated ${PROJECT_COVER_SLUGS.length} project cover sets.`);return}
  if(mode==="--check"){const errors=await validateProjectMedia();if(errors.length){console.error(`Project media validation failed (${errors.length}):\n- ${errors.join("\n- ")}`);process.exitCode=1}else console.log(`Project media validation passed: ${PROJECT_COVER_SLUGS.length} projects, ${Object.keys(PROJECT_MEDIA_VARIANTS).length} variants each.`);return}
  console.error("Usage: node scripts/project-media.mjs --build|--check");process.exitCode=2;
}

if(path.resolve(process.argv[1]??"")===scriptPath) main().catch((error)=>{console.error(error.stack??error);process.exitCode=1});
