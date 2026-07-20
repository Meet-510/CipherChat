import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // last message + unread count per conversation, Instagram-style
    const myId = new mongoose.Types.ObjectId(String(loggedInUserId));
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: myId }, { receiverId: myId }],
          // ignore self-messages (possible via direct API calls)
          $expr: { $ne: ["$senderId", "$receiverId"] },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$senderId", myId] }, "$receiverId", "$senderId"] },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiverId", myId] }, { $eq: ["$read", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const conversationMap = {};
    for (const convo of conversations) {
      conversationMap[String(convo._id)] = convo;
    }

    // only people you have a conversation with appear in the chat list;
    // new people are discovered via search
    const partnerIds = conversations.map((convo) => convo._id);
    const conversationUsers = await User.find({ _id: { $in: partnerIds } }).select("-password");

    const usersWithMeta = conversationUsers
      .map((user) => {
        const convo = conversationMap[String(user._id)];
        const lastMessage = convo?.lastMessage;
        return {
          ...user.toObject(),
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                senderId: lastMessage.senderId,
                text: lastMessage.text,
                image: lastMessage.image,
                video: lastMessage.video,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount: convo?.unreadCount || 0,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessage?.createdAt || 0).getTime() -
          new Date(a.lastMessage?.createdAt || 0).getTime()
      );

    res.status(200).json(usersWithMeta);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // opening the conversation marks their messages as read (non-blocking)
    Message.updateMany(
      { senderId: userToChatId, receiverId: myId, read: false },
      { read: true }
    ).catch((error) => console.log("Error marking messages read:", error.message));

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const myId = req.user._id;

    await Message.updateMany({ senderId, receiverId: myId, read: false }, { read: true });

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, video } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text?.trim() && !image && !video) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    if (String(senderId) === String(receiverId)) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let videoUrl;
    if (video) {
      // Upload base64 video to cloudinary (chunked for larger files)
      const uploadResponse = await cloudinary.uploader.upload(video, {
        resource_type: "video",
        chunk_size: 6 * 1024 * 1024,
      });
      videoUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    await newMessage.save();

    // deliver to every open tab of the receiver as soon as the write completes
    const receiverSocketIds = getReceiverSocketId(receiverId);
    if (receiverSocketIds) {
      io.to(receiverSocketIds).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
