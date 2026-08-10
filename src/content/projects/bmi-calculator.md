---
title: "BMI_Calculator"
displayTitle: "BMI 기록 관리 서비스"
order: 9
tier: "archive"
ownership: "personal"
category: "Flask 백엔드"
summary: "BMI 계산을 회원 인증, 개인 기록, 전체 통계, 요청 로그와 연결해 Flask 3계층 구조로 구현한 웹 서비스입니다."
period: "2026.06.12 ~ 2026.06.14"
role: "애플리케이션 구조, 인증, CRUD, 통계, 요청 로그 구현"
technologies:
  - "Python"
  - "Flask"
  - "PyMySQL"
  - "MariaDB"
  - "Jinja2"
  - "Werkzeug Security"
  - "Gunicorn"
problem: "단순 계산 결과를 일회성 화면으로 끝내지 않고 사용자별 기록과 통계, 인증 및 운영 로그를 갖춘 작은 웹 서비스 구조로 확장해야 했습니다."
actions:
  - "요청 처리는 routes, 비즈니스 규칙은 services, 데이터 접근은 models로 분리했습니다."
  - "비밀번호 해시 저장과 세션 로그인을 적용하고 비활성 회원의 접근 및 다른 사용자의 기록 삭제를 차단했습니다."
  - "BMI 기록과 전체 통계를 구현하고 정적 파일을 제외한 요청의 메서드, URI, 상태 코드, 회원 식별 상태를 활동 로그에 저장했습니다."
outcomes:
  - "회원, BMI 기록, 활동 로그의 3개 테이블과 11개 주요 라우트로 계산부터 기록 조회 및 삭제, 통계까지 연결했습니다."
  - "작은 기능에서도 요청, 서비스 로직, 데이터 접근과 설정을 분리하는 백엔드 기본 구조를 적용했습니다."
  - "포트폴리오 화면에는 개인을 식별할 수 없는 예시 입력값만 사용합니다."
limitation: "짧은 기간에 구현한 학습용 프로젝트이며 자동화 테스트와 대규모 데이터에서의 통계 성능 검증은 포함하지 않았습니다. 의료 진단이나 건강 조언을 제공하지 않습니다."
metrics:
  - value: "11개"
    label: "주요 웹 라우트"
    scope: "personal"
    evidence: "프로젝트 README의 라우트 목록과 Flask Blueprint 구성"
  - value: "3개"
    label: "관계형 데이터 테이블"
    scope: "personal"
    evidence: "tableSetting.sql의 members, bmi_records, activity_logs 스키마"
links:
  repository: "https://github.com/Polalise/BMI_Calculator"
cover: "/media/projects/bmi-calculator.webp"
coverAlt: "예시 입력값으로 구성한 BMI 결과와 기록 통계 화면"
coverTone: "paper"
---

## 계산기를 작은 서비스로 확장했습니다

핵심 계산은 단순하지만 로그인한 사용자가 결과를 저장하고 최근 기록을 조회하거나 삭제할 수 있게 구성했습니다. 전체 통계 화면은 평균과 범위, 분류별 인원 비율과 최신 기록을 보여줍니다.

요청과 비즈니스 로직, 데이터 접근을 세 계층으로 나누고 설정값은 환경 변수로 분리했습니다. 비밀번호는 평문으로 저장하지 않으며 사용자는 자신의 기록만 삭제할 수 있습니다. 요청 로그는 정적 파일을 제외한 서비스 동작을 추적할 수 있게 설계했습니다.

공개 화면에는 개인을 식별할 수 없는 예시 입력값만 노출합니다. 이 프로젝트는 복잡한 모델보다 인증, CRUD, 통계, 로그를 포함한 백엔드 기본기를 보여주는 보조 사례입니다.
