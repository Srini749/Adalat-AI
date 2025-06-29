import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
// Import the new utility functions for recording
import { startRecording, stopRecording, getRecordings, playRecording, stopPlayback, getPlaybackStatus, deleteRecording, convertPcmToMp3 } from '../utils/audioUtils';
// Import the new Waveform component
import Waveform from '../components/Waveform';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

const getRecordingPath = (fileName) => {
  if (Platform.OS === 'ios') {
    // iOS: Documents directory
    return `${RNFS.DocumentDirectoryPath}/${fileName}`;
  } else {
    // Android: External files directory
    return `${RNFS.ExternalDirectoryPath}/${fileName}`;
  }
};

// RecordScreen: Main screen for audio recording UI
const RecordScreen = () => {
  // State to track if recording is active
  const [isRecording, setIsRecording] = useState(false);
  // State to show feedback to the user (e.g., status, errors, or file path)
  const [statusMessage, setStatusMessage] = useState(
    'Press the button to start recording',
  );
  const [recordings, setRecordings] = useState([]);
  const [playingFile, setPlayingFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState({ position: 0, duration: 0 });
  const progressInterval = useRef(null);

  // Fetch recordings when the component mounts
  useEffect(() => {
    fetchRecordings();
    return () => {
      stopPlayback(); // Stop playback when unmounting
      clearInterval(progressInterval.current);
    };
  }, []);

  useEffect(() => {
    if (playingFile) {
      // Start polling playback status
      progressInterval.current = setInterval(async () => {
        const status = await getPlaybackStatus();
        setPlaybackProgress(status);
        // If playback finished, reset
        if (status.duration > 0 && status.position >= status.duration) {
          setPlayingFile(null);
          setPlaybackProgress({ position: 0, duration: 0 });
          clearInterval(progressInterval.current);
        }
      }, 200);
    } else {
      setPlaybackProgress({ position: 0, duration: 0 });
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [playingFile]);

  const fetchRecordings = async () => {
    setIsLoading(true);
    const files = await getRecordings();
    setRecordings(files);
    setIsLoading(false);
  };

  // Handler for toggling recording state
  const handleRecordPress = async () => {
    if (isRecording) {
      // Stop the recording
      try {
        await stopRecording();
        setIsRecording(false);
        // Update status to show the saved file path
        setStatusMessage('Recording saved!');
        // Refresh the list of recordings
        fetchRecordings();
      } catch (error) {
        // If stopping fails, update the UI accordingly
        setIsRecording(false);
        setStatusMessage(`Error: ${error.message}`);
      }
    } else {
      // Start a new recording
      try {
        await startRecording();
        setIsRecording(true);
        // Clear status message when recording starts
        setStatusMessage('');
      } catch (error) {
        // If starting fails, update the UI accordingly
        setIsRecording(false);
        setStatusMessage(`Error: ${error.message}`);
      }
    }
  };

  const handlePlayPause = async (fileName) => {
    if (playingFile === fileName) {
      await stopPlayback();
      setPlayingFile(null);
    } else {
      await stopPlayback();
      await playRecording(fileName);
      setPlayingFile(fileName);
    }
  };

  const handleShare = async (fileName) => {
    try {
      let filePath;
      if (Platform.OS === 'ios') {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      } else {
        filePath = `${RNFS.ExternalDirectoryPath}/${fileName}`;
      }
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        setStatusMessage('File does not exist.');
        return;
      }
      await Share.open({ url: `file://${filePath}` });
    } catch (error) {
      setStatusMessage('Could not share file.');
    }
  };

  const handleDelete = async (fileName) => {
    const deleted = await deleteRecording(fileName);
    if (deleted) {
      setStatusMessage('Recording deleted.');
      // Remove the deleted item from the list without re-fetching all
      setRecordings((prev) => prev.filter((f) => f !== fileName));
      // If the deleted file was playing, stop playback
      if (playingFile === fileName) {
        await stopPlayback();
        setPlayingFile(null);
      }
    } else {
      setStatusMessage('Could not delete recording.');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Render item for the recordings list
  const renderRecording = ({ item }) => {
    const isPlaying = playingFile === item;
    const progress = isPlaying && playbackProgress.duration > 0
      ? playbackProgress.position / playbackProgress.duration
      : 0;
    return (
      <View style={styles.recordingItem}>
        <View style={styles.recordingHeader}>
          <Text style={styles.recordingText}>{item}</Text>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        {isPlaying && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {formatTime(playbackProgress.position)} / {formatTime(playbackProgress.duration)}
            </Text>
          </View>
        )}
        <View style={styles.recordingActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlayPause(item)}
          >
            <Text style={styles.actionButtonText}>
              {isPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* iOS in-app status bar indicator */}
      {Platform.OS === 'ios' && isRecording && (
        <View style={styles.iosStatusBarIndicator} />
      )}
      <View style={styles.container}>
        <Text style={styles.title}>Audio Recorder</Text>

        {/* Container for waveform and status messages */}
        <View style={styles.statusContainer}>
          <Waveform isRecording={isRecording} />
          {/* Only show status text when not recording */}
          {!isRecording && (
            <Text style={styles.statusText}>{statusMessage}</Text>
          )}
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

        {/* List of saved recordings */}
        <Text style={styles.listHeader}>Saved Recordings</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#10ac84" />
        ) : (
          <FlatList
            data={recordings}
            renderItem={renderRecording}
            keyExtractor={(item) => item}
            style={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>No recordings yet</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// Styles for the screen
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222f3e',
    marginTop: 20,
    marginBottom: 20,
  },
  statusContainer: {
    width: '100%',
    minHeight: 120, // Increased height to accommodate text below waveform
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  statusText: {
    color: '#222f3e',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10, // Add some space below the static waveform
  },
  recordButton: {
    marginTop: 30,
    marginBottom: 30,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 32,
    elevation: 2,
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
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222f3e',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  list: {
    width: '100%',
  },
  recordingItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  recordingText: {
    fontSize: 16,
    color: '#576574',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#8395a7',
  },
  recordingActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#10ac84',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#10ac84',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#576574',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteButton: {
    marginLeft: 10,
    backgroundColor: '#ee5253',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  iosStatusBarIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#ff3b30',
    zIndex: 100,
  },
});

export default RecordScreen; 