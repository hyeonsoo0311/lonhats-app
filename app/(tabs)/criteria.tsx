import {
  AppCard,
  EmptyState,
  Field,
  MetricCard,
  PrimaryButton,
  ScreenSection
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { analyzeLifeDirection } from "@/lib/analysis";
import { defaultGaugeCriteria, gaugeRangeLabel, scoreToLifeTemperature } from "@/lib/gauge";
import {
  getLifeGaugeCriteria,
  getWeeklyLifeEntries,
  upsertLifeGaugeCriteria
} from "@/lib/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, Save, SlidersHorizontal, Thermometer } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

const defaults = {
  temperatureDefinition: "나에게 삶의 온도는 몸을 움직이고 생각이 앞으로 가는 느낌이다.",
  temperatureLowNote: "온도가 낮다는 것은 움직임과 몰입이 줄어드는 신호다.",
  temperatureHighNote: "온도가 너무 높다는 것은 무리하거나 과열되는 신호일 수 있다.",
  humidityDefinition: "나에게 삶의 습도는 회복, 식사 리듬, 마음의 안정감이다.",
  humidityLowNote: "습도가 낮다는 것은 잠, 휴식, 식사 리듬을 다시 봐야 한다는 신호다.",
  humidityHighNote: "습도가 너무 높다는 것은 편안하지만 정체되어 있는지 살펴볼 신호다."
};

function toTemperature(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(1)) : fallback;
}

function toPercent(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 0), 100) : fallback;
}

function temperatureCToScore(value: number) {
  return Math.min(Math.max(Math.round(((value - 35.5) / 2.5) * 100), 0), 100);
}

