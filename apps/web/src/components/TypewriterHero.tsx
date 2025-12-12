"use client";

import { useState, useEffect } from "react";

const phrases = [
  "your venture ideas",
  "your side projects",
  "your research interests",
];

export default function TypewriterHero() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const typingSpeed = isDeleting ? 40 : 60;
    const pauseDuration = 3000;

    if (!isDeleting && charIndex === currentPhrase.length) {
      // Pause at the end of the phrase
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && charIndex === 0) {
      // Move to next phrase
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayedText(currentPhrase.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      } else {
        setDisplayedText(currentPhrase.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentPhraseIndex]);

  const currentPhrase = phrases[currentPhraseIndex];

  // Anticipate how/if words will wrap to avoid words jumping to the next
  // during typing depending on screen width
  let currentWordStart = 0;
  let currentWordEnd = currentPhrase.length;

  // Find the start of the current word (last space before current position, or start)
  for (let i = displayedText.length - 1; i >= 0; i--) {
    if (displayedText[i] === " ") {
      currentWordStart = i + 1;
      break;
    }
  }

  // Find the end of the current word in the full phrase (next space, or end)
  for (let i = currentWordStart; i < currentPhrase.length; i++) {
    if (currentPhrase[i] === " ") {
      currentWordEnd = i;
      break;
    }
  }

  const beforeCurrentWord = displayedText.substring(0, currentWordStart);
  const currentWord = currentPhrase.substring(currentWordStart, currentWordEnd);
  const currentWordTyped = displayedText.substring(currentWordStart);

  return (
    <div className="text-4xl md:text-6xl font-mono font-bold text-gray-900 mb-10 leading-tight">
      <div>Find co-founders</div>
      <div>based on the similarity of</div>
      <div className="relative my-1 min-h-[2.5em] md:min-h-[1.2em]">
        <span className="inline-block min-w-[1ch] text-black-600">
          {beforeCurrentWord}
          <span className="relative inline-block">
            {/* Invisible placeholder for full current word */}
            <span className="invisible">{currentWord}</span>
            {/* Visible typed portion of current word with cursor */}
            <span className="absolute top-0 left-0">
              {currentWordTyped}
              <span className="animate-blink">_</span>
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
