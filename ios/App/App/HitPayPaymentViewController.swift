import UIKit
import WebKit

public class HitPayPaymentViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {

    private let checkoutUrl: String
    private let amount: String
    private let reference: String
    private let sessionId: String

    var onRedirect: ((String) -> Void)?
    var onClose: ((String) -> Void)?
    var onError: ((String) -> Void)?
    var onProviderOpened: ((String) -> Void)?
    var onProviderReturned: ((String) -> Void)?

    private var webView: WKWebView!
    private var progressView: UIProgressView!
    private var waitingForProviderReturn: Bool = false
    private var providerName: String = ""

    private let allowedHosts: Set<String> = [
        "hit-pay.com",
        "sandbox.hit-pay.com",
        "ridersbud-10806.web.app"
    ]

    private let walletSchemes: Set<String> = [
        "gcash",
        "paymaya",
        "grabpay"
    ]

    init(checkoutUrl: String, amount: String, reference: String, sessionId: String) {
        self.checkoutUrl = checkoutUrl
        self.amount = amount
        self.reference = reference
        self.sessionId = sessionId
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    public override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.07, green: 0.07, blue: 0.07, alpha: 1.0)
        setupViews()
        loadCheckout()
    }

    private func setupViews() {
        // Top Bar
        let topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false
        topBar.backgroundColor = UIColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1.0)
        view.addSubview(topBar)

        let closeButton = UIButton(type: .system)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.setTitle("✕", for: .normal)
        closeButton.setTitleColor(.white, for: .normal)
        closeButton.titleLabel?.font = UIFont.systemFont(ofSize: 20, weight: .bold)
        closeButton.addTarget(self, action: #selector(handleCloseTap), for: .touchUpInside)
        topBar.addSubview(closeButton)

        let titleLabel = UILabel()
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = amount.isEmpty ? "Secure Payment" : "Pay \(amount)"
        titleLabel.textColor = .white
        titleLabel.font = UIFont.systemFont(ofSize: 16, weight: .bold)
        topBar.addSubview(titleLabel)

        let subtitleLabel = UILabel()
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = reference.isEmpty ? "HitPay Secure Checkout" : "Ref: \(reference)"
        subtitleLabel.textColor = UIColor(white: 0.7, alpha: 1.0)
        subtitleLabel.font = UIFont.systemFont(ofSize: 12)
        topBar.addSubview(subtitleLabel)

        progressView = UIProgressView(progressViewStyle: .bar)
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.progressTintColor = UIColor(red: 0.996, green: 0.47, blue: 0.012, alpha: 1.0) // #FE7803
        progressView.trackTintColor = .clear
        view.addSubview(progressView)

        // Hardened WKWebView configuration
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = false
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
        view.addSubview(webView)

        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topBar.heightAnchor.constraint(equalToConstant: 56),

            closeButton.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 16),
            closeButton.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            closeButton.widthAnchor.constraint(equalToConstant: 32),

            titleLabel.leadingAnchor.constraint(equalTo: closeButton.trailingAnchor, constant: 12),
            titleLabel.topAnchor.constraint(equalTo: topBar.topAnchor, constant: 8),

            subtitleLabel.leadingAnchor.constraint(equalTo: closeButton.trailingAnchor, constant: 12),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),

            progressView.topAnchor.constraint(equalTo: topBar.bottomAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 3),

            webView.topAnchor.constraint(equalTo: progressView.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func loadCheckout() {
        guard let url = URL(string: checkoutUrl) else {
            onError?("Invalid checkout URL")
            return
        }
        let request = URLRequest(url: url)
        webView.load(request)
    }

    public override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "estimatedProgress" {
            progressView.progress = Float(webView.estimatedProgress)
            progressView.isHidden = webView.estimatedProgress >= 1.0
        }
    }

    @objc private func handleCloseTap() {
        let alert = UIAlertController(
            title: "Leave Payment?",
            message: "Your payment has not yet been confirmed. If you leave now, the transaction may be cancelled or delayed.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Stay", style: .cancel, handler: nil))
        alert.addAction(UIAlertAction(title: "Leave", style: .destructive, handler: { [weak self] _ in
            self?.onClose?("User voluntarily left payment")
        }))
        present(alert, animated: true, completion: nil)
    }

    public func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        let urlString = url.absoluteString
        let scheme = (url.scheme ?? "").lowercased()
        let host = (url.host ?? "").lowercased()

        // 1. Intercept return URLs
        if (scheme == "ridersbud" || scheme == "com.sasetin42.ridersbud") && host == "payment" {
            decisionHandler(.cancel)
            onRedirect?(urlString)
            return
        }
        if scheme == "https" && host == "ridersbud-10806.web.app" && url.path.hasPrefix("/payment/return") {
            decisionHandler(.cancel)
            onRedirect?(urlString)
            return
        }

        // 2. Known Wallet Schemes
        if walletSchemes.contains(scheme) {
            decisionHandler(.cancel)
            if UIApplication.shared.canOpenURL(url) {
                waitingForProviderReturn = true
                providerName = scheme
                onProviderOpened?(scheme)
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            } else {
                onError?("Provider app for scheme '\(scheme)' is not installed")
            }
            return
        }

        // 3. Allowed checkout hosts + 3DS ACS bank redirection
        if scheme == "https" {
            if isAllowedHost(host) || isKnownBank3DSHost(host) {
                decisionHandler(.allow)
                return
            }
            // Allow general https top-level navigation for 3D Secure bank redirects
            decisionHandler(.allow)
            return
        }

        // 4. Block unknown or insecure schemes
        decisionHandler(.cancel)
        onError?("Blocked navigation to: \(urlString)")
    }

    private func isAllowedHost(_ host: String) -> Bool {
        if allowedHosts.contains(host) { return true }
        for allowed in allowedHosts {
            if host.hasSuffix("." + allowed) { return true }
        }
        return false
    }

    private func isKnownBank3DSHost(_ host: String) -> Bool {
        return host.contains("3dsecure") || host.contains("acs") || host.contains("cardinalcommerce")
    }

    public override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if waitingForProviderReturn {
            waitingForProviderReturn = false
            onProviderReturned?(providerName)
        }
    }

    deinit {
        webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
        webView?.stopLoading()
    }
}
