---
title: "MachineLearning_oil"
displayTitle: "유가와 환율 기반 CPI 예측"
order: 3
tier: "featured"
ownership: "personal"
category: "머신러닝, 시계열, 데이터 시각화"
summary: "한국은행 월별 데이터로 유가와 환율의 시차를 반영해 다음 달 소비자물가 상승률을 예측하고 시나리오를 비교하는 대시보드입니다."
period: "2026.06 ~ 2026.07"
role: "가설 설정, 데이터 가공, 모델 비교와 평가, Streamlit 대시보드 구현"
technologies:
  - "Python"
  - "pandas"
  - "scikit-learn"
  - "XGBoost"
  - "Streamlit"
  - "Altair"
  - "OpenAI API"
problem: "국제 유가와 환율 변화가 시차를 두고 국내 소비자물가에 반영된다는 가설을 정량적으로 검증하고 사용자가 조건을 바꿔 볼 수 있게 해야 했습니다."
actions:
  - "Dubai 유가, 원달러 환율, CPI, 기준금리의 월별 데이터를 정리하고 유가의 1, 2, 3, 6개월 시차 특성을 설계했습니다."
  - "목표 월 기준 2022년 이전 191개 행을 학습에, 2022년부터 2025년까지 48개 행을 테스트에 사용하도록 시계열 순서를 보존했습니다."
  - "Linear Regression, Ridge, Random Forest, XGBoost와 지속성 기준 모델을 비교하고 성능과 설명 가능성을 함께 고려해 선형회귀를 선택했습니다."
  - "유가 급등, 환율 상승, 금리 인상 등 입력 조건을 바꿔 예측 변화를 확인하는 Streamlit 화면을 만들었습니다."
outcomes:
  - "2022년부터 2025년까지의 테스트 구간에서 R² 0.9278, MAE 0.3036, RMSE 0.3602를 기록했습니다."
  - "유가 변수를 포함한 모델이 유가 제외 모델보다 RMSE를 약 5.6% 낮춰 가설의 추가 설명력을 확인했습니다."
  - "LLM은 모델이 계산한 값만 한국어로 설명하도록 제한해 예측값 생성과 해설의 책임을 분리했습니다."
limitation: "RMSE는 과거 테스트 구간의 오차 참고값이며 신뢰구간이나 인과효과가 아닙니다. 급격한 구조 변화에서는 실제 물가가 예측 범위를 크게 벗어날 수 있습니다."
metrics:
  - value: "0.9278"
    label: "2022년부터 2025년 테스트 R²"
    scope: "personal"
    evidence: "저장소 분석 노트북과 README의 최종 Linear Regression 평가 결과"
  - value: "5.6%"
    label: "유가 제외 모델 대비 RMSE 개선"
    scope: "personal"
    evidence: "동일 테스트 구간에서 CPI 단독 모델과 전체 특성 모델을 비교한 app.py 평가 로직"
  - value: "48개월"
    label: "시계열 테스트 구간"
    scope: "personal"
    evidence: "target_date 2022-01부터 2025-12까지의 월별 평가 행을 재확인"
links:
  repository: "https://github.com/Polalise/MachineLearning_oil"
cover: "/media/projects/machine-learning-oil.webp"
coverAlt: "다음 달 CPI 예측과 유가 시나리오를 보여주는 Streamlit 대시보드"
coverTone: "paper"
---

## 가설을 변수 비교로 검증했습니다

유가가 오르면 수입 비용을 거쳐 물가에 늦게 반영된다는 가설에서 시작했습니다. 동일한 테스트 기간에서 유가 특성을 넣은 모델과 뺀 모델을 비교해, 전체 모델의 RMSE가 약 5.6% 낮아지는 것을 확인했습니다. 단순 상관을 인과관계로 표현하지 않고 모델 안에서 유가 정보가 제공한 추가 예측력으로 해석했습니다.

복잡한 모델이 항상 더 낫다고 가정하지 않았습니다. 여러 회귀 후보와 기준 모델을 비교한 뒤 월별 표본 규모와 설명 가능성을 고려해 StandardScaler와 Linear Regression 파이프라인을 선택했습니다. 학습과 테스트는 목표 월의 시간 순서로 분리했습니다.

## 예측을 탐색 가능한 화면으로 바꿨습니다

대시보드에서는 최신 관측값을 기준으로 다음 달 CPI 상승률, 주요 변수의 기여 방향, 과거 테스트 RMSE를 함께 보여줍니다. 사용자는 유가와 환율, 기준금리 조건을 바꿔 기준 시나리오와의 차이를 확인할 수 있습니다. 선택형 AI 해설은 계산 결과를 설명할 뿐 새로운 숫자를 만들지 않습니다.
