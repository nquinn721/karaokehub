@echo off
echo Setting up Android environment...
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%JAVA_HOME%\bin

echo Environment set up completed
echo.
echo Starting development build...
cd /d "D:\Projects\KaraokeHub\app"
npx expo run:android

pause
