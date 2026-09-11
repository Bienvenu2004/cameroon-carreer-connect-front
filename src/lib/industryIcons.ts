import {
  Banknote, Building2, Cpu, Factory, GraduationCap, HandHeart, HardHat,
  Heart, Hotel, Landmark, Leaf, Megaphone, MoreHorizontal, Radio,
  Scale, ShoppingBag, Shirt, Truck, Users, Zap,
  type LucideIcon,
} from "lucide-react";

import type { Industry } from "@/types/api";

/**
 * One icon per industry, shared by every surface that lists industries (the
 * industries directory, the home page categories and the featured job cards),
 * so a sector is recognisable by the same mark wherever it appears.
 */
export const INDUSTRY_ICONS: Record<Industry, LucideIcon> = {
  AGRICULTURE: Leaf,
  BANKING_FINANCE: Banknote,
  CONSTRUCTION: HardHat,
  CONSULTING: Users,
  EDUCATION: GraduationCap,
  ENERGY_UTILITIES: Zap,
  GOVERNMENT: Landmark,
  HEALTHCARE: Heart,
  HOSPITALITY_TOURISM: Hotel,
  INFORMATION_TECHNOLOGY: Cpu,
  LEGAL: Scale,
  LOGISTICS_TRANSPORT: Truck,
  MANUFACTURING: Factory,
  MEDIA_COMMUNICATION: Megaphone,
  NGO_NONPROFIT: HandHeart,
  REAL_ESTATE: Building2,
  RETAIL_TRADE: ShoppingBag,
  TELECOMMUNICATIONS: Radio,
  TEXTILES_FASHION: Shirt,
  OTHER: MoreHorizontal,
};
