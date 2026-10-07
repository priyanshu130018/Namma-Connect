"""PostgreSQL-backed persistent checkpointing for LangGraph agent.

Ensures that agent execution state and multi-turn workflows are stored in
relational database tables rather than volatile Python in-memory process caches.
Supports PostgreSQL in production and SQLite in testing environments.
Thread-safe across async and worker thread pools.
"""

from contextlib import contextmanager
from datetime import datetime
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Sequence, Tuple, Union
from sqlalchemy import Column, DateTime, Integer, LargeBinary, String, and_, desc
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from langgraph.checkpoint.base import (
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
    RunnableConfig,
    get_checkpoint_id,
    get_checkpoint_metadata,
)
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer


WRITES_IDX_MAP = {
    "__start__": -1,
    "__error__": -2,
}


class AICheckpointRecord(Base):
    """Authoritative checkpoint records for LangGraph agent threads."""

    __tablename__ = "ai_agent_checkpoints"

    thread_id = Column(String(255), primary_key=True, nullable=False, index=True)
    checkpoint_ns = Column(String(255), primary_key=True, default="", nullable=False)
    checkpoint_id = Column(String(255), primary_key=True, nullable=False, index=True)
    parent_checkpoint_id = Column(String(255), nullable=True)
    checkpoint_type = Column(String(64), nullable=False, default="json")
    checkpoint_bytes = Column(LargeBinary, nullable=False)
    metadata_type = Column(String(64), nullable=False, default="json")
    metadata_bytes = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AICheckpointBlobRecord(Base):
    """Channel blob storage for checkpoint state channels."""

    __tablename__ = "ai_agent_checkpoint_blobs"

    thread_id = Column(String(255), primary_key=True, nullable=False, index=True)
    checkpoint_ns = Column(String(255), primary_key=True, default="", nullable=False)
    channel = Column(String(255), primary_key=True, nullable=False)
    version = Column(String(255), primary_key=True, nullable=False)
    type = Column(String(64), nullable=False, default="json")
    blob = Column(LargeBinary, nullable=False)


class AICheckpointWriteRecord(Base):
    """Pending writes storage for LangGraph tasks and operations."""

    __tablename__ = "ai_agent_checkpoint_writes"

    thread_id = Column(String(255), primary_key=True, nullable=False, index=True)
    checkpoint_ns = Column(String(255), primary_key=True, default="", nullable=False)
    checkpoint_id = Column(String(255), primary_key=True, nullable=False, index=True)
    task_id = Column(String(255), primary_key=True, nullable=False)
    idx = Column(Integer, primary_key=True, nullable=False)
    channel = Column(String(255), nullable=False)
    type = Column(String(64), nullable=False, default="json")
    blob = Column(LargeBinary, nullable=False)
    task_path = Column(String(255), default="", nullable=False)


import threading

