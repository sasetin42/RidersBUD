package com.sasetin42.ridersbud.payment;

import org.junit.Test;
import static org.junit.Assert.*;

public class PaymentNavigationPolicyTest {

    @Test
    public void testAcceptValidLiveAndSandboxInitialCheckoutUrls() {
        assertTrue(PaymentNavigationPolicy.isValidInitialCheckoutUrl("https://hit-pay.com/checkout/pr_123"));
        assertTrue(PaymentNavigationPolicy.isValidInitialCheckoutUrl("https://checkout.sandbox.hit-pay.com/pay/pr_123"));
    }

    @Test
    public void testRejectUnsafeOrDeceptiveInitialCheckoutUrls() {
        assertFalse(PaymentNavigationPolicy.isValidInitialCheckoutUrl("http://hit-pay.com/checkout"));
        assertFalse(PaymentNavigationPolicy.isValidInitialCheckoutUrl("https://hit-pay.com.evil.example/checkout"));
        assertFalse(PaymentNavigationPolicy.isValidInitialCheckoutUrl("https://user@hit-pay.com/checkout"));
        assertFalse(PaymentNavigationPolicy.isValidInitialCheckoutUrl("javascript:alert(1)"));
        assertFalse(PaymentNavigationPolicy.isValidInitialCheckoutUrl("not a URL"));
    }

    @Test
    public void testInterceptNativeSchemeReturn() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "ridersbud://payment/return?status=completed&reference=RB-12345"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.INTERCEPT_RETURN, decision.action);
    }

    @Test
    public void testBlockNonPaymentRidersBudCallback() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "ridersbud://customer-portal/bookings"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.BLOCK, decision.action);
    }

    @Test
    public void testInterceptHttpsAppLinksReturn() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "https://ridersbud-10806.web.app/payment/return?s=RB-SESSION-123"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.INTERCEPT_RETURN, decision.action);
    }

    @Test
    public void testLoadHitPayCheckout() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "https://hit-pay.com/checkout/request/pr_12345678"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LOAD, decision.action);
    }

    @Test
    public void testLoadHitPayCheckoutSubdomain() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "https://checkout.hit-pay.com/pay/pr_12345678"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LOAD, decision.action);
    }

    @Test
    public void testLoadHitPaySandboxCheckoutSubdomain() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "https://checkout.sandbox.hit-pay.com/pay/pr_12345678"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LOAD, decision.action);
    }

    @Test
    public void testLoadHitPaySandbox() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "https://sandbox.hit-pay.com/pay/pr_98765432"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LOAD, decision.action);
    }

    @Test
    public void testLoadDropInStaticHost() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "https://ridersbud-10806.web.app/pay/dropin.html?prid=pr_123"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LOAD, decision.action);
    }

    @Test
    public void testLaunchGCashDirectScheme() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "gcash://checkout?orderId=12345"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LAUNCH_PROVIDER_APP, decision.action);
    }

    @Test
    public void testLaunchPayMayaDirectScheme() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "paymaya://pay?ref=998877"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LAUNCH_PROVIDER_APP, decision.action);
    }

    @Test
    public void testLaunchMayaDirectScheme() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "maya://pay?ref=998877"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LAUNCH_PROVIDER_APP, decision.action);
    }

    @Test
    public void testLaunchWalletIntentWithoutPackageForMayaScheme() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "intent://pay?data=xyz#Intent;scheme=maya;end"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LAUNCH_PROVIDER_APP, decision.action);
    }

    @Test
    public void testLaunchAllowedWalletIntent() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "intent://pay?data=xyz#Intent;scheme=gcash;package=com.globe.gcash.android;end"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LAUNCH_PROVIDER_APP, decision.action);
        assertEquals("com.globe.gcash.android", decision.providerPackage);
    }

    @Test
    public void testBlockDisallowedIntentPackage() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "intent://evil?data=bad#Intent;package=com.malicious.app;end"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.BLOCK, decision.action);
    }

    @Test
    public void testBlockInsecureHttp() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "http://hit-pay.com/insecure"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.BLOCK, decision.action);
    }

    @Test
    public void testBlockJavascriptScheme() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "javascript:alert(1)"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.BLOCK, decision.action);
    }

    @Test
    public void testLoad3DSBankVerificationDomain() {
        PaymentNavigationPolicy.Decision decision = PaymentNavigationPolicy.evaluate(
                "https://secure5.arcot.com/vpas/bdo/3dsecure.jsp"
        );
        assertEquals(PaymentNavigationPolicy.PolicyAction.LOAD, decision.action);
    }
}
