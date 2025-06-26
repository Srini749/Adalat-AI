import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { startRecording, stopRecording } from '../native/AudioModule';

// RecordScreen: Main screen for audio recording UI
const RecordScreen = () => {
  // State to track if recording is active
  const [isRecording, setIsRecording] = useState(false);
  // State to store the last recorded file path
  const [lastFilePath, setLastFilePath] = useState(null);

  // Handler for toggling recording state
  const handleRecordPress = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const result = await startRecording();
        setIsRecording(true);
        setLastFilePath(result.filePath);
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to start recording');
      }
    } else {
      // Stop recording
      try {
        const result = await stopRecording();
        setIsRecording(false);
        setLastFilePath(result.filePath);
        Alert.alert('Recording Stopped', `Audio saved to: ${result.filePath}`);
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to stop recording');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Audio Recorder</Text>

      {/* Placeholder for waveform visualization */}
      <View style={styles.waveformPlaceholder}>
        <Text style={styles.waveformText}>[Waveform Visualization]</Text>
      </View>

      {/* Record/Stop button */}
      <TouchableOpacity
        style={[styles.recordButton, isRecording ? styles.stopButton : styles.startButton]}
        onPress={handleRecordPress}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      {/* Show last file path if available */}
      {lastFilePath && !isRecording && (
        <Text style={styles.filePathText}>Last file: {lastFilePath}</Text>
      )}
    </View>
  );
};

// Styles for the screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#222f3e',
  },
  waveformPlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: '#d1d8e0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  waveformText: {
    color: '#8395a7',
    fontSize: 16,
  },
  recordButton: {
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startButton: {
    backgroundColor: '#10ac84',
  },
  stopButton: {
    backgroundColor: '#ee5253',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  filePathText: {
    marginTop: 24,
    color: '#576574',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RecordScreen; 