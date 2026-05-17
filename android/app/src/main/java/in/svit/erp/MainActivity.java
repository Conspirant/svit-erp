package in.svit.erp;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = this.bridge.getWebView();
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void setSecureScreen(final boolean isSecure) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (isSecure) {
                            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                        } else {
                            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                        }
                    }
                });
            }
        }, "Android");
    }
}
