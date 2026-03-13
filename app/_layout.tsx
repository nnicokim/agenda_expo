import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import { configureNotifications } from "../services/notificationService";

configureNotifications();

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.bg} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bg },
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
