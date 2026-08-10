---
title: "Advanced_project"
displayTitle: "PPAP 부동산 플랫폼"
order: 6
tier: "archive"
ownership: "team"
category: "지도 기반 풀스택 웹"
summary: "Naver 지도와 공공 실거래 데이터를 활용해 매물 탐색, 상담 예약, 매물 관리를 지원하는 부동산 플랫폼입니다."
technologies:
  - "React"
  - "Node.js"
  - "Express"
  - "MongoDB"
  - "Mongoose"
  - "JWT"
  - "Naver Maps API"
  - "Chart.js"
problem: "지도 위의 매물 위치와 조건별 목록, 사용자와 중개 사용자의 상담 및 매물 관리 흐름을 하나의 서비스에서 연결해야 했습니다."
actions:
  - "저장소는 React 프론트엔드와 Express REST API, MongoDB 데이터 모델을 한 서비스 구조로 구성합니다."
  - "지도 영역과 매물 목록을 연결하고 유형, 거래 방식, 가격 조건에 따른 필터를 제공합니다."
  - "공공 실거래 데이터 API를 연동해 가격과 거래량의 지역별, 기간별 추이를 차트로 보여줍니다."
  - "JWT 인증과 일반 사용자 및 사업자 역할 구분, 매물 이미지 업로드, 상담 상태 관리를 포함합니다."
outcomes:
  - "사용자는 지도에서 매물을 비교하고 상세 정보, 관심 매물, 상담 예약 흐름으로 이동할 수 있습니다."
  - "사업자 사용자는 매물을 등록하고 이미지와 상담 요청 상태 및 일정을 관리할 수 있습니다."
  - "매물 정보와 공공 실거래 추이를 같은 서비스에서 함께 살펴볼 수 있게 구성했습니다."
limitation: "공개 README에는 개인 담당 기능이 구분되어 있지 않아 이 페이지는 저장소의 팀 산출물과 서비스 구조만 설명합니다. 지도와 공공데이터 API는 키 및 제공 상태에 따라 로컬 실행 설정이 필요합니다."
metrics: []
links:
  repository: "https://github.com/Polalise/Advanced_project"
cover: "/media/projects/advanced-project.webp"
coverAlt: "Advanced Project 프로젝트명과 React, Express 기술을 배치한 에디토리얼 커버"
coverTone: "paper"
---

## 지도 탐색과 거래 데이터를 한 화면 흐름으로

PPAP는 지도에서 매물을 찾는 과정과 실제 거래 추이를 확인하는 과정을 연결한 팀 프로젝트입니다. React 화면은 지도 영역과 매물 목록을 함께 보여주며, Express API와 MongoDB가 회원, 매물, 관심 목록, 상담 일정을 관리합니다.

일반 사용자는 조건별 매물 검색과 관심 등록, 상담 예약을 이용할 수 있습니다. 사업자 사용자는 이미지가 포함된 매물을 등록하고 상담 요청의 상태와 일정을 관리할 수 있습니다. 공공 실거래 데이터는 지역과 기간 기준의 차트로 제공됩니다.

저장소 활동량만으로 개인 역할을 추정하지 않았습니다. 담당 범위와 개인 성과가 문서로 분리되지 않았기 때문에 이 페이지의 서술은 팀 서비스 전체 기능에 한정합니다.
