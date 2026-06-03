import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { createBodyLog, getLatestBodyLog, getTodayBodyLogs } from "@/lib/database";
import type { BodyLog } from "@/types/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, UserRound } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const sexOptions: { label: string; value: BodyLog["sex"] }[] = [
  { label: "여성", value: "female" },
  { label: "남성", value: "male" },
  { label: "기타", value: "other" }
];

const conditionOptions = ["좋음", "보통", "피곤함", "무거움", "가벼움"];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 10) / 10 : null;
}

export default function BodyScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const latestQuery = useQuery({
    queryKey: ["latest-body", userId],
    queryFn: () => getLatestBodyLog(userId),
    enabled: Boolean(userId)
  });
  const todayQuery = useQuery({
    queryKey: ["today-body", userId],
    queryFn: () => getTodayBodyLogs(userId),
    enabled: Boolean(userId)
  });
  const latest = latestQuery.data;
  const [heightCm, setHeightCm] = useState(latest?.heightCm ? String(latest.heightCm) : "");
  const [weightKg, setWeightKg] = useState(latest?.weightKg ? String(latest.weightKg) : "");
  const [birthDate, setBirthDate] = useState(latest?.birthDate ?? "");
  const [sex, setSex] = useState<BodyLog["sex"]>(latest?.sex ?? null);
  const [skeletalMuscleKg, setSkeletalMuscleKg] = useState(
    latest?.skeletalMuscleKg ? String(latest.skeletalMuscleKg) : ""
  );
  const [bodyFatPercent, setBodyFatPercent] = useState(
    latest?.bodyFatPercent ? String(latest.bodyFatPercent) : ""
  );
  const [condition, setCondition] = useState(latest?.condition ?? "보통");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const todayLogs = todayQuery.data ?? [];
  const heightValue = heightCm || (latest?.heightCm ? String(latest.heightCm) : "");
  const weightValue = weightKg || (latest?.weightKg ? String(latest.weightKg) : "");
  const birthDateValue = birthDate || latest?.birthDate || "";
  const sexValue = sex ?? latest?.sex ?? null;
  const skeletalMuscleValue =
    skeletalMuscleKg || (latest?.skeletalMuscleKg ? String(latest.skeletalMuscleKg) : "");
  const bodyFatValue =
    bodyFatPercent || (latest?.bodyFatPercent ? String(latest.bodyFatPercent) : "");
  const conditionValue = condition || latest?.condition || "보통";

  const saveMutation = useMutation({
    mutationFn: () =>
      createBodyLog(userId, {
        heightCm: toNumber(heightValue),
        weightKg: toNumber(weightValue),
        birthDate: birthDateValue.trim() || null,
        sex: sexValue,
        skeletalMuscleKg: toNumber(skeletalMuscleValue),
        bodyFatPercent: toNumber(bodyFatValue),
        condition: conditionValue,
        note: note.trim() || null
      }),
    onSuccess: () => {
      setError("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["latest-body", userId] });
      queryClient.invalidateQueries({ queryKey: ["today-body", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "신체 기록 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (
      !heightValue.trim() &&
      !weightValue.trim() &&
      !skeletalMuscleValue.trim() &&
      !bodyFatValue.trim()
    ) {
      setError("하나 이상의 신체 값을 입력해주세요.");
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
      <ScreenSection title="Body" action="개인 기록">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <UserRound color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                몸 상태를 비교가 아니라 기준으로 남깁니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                신체 정보는 개인 기록입니다. 커뮤니티에 자동 공유하지 않습니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="신체 값">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={heightValue}
                onChangeText={setHeightCm}
                placeholder="신장 cm"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={weightValue}
                onChangeText={setWeightKg}
                placeholder="체중 kg"
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={skeletalMuscleValue}
                onChangeText={setSkeletalMuscleKg}
                placeholder="골격근량 kg"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={bodyFatValue}
                onChangeText={setBodyFatPercent}
                placeholder="체지방률 %"
              />
            </View>
          </View>
          <Field
            value={birthDateValue}
            onChangeText={setBirthDate}
            placeholder="생년월일 YYYY-MM-DD"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {sexOptions.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                onPress={() => setSex(option.value)}
              >
                <Pill label={option.label} active={sexValue === option.value} />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {conditionOptions.map((item) => (
              <Pressable key={item} accessibilityRole="button" onPress={() => setCondition(item)}>
                <Pill label={item} active={conditionValue === item} />
              </Pressable>
            ))}
          </View>
          <Field multiline value={note} onChangeText={setNote} placeholder="오늘 몸 상태 메모" />
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
        label={saveMutation.isPending ? "저장 중" : "Body 저장"}
        onPress={handleSave}
      />

      <ScreenSection title="최근 Body">
        {todayLogs.length ? (
          todayLogs.map((log) => (
            <AppCard key={log.id} tone="plain">
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {log.weightKg ? `${log.weightKg}kg` : "체중 미입력"} ·{" "}
                {log.bodyFatPercent ? `${log.bodyFatPercent}%` : "체지방률 미입력"}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                골격근량 {log.skeletalMuscleKg ?? "-"}kg · 컨디션 {log.condition ?? "-"}
              </Text>
            </AppCard>
          ))
        ) : latest ? (
          <AppCard tone="plain">
            <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
              최근 {latest.measuredOn} · {latest.weightKg ?? "-"}kg
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
              골격근량 {latest.skeletalMuscleKg ?? "-"}kg · 체지방률 {latest.bodyFatPercent ?? "-"}%
            </Text>
          </AppCard>
        ) : (
          <EmptyState
            title="아직 Body 기록이 없습니다."
            body="몸의 변화보다 오늘의 상태를 확인하는 기록부터 시작하세요."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
