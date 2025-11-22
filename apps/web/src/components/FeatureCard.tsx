import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-6 rounded border border-gray-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-900 text-m">
        {description}
      </p>
    </div>
  );
}
