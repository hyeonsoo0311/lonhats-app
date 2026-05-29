import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { diaryPrompts } from "@/data/mock-data";
import { getJournalEntries, saveJournalEntry } from "@/lib/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Save } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const moods = ["담담함", "뿌듯함", "흔들림", "가벼움"];

export default function ReflectScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [mood, setMood] = useState("담담함");
  const [smallWin, setSmallWin] = useState("도망가지 않았다.");
  const [entry, setEntry] = useState("오늘은 대단하진 않았지만 다시 돌아왔다.");
  const [error, setError] = useState("");

  const entriesQuery = useQuery({
    queryKey: ["journal", userId],
    queryFn: () => getJournalEntries(userId),
    enabled: Boolean(userId)
  });

  const saveMutation = useMutation({
    mutationFn: () => saveJournalEntry(userId, { mood, smallWin, body: entry }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["journal", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "기록 저장에 실패했습니다."
      );
    }
  });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="오늘의 나">
        <AppCard tone="sky">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <NotebookPen color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text selectable style={{ color: colors.ink, fontSize: 19, fontWeight: "900" }}>
                {diaryPrompts[0]}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                운동을 못 한 날에도 남길 수 있는 기록이 있어야 루틴이 끊기지 않습니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="기분">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {moods.map((item) => (
            <Pressable key={item} accessibilityRole="button" onPress={() => setMood(item)}>
              <Pill label={item} active={item === mood} />
            </Pressable>
          ))}
        </View>
      </ScreenSection>

      <ScreenSection title="한 줄 일기">
        <View style={{ gap: spacing.sm }}>
          <Field value={smallWin} onChangeText={setSmallWin} placeholder="오늘의 작은 승리" />
          <Field
            multiline
            value={entry}
            onChangeText={setEntry}
            placeholder="오늘의 나를 짧게 남겨주세요."
          />
          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={saveMutation.isPending}
            icon={Save}
            label={saveMutation.isPending ? "저장 중" : "오늘 기록 저장"}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </ScreenSection>

      <ScreenSection title="최근 기록">
        {(entriesQuery.data ?? []).length ? (
          (entriesQuery.data ?? []).map((item) => (
            <AppCard key={item.id} tone="plain">
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {item.entryDate} · {item.mood}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {item.smallWin}
              </Text>
              <Text selectable style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>
                {item.body}
              </Text>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 기록이 없습니다."
            body="오늘의 한 줄을 저장하면 계정에 남습니다."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
