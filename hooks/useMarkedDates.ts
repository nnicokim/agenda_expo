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
    const hasMarks = Object.keys(markedDates).length > 0;
    const request = getTaskDates();

    try {
      if (hasMarks) {
        const dates = await request;
        setMarkedDates(buildMarks(dates));
        return;
      }

      setLoading(true);

      // Si tarda mas de 900ms, se oculta el spinner
      let didTimeout = false;
      const timeoutMs = 900;
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          didTimeout = true;
          resolve(null);
        }, timeoutMs);
      });

      const firstResult = await Promise.race([
        request.then((dates) => dates as string[] | null),
        timeoutPromise,
      ]);

      if (didTimeout || !firstResult) {
        setLoading(false);
        const dates = await request;
        setMarkedDates(buildMarks(dates));
        return;
      }

      setMarkedDates(buildMarks(firstResult));
    } catch (err) {
      console.error("Error cargando marcadores:", err);
    } finally {
      setLoading(false);
    }
  }

  return { markedDates, loading, reload: loadMarkers };
}

function buildMarks(dates: string[]): MarkedDates {
  const marks: MarkedDates = {};
  dates.forEach((date) => {
    marks[date] = {
      dots: [{ key: "task", color: COLORS.accent }],
    };
  });
  return marks;
}
