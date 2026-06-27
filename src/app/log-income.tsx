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

// Split percentages defined in specification
const SPLITS = {
  saving: { name: 'Saving', percent: 0.40, color: '#10B981', icon: '💰' },
  food_travel: { name: 'Food & Travel', percent: 0.35, color: '#F59E0B', icon: '🍕' },
  fun: { name: 'Fun', percent: 0.15, color: '#8B5CF6', icon: '🥳' },
  tools: { name: 'Tools', percent: 0.10, color: '#3B82F6', icon: '🛠' },
};

export default function LogIncomeScreen() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;

  // Formatting helper for currency in split breakdown
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleConfirm = async () => {
    if (numericAmount <= 0) return;

    setLoading(true);
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }

    try {
      // 1. Fetch current balances for the buckets
      const { data: bucketsData, error: fetchError } = await supabase
        .from('buckets')
        .select('id, name, balance');

      if (fetchError) throw fetchError;
      if (!bucketsData) throw new Error('No buckets found to split income.');

      // Calculate updates
      const savingSplit = Math.round(numericAmount * SPLITS.saving.percent);
      const foodTravelSplit = Math.round(numericAmount * SPLITS.food_travel.percent);
      const funSplit = Math.round(numericAmount * SPLITS.fun.percent);
      const toolsSplit = Math.round(numericAmount * SPLITS.tools.percent);

      const bucketMap = new Map(bucketsData.map(b => [b.id, Number(b.balance || 0)]));

      // Calculate new balances
      const updates = [
        { id: 'saving', name: 'Saving', balance: (bucketMap.get('saving') || 0) + savingSplit },
        { id: 'food_travel', name: 'Food & Travel', balance: (bucketMap.get('food_travel') || 0) + foodTravelSplit },
        { id: 'fun', name: 'Fun', balance: (bucketMap.get('fun') || 0) + funSplit },
        { id: 'tools', name: 'Tools', balance: (bucketMap.get('tools') || 0) + toolsSplit },
      ];

      // 2. Bulk update bucket balances in Supabase
      const { error: updateError } = await supabase
        .from('buckets')
        .upsert(updates);

      if (updateError) throw updateError;

      // 3. Log 4 transaction rows (one per bucket, type = income)
      const transactions = [
        { type: 'income', amount: savingSplit, bucket: 'saving', note: `Income Split (${SPLITS.saving.percent * 100}%)` },
        { type: 'income', amount: foodTravelSplit, bucket: 'food_travel', note: `Income Split (${SPLITS.food_travel.percent * 100}%)` },
        { type: 'income', amount: funSplit, bucket: 'fun', note: `Income Split (${SPLITS.fun.percent * 100}%)` },
        { type: 'income', amount: toolsSplit, bucket: 'tools', note: `Income Split (${SPLITS.tools.percent * 100}%)` },
      ];

      const { error: txError } = await supabase
        .from('transactions')
        .insert(transactions);

      if (txError) throw txError;

      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 40]);
      }
      
      // Go back to dashboard on completion
      router.back();
    } catch (err) {
      console.error('Error logging income:', err);
      alert('Failed to log income. Please check connection and try again.');
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Income</Text>
          <View style={styles.placeholderView} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
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

          <Text style={styles.breakdownTitle}>AUTO SPLIT BREAKDOWN</Text>

          <View style={styles.breakdownCard}>
            {/* Saving */}
            <View style={styles.splitRow}>
              <View style={styles.splitLeft}>
                <Text style={styles.splitIcon}>{SPLITS.saving.icon}</Text>
                <Text style={styles.splitName}>{SPLITS.saving.name}</Text>
                <Text style={styles.splitPercent}>{SPLITS.saving.percent * 100}%</Text>
              </View>
              <Text style={[styles.splitAmount, { color: SPLITS.saving.color }]}>
                {formatCurrency(numericAmount * SPLITS.saving.percent)}
              </Text>
            </View>

            {/* Food & Travel */}
            <View style={styles.splitRow}>
              <View style={styles.splitLeft}>
                <Text style={styles.splitIcon}>{SPLITS.food_travel.icon}</Text>
                <Text style={styles.splitName}>{SPLITS.food_travel.name}</Text>
                <Text style={styles.splitPercent}>{SPLITS.food_travel.percent * 100}%</Text>
              </View>
              <Text style={[styles.splitAmount, { color: SPLITS.food_travel.color }]}>
                {formatCurrency(numericAmount * SPLITS.food_travel.percent)}
              </Text>
            </View>

            {/* Fun */}
            <View style={styles.splitRow}>
              <View style={styles.splitLeft}>
                <Text style={styles.splitIcon}>{SPLITS.fun.icon}</Text>
                <Text style={styles.splitName}>{SPLITS.fun.name}</Text>
                <Text style={styles.splitPercent}>{SPLITS.fun.percent * 100}%</Text>
              </View>
              <Text style={[styles.splitAmount, { color: SPLITS.fun.color }]}>
                {formatCurrency(numericAmount * SPLITS.fun.percent)}
              </Text>
            </View>

            {/* Tools */}
            <View style={[styles.splitRow, styles.lastSplitRow]}>
              <View style={styles.splitLeft}>
                <Text style={styles.splitIcon}>{SPLITS.tools.icon}</Text>
                <Text style={styles.splitName}>{SPLITS.tools.name}</Text>
                <Text style={styles.splitPercent}>{SPLITS.tools.percent * 100}%</Text>
              </View>
              <Text style={[styles.splitAmount, { color: SPLITS.tools.color }]}>
                {formatCurrency(numericAmount * SPLITS.tools.percent)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, numericAmount <= 0 && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={numericAmount <= 0 || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Split & Log Income</Text>
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
    marginVertical: 40,
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
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  breakdownCard: {
    backgroundColor: '#16161A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24242B',
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#24242B',
  },
  lastSplitRow: {
    borderBottomWidth: 0,
  },
  splitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  splitName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  splitPercent: {
    fontSize: 12,
    color: '#636366',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  splitAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#10B981',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
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
