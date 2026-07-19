import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// most recent conversation first, users without messages at the bottom
const sortUsersByRecency = (users) =>
  [...users].sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: sortUsersByRecency(res.data) });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // update a user's sidebar entry with a new last message (and optional unread bump)
  updateSidebarForMessage: (userId, message, { incrementUnread = false } = {}) => {
    const { users } = get();
    const existing = users.find((user) => user._id === userId);
    if (!existing) {
      // user signed up after the list loaded — refresh the sidebar
      get().getUsers();
      return;
    }

    const updated = users.map((user) =>
      user._id === userId
        ? {
            ...user,
            lastMessage: {
              _id: message._id,
              senderId: message.senderId,
              text: message.text,
              image: message.image,
              video: message.video,
              createdAt: message.createdAt,
            },
            unreadCount: incrementUnread ? (user.unreadCount || 0) + 1 : user.unreadCount || 0,
          }
        : user
    );
    set({ users: sortUsersByRecency(updated) });
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const authUser = useAuthStore.getState().authUser;
    if (!selectedUser || !authUser) return;

    // Optimistic update: show the message instantly, then reconcile with the server
    const optimisticMessage = {
      _id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      video: messageData.video,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set({ messages: [...get().messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      // Replace the optimistic message with the saved one from the server
      set({
        messages: get().messages.map((message) =>
          message._id === optimisticMessage._id ? res.data : message
        ),
      });
      get().updateSidebarForMessage(selectedUser._id, res.data);
    } catch (error) {
      // Roll back the optimistic message on failure
      set({
        messages: get().messages.filter((message) => message._id !== optimisticMessage._id),
      });
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // single global listener — keeps the sidebar live even when no chat is open
  initSocketListeners: (socket) => {
    if (!socket) return;

    // never stack duplicate handlers (reconnects, re-login)
    socket.off("newMessage");

    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const isChatOpen = selectedUser && newMessage.senderId === selectedUser._id;

      if (isChatOpen) {
        // Guard against duplicates (e.g. reconnects or repeated events)
        const alreadyExists = get().messages.some((message) => message._id === newMessage._id);
        if (!alreadyExists) {
          set({ messages: [...get().messages, newMessage] });
        }
        // message is on screen — mark it read right away (non-blocking)
        axiosInstance.put(`/messages/read/${newMessage.senderId}`).catch(() => {});
      }

      get().updateSidebarForMessage(newMessage.senderId, newMessage, {
        incrementUnread: !isChatOpen,
      });
    });
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });

    // opening a chat clears its unread badge (server marks read via getMessages)
    if (selectedUser) {
      set({
        users: get().users.map((user) =>
          user._id === selectedUser._id ? { ...user, unreadCount: 0 } : user
        ),
      });
    }
  },
}));
