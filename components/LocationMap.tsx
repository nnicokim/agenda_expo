import { StyleProp, ViewStyle } from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";
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

export default function LocationMap({
  initialRegion,
  selectedCoordinate,
  onSelectCoordinate,
  style,
}: LocationMapProps) {
  const handlePress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onSelectCoordinate(latitude, longitude);
  };

  return (
    <MapView
      style={style}
      initialRegion={initialRegion}
      showsUserLocation
      onPress={handlePress}
    >
      {selectedCoordinate && <Marker coordinate={selectedCoordinate} />}
    </MapView>
  );
}
