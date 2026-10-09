package com.sasetin42.ridersbud.payment;

import java.net.URI;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Pure Java navigation policy for HitPay In-App Payment WebView.
 * Evaluates target URIs against security and routing rules without Android framework mocks.
 */
public class PaymentNavigationPolicy {

    public enum PolicyAction {
        LOAD,                  // Load inside WebView
        INTERCEPT_RETURN,      // HitPay completion/return URL - signal frontend and close container
        LAUNCH_PROVIDER_APP,   // External e-wallet or app intent (e.g. gcash, paymaya, market)
        BLOCK                  // Prohibited or unsafe scheme/host
    }

    public static class Decision {
        public final PolicyAction action;
        public final String reason;
        public final String providerPackage; // Optional package if parsed from intent://

        public Decision(PolicyAction action, String reason) {
            this(action, reason, null);
        }

        public Decision(PolicyAction action, String reason, String providerPackage) {
            this.action = action;
            this.reason = reason;
            this.providerPackage = providerPackage;
        }
    }

    private static final Set<String> ALLOWED_HOSTS = new HashSet<>(Arrays.asList(
            "hit-pay.com",
            "sandbox.hit-pay.com",
            "ridersbud-10806.web.app"
    ));

    /** Initial checkout URLs must be HTTPS HitPay pages, never arbitrary web content. */
    public static boolean isValidInitialCheckoutUrl(String uriString) {
        if (uriString == null || uriString.trim().isEmpty()) return false;
        try {
            URI uri = URI.create(uriString.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null || !"https".equalsIgnoreCase(scheme)) return false;
            if (uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) return false;
            host = host.toLowerCase(Locale.ROOT);
            return host.equals("hit-pay.com") || host.endsWith(".hit-pay.com")
                    || host.equals("ridersbud-10806.web.app") || host.equals("ridersbud-10806.firebaseapp.com");
        } catch (Exception ignored) {
            return false;
        }
    }

    private static final Set<String> KNOWN_WALLET_SCHEMES = new HashSet<>(Arrays.asList(
            "gcash",
            "paymaya",
            "maya",
            "grabpay",
            "market"
    ));

    private static final Set<String> ALLOWED_INTENT_PACKAGES = new HashSet<>(Arrays.asList(
            "com.globe.gcash.android",
            "com.paymaya",
            "com.grabtaxi.passenger"
    ));

