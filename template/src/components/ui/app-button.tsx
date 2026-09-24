import { ActivityIndicator, Pressable, type PressableProps, Text } from "react-native";

type AppButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "ghost";
};

export default function AppButton({
  className,
  disabled,
  label,
  loading = false,
  variant = "primary",
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isGhost = variant === "ghost";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`min-h-12 items-center justify-center rounded-xl px-4 active:opacity-75 ${
        isGhost ? "bg-transparent" : "bg-stone-950"
      } ${isDisabled ? "opacity-40" : ""} ${className ?? ""}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? "#1c1917" : "#ffffff"} />
      ) : (
        <Text className={`font-semibold ${isGhost ? "text-red-600" : "text-white"}`}>{label}</Text>
      )}
    </Pressable>
  );
}
