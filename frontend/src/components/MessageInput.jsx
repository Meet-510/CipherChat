import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 30;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null); // { type: "image" | "video", data }
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please select a photo or video");
      return;
    }

    const maxMb = isImage ? MAX_IMAGE_SIZE_MB : MAX_VIDEO_SIZE_MB;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`${isImage ? "Photo" : "Video"} must be under ${maxMb}MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview({ type: isImage ? "image" : "video", data: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !mediaPreview) return;

    const messageData = {
      text: text.trim(),
      image: mediaPreview?.type === "image" ? mediaPreview.data : undefined,
      video: mediaPreview?.type === "video" ? mediaPreview.data : undefined,
    };

    // Clear form immediately — the store shows the message optimistically
    // and rolls it back if the request fails
    setText("");
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    sendMessage(messageData);
  };

  return (
    <div className="p-4 w-full">
      {mediaPreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {mediaPreview.type === "image" ? (
              <img
                src={mediaPreview.data}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            ) : (
              <video
                src={mediaPreview.data}
                className="w-28 h-20 object-cover rounded-lg border border-zinc-700"
              />
            )}
            <button
              onClick={removeMedia}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${mediaPreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !mediaPreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
