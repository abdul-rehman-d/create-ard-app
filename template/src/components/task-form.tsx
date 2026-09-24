import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Text, View } from "react-native";
import AppButton from "@/components/ui/app-button";
import AppTextInput from "@/components/ui/app-text-input";
import { api } from "@/convex/_generated/api";

export default function TaskForm() {
  const createTask = useMutation(api.tasks.create);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { task: "" },
    onSubmit: async ({ value, formApi }) => {
      setSubmitError(null);
      try {
        await createTask({ text: value.task.trim() });
        formApi.reset();
      } catch {
        setSubmitError("Could not add the task. Please try again.");
      }
    },
  });

  return (
    <View className="mb-3 gap-2">
      <form.Field
        name="task"
        validators={{
          onChange: ({ value }) => (value.trim() ? undefined : "Enter a task first."),
        }}
      >
        {(field) => (
          <View className="gap-2">
            <View className="flex-row items-stretch gap-2">
              <AppTextInput
                accessibilityLabel="New task"
                className="flex-1"
                enterKeyHint="done"
                placeholder="What needs doing?"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                onSubmitEditing={() => void form.handleSubmit()}
              />
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting, state.isPristine]}
              >
                {([canSubmit, isSubmitting, isPristine]) => (
                  <AppButton
                    label="Add"
                    loading={isSubmitting}
                    disabled={!canSubmit || isPristine}
                    onPress={() => void form.handleSubmit()}
                  />
                )}
              </form.Subscribe>
            </View>
            {!field.state.meta.isValid ? (
              <Text accessibilityRole="alert" className="px-1 text-xs text-red-600">
                {field.state.meta.errors.join(", ")}
              </Text>
            ) : null}
          </View>
        )}
      </form.Field>
      {submitError ? (
        <Text accessibilityRole="alert" className="px-1 text-xs text-red-600">
          {submitError}
        </Text>
      ) : null}
    </View>
  );
}
