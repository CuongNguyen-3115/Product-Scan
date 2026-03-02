// components/ui/TabBarBackground.tsx
import * as React from 'react';

// Fallback chung: không vẽ gì (tab bar sẽ là mặc định của React Navigation)
export default function TabBarBackground() {
  return null;
}

// Nếu có nơi dựa vào hook này để bù tràn, giữ nguyên 0 cho mọi nền tảng
export function useBottomTabOverflow() {
  return 0;
}
