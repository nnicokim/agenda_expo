import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { CalendarPalette } from "../constants/calendarTheme";
import {
  REPEAT_LABELS,
  REPEAT_OPTIONS,
  REPEAT_TYPES,
  type RepeatType,
} from "../constants/repeat";
import {
  fetchAddressSuggestions,
  fetchPlaceDetails,
  isSupabaseConfigured,
  requestForegroundLocationPermission,
  reverseGeocodeToAddress,
  type PlaceSuggestion,
} from "../services/locationService";
import type { NewTaskData, Task } from "../services/taskService";
import { formatTime } from "../utils/dateUtils";
import LocationMap from "./LocationMap";

interface AddTaskFormProps {
  onSubmit: (data: NewTaskData) => Promise<void> | void;
  themeColors: CalendarPalette;
  editingTask?: Task | null;
  onCancelEdit?: () => void;
}

export default function AddTaskForm({
  onSubmit,
  themeColors,
  editingTask = null,
  onCancelEdit,
}: AddTaskFormProps) {
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [text, setText] = useState("");
  const [time, setTime] = useState<string | null>(null);
  const [remindMe, setRemindMe] = useState(false);
  const [repeatType, setRepeatType] = useState<RepeatType>(REPEAT_TYPES.NONE);
  const [showPicker, setShowPicker] = useState(false);
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);
  const [showLocationSection, setShowLocationSection] = useState(false);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (editingTask) {
      setText(editingTask.text);
      setTime(editingTask.time);
      setRemindMe(Boolean(editingTask.remind_me && editingTask.time));
      setRepeatType(editingTask.repeat_type ?? REPEAT_TYPES.NONE);
      setAddress(editingTask.address ?? "");
      setLatitude(editingTask.latitude ?? null);
      setLongitude(editingTask.longitude ?? null);
      setPlaceId(editingTask.place_id ?? null);
      setShowLocationSection(
        Boolean(
          editingTask.address ||
          (editingTask.latitude != null && editingTask.longitude != null),
        ),
      );
      return;
    }

    setText("");
    setTime(null);
    setRemindMe(false);
    setRepeatType(REPEAT_TYPES.NONE);
    setAddress("");
    setLatitude(null);
    setLongitude(null);
    setPlaceId(null);
    setShowLocationSection(false);
    setShowRepeatOptions(false);
  }, [editingTask?.id]);

  useEffect(() => {
    let isMounted = true;
    let watcher: Location.LocationSubscription | null = null;

    async function startWatchingLocation() {
      if (!showLocationSection) return;

      const granted = await requestForegroundLocationPermission();
      if (!granted) {
        if (isMounted) {
          setLocationError("Permiso de ubicación denegado");
        }
        return;
      }

      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setUserLatitude(current.coords.latitude);
          setUserLongitude(current.coords.longitude);
          setLocationError(null);
        }

        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
            timeInterval: 7000,
          },
          (position) => {
            setUserLatitude(position.coords.latitude);
            setUserLongitude(position.coords.longitude);
          },
        );
      } catch {
        if (isMounted) {
          setLocationError("No se pudo obtener la ubicación actual");
        }
      }
    }

    startWatchingLocation();

    return () => {
      isMounted = false;
      if (watcher) watcher.remove();
    };
  }, [showLocationSection]);

  useEffect(() => {
    if (!showLocationSection || !showSuggestions) return;
    const query = address.trim();
    if (query.length < 3 || !isSupabaseConfigured()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      const nextSuggestions = await fetchAddressSuggestions(query);
      setSuggestions(nextSuggestions);
      setIsFetchingSuggestions(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [address, showLocationSection, showSuggestions]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        text: trimmed,
        time,
        remind_me: remindMe && !!time,
        repeat_type: repeatType,
        address: address.trim() || null,
        latitude,
        longitude,
        place_id: placeId,
      });
      setText("");
      setTime(null);
      setRemindMe(false);
      setRepeatType(REPEAT_TYPES.NONE);
      setAddress("");
      setLatitude(null);
      setLongitude(null);
      setPlaceId(null);
      setShowLocationSection(false);
      setShowRepeatOptions(false);
      Keyboard.dismiss();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) {
      const h = String(selected.getHours()).padStart(2, "0");
      const m = String(selected.getMinutes()).padStart(2, "0");
      setTime(`${h}:${m}`);
    }
  };

  const clearTime = () => {
    setTime(null);
    setRemindMe(false);
  };

  const handleMapCoordinateSelect = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setPlaceId(null);

    const resolved = await reverseGeocodeToAddress(lat, lng);
    if (resolved) {
      setAddress(resolved);
    }
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    const details = await fetchPlaceDetails(suggestion.placeId);
    if (!details) return;

    setAddress(details.address || suggestion.description);
    setLatitude(details.latitude);
    setLongitude(details.longitude);
    setPlaceId(details.placeId);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const clearLocation = () => {
    setAddress("");
    setLatitude(null);
    setLongitude(null);
    setPlaceId(null);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const isDisabled = !text.trim();

  // Valor inicial del picker: la hora seleccionada o ahora
  const pickerDate = (() => {
    const d = new Date();
    if (time) {
      const [h, m] = time.split(":").map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  })();

  const selectedLocationText = address.trim()
    ? address.trim()
    : latitude != null && longitude != null
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : "📍 Añadir una ubicación";

  const locationButtonText = showLocationSection
    ? "No añadir ubicación"
    : selectedLocationText;

  const initialMapRegion = {
    latitude: latitude ?? userLatitude ?? -34.6037,
    longitude: longitude ?? userLongitude ?? -58.3816,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.container}>
        {onCancelEdit && (
          <Pressable
            style={styles.cancelEditBtn}
            onPress={onCancelEdit}
            hitSlop={8}
          >
            <Text style={styles.cancelEditText}>
              {editingTask ? "X Cancelar edición" : "X Cancelar"}
            </Text>
          </Pressable>
        )}

        <View style={styles.mainRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={editingTask ? "Editar tarea..." : "Nueva tarea..."}
            placeholderTextColor={themeColors.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            maxLength={120}
          />
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
              isDisabled && styles.addBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isDisabled || isSubmitting}
          >
            <Text style={styles.addBtnText}>✓</Text>
          </Pressable>
        </View>

        <View style={styles.optionsRow}>
          <Pressable style={styles.timeBtn} onPress={() => setShowPicker(true)}>
            <Text style={styles.timeBtnIcon}>🕐</Text>
            <Text style={styles.timeBtnText}>
              {time ? formatTime(time) : "Hora"}
            </Text>
          </Pressable>

          {time && (
            <Pressable onPress={clearTime} style={styles.clearTimeBtn}>
              <Text style={styles.clearTimeBtnText}>✕</Text>
            </Pressable>
          )}

          {time && (
            <Pressable
              style={styles.remindRow}
              onPress={() => setRemindMe((v) => !v)}
            >
              <View
                style={[styles.remindBox, remindMe && styles.remindBoxActive]}
              >
                {remindMe && <Text style={styles.remindCheck}>✓</Text>}
              </View>
              <Text style={styles.remindLabel}>Recordarme</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.repeatSection}>
          <Text style={styles.repeatSectionTitle}>Repetir</Text>

          <Pressable
            style={styles.repeatTrigger}
            onPress={() => setShowRepeatOptions((prev) => !prev)}
          >
            <Text style={styles.repeatTriggerText}>
              {REPEAT_LABELS[repeatType]}
            </Text>
            <Text style={styles.repeatChevron}>
              {showRepeatOptions ? "▲" : "▼"}
            </Text>
          </Pressable>

          {showRepeatOptions && (
            <View style={styles.repeatOptionsBox}>
              <Pressable
                key={REPEAT_TYPES.NONE}
                style={styles.repeatOption}
                onPress={() => {
                  setRepeatType(REPEAT_TYPES.NONE);
                  setShowRepeatOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.repeatOptionText,
                    repeatType === REPEAT_TYPES.NONE &&
                      styles.repeatOptionTextActive,
                  ]}
                >
                  {REPEAT_LABELS[REPEAT_TYPES.NONE]}
                </Text>
              </Pressable>

              {REPEAT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.repeatOption}
                  onPress={() => {
                    setRepeatType(option.value);
                    setShowRepeatOptions(false);
                  }}
                >
                  <Text
                    style={[
                      styles.repeatOptionText,
                      repeatType === option.value &&
                        styles.repeatOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.repeatSectionTitle}>Ubicación</Text>

        <Pressable
          style={styles.locationTrigger}
          onPress={() => setShowLocationSection((prev) => !prev)}
        >
          <Text style={styles.locationTriggerText} numberOfLines={1}>
            {locationButtonText}
          </Text>
        </Pressable>

        {showLocationSection && (
          <View style={styles.locationSection}>
            <TextInput
              style={styles.addressInput}
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                setShowSuggestions(true);
                if (!value.trim()) {
                  setPlaceId(null);
                  setSuggestions([]);
                }
              }}
              placeholder="Buscar o escribir dirección"
              placeholderTextColor={themeColors.textMuted}
            />

            {!isSupabaseConfigured() && (
              <Text style={styles.locationHint}>
                Falta configurar Supabase (URL y anon key) para habilitar
                sugerencias.
              </Text>
            )}

            {isFetchingSuggestions && showSuggestions && (
              <Text style={styles.locationHint}>Buscando direcciones...</Text>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion.placeId}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(suggestion)}
                  >
                    <Text style={styles.suggestionText}>
                      {suggestion.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {locationError && (
              <Text style={styles.locationError}>{locationError}</Text>
            )}

            <Text style={styles.repeatSectionTitle}>
              Seleccionar ubicación en el mapa:
            </Text>

            <LocationMap
              initialRegion={initialMapRegion}
              selectedCoordinate={
                latitude != null && longitude != null
                  ? { latitude, longitude }
                  : null
              }
              onSelectCoordinate={handleMapCoordinateSelect}
              style={styles.map}
              themeColors={themeColors}
            />

            {(address || (latitude != null && longitude != null)) && (
              <Pressable
                style={styles.clearLocationBtn}
                onPress={clearLocation}
              >
                <Text style={styles.clearLocationText}>X Quitar ubicación</Text>
              </Pressable>
            )}
          </View>
        )}

        {showPicker && Platform.OS === "android" && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour={false}
            onChange={handleTimeChange}
          />
        )}

        {showPicker && Platform.OS === "ios" && (
          <Modal transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <DateTimePicker
                  value={pickerDate}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor={themeColors.text}
                />
                <Pressable
                  style={styles.modalDone}
                  onPress={() => setShowPicker(false)}
                >
                  <Text style={styles.modalDoneText}>Listo</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: CalendarPalette) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.screenBg,
      gap: 8,
    },
    mainRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    input: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtnPressed: {
      backgroundColor: colors.accentSoft,
      transform: [{ scale: 0.95 }],
    },
    addBtnDisabled: { backgroundColor: colors.border },
    addBtnText: {
      fontSize: 24,
      color: "#FFF",
      fontWeight: "700",
      lineHeight: 26,
    },
    cancelEditBtn: {
      alignSelf: "flex-end",
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    cancelEditText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "700",
    },
    optionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    repeatSection: {
      gap: 8,
    },
    repeatSectionTitle: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "600",
    },
    repeatTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    repeatTriggerText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "500",
    },
    repeatChevron: {
      fontSize: 11,
      color: colors.textMuted,
    },
    repeatOptionsBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    repeatOption: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    repeatOptionText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "500",
    },
    repeatOptionTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    locationTrigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    locationTriggerText: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      fontWeight: "500",
    },
    locationSection: {
      gap: 8,
    },
    addressInput: {
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
    },
    suggestionsBox: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      overflow: "hidden",
    },
    suggestionItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionText: {
      fontSize: 13,
      color: colors.text,
    },
    locationHint: {
      fontSize: 11,
      color: colors.textMuted,
    },
    locationError: {
      fontSize: 11,
      color: colors.danger,
    },
    map: {
      height: 180,
      borderRadius: 12,
    },
    clearLocationBtn: {
      alignSelf: "flex-end",
      paddingVertical: 4,
    },
    clearLocationText: {
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: "700",
    },
    timeBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    timeBtnIcon: { fontSize: 14 },
    timeBtnText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "500",
    },
    clearTimeBtn: {
      padding: 4,
    },
    clearTimeBtnText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    remindRow: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: "auto",
      gap: 5,
    },
    remindBox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    remindBoxActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    remindCheck: {
      fontSize: 12,
      color: "#FFF",
      fontWeight: "800",
    },
    remindLabel: {
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: "500",
    },
    // Modal iOS
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 30,
      paddingTop: 16,
    },
    modalDone: {
      alignSelf: "center",
      paddingHorizontal: 32,
      paddingVertical: 10,
      backgroundColor: colors.accent,
      borderRadius: 12,
      marginTop: 8,
    },
    modalDoneText: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}
