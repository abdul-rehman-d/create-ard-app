import { TextInput, type TextInputProps } from "react-native";

export default function AppTextInput({ className, ...props }: TextInputProps) {
  return (
    <TextInput
      className={`min-h-12 rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 ${
        className ?? ""
      }`}
      placeholderTextColor="#78716c"
      {...props}
    />
  );
}
