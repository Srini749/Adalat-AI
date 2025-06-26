import Foundation
import AVFoundation

@objc(AudioModule)
class AudioModule: NSObject {
    private var audioRecorder: AVAudioRecorder?
    private var recordingSession: AVAudioSession {
        return AVAudioSession.sharedInstance()
    }
    private var recordingUrl: URL?

    // Start recording PCM audio
    @objc func startRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        do {
            try recordingSession.setCategory(.playAndRecord, mode: .default)
            try recordingSession.setActive(true)
            recordingSession.requestRecordPermission { [weak self] allowed in
                guard let self = self else { return }
                if allowed {
                    let tempDir = NSTemporaryDirectory()
                    let fileName = "audio_\(UUID().uuidString).pcm"
                    let filePath = (tempDir as NSString).appendingPathComponent(fileName)
                    let url = URL(fileURLWithPath: filePath)
                    self.recordingUrl = url
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
                        resolve(["filePath": filePath])
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

    // Required for React Native
    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
} 