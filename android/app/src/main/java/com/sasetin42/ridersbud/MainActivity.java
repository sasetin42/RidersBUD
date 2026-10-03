package com.sasetin42.ridersbud;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HitPayInAppPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

