import os
import re
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime
from xml.sax.saxutils import escape


APP_FILE = r"C:\Users\Administrator\Downloads\Sauvegarde Excel Diligence Saisie Arret.xlsx"
SOURCE_FILES = [
    r"C:\Users\Administrator\Downloads\SAISIE ARRET 2026 (1).xlsx",
    r"C:\Users\Administrator\Downloads\saisie arret 2023 (1).xlsx",
    r"C:\Users\Administrator\Downloads\LOT SAISIE ARRET GLOBAL 2024-2025 (1).xlsx",
]
OUT_FILE = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "comparaison-saisie-arret-manquants.xlsx",
    )
)

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
REL_NS = {"pr": "http://schemas.openxmlformats.org/package/2006/relationships"}


def strip_accents(value):
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(ch)
    )


def clean(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).replace("\u00a0", " ")).strip()


def norm_header(value):
    value = strip_accents(clean(value)).lower()
    value = value.replace("ã©", "e").replace("ã¨", "e").replace("ã´", "o")
    return re.sub(r"[^a-z0-9]+", "", value)


def norm_ref(value):
    value = clean(value).upper()
    value = value.replace("\\", "/")
    value = re.sub(r"\s*/\s*", "/", value)
    value = re.sub(r"\s+", "", value)
    return value


def is_saisie_arret(value):
    text = strip_accents(clean(value)).lower()
    text = text.replace("ãª", "e").replace("ê", "e")
    compact = re.sub(r"[^a-z0-9]+", "", text)
    return "saisie" in compact and ("arret" in compact or "arrt" in compact)


def col_number(cell_ref):
    match = re.match(r"([A-Z]+)", cell_ref or "")
    if not match:
        return 0
    number = 0
    for char in match.group(1):
        number = number * 26 + ord(char) - 64
    return number


def read_shared_strings(zf):
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    strings = []
    for item in root.findall("a:si", NS):
        strings.append("".join(node.text or "" for node in item.findall(".//a:t", NS)))
    return strings


def list_sheets(zf):
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("pr:Relationship", REL_NS)
    }
    sheets = []
    for sheet in workbook.findall("a:sheets/a:sheet", NS):
        rel_id = sheet.attrib.get(
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        )
        target = rel_map.get(rel_id, "")
        if not target.startswith("xl/"):
            target = "xl/" + target
        sheets.append((sheet.attrib.get("name", "Sheet"), target.replace("xl//", "xl/")))
    return sheets


def cell_value(cell, shared_strings):
    cell_type = cell.attrib.get("t")
    if cell_type == "s":
        node = cell.find("a:v", NS)
        if node is None or node.text is None:
            return ""
        return shared_strings[int(node.text)]
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//a:t", NS))
    node = cell.find("a:v", NS)
    return "" if node is None or node.text is None else node.text


def read_workbook_rows(path):
    with zipfile.ZipFile(path) as zf:
        shared_strings = read_shared_strings(zf)
        for sheet_name, sheet_path in list_sheets(zf):
            root = ET.fromstring(zf.read(sheet_path))
            rows = []
            for row in root.findall("a:sheetData/a:row", NS):
                values_by_col = {}
                max_col = 0
                for cell in row.findall("a:c", NS):
                    col = col_number(cell.attrib.get("r", ""))
                    if not col:
                        continue
                    values_by_col[col] = cell_value(cell, shared_strings)
                    max_col = max(max_col, col)
                values = [""] * max_col
                for col, value in values_by_col.items():
                    values[col - 1] = value
                rows.append((int(row.attrib.get("r", len(rows) + 1)), values))
            yield sheet_name, rows


def find_header(rows, require_procedure=False):
    for index, (_, values) in enumerate(rows[:80]):
        headers = [norm_header(value) for value in values]
        ref_indexes = [
            i for i, header in enumerate(headers)
            if header in {"refdossier", "referencedossier"}
            or ("ref" in header and "dossier" in header)
        ]
        procedure_indexes = [
            i for i, header in enumerate(headers)
            if header in {"procedure", "procedures"}
        ]
        if ref_indexes and (not require_procedure or procedure_indexes):
            return index, ref_indexes[0], (procedure_indexes[0] if procedure_indexes else None), values
    return None


def collect_app_refs(path):
    refs = set()
    rows_seen = 0
    for _, rows in read_workbook_rows(path):
        header = find_header(rows, require_procedure=False)
        if not header:
            continue
        header_index, ref_index, _, _ = header
        for _, values in rows[header_index + 1:]:
            ref = norm_ref(values[ref_index] if ref_index < len(values) else "")
            if ref:
                refs.add(ref)
                rows_seen += 1
    return refs, rows_seen


