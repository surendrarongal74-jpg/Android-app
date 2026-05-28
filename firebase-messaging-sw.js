importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

// This requires your standard firebase web config to initialize in the service worker
// Replace with the actual config via deploy-time injection or env vars
const firebaseConfig = {
  // Config goes here for production
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'Love Link';
    const notificationOptions = {
      body: payload.notification?.body || 'Incoming call',
      icon: '/vite.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch(err) {
  console.log('Firebase messaging SW initialization failed:', err);
}
