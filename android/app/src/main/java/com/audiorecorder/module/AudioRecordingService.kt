package com.audiorecorder.module

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class AudioRecordingService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val channelId = "audio_recording_channel"
        val channelName = "Audio Recording"
        val notificationId = 1001

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.createNotificationChannel(channel)
            }

            val notification: Notification = NotificationCompat.Builder(this, channelId)
                .setContentTitle("Recording Audio")
                .setContentText("Audio recording in progress...")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setOngoing(true)
                .build()

            startForeground(notificationId, notification)
        } catch (e: Exception) {
            // If notification fails, still start the service but log the error
            android.util.Log.e("AudioRecordingService", "Failed to create notification: ${e.message}", e)
            // Create a minimal notification to avoid crash
            val fallbackNotification = NotificationCompat.Builder(this, channelId)
                .setContentTitle("Recording")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .build()
            startForeground(notificationId, fallbackNotification)
        }
        
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null
} 