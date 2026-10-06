import Foundation
import Capacitor
import WebKit

@objc(HitPayInAppPlugin)
public class HitPayInAppPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HitPayInAppPlugin"
    public let jsName = "HitPayInApp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openPayment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "closePayment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isPaymentOpen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openProviderApp", returnType: CAPPluginReturnPromise)
    ]

    private var paymentVC: HitPayPaymentViewController?

    @objc func openPayment(_ call: CAPPluginCall) {
        guard let checkoutUrl = call.getString("checkoutUrl") else {
            call.reject("Must provide checkoutUrl")
            return
        }

        let amount = call.getString("amount") ?? ""
        let reference = call.getString("reference") ?? ""
        let sessionId = call.getString("sessionId") ?? ""

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let vc = HitPayPaymentViewController(
                checkoutUrl: checkoutUrl,
                amount: amount,
                reference: reference,
                sessionId: sessionId
            )

            vc.onRedirect = { [weak self] url in
                self?.notifyListeners("paymentRedirect", data: ["url": url])
                self?.closePaymentVC()
            }

            vc.onClose = { [weak self] reason in
                self?.notifyListeners("paymentClosed", data: ["reason": reason])
                self?.closePaymentVC()
            }

            vc.onError = { [weak self] error in
                self?.notifyListeners("paymentError", data: ["error": error])
                self?.closePaymentVC()
            }

            vc.onProviderOpened = { [weak self] provider in
                self?.notifyListeners("paymentProviderOpened", data: ["provider": provider])
            }

            vc.onProviderReturned = { [weak self] provider in
                self?.notifyListeners("paymentProviderReturned", data: ["provider": provider])
            }

            self.paymentVC = vc
            vc.modalPresentationStyle = .fullScreen
            self.bridge?.viewController?.present(vc, animated: true) {
                self.notifyListeners("paymentOpened", data: ["sessionId": sessionId])
                call.resolve(["success": true])
            }
        }
    }

    @objc func closePayment(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.closePaymentVC()
            call.resolve(["success": true])
        }
    }

    @objc func isPaymentOpen(_ call: CAPPluginCall) {
        call.resolve(["isOpen": paymentVC != nil])
    }

    @objc func openProviderApp(_ call: CAPPluginCall) {
        guard let appUrlString = call.getString("appUrl"), let url = URL(string: appUrlString) else {
            call.reject("Invalid appUrl")
            return
        }

        DispatchQueue.main.async {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:]) { success in
                    if success {
                        call.resolve(["success": true])
                    } else {
                        call.reject("Failed to open URL")
                    }
                }
            } else {
                call.reject("Application cannot handle scheme")
            }
        }
    }

    private func closePaymentVC() {
        if let vc = paymentVC {
            vc.dismiss(animated: true, completion: nil)
            paymentVC = nil
        }
    }
}
