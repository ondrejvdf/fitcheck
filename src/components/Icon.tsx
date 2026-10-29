import {
  ArrowUpRight,
  Barcode,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardPen,
  Heart,
  History,
  House,
  Leaf,
  Menu,
  Plus,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  X,
  Download,
  Check,
  ArrowLeft,
  WifiOff,
  Scale,
  Dumbbell,
  Smartphone,
  Moon,
} from "lucide-react";
const icons = {
  ArrowUpRight,
  Barcode,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardPen,
  Heart,
  History,
  House,
  Leaf,
  Menu,
  Plus,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  X,
  Download,
  Check,
  ArrowLeft,
  WifiOff,
  Scale,
  Dumbbell,
  Smartphone,
  Moon,
};
export type IconName = keyof typeof icons;
export default function Icon({
  name,
  size = 20,
  ...rest
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const I = icons[name];
  return <I size={size} strokeWidth={1.8} {...rest} />;
}
