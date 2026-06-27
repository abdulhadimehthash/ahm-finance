import React, { useState } from 'react';
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
  SafeAreaView,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

// Buckets list metadata
const BUCKETS = [
  { id: 'saving', name: 'Saving', color: '#10B981', icon: '💰' },
  { id: 'food_travel', name: 'Food & Travel', color: '#F59E0B', icon: '🍕' },
  { id: 'fun', name: 'Fun', color: '#8B5CF6', icon: '🥳' },
  { id: 'tools', name: 'Tools', color: '#3B82F6', icon: '🛠' },
];

export default function LogExpenseScreen() {
  const [amount, setAmount] = useState('');
  const [selectedBucket, setSelectedBucket] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;

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

      if (fetchError) throw fetchError;
      if (!bucketData) throw new Error('Selected bucket not found.');

      const currentBalance = Number(bucketData.balance || 0);
      const newBalance = currentBalance - numericAmount;

      // 2. Deduct from bucket balance in Supabase
      const { error: updateError } = await supabase
        .from('buckets')
        .update({ balance: newBalance })
        .eq('id', selectedBucket);

      if (updateError) throw updateError;

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

      if (txError) throw txError;

      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 40]);
      }

      // Go back to dashboard on completion
      router.back();
    } catch (err) {
      console.error('Error logging expense:', err);
      alert('Failed to log expense. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Expense</Text>
          <View style={styles.placeholderView} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
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
                  <Text style={styles.bucketIcon}>{bucket.icon}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0C0C0E',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholderView: {
    width: 50,
  },
  scrollContent: {
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
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
    height: 70,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  gridItemDefault: {
    borderColor: '#24242B',
    backgroundColor: '#16161A',
  },
  bucketIcon: {
    fontSize: 20,
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
    height: 52,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 32,
  },
  submitButton: {
    backgroundColor: '#EF4444',
    height: 54,
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
