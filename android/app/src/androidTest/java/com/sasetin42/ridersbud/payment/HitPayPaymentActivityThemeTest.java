package com.sasetin42.ridersbud.payment;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.UiAutomation;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.content.res.TypedArray;
import android.os.Build;
import android.view.accessibility.AccessibilityNodeInfo;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Regression guard for the "App Error — RidersBUD crashed" payment crash.
 *
 * ROOT CAUSE this test locks down:
 * `HitPayPaymentActivity` extends AppCompatActivity but its manifest theme was
 * `AppTheme.NoActionBarLaunch`, whose parent is androidx' `Theme.SplashScreen`.
 * `AppCompatDelegateImpl.createSubDecor()` requires the *AppCompat* attribute
 * `windowActionBar` to be defined by the activity theme and otherwise throws
 *
 *     java.lang.IllegalStateException:
 *     You need to use a Theme.AppCompat theme (or descendant) with this activity.
 *
 * `Theme.SplashScreen` only sets the FRAMEWORK attribute `android:windowActionBar`
 * (a different resource id), so every single launch of the native payment
 * container died with a FATAL EXCEPTION — the reported "checkout always crashes".
 * MainActivity survived only because Capacitor's BridgeActivity calls
 * setTheme(R.style.AppTheme_NoActionBar) before setContentView().
 *
 * Test 1 mirrors AppCompat's check exactly (same attribute, same resolution).
 * Test 2 actually starts the container and asserts its native UI came up, so a
 * regression fails loudly here instead of on a customer's phone.
 */
@RunWith(AndroidJUnit4.class)
public class HitPayPaymentActivityThemeTest {

    private Context targetContext() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

    /**
     * Mirrors AppCompatDelegateImpl.createSubDecor(): the theme declared for
     * HitPayPaymentActivity MUST define the AppCompat `windowActionBar` attribute
     * (i.e. derive from Theme.AppCompat) or the activity throws IllegalStateException.
     */
    @Test
    public void paymentActivityThemeIsAppCompatCompatible() {
        Context context = targetContext();

        ActivityInfo info;
        try {
            info = context.getPackageManager().getActivityInfo(
                    new android.content.ComponentName(context, HitPayPaymentActivity.class), 0);
        } catch (Exception e) {
            throw new AssertionError("HitPayPaymentActivity is not declared in the manifest", e);
        }

        int themeRes = info.getThemeResource();
        assertTrue("HitPayPaymentActivity must declare a theme in AndroidManifest.xml", themeRes != 0);

        // AppCompat's own windowActionBar attribute (merged into the app package).
        int windowActionBarAttr = context.getResources()
                .getIdentifier("windowActionBar", "attr", context.getPackageName());
        assertTrue("AppCompat windowActionBar attribute must be available", windowActionBarAttr != 0);

        android.view.ContextThemeWrapper themed =
                new android.view.ContextThemeWrapper(context, themeRes);
        TypedArray a = themed.obtainStyledAttributes(new int[] { windowActionBarAttr });
        boolean appCompatCompatible = a.hasValue(0);
        a.recycle();

        assertTrue(
                "HitPayPaymentActivity theme (resId=" + themeRes + ") does not derive from "
                        + "Theme.AppCompat, so AppCompatActivity.onCreate/setContentView throws "
                        + "\"You need to use a Theme.AppCompat theme (or descendant) with this "
                        + "activity\" — the payment container crash. Give the activity an AppCompat "
                        + "theme (e.g. AppTheme.Payment, a child of AppTheme.NoActionBar).",
                appCompatCompatible);
    }

    /**
     * The payment container runs in the isolated ":payment" process, so every
     * lifecycle event it emits (redirect / closed / error / provider) has to
     * travel to the plugin's receiver in the main process. On Android 13+ a
     * RECEIVER_NOT_EXPORTED receiver never receives a plain implicit broadcast,
     * which is why the events are package-targeted. This test proves the
     * cross-process channel actually delivers on the running Android version.
     */
    @Test
    public void paymentEventsReachThePluginReceiverAcrossProcesses() throws Exception {
        Context context = targetContext();
        final java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1);
        final java.util.concurrent.atomic.AtomicReference<String> received =
                new java.util.concurrent.atomic.AtomicReference<>();

        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent intent) {
                received.set(intent != null ? intent.getAction() : null);
                latch.countDown();
            }
        };

        IntentFilter filter = new IntentFilter(HitPayPaymentActivity.ACTION_PAYMENT_ERROR);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            context.registerReceiver(receiver, filter);
        }

        try {
            // An initial URL outside the HitPay allow-list makes the container
            // emit ACTION_PAYMENT_ERROR from the ":payment" process. The
            // validation happens before setContentView(), so this measures the
            // event channel and nothing else.
            Intent intent = new Intent(context, HitPayPaymentActivity.class);
            intent.putExtra(HitPayPaymentActivity.EXTRA_CHECKOUT_URL, "https://not-the-gateway.example/checkout");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            boolean delivered = latch.await(15, java.util.concurrent.TimeUnit.SECONDS);
            assertTrue("payment lifecycle events never reached the plugin receiver in the main "
                    + "process — the app would never learn the payment returned", delivered);
            assertTrue(HitPayPaymentActivity.ACTION_PAYMENT_ERROR.equals(received.get()));
        } finally {
            try {
                context.unregisterReceiver(receiver);
            } catch (Exception ignored) {
                // best effort
            }
        }
    }

    /**
     * End-to-end: actually start the native checkout container and assert its
     * native UI is on screen. If the activity crashes during creation the window
     * never appears and this fails.
     */
    @Test
    public void paymentContainerLaunchesAndRendersItsNativeUi() throws Exception {
        Context context = targetContext();

        Intent intent = new Intent(context, HitPayPaymentActivity.class);
        intent.putExtra(HitPayPaymentActivity.EXTRA_CHECKOUT_URL,
                "https://checkout.sandbox.hit-pay.com/pay/pr_theme_regression");
        intent.putExtra(HitPayPaymentActivity.EXTRA_AMOUNT, "PHP100.00");
        intent.putExtra(HitPayPaymentActivity.EXTRA_REFERENCE, "BOK-THEMECHECK-DP");
        intent.putExtra(HitPayPaymentActivity.EXTRA_SESSION_ID, "sess_theme_regression");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        UiAutomation automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        try {
            context.startActivity(intent);

            String found = null;
            long deadline = System.currentTimeMillis() + 15000L;
            while (System.currentTimeMillis() < deadline && found == null) {
                Thread.sleep(400);
                AccessibilityNodeInfo root = automation.getRootInActiveWindow();
                found = findTextStartingWith(root, "Pay ");
                if (root != null) root.recycle();
            }

            assertNotNull(
                    "The native HitPay checkout container never rendered its top bar — the "
                            + "payment activity crashed while starting.", found);
        } finally {
            // Tear the container down so the next test starts from a clean state.
            try {
                Intent close = new Intent(HitPayPaymentActivity.ACTION_PAYMENT_CLOSE_REQUESTED);
                close.setPackage(context.getPackageName());
                context.sendBroadcast(close);
            } catch (Exception ignored) {
                // best effort cleanup only
            }
        }
    }

    private static String findTextStartingWith(AccessibilityNodeInfo node, String prefix) {
        if (node == null) return null;
        CharSequence text = node.getText();
        if (text != null && text.toString().startsWith(prefix)) {
            return text.toString();
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            String match = findTextStartingWith(node.getChild(i), prefix);
            if (match != null) return match;
        }
        return null;
    }
}
