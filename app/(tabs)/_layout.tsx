import { LoadingState } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  BookOpenText,
  ChartNoAxesColumn,
  Dumbbell,
  House,
  MessageSquareText,
  Utensils
} from "lucide-react-native";
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
        tabBarActiveTintColor: colors.moss,
        tabBarInactiveTintColor: colors.mutedInk,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          minHeight: 64,
          paddingTop: 6
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "오늘", tabBarLabel: "오늘", tabBarIcon: createTabIcon(House) }}
      />
      <Tabs.Screen
        name="train"
        options={{ title: "운동", tabBarLabel: "운동", tabBarIcon: createTabIcon(Dumbbell) }}
      />
      <Tabs.Screen
        name="fuel"
        options={{ title: "식단", tabBarLabel: "식단", tabBarIcon: createTabIcon(Utensils) }}
      />
      <Tabs.Screen
        name="reflect"
        options={{ title: "기록", tabBarLabel: "기록", tabBarIcon: createTabIcon(BookOpenText) }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "커뮤니티",
          tabBarLabel: "커뮤니티",
          tabBarIcon: createTabIcon(MessageSquareText)
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "분석",
          tabBarLabel: "분석",
          tabBarIcon: createTabIcon(ChartNoAxesColumn)
        }}
      />
    </Tabs>
  );
}
