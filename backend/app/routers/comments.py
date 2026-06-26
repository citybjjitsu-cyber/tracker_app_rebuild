from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.database import SessionLocal
from app import models, schemas
from typing import List, Optional
from datetime import datetime, timezone
from app.auth.limiter import limiter, WRITE_LIMIT, READ_LIMIT

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _format_dt(dt) -> Optional[str]:
    if dt is None:
        return None
    return dt.isoformat()


def _comment_to_dict(c) -> dict:
    author = getattr(c, "author", None)
    target = getattr(c, "target_user", None)
    return {
        "id": c.id,
        "comment_uuid": c.comment_uuid,
        "content": c.content,
        "rating": c.rating,
        "parent_comment_id": c.parent_comment_id,
        "created_at": _format_dt(c.created_at),
        "updated_at": _format_dt(c.updated_at),
        "author": _user_to_dict(author) if author else None,
        "target_user": _user_to_dict(target) if target else None,
        "replies": [],
        "reply_count": 0,
    }


def _user_to_dict(u) -> dict:
    return {
        "user_uuid": u.user_uuid,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "rank": u.rank,
        "nicknames": u.nicknames,
        "profile_image_url": u.profile_image_url,
        "image_offset_x": u.image_offset_x,
        "image_offset_y": u.image_offset_y,
        "is_current": u.is_current,
        "effective_date": _format_dt(u.effective_date),
        "created_date": _format_dt(u.created_date),
        "updated_date": _format_dt(u.updated_date),
    }


def _count_all_replies(node: dict) -> int:
    count = len(node.get("replies", []))
    for reply in node.get("replies", []):
        count += _count_all_replies(reply)
    return count


def build_comment_tree(comments) -> List[dict]:
    comment_map = {}
    roots = []

    for c in comments:
        node = _comment_to_dict(c)
        node["replies"] = []
        comment_map[c.id] = node

    for c in comments:
        node = comment_map[c.id]
        pid = c.parent_comment_id
        if pid is None:
            roots.append(node)
        else:
            parent = comment_map.get(pid)
            if parent:
                parent["replies"].append(node)

    def calc_count(n):
        direct = len(n["replies"])
        for r in n["replies"]:
            direct += calc_count(r)
        n["reply_count"] = direct
        return direct

    for root in roots:
        calc_count(root)

    return roots


def _collect_reply_ids(parent_id, db: Session, ids: set):
    replies = db.query(models.Comment).filter(models.Comment.parent_comment_id == parent_id).all()
    for r in replies:
        ids.add(r.id)
        _collect_reply_ids(r.id, db, ids)


@router.post("/", response_model=schemas.CommentResponse)
@limiter.limit(WRITE_LIMIT)
def create_comment(
    request: Request,
    comment: schemas.CommentCreate,
    author_uuid: str = Query(...),
    db: Session = Depends(get_db),
):
    if comment.parent_comment_id:
        parent = db.query(models.Comment).filter(models.Comment.id == comment.parent_comment_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

        db_comment = models.Comment(
            comment_uuid=str(datetime.now(timezone.utc).timestamp()),
            author_uuid=author_uuid,
            content=comment.content,
            rating=None,
            parent_comment_id=comment.parent_comment_id,
        )
    else:
        if not comment.target_user_uuid:
            raise HTTPException(
                status_code=400,
                detail="target_user_uuid is required for top-level posts",
            )

        target_user = db.query(models.User).filter(models.User.user_uuid == comment.target_user_uuid).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")

        db_comment = models.Comment(
            comment_uuid=str(datetime.now(timezone.utc).timestamp()),
            author_uuid=author_uuid,
            content=comment.content,
            rating=comment.rating,
            target_user_uuid=comment.target_user_uuid,
        )

    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)

    db_comment.author = db.query(models.User).filter(models.User.user_uuid == db_comment.author_uuid).first()
    if db_comment.target_user_uuid:
        db_comment.target_user = (
            db.query(models.User).filter(models.User.user_uuid == db_comment.target_user_uuid).first()
        )

    return db_comment


@router.get("/feed", response_model=List[schemas.CommentResponse])
@limiter.limit(READ_LIMIT)
def get_comment_feed(
    request: Request,
    user_uuid: str = Query(...),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Comment)
        .options(
            joinedload(models.Comment.author),
            joinedload(models.Comment.target_user),
        )
        .filter(models.Comment.parent_comment_id.is_(None))
    )

    if role == "student":
        query = query.filter(models.Comment.target_user_uuid == user_uuid)
    elif role == "teacher":
        replied_parent_ids = (
            db.query(models.Comment.parent_comment_id)
            .filter(
                models.Comment.author_uuid == user_uuid,
                models.Comment.parent_comment_id.isnot(None),
            )
            .distinct()
            .subquery()
        )

        query = query.filter(
            or_(
                models.Comment.author_uuid == user_uuid,
                models.Comment.id.in_(replied_parent_ids),
            )
        )
    else:
        query = query.filter(models.Comment.author_uuid == user_uuid)

    comments = query.order_by(models.Comment.created_at.desc()).all()

    all_comment_ids = set()
    for c in comments:
        all_comment_ids.add(c.id)
        _collect_reply_ids(c.id, db, all_comment_ids)

    if all_comment_ids:
        all_comments = (
            db.query(models.Comment)
            .options(
                joinedload(models.Comment.author),
                joinedload(models.Comment.target_user),
            )
            .filter(models.Comment.id.in_(all_comment_ids))
            .all()
        )
    else:
        all_comments = []

    return build_comment_tree(all_comments)


@router.get("/{comment_uuid}", response_model=schemas.CommentResponse)
@limiter.limit(READ_LIMIT)
def get_comment(request: Request, comment_uuid: str, db: Session = Depends(get_db)):
    comment = (
        db.query(models.Comment)
        .options(
            joinedload(models.Comment.author),
            joinedload(models.Comment.target_user),
        )
        .filter(models.Comment.comment_uuid == comment_uuid)
        .first()
    )

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    all_ids = {comment.id}
    _collect_reply_ids(comment.id, db, all_ids)

    all_comments = (
        db.query(models.Comment)
        .options(
            joinedload(models.Comment.author),
            joinedload(models.Comment.target_user),
        )
        .filter(models.Comment.id.in_(all_ids))
        .all()
    )

    tree = build_comment_tree(all_comments)
    return tree[0] if tree else comment


@router.put("/{comment_uuid}", response_model=schemas.CommentResponse)
@limiter.limit(WRITE_LIMIT)
def update_comment(
    request: Request,
    comment_uuid: str,
    update_data: schemas.CommentUpdate,
    author_uuid: str = Query(...),
    db: Session = Depends(get_db),
):
    comment = db.query(models.Comment).filter(models.Comment.comment_uuid == comment_uuid).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_uuid != author_uuid:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    comment.content = update_data.content
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)

    comment.author = db.query(models.User).filter(models.User.user_uuid == comment.author_uuid).first()
    if comment.target_user_uuid:
        comment.target_user = db.query(models.User).filter(models.User.user_uuid == comment.target_user_uuid).first()

    return comment


@router.delete("/{comment_uuid}")
@limiter.limit(WRITE_LIMIT)
def delete_comment(
    request: Request,
    comment_uuid: str,
    author_uuid: str = Query(...),
    db: Session = Depends(get_db),
):
    comment = db.query(models.Comment).filter(models.Comment.comment_uuid == comment_uuid).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_uuid != author_uuid:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    if comment.parent_comment_id is None:
        db.query(models.Comment).filter(models.Comment.parent_comment_id == comment.id).delete(
            synchronize_session=False
        )

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted"}
