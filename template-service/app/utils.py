from jinja2 import Template as JinjaTemplate
from typing import Dict, Tuple, Any
import json

def render_subject_and_body(subject_template: str | None, body_template: str, variables: Dict[str, Any]) -> Tuple[str | None, str]:
    # Render subject if exists
    subj = None
    if subject_template:
        subj_t = JinjaTemplate(subject_template)
        subj = subj_t.render(**(variables or {}))
    # Body might be HTML (email) or JSON string (push templates JSON)
    # If body_template looks like JSON we treat it as JSON and render templates inside string
    body = body_template
    body = JinjaTemplate(body_template).render(**(variables or {}))
    # Try to parse JSON for push templates
    try:
        parsed = json.loads(body)
        # if JSON, return serialized JSON string (consumers can parse)
        body = json.dumps(parsed)
    except Exception:
        # not JSON — fine (email HTML)
        pass
    return subj, body
