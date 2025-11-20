import React from 'react';
import * as Icons from 'lucide-react';

interface IconMapperProps {
    iconName: string;
    className?: string;
}

export const IconMapper: React.FC<IconMapperProps> = ({ iconName, className }) => {
    // Access the icon from the lucide-react library dynamically
    // @ts-ignore - We know the icon exists or we handle the fallback
    const IconComponent = Icons[iconName];

    if (!IconComponent) {
        // Fallback icon if the name doesn't match
        return <Icons.HelpCircle className={className} />;
    }

    return <IconComponent className={className} />;
};
