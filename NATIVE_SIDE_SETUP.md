# Love Link Native CallKeep & FCM Integration Guide

To bridge Love Link's web calling experience with physical Native iOS and Android devices, you must establish standard native telecom integration handlers. This creates a bulletproof, premium WhatsApp-like fullscreen incoming call interface, ringtone, lockscreen overlay, and reliable offline background operation.

Follow this production-grade architectural blueprint to wire together **Firebase Cloud Messaging (FCM)**, **React Native CallKeep**, and Android's calling configurations.

---

## 1. Firebase Cloud Messaging (FCM) — DATA-ONLY Rules

**CRITICAL RULE #1**: Never send a standard `"notification": {}` payload node to devices for signaling calls. 

If Android detects a `"notification"` node under closed/background states, it intercepts the package at the OS-level system tray first. The JavaScript engine and background handlers **NEVER EXECUTE**, blocking CallKeep from triggering.

### Correct Server-Side Payload (Data-Only, High Priority)
The Love Link proxy backend (`server.ts`) is fully hardcoded to output this data payload. Ensure your Native receiver captures it:

```json
{
  "token": "TARGET_DEVICE_FCM_TOKEN",
  "android": {
    "priority": "high",
    "ttl": "0s"
  },
  "apns": {
    "headers": {
      "apns-priority": "10",
      "apns-push-type": "voip"
    },
    "payload": {
      "aps": {
        "contentAvailable": true
      }
    }
  },
  "data": {
    "type": "incoming_call",
    "callUUID": "call_1716612030101_userA",
    "callerName": "Aira",
    "callType": "video"
  }
}
```

---

## 2. Android Manifest Configuration (`AndroidManifest.xml`)

Add these blocks directly to your compilation wrappers under `android/app/src/main/AndroidManifest.xml` to grant system-level intent priorities, fullscreen overlays, and wake controls.

### Permissions
Ensure all these system permissions are registered:

```xml
<!-- Core Internet & Vibration -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Core Telecom & Calling Services -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

<!-- Android 13+ Notification Prompting -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Android 14+ Fullscreen Intent Alerts (Mandatory for lockscreen wake) -->
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
```

### MainActivity Waking Directives
Decorate your `<activity android:name=".MainActivity">` node with these specific window parameters to bypass locking restrictions:

```xml
<activity
  android:name=".MainActivity"
  android:label="@string/app_name"
  android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
  android:launchMode="singleTask"
  android:showWhenLocked="true"
  android:turnScreenOn="true"
  android:export="true">
</activity>
```

### Telecom Service Binding
Declare the mandatory CallKeep native connection helpers inside your `<application>` tag:

```xml
<!-- Background Messaging Service -->
<service 
  android:name="io.wazo.callkeep.RNCallKeepBackgroundMessagingService"
  android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE"
  android:foregroundServiceType="phoneCall" />

<!-- Telecom Connection Pipeline Handler -->
<service
  android:name="io.wazo.callkeep.VoiceConnectionService"
  android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE"
  android:foregroundServiceType="phoneCall">
  <intent-filter>
    <action android:name="android.telecom.ConnectionService" />
  </intent-filter>
</service>
```

---

## 3. Native App Entry Point (`index.js` / `App.tsx`)

Initialize `react-native-callkeep` under self-managed mode. This allows you to render the custom embedded calling screens when the device is unlocked while utilizing native ringing interfaces.

```javascript
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import RNCallKeep from 'react-native-callkeep';
import App from './App';

// Initialize CallKeep with Self-Managed settings
RNCallKeep.setup({
  android: {
    alertTitle: 'Permissions Required',
    alertDescription: 'Love Link needs Call permissions to receive overlay incoming signals.',
    cancelButton: 'Cancel',
    okButton: 'OK',
    imageName: 'phone_call_icon',
    selfManaged: true, // Bypass carrier SIP registry conflicts!
    foregroundService: {
      channelId: 'love-link-calls',
      channelName: 'Love Link Call System',
      notificationTitle: 'Active Love Link phone connection in progress...',
      notificationIcon: 'stock_phone_icon',
    },
  },
  ios: {
    appName: 'Love Link',
    supportsVideo: true,
  }
});

// Register Call Background Headless JS Handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[Native Headless JS] FCM Received in background:', remoteMessage);

  if (remoteMessage.data?.type === 'incoming_call') {
    const { callUUID, callerName, callType } = remoteMessage.data;

    console.log('[Native Headless JS] Showing CallKeep ring UI for Call:', callUUID);
    
    // Display the full-screen caller screen
    RNCallKeep.displayIncomingCall(
      callUUID,
      callerName,
      callerName,
      'number',
      callType === 'video'
    );
     
    // Bring application context back to foreground
    RNCallKeep.backToForeground();
  }
});

AppRegistry.registerComponent('main', () => App);
```

