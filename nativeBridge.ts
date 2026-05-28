import { triggerHapticFeedback } from '../lib/haptics';

/**
 * Native Bridge interface to connect the React + Vite Web engine
 * with the React Native / Android / iOS Webview shell wrapper.
 * Enables system-level CallKeep and FCM message synchrony.
 */
export const nativeCallBridge = {
  /**
   * Dispatches unified payload actions to standard mobile shell wrappers
   */
  send: (type: string, data: any = {}) => {
    const payload = { type, ...data, origin: 'lovelink_web' };
    console.log(`[NativeCallBridge SDK -> Sender] Dispatching action: ${type}`, payload);

    try {
      // 1. ReactNativeWebView Channel Support (iOS/Android WebView)
      if ((window as any).ReactNativeWebView?.postMessage) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify(payload));
        return true;
      }

      // 2. Standard WebKit WebMessage Injection Support (iOS Swift WKWebView)
      if ((window as any).webkit?.messageHandlers?.lovelinkBridge?.postMessage) {
        (window as any).webkit.messageHandlers.lovelinkBridge.postMessage(payload);
        return true;
      }

      // 3. Android WebInterface Injection Support
      if ((window as any).LoveLinkAndroidBridge?.postMessage) {
        (window as any).LoveLinkAndroidBridge.postMessage(JSON.stringify(payload));
        return true;
      }
    } catch (err) {
      console.warn('[NativeCallBridge SDK] Failed to forward dispatch to Native Context:', err);
    }
    return false;
  },

  /**
   * Set up bidirectional event bindings to listen to native hardware callbacks 
   * (e.g. CallKeep accept/decline triggers)
   */
  registerInflowListener: (callbacks: {
    onNativeAccept: () => void;
    onNativeDecline: () => void;
    onNativeEnd: () => void;
  }) => {
    const handler = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        
        let msgData: any = {};
        if (typeof event.data === 'string') {
          // Attempt to parse stringified JSON posts
          if (event.data.startsWith('{')) {
            msgData = JSON.parse(event.data);
          } else {
            return; // Normal line text, ignore
          }
        } else if (typeof event.data === 'object' && event.data !== null) {
          msgData = event.data;
        }

        if (msgData.origin === 'lovelink_web') return; // Ignore echoing dispatches

        console.log('[NativeCallBridge SDK -> Receiver] Clean native payload intercepted:', msgData);

        switch (msgData.type) {
          case 'NATIVE_CALL_ACCEPTED':
            console.log('[NativeCallBridge SDK] Native CallKeep accepted call. Invoking accept callback.');
            triggerHapticFeedback('heavy');
            callbacks.onNativeAccept();
            break;
            
          case 'NATIVE_CALL_DECLINED':
            console.log('[NativeCallBridge SDK] Native CallKeep declined call. Invoking decline callback.');
            triggerHapticFeedback('medium');
            callbacks.onNativeDecline();
            break;

          case 'NATIVE_CALL_ENDED':
            console.log('[NativeCallBridge SDK] Native CallKeep ended the call. Invoking end call callback.');
            callbacks.onNativeEnd();
            break;

          default:
            break;
        }
      } catch (err) {
        console.warn('[NativeCallBridge SDK] Parser error on received Native listener block:', err);
      }
    };

    window.addEventListener('message', handler);
    // Also attach to document to capture target Cordova wrapper overrides
    document.addEventListener('message' as any, handler as any);

    return () => {
      window.removeEventListener('message', handler);
      document.removeEventListener('message' as any, handler as any);
    };
  }
};
