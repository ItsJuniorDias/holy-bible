import React from "react";
import { StyleSheet, Text as CustomText } from "react-native";

export default function Text({
  children,
  weight,
  style,
}: {
  children: React.ReactNode;
  weight?: "regular" | "medium" | "bold";
  style?: object;
}) {
  const objectFamilyFont = {
    regular: "RobotoRegular",
    medium: "RobotoSemiBold",
    bold: "RobotoBold",
  };

  return (
    <CustomText
      style={[
        styles.text,
        { fontFamily: objectFamilyFont[weight || "regular"] },
        style,
      ]}
    >
      {children}
    </CustomText>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 24,
  },
});
