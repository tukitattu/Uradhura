export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  AUTO_APPROVED: 'auto_approved',
  APPROVED: 'approved',
  PARTIALLY_APPROVED: 'partially_approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const ACTIVE_STATUSES = [
  WITHDRAWAL_STATUS.PENDING,
  WITHDRAWAL_STATUS.AUTO_APPROVED,
  WITHDRAWAL_STATUS.APPROVED,
  WITHDRAWAL_STATUS.PARTIALLY_APPROVED,
];

export const WITHDRAWAL_TX = {
  HOLD: 'withdrawal_hold',
  REFUND: 'withdrawal_refund',
} as const;

export const GLOBAL_RULE_ID = 'global';