package com.sasetin42.ridersbud.payment;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Device-free guard for the payment-container theme crash.
 *
 * The crash it prevents:
 *   HitPayPaymentActivity extends AppCompatActivity but was declared with the
 *   splash launch theme (parent Theme.SplashScreen). AppCompatDelegateImpl
 *   requires the APPCOMPAT attribute windowActionBar — Theme.SplashScreen only
 *   sets the FRAMEWORK android:windowActionBar — so the \":payment\" process died
 *   with the FATAL EXCEPTION below on every checkout attempt:
 *
 *     java.lang.IllegalStateException:
 *     You need to use a Theme.AppCompat theme (or descendant) with this activity.
 *
 * HitPayPaymentActivityThemeTest proves this on a real device; this test proves
 * it from the sources in milliseconds (runs with `testDebugUnitTest`), so the
 * crash cannot come back unnoticed during a release build.
 */
public class HitPayPaymentThemeTest {

    /** Themes that are safe for an AppCompatActivity. */
    private static final String[] APPCOMPAT_ROOTS = {
            "Theme.AppCompat",
            "Theme.MaterialComponents",
            "Theme.Material3"
    };

    /** Themes that must NEVER be the activity theme of an AppCompatActivity. */
    private static final String[] NON_APPCOMPAT_ROOTS = {
            "Theme.SplashScreen",
            "android:Theme"
    };

    private static File projectFile(String relative) {
        // Gradle unit tests run with the module directory (android/app) as the
        // working directory, but be forgiving about how they are launched.
        String[] candidates = {
                relative,
                "app/" + relative,
                "android/app/" + relative,
                "../" + relative
        };
        for (String candidate : candidates) {
            File file = new File(candidate);
            if (file.isFile()) {
                return file;
            }
        }
        throw new AssertionError("Cannot locate " + relative + " from " + System.getProperty("user.dir"));
    }

    private static String read(File file) {
        try {
            return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new AssertionError("Cannot read " + file.getAbsolutePath(), e);
        }
    }

    /** name -> parent for every <style> in styles.xml. */
    private static Map<String, String> styleParents() {
        String styles = read(projectFile("src/main/res/values/styles.xml"));
        Map<String, String> parents = new HashMap<>();
        Matcher matcher = Pattern
                .compile("<style\\s+name=\"([^\"]+)\"\\s+parent=\"([^\"]+)\"")
                .matcher(styles);
        while (matcher.find()) {
            parents.put(matcher.group(1), matcher.group(2));
        }
        return parents;
    }

    private static String paymentActivityThemeName() {
        String manifest = read(projectFile("src/main/AndroidManifest.xml"));
        Matcher activity = Pattern
                .compile("<activity\\b[^>]*HitPayPaymentActivity[^>]*>", Pattern.DOTALL)
                .matcher(manifest);
        assertTrue("HitPayPaymentActivity must be declared in AndroidManifest.xml", activity.find());
        Matcher theme = Pattern
                .compile("android:theme=\"@style/([^\"]+)\"")
                .matcher(activity.group());
        assertTrue("HitPayPaymentActivity must declare an android:theme", theme.find());
        return theme.group(1);
    }

    private static boolean isAppCompatDescendant(Map<String, String> parents, String style) {
        String current = style;
        for (int depth = 0; current != null && depth < 25; depth++) {
            for (String root : NON_APPCOMPAT_ROOTS) {
                if (current.equals(root) || current.startsWith(root + ".")) {
                    return false;
                }
            }
            for (String root : APPCOMPAT_ROOTS) {
                if (current.equals(root) || current.startsWith(root + ".")) {
                    return true;
                }
            }
            current = parents.get(current);
        }
        return false;
    }

    @Test
    public void paymentActivityThemeDerivesFromAppCompat() {
        Map<String, String> parents = styleParents();
        String theme = paymentActivityThemeName();

        assertTrue("Theme " + theme + " is not defined in styles.xml at all",
                parents.containsKey(theme));
        assertFalse("HitPayPaymentActivity must not use the splash launch theme (" + theme
                        + "): it derives from Theme.SplashScreen and crashes AppCompatActivity with "
                        + "\"You need to use a Theme.AppCompat theme (or descendant) with this activity\".",
                "AppTheme.NoActionBarLaunch".equals(theme));

        StringBuilder chain = new StringBuilder(theme);
        String current = theme;
        for (int depth = 0; depth < 25; depth++) {
            String parent = parents.get(current);
            if (parent == null) break;
            chain.append(" -> ").append(parent);
            current = parent;
        }
        assertTrue("Theme chain " + chain + " never reaches a Theme.AppCompat theme, so the native "
                        + "HitPay checkout container crashes on every payment.",
                isAppCompatDescendant(parents, theme));
    }

    @Test
    public void paymentActivityForcesAnAppCompatThemeBeforeSuperOnCreate() {
        String source = read(projectFile(
                "src/main/java/com/sasetin42/ridersbud/payment/HitPayPaymentActivity.java"));
        int setTheme = source.indexOf("setTheme(");
        int superOnCreate = source.indexOf("super.onCreate(");
        assertTrue("HitPayPaymentActivity must call setTheme(...) before super.onCreate() so the "
                        + "AppCompat theme requirement can never crash the payment container again.",
                setTheme > 0 && superOnCreate > setTheme);
        assertNotNull(source);
    }
}
