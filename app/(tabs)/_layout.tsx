import { LoadingState } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { ChartNoAxesColumn, House, MessageCircle, SlidersHorizontal } from "lucide-react-native";
import { Redirect, Tabs } from "expo-router";
import type { ColorValue } from "react-native";

function createTabIcon(Icon: typeof House) {
  function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return (
      <Icon color={typeof color === "string" ? color : colors.moss} size={size} strokeWidth={2.3} />
    );
  }

  return TabBarIcon;
}

export default function TabLayout() {
  const { loading, session } = useAuth();

  if (loading) {
    return <LoadingState label="세션 확인 중" />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTitleStyle: { color: colors.ink, fontWeight: "900" },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mutedInk,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          minHeight: 70,
          paddingBottom: 8,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "오늘", tabBarLabel: "오늘", tabBarIcon: createTabIcon(House) }}
      />
      <Tabs.Screen name="today" options={{ href: null, title: "Today" }} />
      <Tabs.Screen
        name="train"
        options={{
          href: null,
          title: "운동"
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          href: null,
          title: "식단"
        }}
      />
      <Tabs.Screen
        name="recovery"
        options={{
          href: null,
          title: "회복"
        }}
      />
      <Tabs.Screen
        name="reflect"
        options={{
          href: null,
          title: "마음"
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          href: null,
          title: "신체"
        }}
      />
      <Tabs.Screen name="diary" options={{ href: null, title: "일기" }} />
      <Tabs.Screen
        name="criteria"
        options={{
          title: "마이",
          tabBarLabel: "마이",
          tabBarIcon: createTabIcon(SlidersHorizontal)
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "리포트",
          tabBarLabel: "리포트",
          tabBarIcon: createTabIcon(ChartNoAxesColumn)
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "커뮤니티",
          tabBarLabel: "커뮤니티",
          tabBarIcon: createTabIcon(MessageCircle)
        }}
      />
    </Tabs>
  );
}
