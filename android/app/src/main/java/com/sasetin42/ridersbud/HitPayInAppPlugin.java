package com.sasetin42.ridersbud;

import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.URISyntaxException;

@CapacitorPlugin(name = "HitPayInApp")
public class HitPayInAppPlugin extends Plugin {

    private Dialog paymentDialog = null;
    private WebView paymentWebView = null;
    private PluginCall activeCall = null;

    @PluginMethod
    public void openPayment(PluginCall call) {
        final String paymentUrl = call.getString("url");
        final String title = call.getString("title", "Secure Online Payment");
        final String returnScheme = call.getString("returnScheme", "ridersbud");

        if (paymentUrl == null || paymentUrl.isEmpty()) {
            call.reject("Payment URL is required");
            return;
        }

        activeCall = call;

        getActivity().runOnUiThread(() -> {
            try {
                showInAppPaymentSheet(paymentUrl, title, returnScheme);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to open in-app payment: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void closePayment(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            dismissPaymentDialog("script_closed");
            if (call != null) {
                JSObject ret = new JSObject();
                ret.put("closed", true);
                call.resolve(ret);
            }
        });
    }

    private void showInAppPaymentSheet(String paymentUrl, String titleText, String returnScheme) {
        Context context = getActivity();
        if (paymentDialog != null && paymentDialog.isShowing()) {
            paymentDialog.dismiss();
        }

        paymentDialog = new Dialog(context, android.R.style.Theme_DeviceDefault_NoActionBar_Fullscreen);
        Window window = paymentDialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            window.setBackgroundDrawable(new ColorDrawable(Color.WHITE));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(0xFFFE7803); // RidersBUD primary brand orange
            }
        }

        // Root container
        LinearLayout rootLayout = new LinearLayout(context);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        rootLayout.setBackgroundColor(Color.WHITE);

        // Header Toolbar
        LinearLayout header = new LinearLayout(context);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dpToPx(56)
        ));
        header.setBackgroundColor(0xFFFE7803); // #FE7803
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dpToPx(12), 0, dpToPx(12), 0);

        // Close button
        TextView closeBtn = new TextView(context);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setTextSize(20);
        closeBtn.setPadding(dpToPx(8), dpToPx(8), dpToPx(16), dpToPx(8));
        closeBtn.setOnClickListener(v -> dismissPaymentDialog("user_cancelled"));
        header.addView(closeBtn);

        // Title
        TextView title = new TextView(context);
        title.setText(titleText);
        title.setTextColor(Color.WHITE);
        title.setTextSize(16);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f
        );
        title.setLayoutParams(titleParams);
        header.addView(title);

        // Lock icon indicator
        TextView lockIndicator = new TextView(context);
        lockIndicator.setText("🔒 256-bit SSL");
        lockIndicator.setTextColor(0xFFFFF3E0);
        lockIndicator.setTextSize(11);
        lockIndicator.setPadding(dpToPx(6), dpToPx(2), dpToPx(6), dpToPx(2));
        header.addView(lockIndicator);

        rootLayout.addView(header);

        // Progress Bar
        final ProgressBar progressBar = new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dpToPx(3)
        ));
        progressBar.setMax(100);
        progressBar.setProgress(10);
        rootLayout.addView(progressBar);

        // Content Frame for WebView
        FrameLayout webFrame = new FrameLayout(context);
        webFrame.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f
        ));

        paymentWebView = new WebView(context);
        paymentWebView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        configureWebView(paymentWebView, progressBar, returnScheme);
        webFrame.addView(paymentWebView);
        rootLayout.addView(webFrame);

        paymentDialog.setContentView(rootLayout);
        paymentDialog.setOnDismissListener(dialog -> {
            notifyPaymentDismissed("dialog_dismissed");
            destroyWebView();
        });

        paymentDialog.show();
        paymentWebView.loadUrl(paymentUrl);
    }

    private void configureWebView(WebView webView, final ProgressBar progressBar, final String returnScheme) {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (progressBar != null) {
                    progressBar.setProgress(newProgress);
                    if (newProgress >= 100) {
                        progressBar.setVisibility(View.GONE);
                    } else {
                        progressBar.setVisibility(View.VISIBLE);
                    }
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return handlePaymentNavigation(uri, returnScheme);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                return handlePaymentNavigation(uri, returnScheme);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                checkForReturnUrl(url, returnScheme);
            }
        });
    }

    private boolean handlePaymentNavigation(Uri uri, String returnScheme) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String urlString = uri.toString();

        // 1. App deep links (e.g. ridersbud://... or com.sasetin42.ridersbud://...)
        if (scheme != null && (scheme.equalsIgnoreCase(returnScheme) || scheme.equalsIgnoreCase("ridersbud") || scheme.equalsIgnoreCase("com.sasetin42.ridersbud"))) {
            notifyReturnUrlIntercepted(urlString);
            dismissPaymentDialog("return_scheme_intercepted");
            return true;
        }

        // 2. Web return URLs (e.g. ridersbud-10806.web.app/checkout or /booking-confirmation)
        if (checkForReturnUrl(urlString, returnScheme)) {
            return true;
        }

        // 3. Philippine e-wallets and native apps (GCash, PayMaya, GrabPay, Banking apps, Play Store)
        if (scheme != null && !scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https")) {
            try {
                Intent intent;
                if (scheme.equalsIgnoreCase("intent")) {
                    intent = Intent.parseUri(urlString, Intent.URI_INTENT_SCHEME);
                } else {
                    intent = new Intent(Intent.ACTION_VIEW, uri);
                }

                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                    getActivity().startActivity(intent);
                    return true;
                } else {
                    // Try fallback URL if defined in intent
                    String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                    if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                        paymentWebView.loadUrl(fallbackUrl);
                        return true;
                    }
                }
            } catch (Exception e) {
                // If app is not installed, avoid crashing and notify
            }
            return true;
        }

        // Standard web navigation inside HitPay checkout
        return false;
    }

    private boolean checkForReturnUrl(String url, String returnScheme) {
        if (url == null) return false;

        // Check if user landed on confirmation/return screen
        if (url.contains("status=completed") ||
            url.contains("payment_completed=1") ||
            url.contains("/booking-confirmation") ||
            url.contains("hitpay_status=completed")) {
            
            notifyReturnUrlIntercepted(url);
            // Give brief moment for session sync, then dismiss dialog
            getActivity().runOnUiThread(() -> {
                dismissPaymentDialog("payment_completed_redirect");
            });
            return true;
        }

        if (url.contains("status=canceled") || url.contains("status=cancelled") || url.contains("status=failed")) {
            notifyPaymentCancelled(url);
            getActivity().runOnUiThread(() -> {
                dismissPaymentDialog("user_cancelled");
            });
            return true;
        }

        return false;
    }

    private void dismissPaymentDialog(String reason) {
        try {
            if (paymentDialog != null && paymentDialog.isShowing()) {
                paymentDialog.dismiss();
            }
        } catch (Exception ignored) {
        } finally {
            paymentDialog = null;
        }
    }

    private void destroyWebView() {
        if (paymentWebView != null) {
            try {
                paymentWebView.stopLoading();
                paymentWebView.clearHistory();
                paymentWebView.destroy();
            } catch (Exception ignored) {
            } finally {
                paymentWebView = null;
            }
        }
    }

    private void notifyReturnUrlIntercepted(String url) {
        JSObject data = new JSObject();
        data.put("event", "payment_redirect");
        data.put("url", url);
        notifyListeners("onPaymentRedirect", data);
    }

    private void notifyPaymentCancelled(String url) {
        JSObject data = new JSObject();
        data.put("event", "payment_cancelled");
        data.put("url", url);
        notifyListeners("onPaymentCancelled", data);
    }

    private void notifyPaymentDismissed(String reason) {
        JSObject data = new JSObject();
        data.put("event", "payment_closed");
        data.put("reason", reason);
        notifyListeners("onPaymentClosed", data);
    }

    private int dpToPx(int dp) {
        float density = getActivity().getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }
}
