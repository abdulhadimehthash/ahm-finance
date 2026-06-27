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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import {
  SavingIcon,
  FoodTravelIcon,
  FunIcon,
  ToolsIcon,
  MinusIcon,
  TrashIcon,
  ArrowLeftIcon,
} from '@/components/SvgIcons';

// Map bucket IDs to metadata (display name, SVG icon component, border/accent color)
const BUCKET_META: Record<
  string,
  { name: string; Icon: React.ComponentType<{ color: string; size: number }>; color: string }
> = {
  saving: { name: 'Saving', Icon: SavingIcon, color: '#10B981' }, // Green
  food_travel: { name: 'Food & Travel', Icon: FoodTravelIcon, color: '#F59E0B' }, // Orange
  fun: { name: 'Fun', Icon: FunIcon, color: '#8B5CF6' }, // Purple
  tools: { name: 'Tools', Icon: ToolsIcon, color: '#3B82F6' }, // Blue
};

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bucket, setBucket] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Deletion modal confirmation states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLaptop = width >= 768;

  const meta = id ? BUCKET_META[id] : null;
  const BucketIconComponent = meta ? meta.Icon : SavingIcon;
  const accentColor = meta ? meta.color : '#CCCCCC';
  const bucketName = meta ? meta.name : 'Detail';

  // Load bucket balance and transaction list from Supabase
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      // 1. Fetch bucket details
      const { data: bucketData, error: bucketError } = await supabase
        .from('buckets')
        .select('*')
        .eq('id', id)
        .single();

      if (bucketError) {
        console.error('Supabase Error - bucket fetch:', {
          message: bucketError.message,
          code: bucketError.code,
          details: bucketError.details,
          hint: bucketError.hint,
        });
        throw bucketError;
      }
      setBucket(bucketData);

      // 2. Fetch expenses (only type = 'expense' for this bucket, newest first)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('bucket', id)
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
      setExpenses(txData || []);
    } catch (error: any) {
      console.error('Error fetching bucket detail data:', error);
      alert(`Error loading data from Supabase: ${error.message || error.code || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Reload data whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Delete individual expense transaction
  const handleDeletePress = (tx: any) => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }
    setSelectedTx(tx);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTx || !bucket) return;
    setDeleteModalVisible(false);
    setLoading(true);

    try {
      const currentBalance = Number(bucket.balance || 0);
      // Cancel the expense -> add the money back to the bucket balance
      const newBalance = currentBalance + Number(selectedTx.amount);

      // 1. Update bucket balance in Supabase
      const { error: updateError } = await supabase
        .from('buckets')
        .update({ balance: newBalance })
        .eq('id', id);

      if (updateError) throw updateError;

      // 2. Delete transaction row in Supabase
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', selectedTx.id);

      if (deleteError) throw deleteError;

      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 30]);
      }

      setSelectedTx(null);
      fetchData();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      alert(`Failed to delete transaction. Error: ${err.message || err.code}`);
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Format date and time
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

  const insets = useSafeAreaInsets();

  if (loading && !refreshing && !deleteModalVisible) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.appContainer, isLaptop && styles.laptopContainer]}>
        <View style={styles.safeArea}>
          {/* Header Row */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
            <TouchableOpacity
              style={styles.backHeaderButton}
              onPress={() => router.replace('/dashboard')}
              activeOpacity={0.6}
            >
              <ArrowLeftIcon color="#FFFFFF" size={22} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <BucketIconComponent color={accentColor} size={20} />
              <Text style={styles.headerTitle}>{bucketName}</Text>
            </View>
            
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
            }
          >
            {/* Big Bucket Balance Card with custom accent glow */}
            <View style={[styles.balanceCard, { shadowColor: accentColor, borderColor: `${accentColor}40` }]}>
              <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(bucket?.balance || 0)}
              </Text>
            </View>

            {/* Expense History Header */}
            <Text style={styles.sectionTitle}>EXPENSE HISTORY</Text>

            {/* Expenses List */}
            <View style={styles.expenseContainer}>
              {expenses.length > 0 ? (
                expenses.map(tx => (
                  <View key={tx.id} style={styles.expenseRow}>
                    <View style={styles.expenseLeft}>
                      <Text style={styles.expenseDate}>{formatDate(tx.created_at)}</Text>
                      <Text style={styles.expenseNote} numberOfLines={2}>
                        {tx.note ? tx.note : 'No note'}
                      </Text>
                    </View>
                    
                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>
                        -{formatCurrency(tx.amount)}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteRowButton}
                        onPress={() => handleDeletePress(tx)}
                        activeOpacity={0.6}
                      >
                        <TrashIcon color="#EF4444" size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noExpensesContainer}>
                  <Text style={styles.noExpensesText}>No expenses yet</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions Bar */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionButton, { backgroundColor: accentColor }]}
              onPress={() => router.push({ pathname: '/log-expense', params: { bucket: id } })}
            >
              <MinusIcon color="#FFFFFF" size={18} />
              <Text style={styles.actionButtonText}>Log Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Delete Confirmation Modal */}
          <Modal
            visible={deleteModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setDeleteModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Delete this expense?</Text>
                <Text style={styles.modalDescription}>
                  This transaction will be removed and the amount will be added back to your {bucketName} balance.
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setDeleteModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton]}
                    onPress={handleDeleteConfirm}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalConfirmText}>Delete</Text>
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
    position: 'relative',
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
  backHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingBottom: 110,
  },
  balanceCard: {
    backgroundColor: '#16161A',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 28,
    // Accent Glow setup dynamically
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  expenseContainer: {
    gap: 12,
  },
  expenseRow: {
    backgroundColor: '#16161A',
    borderColor: '#24242B',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseLeft: {
    flex: 1,
    paddingRight: 16,
    gap: 4,
  },
  expenseDate: {
    fontSize: 11,
    color: '#636366',
  },
  expenseNote: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  deleteRowButton: {
    width: 44, // Meets touch target minimum
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1F1517',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noExpensesContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noExpensesText: {
    fontSize: 14,
    color: '#636366',
    fontStyle: 'italic',
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
    justifyContent: 'center',
  },
  actionButton: {
    width: '100%',
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
