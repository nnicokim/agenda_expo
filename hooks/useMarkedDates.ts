import { useEffect, useState } from "react";
import { COLORS } from "../constants/colors";
import { getTaskDates } from "../services/taskService";

// Tipo que espera react-native-calendars para sus marcadores (MarkedDates)
type MarkedDates = Record<
  string,
  {
    dots: { key: string; color: string }[];
    selected?: boolean;
    selectedColor?: string;
  }
>;

// lo que devolveria el hook (ver return de useMarkedDates)
interface UseMarkedDatesReturn {
  markedDates: MarkedDates;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useMarkedDates(): UseMarkedDatesReturn {
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarkers();
  }, []);

  async function loadMarkers(): Promise<void> {
    try {
      setLoading(true);
      const dates = await getTaskDates();

      // se convierte el array de fechas al formato que espera la librería
      const marks: MarkedDates = {};
      dates.forEach((date) => {
        marks[date] = {
          dots: [{ key: "task", color: COLORS.accent }],
        };
      });
      setMarkedDates(marks);
    } catch (err) {
      console.error("Error cargando marcadores:", err);
    } finally {
      setLoading(false);
    }
  }

  return { markedDates, loading, reload: loadMarkers };
}
