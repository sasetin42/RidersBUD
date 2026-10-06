package com.sasetin42.ridersbud.payment;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor Plugin: HitPayInApp
 * Provides native container orchestration for HitPay payments on Android.
 * Communicates with HitPayPaymentActivity and emits lifecycle events to TypeScript.
 */
@CapacitorPlugin(name = "HitPayInApp")
public class HitPayInAppPlugin extends Plugin {

    private boolean isPaymentOpen = false;
    private BroadcastReceiver paymentReceiver;

    @Override
    public void load() {
        super.load();
        registerPaymentReceiver();
    }

    private void registerPaymentReceiver() {
        if (paymentReceiver != null) {
            return;
        }

        paymentReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || intent.getAction() == null) {
                    return;
                }

                String action = intent.getAction();
                JSObject ret = new JSObject();

                switch (action) {
                    case HitPayPaymentActivity.ACTION_PAYMENT_REDIRECT:
                        isPaymentOpen = false;
                        String url = intent.getStringExtra(HitPayPaymentActivity.EXTRA_RESULT_URL);
                        ret.put("url", url);
                        if (intent.hasExtra(HitPayPaymentActivity.EXTRA_PARAM_STATUS)) {
                            ret.put("status", intent.getStringExtra(HitPayPaymentActivity.EXTRA_PARAM_STATUS));
                        }
                        if (intent.hasExtra(HitPayPaymentActivity.EXTRA_PARAM_REFERENCE)) {
                            ret.put("reference", intent.getStringExtra(HitPayPaymentActivity.EXTRA_PARAM_REFERENCE));
                        }
                        if (intent.hasExtra(HitPayPaymentActivity.EXTRA_PARAM_SESSION_ID)) {
                            ret.put("sessionId", intent.getStringExtra(HitPayPaymentActivity.EXTRA_PARAM_SESSION_ID));
                        }
                        if (intent.hasExtra(HitPayPaymentActivity.EXTRA_PARAM_TRANSACTION_ID)) {
                            ret.put("transactionId", intent.getStringExtra(HitPayPaymentActivity.EXTRA_PARAM_TRANSACTION_ID));
                        }
                        if (intent.hasExtra(HitPayPaymentActivity.EXTRA_PARAM_PAYMENT_REQUEST_ID)) {
                            ret.put("paymentRequestId", intent.getStringExtra(HitPayPaymentActivity.EXTRA_PARAM_PAYMENT_REQUEST_ID));
                        }
                        notifyListeners("paymentRedirect", ret);
                        break;

                    case HitPayPaymentActivity.ACTION_PAYMENT_CLOSED:
                        isPaymentOpen = false;
                        String closeReason = intent.getStringExtra(HitPayPaymentActivity.EXTRA_RESULT_ERROR);
                        ret.put("reason", closeReason);
                        notifyListeners("paymentClosed", ret);
                        break;

                    case HitPayPaymentActivity.ACTION_PAYMENT_ERROR:
                        isPaymentOpen = false;
                        String error = intent.getStringExtra(HitPayPaymentActivity.EXTRA_RESULT_ERROR);
                        ret.put("error", error);
                        notifyListeners("paymentError", ret);
                        break;

                    case HitPayPaymentActivity.ACTION_PROVIDER_OPENED:
                        String pkg = intent.getStringExtra(HitPayPaymentActivity.EXTRA_PROVIDER_PACKAGE);
                        ret.put("provider", pkg);
                        notifyListeners("paymentProviderOpened", ret);
                        break;

                    case HitPayPaymentActivity.ACTION_PROVIDER_RETURNED:
                        String retPkg = intent.getStringExtra(HitPayPaymentActivity.EXTRA_PROVIDER_PACKAGE);
                        ret.put("provider", retPkg);
                        notifyListeners("paymentProviderReturned", ret);
                        break;
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(HitPayPaymentActivity.ACTION_PAYMENT_REDIRECT);
        filter.addAction(HitPayPaymentActivity.ACTION_PAYMENT_CLOSED);
        filter.addAction(HitPayPaymentActivity.ACTION_PAYMENT_ERROR);
        filter.addAction(HitPayPaymentActivity.ACTION_PROVIDER_OPENED);
        filter.addAction(HitPayPaymentActivity.ACTION_PROVIDER_RETURNED);

        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ctx.registerReceiver(paymentReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            ctx.registerReceiver(paymentReceiver, filter);
        }
    }

    @PluginMethod
    public void openPayment(PluginCall call) {
        String checkoutUrl = call.getString("checkoutUrl");
        if (checkoutUrl == null || checkoutUrl.isEmpty()) {
            call.reject("Must provide checkoutUrl");
            return;
        }

        String sessionId = call.getString("sessionId", "");
        String amount = call.getString("amount", "");
        String reference = call.getString("reference", "");

        if (!PaymentNavigationPolicy.isValidInitialCheckoutUrl(checkoutUrl)) {
            call.reject("Checkout URL must be a valid HTTPS HitPay URL");
            return;
        }

        Intent intent = new Intent(getContext(), HitPayPaymentActivity.class);
        intent.putExtra(HitPayPaymentActivity.EXTRA_CHECKOUT_URL, checkoutUrl);
        intent.putExtra(HitPayPaymentActivity.EXTRA_SESSION_ID, sessionId);
        intent.putExtra(HitPayPaymentActivity.EXTRA_AMOUNT, amount);
        intent.putExtra(HitPayPaymentActivity.EXTRA_REFERENCE, reference);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(intent);
            isPaymentOpen = true;
        } catch (RuntimeException launchError) {
            isPaymentOpen = false;
            call.reject("Could not open the secure HitPay checkout", launchError);
            return;
        }

        JSObject event = new JSObject();
        event.put("sessionId", sessionId);
        notifyListeners("paymentOpened", event);

        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void closePayment(PluginCall call) {
        isPaymentOpen = false;
        // Broadcast close event or finish current activity
        Intent closeIntent = new Intent(HitPayPaymentActivity.ACTION_PAYMENT_CLOSED);
        closeIntent.putExtra(HitPayPaymentActivity.EXTRA_RESULT_ERROR, "Programmatically closed");
        getContext().sendBroadcast(closeIntent);

        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void isPaymentOpen(PluginCall call) {
        JSObject res = new JSObject();
        res.put("isOpen", isPaymentOpen);
        call.resolve(res);
    }

    @PluginMethod
    public void openProviderApp(PluginCall call) {
        String appUrl = call.getString("appUrl");
        String packageName = call.getString("packageName");

        if (appUrl == null || appUrl.isEmpty()) {
            call.reject("Must provide appUrl");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(appUrl));
            if (packageName != null && !packageName.isEmpty()) {
                intent.setPackage(packageName);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to open provider app: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (paymentReceiver != null) {
            try {
                getContext().unregisterReceiver(paymentReceiver);
            } catch (Exception ignored) {
            }
            paymentReceiver = null;
        }
        super.handleOnDestroy();
    }
}
