from django.db import transaction
from django.utils import timezone

# Every key maps to the set of statuses it may legally transition INTO.
VALID_TRANSITIONS = {
    'pending_payment': {'funded', 'cancelled'},
    'funded':          {'delivered', 'cancelled'},
    'delivered':       {'approved', 'rejected'},
    'approved':        {'released'},
    'rejected':        {'cancelled'},
    'released':        set(),
    'cancelled':       set(),
}


class IllegalTransition(Exception):
    pass


def transition(order, to_status):
    """
    Move order to to_status atomically.
    Raises IllegalTransition (HTTP 409 callers) if the move is not in the table.
    Sets the matching timestamp field as a side-effect.
    """
    allowed = VALID_TRANSITIONS.get(order.status, set())
    if to_status not in allowed:
        raise IllegalTransition(
            f'Cannot transition from {order.status!r} to {to_status!r}.'
        )

    with transaction.atomic():
        now = timezone.now()
        order.status = to_status

        if to_status == 'funded':
            order.paid_at = now
        elif to_status == 'delivered':
            order.delivered_at = now
        elif to_status == 'approved':
            order.approved_at = now
        elif to_status == 'released':
            order.released_at = now
        elif to_status == 'cancelled':
            order.cancelled_at = now

        order.save()

    return order
