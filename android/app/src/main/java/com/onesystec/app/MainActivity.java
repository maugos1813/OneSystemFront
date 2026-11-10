package com.onesystec.app;

import android.os.Build;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

public class MainActivity extends BridgeActivity {

    /**
     * An app installed from Google Play must not update itself by any other route (Play's policy): the website is told so
     * by "PlayStore" in the user agent (capacitor.play.config.json is the normal config plus that), and it then offers no
     * APK download. The same app installed from our website's APK has no installer from Play and is left as it was.
     */
    @Override
    protected void load() {
        if (installedFromPlayStore()) {
            config = CapConfig.loadFromAssets(this, "capacitor.play.config.json");
        }
        super.load();
    }

    private boolean installedFromPlayStore() {
        try {
            String installer;
            if (Build.VERSION.SDK_INT >= 30) {
                installer = getPackageManager().getInstallSourceInfo(getPackageName()).getInstallingPackageName();
            } else {
                installer = getPackageManager().getInstallerPackageName(getPackageName());
            }
            return "com.android.vending".equals(installer);
        } catch (Exception e) {
            return false;
        }
    }
}
