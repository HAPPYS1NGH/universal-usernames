"use client";

import NumberFlow from "@number-flow/react";

// Digit roll for figures that change while you watch: the price and the values
// that follow it refresh every few seconds. Same timing as the Aave app: fast
// start, then settle. NumberFlow skips the animation under reduced motion.
const ROLL = { duration: 420, easing: "cubic-bezier(0.23, 1, 0.32, 1)" };
const FADE = { duration: 120, easing: "ease-out" };

type AnimatedUsdProps = {
  cents: number;
  wholeDollars?: boolean;
  className?: string;
};

export function AnimatedUsd({ cents, wholeDollars = false, className }: AnimatedUsdProps) {
  const fractionDigits = wholeDollars ? 0 : 2;
  return (
    <NumberFlow
      value={wholeDollars ? Math.round(cents / 100) : cents / 100}
      locales="en-US"
      format={{
        style: "currency",
        currency: "USD",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }}
      className={className}
      spinTiming={ROLL}
      transformTiming={ROLL}
      opacityTiming={FADE}
      respectMotionPreference
    />
  );
}

type AnimatedNumberProps = {
  value: number;
  maxFractionDigits: number;
  className?: string;
};

export function AnimatedNumber({ value, maxFractionDigits, className }: AnimatedNumberProps) {
  return (
    <NumberFlow
      value={value}
      locales="en-US"
      format={{ maximumFractionDigits: maxFractionDigits }}
      className={className}
      spinTiming={ROLL}
      transformTiming={ROLL}
      opacityTiming={FADE}
      respectMotionPreference
    />
  );
}
