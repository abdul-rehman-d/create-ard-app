import { Checkbox, Host } from "@expo/ui";
import { View, type ViewProps } from "react-native";

type AppCheckboxProps = ViewProps & {
  value: boolean;
  disabled?: boolean;
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
    <View
      accessible
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
      className={`h-8 w-8 items-center justify-center ${className ?? ""}`}
      {...props}
    >
      <Host matchContents>
        <Checkbox disabled={disabled} value={value} onValueChange={onValueChange} />
      </Host>
    </View>
  );
}
