import {
  AppCard,
  EmptyState,
  Field,
  Pill,
  PrimaryButton,
  SecondaryButton,
  ScreenSection
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { buildProofBody, buildProofTitle, formatLifeEntryProofSummary } from "@/lib/community";
import { createCommunityPost, createLifeEntry, saveJournalEntry } from "@/lib/database";
import { intensityOptions } from "@/lib/life";
import type { LifeEntry, LifeIntensity, LifeStackKey } from "@/types/domain";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Brain, Check, Footprints, MessageCircle, Moon, Save, Utensils } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const stackMeta: {
  key: LifeStackKey;
  label: string;
  helper: string;
  icon: typeof Footprints;
}[] = [
  { key: "move", label: "Move", helper: "몸을 움직인 흔적", icon: Footprints },
  { key: "meal", label: "Meal", helper: "오늘 챙긴 식사 리듬", icon: Utensils },
  { key: "recovery", label: "Recovery", helper: "쉬고 되돌린 상태", icon: Moon },
  { key: "mind", label: "Mind", helper: "읽고 배우고 생각한 것", icon: Brain }
];

const moveCategories = ["걷기", "러닝", "헬스", "요가", "필라테스", "홈트", "기타"];
const recoveryCategories = ["수면", "휴식", "스트레칭", "명상", "목욕", "쉼"];
const mindCategories = ["독서", "공부", "글쓰기", "회고", "명상", "프로젝트"];
const mealSignals = [
  { label: "챙김", value: 72 },
  { label: "규칙적", value: 84 },
  { label: "절제", value: 78 },
  { label: "충분", value: 82 }
];
const recoverySignals = [
  { label: "부족", value: 35 },
  { label: "보통", value: 60 },
  { label: "충분", value: 84 },
  { label: "깊은 회복", value: 94 }
];
const mindSignals = [
  { label: "짧게", value: 50 },
  { label: "보통", value: 65 },
  { label: "몰입", value: 84 },
  { label: "깊게", value: 94 }
];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isStackKey(value: unknown): value is LifeStackKey {
  return value === "move" || value === "meal" || value === "recovery" || value === "mind";
}

