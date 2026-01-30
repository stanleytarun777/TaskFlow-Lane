/**
 * Auth.jsx - Authentication Component
 * 
 * This component handles two user flows:
 * 1. Login - Authenticate existing users with email/password
 * 2. Signup - Create new user accounts with profile data
 * 
 * Features:
 * - Email validation with regex pattern
 * - Password strength requirements
 * - Error handling and user feedback
 * - Toggle between login and signup modes
 * - Supabase integration for all auth operations
 */

import { useState } from "react";
import { supabase } from "../supabase";
import "./Auth.css";

/**
 * EMAIL_PATTERN - Regular expression for email validation
 * 
 * Validates email format:
 * - username (alphanumeric, dots, underscores, hyphens, plus)
 * - @ symbol
 * - domain (alphanumeric, hyphens)
 * - TLD (.com, .org, etc.)
 */
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/**
 * normalizeEmail - Trims whitespace from email input
 * 
 * @param {string} value - Raw email input
 * @returns {string} Trimmed email
 */
function normalizeEmail(value = "") {
  return value.trim();
}

/**
 * validateEmailStructure - Comprehensive email validation
 * 
 * Checks:
 * 1. Email is not empty
 * 2. Matches email regex pattern
 * 3. Domain has proper format (dots with characters)
 * 
 * @param {string} value - Email to validate
 * @returns {Object} { valid: boolean, message: string, normalized: string }
 */
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

/**
 * Auth Component - Main authentication form
 * 
 * Renders either login or signup form based on isLogin state.
 * Shows appropriate form fields and validates inputs before submission.
 */
function Auth() {
  // ===== STATE MANAGEMENT =====
  
  // Profile fields for signup
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Common auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // UI state - which form is showing
  const [isLogin, setIsLogin] = useState(true);
  
  // Loading state for login/signup operations
  const [loading, setLoading] = useState(false);
  
  // Error messages for different validation states
  const [emailError, setEmailError] = useState("");        // Email validation error
  const [authError, setAuthError] = useState("");          // Login/signup error

  /**
   * handleToggleMode - Switch between login and signup forms
   * 
   * Clears all error messages when switching modes.
   */
  const handleToggleMode = () => {
    setEmailError("");
    setAuthError("");
    setIsLogin((prev) => !prev);
  };

  /**
   * handleSubmit - Handle login or signup form submission
   * 
   * Flow:
   * 1. Validate email format
   * 2. Call appropriate Supabase auth function
   * 3. Handle errors and display user feedback
   * 4. On success, Supabase auth state listener triggers app redirect
   * 
   * @param {Event} e - Form submit event
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setAuthError("");
    setEmailError("");

    // SIGNUP FLOW - Validate all required fields
    if (!isLogin) {
      if (!firstName.trim()) {
        setAuthError("First name is required.");
        return;
      }
      if (!lastName.trim()) {
        setAuthError("Last name is required.");
        return;
      }
      if (password.length < 6) {
        setAuthError("Password must be at least 6 characters long.");
        return;
      }
    }

    // Validate email format before submission
    const emailValidation = validateEmailStructure(email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.message);
      return;
    }

    const normalizedEmail = emailValidation.normalized;

    setLoading(true);

    if (isLogin) {
      // LOGIN FLOW - Authenticate existing user
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        // Parse error message to determine error type
        const normalized = (error.message ?? "").toLowerCase();
        const invalidPassword = normalized.includes("invalid login") || normalized.includes("invalid email or password") || normalized.includes("invalid password") || normalized.includes("wrong password");
        const emailIssue = !invalidPassword && (normalized.includes("email") || normalized.includes("user") || normalized.includes("account"));
        
        // Display error in appropriate field
        if (emailIssue) {
          setEmailError(error.message || "Check your email address.");
        } else {
          setAuthError(invalidPassword ? "Incorrect password." : (error.message || "Unable to sign in."));
        }
        setLoading(false);
        return;
      }
    } else {
      // SIGNUP FLOW - Create new user account
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
        // Check if email already exists in system
        const emailExists = normalized.includes("already registered") || normalized.includes("user_already_exists") || normalized.includes("email already");
        if (emailExists) {
          setEmailError("This email is already in use. Please log in instead or use a different email.");
        } else if (normalized.includes("email")) {
          setEmailError(error.message || "Check your email address.");
        } else {
          setAuthError(error.message || "Unable to create account.");
        }
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user) {
        // Create user profile in profiles table
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: user.email,
          });

        if (profileError) {
          setAuthError(profileError.message || "Account created but profile setup failed. Please contact support.");
          setLoading(false);
          return;
        }

        // Clear form and show success
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setAuthError("");
        setEmailError("");
        
        // Show success message with next steps
        setAuthError("✓ Account created successfully! You will be logged in shortly...");
        setLoading(false);
        
        // The onAuthStateChange listener in App.jsx will handle the redirect
        return;
      }

      setAuthError("Account creation failed. Please try again.");
    }

    setLoading(false);
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
          {authError && (
            <div className={`auth-error${authError.includes("✓") ? " auth-success" : ""}`} role="alert" aria-live="assertive">{authError}</div>
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
