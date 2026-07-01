export const defaultGaugeCriteria = {
  temperatureMinC: 15,
  temperatureMaxC: 25,
  humidityMinPercent: 40,
  humidityMaxPercent: 50
};

export function scoreToLifeTemperature(score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  return Number((10 + (clamped / 100) * 15).toFixed(1));
}

export function lifeTemperatureToScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(((value - 10) / 15) * 100)));
}

export function adherenceToLifeTemperatureScore(adherence: number) {
  return Math.max(0, Math.min(100, Math.round(adherence)));
}

export function adherenceToLifeHumidity(adherence: number) {
  const clamped = Math.max(0, Math.min(100, adherence));
  return Math.round(34 + (clamped / 100) * 16);
}

export function gaugeRangeLabel(value: number, min: number, max: number, unit: string) {
  if (value >= min && value <= max) {
    return `기준 범위 ${min}${unit}-${max}${unit} 안에 있습니다`;
  }

  if (value < min) {
    return `기준보다 낮습니다 · ${min}${unit}-${max}${unit}`;
  }

  return `기준보다 높습니다 · ${min}${unit}-${max}${unit}`;
}
