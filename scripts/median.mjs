// 게이트 판정용 중앙값. 공용 러너의 단발 변동을 걸러내려고 라우트마다 여러 번 측정한 점수에 쓴다.
export function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("median requires a non-empty array");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}
