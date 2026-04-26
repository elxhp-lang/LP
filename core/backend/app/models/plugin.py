from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Plugin(Base):
    __tablename__ = "plugins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    plugin_key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    latest_version: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    permissions_manifest: Mapped[str] = mapped_column(Text, default="[]")
