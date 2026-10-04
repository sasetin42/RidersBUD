package com.sasetin42.ridersbud;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // HitPayInAppPlugin (uncontrolled WebView payment dialog) was removed —
        // payments are presented in a Chrome Custom Tab via @capacitor/browser.
        super.onCreate(savedInstanceState);
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
