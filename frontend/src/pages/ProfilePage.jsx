import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { AtSign, Camera, Check, Loader2, Mail, User, X } from "lucide-react";
import toast from "react-hot-toast";

const BIO_MAX_LENGTH = 150;
const USERNAME_REGEX = /^[a-z0-9][a-z0-9._]{2,19}$/;

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [bio, setBio] = useState(authUser?.bio || "");
  const [username, setUsername] = useState(authUser?.username || "");
  // idle | checking | available | taken | invalid
  const [usernameStatus, setUsernameStatus] = useState("idle");

  const usernameChanged = username.trim().toLowerCase() !== (authUser?.username || "");
  const hasChanges =
    selectedImg !== null || bio !== (authUser?.bio || "") || (usernameChanged && username.trim());

  // live availability check, debounced
  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!value || value === (authUser?.username || "")) {
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
  }, [username, authUser?.username]);

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

  const handleSaveProfile = async () => {
    if (!hasChanges || isUpdatingProfile) return;

    const normalizedUsername = username.trim().toLowerCase();
    if (usernameChanged && normalizedUsername) {
      if (!USERNAME_REGEX.test(normalizedUsername)) {
        return toast.error(
          "Username must be 3-20 characters (letters, numbers, dots, underscores)"
        );
      }
      if (usernameStatus === "taken") return toast.error("Username is already taken");
    }

    const data = {};
    if (selectedImg) data.profilePic = selectedImg;
    if (bio !== (authUser?.bio || "")) data.bio = bio;
    if (usernameChanged && normalizedUsername) data.username = normalizedUsername;

    await updateProfile(data);
    setSelectedImg(null);
  };

  const usernameHint = {
    idle: null,
    checking: (
      <span className="text-zinc-400 flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" /> Checking...
      </span>
    ),
    available: (
      <span className="text-green-500 flex items-center gap-1">
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
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Edit your profile</p>
          </div>

          {/* avatar upload section */}

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 "
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {selectedImg
                ? "New photo selected — click Save Profile to apply"
                : "Click the camera icon to choose a new photo"}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.fullName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AtSign className="w-4 h-4" />
                  Username
                </span>
                <span className="text-xs">{usernameHint}</span>
              </div>
              <input
                type="text"
                className="input input-bordered w-full bg-base-200"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                maxLength={20}
                disabled={isUpdatingProfile}
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-2">Bio</span>
                <span className={bio.length >= BIO_MAX_LENGTH ? "text-error" : ""}>
                  {bio.length}/{BIO_MAX_LENGTH}
                </span>
              </div>
              <textarea
                className="textarea textarea-bordered w-full bg-base-200 rounded-lg resize-none"
                rows={3}
                maxLength={BIO_MAX_LENGTH}
                placeholder="Write something about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={isUpdatingProfile}
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.email}</p>
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={handleSaveProfile}
              disabled={
                !hasChanges ||
                isUpdatingProfile ||
                usernameStatus === "taken" ||
                usernameStatus === "checking"
              }
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium  mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
