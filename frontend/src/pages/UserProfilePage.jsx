import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Loader, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const UserProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { onlineUsers, authUser } = useAuthStore();
  const { setSelectedUser } = useChatStore();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // own profile stays on the editable page
    if (authUser?._id === id) {
      navigate("/profile", { replace: true });
      return;
    }

    let isCancelled = false;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await axiosInstance.get(`/auth/profile/${id}`);
        if (!isCancelled) setProfile(res.data);
      } catch (error) {
        if (!isCancelled) {
          toast.error(error.response?.data?.message || "Failed to load profile");
          navigate("/", { replace: true });
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchProfile();

    return () => {
      isCancelled = true;
    };
  }, [id, authUser?._id, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const isOnline = onlineUsers.includes(profile._id);
  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Go back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-xl font-semibold">Profile</h1>
          </div>

          {/* avatar + presence */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={profile.profilePic || "/avatar.png"}
                alt={profile.fullName}
                className="size-32 rounded-full object-cover border-4"
              />
              <span
                className={`absolute bottom-2 right-2 size-5 rounded-full ring-4 ring-base-300 transition-colors ${
                  isOnline ? "bg-green-500" : "bg-zinc-500"
                }`}
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-semibold">{profile.fullName}</h2>
              {profile.username && (
                <p className="text-base-content/60 text-sm">@{profile.username}</p>
              )}
              <p className={`text-sm mt-1 ${isOnline ? "text-green-500" : "text-base-content/60"}`}>
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>

            <button
              className="btn btn-primary btn-sm gap-2"
              onClick={() => {
                setSelectedUser(profile);
                navigate("/");
              }}
            >
              <MessageSquare className="size-4" />
              Message
            </button>
          </div>

          {/* bio */}
          <div className="space-y-1.5">
            <div className="text-sm text-zinc-400">Bio</div>
            <p className="px-4 py-2.5 bg-base-200 rounded-lg border min-h-12 whitespace-pre-wrap">
              {profile.bio || "No bio yet."}
            </p>
          </div>

          {/* joined date */}
          <div className="flex items-center justify-between py-2 border-t border-zinc-700 text-sm">
            <span className="flex items-center gap-2 text-zinc-400">
              <Calendar className="w-4 h-4" />
              Joined
            </span>
            <span>{joinedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default UserProfilePage;
