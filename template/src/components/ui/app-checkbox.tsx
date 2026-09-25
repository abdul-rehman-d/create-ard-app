import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, type PressableProps } from "react-native";

type AppCheckboxProps = Omit<PressableProps, "onPress"> & {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export default function AppCheckbox({
  className,
  disabled,
  onValueChange,
  value,
  ...props
}: AppCheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      className={`h-8 w-8 items-center justify-center ${className ?? ""}`}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      {...props}
    >
      <Ionicons
        name={value ? "checkbox" : "square-outline"}
        size={26}
        color={disabled ? "#a8a29e" : "#1c1917"}
      />
    </Pressable>
  );
}
