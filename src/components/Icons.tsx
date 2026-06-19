import React from 'react';
import * as Lucide from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = '', size = 24 }) => {
  // Safe lookup of the icon component
  const IconComponent = (Lucide as any)[name];

  if (!IconComponent) {
    // Fallback icon if the specified name is invalid
    const Fallback = Lucide.HelpCircle;
    return <Fallback className={className} size={size} />;
  }

  return <IconComponent className={className} size={size} />;
};

export default DynamicIcon;
