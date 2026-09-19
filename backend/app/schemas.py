from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr

Status = Literal["Applied", "Interview", "Offer", "Rejected"]

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr

    model_config = {"from_attributes": True}

class ApplicationCreate(BaseModel):
    company: str
    role: str
    link: Optional[str] = None
    status: Status = "Applied"
    notes: Optional[str] = None

class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    link: Optional[str] = None
    status: Optional[Status] = None
    notes: Optional[str] = None

class ApplicationOut(ApplicationCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}