import { AppCard, Field, PrimaryButton, SecondaryButton } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { Redirect } from "expo-router";
import { LogIn, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

export default function SignInScreen() {
  const { loading: authLoading, session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && session) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSubmit() {
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    if (mode === "sign-up" && !displayName.trim()) {
      setError("앱에서 사용할 이름을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "sign-up") {
        const nextMessage = await signUp({ email, password, displayName });
        setMessage(nextMessage);
      } else {
        await signIn(email, password);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "인증 처리에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ backgroundColor: colors.canvas, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.lg,
          justifyContent: "center",
          padding: spacing.lg
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ color: colors.moss, fontSize: 15, fontWeight: "900" }}>
            lonhats
          </Text>
          <Text selectable style={{ color: colors.ink, fontSize: 36, fontWeight: "900" }}>
            어제보다 나은 오늘을 기록하세요.
          </Text>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 15, lineHeight: 22 }}>
            이메일 인증 후 운동, 식단, 기록, 커뮤니티 데이터가 Supabase에 안전하게 저장됩니다.
          </Text>
        </View>

        <AppCard tone="plain">
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton icon={LogIn} label="로그인" onPress={() => setMode("sign-in")} />
              </View>
              <View style={{ flex: 1 }}>
                <SecondaryButton
                  icon={UserPlus}
                  label="회원가입"
                  onPress={() => setMode("sign-up")}
                />
              </View>
            </View>

            {mode === "sign-up" ? (
              <Field
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="앱에서 사용할 이름"
              />
            ) : null}
            <Field
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
            />
            <Field
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
            />

            {message ? (
              <Text selectable style={{ color: colors.moss, fontSize: 14, fontWeight: "800" }}>
                {message}
              </Text>
            ) : null}
            {error ? (
              <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
                {error}
              </Text>
            ) : null}

            <PrimaryButton
              disabled={submitting}
              icon={mode === "sign-up" ? UserPlus : LogIn}
              label={submitting ? "처리 중" : mode === "sign-up" ? "인증 메일 받기" : "로그인"}
              onPress={handleSubmit}
            />
          </View>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
