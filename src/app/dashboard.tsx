import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Modal,
  Vibration,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import {
  SavingIcon,
  FoodTravelIcon,
  FunIcon,
  ToolsIcon,
  PlusIcon,
  MinusIcon,
  ResetIcon,
} from '@/components/SvgIcons';

// Map bucket IDs to metadata (display name, SVG icon component, border color)
const BUCKET_META: Record<
  string,
  { name: string; Icon: React.ComponentType<{ color: string; size: number }>; color: string }
> = {
  saving: { name: 'Saving', Icon: SavingIcon, color: '#10B981' }, // Green
  food_travel: { name: 'Food & Travel', Icon: FoodTravelIcon, color: '#F59E0B' }, // Orange
  fun: { name: 'Fun', Icon: FunIcon, color: '#8B5CF6' }, // Purple
  tools: { name: 'Tools', Icon: ToolsIcon, color: '#3B82F6' }, // Blue
};

export default function DashboardScreen() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal confirmation states
  const [resetModalVisible, setResetModalVisible] = useState(false);

  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLaptop = width >= 768;

  // Load data from Supabase (only buckets table needed for dashboard now)
  const fetchData = async () => {
    try {
      // Fetch buckets
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

  // Reset Everything (Balances to 0 and deletes all transaction logs)
  const handleResetConfirm = async () => {
    setResetModalVisible(false);
    setLoading(true);

    try {
      // 1. Delete all rows in transactions table
      const { error: txDeleteError } = await supabase
        .from('transactions')
        .delete()
        .neq('type', 'invalid'); // matches all types ('income' or 'expense')

      if (txDeleteError) throw txDeleteError;

      // 2. Reset all bucket balances to 0
      const { error: bucketResetError } = await supabase
        .from('buckets')
        .update({ balance: 0 })
        .neq('id', 'invalid'); // matches all bucket IDs

      if (bucketResetError) throw bucketResetError;

      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 80]);
      }

      fetchData();
    } catch (err: any) {
      console.error('Error resetting database:', err);
      alert(`Failed to reset everything. Error: ${err.message || err.code}`);
      setLoading(false);
    }
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

  const insets = useSafeAreaInsets();

  if (loading && !refreshing && !resetModalVisible) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.appContainer, isLaptop && styles.laptopContainer]}>
        <View style={styles.safeArea}>
          {/* Header Row with reset button on the left */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
            <TouchableOpacity
              style={styles.resetHeaderButton}
              onPress={() => setResetModalVisible(true)}
              activeOpacity={0.6}
            >
              <ResetIcon color="#EF4444" size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Finance</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
            }
          >
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
                  Icon: SavingIcon,
                  color: '#CCCCCC',
                };
                const BucketIconComponent = meta.Icon;

                return (
                  <TouchableOpacity
                    key={bucket.id}
                    activeOpacity={0.7}
                    style={[styles.bucketCard, { borderLeftColor: meta.color }]}
                    onPress={() => router.push(`/bucket/${bucket.id}`)}
                  >
                    <View style={styles.bucketContent}>
                      <View style={styles.bucketLeft}>
                        <BucketIconComponent color={meta.color} size={22} />
                        <Text style={styles.bucketName}>{meta.name}</Text>
                      </View>
                      <Text style={styles.bucketBalance}>
                        {formatCurrency(bucket.balance)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions Bar */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionButton, styles.incomeButton]}
              onPress={() => router.push('/log-income')}
            >
              <PlusIcon color="#FFFFFF" size={18} />
              <Text style={styles.actionButtonText}>Log Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionButton, styles.expenseButton]}
              onPress={() => router.push('/log-expense')}
            >
              <MinusIcon color="#FFFFFF" size={18} />
              <Text style={styles.actionButtonText}>Log Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Reset All Balances Modal */}
          <Modal
            visible={resetModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setResetModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Reset everything?</Text>
                <Text style={styles.modalDescription}>
                  All transactions and balances will be cleared. This cannot be undone.
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setResetModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton]}
                    onPress={handleResetConfirm}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalConfirmText}>Reset Everything</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  resetHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110, // Prevents bottom action bar overlap
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
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#24242B',
  },
  bucketContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(12, 12, 14, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#24242B',
    paddingTop: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#16161A',
    borderColor: '#24242B',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#2C2C2E',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: '#EF4444',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
