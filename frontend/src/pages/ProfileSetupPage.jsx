import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { AtSign, Camera, Check, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

const BIO_MAX_LENGTH = 150;
const USERNAME_REGEX = /^[a-z0-9][a-z0-9._]{2,19}$/;

const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  // idle | checking | available | taken | invalid
  const [usernameStatus, setUsernameStatus] = useState("idle");

  // live availability check, debounced
  useEffect(() => {
    const value = username.trim().toLowerCase();
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
        const res = await axiosInstance.get(`/auth/check-username/${value}`);
        setUsernameStatus(res.data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSelectedImg(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const value = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(value)) {
      return toast.error(
        "Username must be 3-20 characters (letters, numbers, dots, underscores)"
      );
    }
    if (usernameStatus === "taken") return toast.error("Username is already taken");

    const data = { username: value };
    if (bio.trim()) data.bio = bio.trim();
    if (selectedImg) data.profilePic = selectedImg;

    await updateProfile(data);

    // updateProfile stores the fresh user; only continue once the username stuck
    if (useAuthStore.getState().authUser?.username === value) {
      navigate("/");
    }
  };

  const usernameHint = {
    idle: null,
    checking: <span className="text-zinc-400 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Checking...</span>,
    available: <span className="text-green-500 flex items-center gap-1"><Check className="size-3" /> Available</span>,
    taken: <span className="text-error flex items-center gap-1"><X className="size-3" /> Already taken</span>,
    invalid: <span className="text-error">3-20 chars: letters, numbers, dots, underscores</span>,
  }[usernameStatus];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md">
        <div className="bg-base-300 rounded-xl p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Set up your profile</h1>
            <p className="mt-2 text-base-content/60">
              Welcome{authUser?.fullName ? `, ${authUser.fullName}` : ""}! Pick a username so
              people can find you.
            </p>
          </div>

          {/* avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-24 rounded-full object-cover border-4"
              />
              <label
                htmlFor="setup-avatar-upload"
                className={`absolute bottom-0 right-0 bg-base-content hover:scale-105 p-2 rounded-full
                cursor-pointer transition-all duration-200
                ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
              >
                <Camera className="w-4 h-4 text-base-200" />
                <input
                  type="file"
                  id="setup-avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-400">Add a profile photo (optional)</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center justify-between">
                <span>Username</span>
                <span className="text-xs">{usernameHint}</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-4 w-4 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-9 bg-base-200"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  maxLength={20}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center justify-between">
                <span>Bio (optional)</span>
                <span className={bio.length >= BIO_MAX_LENGTH ? "text-error" : ""}>
                  {bio.length}/{BIO_MAX_LENGTH}
                </span>
              </div>
              <textarea
                className="textarea textarea-bordered w-full bg-base-200 rounded-lg resize-none"
                rows={2}
                maxLength={BIO_MAX_LENGTH}
                placeholder="Write something about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isUpdatingProfile || usernameStatus === "taken" || usernameStatus === "checking" || !username.trim()}
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default ProfileSetupPage;
