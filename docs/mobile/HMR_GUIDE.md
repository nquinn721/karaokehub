# Hot Module Replacement (HMR) Setup Guide

This guide ensures Hot Module Replacement works properly with your React Native Expo app.

## 🔥 What's Been Configured

### 1. Metro Configuration (`metro.config.js`)

- Enables Fast Refresh
- Optimizes watch folders
- Configures transformer for better HMR performance

### 2. Package Scripts (`package.json`)

- `npm start` - Start with dev client and HMR enabled
- `npm run start:dev` - Start with cleared cache
- `npm run start:tunnel` - Start with tunnel for remote testing

### 3. App Configuration (`app.config.js`)

- Added `expo-dev-client` plugin
- Configured development client settings
- Enabled silent launch for better debugging

### 4. Development Scripts

- `start-dev.sh` (Linux/Mac)
- `start-dev.bat` (Windows)

## 🚀 How to Use HMR

### For Development Builds (Recommended)

1. **Build development client** (one-time setup):

   ```bash
   cd app
   eas build --profile development --platform android
   ```

2. **Install the development build** on your device

3. **Start development server**:

   ```bash
   npm run start:dev
   ```

4. **Open the app** on your device and connect to the dev server

### For Expo Go (Limited HMR)

```bash
npm start
```

Note: Some native modules won't work in Expo Go

## ✅ HMR Features

### What Auto-Reloads:

- ✅ Component changes
- ✅ Style updates
- ✅ Text/content changes
- ✅ State modifications
- ✅ Hook changes
- ✅ MobX store updates

### What Requires Manual Reload:

- ❗ New dependencies/imports
- ❗ Native module changes
- ❗ App.tsx root changes
- ❗ Metro config changes

## 🛠️ Troubleshooting HMR Issues

### 1. HMR Not Working At All

```bash
# Clear all caches
npm run start:dev

# Or manually:
npx expo start --clear --dev-client
rm -rf node_modules/.cache
npm cache clean --force
```

### 2. Slow HMR Performance

- Ensure you're on the same WiFi network
- Use USB connection if possible
- Close other Metro instances
- Restart the Metro server

### 3. Changes Not Reflecting

1. **Check the console** for errors
2. **Enable Fast Refresh** in development menu:
   - Shake device → "Enable Fast Refresh"
3. **Manual reload** if needed:
   - Shake device → "Reload"

### 4. Network Issues

```bash
# Use tunnel mode for remote testing
npm run start:tunnel
```

### 5. MobX Store Changes Not Updating

- Ensure components are wrapped with `observer()`
- Check MobX store actions are properly defined
- Verify store methods are bound correctly

## 📱 Development Menu

Access via:

- **Android**: Shake device or `Cmd + M` (emulator)
- **iOS**: Shake device or `Cmd + D` (simulator)

Useful options:

- **Enable Fast Refresh** - Essential for HMR
- **Reload** - Manual app reload
- **Debug Remote JS** - Chrome debugging
- **Start/Stop Element Inspector** - Inspect components

## 🔧 VS Code Integration

Add to `.vscode/settings.json`:

```json
{
  "reactNativeTools.showUserTips": false,
  "reactNativeTools.automaticInstallDependencies": true,
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

## 📊 Performance Tips

1. **Use React.memo()** for expensive components
2. **Minimize useEffect dependencies**
3. **Use MobX observers efficiently**
4. **Avoid anonymous functions in render**
5. **Use FlatList for long lists**

## 🐛 Common Issues

### Metro Won't Start

```bash
# Kill existing Metro processes
npx expo start --clear
# Or
killall node
npm start
```

### Fast Refresh Disabled

- Check development menu
- Look for syntax errors in console
- Ensure components are exported properly

### App Crashes on Change

- Check for runtime errors
- Verify all imports exist
- Look for TypeScript errors

## 📝 Best Practices

1. **Keep components small** - Easier to hot reload
2. **Use functional components** - Better Fast Refresh support
3. **Avoid side effects in render** - Prevents refresh issues
4. **Use TypeScript** - Catch errors before reload
5. **Test on real device** - More accurate than simulator

## 🎯 Testing HMR

Try making these changes to verify HMR works:

1. **Text change** in any component
2. **Style modification** (color, size, etc.)
3. **Add new console.log** statement
4. **Modify MobX store action**
5. **Change component state**

All should reflect immediately without losing app state.
