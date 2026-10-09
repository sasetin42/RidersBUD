# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Preserve line numbers so native crash reports stay symbolicated — required to
# diagnose any future payment-time crash from adb logcat / Play Console.
-keepattributes SourceFile,LineNumberTable

# Hide the original source file name in stack traces.
-renamesourcefileattribute SourceFile

# Preserve Payment plugin and activity classes from R8 minification
-keep class com.sasetin42.ridersbud.payment.** { *; }
-keepclassmembers class com.sasetin42.ridersbud.payment.** { *; }

