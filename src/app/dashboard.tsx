import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

// Map bucket IDs to metadata (icon, border color, display name)
const BUCKET_META: Record<string, { name: string; icon: string; color: string }> = {
  saving: { name: 'Saving', icon: '💰', color: '#10B981' }, // Green
  food_travel: { name: 'Food & Travel', icon: '🍕', color: '#F59E0B' }, // Orange
  fun: { name: 'Fun', icon: '🥳', color: '#8B5CF6' }, // Purple
  tools: { name: 'Tools', icon: '🛠️', color: '#3B82F6' }, // Blue
};

export default function DashboardScreen() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLaptop = width >= 768;

  // Load data from Supabase
  const fetchData = async () => {
    try {
      // 1. Fetch buckets
      let { data: bucketsData, error: bucketsError } = await supabase
        .from('buckets')
        .select('*');

      if (bucketsError) {
        console.error('Supabase Error - buckets fetch:', {
          message: bucketsError.message,
          code: bucketsError.code,
          details: bucketsError.details,
          hint: bucketsError.hint,
        });
        throw bucketsError;
      }

      // Self-initialize default buckets in Supabase if empty (robust fallback)
      if (!bucketsData || bucketsData.length === 0) {
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
          console.error('Supabase Error - buckets seed:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          });
          throw insertError;
        }

        // Re-fetch
        const { data: refetchedData, error: refetchError } = await supabase
          .from('buckets')
          .select('*');
        if (refetchError) throw refetchError;
        bucketsData = refetchedData;
      }

      // Sort buckets to preserve order: Saving, Food & Travel, Fun, Tools
      const order = ['saving', 'food_travel', 'fun', 'tools'];
      const sortedBuckets = bucketsData
        ? [...bucketsData].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
        : [];

      setBuckets(sortedBuckets);

      // 2. Fetch expenses (only type = 'expense', newest first)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'expense')
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('Supabase Error - transactions fetch:', {
          message: txError.message,
          code: txError.code,
          details: txError.details,
          hint: txError.hint,
        });
        throw txError;
      }
      setTransactions(txData || []);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      alert(`Error loading data from Supabase: ${error.message || error.code || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload data whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Compute total balance
  const totalBalance = buckets.reduce((sum, b) => sum + Number(b.balance || 0), 0);

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Format date representation
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.appContainer, isLaptop && styles.laptopContainer]}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
            }
          >
            <Text style={styles.headerTitle}>My Finance</Text>

            {/* Consolidate Balance Card */}
            <View style={styles.totalBalanceCard}>
              <Text style={styles.totalBalanceLabel}>TOTAL BALANCE</Text>
              <Text style={styles.totalBalanceValue}>
                {formatCurrency(totalBalance)}
              </Text>
            </View>

            {/* Bucket Stack List */}
            <View style={styles.bucketContainer}>
              {buckets.map(bucket => {
                const meta = BUCKET_META[bucket.id] || {
                  name: bucket.name,
                  icon: '📁',
                  color: '#CCCCCC',
                };
                const bucketExpenses = transactions.filter(t => t.bucket === bucket.id);

                return (
                  <View
                    key={bucket.id}
                    style={[styles.bucketCard, { borderLeftColor: meta.color }]}
                  >
                    {/* Bucket Header Row */}
                    <View style={styles.bucketHeader}>
                      <View style={styles.bucketHeaderLeft}>
                        <Text style={styles.bucketIcon}>{meta.icon}</Text>
                        <Text style={styles.bucketName}>{meta.name}</Text>
                      </View>
                      <Text style={styles.bucketBalance}>
                        {formatCurrency(bucket.balance)}
                      </Text>
                    </View>

                    {/* Expense List inside Bucket */}
                    <View style={styles.expenseSection}>
                      {bucketExpenses.length > 0 ? (
                        bucketExpenses.map(tx => (
                          <View key={tx.id} style={styles.expenseRow}>
                            <View style={styles.expenseRowLeft}>
                              <Text style={styles.expenseNote} numberOfLines={1}>
                                {tx.note ? tx.note : 'No note'}
                              </Text>
                              <Text style={styles.expenseDate}>
                                {formatDate(tx.created_at)}
                              </Text>
                            </View>
                            <Text style={styles.expenseAmount}>
                              -{formatCurrency(tx.amount)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noExpensesText}>No expenses yet</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionButton, styles.incomeButton]}
              onPress={() => router.push('/log-income')}
            >
              <Text style={styles.actionButtonText}>Log Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionButton, styles.expenseButton]}
              onPress={() => router.push('/log-expense')}
            >
              <Text style={styles.actionButtonText}>Log Expense</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#050507', // Dark side background for laptop view
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
    position: 'relative', // Constrains absolute bottom bar inside
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0C0C0E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110, // Prevents bottom action bar overlap
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  totalBalanceCard: {
    backgroundColor: '#16161A',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#24242B',
    marginBottom: 28,
    // Accent Glow
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  totalBalanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  totalBalanceValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bucketContainer: {
    gap: 16,
  },
  bucketCard: {
    backgroundColor: '#16161A',
    borderRadius: 14,
    borderLeftWidth: 5,
    padding: 16,
    borderWidth: 1,
    borderTopColor: '#24242B',
    borderRightColor: '#24242B',
    borderBottomColor: '#24242B',
  },
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#24242B',
    paddingBottom: 12,
    marginBottom: 12,
  },
  bucketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bucketIcon: {
    fontSize: 20,
  },
  bucketName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bucketBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expenseSection: {
    gap: 10,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expenseRowLeft: {
    flex: 1,
    paddingRight: 16,
  },
  expenseNote: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#636366',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444', // Red for expense
  },
  noExpensesText: {
    fontSize: 13,
    color: '#636366',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(12, 12, 14, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#24242B',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // iPhone spacing
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 52, // minimum 48px target met
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  incomeButton: {
    backgroundColor: '#10B981',
  },
  expenseButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
