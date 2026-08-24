from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.holiday.model import HolidayList, Holiday
from app.modules.holiday.schema import HolidayListCreate, HolidayListUpdate


def list_holiday_lists(db: Session, skip: int = 0, limit: int = 100, company_id: int | None = None):
    query = db.query(HolidayList)
    if company_id:
        query = query.filter(HolidayList.company_id == company_id)
    return query.offset(skip).limit(limit).all()


def get_holiday_list(db: Session, holiday_list_id: int) -> HolidayList:
    holiday_list = db.query(HolidayList).filter(HolidayList.id == holiday_list_id).first()
    if not holiday_list:
        raise NotFoundError("Holiday list not found")
    return holiday_list


def create_holiday_list(db: Session, payload: HolidayListCreate) -> HolidayList:
    holiday_list = HolidayList(
        name=payload.name,
        company_id=payload.company_id,
        from_date=payload.from_date,
        to_date=payload.to_date,
    )
    for item in payload.holidays:
        holiday_list.holidays.append(
            Holiday(holiday_date=item.holiday_date, description=item.description)
        )
    db.add(holiday_list)
    db.commit()
    db.refresh(holiday_list)
    return holiday_list


def add_holiday(db: Session, holiday_list_id: int, item) -> HolidayList:
    holiday_list = get_holiday_list(db, holiday_list_id)
    holiday_list.holidays.append(
        Holiday(holiday_date=item.holiday_date, description=item.description)
    )
    db.commit()
    db.refresh(holiday_list)
    return holiday_list


def update_holiday_list(db: Session, holiday_list_id: int, payload: HolidayListUpdate) -> HolidayList:
    holiday_list = get_holiday_list(db, holiday_list_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(holiday_list, field, value)
    db.commit()
    db.refresh(holiday_list)
    return holiday_list


def delete_holiday_list(db: Session, holiday_list_id: int) -> None:
    holiday_list = get_holiday_list(db, holiday_list_id)
    db.delete(holiday_list)
    db.commit()


def is_holiday(db: Session, holiday_list_id: int, check_date) -> bool:
    return (
        db.query(Holiday)
        .filter(Holiday.holiday_list_id == holiday_list_id, Holiday.holiday_date == check_date)
        .first()
        is not None
    )
