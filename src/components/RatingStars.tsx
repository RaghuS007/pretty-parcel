import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { THEME } from "../constants/theme";

interface RatingStarsProps {
  rating: number;
  reviews?: number;
  size?: number;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  reviews,
  size = 12,
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.4;
  const starsArray = [];

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      starsArray.push({ type: "full", index: i });
    } else if (i === fullStars + 1 && hasHalfStar) {
      starsArray.push({ type: "half", index: i });
    } else {
      starsArray.push({ type: "empty", index: i });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {starsArray.map((star) => {
          let name: keyof typeof Feather.glyphMap = "star";
          if (star.type === "empty") {
            // Outline star has Feather name: 'star' but we can draw it colored/empty
            return (
              <Feather
                key={star.index}
                name="star"
                size={size}
                color={THEME.colors.border}
                style={styles.star}
              />
            );
          }
          // Highlight active stars
          return (
            <Feather
              key={star.index}
              name="star"
              size={size}
              color={THEME.colors.primary}
              style={styles.star}
            />
          );
        })}
      </View>
      <Text style={[styles.ratingText, { fontSize: size + 1 }]}>
        {rating.toFixed(1)}
        {reviews !== undefined && (
          <Text style={styles.reviewsText}> ({reviews})</Text>
        )}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    marginRight: 1.5,
  },
  ratingText: {
    fontFamily: THEME.fonts.body.medium,
    color: THEME.colors.primary,
  },
  reviewsText: {
    fontFamily: THEME.fonts.body.regular,
    color: THEME.colors.inkSoft,
  },
});
