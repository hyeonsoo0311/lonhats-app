import {
  AppCard,
  EmptyState,
  Field,
  LoadingState,
  Pill,
  PrimaryButton,
  ScreenSection
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { proofKindLabels, splitProofBody } from "@/lib/community";
import {
  createCommunityComment,
  getCommunityComments,
  getCommunityPost,
  voteCommunityPost
} from "@/lib/database";
import { stackLabels } from "@/lib/life";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { MessageCircle, Send, ThumbsUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const postQuery = useQuery({
    queryKey: ["community-post", postId],
    queryFn: () => getCommunityPost(postId),
    enabled: Boolean(postId)
  });
  const commentsQuery = useQuery({
    queryKey: ["community-comments", postId],
    queryFn: () => getCommunityComments(postId),
    enabled: Boolean(postId)
  });
  const voteMutation = useMutation({
    mutationFn: (value: 1 | -1) => voteCommunityPost(userId, postId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });
  const commentMutation = useMutation({
    mutationFn: () =>
      createCommunityComment(userId, {
        postId,
        body: body.trim(),
        authorName: profile?.displayName ?? user?.email ?? "멤버"
      }),
    onSuccess: () => {
      setBody("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["community-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "댓글 작성에 실패했습니다."
      );
    }
  });

  if (postQuery.isLoading) {
    return <LoadingState label="게시물 불러오는 중" />;
  }

  const post = postQuery.data;
  const proof = post ? splitProofBody(post.body) : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "게시물" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.canvas }}
        contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 80 }}
      >
        {post ? (
          <AppCard tone="plain">
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ alignItems: "center", gap: spacing.xs, width: 44 }}>
                <Pressable onPress={() => voteMutation.mutate(1)}>
                  <ThumbsUp color={colors.moss} size={18} strokeWidth={2.4} />
                </Pressable>
                <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                  응원 {post.upvoteCount}
                </Text>
              </View>
              <View style={{ flex: 1, gap: spacing.sm }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                  <Pill label={post.postType === "proof" ? "작은 인증" : post.channel} active />
                  {post.proofKind ? <Pill label={proofKindLabels[post.proofKind]} /> : null}
                  {post.stack ? <Pill label={stackLabels[post.stack]} /> : null}
                  <Pill label={post.authorName ?? "멤버"} />
                </View>
                <Text selectable style={{ color: colors.ink, fontSize: 22, fontWeight: "900" }}>
                  {post.title}
                </Text>
                {post.postType === "proof" && proof ? (
                  <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                    {proof.summary}
                  </Text>
                ) : null}
                <Text selectable style={{ color: colors.ink, fontSize: 15, lineHeight: 22 }}>
                  {post.postType === "proof" && proof?.quote ? proof.quote : post.body}
                </Text>
              </View>
            </View>
          </AppCard>
        ) : (
          <EmptyState
            title="게시물을 찾을 수 없습니다."
            body="삭제되었거나 접근할 수 없는 게시물입니다."
          />
        )}

        <ScreenSection title="댓글 작성">
          <View style={{ gap: spacing.sm }}>
            <Field multiline value={body} onChangeText={setBody} placeholder="의견을 남겨주세요." />
            {error ? (
              <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
                {error}
              </Text>
            ) : null}
            <PrimaryButton
              disabled={commentMutation.isPending}
              icon={Send}
              label={commentMutation.isPending ? "작성 중" : "댓글 남기기"}
              onPress={() => {
                if (!body.trim()) {
                  setError("댓글을 입력해주세요.");
                  return;
                }
                commentMutation.mutate();
              }}
            />
          </View>
        </ScreenSection>

        <ScreenSection title="댓글">
          {(commentsQuery.data ?? []).length ? (
            (commentsQuery.data ?? []).map((comment) => (
              <AppCard key={comment.id} tone="plain">
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <MessageCircle color={colors.mutedInk} size={18} strokeWidth={2.4} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text
                      selectable
                      style={{ color: colors.mutedInk, fontSize: 13, fontWeight: "800" }}
                    >
                      {comment.authorName ?? "멤버"}
                    </Text>
                    <Text selectable style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>
                      {comment.body}
                    </Text>
                  </View>
                </View>
              </AppCard>
            ))
          ) : (
            <EmptyState title="아직 댓글이 없습니다." body="첫 의견을 남겨주세요." />
          )}
        </ScreenSection>
      </ScrollView>
    </>
  );
}
