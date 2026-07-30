package com.vivere.app.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.vivere.app.R;

import org.json.JSONObject;

public class NongatuWidget extends AppWidgetProvider {

    private static String formatNumber(double value) {
        if (value == (long) value) {
            return String.format("%,d", (long) value);
        }
        return String.format("%,.0f", value);
    }

    public static RemoteViews buildWidgetView(Context context, String jsonData) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.nongatu_widget);

        try {
            JSONObject data = new JSONObject(jsonData);
            String monthName = data.optString("monthName", "");
            double totalSpent = data.optDouble("totalSpent", 0);
            double budgetLimit = data.optDouble("budgetLimit", 0);
            int unreadAlerts = data.optInt("unreadAlerts", 0);

            if (!monthName.isEmpty()) {
                views.setTextViewText(R.id.widget_month, monthName);
            }
            views.setTextViewText(R.id.widget_total, "\u20B2 " + formatNumber(totalSpent));

            if (budgetLimit > 0) {
                int percentage = (int) Math.min(100, (totalSpent / budgetLimit) * 100);
                views.setTextViewText(R.id.widget_budget, percentage + "% del presupuesto (\u20B2 " + formatNumber(budgetLimit) + ")");
                views.setProgressBar(R.id.widget_progress, 100, percentage, false);
            } else {
                views.setTextViewText(R.id.widget_budget, "Sin presupuesto definido");
                views.setProgressBar(R.id.widget_progress, 100, 0, false);
            }

            if (unreadAlerts > 0) {
                views.setTextViewText(R.id.widget_alerts, unreadAlerts + " alerta(s) activa(s)");
            } else {
                views.setTextViewText(R.id.widget_alerts, "");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_month, "\u00D1ongatu");
            views.setTextViewText(R.id.widget_total, "Abre la app");
            views.setTextViewText(R.id.widget_budget, "para ver tu resumen");
            views.setTextViewText(R.id.widget_alerts, "");
        }

        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (intent != null) {
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        }

        return views;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences("nongatu_widget", Context.MODE_PRIVATE);
        String data = prefs.getString("widget_data", null);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views;
            if (data != null) {
                views = buildWidgetView(context, data);
            } else {
                views = buildWidgetView(context, "{}");
            }
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
