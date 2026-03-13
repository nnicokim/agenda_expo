import DateTimePicker from "@react-native-community/datetimepicker";
import { useRef, useState } from "react";
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
import { COLORS } from "../constants/colors";
import type { NewTaskData } from "../services/taskService";
import { formatTime } from "../utils/dateUtils";

interface AddTaskFormProps {
  onAdd: (data: NewTaskData) => void;
}

export default function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [text, setText] = useState("");
  const [time, setTime] = useState<string | null>(null);
  const [remindMe, setRemindMe] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({ text: trimmed, time, remind_me: remindMe && !!time });
    setText("");
    setTime(null);
    setRemindMe(false);
    Keyboard.dismiss();
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.container}>
        <View style={styles.mainRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Nueva tarea..."
            placeholderTextColor={COLORS.textMuted}
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
            disabled={isDisabled}
          >
            <Text style={styles.addBtnText}>+</Text>
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
                  textColor={COLORS.text}
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
    gap: 8,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnPressed: {
    backgroundColor: COLORS.accentSoft,
    transform: [{ scale: 0.95 }],
  },
  addBtnDisabled: { backgroundColor: COLORS.border },
  addBtnText: {
    fontSize: 26,
    color: "#FFF",
    fontWeight: "300",
    lineHeight: 30,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  timeBtnIcon: { fontSize: 14 },
  timeBtnText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  },
  clearTimeBtn: {
    padding: 4,
  },
  clearTimeBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  remindRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: 6,
  },
  remindBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  remindBoxActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  remindCheck: {
    fontSize: 11,
    color: "#FFF",
    fontWeight: "800",
  },
  remindLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  // Modal iOS
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    paddingTop: 16,
  },
  modalDone: {
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingVertical: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    marginTop: 8,
  },
  modalDoneText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
