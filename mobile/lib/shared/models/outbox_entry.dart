class OutboxEntry {
  const OutboxEntry({
    required this.clientUuid,
    required this.kind,
    required this.amount,
    required this.occurredAt,
    required this.status,
    required this.attempts,
    required this.createdAt,
    this.marketId,
    this.stallId,
    this.rateId,
    this.typesId,
    this.officerId,
    this.paymentMethod,
    this.payerName,
    this.note,
    this.stallCode,
    this.stallLabel,
    this.nextAttemptAt,
    this.lastError,
    this.serverId,
  });

  static const kindDailyPayment = 'DAILY_PAYMENT';
  static const kindBillPayment = 'BILL_PAYMENT';

  final String clientUuid;
  final String kind;
  final int? marketId;
  final int? stallId;
  final int? rateId;
  final int? typesId;
  final int? officerId;
  final double amount;
  final String? paymentMethod;
  final String? payerName;
  final String? note;
  final DateTime occurredAt;
  final String? stallCode;
  final String? stallLabel;
  final String status;
  final int attempts;
  final DateTime? nextAttemptAt;
  final String? lastError;
  final int? serverId;
  final DateTime createdAt;

  bool get isPending => status == 'pending';
  bool get isFailed => status == 'failed';

  factory OutboxEntry.fromMap(Map<String, dynamic> map) {
    return OutboxEntry(
      clientUuid: map['client_uuid'] as String,
      kind: map['kind'] as String,
      marketId: map['market_id'] as int?,
      stallId: map['stall_id'] as int?,
      rateId: map['rate_id'] as int?,
      typesId: map['types_id'] as int?,
      officerId: map['officer_id'] as int?,
      amount: (map['amount'] as num?)?.toDouble() ?? 0,
      paymentMethod: map['payment_method'] as String?,
      payerName: map['payer_name'] as String?,
      note: map['note'] as String?,
      occurredAt: DateTime.tryParse(map['occurred_at'] as String? ?? '') ?? DateTime.now(),
      stallCode: map['stall_code'] as String?,
      stallLabel: map['stall_label'] as String?,
      status: map['status'] as String? ?? 'pending',
      attempts: map['attempts'] as int? ?? 0,
      nextAttemptAt: DateTime.tryParse(map['next_attempt_at'] as String? ?? ''),
      lastError: map['last_error'] as String?,
      serverId: map['server_id'] as int?,
      createdAt: DateTime.tryParse(map['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'client_uuid': clientUuid,
      'kind': kind,
      'market_id': marketId,
      'stall_id': stallId,
      'rate_id': rateId,
      'types_id': typesId,
      'officer_id': officerId,
      'amount': amount,
      'payment_method': paymentMethod,
      'payer_name': payerName,
      'note': note,
      'occurred_at': occurredAt.toIso8601String(),
      'stall_code': stallCode,
      'stall_label': stallLabel,
      'status': status,
      'attempts': attempts,
      'next_attempt_at': nextAttemptAt?.toIso8601String(),
      'last_error': lastError,
      'server_id': serverId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
