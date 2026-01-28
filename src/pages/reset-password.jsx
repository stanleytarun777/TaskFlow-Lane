import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "./reset-password.css";

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
      return {
        accessToken,
        refreshToken,
      };
    }
    return null;
  };

  return parseSource(window.location.hash) ?? parseSource(window.location.search) ?? null;
};

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isBrowser = typeof window !== "undefined";
  const [recoveryTokens] = useState(() => (isBrowser ? parseRecoveryTokens() : null));
  const hasRecoveryToken = Boolean(recoveryTokens);
  const [statusMessage, setStatusMessage] = useState(() => (
    isBrowser
      ? (hasRecoveryToken ? "Validating reset link..." : "This password reset link is invalid or has expired.")
      : "Open this reset link in a browser window."
  ));
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(() => isBrowser && hasRecoveryToken);
  const [canReset, setCanReset] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const meetsLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasLetterMix = hasUpper && hasLower;
  const hasNumberOrSymbol = /[0-9]/.test(password) || /[^A-Za-z0-9\s]/.test(password);
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  const passwordRules = useMemo(() => ([
    { id: "length", label: "At least 8 characters", satisfied: meetsLength },
    { id: "letters", label: "Upper and lower case letters", satisfied: hasLetterMix },
    { id: "number", label: "One number or symbol", satisfied: hasNumberOrSymbol },
    { id: "match", label: "Matches confirmation", satisfied: passwordsMatch },
  ]), [meetsLength, hasLetterMix, hasNumberOrSymbol, passwordsMatch]);

  const strengthScore = password ? [meetsLength, hasLetterMix, hasNumberOrSymbol].filter(Boolean).length : 0;
  const strengthLabels = ["Weak", "Fair", "Ready", "Strong"];
  const strengthLabel = password ? strengthLabels[strengthScore] : "Start typing";

  useEffect(() => {
    if (!hasRecoveryToken && isBrowser) {
      navigate("/", { replace: true });
    }
  }, [hasRecoveryToken, isBrowser, navigate]);

  useEffect(() => {
    if (!isBrowser || !hasRecoveryToken) {
      return undefined;
    }

    let isActive = true;

    const resolveSession = async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    };

    const hydrateSession = async () => {
      setVerifying(true);
      let session = await resolveSession();

      if (!session && recoveryTokens) {
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
        session = await resolveSession();
        if (!isActive) {
          return;
        }
        try {
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {
          // ignore history failures
        }
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
    };

    hydrateSession();

    return () => {
      isActive = false;
    };
  }, [isBrowser, hasRecoveryToken, recoveryTokens]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!canReset) {
      setError("This reset link is not valid anymore.");
      return;
    }

    if (!meetsLength) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!hasLetterMix) {
      setError("Use both upper and lower case letters.");
      return;
    }

    if (!hasNumberOrSymbol) {
      setError("Include at least one number or symbol.");
      return;
    }

    if (!passwordsMatch) {
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

  const handleBackToApp = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="reset-page">
      <div className="reset-card" role="dialog" aria-modal="true" aria-label="Reset Password">
        <h1>Choose a new password</h1>
        {statusMessage && (
          <p className="reset-message" role="status" aria-live="polite">{statusMessage}</p>
        )}
        {verifying && (
          <div className="reset-spinner" aria-hidden="true" />
        )}
        {!verifying && !canReset && (
          <div className="reset-alert" role="alert" aria-live="assertive">
            {statusMessage || "This password reset link is invalid or has expired."}
          </div>
        )}
        {canReset && !verifying && (
          <form className="reset-form" onSubmit={handleSubmit}>
            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              className="reset-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
              disabled={submitting}
            />

            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              className="reset-input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              autoComplete="new-password"
              disabled={submitting}
            />

            <div className="reset-strength-text" aria-live="polite">
              {password ? `${strengthLabel} password` : "Start typing to check strength"}
            </div>

            <ul className="reset-checklist" aria-live="polite">
              {passwordRules.map((rule) => (
                <li key={rule.id} className={rule.satisfied ? "is-complete" : undefined}>
                  {rule.label}
                </li>
              ))}
            </ul>

            {error && (
              <p className="reset-error" role="alert" aria-live="assertive">{error}</p>
            )}

            <button type="submit" className="reset-button" disabled={submitting}>
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
        <div className="reset-footer">
          <p>Need an account? <button type="button" onClick={handleBackToApp}>Sign Up</button></p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
