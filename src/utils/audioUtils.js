import { Alert, NativeModules } from 'react-native';

// The native module is accessed directly, but with a proxy for better error messages.
const { AudioModule } = NativeModules;

/**
 * Starts the audio recording by calling the native module.
 * Provides a clear error alert if the native call fails.
 * @returns {Promise<Object>} A promise that resolves with the result from the native module (e.g., { filePath: '...' }).
 */
export const startRecording = async () => {
  try {
    console.log('Attempting to start recording...');
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