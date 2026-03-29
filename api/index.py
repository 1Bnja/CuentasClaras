from decimal import Decimal
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.calculations import calculate_settlements
from api.database import get_db_session, get_engine
from api.models import Base, Event, EventParticipant, Expense, ExpenseParticipant, User


app = FastAPI(title="Cuentas Claras API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateEventRequest(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    creator_name: str = Field(min_length=1, max_length=120)


class AddParticipantRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class AddExpenseRequest(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    amount: Decimal = Field(gt=0)
    paid_by_user_id: int
    participant_user_ids: list[int] = Field(min_length=1)


@app.on_event("startup")
async def startup() -> None:
    engine = get_engine()
    if engine is None:
        return
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/api/health")
async def healthcheck() -> dict:
    return {"ok": True}


@app.post("/api/events")
async def create_event(
    payload: CreateEventRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    event_id = str(uuid4())
    event = Event(id=event_id, title=payload.title.strip())
    creator = User(name=payload.creator_name.strip())

    db.add(event)
    db.add(creator)
    await db.flush()

    membership = EventParticipant(event_id=event_id, user_id=creator.id)
    db.add(membership)

    await db.commit()

    return {"event_id": event_id, "title": event.title, "creator_user_id": creator.id}


@app.post("/api/events/{event_id}/participants")
async def add_participant(
    event_id: str,
    payload: AddParticipantRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    user = User(name=payload.name.strip())
    db.add(user)
    await db.flush()

    db.add(EventParticipant(event_id=event_id, user_id=user.id))
    await db.commit()

    return {"user_id": user.id, "name": user.name}


@app.get("/api/events/{event_id}")
async def get_event(
    event_id: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    participants_query = (
        select(User.id, User.name)
        .join(EventParticipant, EventParticipant.user_id == User.id)
        .where(EventParticipant.event_id == event_id)
        .order_by(User.id.asc())
    )
    participants = [
        {"id": row.id, "name": row.name}
        for row in (await db.execute(participants_query)).all()
    ]

    expenses_query = (
        select(Expense.id, Expense.title, Expense.amount, Expense.paid_by_user_id)
        .where(Expense.event_id == event_id)
        .order_by(Expense.id.desc())
    )
    expenses_rows = (await db.execute(expenses_query)).all()

    expenses = []
    for row in expenses_rows:
        consumer_query = select(ExpenseParticipant.user_id).where(ExpenseParticipant.expense_id == row.id)
        consumers = [r.user_id for r in (await db.execute(consumer_query)).all()]
        expenses.append(
            {
                "id": row.id,
                "title": row.title,
                "amount": float(row.amount),
                "paid_by_user_id": row.paid_by_user_id,
                "participant_user_ids": consumers,
            }
        )

    return {
        "id": event.id,
        "title": event.title,
        "participants": participants,
        "expenses": expenses,
    }


@app.post("/api/events/{event_id}/expenses")
async def add_expense(
    event_id: str,
    payload: AddExpenseRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    participant_ids_query = select(EventParticipant.user_id).where(EventParticipant.event_id == event_id)
    event_participants = {row.user_id for row in (await db.execute(participant_ids_query)).all()}

    if payload.paid_by_user_id not in event_participants:
        raise HTTPException(status_code=400, detail="Payer is not in this event")

    invalid_consumers = [u for u in payload.participant_user_ids if u not in event_participants]
    if invalid_consumers:
        raise HTTPException(status_code=400, detail="One or more consumers are not in this event")

    expense = Expense(
        event_id=event_id,
        title=payload.title.strip(),
        amount=payload.amount,
        paid_by_user_id=payload.paid_by_user_id,
    )
    db.add(expense)
    await db.flush()

    for user_id in payload.participant_user_ids:
        db.add(ExpenseParticipant(expense_id=expense.id, user_id=user_id))

    await db.commit()

    return {"expense_id": expense.id}


@app.get("/api/events/{event_id}/settlements")
async def get_settlements(
    event_id: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    participants_query = select(EventParticipant.user_id).where(EventParticipant.event_id == event_id)
    participant_ids = [row.user_id for row in (await db.execute(participants_query)).all()]

    expenses_query = select(Expense.id, Expense.paid_by_user_id, Expense.amount).where(Expense.event_id == event_id)
    expenses_rows = (await db.execute(expenses_query)).all()

    raw_expenses = []
    for row in expenses_rows:
        consumer_query = select(ExpenseParticipant.user_id).where(ExpenseParticipant.expense_id == row.id)
        consumers = [r.user_id for r in (await db.execute(consumer_query)).all()]
        raw_expenses.append(
            {
                "paid_by_user_id": row.paid_by_user_id,
                "amount": row.amount,
                "participant_user_ids": consumers,
            }
        )

    result = calculate_settlements(participant_ids=participant_ids, expenses=raw_expenses)

    names_query = select(User.id, User.name).where(User.id.in_(participant_ids))
    names_map = {row.id: row.name for row in (await db.execute(names_query)).all()}

    settlement_with_names = [
        {
            **entry,
            "from_user_name": names_map.get(entry["from_user_id"], "Desconocido"),
            "to_user_name": names_map.get(entry["to_user_id"], "Desconocido"),
        }
        for entry in result["settlements"]
    ]

    return {
        "balances": result["balances"],
        "settlements": settlement_with_names,
    }
