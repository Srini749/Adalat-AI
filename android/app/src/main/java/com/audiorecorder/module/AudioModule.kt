package com.audiorecorder.module

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.AudioManager
import android.media.MediaRecorder
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.*
import kotlin.concurrent.thread

class AudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private lateinit var recordingThread: Thread
    private var filePath: String? = null

    private var audioTrack: AudioTrack? = null
    private var isPlaying = false
    private lateinit var playbackThread: Thread
    private var playbackBytesWritten: Int = 0
    private var playbackTotalBytes: Int = 0

    companion object {
        private const val SAMPLE_RATE = 44100
        private const val CHANNEL_CONFIG_RECORD = AudioFormat.CHANNEL_IN_MONO
        private const val CHANNEL_CONFIG_PLAY = AudioFormat.CHANNEL_OUT_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private val BUFFER_SIZE = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG_RECORD, AUDIO_FORMAT)
    }

    override fun getName() = "AudioModule"

    // Helper to get a timestamped file in the app's external files directory
    private fun getRecordingFile(): File {
        val storageDir = reactApplicationContext.getExternalFilesDir(null)
        val timestamp = System.currentTimeMillis() / 1000
        return File(storageDir, "recording_${timestamp}.pcm")
    }

    @ReactMethod
    fun startRecording(promise: Promise) {
        if (isRecording) {
            promise.reject("record_error", "Already recording")
            return
        }

        try {
            val file = getRecordingFile()
            filePath = file.absolutePath

            // Note: RECORD_AUDIO permission is required and should be handled in AndroidManifest.xml
            // and requested at runtime by the JS side if needed.
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG_RECORD,
                AUDIO_FORMAT,
                BUFFER_SIZE
            )

            audioRecord?.startRecording()
            isRecording = true

            recordingThread = thread(start = true) {
                writeAudioDataToFile(file)
            }
            promise.resolve(Arguments.createMap().apply { putString("filePath", filePath) })
        } catch (e: Exception) {
            promise.reject("record_error", "Failed to start recording", e)
        }
    }

    private fun writeAudioDataToFile(file: File) {
        val data = ByteArray(BUFFER_SIZE)
        try {
            FileOutputStream(file).use { os ->
                while (isRecording) {
                    val read = audioRecord?.read(data, 0, BUFFER_SIZE) ?: 0
                    if (read > 0) {
                        os.write(data, 0, read)
                    }
                }
            }
        } catch (e: IOException) {
             // This can happen if storage is full or permissions change.
             println("Error writing audio file: ${e.message}")
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (!isRecording) {
            promise.reject("not_recording", "No active recording to stop")
            return
        }

        try {
            isRecording = false
            recordingThread.join() // Wait for the thread to finish writing
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            promise.resolve(Arguments.createMap().apply { putString("filePath", filePath) })
        } catch (e: Exception) {
            promise.reject("stop_error", "Failed to stop recording", e)
        }
    }

    // Get all saved recordings from the app's external files directory
    @ReactMethod
    fun getRecordings(promise: Promise) {
        try {
            val storageDir = reactApplicationContext.getExternalFilesDir(null)
            if (storageDir == null || !storageDir.exists()) {
                promise.resolve(Arguments.createArray())
                return
            }

            val recordingFiles = storageDir.listFiles { _, name ->
                name.startsWith("recording_") && name.endsWith(".pcm")
            }?.map { it.name }?.sortedDescending() ?: emptyList()

            promise.resolve(Arguments.makeNativeArray(recordingFiles))
        } catch (e: Exception) {
            promise.reject("file_error", "Could not list recordings", e)
        }
    }

    // Play a PCM recording by file name
    @ReactMethod
    fun playRecording(fileName: String, promise: Promise) {
        if (isPlaying) {
            promise.reject("playback_error", "Already playing")
            return
        }
        try {
            val storageDir = reactApplicationContext.getExternalFilesDir(null)
            val file = File(storageDir, fileName)
            val fileInputStream = FileInputStream(file)
            val minBufferSize = AudioTrack.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG_PLAY, AUDIO_FORMAT)
            android.util.Log.d("AudioModule", "playRecording: filePath=${file.absolutePath}, size=${file.length()}, minBufferSize=$minBufferSize")
            audioTrack = AudioTrack(
                AudioManager.STREAM_MUSIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG_PLAY,
                AUDIO_FORMAT,
                minBufferSize,
                AudioTrack.MODE_STREAM
            )
            isPlaying = true
            playbackBytesWritten = 0
            playbackTotalBytes = file.length().toInt()
            playbackThread = thread(start = true) {
                val buffer = ByteArray(minBufferSize)
                audioTrack?.play()
                var read = 0
                try {
                    while (isPlaying && fileInputStream.read(buffer).also { read = it } > 0) {
                        audioTrack?.write(buffer, 0, read)
                        playbackBytesWritten += read
                    }
                } catch (e: Exception) {
                    android.util.Log.e("AudioModule", "Error during playback: ${e.message}", e)
                }
                audioTrack?.stop()
                audioTrack?.release()
                audioTrack = null
                fileInputStream.close()
                isPlaying = false
            }
            promise.resolve(Arguments.createMap().apply { putBoolean("playing", true) })
        } catch (e: Exception) {
            android.util.Log.e("AudioModule", "Failed to play recording: ${e.message}", e)
            isPlaying = false
            promise.reject("playback_error", "Failed to play recording: ${e.message}", e)
        }
    }

    // Get playback status: position and duration in seconds
    @ReactMethod
    fun getPlaybackStatus(promise: Promise) {
        try {
            val bytesPerSecond = SAMPLE_RATE * 2 * 1 // 16-bit PCM, mono
            val position = playbackBytesWritten.toDouble() / bytesPerSecond
            val duration = playbackTotalBytes.toDouble() / bytesPerSecond
            promise.resolve(Arguments.createMap().apply {
                putDouble("position", position)
                putDouble("duration", duration)
            })
        } catch (e: Exception) {
            promise.resolve(Arguments.createMap().apply {
                putDouble("position", 0.0)
                putDouble("duration", 0.0)
            })
        }
    }

    // Stop playback
    @ReactMethod
    fun stopPlayback(promise: Promise) {
        if (isPlaying) {
            isPlaying = false
            playbackThread.join()
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
            promise.resolve(Arguments.createMap().apply { putBoolean("stopped", true) })
        } else {
            promise.resolve(Arguments.createMap().apply { putBoolean("stopped", false) })
        }
    }
} 