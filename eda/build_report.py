"""Incrusta eda_data.json en report_template.html y escribe report.html (autocontenido, sin red)."""
import json, pathlib

here = pathlib.Path(__file__).parent
data = json.loads((here / "eda_data.json").read_text())
tpl = (here / "report_template.html").read_text()
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
probe_path = here / "probe_data.json"
probe = probe_path.read_text().replace("</", "<\\/") if probe_path.exists() else "null"
(here / "report.html").write_text(tpl.replace("__DATA__", payload).replace("__PROBE__", probe))
print("report.html generado")
