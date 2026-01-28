import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../auth/Auth.css";

const parseRecoveryTokens = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const parseSource = (input) => {
    if (!input) {
      return null;
    }
    const cleaned = input.replace(/^[#?]/, "");
    const params = new URLSearchParams(cleaned);
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (type === "recovery" && accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  };

  return parseSource(window.location.hash) ?? parseSource(window.location.search) ?? null;
};

function ResetPassword() {
  const isBrowser = typeof window !== "undefined";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryTokens] = useState(() => (isBrowser ? parseRecoveryTokens() : null));
  const hasRecoveryTokens = Boolean(recoveryTokens);
  const [statusMessage, setStatusMessage] = useState(() => (
    hasRecoveryTokens
      ? "Validating reset link..."
      : "This password reset link is invalid or has expired."
  ));
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(hasRecoveryTokens);
  const [canReset, setCanReset] = useState(hasRecoveryTokens);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isBrowser || !recoveryTokens) {
      return undefined;
    }

    let isActive = true;

    const hydrateSession = async () => {
      setVerifying(true);
      const { data } = await supabase.auth.getSession();
      let session = data.session ?? null;

      if (!session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: recoveryTokens.accessToken,
          refresh_token: recoveryTokens.refreshToken,
        });
        if (!isActive) {
          return;
        }
        if (sessionError) {
          setStatusMessage(sessionError.message || "This password reset link is invalid or has expired.");
          setCanReset(false);
          setVerifying(false);
          return;
        }
        const refreshed = await supabase.auth.getSession();
        session = refreshed.data.session ?? null;
      }

      if (!isActive) {
        return;
      }

      if (session) {
        setStatusMessage("Reset link verified. Choose a new password.");
        setCanReset(true);
      } else {
        setStatusMessage("This password reset link is invalid or has expired.");
        setCanReset(false);
      }
      setVerifying(false);

      try {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {
        // ignore
      }
    };

    hydrateSession();

    return () => {
      isActive = false;
    };
  }, [recoveryTokens, isBrowser]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!canReset) {
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

    setStatusMessage("Password updated successfully. Redirecting to login...");
    setPassword("");
    setConfirmPassword("");
    await supabase.auth.signOut();

    setTimeout(() => {
      navigate("/", { replace: true });
    }, 1500);
  };

  const renderBody = () => {
    if (!canReset && !verifying) {
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
          disabled={verifying || !canReset}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          className="auth-input"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={verifying || !canReset}
          required
        />
        {error && (
          <p className="auth-error" role="alert" aria-live="assertive">{error}</p>
        )}
        <button type="submit" className="auth-button" disabled={verifying || submitting || !canReset}>
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