export default function TodayScreen() {
  const { stack } = useLocalSearchParams<{ stack?: string }>();
  const initialStack = isStackKey(stack) ? stack : null;
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const authorName = profile?.displayName ?? user?.email?.split("@")[0] ?? "멤버";
  const [activeStacks, setActiveStacks] = useState<Record<LifeStackKey, boolean>>({
    move: initialStack === "move",
    meal: initialStack === "meal",
    recovery: initialStack === "recovery",
    mind: initialStack === "mind"
  });
  const [moveCategory, setMoveCategory] = useState("걷기");
  const [moveMinutes, setMoveMinutes] = useState("20");
  const [moveIntensity, setMoveIntensity] = useState<LifeIntensity>("moderate");
  const [moveMeaning, setMoveMeaning] = useState("몸을 다시 움직였다.");
  const [moveDetail, setMoveDetail] = useState("");
  const [mealSignal, setMealSignal] = useState(mealSignals[0]);
  const [mealSummary, setMealSummary] = useState("식사를 챙겼다");
  const [mealMeaning, setMealMeaning] = useState("완벽하지 않아도 오늘의 리듬을 지켰다.");
  const [mealDetail, setMealDetail] = useState("");
  const [recoveryCategory, setRecoveryCategory] = useState("휴식");
  const [recoveryMinutes, setRecoveryMinutes] = useState("30");
  const [recoverySignal, setRecoverySignal] = useState(recoverySignals[1]);
  const [recoveryMeaning, setRecoveryMeaning] = useState("멈추는 시간을 만들었다.");
  const [recoveryDetail, setRecoveryDetail] = useState("");
  const [mindCategory, setMindCategory] = useState("독서");
  const [mindMinutes, setMindMinutes] = useState("20");
  const [mindSignal, setMindSignal] = useState(mindSignals[1]);
  const [mindMeaning, setMindMeaning] = useState("생각을 조금 앞으로 보냈다.");
  const [mindDetail, setMindDetail] = useState("");
  const [dailyNote, setDailyNote] = useState("");
  const [error, setError] = useState("");
  const [createdEntries, setCreatedEntries] = useState<LifeEntry[]>([]);
  const [shareEntryId, setShareEntryId] = useState<string | null>(null);
  const [shareSummary, setShareSummary] = useState("");
  const [shareQuote, setShareQuote] = useState("");
  const [shareDone, setShareDone] = useState(false);

  const enabledCount = Object.values(activeStacks).filter(Boolean).length;
  const selectedShareEntry = createdEntries.find((entry) => entry.id === shareEntryId) ?? null;

  function toggleStack(key: LifeStackKey) {
    setActiveStacks((current) => ({ ...current, [key]: !current[key] }));
  }

  function chooseShareEntry(entry: LifeEntry) {
    setShareEntryId(entry.id);
    setShareSummary(formatLifeEntryProofSummary(entry));
    setShareQuote(entry.meaning ?? entry.note ?? "");
    setShareDone(false);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries: LifeEntry[] = [];

      if (activeStacks.move) {
        const minutes = toNumber(moveMinutes);
        const intensityScore =
          intensityOptions.find((item) => item.value === moveIntensity)?.score ?? null;
        entries.push(
          await createLifeEntry(userId, {
            stack: "move",
            category: moveCategory,
            title: minutes ? `${moveCategory} · ${minutes}분` : moveCategory,
            durationMinutes: minutes,
            intensity: moveIntensity,
            meaning: moveMeaning.trim(),
            note: moveDetail.trim() || null,
            score: intensityScore,
            details: { detail: moveDetail.trim() || null }
          })
        );
      }

      if (activeStacks.meal) {
        entries.push(
          await createLifeEntry(userId, {
            stack: "meal",
            category: mealSignal.label,
            title: mealSummary.trim() || mealSignal.label,
            meaning: mealMeaning.trim(),
            note: mealDetail.trim() || null,
            score: mealSignal.value,
            details: {
              privacy: "summary_only",
              detail: mealDetail.trim() || null
            }
          })
        );
      }

      if (activeStacks.recovery) {
        const minutes = toNumber(recoveryMinutes);
        entries.push(
          await createLifeEntry(userId, {
            stack: "recovery",
            category: recoveryCategory,
            title: minutes ? `${recoveryCategory} · ${minutes}분` : recoveryCategory,
            durationMinutes: minutes,
            meaning: recoveryMeaning.trim(),
            note: recoveryDetail.trim() || null,
            score: recoverySignal.value,
            details: { quality: recoverySignal.label, detail: recoveryDetail.trim() || null }
          })
        );
      }

      if (activeStacks.mind) {
        const minutes = toNumber(mindMinutes);
        entries.push(
          await createLifeEntry(userId, {
            stack: "mind",
            category: mindCategory,
            title: minutes ? `${mindCategory} · ${minutes}분` : mindCategory,
            durationMinutes: minutes,
            meaning: mindMeaning.trim(),
            note: mindDetail.trim() || null,
            score: mindSignal.value,
            details: { focus: mindSignal.label, detail: mindDetail.trim() || null }
          })
        );
      }

      if (dailyNote.trim()) {
        await saveJournalEntry(userId, {
          mood: "오늘",
          smallWin: "Today’s Better",
          body: dailyNote.trim()
        });
      }

      return entries;
    },
    onSuccess: (entries) => {
      setError("");
      setCreatedEntries(entries);
      setShareDone(false);
      queryClient.invalidateQueries({ queryKey: ["today-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["journal", userId] });

      if (entries[0]) {
        chooseShareEntry(entries[0]);
      }
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Today’s Better 저장에 실패했습니다."
      );
    }
  });

  const shareMutation = useMutation({
    mutationFn: () => {
      if (!selectedShareEntry) {
        throw new Error("공유할 Stack을 선택해주세요.");
      }

      return createCommunityPost(userId, {
        title: buildProofTitle(authorName, "daily_better", null),
        body: buildProofBody(shareSummary, shareQuote),
        authorName,
        postType: "proof",
        stack: selectedShareEntry.stack,
        proofKind: "daily_better",
        sourceLifeEntryId: selectedShareEntry.id
      });
    },
    onSuccess: () => {
      setError("");
      setShareDone(true);
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "작은 인증 공유에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (!enabledCount && !dailyNote.trim()) {
      setError("하나의 Stack 또는 짧은 오늘의 문장을 남겨주세요.");
      return;
    }

    saveMutation.mutate();
  }

  function renderStackToggle(
    key: LifeStackKey,
    label: string,
    helper: string,
    Icon: typeof Footprints
  ) {
    const active = activeStacks[key];

    return (
      <Pressable key={key} accessibilityRole="button" onPress={() => toggleStack(key)}>
        <AppCard tone="plain">
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <Icon color={colors.ink} size={21} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                {label}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 18 }}>
                {helper}
              </Text>
            </View>
            <Pill label={active ? "ON" : "ADD"} active={active} />
          </View>
        </AppCard>
      </Pressable>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 12, fontWeight: "900" }}>
          TODAY’S BETTER
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 34, fontWeight: "900" }}>
          오늘 쌓을 것
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 15, lineHeight: 22 }}>
          하나만 남겨도 충분합니다. 자세한 내용은 필요한 만큼만 적습니다.
        </Text>
      </View>

      <ScreenSection title="Stack" action={enabledCount ? `${enabledCount}개 선택` : "선택"}>
        <View style={{ gap: spacing.sm }}>
          {stackMeta.map((item) => renderStackToggle(item.key, item.label, item.helper, item.icon))}
        </View>
      </ScreenSection>

      {activeStacks.move ? (
        <ScreenSection title="Move">
          <AppCard tone="plain">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {moveCategories.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setMoveCategory(item)}
                >
                  <Pill label={item} active={item === moveCategory} />
                </Pressable>
              ))}
            </View>
            <Field
              keyboardType="numeric"
              value={moveMinutes}
              onChangeText={setMoveMinutes}
              placeholder="시간(분)"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {intensityOptions.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  onPress={() => setMoveIntensity(item.value)}
                >
                  <Pill label={item.label} active={item.value === moveIntensity} />
                </Pressable>
              ))}
            </View>
            <Field
              multiline
              value={moveMeaning}
              onChangeText={setMoveMeaning}
              placeholder="오늘 이 움직임이 가진 의미"
            />
            <Field
              multiline
              value={moveDetail}
              onChangeText={setMoveDetail}
              placeholder="선택 메모"
            />
          </AppCard>
        </ScreenSection>
      ) : null}

      {activeStacks.meal ? (
        <ScreenSection title="Meal">
          <AppCard tone="plain">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {mealSignals.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={() => setMealSignal(item)}
                >
                  <Pill label={item.label} active={item.label === mealSignal.label} />
                </Pressable>
              ))}
            </View>
            <Field
              value={mealSummary}
              onChangeText={setMealSummary}
              placeholder="예: 저녁 챙김, 야식 없음"
            />
            <Field
              multiline
              value={mealMeaning}
              onChangeText={setMealMeaning}
              placeholder="오늘 이 식사가 가진 의미"
            />
            <Field
              multiline
              value={mealDetail}
              onChangeText={setMealDetail}
              placeholder="선택 메모 · 공유 전에는 자동 공개되지 않습니다"
            />
          </AppCard>
        </ScreenSection>
      ) : null}

      {activeStacks.recovery ? (
        <ScreenSection title="Recovery">
          <AppCard tone="plain">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {recoveryCategories.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setRecoveryCategory(item)}
                >
                  <Pill label={item} active={item === recoveryCategory} />
                </Pressable>
              ))}
            </View>
            <Field
              keyboardType="numeric"
              value={recoveryMinutes}
              onChangeText={setRecoveryMinutes}
              placeholder="시간(분)"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {recoverySignals.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={() => setRecoverySignal(item)}
                >
                  <Pill label={item.label} active={item.label === recoverySignal.label} />
                </Pressable>
              ))}
            </View>
            <Field
              multiline
              value={recoveryMeaning}
              onChangeText={setRecoveryMeaning}
              placeholder="오늘 이 회복이 가진 의미"
            />
            <Field
              multiline
              value={recoveryDetail}
              onChangeText={setRecoveryDetail}
              placeholder="선택 메모"
            />
          </AppCard>
        </ScreenSection>
      ) : null}

      {activeStacks.mind ? (
        <ScreenSection title="Mind">
          <AppCard tone="plain">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {mindCategories.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setMindCategory(item)}
                >
                  <Pill label={item} active={item === mindCategory} />
                </Pressable>
              ))}
            </View>
            <Field
              keyboardType="numeric"
              value={mindMinutes}
              onChangeText={setMindMinutes}
              placeholder="시간(분)"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {mindSignals.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={() => setMindSignal(item)}
                >
                  <Pill label={item.label} active={item.label === mindSignal.label} />
                </Pressable>
              ))}
            </View>
            <Field
              multiline
              value={mindMeaning}
              onChangeText={setMindMeaning}
              placeholder="오늘 이 시간이 가진 의미"
            />
            <Field
              multiline
              value={mindDetail}
              onChangeText={setMindDetail}
              placeholder="선택 메모"
            />
          </AppCard>
        </ScreenSection>
      ) : null}

      <ScreenSection title="Note" action="선택">
        <Field
          multiline
          value={dailyNote}
          onChangeText={setDailyNote}
          placeholder="오늘을 짧게 남기고 싶다면"
        />
      </ScreenSection>

      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        disabled={saveMutation.isPending}
        icon={Save}
        label={saveMutation.isPending ? "저장 중" : "Today’s Better 완료"}
        onPress={handleSave}
      />

      <ScreenSection title="작은 인증">
        {createdEntries.length ? (
          <AppCard tone="plain">
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Check color={colors.ink} size={22} strokeWidth={2.4} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                  오늘의 Better가 저장되었습니다.
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                  커뮤니티 공유는 선택입니다. 민감한 내용은 자동으로 공개하지 않습니다.
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {createdEntries.map((entry) => (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  onPress={() => chooseShareEntry(entry)}
                >
                  <Pill label={entry.stack.toUpperCase()} active={entry.id === shareEntryId} />
                </Pressable>
              ))}
            </View>
            <Field value={shareSummary} onChangeText={setShareSummary} placeholder="공유 요약" />
            <Field
              multiline
              value={shareQuote}
              onChangeText={setShareQuote}
              placeholder="공유할 한 문장"
            />
            <PrimaryButton
              disabled={shareMutation.isPending || !selectedShareEntry}
              icon={MessageCircle}
              label={shareMutation.isPending ? "공유 중" : "커뮤니티에 공유"}
              onPress={() => shareMutation.mutate()}
            />
            <SecondaryButton
              icon={MessageCircle}
              label="커뮤니티 보기"
              onPress={() => router.push("/community")}
            />
            {shareDone ? (
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, fontWeight: "800" }}>
                작은 인증을 공유했습니다.
              </Text>
            ) : null}
          </AppCard>
        ) : (
          <EmptyState
            title="저장 후 공유할 수 있습니다."
            body="작은 인증은 선택입니다. 먼저 오늘 쌓은 것을 남겨주세요."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
