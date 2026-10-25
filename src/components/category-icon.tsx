import { Utensils, Users, Heart, ShoppingBag, Fuel, Bus, House, Coffee, HeartPulse, Ticket, GraduationCap, Gift, Plane, Briefcase, Tag, type LucideProps } from "lucide-react";
import type { CategoryIconName } from "@/lib/categories";
const icons = { utensils: Utensils, users: Users, heart: Heart, "shopping-bag": ShoppingBag, fuel: Fuel, bus: Bus, house: House, coffee: Coffee, "heart-pulse": HeartPulse, ticket: Ticket, "graduation-cap": GraduationCap, gift: Gift, plane: Plane, briefcase: Briefcase, tag: Tag };
export function CategoryIcon({ name, ...props }: LucideProps & { name?: string | null }) {
  const Icon = icons[name as CategoryIconName] ?? Tag;
  return <Icon aria-hidden="true" {...props} />;
}
