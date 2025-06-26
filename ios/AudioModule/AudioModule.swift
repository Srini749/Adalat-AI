import Foundation
import AVFoundation

@objc(AudioModule)
class AudioModule: NSObject {
    private var audioRecorder: AVAudioRecorder?
    private var audioPlayer: AVAudioPlayer?
    private var recordingUrl: URL?

    // Helper to get the app's Documents directory URL
    private func getDocumentsDirectory() -> URL {
        let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        return paths[0]
    }

    // Generate a file path with a timestamp in the Documents directory
    private func generateRecordingURL() -> URL {
        let timestamp = Int(Date().timeIntervalSince1970)
        let fileName = "recording_\(timestamp).pcm"
        return getDocumentsDirectory().appendingPathComponent(fileName)
    }

    // Start recording PCM audio
    @objc func startRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let recordingSession = AVAudioSession.sharedInstance()
        do {
            try recordingSession.setCategory(.playAndRecord, mode: .default)
            try recordingSession.setActive(true)
            recordingSession.requestRecordPermission { [weak self] allowed in
                guard let self = self else { return }
                if allowed {
                    self.recordingUrl = self.generateRecordingURL()
                    guard let url = self.recordingUrl else {
                        reject("file_error", "Could not create file URL", nil)
                        return
                    }

                    let settings: [String: Any] = [
                        AVFormatIDKey: Int(kAudioFormatLinearPCM),
                        AVSampleRateKey: 44100.0,
                        AVNumberOfChannelsKey: 1,
                        AVLinearPCMBitDepthKey: 16,
                        AVLinearPCMIsFloatKey: false,
                        AVLinearPCMIsBigEndianKey: false
                    ]
                    do {
                        self.audioRecorder = try AVAudioRecorder(url: url, settings: settings)
                        self.audioRecorder?.prepareToRecord()
                        self.audioRecorder?.record()
                        resolve(["filePath": url.path])
                    } catch {
                        reject("record_error", "Failed to start recording", error)
                    }
                } else {
                    reject("permission_denied", "Microphone permission denied", nil)
                }
            }
        } catch {
            reject("session_error", "Failed to set up recording session", error)
        }
    }

    // Stop recording
    @objc func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if let recorder = audioRecorder, recorder.isRecording {
            recorder.stop()
            resolve(["filePath": recorder.url.path])
        } else {
            reject("not_recording", "No active recording to stop", nil)
        }
    }

    // Get all saved recordings from the Documents directory
    @objc func getRecordings(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let documentsDirectory = getDocumentsDirectory()
        do {
            let fileURLs = try FileManager.default.contentsOfDirectory(at: documentsDirectory, includingPropertiesForKeys: nil)
            let recordingFiles = fileURLs.filter { $0.pathExtension == "pcm" && $0.lastPathComponent.starts(with: "recording_") }
                                         .map { $0.lastPathComponent } // Return just the file name
                                         .sorted(by: { $0 > $1 }) // Sort descending to show newest first
            resolve(recordingFiles)
        } catch {
            reject("file_error", "Could not list recordings", error)
        }
    }

    // Play a PCM recording by file name
    @objc func playRecording(_ fileName: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let fileURL = getDocumentsDirectory().appendingPathComponent(fileName as String)
        do {
            // AVAudioPlayer does not support raw PCM, so we need to wrap it in a WAV header on the fly
            let pcmData = try Data(contentsOf: fileURL)
            guard let wavData = PCMToWAV(pcmData: pcmData) else {
                reject("playback_error", "Failed to convert PCM to WAV", nil)
                return
            }
            // Write to a temp WAV file
            let tempWavURL = getDocumentsDirectory().appendingPathComponent("temp_playback.wav")
            try wavData.write(to: tempWavURL)
            self.audioPlayer = try AVAudioPlayer(contentsOf: tempWavURL)
            self.audioPlayer?.prepareToPlay()
            self.audioPlayer?.play()
            resolve(["playing": true])
        } catch {
            reject("playback_error", "Failed to play recording", error)
        }
    }

    // Stop playback
    @objc func stopPlayback(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if let player = audioPlayer, player.isPlaying {
            player.stop()
            resolve(["stopped": true])
        } else {
            resolve(["stopped": false])
        }
    }

    // Get playback status: position and duration in seconds
    @objc func getPlaybackStatus(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if let player = audioPlayer {
            let position = player.currentTime
            let duration = player.duration
            resolve(["position": position, "duration": duration])
        } else {
            resolve(["position": 0, "duration": 0])
        }
    }

    // Helper: Convert PCM data to WAV data (16-bit, mono, 44.1kHz)
    private func PCMToWAV(pcmData: Data) -> Data? {
        let sampleRate: UInt32 = 44100
        let numChannels: UInt16 = 1
        let bitsPerSample: UInt16 = 16
        let byteRate = sampleRate * UInt32(numChannels) * UInt32(bitsPerSample / 8)
        let blockAlign = numChannels * bitsPerSample / 8
        let wavHeaderSize = 44
        let pcmDataSize = UInt32(pcmData.count)
        let wavDataSize = pcmDataSize + UInt32(wavHeaderSize)

        var header = Data()
        header.append("RIFF".data(using: .ascii)!)
        header.append(UInt32(wavDataSize - 8).littleEndianData)
        header.append("WAVE".data(using: .ascii)!)
        header.append("fmt ".data(using: .ascii)!)
        header.append(UInt32(16).littleEndianData) // Subchunk1Size
        header.append(UInt16(1).littleEndianData) // AudioFormat (PCM)
        header.append(numChannels.littleEndianData)
        header.append(sampleRate.littleEndianData)
        header.append(byteRate.littleEndianData)
        header.append(blockAlign.littleEndianData)
        header.append(bitsPerSample.littleEndianData)
        header.append("data".data(using: .ascii)!)
        header.append(pcmDataSize.littleEndianData)
        var wavData = Data()
        wavData.append(header)
        wavData.append(pcmData)
        return wavData
    }

    // Required for React Native
    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
}

// Helper extensions for writing little-endian values
fileprivate extension UInt16 {
    var littleEndianData: Data {
        var value = self.littleEndian
        return Data(bytes: &value, count: MemoryLayout<UInt16>.size)
    }
}
fileprivate extension UInt32 {
    var littleEndianData: Data {
        var value = self.littleEndian
        return Data(bytes: &value, count: MemoryLayout<UInt32>.size)
    }
} 