def collect_source_rows(paths):
    records = []
    source_refs = set()
    duplicate_refs = set()
    for path in paths:
        for sheet_name, rows in read_workbook_rows(path):
            header = find_header(rows, require_procedure=True)
            if not header:
                continue
            header_index, ref_index, procedure_index, headers = header
            for row_number, values in rows[header_index + 1:]:
                procedure = values[procedure_index] if procedure_index is not None and procedure_index < len(values) else ""
                ref = values[ref_index] if ref_index < len(values) else ""
                normalized_ref = norm_ref(ref)
                if not normalized_ref or not is_saisie_arret(procedure):
                    continue
                if normalized_ref in source_refs:
                    duplicate_refs.add(normalized_ref)
                source_refs.add(normalized_ref)
                padded = values + [""] * max(0, len(headers) - len(values))
                records.append({
                    "file": os.path.basename(path),
                    "sheet": sheet_name,
                    "row": row_number,
                    "ref": clean(ref),
                    "normalized_ref": normalized_ref,
                    "headers": headers,
                    "values": padded[:len(headers)],
                })
    return records, source_refs, duplicate_refs


def sheet_xml(rows):
    xml_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for col_index, value in enumerate(row, start=1):
            if value is None:
                value = ""
            text = escape(str(value))
            cells.append(
                f'<c r="{column_name(col_index)}{row_index}" t="inlineStr"><is><t>{text}</t></is></c>'
            )
        xml_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheetData>{"".join(xml_rows)}</sheetData></worksheet>'
    )


def column_name(number):
    name = ""
    while number:
        number, rem = divmod(number - 1, 26)
        name = chr(65 + rem) + name
    return name


def write_xlsx(path, sheets):
    content_types = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    ]
    workbook_sheets = []
    workbook_rels = []
    for index, (name, _) in enumerate(sheets, start=1):
        content_types.append(
            f'<Override PartName="/xl/worksheets/sheet{index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        )
        workbook_sheets.append(
            f'<sheet name="{escape(name)}" sheetId="{index}" r:id="rId{index}"/>'
        )
        workbook_rels.append(
            f'<Relationship Id="rId{index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{index}.xml"/>'
        )
    content_types.append("</Types>")
    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets>{"".join(workbook_sheets)}</sheets></workbook>'
    )
    root_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '</Relationships>'
    )
    workbook_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'{"".join(workbook_rels)}</Relationships>'
    )
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "".join(content_types))
        zf.writestr("_rels/.rels", root_rels)
        zf.writestr("xl/workbook.xml", workbook_xml)
        zf.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml)
        for index, (_, rows) in enumerate(sheets, start=1):
            zf.writestr(f"xl/worksheets/sheet{index}.xml", sheet_xml(rows))


def main():
    missing_input = [path for path in [APP_FILE, *SOURCE_FILES] if not os.path.exists(path)]
    if missing_input:
        raise SystemExit("Missing files:\n" + "\n".join(missing_input))

    app_refs, app_rows_seen = collect_app_refs(APP_FILE)
    source_records, source_refs, duplicate_refs = collect_source_rows(SOURCE_FILES)
    missing = [record for record in source_records if record["normalized_ref"] not in app_refs]

    max_header_len = max([len(record["headers"]) for record in source_records] or [0])
    preferred_headers = []
    for record in source_records:
        if len(record["headers"]) == max_header_len:
            preferred_headers = record["headers"]
            break
    output_headers = [
        "Source fichier",
        "Source feuille",
        "Ligne source",
        "Ref dossier normalisee",
    ] + [clean(value) for value in preferred_headers]

    missing_rows = [output_headers]
    for record in missing:
        values = record["values"] + [""] * max(0, max_header_len - len(record["values"]))
        missing_rows.append([
            record["file"],
            record["sheet"],
            record["row"],
            record["normalized_ref"],
        ] + values[:max_header_len])

    summary_rows = [
        ["Comparaison", "Diligence Saisie Arret"],
        ["Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
        ["Fichier apps", APP_FILE],
        ["Refs apps uniques", len(app_refs)],
        ["Lignes apps lues", app_rows_seen],
        ["Refs sources uniques", len(source_refs)],
        ["Lignes sources lues", len(source_records)],
        ["Refs sources dupliquees", len(duplicate_refs)],
        ["Lignes manquantes dans apps", len(missing)],
    ]
    for path in SOURCE_FILES:
        summary_rows.append(["Fichier source", path])

    write_xlsx(OUT_FILE, [("Manquants", missing_rows), ("Resume", summary_rows)])

    print(f"APP_REFS={len(app_refs)}")
    print(f"APP_ROWS={app_rows_seen}")
    print(f"SOURCE_REFS={len(source_refs)}")
    print(f"SOURCE_ROWS={len(source_records)}")
    print(f"DUP_SOURCE_REFS={len(duplicate_refs)}")
    print(f"MISSING_ROWS={len(missing)}")
    print(f"OUT_FILE={OUT_FILE}")


if __name__ == "__main__":
    main()
