import { useEffect, useMemo } from "react";
import { useTasksStore } from "../stores/useTasksStore";

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

export function useMarkedDates(dotColor: string): UseMarkedDatesReturn {
  const markedTaskDates = useTasksStore((state) => state.markedTaskDates);
  const loading = useTasksStore((state) => state.markedDatesLoading);
  const reload = useTasksStore((state) => state.loadMarkedTaskDates);

  useEffect(() => {
    void reload();
  }, [reload]);

  const markedDates = useMemo(
    () => buildMarks(markedTaskDates, dotColor),
    [dotColor, markedTaskDates],
  );

  return { markedDates, loading, reload };
}

function buildMarks(dates: string[], dotColor: string): MarkedDates {
  const marks: MarkedDates = {};
  dates.forEach((date) => {
    marks[date] = {
      dots: [{ key: "task", color: dotColor }],
    };
  });
  return marks;
}
