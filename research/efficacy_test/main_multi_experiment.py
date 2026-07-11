from src.runner.efficacy_test import run_active_loop

# from stored_configs.experiment1 import all_configs
from stored_configs.experiment2 import all_configs
from src.types import ExperimentLog
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

LOGFILE = "logs/logfile2.jsonl"
RUNS_PER_EXPERIMENT = 5


def append_stats_to_file(logfile: str, stats: ExperimentLog):
    # breakpoint()
    with open(logfile, "a") as fp:
        fp.write(stats.model_dump_json())
        fp.write("\n")


for config in all_configs:
    for run in range(RUNS_PER_EXPERIMENT):
        cconfig = config.model_copy(deep=True)
        cconfig.experiment.run_num = run
        run_logs = run_active_loop(cconfig)

        append_stats_to_file(LOGFILE, run_logs)
