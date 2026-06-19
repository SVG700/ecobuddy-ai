import React from 'react';
import * as Lucide from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = '', size = 24 }) => {
  // Safe lookup of the icon component
  const hasIcon = name in Lucide;
  const IconComponent = hasIcon 
    ? (Lucide[name as keyof typeof Lucide] as React.ComponentType<{ className?: string; size?: number; "aria-hidden"?: string | boolean }>)
    : null;

  if (!IconComponent) {
    // Fallback icon if the specified name is invalid
    const Fallback = Lucide.HelpCircle;
    return <Fallback className={className} size={size} aria-hidden="true" />;
  }

  return <IconComponent className={className} size={size} aria-hidden="true" />;
};

export default DynamicIcon;
