import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  buildProofBody,
  buildProofTitle,
  formatLifeEntryProofSummary,
  proofKindLabels,
  proofKindOptions,
  splitProofBody
} from "@/lib/community";
import {
  createCommunityPost,
  getCommunityPosts,
  getTodayLifeEntries,
  voteCommunityPost
} from "@/lib/database";
import { stackLabels } from "@/lib/life";
import type { CommunityProofKind, LifeEntry, LifeStackKey } from "@/types/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Brain,
  CheckCircle2,
  Footprints,
  MessageCircle,
  Moon,
  Plus,
  ThumbsUp,
  Utensils
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const stackOptions: { value: LifeStackKey; icon: typeof Footprints }[] = [
  { value: "move", icon: Footprints },
  { value: "meal", icon: Utensils },
  { value: "recovery", icon: Moon },
  { value: "mind", icon: Brain }
];

function toChallengeDay(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 1), 7) : 1;
}

export default function CommunityScreen() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const authorName = profile?.displayName ?? user?.email?.split("@")[0] ?? "멤버";
  const [proofKind, setProofKind] = useState<CommunityProofKind>("daily_better");
  const [selectedStack, setSelectedStack] = useState<LifeStackKey>("move");
  const [sourceLifeEntryId, setSourceLifeEntryId] = useState<string | null>(null);
  const [challengeDay, setChallengeDay] = useState("5");
  const [summary, setSummary] = useState("");
  const [quote, setQuote] = useState("");
  const [error, setError] = useState("");

  const postsQuery = useQuery({
    queryKey: ["community-posts"],
    queryFn: getCommunityPosts
  });
  const todayEntriesQuery = useQuery({
    queryKey: ["today-life", userId],
    queryFn: () => getTodayLifeEntries(userId),
    enabled: Boolean(userId)
  });

  const dayNumber = toChallengeDay(challengeDay);
  const titlePreview = buildProofTitle(
    authorName,
    proofKind,
    proofKind === "challenge_day" ? dayNumber : null
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createCommunityPost(userId, {
        title: titlePreview,
        body: buildProofBody(summary, quote),
        authorName,
        postType: "proof",
        stack: selectedStack,
        proofKind,
        sourceLifeEntryId,
        challengeDay: proofKind === "challenge_day" ? dayNumber : null
      }),
    onSuccess: () => {
      setSummary("");
      setQuote("");
      setSourceLifeEntryId(null);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "작은 인증 공유에 실패했습니다."
      );
    }
  });

  const voteMutation = useMutation({
    mutationFn: ({ postId, value }: { postId: string; value: 1 | -1 }) =>
      voteCommunityPost(userId, postId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community-posts"] })
  });

  function selectLifeEntry(entry: LifeEntry) {
    setSelectedStack(entry.stack);
    setSourceLifeEntryId(entry.id);
    setSummary(formatLifeEntryProofSummary(entry));
    setQuote(entry.meaning ?? entry.note ?? "");
  }

  function handleCreate() {
    if (!summary.trim()) {
      setError("인증 요약을 입력해주세요.");
      return;
    }

    if (!quote.trim()) {
      setError("오늘의 한 줄을 입력해주세요.");
      return;
    }

    createMutation.mutate();
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="Better tomorrow" action="작은 인증">
        <AppCard tone="sky">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <CheckCircle2 color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                완벽한 성공보다 오늘 남긴 방향을 공유합니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                걷기, 식사, 회복, 공부처럼 작지만 실제로 해낸 일을 남깁니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="작은 인증 작성">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {proofKindOptions.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                onPress={() => setProofKind(item.value)}
              >
                <Pill label={item.label} active={item.value === proofKind} />
              </Pressable>
            ))}
          </View>

          {proofKind === "challenge_day" ? (
            <Field
              keyboardType="numeric"
              value={challengeDay}
              onChangeText={setChallengeDay}
              placeholder="챌린지 n일차"
            />
          ) : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {stackOptions.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedStack(item.value);
                  setSourceLifeEntryId(null);
                }}
              >
                <Pill label={stackLabels[item.value]} active={item.value === selectedStack} />
              </Pressable>
            ))}
          </View>

          <AppCard tone="plain">
            <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
              {titlePreview}
            </Text>
          </AppCard>

          <Field
            value={summary}
            onChangeText={(value) => {
              setSummary(value);
              setSourceLifeEntryId(null);
            }}
            placeholder="예: Move Stack · 30분 걷기 · 적당히"
          />
          <Field
            multiline
            value={quote}
            onChangeText={setQuote}
            placeholder="예: 퇴근하고 바로 누울 뻔했는데, 20분만 걷고 왔다."
          />

          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={createMutation.isPending}
            icon={Plus}
            label={createMutation.isPending ? "공유 중" : "작은 인증 공유"}
            onPress={handleCreate}
          />
        </View>
      </ScreenSection>

      <ScreenSection title="오늘 기록에서 선택">
        {(todayEntriesQuery.data ?? []).length ? (
          <View style={{ gap: spacing.sm }}>
            {(todayEntriesQuery.data ?? []).map((entry) => (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                onPress={() => selectLifeEntry(entry)}
              >
                <AppCard tone={sourceLifeEntryId === entry.id ? "mint" : "plain"}>
                  <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                    {formatLifeEntryProofSummary(entry)}
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                    {entry.meaning ?? entry.note ?? "오늘의 의미가 비어 있습니다."}
                  </Text>
                </AppCard>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            title="오늘 공유할 기록이 없습니다."
            body="직접 인증을 쓰거나 먼저 네 Stack 중 하나를 기록하세요."
          />
        )}
      </ScreenSection>

      <ScreenSection title="피드">
        {(postsQuery.data ?? []).length ? (
          (postsQuery.data ?? []).map((post) => {
            const proof = splitProofBody(post.body);

            return (
              <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}`)}>
                <AppCard tone={post.postType === "proof" ? "plain" : "sky"}>
                  <View style={{ flexDirection: "row", gap: spacing.md }}>
                    <View style={{ alignItems: "center", gap: spacing.xs, width: 44 }}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => voteMutation.mutate({ postId: post.id, value: 1 })}
                      >
                        <ThumbsUp color={colors.moss} size={18} strokeWidth={2.4} />
                      </Pressable>
                      <Text
                        selectable
                        style={{
                          color: colors.ink,
                          fontSize: 13,
                          fontWeight: "900",
                          textAlign: "center"
                        }}
                      >
                        응원 {post.upvoteCount}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                        <Pill
                          label={post.postType === "proof" ? "작은 인증" : post.channel}
                          active
                        />
                        {post.proofKind ? <Pill label={proofKindLabels[post.proofKind]} /> : null}
                        {post.stack ? <Pill label={stackLabels[post.stack]} /> : null}
                      </View>
                      <Text
                        selectable
                        style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}
                      >
                        {post.title}
                      </Text>
                      {post.postType === "proof" ? (
                        <Text
                          selectable
                          style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}
                        >
                          {proof.summary}
                        </Text>
                      ) : null}
                      <Text
                        selectable
                        style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}
                      >
                        {post.postType === "proof" ? proof.quote : post.body}
                      </Text>
                      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}>
                        <MessageCircle color={colors.mutedInk} size={16} strokeWidth={2.4} />
                        <Text selectable style={{ color: colors.mutedInk, fontSize: 13 }}>
                          댓글 {post.commentCount}
                        </Text>
                      </View>
                    </View>
                  </View>
                </AppCard>
              </Pressable>
            );
          })
        ) : (
          <EmptyState
            title="아직 작은 인증이 없습니다."
            body="첫 인증을 남기면 Better tomorrow 피드가 시작됩니다."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
