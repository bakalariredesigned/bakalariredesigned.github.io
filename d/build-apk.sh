#!/bin/bash
# Build Bakaláři Android APK
# Spusť tento script z /app složky

set -e

export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-arm64

echo "=== Building Bakaláři APK ==="

# 1. Build web assets
echo "1/3 Building web assets..."
npm run build

# 2. Sync to Android
echo "2/3 Syncing to Android..."
npx cap sync android

# 3. Build APK
echo "3/3 Building APK..."
cd android && ./gradlew assembleDebug --no-daemon

APK="android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "=== DONE ==="
echo "APK: $(pwd)/$APK"
echo "Size: $(du -h $APK | cut -f1)"
