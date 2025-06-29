import { Alert, NativeModules, Platform, PermissionsAndroid } from 'react-native';

// The native module is accessed directly, but with a proxy for better error messages.
const { AudioModule } = NativeModules;

/**
 * Check and request notification permission on Android
 */
const checkNotificationPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'This app needs notification permission to show recording status.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
      return false;
    }
  }
  return true; // iOS doesn't need explicit notification permission for local notifications
};

/**
 * Check and request audio permission
 */
const checkAudioPermission = async () => {
  try {
    const hasPermission = await AudioModule.checkAudioPermission();
    if (!hasPermission) {
      // Request permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs microphone permission to record audio.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to check audio permission:', err);
    return false;
  }
};

/**
 * Check if microphone is available
 */
const checkMicrophoneAvailable = async () => {
  try {
    const isAvailable = await AudioModule.checkMicrophoneAvailable();
    return isAvailable;
  } catch (err) {
    console.warn('Failed to check microphone availability:', err);
    return false;
  }
};

/**
 * Starts the audio recording by calling the native module.
 * Provides a clear error alert if the native call fails.
 * @returns {Promise<Object>} A promise that resolves with the result from the native module (e.g., { filePath: '...' }).
 */
export const startRecording = async () => {
  try {
    console.log('Attempting to start recording...');
    
    // Check audio permission first
    const hasAudioPermission = await checkAudioPermission();
    if (!hasAudioPermission) {
      Alert.alert(
        'Permission Required',
        'Microphone permission is required to record audio. Please grant permission in Settings.',
        [{ text: 'OK' }]
      );
      throw new Error('Microphone permission not granted');
    }
    
    // Check if microphone is available
    const isMicrophoneAvailable = await checkMicrophoneAvailable();
    if (!isMicrophoneAvailable) {
      Alert.alert(
        'Microphone Unavailable',
        'The microphone is not available or is being used by another app. Please close other apps that might be using the microphone.',
        [{ text: 'OK' }]
      );
      throw new Error('Microphone is not available or being used by another app');
    }
    
    // Check notification permission
    const hasNotificationPermission = await checkNotificationPermission();
    if (!hasNotificationPermission) {
      console.warn('Notification permission not granted, recording will continue without notification');
    }
    
    // Check if notifications are supported by the system
    try {
      const notificationSupported = await AudioModule.checkNotificationSupport();
      if (!notificationSupported) {
        console.warn('Notifications not supported by system, recording will continue without notification');
      }
    } catch (error) {
      console.warn('Could not check notification support:', error);
    }
    
    const result = await AudioModule.startRecording();
    console.log('Successfully started recording:', result.filePath);
    return result;
  } catch (error) {
    console.error('Failed to start recording:', error);
    // Provide a user-friendly alert for common issues like permissions.
    Alert.alert(
      'Recording Error',
      `Could not start recording. Please ensure the app has microphone permissions. (Error: ${error.message})`
    );
    // Re-throw the error to be caught by the calling component.
    throw error;
  }
};

/**
 * Stops the audio recording by calling the native module.
 * @returns {Promise<Object>} A promise that resolves with the result from the native module (e.g., { filePath: '...' }).
 */
export const stopRecording = async () => {
  try {
    console.log('Attempting to stop recording...');
    const result = await AudioModule.stopRecording();
    console.log('Successfully stopped recording:', result.filePath);
    return result;
  } catch (error) {
    console.error('Failed to stop recording:', error);
    Alert.alert('Error', `Could not stop recording: ${error.message}`);
    // Re-throw the error to be caught by the calling component.
    throw error;
  }
};

/**
 * Fetches the list of saved recordings from the native module.
 * @returns {Promise<string[]>} A promise that resolves with an array of file names.
 */
export const getRecordings = async () => {
  try {
    console.log('Fetching recordings...');
    const files = await AudioModule.getRecordings();
    console.log('Found recordings:', files);
    return files;
  } catch (error) {
    console.error('Failed to get recordings:', error);
    Alert.alert('Error', `Could not fetch recordings: ${error.message}`);
    return []; // Return an empty array on failure
  }
};

/**
 * Play a recording by file name.
 */
export const playRecording = async (fileName) => {
  try {
    await AudioModule.playRecording(fileName);
  } catch (error) {
    Alert.alert('Playback Error', error.message || 'Could not play recording.');
  }
};

/**
 * Stop playback.
 */
export const stopPlayback = async () => {
  try {
    await AudioModule.stopPlayback();
  } catch (error) {
    // Not critical, just log
    console.error('Failed to stop playback:', error);
  }
};

/**
 * Get playback status: { position, duration } in seconds.
 */
export const getPlaybackStatus = async () => {
  try {
    const status = await AudioModule.getPlaybackStatus();
    return status;
  } catch (error) {
    return { position: 0, duration: 0 };
  }
};

/**
 * Delete a recording by file name.
 */
export const deleteRecording = async (fileName) => {
  try {
    if (Platform.OS === 'ios') {
      return await AudioModule.deleteRecording(fileName);
    } else {
      return await AudioModule.deleteRecording(fileName);
    }
  } catch (error) {
    Alert.alert('Delete Error', error.message || 'Could not delete recording.');
    return false;
  }
}; 