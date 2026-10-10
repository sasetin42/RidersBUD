package com.sasetin42.ridersbud;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "RidersBUD";
    private boolean rendererRecoveryPending = false;
    private boolean rendererRecoveryDeferred = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        registerPlugin(com.sasetin42.ridersbud.payment.HitPayInAppPlugin.class);
        super.onCreate(savedInstanceState);
        try {
            // Enable true edge-to-edge rendering so WebView draws behind system bars
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
            getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Prevent OS from drawing artificial translucent/grey contrast scrim behind 3-button nav
                getWindow().setNavigationBarContrastEnforced(false);
                getWindow().setStatusBarContrastEnforced(false);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                getWindow().getAttributes().layoutInDisplayCutoutMode =
                        android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            }
            androidx.core.view.WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (controller != null) {
                // Ensure light status bar icons and light navigation keys (since RidersBUD has a dark UI theme)
                controller.setAppearanceLightStatusBars(false);
                controller.setAppearanceLightNavigationBars(false);
            }
        } catch (Exception e) {
            Log.w(TAG, "Edge-to-edge layout init warning: " + e.getMessage());
        }
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
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        if (com.sasetin42.ridersbud.payment.HitPayInAppPlugin.isNativePaymentActive()) {
                            Log.w(TAG, "Renderer recovery: payment is currently active, deferring recreate to prevent app dismissal.");
                            rendererRecoveryDeferred = true;
                            rendererRecoveryPending = false;
                            return;
                        }
                        destroyWebViewAndRecreate(webView);
                    }, 300);
                    return true;
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "Unable to register render-process guard: " + e.getMessage());
        }
    }

    // onResume() must stay public: BridgeActivity declares it public, and
    // narrowing the visibility of an override is a compile error.
    @Override
    public void onResume() {
        super.onResume();
        if (!rendererRecoveryDeferred || rendererRecoveryPending ||
                com.sasetin42.ridersbud.payment.HitPayInAppPlugin.isNativePaymentActive()) {
            return;
        }

        // The renderer may have died while the separate payment Activity was
        // foregrounded. Retry recovery after checkout returns instead of leaving
        // the customer on a blank Capacitor bridge indefinitely.
        rendererRecoveryDeferred = false;
        rendererRecoveryPending = true;
        new Handler(Looper.getMainLooper()).postDelayed(this::destroyBridgeWebViewAndRecreate, 300);
    }

    /**
     * Tear down the (already dead) bridge WebView and rebuild this activity.
     *
     * The WebView lives on the Bridge — MainActivity has no `webView` field — so
     * every teardown path must resolve it through getBridge().getWebView().
     * Nothing here may throw: a failure during recovery has to end in finish()
     * rather than as an uncaught exception in the middle of a payment.
     */
    private void destroyWebViewAndRecreate(WebView deadWebView) {
        try {
            destroyWebViewQuietly(deadWebView);
            recreate();
        } catch (Exception rebuildError) {
            Log.e(TAG, "Renderer recovery rebuild failed", rebuildError);
            try {
                finish();
            } catch (Exception ignored) {
                // Nothing else we can do — but never let this escape as an
                // uncaught exception.
            }
        } finally {
            rendererRecoveryPending = false;
        }
    }

    private void destroyBridgeWebViewAndRecreate() {
        WebView bridgeWebView = null;
        try {
            Bridge bridge = getBridge();
            if (bridge != null) {
                bridgeWebView = bridge.getWebView();
            }
        } catch (Exception ignored) {
            // Bridge already torn down — recreate() alone is enough.
        }
        destroyWebViewAndRecreate(bridgeWebView);
    }

    private void destroyWebViewQuietly(WebView view) {
        if (view == null) {
            return;
        }
        try {
            if (view.getParent() instanceof ViewGroup) {
                ((ViewGroup) view.getParent()).removeView(view);
            }
            view.stopLoading();
            view.destroy();
        } catch (Exception ignored) {
            // Renderer teardown is best-effort; keep the host app alive.
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
