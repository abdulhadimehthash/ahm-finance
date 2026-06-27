import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Vibration,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShakeView } from '@/components/ShakeView';

const HARDCODED_PIN = '982010';

export default function PinLockScreen() {
  const [pin, setPin] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLaptop = width >= 768;

  // Track latest pin state in ref for physical keyboard event listeners
  const pinRef = useRef(pin);
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  const checkPin = useCallback((enteredPin: string) => {
    if (enteredPin.length === 6) {
      if (enteredPin === HARDCODED_PIN) {
        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 30]);
        }
        setTimeout(() => {
          router.replace('/dashboard');
        }, 150);
      } else {
        // Incorrect PIN
        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 80, 50, 80]);
        }
        setShakeTrigger(prev => !prev);
        setTimeout(() => {
          setPin('');
        }, 350);
      }
    }
  }, [router]);

  const handlePressNumber = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      if (Platform.OS !== 'web') {
        Vibration.vibrate(10);
      }
      setPin(newPin);
      checkPin(newPin);
    }
  };

  const handlePressDelete = () => {
    if (pin.length > 0) {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(10);
      }
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handlePressClear = () => {
    if (pin.length > 0) {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(15);
      }
      setPin('');
    }
  };

  // Add physical keyboard listener for web/laptop
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        const currentPin = pinRef.current;
        if (/^[0-9]$/.test(e.key)) {
          if (currentPin.length < 6) {
            const newPin = currentPin + e.key;
            setPin(newPin);
            checkPin(newPin);
          }
        } else if (e.key === 'Backspace') {
          if (currentPin.length > 0) {
            setPin(prev => prev.slice(0, -1));
          }
        } else if (e.key === 'c' || e.key === 'C' || e.key === 'Escape') {
          if (currentPin.length > 0) {
            setPin('');
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [checkPin]);

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.appContainer, isLaptop && styles.laptopContainer]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>My Finance</Text>
              <Text style={styles.subtitle}>Enter security PIN to unlock</Text>
            </View>

            <View style={styles.dotsAndHint}>
              <ShakeView trigger={shakeTrigger} style={styles.dotsContainer}>
                {[...Array(6)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      pin.length > i ? styles.dotFilled : styles.dotEmpty,
                      pin.length === i && styles.dotActive,
                    ]}
                  />
                ))}
              </ShakeView>

              {isLaptop && (
                <Text style={styles.keyboardHint}>
                  You can type the PIN directly on your keyboard
                </Text>
              )}
            </View>

            <View style={styles.keypad}>
              {/* Keypad Rows */}
              <View style={styles.row}>
                {['1', '2', '3'].map(num => (
                  <KeypadButton key={num} label={num} onPress={() => handlePressNumber(num)} />
                ))}
              </View>
              <View style={styles.row}>
                {['4', '5', '6'].map(num => (
                  <KeypadButton key={num} label={num} onPress={() => handlePressNumber(num)} />
                ))}
              </View>
              <View style={styles.row}>
                {['7', '8', '9'].map(num => (
                  <KeypadButton key={num} label={num} onPress={() => handlePressNumber(num)} />
                ))}
              </View>
              <View style={styles.row}>
                <KeypadButton label="C" onPress={handlePressClear} isAction />
                <KeypadButton label="0" onPress={() => handlePressNumber('0')} />
                <KeypadButton label="⌫" onPress={handlePressDelete} isAction />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

interface KeypadButtonProps {
  label: string;
  onPress: () => void;
  isAction?: boolean;
}

function KeypadButton({ label, onPress, isAction }: KeypadButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.5}
      style={[styles.button, isAction && styles.actionButton]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, isAction && styles.actionButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#050507', // Dark sides for laptops
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0C0C0E',
  },
  laptopContainer: {
    maxWidth: 480,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#24242B',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  dotsAndHint: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 16,
  },
  keyboardHint: {
    fontSize: 12,
    color: '#636366',
    textAlign: 'center',
    marginTop: 4,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  dotEmpty: {
    borderColor: '#3A3A3C',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: '#34D399',
    backgroundColor: '#34D399',
    // Glow effect
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  dotActive: {
    borderColor: '#FFFFFF',
  },
  keypad: {
    width: '100%',
    paddingHorizontal: 30,
    gap: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: 18,
  },
  button: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#2C2C2E',
  },
  buttonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  actionButtonText: {
    fontSize: 22,
    color: '#A2A2A7',
  },
});
