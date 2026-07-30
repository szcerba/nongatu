package com.vivere.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.vivere.app.plugins.WidgetBridge;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(WidgetBridge.class);
    }
}
