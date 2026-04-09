import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import type { CalendarPalette } from "../constants/calendarTheme";

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Region extends Coordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

interface LocationMapProps {
  initialRegion: Region;
  selectedCoordinate: Coordinate | null;
  onSelectCoordinate: (latitude: number, longitude: number) => void;
  style?: StyleProp<ViewStyle>;
  themeColors: CalendarPalette;
}

export default function LocationMap({ style, themeColors }: LocationMapProps) {
  return (
    <View
      style={[
        styles.fallback,
        {
          borderColor: themeColors.border,
          backgroundColor: themeColors.cardBg,
        },
        style,
      ]}
    >
      <Text style={[styles.title, { color: themeColors.text }]}>
        Mapa todavia no disponible en web
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
});
