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
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import android.Manifest

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

    private fun startForegroundNotification() {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, AudioRecordingService::class.java)
            
            // Check if we can start a foreground service
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (e: Exception) {
            android.util.Log.e("AudioModule", "Failed to start foreground notification: ${e.message}", e)
            // Don't throw the exception - recording can continue without notification
        }
    }

    private fun stopForegroundNotification() {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, AudioRecordingService::class.java)
            context.stopService(intent)
        } catch (e: Exception) {
            android.util.Log.e("AudioModule", "Failed to stop foreground notification: ${e.message}", e)
            // Don't throw the exception - this is cleanup
        }
    }

    @ReactMethod
    fun checkNotificationSupport(promise: Promise) {
        try {
            val context = reactApplicationContext
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val isSupported = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                notificationManager.areNotificationsEnabled()
            } else {
                true // Pre-Android 8, notifications are always enabled
            }
            
            promise.resolve(isSupported)
        } catch (e: Exception) {
            android.util.Log.e("AudioModule", "Failed to check notification support: ${e.message}", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun checkAudioPermission(promise: Promise) {
        val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Manifest.permission.RECORD_AUDIO
        } else {
            "android.permission.RECORD_AUDIO"
        }
        
        val granted = ContextCompat.checkSelfPermission(reactApplicationContext, permission) == PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun checkMicrophoneAvailable(promise: Promise) {
        try {
            // Check if we can create a temporary AudioRecord to test microphone availability
            val testAudioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG_RECORD,
                AUDIO_FORMAT,
                BUFFER_SIZE
            )
            
            val isAvailable = testAudioRecord.state == AudioRecord.STATE_INITIALIZED
            testAudioRecord.release()
            
            promise.resolve(isAvailable)
        } catch (e: Exception) {
            android.util.Log.e("AudioModule", "Failed to check microphone availability: ${e.message}", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun startRecording(promise: Promise) {
        if (isRecording) {
            promise.reject("record_error", "Already recording")
            return
        }
        
        // Check audio permission first
        val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Manifest.permission.RECORD_AUDIO
        } else {
            "android.permission.RECORD_AUDIO"
        }
        
        if (ContextCompat.checkSelfPermission(reactApplicationContext, permission) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("permission_denied", "Microphone permission not granted")
            return
        }
        
        // Check if microphone is available
        try {
            val testAudioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG_RECORD,
                AUDIO_FORMAT,
                BUFFER_SIZE
            )
            
            if (testAudioRecord.state != AudioRecord.STATE_INITIALIZED) {
                testAudioRecord.release()
                promise.reject("record_error", "Microphone is not available or being used by another app")
                return
            }
            testAudioRecord.release()
        } catch (e: Exception) {
            promise.reject("record_error", "Microphone is not available: ${e.message}")
            return
        }
        
        try {
            val file = getRecordingFile()
            filePath = file.absolutePath
            
            // Get audio manager and set audio mode
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val originalMode = audioManager.mode
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            
            // Create AudioRecord with error checking
            val audioRecordTemp = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG_RECORD,
                AUDIO_FORMAT,
                BUFFER_SIZE
            )
            
            // Check if AudioRecord was created successfully
            if (audioRecordTemp.state != AudioRecord.STATE_INITIALIZED) {
                audioRecordTemp.release()
                audioManager.mode = originalMode
                promise.reject("record_error", "Failed to initialize AudioRecord")
                return
            }
            
            audioRecord = audioRecordTemp
            
            // Start recording with error handling
            try {
                audioRecord?.startRecording()
            } catch (e: IllegalStateException) {
                audioRecord?.release()
                audioRecord = null
                audioManager.mode = originalMode
                promise.reject("record_error", "Failed to start recording: ${e.message}", e)
                return
            }
            
            isRecording = true
            startForegroundNotification()
            recordingThread = thread(start = true) {
                writeAudioDataToFile(file)
            }
            promise.resolve(Arguments.createMap().apply { putString("filePath", filePath) })
        } catch (e: Exception) {
            // Clean up on error
            audioRecord?.release()
            audioRecord = null
            isRecording = false
            promise.reject("record_error", "Failed to start recording: ${e.message}", e)
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
            
            // Restore audio mode
            try {
                val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                audioManager.mode = AudioManager.MODE_NORMAL
            } catch (e: Exception) {
                android.util.Log.w("AudioModule", "Failed to restore audio mode: ${e.message}")
            }
            
            stopForegroundNotification()
            promise.resolve(Arguments.createMap().apply { putString("filePath", filePath) })
        } catch (e: Exception) {
            promise.reject("stop_error", "Failed to stop recording: ${e.message}", e)
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

    // Delete a recording by file name
    @ReactMethod
    fun deleteRecording(fileName: String, promise: Promise) {
        try {
            val storageDir = reactApplicationContext.getExternalFilesDir(null)
            val file = File(storageDir, fileName)
            if (file.exists()) {
                val deleted = file.delete()
                promise.resolve(deleted)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("delete_error", "Failed to delete recording: ${e.message}", e)
        }
    }
} 