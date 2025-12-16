"use client";

interface MessageBannerProps {
  message: string;
  type?: "info" | "success" | "error" | "warning";
}

export function MessageBanner({ message, type = "info" }: MessageBannerProps) {
  const styles = {
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-green-50 text-green-700 border-green-200",
    error: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
  };

  return (
    <div
      className={`mb-6 p-4 border rounded font-mono text-sm ${styles[type]}`}
    >
      {message}
    </div>
  );
}
