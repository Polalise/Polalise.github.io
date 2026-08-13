---
title: "HajaCheck"
displayTitle: "HajaCheck"
order: 1
tier: "featured"
ownership: "team"
category: "AI 연동형 풀스택"
summary: "시공 사진의 AI 탐지와 사람의 검수, 보고서 생성을 하나의 하자관리 흐름으로 연결한 B2B SaaS입니다."
period: "2026.07.09 ~ 2026.08.07"
teamSize: 8
role: "DB 스키마 기초 설계, 하자 관리와 통계 개발, DB와 API 계약 관리"
technologies:
  - "React"
  - "Spring Boot"
  - "JPA"
  - "PostgreSQL"
  - "Flyway"
  - "FastAPI"
  - "Pydantic"
  - "LLM"
  - "Docker"
  - "GitHub Actions"
problem: "프론트엔드, 백엔드, AI 서버가 하자 상태와 검색 조건을 함께 사용해 한 계층의 변경이 다른 계층의 오류로 이어질 수 있었습니다."
actions:
  - "하자 목록, 상세, 통계, 조치보드와 자연어 검색을 화면부터 API까지 연결했습니다."
  - "LLM은 Pydantic 스키마로 제한된 검색 의도만 반환하고 상대 날짜와 수치 조건은 서버가 정규화하도록 책임을 분리했습니다."
  - "하자 상태를 5단계에서 4단계로 바꾸는 작업을 DB와 백엔드, AI 서버, 프론트엔드 순서의 호환 가능한 변경으로 나눴습니다."
  - "Flyway를 도입하고 마이그레이션 8건을 작성했으며 API 계약 문서를 기준으로 응답 필드 불일치를 정리했습니다."
outcomes:
  - "하자 상태 전환을 서비스 중단 없이 적용하고 과거 활동 이력은 전용 호환 렌더러와 회귀 테스트로 보존했습니다."
  - "LLM이 SQL이나 기준일 종속 값을 직접 만들지 않게 해 검색 결과를 서비스의 권한과 필터 규칙 안에서 통제했습니다."
  - "프론트엔드, 백엔드, AI 서버가 공유하는 계약을 유지하며 개인 PR 66건을 코드리뷰를 거쳐 병합했습니다."
limitation: "AI 탐지와 보고서 품질은 팀 전체 산출물이며 개인 성과로 구분하지 않습니다. 개인 기여는 DB와 API 계약, 하자 관리와 통계, 자연어 검색 구현 범위로 한정합니다."
metrics:
  - value: "8건"
    label: "Flyway 마이그레이션 작성"
    scope: "personal"
    evidence: "이력서 마스터의 HajaCheck 프로젝트 기록과 팀 최종보고서의 담당 역할"
  - value: "66건"
    label: "코드리뷰 후 병합된 개인 PR"
    scope: "personal"
    evidence: "HajaCheck 원본 저장소의 병합 이력과 이력서 마스터의 최종 검증 기록"
links:
  repository: "https://github.com/luma-team-ai/HajaCheck"
  demo: "https://www.youtube.com/watch?v=IagMc_vZxpA"
  report: "https://github.com/Polalise/HajaCheck_report"
cover:
  kind: "scope"
  tone: "accent"
  alt: "시설물 현황과 AI 주간 브리핑, 처리 대기 하자를 구성한 HajaCheck 화면 설계 스토리보드"
  evidence:
    source: "action"
    index: 0
visuals:
  - id: "dashboard"
    alt: "하자 현황과 등급별 통계 구성을 보여주는 HajaCheck 대시보드 스토리보드"
    caption: "하자 현황과 통계의 정보 구조를 정리한 화면 설계 스토리보드"
    scope: "team"
    evidence: "팀 최종보고서에 수록된 화면 설계 산출물"
  - id: "ai-detection"
    alt: "시공 사진의 하자 위치와 판정 정보 구성을 보여주는 AI 분석 화면 스토리보드"
    caption: "AI 탐지 결과와 사람 검수 흐름을 정리한 화면 설계 스토리보드"
    scope: "team"
    evidence: "팀 최종보고서에 수록된 화면 설계 산출물"
---

## 서비스 안에서 AI를 통제하는 방법

HajaCheck는 시공 사진을 업로드하면 AI가 하자를 탐지하고 등급화한 뒤, 담당자가 결과를 검수하고 보고서 초안을 만드는 건설 하자관리 서비스입니다. 멀티테넌시와 역할별 권한, 배포 자동화를 포함한 운영 유사 환경을 목표로 구현했습니다.

자연어 검색에서는 LLM에 데이터베이스 조건 생성을 맡기지 않았습니다. LLM은 정해진 스키마의 의도만 반환하고, 날짜와 숫자 연산 및 최종 접근 규칙은 서버가 처리합니다. 확률적인 출력을 기존 하자 목록의 필터 규칙과 연결하기 위한 책임 분리입니다.

## 데이터 계약을 변경하는 과정

하자 상태는 여러 계층에 중복 정의되어 있었습니다. 상태 단계를 줄이는 변경을 한 번에 적용하지 않고 호환 가능한 배치로 나눠, 데이터 백필과 enum 축소가 화면과 AI 서버보다 먼저 깨지는 일을 막았습니다. API 응답 필드 불일치가 반복됐을 때는 개별 화면만 고치지 않고 계약 문서, OpenAPI 스키마, 컨트롤러 테스트를 함께 정렬했습니다.

이 사례의 핵심은 AI 기능 자체보다 여러 서버와 화면이 같은 의미를 유지하게 만든 과정입니다. 탐지 정확도와 보고서 품질처럼 팀 전체가 만든 결과는 개인 지표로 제시하지 않습니다.
