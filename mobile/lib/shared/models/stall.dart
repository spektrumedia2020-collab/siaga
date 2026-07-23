class Stall {
  final int? id;
  final String? code;
  final String? number;
  final int? ownerId;
  final String? ownerName;
  final String? location;
  final String? retributionType;

  Stall({
    this.id,
    this.code,
    this.number,
    this.ownerId,
    this.ownerName,
    this.location,
    this.retributionType,
  });

  factory Stall.fromJson(Map<String, dynamic> json) {
    return Stall(
      id: json['id'] as int?,
      code: json['code'] as String?,
      number: json['number'] as String?,
      ownerId: json['owner_id'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'number': number,
      'owner_id': ownerId,
    };
  }

  Stall copyWith({
    int? id,
    String? code,
    String? number,
    int? ownerId,
    String? ownerName,
    String? location,
    String? retributionType,
  }) {
    return Stall(
      id: id ?? this.id,
      code: code ?? this.code,
      number: number ?? this.number,
      ownerId: ownerId ?? this.ownerId,
      ownerName: ownerName ?? this.ownerName,
      location: location ?? this.location,
      retributionType: retributionType ?? this.retributionType,
    );
  }
}

class Transaction {
  final int? id;
  final int stallId;
  final String payerName;
  final double amount;
  final String paymentMethod;
  final String status;
  final String? note;
  final DateTime? createdAt;

  Transaction({
    this.id,
    required this.stallId,
    required this.payerName,
    required this.amount,
    required this.paymentMethod,
    required this.status,
    this.note,
    this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as int?,
      stallId: (json['stall_id'] as int?) ?? 0,
      payerName: json['payer_name'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['payment_method'] as String? ?? 'Tunai',
      status: json['status'] as String? ?? 'pending',
      note: json['note'] as String?,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'stall_id': stallId,
      'payer_name': payerName,
      'amount': amount,
      'payment_method': paymentMethod,
      'status': status,
      'note': note,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}

class Officer {
  final int? id;
  final String? code;
  final String? name;
  final String? phone;
  final int? marketId;

  Officer({
    this.id,
    this.code,
    this.name,
    this.phone,
    this.marketId,
  });

  factory Officer.fromJson(Map<String, dynamic> json) {
    return Officer(
      id: json['id'] as int?,
      code: json['code'] as String?,
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      marketId: json['market_id'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name': name,
      'phone': phone,
      'market_id': marketId,
    };
  }
}