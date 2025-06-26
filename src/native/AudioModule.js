import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'AudioModule' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({
    ios: "- You have run 'pod install'\n",
    default: '',
  }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const AudioModule = NativeModules.AudioModule
  ? NativeModules.AudioModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export async function startRecording() {
  return AudioModule.startRecording();
}

export async function stopRecording() {
  return AudioModule.stopRecording();
} 