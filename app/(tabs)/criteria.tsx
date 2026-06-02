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
  targetTemperature: "70",
  targetHumidity: "70",
  temperatureDefinition: "나에게 삶의 온도는 몸을 움직이고 생각이 앞으로 가는 느낌이다.",
  temperatureLowNote: "온도가 낮다는 것은 움직임과 몰입이 줄어드는 신호다.",
  temperatureHighNote: "온도가 너무 높다는 것은 무리하거나 과열되는 신호일 수 있다.",
  humidityDefinition: "나에게 삶의 습도는 회복, 식사 리듬, 마음의 안정감이다.",
  humidityLowNote: "습도가 낮다는 것은 잠, 휴식, 식사 리듬을 다시 봐야 한다는 신호다.",
  humidityHighNote: "습도가 너무 높다는 것은 편안하지만 정체되어 있는지 살펴볼 신호다."
};

function toGaugeValue(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 70;
  }

  return Math.min(Math.max(Math.round(parsed), 0), 100);
}

function gapLabel(current: number, target: number) {
  const gap = current - target;

  if (Math.abs(gap) <= 8) {
    return "내 기준에 가깝습니다.";
  }

  if (gap > 0) {
    return "내 기준보다 높습니다.";
  }

  return "내 기준보다 낮습니다.";
}

export default function CriteriaScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [targetTemperature, setTargetTemperature] = useState<string | null>(null);
  const [targetHumidity, setTargetHumidity] = useState<string | null>(null);
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
  const targetTemperatureValue =
    targetTemperature ?? String(criteria?.targetTemperature ?? defaults.targetTemperature);
  const targetHumidityValue =
    targetHumidity ?? String(criteria?.targetHumidity ?? defaults.targetHumidity);
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

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertLifeGaugeCriteria(userId, {
        targetTemperature: toGaugeValue(targetTemperatureValue),
        targetHumidity: toGaugeValue(targetHumidityValue),
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
      <ScreenSection title="나의 기준" action="온도와 습도">
        <AppCard tone="sky">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <SlidersHorizontal color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                같은 숫자라도 사람마다 의미는 다릅니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                삶의 온도와 습도를 내 기준으로 평가할 수 있게 목표와 해석을 적어둡니다.
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
            value={`${report.temperature}°`}
            helper={gapLabel(report.temperature, toGaugeValue(targetTemperatureValue))}
            tone="mint"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Droplets}
            label="현재 습도"
            value={`${report.humidity}%`}
            helper={gapLabel(report.humidity, toGaugeValue(targetHumidityValue))}
            tone="sky"
          />
        </View>
      </View>

      <ScreenSection title="온도 기준">
        <View style={{ gap: spacing.sm }}>
          <Field
            keyboardType="numeric"
            value={targetTemperatureValue}
            onChangeText={setTargetTemperature}
            placeholder="목표 온도 0-100"
          />
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
            placeholder="온도가 너무 높을 때의 신호"
          />
        </View>
      </ScreenSection>

      <ScreenSection title="습도 기준">
        <View style={{ gap: spacing.sm }}>
          <Field
            keyboardType="numeric"
            value={targetHumidityValue}
            onChangeText={setTargetHumidity}
            placeholder="목표 습도 0-100"
          />
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
            placeholder="습도가 너무 높을 때의 신호"
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
        label={saveMutation.isPending ? "저장 중" : "나의 기준 저장"}
        onPress={handleSave}
      />

      <ScreenSection title="저장된 기준">
        {criteriaQuery.data ? (
          <AppCard tone="plain">
            <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
              목표 온도 {criteriaQuery.data.targetTemperature}° · 목표 습도{" "}
              {criteriaQuery.data.targetHumidity}%
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
            body="내가 어떤 삶의 온도와 습도를 원하고 있는지 먼저 적어보세요."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
