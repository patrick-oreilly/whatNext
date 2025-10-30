import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  icon: LucideIcon;
  size?: number;
}

/**
 * Shared wrapper for Lucide icons to enforce consistent sizing and accessibility.
 */
export const Icon: React.FC<IconProps> = ({ icon: IconImpl, size = 32, ...rest }) => (
  <IconImpl
    aria-hidden
    focusable={false}
    width={size}
    height={size}
    strokeWidth={2.5}
    {...rest}
  />
);

Icon.displayName = 'Icon';
