import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Path,
  Ellipse,
  G,
} from "react-native-svg";
import { Product } from "../data/types";

// Category palettes matching the original assets/data.js
const PALETTES = {
  "demi-fine": ["#F7E3DA", "#EFC9B8"],
  "oxidised": ["#E9DED8", "#CBB8AE"],
  "hair": ["#FFE9E0", "#FFD6C9"],
};

interface ProductImageProps {
  product: Product;
  width: number;
  height: number;
  variant?: number; // Used to shift graphics slightly (0, 1, etc.)
}

export const ProductImage: React.FC<ProductImageProps> = ({
  product,
  width,
  height,
  variant = 0,
}) => {
  // If product has a remote image URL, display it
  if (product.images && product.images.length > 0) {
    return (
      <Image
        source={{ uri: product.images[0] }}
        style={{ width, height, borderRadius: 8 }}
        resizeMode="cover"
      />
    );
  }

  // Otherwise, fall back to vector line art illustration
  const palette = PALETTES[product.cat] || PALETTES["demi-fine"];
  const c1 = palette[0];
  const c2 = palette[1];
  const shift = variant * 12;
  const rotateVal = variant * 6;

  // Svg icons declarations corresponding to raw ICONS mapping in data.js
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "necklace":
        return (
          <>
            <Path d="M25 30 Q60 78 95 30" fill="none" strokeWidth={2.5} />
            <Circle cx={60} cy={80} r={7} fill="none" strokeWidth={2.5} />
          </>
        );
      case "earring":
        return (
          <>
            <Circle cx={45} cy={38} r={5} fill="none" strokeWidth={2.5} />
            <Path d="M45 43 Q37 61 45 69 Q55 77 45 83" fill="none" strokeWidth={2.5} />
            <Circle cx={75} cy={38} r={5} fill="none" strokeWidth={2.5} />
            <Path d="M75 43 Q83 61 75 69 Q65 77 75 83" fill="none" strokeWidth={2.5} />
          </>
        );
      case "jhumka":
        return (
          <>
            <Circle cx={60} cy={35} r={5} fill="none" strokeWidth={2.5} />
            <Path d="M45 55 A15 15 0 0 1 75 55 L71 77 H49 Z" fill="none" strokeWidth={2.5} />
            <Circle cx={52} cy={84} r={2.5} />
            <Circle cx={60} cy={86} r={2.5} />
            <Circle cx={68} cy={84} r={2.5} />
          </>
        );
      case "bracelet":
        return (
          <Ellipse
            cx={60}
            cy={60}
            rx={30}
            ry={24}
            fill="none"
            strokeWidth={2.5}
            strokeDasharray={[6, 5]}
          />
        );
      case "ring":
        return (
          <>
            <Circle cx={60} cy={64} r={20} fill="none" strokeWidth={2.5} />
            <Path d="M52 44 L60 34 L68 44 Z" fill="none" strokeWidth={2.5} />
          </>
        );
      case "anklet":
        return (
          <>
            <Path d="M28 60 Q60 86 92 60" fill="none" strokeWidth={2.5} strokeDasharray={[2, 6]} />
            <Circle cx={60} cy={73} r={4} fill="none" strokeWidth={2.5} />
          </>
        );
      case "set":
        return (
          <>
            <Path d="M35 32 Q60 62 85 32" fill="none" strokeWidth={2.5} />
            <Circle cx={42} cy={80} r={9} fill="none" strokeWidth={2.5} />
            <Circle cx={78} cy={80} r={9} fill="none" strokeWidth={2.5} />
          </>
        );
      case "pendant":
        return (
          <>
            <Path d="M40 28 Q60 48 80 28" fill="none" strokeWidth={2.5} />
            <Circle cx={60} cy={58} r={14} fill="none" strokeWidth={2.5} />
            <Circle cx={60} cy={58} r={5} fill="none" strokeWidth={2} />
          </>
        );
      case "bangle":
        return (
          <>
            <Circle cx={60} cy={60} r={27} fill="none" strokeWidth={2.5} />
            <Circle cx={60} cy={60} r={20} fill="none" strokeWidth={2} />
          </>
        );
      case "claw":
        return (
          <>
            <Path d="M35 55 Q60 25 85 55" fill="none" strokeWidth={2.5} />
            <Path
              d="M38 55 V69 M46 58 V74 M54 60 V78 M62 60 V78 M70 58 V74 M78 55 V69"
              strokeWidth={2.5}
            />
          </>
        );
      case "clip":
        return (
          <>
            <Path d="M32 66 L72 44 A8 8 0 0 1 80 58 L40 80 Z" fill="none" strokeWidth={2.5} />
            <Circle cx={72} cy={50} r={3} />
          </>
        );
      case "band":
        return <Path d="M30 82 A34 34 0 0 1 90 82" fill="none" strokeWidth={6} strokeLinecap="round" />;
      case "scrunchie":
        return (
          <Circle
            cx={60}
            cy={60}
            r={24}
            fill="none"
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={[10, 7]}
          />
        );
      case "bow":
        return (
          <>
            <Path d="M60 60 L30 42 Q24 60 30 78 Z M60 60 L90 42 Q96 60 90 78 Z" fill="none" strokeWidth={2.5} />
            <Rect x={54} y={54} width={12} height={12} rx={3} fill="none" strokeWidth={2.5} />
          </>
        );
      default:
        // Default set icon fallback
        return (
          <>
            <Path d="M35 32 Q60 62 85 32" fill="none" strokeWidth={2.5} />
            <Circle cx={42} cy={80} r={9} fill="none" strokeWidth={2.5} />
            <Circle cx={78} cy={80} r={9} fill="none" strokeWidth={2.5} />
          </>
        );
    }
  };

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Svg viewBox="0 0 120 120" width="100%" height="100%">
        <Defs>
          <LinearGradient id={`g${product.id}${variant}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        {/* Background gradient rectangle */}
        <Rect width="120" height="120" fill={`url(#g${product.id}${variant})`} />
        
        {/* Decorative backdrop circle */}
        <Circle cx={95 - shift} cy={22 + shift} r={30} fill="rgba(255, 255, 255, 0.25)" />
        
        {/* Center line art graphic */}
        <G stroke="#2C2C2A" fill="#2C2C2A" transform={`rotate(${rotateVal} 60 60)`}>
          {renderIcon(product.icon)}
        </G>
      </Svg>
    </View>
  );
};
