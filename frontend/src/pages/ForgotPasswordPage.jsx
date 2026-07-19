import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const { forgotPassword, isSendingResetLink } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error("Invalid email format");

    const success = await forgotPassword(email.trim());
    if (success) setLinkSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 sm:p-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-2 group">
            <div
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20
            transition-colors"
            >
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mt-2">Forgot Password</h1>
            <p className="text-base-content/60">
              {linkSent
                ? "Check your inbox for the reset link"
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>
        </div>

        {linkSent ? (
          <div className="text-center space-y-6">
            <p className="text-base-content/70">
              If an account exists for <span className="font-medium">{email}</span>, a password
              reset link is on its way. The link expires in 15 minutes.
            </p>
            <button className="btn btn-outline btn-sm" onClick={() => setLinkSent(false)}>
              Send again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isSendingResetLink}>
              {isSendingResetLink ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="link link-primary inline-flex items-center gap-1">
            <ArrowLeft className="size-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};
export default ForgotPasswordPage;
