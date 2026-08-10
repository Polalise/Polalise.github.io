"""Build the public, privacy-safe A4 resume PDF for the portfolio site."""

from __future__ import annotations

import sys
from pathlib import Path


try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        BaseDocTemplate,
        Frame,
        KeepTogether,
        PageBreak,
        PageTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
    )
except ImportError as exc:
    raise SystemExit(
        "ReportLab is required. Run this script with the Codex bundled Python "
        "runtime or install reportlab in your active environment."
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "public" / "resume" / "resume.pdf"
FONT_ROOT = (
    PROJECT_ROOT
    / "node_modules"
    / "pretendard"
    / "dist"
    / "public"
    / "static"
    / "alternative"
)

FONT_REGULAR_PATH = FONT_ROOT / "Pretendard-Regular.ttf"
FONT_BOLD_PATH = FONT_ROOT / "Pretendard-Bold.ttf"
FONT_REGULAR = "Pretendard"
FONT_BOLD = "Pretendard-Bold"

INK = colors.HexColor("#171713")
MUTED = colors.HexColor("#67645C")
PAPER = colors.HexColor("#F5F2EA")
ACCENT = colors.HexColor("#C2410C")
HAIRLINE = colors.HexColor("#CDC8BC")
SOFT_ACCENT = colors.HexColor("#EAD9CE")
WHITE = colors.white

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 17 * mm
MARGIN_TOP = 15 * mm
MARGIN_BOTTOM = 14 * mm
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2)


def register_fonts() -> None:
    """Register the required local Korean fonts or fail with an actionable error."""
    missing = [
        str(path)
        for path in (FONT_REGULAR_PATH, FONT_BOLD_PATH)
        if not path.is_file()
    ]
    if missing:
        details = "\n  - ".join(missing)
        raise SystemExit(
            "Pretendard TTF files are required to build the Korean resume. "
            "Install the npm dependency with `npm ci` and confirm these paths:\n"
            f"  - {details}"
        )

    pdfmetrics.registerFont(TTFont(FONT_REGULAR, str(FONT_REGULAR_PATH)))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_BOLD_PATH)))
    pdfmetrics.registerFontFamily(
        "PretendardFamily",
        normal=FONT_REGULAR,
        bold=FONT_BOLD,
        italic=FONT_REGULAR,
        boldItalic=FONT_BOLD,
    )


def draw_page(canvas, document) -> None:
    """Paint a restrained editorial frame behind selectable resume text."""
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    canvas.setFillColor(ACCENT)
    canvas.rect(0, PAGE_HEIGHT - 5 * mm, PAGE_WIDTH, 5 * mm, fill=1, stroke=0)

    canvas.restoreState()


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "Name",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=27,
            leading=31,
            textColor=INK,
            spaceAfter=1.5 * mm,
            wordWrap="CJK",
        ),
        "position": ParagraphStyle(
            "Position",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=11.2,
            leading=15,
            textColor=ACCENT,
            spaceAfter=2.2 * mm,
            wordWrap="CJK",
        ),
        "contact": ParagraphStyle(
            "Contact",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8.2,
            leading=11.5,
            textColor=MUTED,
            wordWrap="CJK",
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8.2,
            leading=10,
            textColor=ACCENT,
            spaceBefore=3.3 * mm,
            spaceAfter=2.0 * mm,
            uppercase=True,
        ),
        "summary": ParagraphStyle(
            "Summary",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=9.4,
            leading=14.1,
            textColor=INK,
            wordWrap="CJK",
        ),
        "role": ParagraphStyle(
            "Role",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=11.2,
            leading=14.5,
            textColor=INK,
            wordWrap="CJK",
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.8,
            leading=10.5,
            textColor=MUTED,
            wordWrap="CJK",
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8.65,
            leading=12.8,
            textColor=INK,
            wordWrap="CJK",
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8.45,
            leading=12.2,
            leftIndent=3.6 * mm,
            firstLineIndent=-3.6 * mm,
            spaceAfter=1.0 * mm,
            textColor=INK,
            wordWrap="CJK",
        ),
        "metric_value": ParagraphStyle(
            "MetricValue",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=15.4,
            leading=18,
            textColor=INK,
            alignment=TA_LEFT,
            wordWrap="CJK",
        ),
        "metric_label": ParagraphStyle(
            "MetricLabel",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.1,
            leading=9.5,
            textColor=MUTED,
            wordWrap="CJK",
        ),
        "project_title": ParagraphStyle(
            "ProjectTitle",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=11.1,
            leading=14.4,
            textColor=INK,
            wordWrap="CJK",
        ),
        "project_index": ParagraphStyle(
            "ProjectIndex",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=16.5,
            leading=18,
            textColor=ACCENT,
            alignment=TA_RIGHT,
        ),
        "skill_key": ParagraphStyle(
            "SkillKey",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.8,
            leading=10.5,
            textColor=ACCENT,
            wordWrap="CJK",
        ),
        "skill_value": ParagraphStyle(
            "SkillValue",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.8,
            leading=10.5,
            textColor=INK,
            wordWrap="CJK",
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.35,
            leading=10.1,
            textColor=MUTED,
            wordWrap="CJK",
        ),
        "principle_title": ParagraphStyle(
            "PrincipleTitle",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8.1,
            leading=10.5,
            textColor=INK,
            wordWrap="CJK",
        ),
        "principle_body": ParagraphStyle(
            "PrincipleBody",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.35,
            leading=10.4,
            textColor=MUTED,
            wordWrap="CJK",
        ),
    }