    /**
     * Determines the action to take for a given URI during WebView navigation.
     *
     * @param uriString The raw URL to evaluate.
     * @return Decision containing the action and rationale.
     */
    public static Decision evaluate(String uriString) {
        if (uriString == null || uriString.trim().isEmpty()) {
            return new Decision(PolicyAction.BLOCK, "Empty or null URI");
        }

        URI uri;
        try {
            uri = parseLeniently(uriString.trim());
        } catch (Exception e) {
            // Unparseable URIs (bad %-escapes, illegal characters) used to escape
            // evaluation as an IllegalArgumentException and crash the WebView UI
            // thread mid-payment. A malformed URL is not a crash — it is a block.
            return new Decision(PolicyAction.BLOCK, "Malformed URI: " + e.getMessage());
        }

        if (uri == null) {
            return new Decision(PolicyAction.BLOCK, "Malformed URI");
        }

        String scheme = uri.getScheme();
        if (scheme == null) {
            return new Decision(PolicyAction.BLOCK, "Missing scheme");
        }
        scheme = scheme.toLowerCase(Locale.ROOT);

        // 1. Check Return URLs (App link or custom scheme)
        // ridersbud://payment/return
        if ("ridersbud".equals(scheme) || "com.sasetin42.ridersbud".equals(scheme)) {
            String host = uri.getHost();
            String path = uri.getPath();
            if ("payment".equalsIgnoreCase(host) && (path != null && path.startsWith("/return"))) {
                return new Decision(PolicyAction.INTERCEPT_RETURN, "Native return URI detected");
            }
            return new Decision(PolicyAction.BLOCK, "Unrecognized RidersBUD callback URI");
        }

        // https://ridersbud-10806.web.app/payment/return or firebaseapp.com
        if ("https".equals(scheme)) {
            String host = uri.getHost();
            if (host != null) {
                host = host.toLowerCase(Locale.ROOT);
                if (host.equals("ridersbud-10806.web.app") || host.equals("ridersbud-10806.firebaseapp.com")) {
                    String path = uri.getPath();
                    if (path != null && path.startsWith("/payment/return")) {
                        return new Decision(PolicyAction.INTERCEPT_RETURN, "HTTPS return URL detected");
                    }
                }
            }
        }

        // 2. Known Wallet and App Store Schemes
        if (KNOWN_WALLET_SCHEMES.contains(scheme)) {
            return new Decision(PolicyAction.LAUNCH_PROVIDER_APP, "Direct wallet scheme: " + scheme);
        }

        // 3. Android Intent URIs (intent://...)
        if ("intent".equals(scheme)) {
            String pkg = null;
            // e.g. intent://...#Intent;scheme=gcash;package=com.globe.gcash.android;end
            try {
                int pkgIndex = uriString.indexOf("package=");
                if (pkgIndex != -1) {
                    int endSemicolon = uriString.indexOf(';', pkgIndex);
                    if (endSemicolon != -1) {
                        pkg = uriString.substring(pkgIndex + 8, endSemicolon);
                    } else {
                        pkg = uriString.substring(pkgIndex + 8);
                    }
                }
            } catch (Exception ignored) {
            }

            if (pkg != null && ALLOWED_INTENT_PACKAGES.contains(pkg)) {
                return new Decision(PolicyAction.LAUNCH_PROVIDER_APP, "Allowed wallet intent package: " + pkg, pkg);
            } else if (pkg == null && (uriString.contains("scheme=gcash")
                    || uriString.contains("scheme=paymaya")
                    || uriString.contains("scheme=maya"))) {
                return new Decision(PolicyAction.LAUNCH_PROVIDER_APP, "Wallet intent without explicit package");
            }
            return new Decision(PolicyAction.BLOCK, "Disallowed intent package or scheme: " + pkg);
        }

        // 4. Safe HTTPS hosts: HitPay drop-in, checkout, sandbox, and web dropin static host
        if ("https".equals(scheme)) {
            String host = uri.getHost();
            if (host != null) {
                host = host.toLowerCase(Locale.ROOT);
                if (isAllowedHost(host)) {
                    return new Decision(PolicyAction.LOAD, "Allowed checkout domain: " + host);
                }

                // 3-D Secure / ACS Bank verification redirects during an active payment flow
                // Cards redirect to issuing banks (e.g. visa.com, mastercard.com, bdo.com.ph, etc.)
                return new Decision(PolicyAction.LOAD, "Bank 3DS verification domain: " + host);
            }
        }

        // 5. Block all other schemes (http, file, content, javascript, data, etc.)
        return new Decision(PolicyAction.BLOCK, "Unsupported or insecure scheme: " + scheme);
    }

    /**
     * Lenient URL parsing fallback.
     *
     * java.net.URI.create(String) throws unchecked IllegalArgumentException on
     * any RFC-3986-illegal character — unescaped spaces, braces, pipes, or bad
     * %-escapes. Payment gateways and bank 3-D Secure hand-offs frequently emit
     * such URLs in query parameters (session tokens, state objects). When that
     * exception escaped evaluate() the payment activity died with an unhandled
     * exception at the exact moment the customer pressed Pay.
     *
     * Strategy: try the strict parser first; on failure, percent-encode the
     * offending characters and retry. Returns null when the URL is beyond
     * repair.
     */
    private static URI parseLeniently(String raw) {
        try {
            return URI.create(raw);
        } catch (Exception ignored) {
            // Fall through to the sanitized retry
        }
        try {
            // Percent-encode characters that are illegal in a URI but appear in
            // real-world gateway URLs. '%' itself must not survive a bad escape
            // (e.g. '%zz'), so it is always escaped in the retry.
            StringBuilder encoded = new StringBuilder(raw.length() + 16);
            for (int i = 0; i < raw.length(); i++) {
                char c = raw.charAt(i);
                if (c == ' ' || c == '"' || c == '<' || c == '>' || c == '\\'
                        || c == '^' || c == '`' || c == '{' || c == '|' || c == '}' || c == '%') {
                    encoded.append(String.format("%%%02X", (int) c));
                } else {
                    encoded.append(c);
                }
            }
            return URI.create(encoded.toString());
        } catch (Exception ignored) {
            return null;
        }
    }

    private static boolean isAllowedHost(String host) {
        if (ALLOWED_HOSTS.contains(host)) {
            return true;
        }
        for (String allowed : ALLOWED_HOSTS) {
            if (host.endsWith("." + allowed)) {
                return true;
            }
        }
        return false;
    }
}
