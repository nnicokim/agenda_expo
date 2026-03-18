import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCalendarTheme } from "../hooks/useCalendarTheme";
import { configureNotifications } from "../services/notificationService";

configureNotifications();

export default function RootLayout() {
  const { activePalette, colorScheme } = useCalendarTheme();

  return (
    <>
      <StatusBar
        style={colorScheme === "dark" ? "light" : "dark"}
        backgroundColor={activePalette.screenBg}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: activePalette.screenBg },
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />

        <Stack.Screen
          name="week"
          options={{ animation: "slide_from_bottom" }}
        />
      </Stack>
    </>
  );
}
