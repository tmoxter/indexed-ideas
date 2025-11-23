"use client";

interface ActionButtonsProps {
  onLike: () => void;
  onSkip: () => void;
  isSubmitting: boolean;
  likeText?: string;
  skipText?: string;
}

export function ActionButtons({
  onLike,
  onSkip,
  isSubmitting,
  likeText = "Let's connect",
  skipText = "Skip",
}: ActionButtonsProps) {
  return (
    <div className="flex justify-center space-x-4">
      <button
        onClick={onSkip}
        disabled={isSubmitting}
        className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-gray-900 bg-white border border-gray-300 shadow-lg hover:-translate-y-0.5 hover:shadow-2xl"
      >
        {skipText}
      </button>
      <button
        onClick={onLike}
        disabled={isSubmitting}
        className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-lg hover:-translate-y-0.5 hover:shadow-2xl"
      >
        {isSubmitting ? "saving..." : likeText}
      </button>
    </div>
  );
}
