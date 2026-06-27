import React, { useState, useEffect } from 'react';
import { Animated } from 'react-native';

interface ShakeViewProps {
  children: React.ReactNode;
  trigger: boolean;
  style?: any;
}

export const ShakeView: React.FC<ShakeViewProps> = ({ children, trigger, style }) => {
  const [shakeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (trigger) {
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [trigger, shakeAnim]);

  return (
    <Animated.View style={[{ transform: [{ translateX: shakeAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};
export default ShakeView;
