import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../auth/Auth.css";

const getRecoveryDefaults = () => {
  if (typeof window === "undefined") {
    return {
      isRecovery: false,
      message: "This password reset link is invalid or has expired.",
      verifying: false,
    };
  }
  const hash = window.location.hash ?? "";
  const recovery = hash.includes("type=recovery");
  return {
    isRecovery: recovery,
    message: recovery ? "Validating reset link..." : "This password reset link is invalid or has expired.",
    verifying: recovery,
  };
};

function ResetPassword() {
  const defaults = getRecoveryDefaults();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState(defaults.message);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(defaults.verifying);
  const [isRecovery, setIsRecovery] = useState(defaults.isRecovery);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined" || !isRecovery) {
      return undefined;
    }

    let isActive = true;

    const exchangeSession = async () => {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (!isActive) {
        return;
      }
      if (exchangeError) {
        setStatusMessage(exchangeError.message || "Reset link could not be verified.");
        setIsRecovery(false);
        setVerifying(false);
        return;
      }
      setStatusMessage("Reset link verified. Choose a new password.");
      setVerifying(false);
      try {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {
        // Ignore history manipulation issues
      }
    };

    exchangeSession();

    return () => {
      isActive = false;
    };
  }, [isRecovery]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!isRecovery) {
      setError("This reset link is not valid anymore.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message || "Unable to update password right now.");
      return;
    }

    setStatusMessage("Password updated successfully. Redirecting to your workspace...");
    setPassword("");
    setConfirmPassword("");

    setTimeout(() => {
      navigate("/", { replace: true });
    }, 1200);
  };

  const renderBody = () => {
    if (!isRecovery && !verifying) {
      return (
        <div className="auth-note" role="alert" aria-live="assertive">
          {statusMessage || "Reset link is invalid."}
        </div>
      );
    }

    return (
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          className="auth-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={verifying}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          className="auth-input"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={verifying}
          required
        />
        {error && (
          <p className="auth-error" role="alert" aria-live="assertive">{error}</p>
        )}
        <button type="submit" className="auth-button" disabled={verifying || submitting}>
          {submitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    );
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card" role="dialog" aria-modal="true" aria-label="Reset Password">
        <h2 className="auth-title">Reset Password</h2>
        {statusMessage && (
          <p className="auth-note" role="status" aria-live="polite">{statusMessage}</p>
        )}
        {renderBody()}
        <button type="button" className="auth-link" onClick={() => navigate("/", { replace: true })}>
          Return to TaskFlow
        </button>
      </div>
    </div>
  );
}

export default ResetPassword;
