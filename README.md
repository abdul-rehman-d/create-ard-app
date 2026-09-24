# create-expo-convex-app

A personal, native-first Expo starter generator with Convex, NativeWind, TanStack Form, Expo UI, and Biome.

## Use it

From this repository:

```sh
npm install
npm link
create-expo-convex-app my-app
```

After publishing:

```sh
npx create-expo-convex-app@latest my-app
```

The CLI detects the package manager that launched it. You can override that choice:

```sh
npx create-expo-convex-app@latest my-app --package-manager pnpm
```

Use `--skip-convex` when you want to defer the interactive `convex dev --once` step.

## What it creates

- The latest default `create-expo-app` project, reduced to iOS and Android.
- A small Expo Router app under `src/app`.
- A bounded Convex task query plus create, update, and remove mutations.
- Reusable NativeWind button and text-input primitives.
- A reusable Expo UI universal checkbox.
- A TanStack Form-powered task form.
- An offline screen driven by NetInfo.
- Biome lint, format, and check scripts.

The CLI does not overwrite the generated `package.json`. It installs with the selected package manager and then merges only the scripts it owns.

## Development

```sh
npm run check
npm run typecheck
npm test
npm pack --dry-run
```
