from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import VmTemplate


def ensure_vm_templates(db: Session) -> None:
    templates = db.scalars(select(VmTemplate)).all()
    if templates:
        return

    db.add_all(
        [
            VmTemplate(name="Ubuntu Small", cpu_cores=2, memory_mb=2048, disk_gb=20),
            VmTemplate(name="Ubuntu Medium", cpu_cores=4, memory_mb=4096, disk_gb=40),
        ]
    )
    db.commit()

