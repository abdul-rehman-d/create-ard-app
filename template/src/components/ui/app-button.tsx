import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, type PressableProps, Text } from "react-native";

type AppButtonProps = PressableProps & {
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconOnly?: boolean;
  label: string;
  loading?: boolean;
  variant?: "primary" | "ghost";
};

export default function AppButton({
  accessibilityLabel,
  className,
  disabled,
  icon,
  iconOnly = false,
  label,
  loading = false,
  variant = "primary",
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isGhost = variant === "ghost";
  const foregroundColor = isGhost ? "#dc2626" : "#ffffff";

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl active:opacity-75 ${
        isGhost ? "bg-transparent" : "bg-stone-950"
      } ${iconOnly ? "w-12 px-0" : "px-4"} ${isDisabled ? "opacity-40" : ""} ${className ?? ""}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={foregroundColor} /> : null}
          {iconOnly ? null : (
            <Text className={`font-semibold ${isGhost ? "text-red-600" : "text-white"}`}>
              {label}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}
