import { useMutation } from "convex/react";
import { useState } from "react";
import { Text, View } from "react-native";
import AppButton from "@/components/ui/app-button";
import AppCheckbox from "@/components/ui/app-checkbox";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

type TaskItemProps = {
  task: Doc<"tasks">;
};

export default function TaskItem({ task }: TaskItemProps) {
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleTask(isCompleted: boolean) {
    setError(null);
    try {
      await updateTask({ id: task._id, isCompleted });
    } catch {
      setError("Could not update this task.");
    }
  }

  async function deleteTask() {
    setError(null);
    setIsRemoving(true);
    try {
      await removeTask({ id: task._id });
    } catch {
      setError("Could not delete this task.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <View className="gap-1 rounded-2xl border border-stone-200 bg-white p-4">
      <View className="flex-row items-center gap-3">
        <AppCheckbox
          accessibilityLabel={`Mark ${task.text} as ${task.isCompleted ? "incomplete" : "complete"}`}
          value={task.isCompleted}
          onValueChange={(value) => void toggleTask(value)}
        />
        <Text
          className={`flex-1 text-base ${
            task.isCompleted ? "text-stone-400 line-through" : "text-stone-900"
          }`}
        >
          {task.text}
        </Text>
        <AppButton
          label="Delete"
          variant="ghost"
          loading={isRemoving}
          accessibilityLabel={`Delete ${task.text}`}
          onPress={() => void deleteTask()}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="pl-11 text-xs text-red-600">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
