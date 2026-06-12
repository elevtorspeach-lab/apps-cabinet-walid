import os
import re
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime
from xml.sax.saxutils import escape


SOURCE_FILES = [
    r"C:\Users\Administrator\Downloads\SAISIE ARRET 2026 (1).xlsx",
    r"C:\Users\Administrator\Downloads\saisie arret 2023 (1).xlsx",
    r"C:\Users\Administrator\Downloads\LOT SAISIE ARRET GLOBAL 2024-2025 (1).xlsx",
]
OUT_FILE = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "verification-3-fichiers-saisie-arret.xlsx",
    )
)

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
REL_NS = {"pr": "http://schemas.openxmlformats.org/package/2006/relationships"}


def strip_accents(value):
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", str(value))
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


def norm_key(value):
    return re.sub(r"\s+", "", clean(value).upper())


def is_saisie_arret(value):
    text = strip_accents(clean(value)).lower()
    compact = re.sub(r"[^a-z0-9]+", "", text)
    return "saisie" in compact and ("arret" in compact or "arrt" in compact)


def is_att_num_ref(value):
    text = strip_accents(clean(value)).upper()
    compact = re.sub(r"[^A-Z0-9]+", "", text)
    return bool(compact) and (
        compact in {"ATTNUM", "ATTN", "ATTNUMERO", "ATTREF", "ATTREFERENCE"}
        or ("ATT" in compact and ("NUM" in compact or "N" == compact[-1:]))
    )


def col_number(cell_ref):
    match = re.match(r"([A-Z]+)", cell_ref or "")
    if not match:
        return 0
    number = 0
    for char in match.group(1):
        number = number * 26 + ord(char) - 64
    return number


def column_name(number):
    name = ""
    while number:
        number, rem = divmod(number - 1, 26)
        name = chr(65 + rem) + name
    return name


def read_shared_strings(zf):
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [
        "".join(node.text or "" for node in item.findall(".//a:t", NS))
        for item in root.findall("a:si", NS)
    ]


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


def find_header(rows):
    for index, (_, values) in enumerate(rows[:80]):
        headers = [norm_header(value) for value in values]
        ref_dossier_indexes = [
            i for i, header in enumerate(headers)
            if header in {"refdossier", "referencedossier"}
            or ("ref" in header and "dossier" in header)
        ]
        ref_client_indexes = [
            i for i, header in enumerate(headers)
            if header in {"referenceclient", "refclient"}
            or ("ref" in header and "client" in header)
        ]
        procedure_indexes = [
            i for i, header in enumerate(headers)
            if header in {"procedure", "procedures"}
        ]
        if ref_dossier_indexes and ref_client_indexes and procedure_indexes:
            return {
                "row_index": index,
                "ref_dossier": ref_dossier_indexes[0],
                "ref_client": ref_client_indexes[0],
                "procedure": procedure_indexes[0],
                "headers": values,
            }
    return None


def collect_rows():
    records = []
    for path in SOURCE_FILES:
        for sheet_name, rows in read_workbook_rows(path):
            header = find_header(rows)
            if not header:
                continue
            headers = header["headers"]
            for row_number, values in rows[header["row_index"] + 1:]:
                procedure = values[header["procedure"]] if header["procedure"] < len(values) else ""
                if not is_saisie_arret(procedure):
                    continue
                ref_dossier = values[header["ref_dossier"]] if header["ref_dossier"] < len(values) else ""
                ref_client = values[header["ref_client"]] if header["ref_client"] < len(values) else ""
                padded = values + [""] * max(0, len(headers) - len(values))
                records.append({
                    "file": os.path.basename(path),
                    "sheet": sheet_name,
                    "row": row_number,
                    "headers": headers,
                    "values": padded[:len(headers)],
                    "ref_dossier": clean(ref_dossier),
                    "ref_client": clean(ref_client),
                    "ref_client_key": norm_key(ref_client),
                    "issue": "",
                })
    return records


def sheet_xml(rows):
    xml_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for col_index, value in enumerate(row, start=1):
            text = escape("" if value is None else str(value))
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


def rows_for(records, max_header_len):
    base_headers = ["Anomalie", "Source fichier", "Source feuille", "Ligne source"]
    headers = []
    for record in records:
        if len(record["headers"]) > len(headers):
            headers = record["headers"]
    headers = [clean(value) for value in headers] + [""] * max(0, max_header_len - len(headers))
    output = [base_headers + headers[:max_header_len]]
    for record in records:
        values = record["values"] + [""] * max(0, max_header_len - len(record["values"]))
        output.append([
            record["issue"],
            record["file"],
            record["sheet"],
            record["row"],
        ] + values[:max_header_len])
    return output


def main():
    missing_input = [path for path in SOURCE_FILES if not os.path.exists(path)]
    if missing_input:
        raise SystemExit("Missing files:\n" + "\n".join(missing_input))

    records = collect_rows()
    max_header_len = max([len(record["headers"]) for record in records] or [0])

    ref_dossier_bad = []
    by_ref_client = {}
    for record in records:
        if not clean(record["ref_dossier"]):
            item = dict(record)
            item["issue"] = "Ref dossier vide"
            ref_dossier_bad.append(item)
        elif is_att_num_ref(record["ref_dossier"]):
            item = dict(record)
            item["issue"] = "Ref dossier ATT NUM"
            ref_dossier_bad.append(item)

        if record["ref_client_key"]:
            by_ref_client.setdefault(record["ref_client_key"], []).append(record)

    duplicate_records = []
    duplicate_groups = {
        key: values for key, values in by_ref_client.items()
        if len(values) > 1
    }
    for key in sorted(duplicate_groups):
        group = duplicate_groups[key]
        for record in group:
            item = dict(record)
            item["issue"] = f"Reference client doublon x{len(group)}"
            duplicate_records.append(item)

    all_records = ref_dossier_bad + duplicate_records
    summary_rows = [
        ["Verification", "3 fichiers Saisie Arret"],
        ["Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
        ["Lignes Saisie Arret lues", len(records)],
        ["Ref dossier vide ou ATT NUM", len(ref_dossier_bad)],
        ["References client doublons uniques", len(duplicate_groups)],
        ["Lignes avec reference client doublon", len(duplicate_records)],
        ["Total lignes anomalies", len(all_records)],
    ]
    for path in SOURCE_FILES:
        summary_rows.append(["Fichier source", path])

    write_xlsx(
        OUT_FILE,
        [
            ("Ref dossier vide ATT", rows_for(ref_dossier_bad, max_header_len)),
            ("Ref client doublons", rows_for(duplicate_records, max_header_len)),
            ("Toutes anomalies", rows_for(all_records, max_header_len)),
            ("Resume", summary_rows),
        ],
    )

    print(f"SOURCE_ROWS={len(records)}")
    print(f"BAD_REF_DOSSIER_ROWS={len(ref_dossier_bad)}")
    print(f"DUP_REF_CLIENT_GROUPS={len(duplicate_groups)}")
    print(f"DUP_REF_CLIENT_ROWS={len(duplicate_records)}")
    print(f"TOTAL_ANOMALY_ROWS={len(all_records)}")
    print(f"OUT_FILE={OUT_FILE}")


if __name__ == "__main__":
    main()
