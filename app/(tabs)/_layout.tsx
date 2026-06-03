import { LoadingState } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  ChartNoAxesColumn,
  Footprints,
  House,
  MessageCircle,
  Moon,
  NotebookPen,
  Plus,
  SlidersHorizontal,
  UserRound,
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
        options={{ title: "홈", tabBarLabel: "홈", tabBarIcon: createTabIcon(House) }}
      />
      <Tabs.Screen
        name="today"
        options={{ title: "Today", tabBarLabel: "Today", tabBarIcon: createTabIcon(Plus) }}
      />
      <Tabs.Screen
        name="train"
        options={{
          href: null,
          title: "Move",
          tabBarLabel: "Move",
          tabBarIcon: createTabIcon(Footprints)
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          href: null,
          title: "Meal",
          tabBarLabel: "Meal",
          tabBarIcon: createTabIcon(Utensils)
        }}
      />
      <Tabs.Screen
        name="recovery"
        options={{
          href: null,
          title: "Recovery",
          tabBarLabel: "Recovery",
          tabBarIcon: createTabIcon(Moon)
        }}
      />
      <Tabs.Screen
        name="reflect"
        options={{
          href: null,
          title: "Mind",
          tabBarLabel: "Mind",
          tabBarIcon: createTabIcon(NotebookPen)
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          href: null,
          title: "Body",
          tabBarLabel: "Body",
          tabBarIcon: createTabIcon(UserRound)
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{ title: "일기", tabBarLabel: "일기", tabBarIcon: createTabIcon(NotebookPen) }}
      />
      <Tabs.Screen
        name="criteria"
        options={{
          href: null,
          title: "나의 기준",
          tabBarLabel: "기준",
          tabBarIcon: createTabIcon(SlidersHorizontal)
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          href: null,
          title: "Report",
          tabBarLabel: "Report",
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
