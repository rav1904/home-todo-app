import {
  Baby,
  BookOpen,
  Briefcase,
  Calendar,
  Car,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  ShoppingCart,
  Sparkles,
  TreePine,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS = {
  Home,
  ShoppingCart,
  Plane,
  HeartPulse,
  Briefcase,
  Calendar,
  Car,
  UtensilsCrossed,
  Wrench,
  Sparkles,
  Fuel,
  Dumbbell,
  Baby,
  GraduationCap,
  PawPrint,
  TreePine,
  PiggyBank,
  BookOpen,
  Gift,
  Music,
} as const;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(
  CATEGORY_ICONS,
) as CategoryIconName[];

export function isValidCategoryIconName(
  iconName: string,
): iconName is CategoryIconName {
  return iconName in CATEGORY_ICONS;
}

export function getCategoryIcon(iconName: string): LucideIcon | null {
  if (!isValidCategoryIconName(iconName)) {
    return null;
  }

  return CATEGORY_ICONS[iconName];
}

type CategoryIconProps = {
  iconName: string;
  className?: string;
};

export function CategoryIcon({ iconName, className }: CategoryIconProps) {
  const Icon = getCategoryIcon(iconName);

  if (!Icon) {
    return null;
  }

  return <Icon className={className} aria-hidden="true" />;
}
