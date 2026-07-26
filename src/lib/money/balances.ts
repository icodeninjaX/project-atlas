type Transaction = {
  type: "income" | "expense";
  amountCentavos: number;
};

type Transfer = {
  direction: "in" | "out";
  amountCentavos: number;
};

type BalanceInput = {
  openingBalanceCentavos: number;
  transactions: Transaction[];
  transfers: Transfer[];
};

export function calculateAccountBalance({
  openingBalanceCentavos,
  transactions,
  transfers,
}: BalanceInput): number {
  const transactionDelta = transactions.reduce(
    (total, transaction) =>
      total +
      (transaction.type === "income"
        ? transaction.amountCentavos
        : -transaction.amountCentavos),
    0,
  );
  const transferDelta = transfers.reduce(
    (total, transfer) =>
      total +
      (transfer.direction === "in"
        ? transfer.amountCentavos
        : -transfer.amountCentavos),
    0,
  );

  return openingBalanceCentavos + transactionDelta + transferDelta;
}
