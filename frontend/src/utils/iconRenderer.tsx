import React from 'react'
import { 
  ShoppingCart, 
  Coffee, 
  Car, 
  Home, 
  Utensils, 
  Heart, 
  Plane, 
  Book, 
  Music, 
  Monitor,
  Shirt,
  Gift,
  Gamepad2,
  Fuel,
  Wrench,
  GraduationCap,
  Building,
  Briefcase,
  TreePine,
  Camera,
  Dumbbell,
  PiggyBank,
  CreditCard,
  MapPin,
  Users,
  Smartphone,
  Wifi,
  Zap,
  Droplets,
  Wind,
  Trash,
  Dog,
  Baby,
  Stethoscope,
  Pill,
  Package,
  HelpCircle,
  FolderOpen
} from 'lucide-react'

// Map of common icon names to Lucide components
const iconMap: Record<string, React.ComponentType<any>> = {
  'shopping-cart': ShoppingCart,
  'shopping_cart': ShoppingCart,
  'coffee': Coffee,
  'car': Car,
  'home': Home,
  'utensils': Utensils,
  'restaurant': Utensils,
  'food': Utensils,
  'heart': Heart,
  'health': Heart,
  'plane': Plane,
  'travel': Plane,
  'book': Book,
  'education': Book,
  'music': Music,
  'entertainment': Music,
  'monitor': Monitor,
  'technology': Monitor,
  'shirt': Shirt,
  'clothing': Shirt,
  'gift': Gift,
  'gamepad': Gamepad2,
  'gaming': Gamepad2,
  'fuel': Fuel,
  'gas': Fuel,
  'wrench': Wrench,
  'maintenance': Wrench,
  'graduation-cap': GraduationCap,
  'building': Building,
  'briefcase': Briefcase,
  'work': Briefcase,
  'business': Briefcase,
  'tree': TreePine,
  'nature': TreePine,
  'camera': Camera,
  'photo': Camera,
  'dumbbell': Dumbbell,
  'fitness': Dumbbell,
  'gym': Dumbbell,
  'piggy-bank': PiggyBank,
  'savings': PiggyBank,
  'credit-card': CreditCard,
  'payment': CreditCard,
  'map-pin': MapPin,
  'location': MapPin,
  'users': Users,
  'family': Users,
  'smartphone': Smartphone,
  'phone': Smartphone,
  'wifi': Wifi,
  'internet': Wifi,
  'zap': Zap,
  'electricity': Zap,
  'utilities': Zap,
  'droplets': Droplets,
  'water': Droplets,
  'wind': Wind,
  'air': Wind,
  'trash': Trash,
  'waste': Trash,
  'dog': Dog,
  'pet': Dog,
  'baby': Baby,
  'children': Baby,
  'stethoscope': Stethoscope,
  'medical': Stethoscope,
  'pill': Pill,
  'medicine': Pill,
  'package': Package,
  'delivery': Package,
  'help-circle': HelpCircle,
  'other': HelpCircle,
  'folder-open': FolderOpen,
  'default': FolderOpen
}

// Map of common category names to emojis as fallback
const emojiMap: Record<string, string> = {
  'food': '🍔',
  'restaurant': '🍽️',
  'groceries': '🛒',
  'shopping': '🛍️',
  'transport': '🚗',
  'car': '🚗',
  'travel': '✈️',
  'home': '🏠',
  'housing': '🏠',
  'utilities': '⚡',
  'electricity': '⚡',
  'water': '💧',
  'gas': '⛽',
  'internet': '📶',
  'phone': '📱',
  'entertainment': '🎵',
  'music': '🎵',
  'movies': '🎬',
  'books': '📚',
  'education': '🎓',
  'health': '❤️',
  'medical': '⚕️',
  'pharmacy': '💊',
  'fitness': '💪',
  'gym': '🏋️',
  'clothing': '👕',
  'fashion': '👗',
  'beauty': '💄',
  'personal': '👤',
  'gifts': '🎁',
  'donations': '💝',
  'pets': '🐕',
  'children': '👶',
  'family': '👨‍👩‍👧‍👦',
  'work': '💼',
  'business': '🏢',
  'investment': '📈',
  'savings': '🐷',
  'insurance': '🛡️',
  'taxes': '📋',
  'fees': '💳',
  'subscription': '📅',
  'maintenance': '🔧',
  'repairs': '🛠️',
  'cleaning': '🧽',
  'garden': '🌱',
  'other': '📂',
  'uncategorized': '📂'
}

interface IconRendererProps {
  icon?: string
  className?: string
  size?: number
}

export function IconRenderer({ icon, className = "", size = 16 }: IconRendererProps) {
  if (!icon) {
    return <FolderOpen className={`h-${size/4} w-${size/4} ${className}`} />
  }

  // Check if it's already an emoji (contains non-ASCII characters)
  if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon)) {
    return <span className={`inline-block ${className}`} style={{ fontSize: `${size}px` }}>{icon}</span>
  }

  // Try to find a Lucide icon component
  const iconKey = icon.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const IconComponent = iconMap[iconKey] || iconMap[icon.toLowerCase()]
  
  if (IconComponent) {
    return <IconComponent className={`h-${size/4} w-${size/4} ${className}`} />
  }

  // Try to find an emoji fallback
  const emojiKey = icon.toLowerCase().replace(/[^a-z0-9]/g, '')
  const emoji = emojiMap[emojiKey] || emojiMap[icon.toLowerCase()]
  
  if (emoji) {
    return <span className={`inline-block ${className}`} style={{ fontSize: `${size}px` }}>{emoji}</span>
  }

  // If it's a short string, treat it as emoji
  if (icon.length <= 2) {
    return <span className={`inline-block ${className}`} style={{ fontSize: `${size}px` }}>{icon}</span>
  }

  // Fallback to default folder icon
  return <FolderOpen className={`h-${size/4} w-${size/4} ${className}`} />
}

// Helper function for text-based icon rendering (for select options, etc.)
export function getIconText(icon?: string): string {
  if (!icon) return '📂'
  
  // If it's already an emoji, return as-is
  if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon)) {
    return icon
  }

  // Try to find an emoji fallback
  const emojiKey = icon.toLowerCase().replace(/[^a-z0-9]/g, '')
  const emoji = emojiMap[emojiKey] || emojiMap[icon.toLowerCase()]
  
  if (emoji) return emoji
  
  // If it's a short string, treat it as emoji
  if (icon.length <= 2) return icon
  
  // Fallback
  return '📂'
}