# iOS Distribution Certificate & App Store Provisioning Setup

## 1. Generated iOS Certificate Files (`ios-signing/`)

We have generated a new **2048-bit RSA Private Key** and **Certificate Signing Request (CSR)** for `com.sasetin42.ridersbud`:

1. **`ios-signing/ios_distribution_private.key`** — Your RSA 2048-bit Private Key (keep this safe; can be pasted into Codemagic as `CERTIFICATE_PRIVATE_KEY` if you want to reuse the same key across builds).
2. **`ios-signing/CertificateSigningRequest.certSigningRequest`** — Your Apple CSR file to upload to Apple Developer Portal if creating a certificate manually.

---

## 2. Automatic Creation in Codemagic (`codemagic.yaml`)

`codemagic.yaml` has been updated to **automatically create** both the iOS Distribution Certificate and the `IOS_APP_STORE` Provisioning Profile on the fly using:
```bash
app-store-connect fetch-signing-files "com.sasetin42.ridersbud" \
  --type IOS_APP_STORE \
  --create
```
What this does:
- Replaces the passive `ios_signing:` block (which fails when a profile doesn't already exist in your Apple account) with an active `fetch-signing-files --create` step.
- If `CERTIFICATE_PRIVATE_KEY` is not set in Codemagic Environment Variables, the script automatically generates an RSA-2048 key and requests a new `IOS_DISTRIBUTION` certificate + `IOS_APP_STORE` provisioning profile from App Store Connect.

### Critical Prerequisite in Apple Developer Portal:
Make sure the Bundle ID **`com.sasetin42.ridersbud`** is registered under your Apple Developer account:
1. Go to [Apple Developer — Identifiers](https://developer.apple.com/account/resources/identifiers/list).
2. Click **`+`** → **App IDs** → **App**.
3. Set Description: `RidersBUD`
4. Set Bundle ID (Explicit): `com.sasetin42.ridersbud`
5. Click **Continue** → **Register**.

---

## 3. Manual Certificate Creation (Optional)

If you ever want to manually create the certificate in Apple Developer Portal:
1. Go to [Apple Developer — Certificates](https://developer.apple.com/account/resources/certificates/list) and click **`+`**.
2. Choose **Apple Distribution** (or **iOS Distribution (App Store and Ad Hoc)**) and click **Continue**.
3. Upload **`ios-signing/CertificateSigningRequest.certSigningRequest`**.
4. Download the resulting `ios_distribution.cer`.
5. To convert `ios_distribution.cer` + `ios_distribution_private.key` into a `.p12` file on Windows:
   ```powershell
   & "C:\Program Files\Git\usr\bin\openssl.exe" x509 -in ios-signing/ios_distribution.cer -inform DER -out ios-signing/ios_distribution.pem -outform PEM
   & "C:\Program Files\Git\usr\bin\openssl.exe" pkcs12 -export -inkey ios-signing/ios_distribution_private.key -in ios-signing/ios_distribution.pem -out ios-signing/ios_distribution.p12 -passout pass:ridersbud2026
   ```
