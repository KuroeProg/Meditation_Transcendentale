import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.js";

export function TwoFactorVerify({
  userId,
  email,
  preAuthToken,
  onVerificationSuccess,
  onCancel,
}) {
  const { verify2FA, error, setError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [canResend, setCanResend] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((v) => v - 1), 1000);
      return () => clearTimeout(timer);
    }
    setCanResend(true);
    return undefined;
  }, [resendCountdown]);

  const handleVerify = async (codeToVerify) => {
    const cleaned = String(codeToVerify ?? "").replace(/\D/g, "").slice(0, 6);
    if (cleaned.length !== 6) return;

    setLoading(true);
    setError(null);

    const result = await verify2FA(userId, cleaned, preAuthToken, rememberDevice);

    setLoading(false);

    if (result?.ok) {
      onVerificationSuccess?.();
      return;
    }

    setCode("");
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    if (value.length === 6) {
      void handleVerify(value);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/resend-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          preAuthToken
            ? { pre_auth_token: preAuthToken, email }
            : { user_id: userId, email },
        ),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || "Failed to resend code");
      } else {
        setCode("");
        setCanResend(false);
        setResendCountdown(60);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div>
      <div className="auth-form verify-form">
        <h2>Verify Your Email</h2>
        <p className="verify-subtitle">Enter the 6-digit code sent to {email}</p>

        <div className="code-input-group">
          <input
            type="text"
            inputMode="numeric"
            maxLength="6"
            placeholder="000000"
            value={code}
            onChange={handleCodeChange}
            disabled={loading}
            className="code-input"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        {preAuthToken && (
          <label className="remember-device-row">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              disabled={loading}
            />
            <span>Se souvenir de cet appareil</span>
          </label>
        )}

        <button
          onClick={() => void handleVerify(code)}
          disabled={loading || code.length !== 6}
          className="btn btn-primary"
          type="button"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <button
          onClick={handleResend}
          disabled={resendLoading || !canResend}
          className="btn btn-secondary"
          type="button"
        >
          {resendCountdown > 0
            ? `Resend in ${resendCountdown}s`
            : resendLoading
              ? "Sending..."
              : "Resend Code"}
        </button>
      </div>

      <button
        onClick={onCancel}
        className="btn-back"
        type="button"
      >
        ← Back
      </button>
    </div>
  );
}
