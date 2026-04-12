import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { CalendarList } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { CIRCLE_OPTIONS, PALETTES } from "../constants/calendarTheme";
import { useCalendarTheme } from "../hooks/useCalendarTheme";
import { useMarkedDates } from "../hooks/useMarkedDates";
import { todayISO } from "../utils/dateUtils";

const TODAY = todayISO();

export default function CalendarScreen() {
  const { themeKey, activePalette, colorScheme, persistThemeKey } =
    useCalendarTheme();
  const { markedDates, loading, reload } = useMarkedDates(activePalette.accent);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const enrichedMarks = {
    ...markedDates,
    [TODAY]: {
      ...(markedDates[TODAY] ?? {}),
      selected: true,
      selectedColor: activePalette.accent + "55",
      dots: markedDates[TODAY]?.dots ?? [],
    },
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: activePalette.screenBg }]}
    >
      {showHeaderMenu && (
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setShowHeaderMenu(false)}
        />
      )}

      <View
        style={[
          styles.header,
          {
            backgroundColor: activePalette.screenBg,
            borderBottomColor: activePalette.border,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.titlePressable,
            pressed && styles.titlePressablePressed,
          ]}
          onPress={() => setShowHeaderMenu((prev) => !prev)}
        >
          <Text style={[styles.title, { color: activePalette.text }]}>
            🔘 Mi Agenda
          </Text>
        </Pressable>
        <Text style={[styles.subtitle, { color: activePalette.textMuted }]}>
          Tocá un día para ver la semana
        </Text>

        {showHeaderMenu && (
          <View
            style={[
              styles.dropdownMenu,
              {
                backgroundColor: activePalette.cardBg,
                borderColor: activePalette.border,
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setShowHeaderMenu(false);
                router.push("/pending");
              }}
            >
              <Text
                style={[styles.dropdownItemText, { color: activePalette.text }]}
              >
                Ver tareas pendientes
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setShowHeaderMenu(false);
                setShowColorModal(true);
              }}
            >
              <Text
                style={[styles.dropdownItemText, { color: activePalette.text }]}
              >
                Cambiar color del calendario
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={activePalette.accent} />
        </View>
      )}

      <CalendarList
        key={`calendar-${themeKey}-${colorScheme ?? "light"}`}
        pastScrollRange={24}
        futureScrollRange={24}
        onDayPress={(day) => {
          router.push({
            pathname: "/week" as any,
            params: { date: day.dateString },
          });
        }}
        markedDates={enrichedMarks}
        markingType="multi-dot"
        showScrollIndicator={false}
        calendarStyle={{
          ...styles.calendar,
          borderBottomColor: activePalette.border,
        }}
        theme={{
          backgroundColor: activePalette.cardBg,
          calendarBackground: activePalette.cardBg,
          textSectionTitleColor: activePalette.textMuted,
          selectedDayBackgroundColor: activePalette.accent,
          selectedDayTextColor: activePalette.daySelectedText,
          todayTextColor: activePalette.accentSoft,
          dayTextColor: activePalette.text,
          textDisabledColor: activePalette.border,
          dotColor: activePalette.accent,
          monthTextColor: activePalette.text,
          textMonthFontWeight: "700",
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
          arrowColor: activePalette.accent,
        }}
      />

      <Modal
        visible={showColorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowColorModal(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: activePalette.cardBg,
                borderColor: activePalette.border,
              },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: activePalette.text }]}>
              Cambiar color del calendario
            </Text>

            <View style={styles.colorGrid}>
              {CIRCLE_OPTIONS.map((optionKey) => {
                const color = PALETTES[optionKey].screenBg;
                const isSelected = themeKey === optionKey;
                return (
                  <Pressable
                    key={optionKey}
                    style={[
                      styles.colorCircle,
                      {
                        backgroundColor: color,
                        borderColor: isSelected
                          ? activePalette.accent
                          : activePalette.border,
                      },
                    ]}
                    onPress={() => {
                      void persistThemeKey(optionKey);
                      setShowColorModal(false);
                    }}
                  >
                    {isSelected && <Text style={styles.colorCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.deviceButton,
                { borderColor: activePalette.border },
              ]}
              onPress={() => {
                void persistThemeKey("device");
                setShowColorModal(false);
              }}
            >
              <Text
                style={[styles.deviceButtonText, { color: activePalette.text }]}
              >
                Según el dispositivo: claro/oscuro
              </Text>
              {themeKey === "device" && (
                <Text
                  style={[
                    styles.deviceSelected,
                    { color: activePalette.accent },
                  ]}
                >
                  ✓
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    position: "relative",
    zIndex: 2,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  titlePressable: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 8,
  },
  titlePressablePressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  dropdownMenu: {
    position: "absolute",
    top: 62,
    left: 24,
    borderWidth: 1,
    borderRadius: 12,
    minWidth: 220,
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingBar: {
    alignItems: "center",
    paddingBottom: 8,
  },
  calendar: {
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 17,
    gap: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colorCheck: {
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deviceButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deviceButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  deviceSelected: {
    fontSize: 15,
    fontWeight: "800",
  },
});
