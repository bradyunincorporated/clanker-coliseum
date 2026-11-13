"""Run resumable, bounded image jobs with the existing Gemini generator."""
import concurrent.futures
import json
import sys
from pathlib import Path

from generate import generate

job_file = Path(sys.argv[1])
project_root = job_file.resolve().parents[1]
jobs = json.loads(job_file.read_text())
if len(sys.argv) > 2:
    jobs = jobs[:int(sys.argv[2])]

def run(job):
    references = [str(project_root / path) for path in job["references"]]
    destination = project_root / job["destination"]
    generate(job["prompt"], references, destination, job.get("aspect", "1:1"))
    return f"{job['fighter']}/{job['name']}"

failed = []
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(run, job): job for job in jobs}
    for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
        job = futures[future]
        try:
            print(f"{index}/{len(jobs)} OK {future.result()}", flush=True)
        except Exception as error:
            failed.append(job)
            print(f"{index}/{len(jobs)} FAILED {job['fighter']}/{job['name']}: {error}", flush=True)
job_file.with_name(job_file.stem + "-failed.json").write_text(json.dumps(failed, indent=2))
sys.exit(bool(failed))
