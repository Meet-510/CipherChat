import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Camera, Loader2, Search, Users, Video, X } from "lucide-react";
import { formatLastMessageTime } from "../lib/utils";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // debounced username / name search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get("/auth/search", { params: { query } });
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  const isSearchMode = searchQuery.trim().length > 0;

  const renderPreview = (user) => {
    const { lastMessage } = user;
    if (!lastMessage) return <span className="text-zinc-400">Say hi 👋</span>;

    const isMine = lastMessage.senderId === authUser?._id;
    const prefix = isMine ? "You: " : "";

    if (lastMessage.image) {
      return (
        <span className="flex items-center gap-1">
          {prefix}
          <Camera className="size-3.5" /> Photo
        </span>
      );
    }
    if (lastMessage.video) {
      return (
        <span className="flex items-center gap-1">
          {prefix}
          <Video className="size-3.5" /> Video
        </span>
      );
    }
    return (
      <span className="truncate block">
        {prefix}
        {lastMessage.text}
      </span>
    );
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Chats</span>
        </div>

        {/* search by username */}
        <div className="relative hidden lg:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="size-4 text-base-content/40" />
          </div>
          <input
            type="text"
            className="input input-bordered input-sm w-full pl-9 pr-8"
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-4 text-base-content/40" />
            </button>
          )}
        </div>

        {!isSearchMode && (
          <div className="hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-zinc-500">
              ({Math.max(onlineUsers.length - 1, 0)} online)
            </span>
          </div>
        )}
      </div>

      <div className="overflow-y-auto w-full py-3">
        {isSearchMode ? (
          /* ---- search results ---- */
          <>
            {isSearching && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-zinc-400" />
              </div>
            )}
            {!isSearching &&
              searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => {
                    setSearchQuery("");
                    navigate(`/profile/${user._id}`);
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors"
                >
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-12 object-cover rounded-full mx-auto lg:mx-0"
                  />
                  <div className="hidden lg:block text-left min-w-0">
                    <div className="font-medium truncate">
                      {user.username ? `@${user.username}` : user.fullName}
                    </div>
                    <div className="text-sm text-zinc-400 truncate">{user.fullName}</div>
                  </div>
                </button>
              ))}
            {!isSearching && searchResults.length === 0 && (
              <div className="text-center text-zinc-500 py-4 px-2 text-sm">No users found</div>
            )}
          </>
        ) : (
          /* ---- conversations ---- */
          <>
            {filteredUsers.map((user) => {
              const hasUnread = (user.unreadCount || 0) > 0;

              return (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-300 transition-colors
                    ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                  `}
                >
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-12 object-cover rounded-full"
                    />
                    {onlineUsers.includes(user._id) && (
                      <span
                        className="absolute bottom-0 right-0 size-3 bg-green-500
                        rounded-full ring-2 ring-zinc-900"
                      />
                    )}
                    {/* unread badge for the collapsed (mobile) sidebar */}
                    {hasUnread && (
                      <span
                        className="lg:hidden absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary
                        text-primary-content text-xs flex items-center justify-center font-medium"
                      >
                        {user.unreadCount > 9 ? "9+" : user.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* User info - only visible on larger screens */}
                  <div className="hidden lg:flex flex-1 min-w-0 items-center gap-2 text-left">
                    <div className="flex-1 min-w-0">
                      <div className={`truncate ${hasUnread ? "font-semibold" : "font-medium"}`}>
                        {user.fullName}
                      </div>
                      <div
                        className={`text-sm truncate ${
                          hasUnread ? "text-base-content font-medium" : "text-zinc-400"
                        }`}
                      >
                        {renderPreview(user)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {user.lastMessage && (
                        <span
                          className={`text-xs ${hasUnread ? "text-primary" : "text-zinc-500"}`}
                        >
                          {formatLastMessageTime(user.lastMessage.createdAt)}
                        </span>
                      )}
                      {hasUnread && (
                        <span
                          className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-content
                          text-xs flex items-center justify-center font-medium"
                        >
                          {user.unreadCount > 9 ? "9+" : user.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center text-zinc-500 py-6 px-3 text-sm hidden lg:block">
                {showOnlineOnly
                  ? "No online users"
                  : "No conversations yet. Search a username above to find people."}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
