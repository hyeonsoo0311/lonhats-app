import { colors } from "@/constants/theme";
import { BookOpenText, ChartNoAxesColumn, Dumbbell, House, Utensils } from "lucide-react-native";
import { Tabs } from "expo-router";
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
