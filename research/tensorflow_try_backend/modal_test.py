import time
import requests
import json
import pandas as pd

# Paste your live development URL here (do not include trailing slashes)
BASE_URL = "https://sharanya-ranka--fastembed-sse-backend-fastapi-app-dev.modal.run"


def run_test(test_dataset):
    submit_url = f"{BASE_URL}/api/embed-stream"

    print("🚀 Initializing connection and uploading payload via POST...")
    start_time = time.time()

    try:
        with requests.post(submit_url, json=test_dataset, stream=True) as response:
            # Check if the connection was accepted successfully
            if response.status_code != 200:
                print(
                    f"❌ Server rejected request with Status {response.status_code}: {response.text}"
                )
                return

            print(
                "🔗 Connection established! Processing live incoming event stream...\n"
            )
            line_num = 0
            total_size = 0

            # Iterate through the line boundaries as the server yields them
            for line in response.iter_lines():
                if line:
                    line_num += 1
                    total_size += len(line)
                    decoded_line = line.decode("utf-8")

                    # Intercept the server-sent event metadata marker standard
                    if decoded_line.startswith("data: "):
                        content = decoded_line[6:]  # Strip out the "data: " prefix

                        # Handle the terminal flag
                        if content == "[DONE]":
                            print(
                                "\n🏁 Received terminal [DONE] flag! Processing chain complete."
                            )
                            break

                        # Handle standard progress updates
                        try:
                            data = json.loads(content)
                            print(
                                f"Got results line={line_num}. Total size={total_size}"
                            )
                            # print(
                            #     f"📈 Progress: {data['progress']}/{data['total']} vectors handled. Batch payload contains {len(data['results'])} items."
                            # )
                        except json.JSONDecodeError:
                            print(f"❓ Raw Event Stream Text: {content}")

    except requests.exceptions.RequestException as e:
        print(f"💥 Connection broken: {e}")

    end_time = time.time()
    print("-" * 60)
    print(f"⏱️ Total execution concluded in {end_time - start_time:.2f} seconds.")


import argparse

if __name__ == "__main__":
    WARMUP_COUNT = 128 * 4
    FULL_COUNT = 15000
    # 1. Set up the argument parser
    parser = argparse.ArgumentParser(description="Run text embedding pipeline tests.")
    parser.add_argument(
        "--warm-up",
        action="store_true",
        help="Run a smaller warm-up test with only 500 requests.",
    )
    args = parser.parse_args()

    # breakpoint()

    count = FULL_COUNT
    if args.warm_up:
        count = WARMUP_COUNT

    filepath = (
        r"D:\Sharanya Personal\QuickLabel\research\data\agnews_train.csv\train.csv"
    )
    df = pd.read_csv(filepath)
    text_list = df.iloc[:count, 1].tolist()

    # breakpoint()

    # Construct a test payload mimicking your application layout
    test_dataset = {
        "items": [
            {
                "id": f"doc_{i}",
                "text": text,
            }
            for i, text in enumerate(text_list)
        ]
    }
    run_test(test_dataset)
