from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionOut
from app.core.deps import get_current_user
from datetime import date
import uuid

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("/", response_model=List[TransactionOut])
def list_transactions(
    category_id: Optional[str] = None,
    type: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if type:
        query = query.filter(Transaction.type == type)
    if from_date:
        query = query.filter(Transaction.txn_date >= from_date)
    if to_date:
        query = query.filter(Transaction.txn_date <= to_date)
    if keyword:
        query = query.filter(Transaction.note.ilike(f"%{keyword}%"))
    return query.order_by(Transaction.txn_date.desc()).all()

@router.post("/", response_model=TransactionOut)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    category = db.query(Category).filter(Category.id == payload.category_id, Category.user_id == current_user.id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại hoặc không thuộc về bạn")

    transaction = Transaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        category_id=payload.category_id,
        amount=payload.amount,
        type=category.type,   # lấy type từ category, không tin tưởng type client gửi lên
        txn_date=payload.txn_date,
        note=payload.note,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(transaction_id: str, payload: TransactionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    updates = payload.model_dump(exclude_unset=True)
    if "category_id" in updates:
        category = db.query(Category).filter(
            Category.id == updates["category_id"],
            Category.user_id == current_user.id,
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Danh mục không tồn tại hoặc không thuộc về bạn")
        transaction.type = category.type

    for key, value in updates.items():
        setattr(transaction, key, value)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    db.delete(transaction)
    db.commit()
    return {"message": "Đã xóa giao dịch"}
