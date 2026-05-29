import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { createCommunityPost, getCommunityPosts, voteCommunityPost } from "@/lib/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { MessageCircle, Plus, ThumbsDown, ThumbsUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function CommunityScreen() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const postsQuery = useQuery({
    queryKey: ["community-posts"],
    queryFn: getCommunityPosts
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCommunityPost(userId, {
        title: title.trim(),
        body: body.trim(),
        authorName: profile?.displayName ?? user?.email ?? "멤버"
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "게시물 작성에 실패했습니다."
      );
    }
  });

  const voteMutation = useMutation({
    mutationFn: ({ postId, value }: { postId: string; value: 1 | -1 }) =>
      voteCommunityPost(userId, postId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community-posts"] })
  });

  function handleCreate() {
    if (!title.trim() || !body.trim()) {
      setError("제목과 내용을 입력해주세요.");
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
      <ScreenSection title="Better tomorrow" action="하나의 채널">
        <AppCard tone="sky">
          <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
            오늘보다 나은 내일을 만드는 사람들의 피드
          </Text>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
            레딧처럼 게시물, 투표, 댓글 흐름을 기본으로 운영합니다.
          </Text>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="게시물 작성">
        <View style={{ gap: spacing.sm }}>
          <Field value={title} onChangeText={setTitle} placeholder="제목" />
          <Field
            multiline
            value={body}
            onChangeText={setBody}
            placeholder="공유하고 싶은 루틴, 고민, 기록"
          />
          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={createMutation.isPending}
            icon={Plus}
            label={createMutation.isPending ? "작성 중" : "게시하기"}
            onPress={handleCreate}
          />
        </View>
      </ScreenSection>

      <ScreenSection title="피드">
        {(postsQuery.data ?? []).length ? (
          (postsQuery.data ?? []).map((post) => (
            <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}`)}>
              <AppCard tone="plain">
                <View style={{ flexDirection: "row", gap: spacing.md }}>
                  <View style={{ alignItems: "center", gap: spacing.xs, width: 44 }}>
                    <Pressable onPress={() => voteMutation.mutate({ postId: post.id, value: 1 })}>
                      <ThumbsUp color={colors.moss} size={18} strokeWidth={2.4} />
                    </Pressable>
                    <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                      {post.upvoteCount}
                    </Text>
                    <Pressable onPress={() => voteMutation.mutate({ postId: post.id, value: -1 })}>
                      <ThumbsDown color={colors.mutedInk} size={18} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                      <Pill label={post.channel} active />
                      <Pill label={post.authorName ?? "멤버"} />
                    </View>
                    <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                      {post.title}
                    </Text>
                    <Text
                      selectable
                      style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}
                    >
                      {post.body}
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
          ))
        ) : (
          <EmptyState
            title="아직 게시물이 없습니다."
            body="첫 게시물을 남기면 Better tomorrow 피드가 시작됩니다."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
