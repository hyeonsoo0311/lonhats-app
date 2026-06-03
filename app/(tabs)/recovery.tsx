import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { createLifeEntry, getTodayLifeEntries } from "@/lib/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Save } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const recoveryTypes = ["수면", "낮잠", "휴식", "스트레칭", "명상", "목욕", "기타"];
const recoveryScores = [
  { label: "부족", value: 30 },
  { label: "아슬아슬", value: 55 },
  { label: "괜찮음", value: 75 },
  { label: "충분", value: 92 }
];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function timeToMinutes(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

function sleepMinutesFrom(bedtime: string, wakeTime: string) {
  const bed = timeToMinutes(bedtime);
  const wake = timeToMinutes(wakeTime);

  if (bed === null || wake === null) {
    return null;
  }

  const diff = wake >= bed ? wake - bed : 24 * 60 - bed + wake;
  return diff > 0 ? diff : null;
}

function formatSleep(minutes: number | null) {
  if (!minutes) {
    return "계산 전";
  }

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour}시간 ${minute}분`;
}

export default function RecoveryScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [category, setCategory] = useState("수면");
  const [bedtime, setBedtime] = useState("23:30");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [duration, setDuration] = useState("30");
  const [score, setScore] = useState(recoveryScores[2]);
  const [meaning, setMeaning] = useState("오늘의 몸을 조금 되돌려 놓았다.");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const entriesQuery = useQuery({
    queryKey: ["today-life", userId],
    queryFn: () => getTodayLifeEntries(userId),
    enabled: Boolean(userId)
  });
  const recoveryEntries = (entriesQuery.data ?? []).filter((entry) => entry.stack === "recovery");
  const sleepMinutes = sleepMinutesFrom(bedtime, wakeTime);
  const resolvedDurationMinutes = category === "수면" ? sleepMinutes : toNumber(duration);

  const saveMutation = useMutation({
    mutationFn: () =>
      createLifeEntry(userId, {
        stack: "recovery",
        category,
        title:
          category === "수면"
            ? `수면 · ${formatSleep(sleepMinutes)}`
            : `${category} · ${duration || 0}분`,
        durationMinutes: resolvedDurationMinutes,
        meaning: meaning.trim(),
        note: note.trim() || null,
        score: score.value,
        details: {
          recoveryLevel: score.label,
          bedtime: category === "수면" ? bedtime : null,
          wakeTime: category === "수면" ? wakeTime : null,
          sleepMinutes: category === "수면" ? sleepMinutes : null,
          rawDuration: category === "수면" ? formatSleep(sleepMinutes) : duration
        }
      }),
    onSuccess: () => {
      setError("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["today-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-life", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Recovery 기록 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (!meaning.trim()) {
      setError("오늘 회복의 의미를 남겨주세요.");
      return;
    }

    if (category === "수면" && !sleepMinutes) {
      setError("취침 시간과 기상 시간을 HH:MM 형식으로 입력해주세요.");
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
      <ScreenSection title="Recovery stack" action="습도 기록">
        <AppCard tone="sky">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Moon color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                회복은 성과의 반대가 아니라 지속의 조건입니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                수면, 피로, 휴식의 흔적을 남기면 주간 리포트가 삶의 습도를 읽습니다.
              </Text>
            </View>
          </View>
        </AppCard>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {recoveryTypes.map((item) => (
              <Pressable key={item} accessibilityRole="button" onPress={() => setCategory(item)}>
                <Pill label={item} active={item === category} />
              </Pressable>
            ))}
          </View>
          {category === "수면" ? (
            <>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Field value={bedtime} onChangeText={setBedtime} placeholder="취침 HH:MM" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field value={wakeTime} onChangeText={setWakeTime} placeholder="기상 HH:MM" />
                </View>
              </View>
              <AppCard tone="plain">
                <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                  총 수면 {formatSleep(sleepMinutes)}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                  취침 {bedtime} · 기상 {wakeTime}
                </Text>
              </AppCard>
            </>
          ) : (
            <Field
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
              placeholder="회복 시간(분)"
            />
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {recoveryScores.map((item) => (
              <Pressable key={item.label} accessibilityRole="button" onPress={() => setScore(item)}>
                <Pill label={item.label} active={item.label === score.label} />
              </Pressable>
            ))}
          </View>
          <Field
            multiline
            value={meaning}
            onChangeText={setMeaning}
            placeholder="오늘 회복이 나에게 가진 의미"
          />
          <Field
            multiline
            value={note}
            onChangeText={setNote}
            placeholder="피로감, 수면 질, 몸 상태"
          />
          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={saveMutation.isPending}
            icon={Save}
            label={saveMutation.isPending ? "저장 중" : "Recovery 기록 저장"}
            onPress={handleSave}
          />
        </View>
      </ScreenSection>

      <ScreenSection title="오늘의 Recovery">
        {recoveryEntries.length ? (
          recoveryEntries.map((entry) => (
            <AppCard key={entry.id} tone="plain">
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {entry.title}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                {entry.meaning}
              </Text>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 Recovery 기록이 없습니다."
            body="수면과 휴식을 기록하면 내 삶의 습도가 보입니다."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
