# Audio Recorder App

A React Native audio recording application with native Android and iOS implementations, featuring real-time recording, playback, file management, and local notifications.

## 🎵 Features

### Core Recording Features
- **High-Quality Audio Recording**: PCM format recording at 44.1kHz, 16-bit, mono
- **Real-Time Recording**: Start/stop recording with visual feedback
- **File Management**: Automatic file naming with timestamps
- **Recording List**: View and manage all saved recordings
- **File Sharing**: Share recordings via system share dialog

### Playback Features
- **Audio Playback**: Play recorded files with progress tracking
- **Progress Visualization**: Real-time playback progress bar
- **Playback Controls**: Play, pause, and stop functionality
- **Time Display**: Current position and total duration display

### User Interface
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Visual Feedback**: Waveform animation during recording
- **Status Indicators**: Clear status messages and loading states
- **Responsive Design**: Works on various screen sizes

### Platform-Specific Features

#### Android
- **Foreground Service**: Persistent recording with notification
- **Permission Management**: Runtime permission handling for microphone and notifications
- **Audio Session Management**: Proper audio mode handling
- **Background Recording**: Continue recording when app is in background
- **File Storage**: External files directory for recordings

#### iOS
- **Audio Session Management**: Proper audio session configuration
- **Permission Handling**: Microphone permission requests
- **File Storage**: Documents directory for recordings
- **Background Audio**: Audio session management for background operation

### Technical Features
- **Native Modules**: Custom native implementations for optimal performance
- **Error Handling**: Comprehensive error handling and user feedback
- **Resource Management**: Proper cleanup of audio resources
- **Cross-Platform**: Consistent API across Android and iOS
- **Type Safety**: TypeScript-like error handling in JavaScript

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)
- CocoaPods (for iOS dependencies)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Adalat
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **iOS Setup** (iOS only)
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Start Metro bundler**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Run the app**
   ```bash
   # Android
   npm run android
   # or
   yarn android
   
   # iOS
   npm run ios
   # or
   yarn ios
   ```

## 📱 Usage

### Recording Audio
1. Tap the "Start Recording" button to begin recording
2. The app will request microphone permission if not already granted
3. A notification will appear (Android) indicating recording is in progress
4. Tap "Stop Recording" to save the recording

### Playing Recordings
1. View your recordings in the "Saved Recordings" list
2. Tap "Play" to start playback
3. Use the progress bar to see playback position
4. Tap "Pause" to stop playback

### Managing Recordings
- **Share**: Tap "Share" to share a recording via system share dialog
- **Delete**: Tap the "×" button to delete a recording
- **View Details**: See file names and playback duration

## 🛠 Technical Architecture

### Project Structure
```
├── android/                          # Android native code
│   └── app/src/main/java/com/audiorecorder/module/
│       ├── AudioModule.kt           # Main audio recording logic
│       ├── AudioRecordingService.kt # Foreground service for notifications
│       └── AudioModulePackage.kt    # React Native package registration
├── ios/                              # iOS native code
│   └── AudioModule/
│       ├── AudioModule.swift        # Main audio recording logic
│       └── AudioModule.m            # React Native bridge
├── src/
│   ├── components/                   # React Native components
│   │   └── Waveform.js              # Recording visualization component
│   ├── screens/                      # App screens
│   │   └── RecordScreen.js          # Main recording interface
│   ├── utils/                        # Utility functions
│   │   └── audioUtils.js            # Audio operation wrappers
│   └── native/                       # Native module wrappers
│       └── AudioModule.js           # Cross-platform audio module
└── App.js                           # Main app component
```

### Native Modules

#### Android (Kotlin)
- **AudioModule**: Handles audio recording, playback, and file management
- **AudioRecordingService**: Manages foreground service and notifications
- **Permission Handling**: Runtime permission management for Android 6.0+

#### iOS (Swift)
- **AudioModule**: Handles audio recording, playback, and file management
- **Audio Session Management**: Proper audio session configuration
- **Permission Handling**: Microphone permission requests

### Key Dependencies
- **react-native-fs**: File system operations
- **react-native-share**: File sharing functionality
- **react-native-reanimated**: Smooth animations

## 🔧 Configuration

### Android Permissions
The following permissions are automatically requested:
- `RECORD_AUDIO`: Microphone access
- `POST_NOTIFICATIONS`: Notification display (Android 13+)
- `FOREGROUND_SERVICE`: Background service operation
- `FOREGROUND_SERVICE_MICROPHONE`: Microphone foreground service (Android 14+)

### iOS Permissions
- **Microphone**: Automatically requested when starting recording
- **File Access**: Documents directory access for file storage

### Audio Settings
- **Format**: PCM (Pulse Code Modulation)
- **Sample Rate**: 44.1 kHz
- **Bit Depth**: 16-bit
- **Channels**: Mono (1 channel)
- **File Extension**: .pcm

## 🐛 Troubleshooting

### Development Commands
```bash
# Clean and rebuild Android
cd android && ./gradlew clean && cd ..
npx react-native run-android

# Clean and rebuild iOS
cd ios && xcodebuild clean && cd ..
npx react-native run-ios

# Reset Metro cache
npx react-native start --reset-cache
```

## 📄 API Reference

### AudioModule Methods

#### Recording
- `startRecording()`: Start audio recording
- `stopRecording()`: Stop current recording
- `getRecordings()`: Get list of saved recordings

#### Playback
- `playRecording(fileName)`: Play a specific recording
- `stopPlayback()`: Stop current playback
- `getPlaybackStatus()`: Get current playback position and duration

#### File Management
- `deleteRecording(fileName)`: Delete a specific recording

#### Permissions & Availability
- `checkAudioPermission()`: Check microphone permission status
- `checkMicrophoneAvailable()`: Check if microphone is available
- `checkNotificationSupport()`: Check if notifications are supported

### Error Handling
All methods return promises and include comprehensive error handling:
- Permission denied errors
- Device unavailable errors
- File system errors
- Audio session errors
  
## 🙏 Acknowledgments

- React Native community for the excellent framework
- Android and iOS audio APIs for native functionality
- Contributors and testers who helped improve the app

---

**Note**: This app requires microphone permissions to function. Please ensure you have the necessary permissions enabled on your device.
