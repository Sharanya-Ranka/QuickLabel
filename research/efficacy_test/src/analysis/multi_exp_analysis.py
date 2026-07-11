import json
import os
import pandas as pd
import numpy as np
import scipy.stats as stats
import plotly.graph_objects as go
import plotly.express as px


def analyze_and_plot_experiments(
    jsonl_filepath, output_html_path="experiment_analysis.html"
):
    """
    Parses active learning JSONL files, computes mean and 95% confidence intervals across
    multiple runs, and generates an interactive Plotly graph.
    """
    parsed_rows = []

    # 1. Read and parse the JSONL file line-by-line
    if not os.path.exists(jsonl_filepath):
        raise FileNotFoundError(f"The file {jsonl_filepath} does not exist.")

    with open(jsonl_filepath, "r") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                exp_name = data.get("experiment_name", "unknown")
                run_num = data.get("run_num", 0)
                step_info = data.get("step_info", [])
                if exp_name == "experiment_name":
                    continue

                for step in step_info:
                    num_all = step.get("num_all_data", 0)
                    if num_all == 0:
                        continue  # Avoid division by zero if data is missing

                    num_labeled = step.get("num_labeled_data", 0)
                    num_correct = step.get("num_correct", 0)

                    # Compute percentages
                    pct_labeled = (num_labeled / num_all) * 100
                    pct_correct = (num_correct / num_all) * 100

                    parsed_rows.append(
                        {
                            "experiment_name": exp_name,
                            "run_num": run_num,
                            "pct_labeled": round(
                                pct_labeled, 4
                            ),  # Round to prevent float precision grouping issues
                            "pct_correct": pct_correct,
                        }
                    )
            except Exception as e:
                print(f"Skipping a malformed row due to error: {e}")

    if not parsed_rows:
        print("No valid data found to process.")
        return None

    df = pd.DataFrame(parsed_rows)

    # 2. Group and compute the Mean and 95% Confidence Intervals
    def compute_stats(group):
        n = len(group)
        mean = group["pct_correct"].mean()
        if n > 1:
            std_err = group["pct_correct"].sem()
            if std_err == 0:
                ci_lower, ci_upper = mean, mean
            else:
                # 95% Confidence Interval using standard t-distribution
                ci = stats.t.interval(0.95, df=n - 1, loc=mean, scale=std_err)
                ci_lower = ci[0] if not np.isnan(ci[0]) else mean
                ci_upper = ci[1] if not np.isnan(ci[1]) else mean
        else:
            # Fallback if an experiment has only 1 run
            ci_lower, ci_upper = mean, mean
        return pd.Series(
            {"mean": mean, "ci_lower": ci_lower, "ci_upper": ci_upper, "count": n}
        )

    summary = (
        df.groupby(["experiment_name", "pct_labeled"], group_keys=False)
        .apply(compute_stats)
        .reset_index()
    )

    # 3. Create interactive Plotly figure
    fig = go.Figure()

    # Get high-quality qualitative colors from Plotly Express
    palette = px.colors.qualitative.Plotly

    # Helper to convert HEX colors to transparent RGBA for confidence interval shading
    def hex_to_rgba(hex_str, opacity=0.15):
        hex_str = hex_str.lstrip("#")
        if len(hex_str) == 3:
            hex_str = "".join([c * 2 for c in hex_str])
        r = int(hex_str[0:2], 16)
        g = int(hex_str[2:4], 16)
        b = int(hex_str[4:6], 16)
        return f"rgba({r}, {g}, {b}, {opacity})"

    unique_experiments = summary["experiment_name"].unique()

    for idx, exp_name in enumerate(unique_experiments):
        exp_df = summary[summary["experiment_name"] == exp_name].sort_values(
            "pct_labeled"
        )

        color = palette[idx % len(palette)]
        fill_color = hex_to_rgba(color, opacity=0.15)

        # Upper Bound (Invisible line, used as top ceiling for filling)
        fig.add_trace(
            go.Scatter(
                x=exp_df["pct_labeled"],
                y=exp_df["ci_upper"],
                mode="lines",
                line=dict(width=0),
                showlegend=False,
                hoverinfo="skip",
                legendgroup=exp_name,  # <-- ADD THIS
            )
        )

        # Lower Bound (Fills space between upper bound and this line)
        fig.add_trace(
            go.Scatter(
                x=exp_df["pct_labeled"],
                y=exp_df["ci_lower"],
                mode="lines",
                line=dict(width=0),
                fill="tonexty",
                fillcolor=fill_color,
                showlegend=False,
                hoverinfo="skip",
                legendgroup=exp_name,  # <-- ADD THIS
            )
        )

        # Solid Mean Line
        fig.add_trace(
            go.Scatter(
                x=exp_df["pct_labeled"],
                y=exp_df["mean"],
                mode="lines+markers",
                line=dict(color=color, width=2.5),
                marker=dict(size=6),
                name=exp_name,
                hovertemplate="<b>%{text}</b><br>% Labeled: %{x:.2f}%<br>Mean Correct: %{y:.2f}%<extra></extra>",
                text=[exp_name] * len(exp_df),
                legendgroup=exp_name,  # <-- ADD THIS
            )
        )

    # Styling and Layout configuration
    fig.update_layout(
        title=dict(
            text="Model Accuracy vs. Labeled Data Percentage (with 95% Confidence Interval)",
            x=0.5,
            xanchor="center",
            font=dict(size=16),
        ),
        xaxis=dict(
            title="% Labeled Data",
            ticksuffix="%",
            gridcolor="rgba(230,230,230,0.5)",
            zeroline=False,
        ),
        yaxis=dict(
            title="Percent Correct (%)",
            ticksuffix="%",
            gridcolor="rgba(230,230,230,0.5)",
            zeroline=False,
        ),
        hovermode="x unified",
        template="plotly_white",
        legend=dict(
            title="<b>Experiments</b>",
            orientation="v",  # "v" sets the orientation to vertical
            yanchor="middle",  # Anchors the legend vertically from its middle
            y=0.5,  # Centers it perfectly halfway up the y-axis (0.5)
            xanchor="left",  # Anchors the legend from its left edge
            x=1.02,  # Pushes it slightly to the right of the plot area (1.0 is the right edge
        ),
        margin=dict(l=60, r=40, t=100, b=60),
    )

    # Save chart as HTML file
    fig.write_html(output_html_path)
    print(f"Success! Interactive HTML graph saved to: '{output_html_path}'")
    return fig


# --- How to run ---
if __name__ == "__main__":
    # Substitute with your actual JSONL filename
    jsonl_file = "experiments_log.jsonl"

    # Generate the interactive plot
    if os.path.exists(jsonl_file):
        analyze_and_plot_experiments(jsonl_file, "active_learning_results.html")
    else:
        print(f"Please place your JSONL data in '{jsonl_file}' to execute.")
