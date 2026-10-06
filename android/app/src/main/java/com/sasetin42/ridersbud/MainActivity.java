package com.sasetin42.ridersbud;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "RidersBUD";
    private boolean rendererRecoveryPending = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(com.sasetin42.ridersbud.payment.HitPayInAppPlugin.class);
        super.onCreate(savedInstanceState);
        registerRenderProcessGuard();
    }

    /**
     * ROOT-CAUSE FIX for the "App Error: RidersBUD crashed" notification.
     *
     * Capacitor's BridgeWebViewClient.onRenderProcessGone() returns false unless a
     * WebViewListener claims the event, and a false return makes Android KILL the
     * app process. The WebView renderer dies whenever memory runs out or the
     * renderer itself crashes — and the HitPay checkout flow opens a SECOND
     * WebView (HitPayPaymentActivity) on top of the bridge WebView, which is
     * exactly when devices run out of memory. The result was a native process
     * death right when the customer proceeded to payment.
     *
     * This listener claims the event (returns true), then rebuilds the activity
     * so the app survives. The pending-payment marker in localStorage plus the
     * resume hook in App.tsx restore the in-flight payment verification after the
     * rebuild, so no payment state is lost.
     */
    private void registerRenderProcessGuard() {
        final Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }
        try {
            bridge.addWebViewListener(new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                    boolean crashed = detail != null && detail.didCrash();
                    Log.e(TAG, "WebView render process gone (didCrash=" + crashed
                            + ") — recovering instead of crashing the app.");
                    if (rendererRecoveryPending) {
                        return true;
                    }
                    rendererRecoveryPending = true;
                    // Must return true first (keeps the process alive); rebuild
                    // the activity on the next main-loop pass.
                    new Handler(Looper.getMainLooper()).post(() -> {
                        try {
                            recreate();
                        } catch (Exception rebuildError) {
                            Log.e(TAG, "Renderer recovery rebuild failed", rebuildError);
                            try {
                                finish();
                            } catch (Exception ignored) {
                                // Nothing else we can do — but never let this
                                // escape as an uncaught exception.
                            }
                        }
                    });
                    return true;
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "Unable to register render-process guard: " + e.getMessage());
        }
    }

    /**
     * Warm-start delivery of VIEW intents — ridersbud://payment/return and the
     * HTTPS App Link fallback. BridgeActivity already forwards the intent to the
     * Capacitor bridge (which fires the App plugin's `appUrlOpen`); setIntent()
     * additionally keeps the latest VIEW attached to this activity so any later
     * redelivery resolves the payment return instead of the original launch intent.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}
