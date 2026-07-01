import { colors, radii, spacing } from "@/constants/theme";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

type IconComponent = (props: { color?: string; size?: number; strokeWidth?: number }) => ReactNode;

export function ScreenSection({
  title,
  action,
  children
}: {
  title: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text selectable style={{ color: colors.ink, fontSize: 19, fontWeight: "900" }}>
          {title}
        </Text>
        {action ? (
          <Text selectable style={{ color: colors.moss, fontSize: 12, fontWeight: "900" }}>
            {action}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function AppCard({
  children,
  tone = "plain"
}: {
  children: ReactNode;
  tone?: "plain" | "mint" | "blush" | "sky" | "amber";
}) {
  const backgroundColor =
    tone === "amber"
      ? colors.paper
      : tone === "mint"
        ? colors.mint
        : tone === "blush"
          ? colors.blush
          : colors.white;

  return (
    <View
      style={{
        backgroundColor,
        borderCurve: "continuous",
        borderColor: colors.line,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}
    >
      {children}
    </View>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "plain"
}: {
  label: string;
  value: string;
  helper: string;
  icon: IconComponent;
  tone?: ComponentProps<typeof AppCard>["tone"];
}) {
  return (
    <AppCard tone={tone}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.paper,
            borderColor: colors.line,
            borderWidth: 1,
            borderRadius: 999,
            height: 34,
            justifyContent: "center",
            width: 34
          }}
        >
          <Icon color={colors.ink} size={18} strokeWidth={2.3} />
        </View>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 13, fontWeight: "700" }}>
          {label}
        </Text>
      </View>
      <Text selectable style={{ color: colors.ink, fontSize: 28, fontWeight: "900" }}>
        {value}
      </Text>
      <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 18 }}>
        {helper}
      </Text>
    </AppCard>
  );
}

export function PrimaryButton({
  label,
  icon: Icon,
  onPress,
  disabled = false
}: {
  label: string;
  icon: IconComponent;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: disabled ? colors.line : colors.ink,
        borderCurve: "continuous",
        borderRadius: radii.sm,
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: 54,
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: spacing.md
      })}
    >
      <Icon color={colors.white} size={18} strokeWidth={2.4} />
      <Text style={{ color: colors.white, fontSize: 15, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon: Icon,
  onPress,
  disabled = false
}: {
  label: string;
  icon: IconComponent;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? colors.paper : colors.white,
        borderCurve: "continuous",
        borderColor: colors.line,
        borderRadius: radii.sm,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: 52,
        opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        paddingHorizontal: spacing.md
      })}
    >
      <Icon color={colors.ink} size={18} strokeWidth={2.4} />
      <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  keyboardType = "default"
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
}) {
  return (
    <TextInput
      autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedInk}
      secureTextEntry={secureTextEntry}
      value={value}
      style={{
        backgroundColor: colors.paper,
        borderCurve: "continuous",
        borderColor: colors.line,
        borderRadius: radii.sm,
        borderWidth: 1,
        color: colors.ink,
        fontSize: 16,
        minHeight: multiline ? 112 : 54,
        padding: spacing.md,
        textAlignVertical: multiline ? "top" : "center"
      }}
    />
  );
}

export function LoadingState({ label = "불러오는 중" }: { label?: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.canvas,
        flex: 1,
        gap: spacing.sm,
        justifyContent: "center",
        padding: spacing.lg
      }}
    >
      <ActivityIndicator color={colors.moss} />
      <Text style={{ color: colors.mutedInk, fontSize: 14, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <AppCard tone="plain">
      <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
        {title}
      </Text>
      <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
        {body}
      </Text>
    </AppCard>
  );
}

export function Pill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: active ? colors.ink : colors.white,
        borderColor: active ? colors.ink : colors.line,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: 9
      }}
    >
      <Text
        selectable
        style={{
          color: active ? colors.canvas : colors.ink,
          fontSize: 13,
          fontWeight: "800"
        }}
      >
        {label}
      </Text>
    </View>
  );
}
