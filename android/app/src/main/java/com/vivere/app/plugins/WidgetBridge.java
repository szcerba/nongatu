package com.vivere.app.plugins;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.vivere.app.widgets.NongatuWidget;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridge extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("nongatu_widget", Context.MODE_PRIVATE);
        prefs.edit().putString("widget_data", data).apply();

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, NongatuWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = NongatuWidget.buildWidgetView(context, data);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }

        call.resolve();
    }

    @PluginMethod
    public void getWidgetData(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("nongatu_widget", Context.MODE_PRIVATE);
        String data = prefs.getString("widget_data", null);
        JSObject ret = new JSObject();
        ret.put("data", data != null ? data : "");
        call.resolve(ret);
    }
}
