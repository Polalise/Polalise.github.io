---
title: "pet_platform_project"
displayTitle: "반려동물 통합 플랫폼"
order: 7
tier: "archive"
ownership: "team"
category: "Java 웹 애플리케이션"
summary: "Java Servlet과 JSP, Oracle을 기반으로 반려동물 관련 서비스를 한 웹 애플리케이션으로 구성한 팀 프로젝트입니다."
period: "2026.02 ~ 2026.03"
teamSize: 3
role: "유기동물과 입양 게시판, 개인 및 사업자 회원 가입, 마이페이지, 공통 레이아웃"
technologies:
  - "Java"
  - "Servlet"
  - "JSP"
  - "JDBC"
  - "Oracle"
  - "HTML"
  - "CSS"
  - "JavaScript"
problem: "여러 반려동물 관련 기능과 회원 데이터를 서버 렌더링 화면, 요청 처리, 관계형 데이터 저장 구조로 연결해야 했습니다."
actions:
  - "저장소는 Java Servlet이 요청을 처리하고 JSP가 화면을 렌더링하는 웹 구조를 사용합니다."
  - "Oracle 기반 데이터 저장과 회원 및 서비스 콘텐츠 흐름을 하나의 애플리케이션 안에서 구성합니다."
  - "화면, 서버 요청 처리, JDBC 데이터 접근을 연결하는 전통적인 Java 웹 개발 방식을 적용합니다."
outcomes:
  - "반려동물 관련 여러 서비스 영역을 공통 회원 흐름과 데이터 구조 안에서 탐색할 수 있는 통합 플랫폼을 구성했습니다."
  - "Servlet/JSP 요청 흐름과 Oracle 데이터 연동을 포함한 팀 단위 웹 애플리케이션 산출물을 완성했습니다."
limitation: "담당 범위는 커밋 이력에서 확인한 파일 단위 근거이며 설계를 주도했다는 뜻이 아닙니다. 정량 성과는 공개 문서에 남아 있지 않아 제시하지 않고, 담당으로 적지 않은 기능은 팀의 산출물입니다."
metrics: []
links:
  repository: "https://github.com/Polalise/pet_platform_project"
cover:
  kind: "product"
  tone: "accent"
  alt: "검색 조건과 유기동물 카드, 마우스를 올린 카드의 이름과 상세 조회 버튼이 보이는 실제 게시판"
  evidence:
    source: "role"
visuals:
  - id: "abandoned-list"
    alt: "유기동물 게시판에서 예시 동물 카드에 마우스를 올려 이름, 나이, 품종과 자세히보기 버튼을 펼친 실행 화면"
    caption: "조건 검색과 카드 상세 조회를 제공하는 유기동물 게시판"
    scope: "personal"
    evidence: "격리된 실행 사본의 Servlet/JSP와 Oracle 조회 화면입니다. 동물 정보는 캡처용 예시이며 사진은 원본 프로젝트의 기본 이미지를 사용했습니다"
---

## Servlet과 JSP로 구성한 통합 서비스

이 프로젝트는 Java 웹 기술로 여러 반려동물 관련 기능을 하나의 서비스 구조에 담은 팀 결과물입니다. Servlet이 요청을 처리하고 JSP가 화면을 구성하며, Oracle 데이터베이스가 회원과 서비스 데이터를 저장합니다.

커밋 메시지에는 기능명이 남아 있지 않아, 병합 커밋을 제외하고 제가 실제로 수정한 파일을 집계해 담당 범위를 확인했습니다. 유기동물과 입양 게시판의 Servlet 및 DAO, 회원 가입과 마이페이지, 이미지 저장과 공통 레이아웃이 그 범위입니다. 전체 111개 커밋 가운데 51개가 제 것입니다.

파일 이력은 무엇을 맡아 구현했는지를 보여줄 뿐 아키텍처를 결정했다는 근거는 아닙니다. 담당으로 적지 않은 기능은 팀의 산출물이며, 공개 문서에 없는 정량 성과는 만들지 않았습니다.