class SQLAlchemyCheckpointSaver(BaseCheckpointSaver):
    """Thread-safe SQLAlchemy implementation of BaseCheckpointSaver for PostgreSQL / SQLite."""

    _lock = threading.RLock()

    def __init__(
        self,
        db_or_factory: Union[Session, sessionmaker, Engine],
        serde: Optional[JsonPlusSerializer] = None,
    ):
        super().__init__(serde=serde or JsonPlusSerializer())
        if isinstance(db_or_factory, sessionmaker):
            self.session_factory = db_or_factory
            self.db = None
        elif isinstance(db_or_factory, Engine):
            self.session_factory = sessionmaker(bind=db_or_factory, autoflush=False, autocommit=False)
            self.db = None
        elif hasattr(db_or_factory, "get_bind"):
            engine = db_or_factory.get_bind()
            if engine and engine.dialect.name == "sqlite":
                self.session_factory = None
                self.db = db_or_factory
            else:
                self.session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
                self.db = None
        else:
            self.session_factory = None
            self.db = db_or_factory

    @contextmanager
    def _session_scope(self) -> Iterator[Session]:
        """Provide a thread-safe transactional session scope."""
        with self._lock:
            if self.session_factory:
                session = self.session_factory()
                try:
                    yield session
                    session.commit()
                except Exception:
                    session.rollback()
                    raise
                finally:
                    session.close()
            else:
                try:
                    yield self.db
                    if self.db.is_active:
                        self.db.flush()
                except Exception:
                    raise


    def _load_blobs(self, session: Session, thread_id: str, checkpoint_ns: str, versions: ChannelVersions) -> Dict[str, Any]:
        if not versions:
            return {}
        result = {}
        for k, v in versions.items():
            record = (
                session.query(AICheckpointBlobRecord)
                .filter(
                    AICheckpointBlobRecord.thread_id == str(thread_id),
                    AICheckpointBlobRecord.checkpoint_ns == str(checkpoint_ns),
                    AICheckpointBlobRecord.channel == str(k),
                    AICheckpointBlobRecord.version == str(v),
                )
                .first()
            )
            if record and record.blob:
                try:
                    result[k] = self.serde.loads_typed((record.type, record.blob))
                except Exception:
                    result[k] = None
            else:
                result[k] = None
        return result

    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        thread_id: str = str(config["configurable"]["thread_id"])
        checkpoint_ns: str = str(config["configurable"].get("checkpoint_ns", ""))
        checkpoint_id = get_checkpoint_id(config)

        with self._session_scope() as session:
            q = session.query(AICheckpointRecord).filter(
                AICheckpointRecord.thread_id == thread_id,
                AICheckpointRecord.checkpoint_ns == checkpoint_ns,
            )
            if checkpoint_id:
                record = q.filter(AICheckpointRecord.checkpoint_id == str(checkpoint_id)).first()
            else:
                record = q.order_by(desc(AICheckpointRecord.created_at), desc(AICheckpointRecord.checkpoint_id)).first()

            if not record:
                return None

            cp_id = record.checkpoint_id
            checkpoint_: Checkpoint = self.serde.loads_typed((record.checkpoint_type, record.checkpoint_bytes))
            metadata_ = self.serde.loads_typed((record.metadata_type, record.metadata_bytes))

            write_records = (
                session.query(AICheckpointWriteRecord)
                .filter(
                    AICheckpointWriteRecord.thread_id == thread_id,
                    AICheckpointWriteRecord.checkpoint_ns == checkpoint_ns,
                    AICheckpointWriteRecord.checkpoint_id == cp_id,
                )
                .all()
            )
            pending_writes = [
                (w.task_id, w.channel, self.serde.loads_typed((w.type, w.blob)))
                for w in write_records
            ]

            channel_values = self._load_blobs(session, thread_id, checkpoint_ns, checkpoint_.get("channel_versions", {}))

            return CheckpointTuple(
                config={
                    "configurable": {
                        "thread_id": thread_id,
                        "checkpoint_ns": checkpoint_ns,
                        "checkpoint_id": cp_id,
                    }
                },
                checkpoint={
                    **checkpoint_,
                    "channel_values": channel_values,
                },
                metadata=metadata_,
                pending_writes=pending_writes,
                parent_config=(
                    {
                        "configurable": {
                            "thread_id": thread_id,
                            "checkpoint_ns": checkpoint_ns,
                            "checkpoint_id": record.parent_checkpoint_id,
                        }
                    }
                    if record.parent_checkpoint_id
                    else None
                ),
            )

    def list(
        self,
        config: Optional[RunnableConfig],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        if not config:
            return
        thread_id: str = str(config["configurable"]["thread_id"])
        checkpoint_ns: str = str(config["configurable"].get("checkpoint_ns", ""))

        with self._session_scope() as session:
            q = session.query(AICheckpointRecord).filter(
                AICheckpointRecord.thread_id == thread_id,
                AICheckpointRecord.checkpoint_ns == checkpoint_ns,
            )
            if before and (before_id := get_checkpoint_id(before)):
                q = q.filter(AICheckpointRecord.checkpoint_id < str(before_id))

            q = q.order_by(desc(AICheckpointRecord.checkpoint_id))
            if limit:
                q = q.limit(limit)

            records = q.all()
            for record in records:
                checkpoint_: Checkpoint = self.serde.loads_typed((record.checkpoint_type, record.checkpoint_bytes))
                metadata_ = self.serde.loads_typed((record.metadata_type, record.metadata_bytes))
                channel_values = self._load_blobs(session, thread_id, checkpoint_ns, checkpoint_.get("channel_versions", {}))
                yield CheckpointTuple(
                    config={
                        "configurable": {
                            "thread_id": thread_id,
                            "checkpoint_ns": checkpoint_ns,
                            "checkpoint_id": record.checkpoint_id,
                        }
                    },
                    checkpoint={**checkpoint_, "channel_values": channel_values},
                    metadata=metadata_,
                    parent_config=(
                        {
                            "configurable": {
                                "thread_id": thread_id,
                                "checkpoint_ns": checkpoint_ns,
                                "checkpoint_id": record.parent_checkpoint_id,
                            }
                        }
                        if record.parent_checkpoint_id
                        else None
                    ),
                )

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        c = checkpoint.copy()
        thread_id: str = str(config["configurable"]["thread_id"])
        checkpoint_ns: str = str(config["configurable"].get("checkpoint_ns", ""))
        checkpoint_id: str = str(checkpoint["id"])

        values: dict[str, Any] = c.pop("channel_values", {})

        with self._session_scope() as session:
            for k, v in new_versions.items():
                t, b = self.serde.dumps_typed(values[k]) if k in values else ("empty", b"")
                b = bytes(b) if b is not None else b""
                blob_rec = (
                    session.query(AICheckpointBlobRecord)
                    .filter(
                        AICheckpointBlobRecord.thread_id == thread_id,
                        AICheckpointBlobRecord.checkpoint_ns == checkpoint_ns,
                        AICheckpointBlobRecord.channel == str(k),
                        AICheckpointBlobRecord.version == str(v),
                    )
                    .first()
                )
                if not blob_rec:
                    blob_rec = AICheckpointBlobRecord(
                        thread_id=thread_id,
                        checkpoint_ns=checkpoint_ns,
                        channel=str(k),
                        version=str(v),
                        type=t,
                        blob=b,
                    )
                    session.add(blob_rec)
                else:
                    blob_rec.type = t
                    blob_rec.blob = b

            cp_type, cp_bytes = self.serde.dumps_typed(c)
            cp_bytes = bytes(cp_bytes) if cp_bytes is not None else b""
            meta_type, meta_bytes = self.serde.dumps_typed(get_checkpoint_metadata(config, metadata))
            meta_bytes = bytes(meta_bytes) if meta_bytes is not None else b""
            parent_id = config["configurable"].get("checkpoint_id")

            rec = (
                session.query(AICheckpointRecord)
                .filter(
                    AICheckpointRecord.thread_id == thread_id,
                    AICheckpointRecord.checkpoint_ns == checkpoint_ns,
                    AICheckpointRecord.checkpoint_id == checkpoint_id,
                )
                .first()
            )
            if not rec:
                rec = AICheckpointRecord(
                    thread_id=thread_id,
                    checkpoint_ns=checkpoint_ns,
                    checkpoint_id=checkpoint_id,
                    parent_checkpoint_id=str(parent_id) if parent_id else None,
                    checkpoint_type=cp_type,
                    checkpoint_bytes=cp_bytes,
                    metadata_type=meta_type,
                    metadata_bytes=meta_bytes,
                )
                session.add(rec)
            else:
                rec.parent_checkpoint_id = str(parent_id) if parent_id else None
                rec.checkpoint_type = cp_type
                rec.checkpoint_bytes = cp_bytes
                rec.metadata_type = meta_type
                rec.metadata_bytes = meta_bytes

        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
            }
        }

    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        thread_id: str = str(config["configurable"]["thread_id"])
        checkpoint_ns: str = str(config["configurable"].get("checkpoint_ns", ""))
        checkpoint_id: str = str(config["configurable"]["checkpoint_id"])

        with self._session_scope() as session:
            for idx, (channel, val) in enumerate(writes):
                mapped_idx = WRITES_IDX_MAP.get(channel, idx)
                t, b = self.serde.dumps_typed(val)
                b = bytes(b) if b is not None else b""
                rec = (
                    session.query(AICheckpointWriteRecord)
                    .filter(
                        AICheckpointWriteRecord.thread_id == thread_id,
                        AICheckpointWriteRecord.checkpoint_ns == checkpoint_ns,
                        AICheckpointWriteRecord.checkpoint_id == checkpoint_id,
                        AICheckpointWriteRecord.task_id == str(task_id),
                        AICheckpointWriteRecord.idx == mapped_idx,
                    )
                    .first()
                )
                if not rec:
                    rec = AICheckpointWriteRecord(
                        thread_id=thread_id,
                        checkpoint_ns=checkpoint_ns,
                        checkpoint_id=checkpoint_id,
                        task_id=str(task_id),
                        idx=mapped_idx,
                        channel=str(channel),
                        type=t,
                        blob=b,
                        task_path=str(task_path),
                    )
                    session.add(rec)
                else:
                    rec.channel = str(channel)
                    rec.type = t
                    rec.blob = b
                    rec.task_path = str(task_path)


    def delete_thread(self, thread_id: str) -> None:
        tid = str(thread_id)
        with self._session_scope() as session:
            session.query(AICheckpointRecord).filter(AICheckpointRecord.thread_id == tid).delete(synchronize_session=False)
            session.query(AICheckpointBlobRecord).filter(AICheckpointBlobRecord.thread_id == tid).delete(synchronize_session=False)
            session.query(AICheckpointWriteRecord).filter(AICheckpointWriteRecord.thread_id == tid).delete(synchronize_session=False)
            session.commit()

    async def aget_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        return self.get_tuple(config)

    async def alist(
        self,
        config: Optional[RunnableConfig],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> AsyncIterator[CheckpointTuple]:
        for item in self.list(config, filter=filter, before=before, limit=limit):
            yield item

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        return self.put(config, checkpoint, metadata, new_versions)

    async def aput_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        return self.put_writes(config, writes, task_id, task_path)

    async def adelete_thread(self, thread_id: str) -> None:
        return self.delete_thread(thread_id)
