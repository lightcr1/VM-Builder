from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import VmPackage
from app.schemas.vms import VmPackageCreate, VmPackageRead, VmPackageUpdate


DEFAULT_PACKAGES: list[VmPackageCreate] = [
    VmPackageCreate(
        id="cloud-s",
        name="Cloud S",
        description="Small services, test systems and lightweight web apps.",
        cpu_cores=2,
        memory_mb=1024,
        disk_gb=30,
        badge="Starter",
        sort_order=10,
    ),
    VmPackageCreate(
        id="cloud-m",
        name="Cloud M",
        description="Default choice for application servers and small databases.",
        cpu_cores=2,
        memory_mb=2048,
        disk_gb=50,
        badge="Popular",
        sort_order=20,
    ),
    VmPackageCreate(
        id="cloud-l",
        name="Cloud L",
        description="More memory and storage for heavier tenant workloads.",
        cpu_cores=4,
        memory_mb=4096,
        disk_gb=80,
        badge="Growth",
        sort_order=30,
    ),
    VmPackageCreate(
        id="cloud-xl",
        name="Cloud XL",
        description="Bigger application nodes, build workers and staging stacks.",
        cpu_cores=4,
        memory_mb=8192,
        disk_gb=120,
        badge="Performance",
        sort_order=40,
    ),
]


def ensure_vm_packages(db: Session) -> None:
    existing_count = len(db.scalars(select(VmPackage.id)).all())
    if existing_count:
        return
    db.add_all([_package_from_create(payload) for payload in DEFAULT_PACKAGES])
    db.commit()


def list_vm_packages(db: Session, *, include_inactive: bool = False) -> list[VmPackage]:
    query = select(VmPackage).order_by(VmPackage.sort_order.asc(), VmPackage.name.asc())
    if not include_inactive:
        query = query.where(VmPackage.is_active.is_(True))
    return db.scalars(query).all()


def get_vm_package(db: Session, package_id: str, *, require_active: bool = True) -> VmPackage:
    query = select(VmPackage).where(VmPackage.public_id == package_id)
    if require_active:
        query = query.where(VmPackage.is_active.is_(True))
    vm_package = db.scalar(query)
    if not vm_package:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown or inactive VM package")
    return vm_package


def create_vm_package(db: Session, payload: VmPackageCreate) -> VmPackage:
    if db.scalar(select(VmPackage).where(VmPackage.public_id == payload.id)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Package ID already exists")
    if db.scalar(select(VmPackage).where(VmPackage.name == payload.name)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Package name already exists")
    vm_package = _package_from_create(payload)
    db.add(vm_package)
    db.commit()
    db.refresh(vm_package)
    return vm_package


def update_vm_package(db: Session, package_id: str, payload: VmPackageUpdate) -> VmPackage:
    vm_package = get_vm_package(db, package_id, require_active=False)
    existing_name = db.scalar(select(VmPackage).where(VmPackage.name == payload.name, VmPackage.id != vm_package.id))
    if existing_name:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Package name already exists")
    vm_package.name = payload.name
    vm_package.description = payload.description
    vm_package.cpu_cores = payload.cpu_cores
    vm_package.memory_mb = payload.memory_mb
    vm_package.disk_gb = payload.disk_gb
    vm_package.badge = payload.badge
    vm_package.sort_order = payload.sort_order
    vm_package.is_active = payload.is_active
    db.commit()
    db.refresh(vm_package)
    return vm_package


def package_to_read(vm_package: VmPackage) -> VmPackageRead:
    return VmPackageRead(
        id=vm_package.public_id,
        name=vm_package.name,
        description=vm_package.description,
        cpu_cores=vm_package.cpu_cores,
        memory_mb=vm_package.memory_mb,
        disk_gb=vm_package.disk_gb,
        badge=vm_package.badge,
        sort_order=vm_package.sort_order,
        is_active=vm_package.is_active,
    )


def _package_from_create(payload: VmPackageCreate) -> VmPackage:
    return VmPackage(
        public_id=payload.id,
        name=payload.name,
        description=payload.description,
        cpu_cores=payload.cpu_cores,
        memory_mb=payload.memory_mb,
        disk_gb=payload.disk_gb,
        badge=payload.badge,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
