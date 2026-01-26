import { useState } from "react";
import { supabase } from "../supabase";
import "./Auth.css";

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function normalizeEmail(value = "") {
  return value.trim();
}

function validateEmailStructure(value = "") {
  const normalized = normalizeEmail(value);
  if (!normalized) {
    return { valid: false, message: "Email is required.", normalized };
  }
  if (!EMAIL_PATTERN.test(normalized)) {
    return { valid: false, message: "Use a valid email like name@example.com.", normalized };
  }
  const [_, domain = ""] = normalized.split("@");
  if (domain.split(".").some((segment) => !segment)) {
    return { valid: false, message: "Domain must include dots with characters on both sides.", normalized };
  }
  return { valid: true, message: "", normalized };
}

function Auth() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetting, setResetting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [authError, setAuthError] = useState("");

  const handleToggleMode = () => {
    setEmailError("");
    setAuthError("");
    setIsLogin((prev) => !prev);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setAuthError("");
    setEmailError("");

    const emailValidation = validateEmailStructure(email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.message);
      return;
    }

    const normalizedEmail = emailValidation.normalized;

    setLoading(true);

    if (isLogin) {
      // 🔐 LOGIN
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const normalized = (error.message ?? "").toLowerCase();
        const invalidPassword = normalized.includes("invalid login") || normalized.includes("invalid email or password") || normalized.includes("invalid password") || normalized.includes("wrong password");
        const emailIssue = !invalidPassword && (normalized.includes("email") || normalized.includes("user") || normalized.includes("account"));
        if (emailIssue) {
          setEmailError(error.message || "Check your email address.");
        } else {
          setAuthError(invalidPassword ? "Incorrect password." : (error.message || "Unable to sign in."));
        }
        setLoading(false);
        return;
      }
    } else {
      // 🆕 SIGN UP
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
          },
        },
      });

      if (error) {
        const normalized = (error.message ?? "").toLowerCase();
        if (normalized.includes("email")) {
          setEmailError(error.message || "Check your email address.");
        } else {
          setAuthError(error.message || "Unable to create account.");
        }
        setLoading(false);
        return;
      }

      // 📌 INSERT PROFILE DATA
      const user = data.user;
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: user.email,
          });

        if (profileError) {
          alert(profileError.message);
        }
      }

      alert("Account created successfully!");
    }

    setLoading(false);
  }

  async function handleResetPassword() {
    setEmailError("");
    if (!email) {
      alert("Enter your email, then click Forgot Password.");
      return;
    }
    const resetValidation = validateEmailStructure(email);
    if (!resetValidation.valid) {
      setEmailError(resetValidation.message);
      return;
    }
    setResetting(true);
    setResetMessage("");
    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : "/reset-password";
    const { error } = await supabase.auth.resetPasswordForEmail(resetValidation.normalized, {
      redirectTo,
    });
    if (error) {
      setResetMessage(error.message);
    } else {
      setResetMessage("Check your email for a password reset link.");
    }
    setResetting(false);
  }

  const handleEmailChange = (nextValue) => {
    setEmail(nextValue);
    if (!nextValue.trim()) {
      setEmailError("");
      return;
    }
    if (isLogin) {
      const result = validateEmailStructure(nextValue);
      setEmailError(result.valid ? "" : result.message);
    } else if (emailError) {
      setEmailError("");
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card" role="dialog" aria-modal="true" aria-label={isLogin ? "Login" : "Create Account"}>
        <h2 className="auth-title">{isLogin ? "Login" : "Create Account"}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
        {/* 👤 Show only on Sign Up */}
        {!isLogin && (
          <>
            <input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            className="auth-input"
            />

            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            className="auth-input"
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          required
          className="auth-input"
          aria-invalid={Boolean(emailError)}
          onBlur={(e) => {
            if (!isLogin) {
              return;
            }
            const result = validateEmailStructure(e.target.value);
            setEmailError(result.valid ? "" : result.message);
          }}
        />
        {emailError && (
          <p className="auth-error" role="alert" aria-live="assertive">{emailError}</p>
        )}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (authError) {
              setAuthError("");
            }
          }}
          required
          className="auth-input"
        />

        <button type="submit" disabled={loading} className="auth-button">
          {loading
            ? isLogin
              ? "Logging in..."
              : "Creating..."
            : isLogin
            ? "Login"
            : "Sign Up"}
        </button>
        {authError && isLogin && (
          <div className="auth-error" role="alert" aria-live="assertive">{authError}</div>
        )}
        {isLogin && (
          <>
            {resetMessage && (
              <div className="auth-note" role="status" aria-live="polite">{resetMessage}</div>
            )}
            <button
              type="button"
              onClick={handleResetPassword}
              className="auth-link"
              disabled={resetting}
              aria-label="Forgot Password"
            >
              {resetting ? "Sending reset email..." : "Forgot Password?"}
            </button>
          </>
        )}
        </form>

        <button
          type="button"
          onClick={handleToggleMode}
          className="auth-toggle"
        >
          {isLogin
            ? "Need an account? Sign Up"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

export default Auth;