---

## 4. Bridge Integration inside WebView Shell

Inject this direct communicator block inside your React Native application component `App.js` containing the `<WebView>` node to route answers, declines, and triggers in real-time.

```javascript
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import RNCallKeep from 'react-native-callkeep';

export default function NativeApp() {
  const webViewRef = useRef(null);

  useEffect(() => {
    // 1. Listen for Answer Call Event
    const onAnswerCall = ({ callUUID }) => {
      console.log('[App] Answer call event received for:', callUUID);
      RNCallKeep.backToForeground();
      
      // Post accept verification JSON directly inside the compiled React-web app
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'NATIVE_CALL_ACCEPTED',
        callUUID
      }));
    };

    // 2. Listen for Reject Call Event
    const onEndCall = ({ callUUID }) => {
      console.log('[App] Decline/End call event received for:', callUUID);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'NATIVE_CALL_DECLINED',
        callUUID
      }));
    };

    RNCallKeep.addEventListener('answerCall', onAnswerCall);
    RNCallKeep.addEventListener('endCall', onEndCall);

    return () => {
      RNCallKeep.removeEventListener('answerCall', onAnswerCall);
      RNCallKeep.removeEventListener('endCall', onEndCall);
    };
  }, []);

  // Capture incoming call triggers dispatched in reverse direction (e.g., outgoing dials initiated inside web view)
  const onWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[Native App] Intercepted event from Web context:', data);

      if (data.type === 'DISPLAY_INCOMING_CALL') {
        RNCallKeep.displayIncomingCall(
          data.callUUID,
          data.callerName,
          data.callerName,
          'number',
          data.type === 'video'
        );
      } else if (data.type === 'NATIVE_CALL_ANSWERED') {
        RNCallKeep.setCurrentCallActive(data.callUUID);
      } else if (data.type === 'END_NATIVE_CALL') {
        RNCallKeep.endCall(data.callUUID);
      }
    } catch (e) {
      console.warn('Parser failure on web signal package:', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://ais-dev-gkd3tmmug3d4w3rh7orply-866874907354.asia-southeast1.run.app' }}
        onMessage={onWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090514' }
});
```

---

## 5. Troubleshooting & Battery Guard Optimization

If you receive the FCM background log payload but no incoming call screen displays:

1. **Android 13+ Notification Permissions**:
   You must invoke request permission requests before attempting call setups:
   ```javascript
   import { PermissionsAndroid, Platform } from 'react-native';
   if (Platform.OS === 'android') {
     await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
   }
   ```
2. **Aggressive OEM Memory Killers (Samsung, Xiaomi, Oppo, Vivo)**:
   By default, Android kills background headless JS actions after minutes of idle state. instruct your users to set **Love Link Battery Settings to "Unrestricted"** and enable the **"Autostart"** option on devices to obtain 100% stable WhatsApp-quality calling triggers.
3. **Manual Direct Call Diagnostics Button**:
   Add a quick touch button inside your testing screen to trigger CallKeep immediately:
   ```javascript
   // If this opens the incoming view, calling setups & permissions are 100% correct!
   RNCallKeep.displayIncomingCall('test_uuid', 'Direct Test Call', 'Direct Test Call', 'number', true);
   ```
4. **Notifee FullScreen Notification Fallback**:
   If Telecom API is disabled or blocked on specific carrier bands, use Notifee with standard fullScreenAction targets to force overlay incoming sheets:
   ```javascript
   await notifee.displayNotification({
     title: 'Incoming Love Call',
     body: 'Your partner is calling you now',
     android: {
       channelId: 'love-link-calls',
       category: AndroidCategory.CALL,
       importance: AndroidImportance.HIGH,
       fullScreenAction: { id: 'default' },
     },
   });
   ```
