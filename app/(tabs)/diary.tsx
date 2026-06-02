import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { getJournalEntries, saveJournalEntry } from "@/lib/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, NotebookPen, Save } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const moods = ["잔잔함", "괜찮음", "흔들림", "지침", "가벼움"];

export default function DiaryScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [mood, setMood] = useState("괜찮음");
  const [smallWin, setSmallWin] = useState("오늘도 하나는 남겼다.");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const entriesQuery = useQuery({
    queryKey: ["journal", userId],
    queryFn: () => getJournalEntries(userId),
    enabled: Boolean(userId)
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveJournalEntry(userId, {
        mood,
        smallWin: smallWin.trim(),
        body: body.trim()
      }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["journal", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "일기 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (!smallWin.trim()) {
      setError("오늘 남기고 싶은 한 줄을 입력해주세요.");
      return;
    }

    if (!body.trim()) {
      setError("오늘의 일기를 입력해주세요.");
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
      <ScreenSection title="일기" action="하루 정리">
        <AppCard tone="amber">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <NotebookPen color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                기록보다 조금 더 긴 마음의 자리입니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                잘한 일, 흔들린 순간, 내일로 가져가고 싶은 생각을 남깁니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="오늘의 일기">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {moods.map((item) => (
              <Pressable key={item} accessibilityRole="button" onPress={() => setMood(item)}>
                <Pill label={item} active={item === mood} />
              </Pressable>
            ))}
          </View>
          <Field value={smallWin} onChangeText={setSmallWin} placeholder="오늘 남기고 싶은 한 줄" />
          <Field
            multiline
            value={body}
            onChangeText={setBody}
            placeholder="오늘의 마음, 사건, 생각"
          />
          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={saveMutation.isPending}
            icon={Save}
            label={saveMutation.isPending ? "저장 중" : "일기 저장"}
            onPress={handleSave}
          />
        </View>
      </ScreenSection>

      <ScreenSection title="최근 일기">
        {(entriesQuery.data ?? []).length ? (
          (entriesQuery.data ?? []).map((entry) => (
            <AppCard key={entry.id} tone="plain">
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <BookMarked color={colors.amber} size={22} strokeWidth={2.4} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                    {entry.entryDate} · {entry.mood ?? "기록"}
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                    {entry.smallWin}
                  </Text>
                  <Text selectable style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>
                    {entry.body}
                  </Text>
                </View>
              </View>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 일기가 없습니다."
            body="오늘을 길게 남기고 싶을 때 일기를 사용하세요."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