def section_label(text: str, styles: dict[str, ParagraphStyle]) -> Table:
    label = Paragraph(text, styles["section"])
    rule = Table([[label]], colWidths=[CONTENT_WIDTH])
    rule.setStyle(
        TableStyle(
            [
                ("LINEBELOW", (0, 0), (-1, -1), 0.55, HAIRLINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4 * mm),
            ]
        )
    )
    return rule


def metric_cell(value: str, label: str, styles: dict[str, ParagraphStyle]) -> list:
    return [
        Paragraph(value, styles["metric_value"]),
        Spacer(1, 0.7 * mm),
        Paragraph(label, styles["metric_label"]),
    ]


def project_block(
    index: str,
    title: str,
    meta: str,
    overview: str,
    bullets: list[str],
    repository_url: str,
    styles: dict[str, ParagraphStyle],
) -> KeepTogether:
    heading = Table(
        [
            [
                Paragraph(index, styles["project_index"]),
                [
                    Paragraph(title, styles["project_title"]),
                    Paragraph(meta, styles["meta"]),
                ],
            ]
        ],
        colWidths=[16 * mm, CONTENT_WIDTH - 16 * mm],
    )
    heading.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 2 * mm),
                ("RIGHTPADDING", (1, 0), (1, 0), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2 * mm),
            ]
        )
    )

    content = [
        heading,
        Paragraph(overview, styles["body"]),
        Spacer(1, 1.2 * mm),
    ]
    content.extend(Paragraph(f"- {item}", styles["bullet"]) for item in bullets)
    content.extend(
        [
            Spacer(1, 0.5 * mm),
            Paragraph(
                f'<link href="{repository_url}" color="#C2410C">'
                f"Repository: {repository_url.removeprefix('https://')}</link>",
                styles["small"],
            ),
        ]
    )

    box = Table([[content]], colWidths=[CONTENT_WIDTH])
    box.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.55, HAIRLINE),
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("LEFTPADDING", (0, 0), (-1, -1), 4.5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 4.0 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2 * mm),
            ]
        )
    )
    return KeepTogether([box, Spacer(1, 3.2 * mm)])


