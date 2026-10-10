package com.sasetin42.ridersbud.payment;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.IntentFilter;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.RenderProcessGoneDetail;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.sasetin42.ridersbud.R;

import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Native Payment Activity hosting a hardened Android WebView for HitPay Drop-In & Hosted Checkout.
 * Provides custom RidersBUD-branded header, navigation interception, back navigation dialog,
 * and seamless e-wallet intent handoffs.
 */
public class HitPayPaymentActivity extends AppCompatActivity {

    private static final String TAG = "RidersBUDPay";

    /**
     * True while a HitPayPaymentActivity instance is alive in ANY process.
     * The plugin (main process) reads this to decide whether closePayment()
     * should send a close-request broadcast or a direct "closed" event.
     */
    public static final AtomicBoolean isAlive = new AtomicBoolean(false);

    public static final String EXTRA_CHECKOUT_URL = "extra_checkout_url";
    public static final String EXTRA_SESSION_ID = "extra_session_id";
    public static final String EXTRA_AMOUNT = "extra_amount";
    public static final String EXTRA_REFERENCE = "extra_reference";

    public static final String ACTION_PAYMENT_REDIRECT = "com.sasetin42.ridersbud.PAYMENT_REDIRECT";
    public static final String ACTION_PAYMENT_CLOSED = "com.sasetin42.ridersbud.PAYMENT_CLOSED";

    /**
     * The payment activity lives in the isolated ":payment" process, so the
     * Capacitor plugin (main process) cannot directly finish() it.
     * closePayment() broadcasts this action; the activity listens for it here
     * and dismisses itself with the standard "payment closed" event.
     */
    public static final String ACTION_PAYMENT_CLOSE_REQUESTED = "com.sasetin42.ridersbud.PAYMENT_CLOSE_REQUESTED";
    public static final String ACTION_PAYMENT_ERROR = "com.sasetin42.ridersbud.PAYMENT_ERROR";
    public static final String ACTION_PROVIDER_OPENED = "com.sasetin42.ridersbud.PROVIDER_OPENED";
    public static final String ACTION_PROVIDER_RETURNED = "com.sasetin42.ridersbud.PROVIDER_RETURNED";

    public static final String EXTRA_RESULT_URL = "result_url";
    public static final String EXTRA_RESULT_ERROR = "result_error";
    public static final String EXTRA_PROVIDER_PACKAGE = "provider_package";
    public static final String EXTRA_PARAM_STATUS = "status";
    public static final String EXTRA_PARAM_REFERENCE = "reference";
    public static final String EXTRA_PARAM_SESSION_ID = "session_id";
    public static final String EXTRA_PARAM_TRANSACTION_ID = "transaction_id";
    public static final String EXTRA_PARAM_PAYMENT_REQUEST_ID = "payment_request_id";

    private WebView webView;
    private ProgressBar progressBar;
    private TextView titleTextView;
    private TextView subtitleTextView;
    private boolean waitingForProviderReturn = false;
    private String providerPackageName = null;

