import { AppCard, Field, PrimaryButton, SecondaryButton } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { router, Stack } from "expo-router";
import { KeyRound, LogIn } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function ResetPasswordScreen() {
  const { session, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleUpdatePassword() {
    setError("");
    setMessage("");

    if (!session) {
      setError("재설정 메일의 링크로 다시 열어주세요.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상으로 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password);
      setMessage("비밀번호가 변경되었습니다.");
      router.replace("/(tabs)");
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "비밀번호 변경에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "비밀번호 재설정" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.canvas }}
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.lg,
          justifyContent: "center",
          padding: spacing.lg
        }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 12, fontWeight: "900" }}>
            LONHATS · ACCOUNT
          </Text>
          <Text selectable style={{ color: colors.ink, fontSize: 30, fontWeight: "900" }}>
            새 비밀번호를 설정하세요.
          </Text>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
            재설정 메일의 링크로 열린 세션에서만 비밀번호를 바꿀 수 있습니다.
          </Text>
        </View>

        <AppCard tone="plain">
          <View style={{ gap: spacing.md }}>
            <Field
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="새 비밀번호"
            />
            <Field
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="새 비밀번호 확인"
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
              icon={KeyRound}
              label={submitting ? "변경 중" : "비밀번호 변경"}
              onPress={handleUpdatePassword}
            />
            <SecondaryButton
              icon={LogIn}
              label="로그인 화면으로"
              onPress={() => router.replace("/sign-in")}
            />
          </View>
        </AppCard>
      </ScrollView>
    </>
  );
}