def build_story(styles: dict[str, ParagraphStyle]) -> list:
    contact = (
        '<link href="mailto:qudgus182@naver.com" color="#67645C">'
        "qudgus182@naver.com</link>"
        ' &nbsp;&nbsp;|&nbsp;&nbsp; <link href="https://github.com/Polalise" '
        'color="#67645C">github.com/Polalise</link>'
        ' &nbsp;&nbsp;|&nbsp;&nbsp; <link href="https://polalise.github.io" '
        'color="#67645C">polalise.github.io</link>'
    )

    story = [
        Spacer(1, 2.5 * mm),
        Paragraph("유병현", styles["name"]),
        Paragraph(
            "검증 가능한 AI 기능을 웹 서비스로 연결하는 AI 연동형 풀스택 개발자",
            styles["position"],
        ),
        Paragraph(contact, styles["contact"]),
        section_label("PROFILE", styles),
        Paragraph(
            "React와 Spring Boot 기반 웹 서비스를 1년 4개월 개발하며 화면, API, "
            "데이터베이스 연동과 운영 이슈 대응을 맡았습니다. 이후 LLM 구조화 출력, "
            "서버 측 정규화, 데이터 누수 검증을 통해 AI 결과를 통제 가능한 기능으로 "
            "연결했습니다. 모델 수치보다 사용자의 요청이 검증 가능한 데이터와 서비스 "
            "흐름으로 이어지는 구조에 집중합니다.",
            styles["summary"],
        ),
        Spacer(1, 3.2 * mm),
    ]

    metrics = Table(
        [
            [
                metric_cell("1년 4개월", "React 및 Spring Boot 웹 개발 실무", styles),
                metric_cell("30분 이상", "인증서 1건당 업무 시간 단축", styles),
                metric_cell("2.0초 -> 1.6초", "AVAS 조회 결과 반환 시간", styles),
            ]
        ],
        colWidths=[CONTENT_WIDTH / 3] * 3,
    )
    metrics.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT_ACCENT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEAFTER", (0, 0), (-2, -1), 0.45, WHITE),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.0 * mm),
            ]
        )
    )
    story.extend([metrics, section_label("EXPERIENCE", styles)])

    experience_header = Table(
        [
            [
                Paragraph("엘케이시스 미래물류기술연구소 | 웹개발 사원", styles["role"]),
                Paragraph("2022.10 ~ 2024.01", styles["meta"]),
            ]
        ],
        colWidths=[CONTENT_WIDTH * 0.72, CONTENT_WIDTH * 0.28],
    )
    experience_header.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.7 * mm),
            ]
        )
    )
    story.extend(
        [
            experience_header,
            Paragraph(
                "- 인증 현황과 업체 데이터를 통합 조회하고 FineReport 기반 인증서 생성, "
                "모바일 일정 및 지도 기반 업체 관리를 구현했습니다. 약 30명이 사용한 "
                "업무 흐름에서 동일 절차 비교 기준으로 인증서 1건당 30분 이상을 단축했습니다.",
                styles["bullet"],
            ),
            Paragraph(
                "- 자율주행 자동차 선적 모니터링 시스템에서 서브쿼리 중심 조회를 다중 JOIN과 "
                "인덱스 구조로 재설계해 결과 반환 시간을 약 2.0초에서 1.6초로 줄였습니다.",
                styles["bullet"],
            ),
            Paragraph(
                "- React 화면, Spring Boot API, MyBatis 및 PostgreSQL 연동과 운영 이슈 대응을 "
                "함께 맡고 OpenLayers와 PostGIS로 차량 위치 및 이동 경로를 시각화했습니다.",
                styles["bullet"],
            ),
            section_label("SKILLS WITH EVIDENCE", styles),
        ]
    )

    skill_rows = [
        [
            Paragraph("WEB", styles["skill_key"]),
            Paragraph(
                "React, Redux, JavaScript, HTML5, CSS3, MUI, AG Grid",
                styles["skill_value"],
            ),
        ],
        [
            Paragraph("BACKEND", styles["skill_key"]),
            Paragraph(
                "Java, Spring Boot, Spring Data JPA, MyBatis, REST API, Python, FastAPI 연동",
                styles["skill_value"],
            ),
        ],
        [
            Paragraph("AI / DATA", styles["skill_key"]),
            Paragraph(
                "LLM 구조화 출력, RAG, PyTorch, scikit-learn, XGBoost, "
                "sentence-transformers, pandas",
                styles["skill_value"],
            ),
        ],
        [
            Paragraph("DB / DELIVERY", styles["skill_key"]),
            Paragraph(
                "PostgreSQL, PostGIS, Oracle, Flyway, Docker, GitHub Actions",
                styles["skill_value"],
            ),
        ],
    ]
    skill_table = Table(
        skill_rows,
        colWidths=[31 * mm, CONTENT_WIDTH - 31 * mm],
        rowHeights=None,
    )
    skill_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, -2), 0.35, HAIRLINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1.6 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6 * mm),
            ]
        )
    )
    story.extend([skill_table, section_label("WORKING PRINCIPLES", styles)])

    principle_table = Table(
        [
            [
                [
                    Paragraph("01 / 검증부터", styles["principle_title"]),
                    Spacer(1, 0.7 * mm),
                    Paragraph(
                        "높은 내부 수치를 그대로 쓰지 않고 누수와 평가 분할부터 점검합니다.",
                        styles["principle_body"],
                    ),
                ],
                [
                    Paragraph("02 / 책임 분리", styles["principle_title"]),
                    Spacer(1, 0.7 * mm),
                    Paragraph(
                        "LLM은 의도를 추출하고 날짜, 연산, 권한은 서버가 결정하게 설계합니다.",
                        styles["principle_body"],
                    ),
                ],
                [
                    Paragraph("03 / 계약 중심", styles["principle_title"]),
                    Spacer(1, 0.7 * mm),
                    Paragraph(
                        "화면, API, DB 변경을 문서와 마이그레이션, 테스트로 함께 관리합니다.",
                        styles["principle_body"],
                    ),
                ],
            ]
        ],
        colWidths=[CONTENT_WIDTH / 3] * 3,
    )
    principle_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEAFTER", (0, 0), (-2, -1), 0.4, HAIRLINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.6 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.6 * mm),
            ]
        )
    )
    story.extend([principle_table, PageBreak(), Spacer(1, 2.0 * mm)])

    story.extend(
        [
            Paragraph("SELECTED WORK", styles["section"]),
            Paragraph(
                "대표 사례는 지원 직무와의 연결도 순으로 배치했습니다. 개인 기여와 팀 범위를 "
                "구분하고, 최종 검증 또는 배포 위치에서 확인된 수치만 사용했습니다.",
                styles["small"],
            ),
            Spacer(1, 2.5 * mm),
            project_block(
                "01",
                "HajaCheck | AI 기반 건설 하자관리 SaaS",
                "2026.07.09 ~ 2026.08.07 | 8인 팀 | DB 스키마 기초 설계, 하자 관리 및 통계, 데이터 계약 오너",
                "시공 사진의 AI 탐지, 사람 검수, LLM 보고서 초안 생성을 잇는 멀티테넌트 SaaS입니다.",
                [
                    "DB, 백엔드, AI 서버, 프론트에 흩어진 상태 정의를 5단계에서 4단계로 바꾸며 "
                    "7개 PR로 호환 구간을 나눠 무중단 마이그레이션했습니다.",
                    "LLM은 Pydantic 스키마로 제약된 검색 의도만 반환하고 상대 날짜와 숫자 연산은 "
                    "서버가 정규화하도록 책임을 분리했습니다.",
                    "Flyway 마이그레이션 8건을 작성하고 코드리뷰를 거쳐 개인 PR 66건을 병합했습니다.",
                ],
                "https://github.com/luma-team-ai/HajaCheck",
                styles,
            ),
            project_block(
                "02",
                "ML_economics_answers | AI 경제 질의응답 서비스",
                "2026.07 | 개인 | Python, Streamlit, scikit-learn, pgvector, Docker",
                "자연어 경제 질문을 7개 모드로 분류해 공공데이터 조회, ML 예측, RAG 근거 검색으로 연결했습니다.",
                [
                    "내부 정확도 100%를 데이터 누수 신호로 보고 수기 holdout 75문항을 구축해 실제 정확도 41.3%를 확인했습니다.",
                    "그룹 기반 분할과 검수된 증강 데이터로 6,265문항을 재학습하고 배포 모델에서 정확도 80.0%, macro F1 0.823을 재검증했습니다.",
                ],
                "https://github.com/Polalise/ML_economics_answers",
                styles,
            ),
            project_block(
                "03",
                "MachineLearning_oil | 유가 및 환율 기반 CPI 예측",
                "2026.06 ~ 2026.07 | 개인 | Python, scikit-learn, XGBoost, Streamlit",
                "한국은행 ECOS 월별 데이터와 시차 특성으로 다음 달 소비자물가 상승률을 예측하는 대시보드입니다.",
                [
                    "여러 회귀 모델을 비교해 선형회귀를 최종 선택했고 2022~2025년 평가에서 R² 0.9278, MAE 0.3036을 기록했습니다.",
                    "유가 변수를 제외한 모델 대비 RMSE를 약 5.6% 개선했으며 LLM은 모델 계산 결과의 해설만 담당하도록 제한했습니다.",
                ],
                "https://github.com/Polalise/MachineLearning_oil",
                styles,
            ),
            project_block(
                "04",
                "PlusHome | 인테리어 중개 웹 서비스",
                "React, Spring Boot, MyBatis, Oracle",
                "쇼핑몰과 인테리어 상담을 결합한 주거 통합 서비스에서 초기 구조와 기업 회원 기능을 담당했습니다.",
                [
                    "초기 구조와 DB를 설계하고 기업 회원 대시보드, 견적서 PDF, 주문 및 예약 화면을 구현했습니다.",
                    "반복 테이블을 공용 컴포넌트로 분리하고 이미지 저장 흐름을 프론트엔드부터 서버까지 연결했습니다.",
                ],
                "https://github.com/HayoungMo/PlusHome",
                styles,
            ),
            Paragraph(
                '<link href="https://polalise.github.io/projects/" color="#C2410C">'
                "상세 사례 및 근거 보기: polalise.github.io/projects/</link>",
                styles["small"],
            ),
        ]
    )
    return story


def build_resume() -> Path:
    register_fonts()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    document = BaseDocTemplate(
        str(OUTPUT_PATH),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="Yoo Byeonghyeon | AI-Integrated Full-Stack Developer",
        author="Yoo Byeonghyeon",
        subject="Public resume for an AI-integrated full-stack developer",
        creator="Polalise portfolio resume builder",
        keywords="React, Spring Boot, AI, LLM, PostgreSQL, Full Stack",
    )
    frame = Frame(
        MARGIN_X,
        MARGIN_BOTTOM,
        CONTENT_WIDTH,
        PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        id="resume-frame",
    )
    document.addPageTemplates(
        [PageTemplate(id="resume", frames=[frame], onPage=draw_page)]
    )
    document.build(build_story(make_styles()))
    return OUTPUT_PATH


def main() -> int:
    try:
        output = build_resume()
    except Exception as exc:
        print(f"Resume build failed: {exc}", file=sys.stderr)
        return 1
    print(f"Built public resume: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
