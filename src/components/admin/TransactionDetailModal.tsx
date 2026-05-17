'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, X, CreditCard, Calendar, DollarSign, User, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { safeJsonResponse } from '@/lib/safe-json-response';

interface TransactionDetailModalProps {
  paymentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TransactionDetail {
  payment: {
    id: string;
    stripePaymentId: string | null;
    stripeChargeId: string | null;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    cardBrand: string | null;
    cardLastFour: string | null;
    stripeFeeAmount: number | null;
    isDeposit: boolean;
    paidAt: Date | null;
    refundedAt: Date | null;
    refundAmount: number | null;
    reconciliationStatus: string | null;
    reconciliationNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  booking: {
    id: string;
    status: string;
    startTime: Date;
    endTime: Date;
    totalAmount: number;
    depositAmount: number;
    suite: { id: string; name: string };
    waivers: Array<{
      id: string;
      status: string;
      signedAt: Date | null;
      participantName: string;
    }>;
  } | null;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    stripeCustomerId: string | null;
  } | null;
  stripeEvents: Array<{
    id: string;
    eventId: string;
    eventType: string;
    processed: boolean;
    processedAt: Date | null;
    createdAt: Date;
  }>;
  stripeBalances: Array<{
    id: string;
    balanceTransactionId: string;
    type: string;
    amount: number;
    stripeFee: number;
    net: number;
    sourceChargeId: string | null;
    payoutId: string | null;
    payoutArrivalDate: Date | null;
    status: string;
    payout: {
      id: string;
      stripePayoutId: string;
      amount: number;
      status: string;
      arrivedAt: Date | null;
    } | null;
  }>;
  payout: {
    id: string;
    stripePayoutId: string;
    amount: number;
    status: string;
    arrivedAt: Date | null;
  } | null;
  relatedPayments: Array<{
    id: string;
    amount: number;
    status: string;
    isDeposit: boolean;
    paidAt: Date | null;
    refundedAt: Date | null;
    refundAmount: number | null;
    stripePaymentId: string | null;
    stripeChargeId: string | null;
  }>;
  customerPayments: Array<{
    id: string;
    amount: number;
    status: string;
    paidAt: Date | null;
    bookingId: string;
    booking: {
      id: string;
      suite: { name: string };
    };
  }>;
  stripeLinks: Record<string, string>;
}

export function TransactionDetailModal({ paymentId, isOpen, onClose }: TransactionDetailModalProps) {
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/finance/transaction-detail/${paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction detail');
      }
      const data = await safeJsonResponse<TransactionDetail | null>(response, null);
      if (!data) {
        throw new Error('Transaction detail response was empty');
      }
      setDetail(data);
    } catch (err) {
      console.error('Error loading transaction detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (isOpen && paymentId) {
      void loadDetail();
    }
  }, [isOpen, paymentId, loadDetail]);

  function formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  }

  function formatDate(date: Date | null): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  }

  function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'succeeded' || normalizedStatus === 'paid') return 'default';
    if (normalizedStatus === 'refunded') return 'secondary';
    if (normalizedStatus === 'failed' || normalizedStatus === 'canceled') return 'destructive';
    return 'outline';
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold">Transaction Detail</h2>
            <p className="text-sm text-gray-600">Payment ID: {paymentId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading transaction details...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {detail && (
            <div className="space-y-6">
              {/* Stripe Dashboard Links */}
              {Object.keys(detail.stripeLinks).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" />
                      Stripe Dashboard Links
                    </CardTitle>
                    <CardDescription>Open directly in Stripe for investigation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {detail.stripeLinks.charge && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={detail.stripeLinks.charge} target="_blank" rel="noopener noreferrer">
                            <CreditCard className="mr-2 h-4 w-4" />
                            View Charge
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {detail.stripeLinks.paymentIntent && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={detail.stripeLinks.paymentIntent} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" />
                            View Payment Intent
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {detail.stripeLinks.customer && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={detail.stripeLinks.customer} target="_blank" rel="noopener noreferrer">
                            <User className="mr-2 h-4 w-4" />
                            View Customer
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {detail.stripeLinks.payout && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={detail.stripeLinks.payout} target="_blank" rel="noopener noreferrer">
                            <DollarSign className="mr-2 h-4 w-4" />
                            View Payout
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {detail.stripeLinks.balanceTransaction && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={detail.stripeLinks.balanceTransaction} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" />
                            View Balance Transaction
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Amount</div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(detail.payment.amount, detail.payment.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Status</div>
                      <div>
                        <Badge variant={getStatusBadgeVariant(detail.payment.status)}>
                          {detail.payment.status}
                        </Badge>
                      </div>
                    </div>
                    {detail.payment.cardBrand && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Payment Method</div>
                        <div className="capitalize">
                          {detail.payment.cardBrand} •••• {detail.payment.cardLastFour}
                        </div>
                      </div>
                    )}
                    {detail.payment.stripeFeeAmount !== null && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Stripe Fee</div>
                        <div>{formatCurrency(detail.payment.stripeFeeAmount, detail.payment.currency)}</div>
                      </div>
                    )}
                    {detail.payment.paidAt && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Paid At</div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(detail.payment.paidAt)}
                        </div>
                      </div>
                    )}
                    {detail.payment.refundedAt && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Refunded At</div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(detail.payment.refundedAt)}
                        </div>
                      </div>
                    )}
                    {detail.payment.refundAmount !== null && detail.payment.refundAmount > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Refund Amount</div>
                        <div>{formatCurrency(detail.payment.refundAmount, detail.payment.currency)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-500">Type</div>
                      <div>{detail.payment.isDeposit ? 'Deposit' : 'Full Payment'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer & Booking */}
              {detail.customer && (
                <Card>
                  <CardHeader>
                    <CardTitle>Customer & Booking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Customer</div>
                        <div>
                          {detail.customer.firstName} {detail.customer.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{detail.customer.email}</div>
                      </div>
                      {detail.booking && (
                        <>
                          <div>
                            <div className="text-sm font-medium text-gray-500">Suite</div>
                            <div>{detail.booking.suite.name}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-500">Booking Time</div>
                            <div>{formatDate(detail.booking.startTime)}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-500">Booking Status</div>
                            <div>
                              <Badge variant={getStatusBadgeVariant(detail.booking.status)}>
                                {detail.booking.status}
                              </Badge>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payout Information */}
              {detail.payout && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payout Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Payout Amount</div>
                        <div>{formatCurrency(detail.payout.amount)}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Payout Status</div>
                        <div>
                          <Badge variant={getStatusBadgeVariant(detail.payout.status)}>
                            {detail.payout.status}
                          </Badge>
                        </div>
                      </div>
                      {detail.payout.arrivedAt && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Arrived At</div>
                          <div>{formatDate(detail.payout.arrivedAt)}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stripe Events Timeline */}
              {detail.stripeEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Stripe Events Timeline</CardTitle>
                    <CardDescription>Webhook events received for this payment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {detail.stripeEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div>
                            <div className="font-medium">{event.eventType}</div>
                            <div className="text-sm text-gray-600">{formatDate(event.createdAt)}</div>
                          </div>
                          <Badge variant={event.processed ? 'default' : 'outline'}>
                            {event.processed ? 'Processed' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Related Payments */}
              {detail.relatedPayments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Related Payments (Same Booking)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {detail.relatedPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {formatCurrency(payment.amount)} - {payment.isDeposit ? 'Deposit' : 'Full Payment'}
                            </div>
                            <div className="text-sm text-gray-600">{formatDate(payment.paidAt)}</div>
                          </div>
                          <Badge variant={getStatusBadgeVariant(payment.status)}>{payment.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