export default function CriteriaScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [temperatureMinC, setTemperatureMinC] = useState<string | null>(null);
  const [temperatureMaxC, setTemperatureMaxC] = useState<string | null>(null);
  const [humidityMinPercent, setHumidityMinPercent] = useState<string | null>(null);
  const [humidityMaxPercent, setHumidityMaxPercent] = useState<string | null>(null);
  const [temperatureDefinition, setTemperatureDefinition] = useState<string | null>(null);
  const [temperatureLowNote, setTemperatureLowNote] = useState<string | null>(null);
  const [temperatureHighNote, setTemperatureHighNote] = useState<string | null>(null);
  const [humidityDefinition, setHumidityDefinition] = useState<string | null>(null);
  const [humidityLowNote, setHumidityLowNote] = useState<string | null>(null);
  const [humidityHighNote, setHumidityHighNote] = useState<string | null>(null);
  const [error, setError] = useState("");

  const criteriaQuery = useQuery({
    queryKey: ["life-gauge-criteria", userId],
    queryFn: () => getLifeGaugeCriteria(userId),
    enabled: Boolean(userId)
  });
  const weeklyQuery = useQuery({
    queryKey: ["weekly-life", userId],
    queryFn: () => getWeeklyLifeEntries(userId),
    enabled: Boolean(userId)
  });

  const report = useMemo(() => analyzeLifeDirection(weeklyQuery.data ?? []), [weeklyQuery.data]);
  const criteria = criteriaQuery.data;
  const temperatureMinValue =
    temperatureMinC ??
    String(criteria?.temperatureMinC ?? defaultGaugeCriteria.temperatureMinC.toFixed(1));
  const temperatureMaxValue =
    temperatureMaxC ??
    String(criteria?.temperatureMaxC ?? defaultGaugeCriteria.temperatureMaxC.toFixed(1));
  const humidityMinValue =
    humidityMinPercent ??
    String(criteria?.humidityMinPercent ?? defaultGaugeCriteria.humidityMinPercent);
  const humidityMaxValue =
    humidityMaxPercent ??
    String(criteria?.humidityMaxPercent ?? defaultGaugeCriteria.humidityMaxPercent);
  const temperatureDefinitionValue =
    temperatureDefinition ?? criteria?.temperatureDefinition ?? defaults.temperatureDefinition;
  const temperatureLowNoteValue =
    temperatureLowNote ?? criteria?.temperatureLowNote ?? defaults.temperatureLowNote;
  const temperatureHighNoteValue =
    temperatureHighNote ?? criteria?.temperatureHighNote ?? defaults.temperatureHighNote;
  const humidityDefinitionValue =
    humidityDefinition ?? criteria?.humidityDefinition ?? defaults.humidityDefinition;
  const humidityLowNoteValue =
    humidityLowNote ?? criteria?.humidityLowNote ?? defaults.humidityLowNote;
  const humidityHighNoteValue =
    humidityHighNote ?? criteria?.humidityHighNote ?? defaults.humidityHighNote;
  const temperatureMin = toTemperature(temperatureMinValue, defaultGaugeCriteria.temperatureMinC);
  const temperatureMax = toTemperature(temperatureMaxValue, defaultGaugeCriteria.temperatureMaxC);
  const humidityMin = toPercent(humidityMinValue, defaultGaugeCriteria.humidityMinPercent);
  const humidityMax = toPercent(humidityMaxValue, defaultGaugeCriteria.humidityMaxPercent);
  const lifeTemperature = scoreToLifeTemperature(report.temperature);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertLifeGaugeCriteria(userId, {
        targetTemperature: temperatureCToScore((temperatureMin + temperatureMax) / 2),
        targetHumidity: Math.round((humidityMin + humidityMax) / 2),
        temperatureMinC: temperatureMin,
        temperatureMaxC: temperatureMax,
        humidityMinPercent: humidityMin,
        humidityMaxPercent: humidityMax,
        temperatureDefinition: temperatureDefinitionValue.trim(),
        temperatureLowNote: temperatureLowNoteValue.trim(),
        temperatureHighNote: temperatureHighNoteValue.trim(),
        humidityDefinition: humidityDefinitionValue.trim(),
        humidityLowNote: humidityLowNoteValue.trim(),
        humidityHighNote: humidityHighNoteValue.trim()
      }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["life-gauge-criteria", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "기준 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (temperatureMin > temperatureMax || humidityMin > humidityMax) {
      setError("기준 범위의 시작값이 끝값보다 클 수 없습니다.");
      return;
    }

    if (!temperatureDefinitionValue.trim() || !humidityDefinitionValue.trim()) {
      setError("온도와 습도의 의미를 입력해주세요.");
      return;
    }

    saveMutation.mutate();
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="기준" action="Home setting">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <SlidersHorizontal color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                나에게 적정한 온도와 습도
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                기본 기준은 온도 36.0°C-37.3°C, 습도 40%-50%입니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Thermometer}
            label="현재 온도"
            value={`${lifeTemperature.toFixed(1)}°C`}
            helper={gaugeRangeLabel(lifeTemperature, temperatureMin, temperatureMax, "°C")}
            tone="plain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Droplets}
            label="현재 습도"
            value={`${report.humidity}%`}
            helper={gaugeRangeLabel(report.humidity, humidityMin, humidityMax, "%")}
            tone="plain"
          />
        </View>
      </View>

      <ScreenSection title="온도">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={temperatureMinValue}
                onChangeText={setTemperatureMinC}
                placeholder="최소 °C"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={temperatureMaxValue}
                onChangeText={setTemperatureMaxC}
                placeholder="최대 °C"
              />
            </View>
          </View>
          <Field
            multiline
            value={temperatureDefinitionValue}
            onChangeText={setTemperatureDefinition}
            placeholder="나에게 삶의 온도란"
          />
          <Field
            multiline
            value={temperatureLowNoteValue}
            onChangeText={setTemperatureLowNote}
            placeholder="온도가 낮을 때의 신호"
          />
          <Field
            multiline
            value={temperatureHighNoteValue}
            onChangeText={setTemperatureHighNote}
            placeholder="온도가 높을 때의 신호"
          />
        </View>
      </ScreenSection>

      <ScreenSection title="습도">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={humidityMinValue}
                onChangeText={setHumidityMinPercent}
                placeholder="최소 %"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={humidityMaxValue}
                onChangeText={setHumidityMaxPercent}
                placeholder="최대 %"
              />
            </View>
          </View>
          <Field
            multiline
            value={humidityDefinitionValue}
            onChangeText={setHumidityDefinition}
            placeholder="나에게 삶의 습도란"
          />
          <Field
            multiline
            value={humidityLowNoteValue}
            onChangeText={setHumidityLowNote}
            placeholder="습도가 낮을 때의 신호"
          />
          <Field
            multiline
            value={humidityHighNoteValue}
            onChangeText={setHumidityHighNote}
            placeholder="습도가 높을 때의 신호"
          />
        </View>
      </ScreenSection>

      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        disabled={saveMutation.isPending}
        icon={Save}
        label={saveMutation.isPending ? "저장 중" : "기준 저장"}
        onPress={handleSave}
      />

      <ScreenSection title="저장된 기준">
        {criteriaQuery.data ? (
          <AppCard tone="plain">
            <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
              온도 {criteriaQuery.data.temperatureMinC.toFixed(1)}°C-
              {criteriaQuery.data.temperatureMaxC.toFixed(1)}°C · 습도{" "}
              {criteriaQuery.data.humidityMinPercent}%-{criteriaQuery.data.humidityMaxPercent}%
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
              {criteriaQuery.data.temperatureDefinition}
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
              {criteriaQuery.data.humidityDefinition}
            </Text>
          </AppCard>
        ) : (
          <EmptyState
            title="아직 저장된 기준이 없습니다."
            body="기본 기준을 그대로 쓰거나 나에게 맞게 조금 조정하세요."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
