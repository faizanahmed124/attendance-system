"""
Generic name-based import/export engine, driven entirely by registry.py's
DOCTYPES definitions. Each row is processed and committed independently,
so one bad row (e.g. a misspelled Company name) never blocks the rest of
the file - it's reported as a per-row error and everything else still
imports.

IMPORTANT update semantics: on an UPDATE (existing record matched by
key_field), only columns the CSV row actually provided a value for are
written - a blank cell is treated as "leave this field unchanged", never
as "clear this field". Without this, importing a CSV where you only
filled in a few columns (e.g. just updating Status) would silently wipe
every other field back to blank for every matched row - a real data-loss
bug that was caught and fixed here. Defaults (`"default": ...` in the
registry) only apply when CREATING a brand-new record, never on update.
"""
import csv
import io
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError
from app.modules.data_import.registry import DOCTYPES

TRUE_VALUES = {"yes", "y", "true", "1"}
FALSE_VALUES = {"no", "n", "false", "0", ""}


def get_doctype(doctype_key: str) -> dict:
    doctype = DOCTYPES.get(doctype_key)
    if not doctype:
        raise BadRequestError(f"Unknown doctype '{doctype_key}'. Available: {list(DOCTYPES.keys())}")
    return doctype


def list_doctypes() -> list[dict]:
    return [
        {"key": key, "label": d["label"], "fields": [{"key": f["key"], "label": f["label"], "type": f["type"], "required": f.get("required", False)} for f in d["fields"]]}
        for key, d in DOCTYPES.items()
    ]


def _resolve_lookup(db: Session, table: str, column: str, value: str) -> tuple[int | None, str | None]:
    if value is None or str(value).strip() == "":
        return None, None
    clean = str(value).strip()
    row = db.execute(
        text(f"SELECT id FROM {table} WHERE lower(trim({column})) = lower(:val)"),
        {"val": clean},
    ).first()
    if row:
        return row[0], None
    return None, f"'{clean}' not found in {table} (check spelling / create it first)"


def generate_template_csv(doctype_key: str) -> str:
    doctype = get_doctype(doctype_key)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([f["label"] for f in doctype["fields"]])
    return output.getvalue()


def export_csv(db: Session, doctype_key: str) -> str:
    doctype = get_doctype(doctype_key)
    fields = doctype["fields"]

    rows = db.execute(text(f"SELECT * FROM {doctype['table']}")).mappings().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([f["label"] for f in fields])

    for row in rows:
        line = []
        for f in fields:
            raw = row.get(f["key"])
            if f["type"] == "lookup" and raw is not None:
                looked_up = db.execute(
                    text(f"SELECT {f['lookup_column']} FROM {f['lookup_table']} WHERE id = :id"),
                    {"id": raw},
                ).first()
                line.append(looked_up[0] if looked_up else "")
            elif f["type"] == "bool":
                line.append("yes" if raw else "no")
            else:
                line.append(raw if raw is not None else "")
        writer.writerow(line)

    return output.getvalue()


def import_csv(db: Session, doctype_key: str, csv_text: str) -> dict:
    doctype = get_doctype(doctype_key)
    fields = doctype["fields"]
    label_to_field = {f["label"]: f for f in fields}
    key_field = doctype.get("key_field")

    reader = csv.DictReader(io.StringIO(csv_text))
    missing_columns = [f["label"] for f in fields if f.get("required") and f["label"] not in (reader.fieldnames or [])]
    if missing_columns:
        raise BadRequestError(f"CSV is missing required column(s): {', '.join(missing_columns)}")

    created, updated, failed = 0, 0, 0
    errors = []

    for row_num, row in enumerate(reader, start=2):  # row 1 is the header
        try:
            values = {}
            provided_keys = set()  # fields the CSV row actually had a non-blank value for

            for label, raw_value in row.items():
                field = label_to_field.get(label)
                if not field:
                    continue  # ignore unknown columns rather than failing the whole row

                raw_stripped = (raw_value or "").strip()
                has_value = raw_stripped != ""

                if field["type"] == "lookup":
                    resolved_id, err = _resolve_lookup(db, field["lookup_table"], field["lookup_column"], raw_value)
                    if err and (field.get("required") or has_value):
                        raise BadRequestError(f"{field['label']}: {err}")
                    values[field["key"]] = resolved_id
                elif field["type"] == "bool":
                    values[field["key"]] = 1 if raw_stripped.lower() in TRUE_VALUES else 0
                elif field["type"] == "number":
                    values[field["key"]] = float(raw_value) if has_value else None
                else:
                    values[field["key"]] = raw_stripped if has_value else None

                if has_value:
                    provided_keys.add(field["key"])

                if values.get(field["key"]) in (None, "") and field.get("required"):
                    raise BadRequestError(f"{field['label']} is required")

            existing_id = None
            if key_field and values.get(key_field):
                existing = db.execute(
                    text(f"SELECT id FROM {doctype['table']} WHERE {key_field} = :val"),
                    {"val": values[key_field]},
                ).first()
                if existing:
                    existing_id = existing[0]

            if existing_id:
                # UPDATE: only touch columns this row actually provided a
                # value for - a blank cell means "leave unchanged", never
                # "clear this field". This is what prevents partial-column
                # CSVs from wiping out data in columns you didn't fill in.
                update_values = {k: v for k, v in values.items() if k in provided_keys}
                if update_values:
                    set_clause = ", ".join(f"{k} = :{k}" for k in update_values)
                    db.execute(
                        text(f"UPDATE {doctype['table']} SET {set_clause} WHERE id = :__id"),
                        {**update_values, "__id": existing_id},
                    )
                updated += 1
            else:
                # CREATE: apply registry defaults for any field the row
                # left blank, since a brand-new record needs every
                # NOT NULL-ish field to have SOME value.
                for field in fields:
                    if field["key"] not in provided_keys and "default" in field:
                        default = field["default"]
                        values[field["key"]] = 1 if (field["type"] == "bool" and default == "yes") else default

                table_columns = {r[1] for r in db.execute(text(f"PRAGMA table_info({doctype['table']})"))}
                if "created_at" in table_columns and "created_at" not in values:
                    values["created_at"] = datetime.now(timezone.utc).isoformat(sep=" ")

                columns = ", ".join(values.keys())
                placeholders = ", ".join(f":{k}" for k in values)
                db.execute(text(f"INSERT INTO {doctype['table']} ({columns}) VALUES ({placeholders})"), values)
                created += 1

            db.commit()

        except Exception as e:  # noqa: BLE001 - one bad row must never abort the whole file
            db.rollback()
            failed += 1
            message = str(e.orig) if hasattr(e, "orig") else str(e)
            errors.append({"row": row_num, "message": message})

    return {"created": created, "updated": updated, "failed": failed, "errors": errors}