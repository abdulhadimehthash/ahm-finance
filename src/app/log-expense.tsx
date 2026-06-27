import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Vibration,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import {
  SavingIcon,
  FoodTravelIcon,
  FunIcon,
  ToolsIcon,
  CloseIcon,
} from '@/components/SvgIcons';

// Buckets list metadata with custom SVG components
const BUCKETS = [
  { id: 'saving', name: 'Saving', color: '#10B981', Icon: SavingIcon },
  { id: 'food_travel', name: 'Food & Travel', color: '#F59E0B', Icon: FoodTravelIcon },
  { id: 'fun', name: 'Fun', color: '#8B5CF6', Icon: FunIcon },
  { id: 'tools', name: 'Tools', color: '#3B82F6', Icon: ToolsIcon },
];

export default function LogExpenseScreen() {
  const { bucket: preselectedBucket } = useLocalSearchParams<{ bucket: string }>();
  const [amount, setAmount] = useState('');
  const [selectedBucket, setSelectedBucket] = useState(preselectedBucket || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLaptop = width >= 768;

  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;

  // Auto-verify that buckets exist on load (prevent foreign key crash if opened directly)
  useEffect(() => {
    const checkAndInitBuckets = async () => {
      try {
        const { data, error } = await supabase.from('buckets').select('id');
        if (error) {
          console.error('Supabase Error - check buckets on expense mount:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }

        if (!data || data.length === 0) {
          const defaultBuckets = [
            { id: 'saving', name: 'Saving', balance: 0 },
            { id: 'food_travel', name: 'Food & Travel', balance: 0 },
            { id: 'fun', name: 'Fun', balance: 0 },
            { id: 'tools', name: 'Tools', balance: 0 },
          ];
          const { error: insertError } = await supabase
            .from('buckets')
            .insert(defaultBuckets);

          if (insertError) {
            console.error('Supabase Error - seed buckets on expense mount:', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint,
            });
            throw insertError;
          }
        }
      } catch (err) {
        console.error('Error verifying buckets on mount:', err);
      }
    };

    checkAndInitBuckets();
  }, []);

  const handleConfirm = async () => {
    if (numericAmount <= 0 || !selectedBucket) return;

    setLoading(true);
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }

    try {
      // 1. Fetch current balance for the selected bucket
      const { data: bucketData, error: fetchError } = await supabase
        .from('buckets')
        .select('balance')
        .eq('id', selectedBucket)
        .single();

      if (fetchError) {
        console.error('Supabase Error - fetch bucket balance:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
        });
        throw fetchError;
      }
      
      if (!bucketData) throw new Error('Selected bucket was not found.');

      const currentBalance = Number(bucketData.balance || 0);
      const newBalance = currentBalance - numericAmount;

      // 2. Deduct from bucket balance in Supabase
      const { error: updateError } = await supabase
        .from('buckets')
        .update({ balance: newBalance })
        .eq('id', selectedBucket);

      if (updateError) {
        console.error('Supabase Error - update bucket balance:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw updateError;
      }

      // 3. Save transaction row with type = expense
      const { error: txError } = await supabase
        .from('transactions')
        .insert([
          {
            type: 'expense',
            amount: numericAmount,
            bucket: selectedBucket,
            note: note.trim() || null,
          },
        ]);

      if (txError) {
        console.error('Supabase Error - log expense transaction:', {
          message: txError.message,
          code: txError.code,
          details: txError.details,
          hint: txError.hint,
        });
        throw txError;
      }

      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 40]);
      }

      // Go back to dashboard on completion
      router.replace('/dashboard');
    } catch (err: any) {
      console.error('Error logging expense:', err);
      alert(`Failed to log expense. Error: ${err.message || err.code || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.appContainer, isLaptop && styles.laptopContainer]}>
        <View style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            {/* Header bar */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
              <TouchableOpacity style={styles.closeButton} onPress={() => router.replace('/dashboard')}>
                <CloseIcon color="#8E8E93" size={22} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Log Expense</Text>
              <View style={styles.placeholderView} />
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              {/* Amount input */}
              <View style={styles.inputContainer}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#24242B"
                  value={amount}
                  onChangeText={text => setAmount(text.replace(/[^0-9.]/g, ''))}
                  autoFocus
                  editable={!loading}
                />
              </View>

              {/* Bucket selection */}
              <Text style={styles.sectionTitle}>SELECT BUCKET</Text>
              <View style={styles.grid}>
                {BUCKETS.map(bucket => {
                  const isSelected = selectedBucket === bucket.id;
                  const BucketIconComponent = bucket.Icon;
                  return (
                    <TouchableOpacity
                      key={bucket.id}
                      activeOpacity={0.7}
                      style={[
                        styles.gridItem,
                        isSelected
                          ? { borderColor: bucket.color, backgroundColor: `${bucket.color}15` }
                          : styles.gridItemDefault,
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          Vibration.vibrate(5);
                        }
                        setSelectedBucket(bucket.id);
                      }}
                      disabled={loading}
                    >
                      <BucketIconComponent color={isSelected ? bucket.color : '#8E8E93'} size={20} />
                      <Text style={styles.bucketName}>{bucket.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional notes input */}
              <Text style={styles.sectionTitle}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="What was this expense for?"
                placeholderTextColor="#636366"
                value={note}
                onChangeText={setNote}
                maxLength={100}
                editable={!loading}
              />

              {/* Submit button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (numericAmount <= 0 || !selectedBucket) && styles.disabledButton,
                ]}
                onPress={handleConfirm}
                disabled={numericAmount <= 0 || !selectedBucket || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Log Expense</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#050507',
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 56, // touch targets height met
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  closeButton: {
    width: 44, // Touch target met
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholderView: {
    width: 44,
  },
  scrollContent: {
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 25,
  },
  currencyPrefix: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 150,
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  gridItem: {
    width: '48%',
    height: 60, // meets touch targets constraint (minimum 48px height)
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  gridItemDefault: {
    borderColor: '#24242B',
    backgroundColor: '#16161A',
  },
  bucketName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  noteInput: {
    backgroundColor: '#16161A',
    borderColor: '#24242B',
    borderWidth: 1,
    borderRadius: 12,
    height: 52, // meets touch targets constraint (minimum 48px height)
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 32,
  },
  submitButton: {
    backgroundColor: '#EF4444',
    height: 54, // meets touch targets constraint
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#1C1C1E',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
