import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TaskForm from "@/components/task-form";
import TaskItem from "@/components/task-item";
import type { Doc } from "@/convex/_generated/dataModel";
import useNetworkStatus from "@/hooks/use-network-status";
import useTasks from "@/hooks/use-tasks";

function OfflineScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-stone-50 px-8">
      <View className="max-w-sm items-center gap-3 rounded-3xl border border-stone-200 bg-white p-8">
        <Ionicons name="cloud-offline-outline" size={44} color="#57534e" />
        <Text className="text-center text-xl font-semibold text-stone-950">You are offline</Text>
        <Text className="text-center leading-6 text-stone-500">
          Reconnect to the internet and your tasks will appear automatically.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function Index() {
  const { isChecking, isOffline } = useNetworkStatus();
  const { data, isLoading } = useTasks(!isOffline && !isChecking);

  const renderItem = useCallback(
    ({ item }: { item: Doc<"tasks"> }) => <TaskItem task={item} />,
    [],
  );

  const keyExtractor = useCallback((item: Doc<"tasks">) => item._id, []);

  if (isChecking) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator color="#0c0a09" />
        <Text className="mt-3 text-stone-500">Checking your connection…</Text>
      </SafeAreaView>
    );
  }

  if (isOffline) return <OfflineScreen />;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "left", "right"]}>
      <View className="border-b border-stone-200 px-6 pb-5 pt-4">
        <Text className="text-3xl font-bold text-stone-950">Tasks</Text>
      </View>

      <FlatList
        className="flex-1"
        contentContainerClassName="grow gap-3 px-6 py-5"
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<TaskForm />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16">
            {isLoading ? (
              <ActivityIndicator color="#0c0a09" />
            ) : (
              <Text className="text-stone-500">No tasks yet. Add your first one above.</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
