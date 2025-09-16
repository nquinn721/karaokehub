export default {
  expo: {
    name: "KaraokeHub",
    slug: "karaokehub",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    developmentClient: {
      silentLaunch: false,
    },
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#007AFF"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.karaokehub.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app uses location to find karaoke shows near you",
        NSMicrophoneUsageDescription: "This app needs microphone access for audio recording features",
        NSCameraUsageDescription: "This app needs camera access to take photos of karaoke schedules"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#007AFF"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.karaokehub.app",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-dev-client",
      "expo-location",
      "expo-av",
      "expo-camera",
      "expo-image-picker",
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you upload karaoke schedule images."
        }
      ]
    ]
  }
};
