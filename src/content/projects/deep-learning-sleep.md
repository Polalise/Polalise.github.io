---
title: "DeepLearnin_sleep"
displayTitle: "취침 전 수면 품질 예측"
order: 5
tier: "archive"
ownership: "personal"
category: "딥러닝, 데이터 검증"
summary: "수면 시작 전에 관측할 수 있는 정보만으로 다가오는 수면의 품질을 예측하고 기기 간 일반화 한계까지 진단한 프로젝트입니다."
period: "2026.06 ~ 2026.07"
role: "문제 재정의, 데이터 파이프라인, 모델 학습과 평가, 추론 도구 구현"
technologies:
  - "PyTorch"
  - "scikit-learn"
  - "pandas"
  - "NumPy"
  - "MongoDB"
  - "Streamlit"
problem: "초기 데이터에는 수면이 끝난 뒤에만 알 수 있는 정보가 섞여 있어 높은 성능이 실제 취침 전 예측 능력을 의미하지 않았습니다."
actions:
  - "예측 시점을 수면 시작 시각으로 고정하고 이후 생성되는 특성을 제거해 문제를 다시 정의했습니다."
  - "같은 참가자의 기록이 학습과 평가에 함께 들어가지 않도록 46명, 9명, 14명의 참가자 단위로 데이터를 분리했습니다."
  - "380개까지 늘린 이력 특성이 held-out 평가를 개선하지 못하자 58개 pre-sleep 특성의 MLP를 최종 선택했습니다."
  - "참가자 bootstrap 신뢰구간과 확률 보정 오차를 함께 산출하고 Fitbit 학습 모델의 Samsung Health 전이 한계를 진단했습니다."
outcomes:
  - "참가자 69명과 수면 기록 3,551건을 기준으로 held-out Balanced Accuracy 0.6492와 ROC AUC 0.6937을 기록했습니다."
  - "성능을 높여 보이게 하던 누수를 제거하고 실제 사용할 수 있는 시점의 입력만 받는 추론 계약을 만들었습니다."
  - "다른 기기의 proxy label이 극단적으로 불균형해 안정적인 전이를 확인할 수 없다는 결과도 실패로 숨기지 않고 기록했습니다."
limitation: "held-out 참가자는 14명이라 새로운 사용자에 대한 일반화에는 불확실성이 큽니다. 의료 판단용 모델이 아니며 확률 출력은 보정된 실제 확률로 간주할 수 없습니다."
metrics:
  - value: "0.6492"
    label: "held-out Balanced Accuracy"
    scope: "personal"
    evidence: "참가자 단위 테스트와 최종 MLP 평가 산출물"
  - value: "0.6937"
    label: "held-out ROC AUC"
    scope: "personal"
    evidence: "최종 프로젝트 상태 보고서의 held-out 참가자 평가"
  - value: "69명, 3,551건"
    label: "검증 데이터 규모"
    scope: "personal"
    evidence: "집계된 참가자와 수면 episode 수를 기록한 최종 데이터 보고서"
links: {}
cover:
  kind: "product"
  tone: "ink"
  alt: "취침 전 입력만으로 오늘 밤 수면 예측 결과를 보여주는 실제 Streamlit 실행 화면"
  evidence:
    source: "metric"
    index: 0
visuals:
  - id: "forecast-app"
    alt: "취침 전 입력으로 수면 품질을 예측하는 Streamlit 애플리케이션 화면"
    caption: "수면 시작 전에 알 수 있는 정보만 받는 추론 화면"
    scope: "personal"
    evidence: "최종 모델을 연결한 Streamlit 실행 화면"
  - id: "roc-pr"
    alt: "held-out 참가자 평가의 ROC 곡선과 정밀도 재현율 곡선"
    caption: "참가자 단위 held-out ROC와 정밀도-재현율 평가"
    scope: "personal"
    evidence: "최종 MLP의 held-out 참가자 평가 산출물"
  - id: "bootstrap-ci"
    alt: "참가자 bootstrap으로 계산한 수면 예측 지표의 신뢰구간 그래프"
    caption: "작은 held-out 표본의 불확실성을 드러낸 bootstrap 신뢰구간"
    scope: "personal"
    evidence: "참가자 단위 bootstrap 평가 산출물"
---

## 성능보다 예측 시점을 먼저 바로잡았습니다

초기 모델은 높은 점수를 냈지만 입력에 수면 종료 후 생성되는 값이 섞여 있었습니다. 오늘 밤의 수면을 취침 전에 예측한다는 목적에 맞춰 기준 시각을 수면 시작으로 고정하고, 그 이후의 정보를 모두 제거했습니다. 데이터도 행 단위가 아니라 참가자 단위로 나눠 같은 사람의 패턴이 테스트에 새어 들어가지 않게 했습니다.

이력과 rolling 특성을 많이 추가한 모델도 실험했지만 held-out 성능이 나아지지 않았습니다. 복잡도를 유지할 근거가 없었기 때문에 58개 pre-sleep 특성을 사용하는 MLP로 돌아왔습니다. 단일 점수만 제시하지 않고 bootstrap 신뢰구간, Brier score와 calibration error를 함께 확인했습니다.

## 공개 범위를 데이터 위험에 맞췄습니다

서로 다른 기기로 일반화하는 실험에서는 label coverage와 class imbalance 때문에 안정적인 성능을 확인하지 못했습니다. 이를 성공으로 표현하지 않고 적용 범위의 한계로 남겼습니다. 이 페이지에는 개인 단위 건강 데이터나 원본 기록을 복제하지 않으며 집계 그래프만 사용합니다.
