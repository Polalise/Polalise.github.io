---
title: "ML_economics_answers"
displayTitle: "ML 경제 질의응답"
order: 2
tier: "featured"
ownership: "personal"
category: "LLM, RAG, 머신러닝"
summary: "경제 질문을 공공데이터 조회, 통계 분석, ML 예측, RAG 근거 검색 가운데 필요한 경로로 연결하는 질의응답 서비스입니다."
period: "2026.07"
role: "기획, 데이터 설계, 모델 학습과 평가, 서비스 구현, 배포"
technologies:
  - "Python"
  - "Streamlit"
  - "scikit-learn"
  - "Hugging Face Transformers"
  - "sentence-transformers"
  - "LLM"
  - "RAG"
  - "PostgreSQL"
  - "pgvector"
  - "Docker"
problem: "질문 라우터의 내부 테스트 정확도가 100%였지만 질문 템플릿 유사성으로 인한 데이터 누수 가능성이 있어 실제 일반화 성능을 신뢰할 수 없었습니다."
actions:
  - "기존 분할과 겹치지 않는 수기 평가 문항 75개를 만들고 초기 배포 모델의 정확도 41.3%를 확인했습니다."
  - "그룹 기반 데이터 분할과 검수된 증강을 적용해 원본 1,200문항과 증강 5,065문항으로 다시 학습했습니다."
  - "질문을 API 조회, 분석, ML 예측, RAG 검색, 지원 불가를 포함한 7가지 처리 모드로 분류했습니다."
  - "배포 위치의 모델을 다시 평가하고 Docker 실행 환경과 PostgreSQL pgvector 검색을 서비스에 연결했습니다."
outcomes:
  - "최종 적용 모델의 수기 holdout 정확도를 80.0%, macro F1을 0.823으로 확인했습니다."
  - "지원할 수 없는 질문을 별도 유형으로 분리하고 데이터와 모델의 가용 상태를 점검한 뒤 필요한 파이프라인만 실행하도록 구성했습니다."
  - "높은 내부 점수를 그대로 성과로 사용하지 않고 독립 평가 세트와 실패 사례를 기준으로 배포 모델을 교체했습니다."
limitation: "경제 분석을 보조하는 프로토타입으로 투자나 정책 판단을 대신하지 않습니다. API 제공 범위와 예측 모델 보유 여부에 따라 답변 가능한 지표가 달라집니다."
metrics:
  - value: "41.3%에서 80.0%"
    label: "수기 holdout 정확도"
    scope: "personal"
    evidence: "75문항 holdout 평가 파일과 최종 적용 모델의 2026-07-06 평가 JSON"
  - value: "0.823"
    label: "최종 적용 모델 macro F1"
    scope: "personal"
    evidence: "reports/question_router/holdout_full_aug_20260706_170225_metrics.json"
  - value: "6,265문항"
    label: "최종 학습 데이터"
    scope: "personal"
    evidence: "원본 1,200문항과 검수된 증강 5,065문항으로 구성된 모델 학습 이력"
links:
  repository: "https://github.com/Polalise/ML_economics_answers"
cover: "/media/projects/ml-economics-answers.webp"
coverAlt: "ML Economics Answers 프로젝트명과 Streamlit, scikit-learn, sentence-transformers 기술을 배치한 에디토리얼 커버"
coverTone: "ink"
---

## 100%라는 숫자를 의심했습니다

질문 라우터는 사용자의 문장을 7가지 처리 모드로 분류합니다. 초기 내부 테스트에서는 정확도 100%가 나왔지만, 질문 템플릿이 학습과 테스트에 비슷하게 섞인 결과일 수 있다고 판단했습니다. 기존 데이터와 겹치지 않도록 75문항을 직접 작성해 다시 측정했고 실제 정확도는 41.3%였습니다.

그룹 기반 분할과 검수된 증강 데이터를 적용한 뒤 여러 학습 후보를 같은 holdout에서 비교했습니다. 가장 높은 실험값이 아니라 오류를 수정한 전체 증강 데이터로 다시 학습하고 배포 위치에서 검증한 모델을 최종 적용했습니다. 그 결과 정확도 80.0%와 macro F1 0.823을 기록했습니다.

## 질문마다 필요한 경로만 실행합니다

공공데이터 조회만 필요한 질문과 예측 모델 또는 문서 근거가 필요한 질문을 구분합니다. 라우터 결과는 API 레지스트리와 기능 가용성 점검을 거친 뒤 통계 분석, 사전 학습 ML 모델, pgvector 기반 RAG 가운데 필요한 파이프라인으로 이어집니다. 모든 질문에 답하려 하지 않고 지원 불가 상태를 명시적으로 반환하는 것도 설계에 포함했습니다.
