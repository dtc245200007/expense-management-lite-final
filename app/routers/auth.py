from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserOut, Token
from app.core.security import hash_password, verify_password, create_access_token, pwd_context
from app.core.normalization import canonicalize_identity, normalize_identity
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    username = canonicalize_identity(payload.username)
    username_normalized = normalize_identity(username)
    email = normalize_identity(str(payload.email))
    email_normalized = email
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Tên đăng nhập phải có ít nhất 3 ký tự.")

    existing_username = db.query(User).filter(User.username_normalized == username_normalized).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại.")

    existing_email = db.query(User).filter(
        (User.email_normalized == email_normalized) | (User.username_normalized == email_normalized)
    ).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email đã được sử dụng.")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc email đã được sử dụng.") from exc
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    identifier = normalize_identity(form_data.username)
    # Email owns its namespace. Older usernames containing @ remain usable via
    # their account's email even if historical data contains a collision.
    user = db.query(User).filter(User.email_normalized == identifier).first() if "@" in identifier else None
    if user is None:
        user = db.query(User).filter(User.username_normalized == identifier).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập, email hoặc mật khẩu không đúng.",
        )
    if pwd_context.needs_update(user.password_hash):
        user.password_hash = hash_password(form_data.password)
        db.commit()
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
