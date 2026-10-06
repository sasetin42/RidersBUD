package com.sasetin42.ridersbud.payment;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.DialogInterface;
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

import java.net.URISyntaxException;

/**
 * Native Payment Activity hosting a hardened Android WebView for HitPay Drop-In & Hosted Checkout.
 * Provides custom RidersBUD-branded header, navigation interception, back navigation dialog,
 * and seamless e-wallet intent handoffs.
 */
public class HitPayPaymentActivity extends AppCompatActivity {

    private static final String TAG = "RidersBUDPay";

    public static final String EXTRA_CHECKOUT_URL = "extra_checkout_url";
    public static final String EXTRA_SESSION_ID = "extra_session_id";
    public static final String EXTRA_AMOUNT = "extra_amount";
    public static final String EXTRA_REFERENCE = "extra_reference";

    public static final String ACTION_PAYMENT_REDIRECT = "com.sasetin42.ridersbud.PAYMENT_REDIRECT";
    public static final String ACTION_PAYMENT_CLOSED = "com.sasetin42.ridersbud.PAYMENT_CLOSED";
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

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

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

        // Native Top Bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dpToPx(56)));
        topBar.setBackgroundColor(Color.parseColor("#1A1A1A"));
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(dpToPx(16), 0, dpToPx(16), 0);

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
        webView = new WebView(this);
        webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));
        webView.setBackgroundColor(Color.WHITE);
        rootLayout.addView(webView);

        setContentView(rootLayout);

        // Hardening WebView configuration
        configureHardenedWebView();

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
    }

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
            // Reveal the RidersBUD activity after the wallet returns. The
            // Capacitor plugin event then routes the app into server verification.
            finish();
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
        destroyWebViewSafely();
        super.onDestroy();
    }
}
