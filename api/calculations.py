from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP


def _to_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_settlements(participant_ids: list[int], expenses: list[dict]) -> dict:
    """
    Compute asymmetric debt settlements for an event.

    Inputs:
    - participant_ids: every participant in the event.
    - expenses: list of dicts with:
      - paid_by_user_id: int
      - amount: Decimal | float | str
      - participant_user_ids: list[int] (only people who consumed this expense)

    Rules:
    - Each expense is split equally only among marked participants.
    - Payer is credited with full amount paid.
    - Each consuming participant is debited by their share.
    - Final balances are minimized into transfers debtor -> creditor.
    """
    balances = defaultdict(lambda: Decimal("0.00"))

    for user_id in participant_ids:
        balances[user_id] = Decimal("0.00")

    for expense in expenses:
        consumers = expense["participant_user_ids"]
        if not consumers:
            continue

        total_amount = _to_money(Decimal(str(expense["amount"])))
        per_person = _to_money(total_amount / Decimal(len(consumers)))

        # The payer fronted the full payment, so we credit that amount.
        payer_id = expense["paid_by_user_id"]
        balances[payer_id] += total_amount

        # Only selected consumers absorb the cost split.
        for consumer_id in consumers:
            balances[consumer_id] -= per_person

    # Split balances into debtors (negative) and creditors (positive).
    debtors = []
    creditors = []

    for user_id, balance in balances.items():
        normalized = _to_money(balance)
        if normalized < Decimal("0.00"):
            debtors.append([user_id, -normalized])
        elif normalized > Decimal("0.00"):
            creditors.append([user_id, normalized])

    debtors.sort(key=lambda x: x[1], reverse=True)
    creditors.sort(key=lambda x: x[1], reverse=True)

    settlements = []
    i = 0
    j = 0

    # Greedy matching minimizes transfer count in most practical split scenarios.
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt_left = debtors[i]
        creditor_id, credit_left = creditors[j]

        transfer = _to_money(min(debt_left, credit_left))
        if transfer > Decimal("0.00"):
            settlements.append(
                {
                    "from_user_id": debtor_id,
                    "to_user_id": creditor_id,
                    "amount": float(transfer),
                }
            )

        debtors[i][1] = _to_money(debt_left - transfer)
        creditors[j][1] = _to_money(credit_left - transfer)

        if debtors[i][1] <= Decimal("0.00"):
            i += 1
        if creditors[j][1] <= Decimal("0.00"):
            j += 1

    return {
        "balances": {str(user_id): float(_to_money(balance)) for user_id, balance in balances.items()},
        "settlements": settlements,
    }
