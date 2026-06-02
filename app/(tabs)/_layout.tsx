import { LoadingState } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { Brain, ChartNoAxesColumn, Footprints, House, Moon, Utensils } from "lucide-react-native";
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
        options={{ title: "기록", tabBarLabel: "기록", tabBarIcon: createTabIcon(House) }}
      />
      <Tabs.Screen
        name="train"
        options={{ title: "Move", tabBarLabel: "Move", tabBarIcon: createTabIcon(Footprints) }}
      />
      <Tabs.Screen
        name="fuel"
        options={{ title: "Meal", tabBarLabel: "Meal", tabBarIcon: createTabIcon(Utensils) }}
      />
      <Tabs.Screen
        name="recovery"
        options={{ title: "Recovery", tabBarLabel: "Recovery", tabBarIcon: createTabIcon(Moon) }}
      />
      <Tabs.Screen
        name="reflect"
        options={{ title: "Mind", tabBarLabel: "Mind", tabBarIcon: createTabIcon(Brain) }}
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
      <Tabs.Screen name="community" options={{ href: null }} />
    </Tabs>
  );
}