    // Popup WebViews created by onCreateWindow (window.open 3-D Secure / wallet
    // handoffs). They are never attached to the view hierarchy, so nothing else
    // disposes of them: each leaked WebView keeps its renderer alive, and repeated
    // popups push the app toward the memory pressure that kills the MAIN renderer
    // (the payment-crash path). Track them and destroy them with the activity.
    private final List<WebView> popupWebViews = new ArrayList<>();

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        // HARD REQUIREMENT — this activity extends AppCompatActivity, and
        // AppCompatDelegateImpl.createSubDecor() throws
        //   java.lang.IllegalStateException:
        //   "You need to use a Theme.AppCompat theme (or descendant) with this activity"
        // when the activity theme does not define the APPCOMPAT windowActionBar
        // attribute. That exception fired on EVERY checkout launch while this
        // activity still used the Theme.SplashScreen-based launch theme, killing
        // the ":payment" process — the reported "checkout always crashes".
        //
        // The manifest now declares @style/AppTheme.Payment; setTheme() here keeps
        // the container crash-proof even if that declaration is ever changed back
        // to a splash/launch theme. Must run BEFORE super.onCreate().
        // Set data directory suffix for isolated ":payment" process.
        // Android 9+ (API 28+) throws java.lang.RuntimeException if two processes access
        // the same WebView data directory concurrently without setting a distinct suffix.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                String processName = getApplicationContext().getPackageName() + ":payment";
                WebView.setDataDirectorySuffix("payment");
            } catch (Exception e) {
                Log.w(TAG, "setDataDirectorySuffix encountered exception or was already set: " + e.getMessage());
            }
        }

        setTheme(R.style.AppTheme_Payment);
        super.onCreate(savedInstanceState);

        // Smooth Edge-to-Edge immersive mobile layout for payment
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
        }
        androidx.core.view.WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        isAlive.set(true);

        String checkoutUrl = getIntent().getStringExtra(EXTRA_CHECKOUT_URL);
        String sessionId = getIntent().getStringExtra(EXTRA_SESSION_ID);
        String amount = getIntent().getStringExtra(EXTRA_AMOUNT);
        String reference = getIntent().getStringExtra(EXTRA_REFERENCE);

        if (checkoutUrl == null || checkoutUrl.trim().isEmpty()) {
            broadcastError("Missing checkout URL");
            finish();
            return;
        }
        if (!PaymentNavigationPolicy.isValidInitialCheckoutUrl(checkoutUrl)) {
            broadcastError("HitPay returned an unsupported checkout URL");
            finish();
            return;
        }

        // Build native layout programmatically to eliminate dependency on external XML resources
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        rootLayout.setBackgroundColor(Color.parseColor("#121212"));

        // Native Top Bar - sleek, compact, fits system status bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        topBar.setBackgroundColor(Color.parseColor("#161822"));
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(dpToPx(16), dpToPx(10), dpToPx(16), dpToPx(10));

        // Adjust topBar padding for status bar insets
        ViewCompat.setOnApplyWindowInsetsListener(topBar, (v, insets) -> {
            int statusBarHeight = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
            v.setPadding(dpToPx(16), statusBarHeight + dpToPx(8), dpToPx(16), dpToPx(8));
            return insets;
        });

        // Close / Cancel Button
        TextView closeBtn = new TextView(this);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setTextSize(20);
        closeBtn.setPadding(dpToPx(4), dpToPx(4), dpToPx(12), dpToPx(4));
        closeBtn.setOnClickListener(v -> showExitConfirmationDialog());
        topBar.addView(closeBtn);

        // Title and Subtitle container
        LinearLayout titleContainer = new LinearLayout(this);
        titleContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        titleContainer.setLayoutParams(titleParams);

        titleTextView = new TextView(this);
        titleTextView.setText(amount != null && !amount.isEmpty() ? "Pay " + amount : "Secure Payment");
        titleTextView.setTextColor(Color.WHITE);
        titleTextView.setTextSize(16);
        titleTextView.setTypeface(null, android.graphics.Typeface.BOLD);
        titleContainer.addView(titleTextView);

        subtitleTextView = new TextView(this);
        subtitleTextView.setText(reference != null && !reference.isEmpty() ? "Ref: " + reference : "HitPay Secure Checkout");
        subtitleTextView.setTextColor(Color.parseColor("#9E9E9E"));
        subtitleTextView.setTextSize(12);
        titleContainer.addView(subtitleTextView);

        topBar.addView(titleContainer);

        // Security badge / Brand icon
        TextView badge = new TextView(this);
        badge.setText("🔒 SSL");
        badge.setTextColor(Color.parseColor("#FE7803"));
        badge.setTextSize(12);
        badge.setTypeface(null, android.graphics.Typeface.BOLD);
        badge.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        topBar.addView(badge);

        rootLayout.addView(topBar);

        // Progress bar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dpToPx(4)));
        progressBar.setMax(100);
        progressBar.setProgress(0);
        rootLayout.addView(progressBar);

        // WebView
        try {
            webView = new WebView(this);
            webView.setLayoutParams(new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));
            webView.setBackgroundColor(Color.WHITE);
            rootLayout.addView(webView);

            // Apply navigation bar window insets to rootLayout bottom
            ViewCompat.setOnApplyWindowInsetsListener(rootLayout, (v, insets) -> {
                int navBarHeight = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
                v.setPadding(0, 0, 0, navBarHeight);
                return insets;
            });

            setContentView(rootLayout);

            // Hardening WebView configuration
            configureHardenedWebView();
        } catch (Throwable t) {
            Log.e(TAG, "Failed to initialize WebView in HitPayPaymentActivity", t);
            broadcastError("WebView initialization failed: " + t.getMessage());
            finish();
            return;
        }

        // Android Back Button handler using modern OnBackPressedDispatcher
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    showExitConfirmationDialog();
                } else {
                    showExitConfirmationDialog();
                }
            }
        });

        // Load the checkout or dropin URL
        webView.loadUrl(checkoutUrl);

        // Listen for a programmatic close request from the plugin (other process).
        // Without this listener, closePayment() only reached the JS layer and the
        // native payment sheet stayed open after the customer finished paying.
        closeRequestReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                runOnUiThread(() -> {
                    try {
                        webView.stopLoading();
                    } catch (Exception ignored) { }
                    broadcastClosed("Programmatically closed");
                    finish();
                });
            }
        };

        Context appCtx = getApplicationContext();
        IntentFilter closeFilter = new IntentFilter(ACTION_PAYMENT_CLOSE_REQUESTED);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                appCtx.registerReceiver(closeRequestReceiver, closeFilter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                appCtx.registerReceiver(closeRequestReceiver, closeFilter);
            }
        } catch (Exception e) {
            closeRequestReceiver = null;
            Log.w(TAG, "Close-request receiver registration failed: " + e.getMessage());
        }
    }

    /** Application-context receiver for closePayment() requests (see onCreate). */
    private BroadcastReceiver closeRequestReceiver;

    @SuppressLint("SetJavaScriptEnabled")
    private void configureHardenedWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // Security restrictions
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
        }

        // Never allow mixed content (HTTP inside HTTPS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        // HitPay, banks, and GCash/Maya web portals require a standard modern Chrome mobile user-agent.
        // Some financial gateways block or misrender WebViews containing 'wv' in their UA.
        String defaultUa = settings.getUserAgentString();
        if (defaultUa != null) {
            String cleanUa = defaultUa.replace("; wv", "");
            settings.setUserAgentString(cleanUa);
        }

        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress >= 100) {
                    progressBar.setVisibility(View.GONE);
                } else {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                }
            }

            /**
             * HitPay's hosted checkout (and several 3-D Secure / e-wallet
             * handoffs) opens its next step with window.open(). With multiple
             * windows enabled and no handler, that call silently returns null
             * and the customer is stranded on a frozen checkout — a dead flow.
             * Capture the popup's first navigation and route it through the
             * same policy engine as the main WebView (return interception,
             * wallet launch, load, or block).
             */
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                WebView popup = new WebView(HitPayPaymentActivity.this);
                synchronized (popupWebViews) {
                    popupWebViews.add(popup);
                }
                popup.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        if (request == null || request.getUrl() == null) return false;
                        return routePopupNavigation(request.getUrl().toString());
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, String url) {
                        return routePopupNavigation(url);
                    }
                });
                try {
                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(popup);
                    resultMsg.sendToTarget();
                } catch (Exception e) {
                    Log.w(TAG, "Unable to hand off popup window: " + e.getMessage());
                }
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return handleNavigation(request.getUrl().toString());
                }
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(url);
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // Strict TLS policy: Reject SSL errors
                handler.cancel();
                broadcastError("SSL certificate validation failed: " + error.toString());
                finish();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request == null || !request.isForMainFrame()) {
                    return;
                }
                // ERROR_UNKNOWN (-1) is what WebView reports for an ABORTED
                // navigation (bank 3-D Secure hand-offs, redirects to a wallet,
                // stopLoading()). Treating those as fatal tore the checkout down
                // mid-payment and left the customer with nowhere to go. Only
                // definite network failures close the container.
                int code = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? error.getErrorCode()
                        : -1;
                if (code == android.webkit.WebViewClient.ERROR_UNKNOWN || code == 0) {
                    Log.w(TAG, "Main-frame navigation aborted/error " + code + " — keeping checkout open.");
                    return;
                }
                broadcastError("HitPay checkout could not load. Check your internet connection and try again.");
                finish();
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                broadcastError("The secure checkout closed unexpectedly. No payment status has been assumed.");
                destroyWebViewSafely();
                finish();
                return true;
            }
        });
    }

    /**
     * Resolve a popup (window.open) navigation against the policy engine.
     * LOAD is pulled into the primary WebView so the customer never loses the
     * checkout context; return/wallet/block decisions behave exactly like a
     * top-level navigation.
     */
    private boolean routePopupNavigation(String url) {
        if (url == null || url.isEmpty()) return true;
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(url);
        if (decision.action == PaymentNavigationPolicy.PolicyAction.LOAD) {
            final WebView main = webView;
            if (main != null) {
                runOnUiThread(() -> {
                    try {
                        main.loadUrl(url);
                    } catch (Exception e) {
                        Log.w(TAG, "Popup load failed: " + e.getMessage());
                    }
                });
            }
            return true;
        }
        return handleNavigation(url);
    }

    private boolean handleNavigation(String url) {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(url);

        switch (decision.action) {
            case INTERCEPT_RETURN:
                // Signal return event to plugin and close native payment container
                broadcastRedirect(url);
                finish();
                return true;

            case LAUNCH_PROVIDER_APP:
                launchProviderApp(url, decision.providerPackage);
                return true;

            case LOAD:
                // If it's a 3DS ACS verification host, update title to Bank Verification
                if (decision.reason != null && decision.reason.contains("Bank 3DS")) {
                    subtitleTextView.setText("Bank Security Verification (3-D Secure)");
                }
                return false;

            case BLOCK:
            default:
                broadcastError("Blocked navigation: " + decision.reason + " (" + url + ")");
                return true;
        }
    }

    private void launchProviderApp(String uriString, @Nullable String targetPackage) {
        try {
            Intent intent;
            if (uriString.startsWith("intent://")) {
                intent = Intent.parseUri(uriString, Intent.URI_INTENT_SCHEME);
            } else {
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uriString));
            }

            if (targetPackage != null && !targetPackage.isEmpty()) {
                intent.setPackage(targetPackage);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            startActivity(intent);
            waitingForProviderReturn = true;
            providerPackageName = targetPackage != null ? targetPackage : uriString;

            broadcastProviderOpened(providerPackageName);
        } catch (Exception e) {
            // ActivityNotFoundException, SecurityException and malformed intent
            // URIs all arrive here — none of them may escape as a fatal error
            // in the middle of a payment.
            Log.w(TAG, "Provider launch failed: " + e.getMessage());
            // If the provider app is not installed, fallback to market or notify
            if (targetPackage != null) {
                try {
                    Intent marketIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + targetPackage));
                    marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(marketIntent);
                    return;
                } catch (Exception ignored) {
                }
            }
            Toast.makeText(this, "Provider application not installed", Toast.LENGTH_SHORT).show();
            broadcastError("Failed to launch provider app: " + e.getMessage());
        }
    }

    private void destroyWebViewSafely() {
        // Tear down every popup WebView captured from window.open first.
        List<WebView> popups;
        synchronized (popupWebViews) {
            popups = new ArrayList<>(popupWebViews);
            popupWebViews.clear();
        }
        for (WebView popup : popups) {
            try {
                popup.stopLoading();
                popup.destroy();
            } catch (Exception ignored) {
                // Renderer teardown is best-effort; keep the host app alive.
            }
        }

        WebView view = webView;
        webView = null;
        if (view == null) return;
        try {
            ViewGroup parent = (ViewGroup) view.getParent();
            if (parent != null) parent.removeView(view);
            view.stopLoading();
            view.destroy();
        } catch (Exception ignored) {
            // Renderer teardown is best-effort; keep the host app alive.
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (waitingForProviderReturn) {
            waitingForProviderReturn = false;
            broadcastProviderReturned(providerPackageName);
            // DO NOT immediately finish() here. Prematurely finishing the activity
            // causes the host app to navigate away to customer portal before the
            // payment is confirmed or redirect URL is captured. Keep the payment
            // container alive and let the redirect or manual completion close it.
            Log.d(TAG, "Returned from provider app (" + providerPackageName + "), keeping checkout alive.");
        }
    }

    private void showExitConfirmationDialog() {
        // Never build a dialog for a window that is already going away
        // (BadTokenException was a fatal crash path during payment exit).
        if (isFinishing() || isDestroyed()) {
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("Leave Payment?")
                .setMessage("Your payment has not yet been confirmed. If you leave now, the transaction may be cancelled or delayed.")
                .setPositiveButton("Stay", (dialog, which) -> dialog.dismiss())
                .setNegativeButton("Leave", (dialog, which) -> {
                    dialog.dismiss();
                    broadcastClosed("User voluntarily exited payment");
                    finish();
                })
                .setCancelable(false)
                .show();
    }

    private void broadcastRedirect(String url) {
        Intent intent = targetedBroadcast(ACTION_PAYMENT_REDIRECT);
        intent.putExtra(EXTRA_RESULT_URL, url);

        try {
            Uri uri = Uri.parse(url);
            String status = uri.getQueryParameter("status");
            String ref = uri.getQueryParameter("ref");
            if (ref == null) {
                ref = uri.getQueryParameter("reference");
            }
            String s = uri.getQueryParameter("s");
            String tx = uri.getQueryParameter("tx");
            String paymentRequestId = uri.getQueryParameter("payment_request_id");

            if (status != null) intent.putExtra(EXTRA_PARAM_STATUS, status);
            if (ref != null) intent.putExtra(EXTRA_PARAM_REFERENCE, ref);
            if (s != null) intent.putExtra(EXTRA_PARAM_SESSION_ID, s);
            if (tx != null) intent.putExtra(EXTRA_PARAM_TRANSACTION_ID, tx);
            if (paymentRequestId != null) intent.putExtra(EXTRA_PARAM_PAYMENT_REQUEST_ID, paymentRequestId);
        } catch (Exception ignored) {
        }

        sendBroadcast(intent);
    }

    private void broadcastClosed(String reason) {
        Intent intent = targetedBroadcast(ACTION_PAYMENT_CLOSED);
        intent.putExtra(EXTRA_RESULT_ERROR, reason);
        sendBroadcast(intent);
    }

    private void broadcastError(String error) {
        Intent intent = targetedBroadcast(ACTION_PAYMENT_ERROR);
        intent.putExtra(EXTRA_RESULT_ERROR, error);
        sendBroadcast(intent);
    }

    private void broadcastProviderOpened(String pkg) {
        Intent intent = targetedBroadcast(ACTION_PROVIDER_OPENED);
        intent.putExtra(EXTRA_PROVIDER_PACKAGE, pkg);
        sendBroadcast(intent);
    }

    private void broadcastProviderReturned(String pkg) {
        Intent intent = targetedBroadcast(ACTION_PROVIDER_RETURNED);
        intent.putExtra(EXTRA_PROVIDER_PACKAGE, pkg);
        sendBroadcast(intent);
    }

    /**
     * Every payment event must be explicitly addressed to this package.
     *
     * Since Android 14 (and this app targets SDK 36), a context-registered
     * receiver created with RECEIVER_NOT_EXPORTED does NOT receive custom-action
     * implicit broadcasts — even from the same app (AOSP issue 293487554).
     * Without setPackage() the paymentRedirect/paymentClosed events were silently
     * dropped, so the app was never told the payment had returned: the classic
     * "stuck after paying" dead flow. Targeting the package guarantees delivery
     * and stops other apps from spoofing payment events.
     */
    private Intent targetedBroadcast(String action) {
        Intent intent = new Intent(action);
        intent.setPackage(getPackageName());
        return intent;
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    @Override
    protected void onDestroy() {
        if (closeRequestReceiver != null) {
            try {
                unregisterReceiver(closeRequestReceiver);
            } catch (Exception ignored) { }
            closeRequestReceiver = null;
        }
        isAlive.set(false);
        destroyWebViewSafely();
        super.onDestroy();
    }
}
