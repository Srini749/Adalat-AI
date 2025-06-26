import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated';

// A single animated bar for the waveform
const WaveformBar = ({ index }) => {
  const height = useSharedValue(5);

  useEffect(() => {
    // Start a looping animation with a delay based on the bar's index
    height.value = withRepeat(
      withSequence(
        withTiming(Math.random() * 50 + 5, { duration: 300 }),
        withTiming(Math.random() * 30 + 5, { duration: 300 })
      ),
      -1, // Infinite loop
      true // Reverse direction
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
    };
  });

  return <Animated.View style={[styles.bar, animatedStyle]} />;
};

// The main Waveform component
const Waveform = ({ isRecording }) => {
  if (!isRecording) {
    // Render a static, flat line when not recording
    return (
      <View style={styles.container}>
        {[...Array(20)].map((_, i) => (
          <View key={i} style={[styles.bar, styles.staticBar]} />
        ))}
      </View>
    );
  }

  // Render animated bars when recording
  return (
    <View style={styles.container}>
      {[...Array(20)].map((_, i) => (
        <WaveformBar key={i} index={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60, // Fixed height for the container
  },
  bar: {
    width: 4,
    borderRadius: 2,
    marginHorizontal: 2,
    backgroundColor: '#3498db',
  },
  staticBar: {
    height: 5, // Minimal height for the flat line
    backgroundColor: '#8e9eab',
  },
});

export default Waveform; 