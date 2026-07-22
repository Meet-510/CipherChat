import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { AtSign, Check, Eye, EyeOff, Loader2, Lock, Mail, User, X } from "lucide-react";
import { Link } from "react-router-dom";

import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";

const USERNAME_REGEX = /^[a-z0-9][a-z0-9._]{2,19}$/;

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });
  // idle | checking | available | taken | invalid
  const [usernameStatus, setUsernameStatus] = useState("idle");

  const { signup, isSigningUp } = useAuthStore();

  // live availability check, debounced (public endpoint — no auth needed)
  useEffect(() => {
    const value = formData.username.trim().toLowerCase();
    if (!value) {
      setUsernameStatus("idle");
      return;
    }
    if (!USERNAME_REGEX.test(value)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(`/auth/username-available/${value}`);
        setUsernameStatus(res.data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.username]);

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!USERNAME_REGEX.test(formData.username.trim().toLowerCase()))
      return toast.error(
        "Username must be 3-20 characters (letters, numbers, dots, underscores)"
      );
    if (usernameStatus === "taken") return toast.error("Username is already taken");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm() !== true) return;

    signup({
      fullName: formData.fullName.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim(),
      password: formData.password,
    });
  };

  const usernameHint = {
    idle: null,
    checking: (
      <span className="text-base-content/50 flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" /> Checking...
      </span>
    ),
    available: (
      <span className="text-success flex items-center gap-1">
        <Check className="size-3" /> Available
      </span>
    ),
    taken: (
      <span className="text-error flex items-center gap-1">
        <X className="size-3" /> Already taken
      </span>
    ),
    invalid: <span className="text-error">3-20 chars: letters, numbers, dots, underscores</span>,
  }[usernameStatus];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* left side */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* LOGO */}
          <div className="text-center mb-8">
            <h1 className="font-logo text-5xl">CipherChat</h1>
            <p className="text-base-content/60 mt-3">Create your account — it only takes a minute</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Full Name</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-10"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Username</span>
                <span className="label-text-alt">{usernameHint}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="size-5 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-10"
                  placeholder="your_username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value.toLowerCase() })
                  }
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <span className="text-xs text-base-content/40 mt-1">
                This is permanent-ish — pick a good one. People find you by @username.
              </span>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-base-content/40" />
                  ) : (
                    <Eye className="size-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSigningUp || usernameStatus === "taken" || usernameStatus === "checking"}
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* right side */}
      <AuthImagePattern
        title="Join our community"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />
    </div>
  );
};
export default SignUpPage;
