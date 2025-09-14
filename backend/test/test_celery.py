import sys
import os
import traceback

sys.path.append(os.getcwd())

from app.tasks.daily_bank_import import process_daily_bank_imports

def test_task():
    print("start testing")

    class MockSelf:
        class request:
            id = "manual-test-123"

        def update_state(self, state, meta):
            print(f"Task state: {state}")
            print(f"Meta: {meta}")

    mock_self = MockSelf()

    try:
        print("startin task exe")
        result = process_daily_bank_imports.apply()
        print(result)

    except Exception as e:
        print(f"{e} error")
        traceback.print_exc()

if __name__ == "__main__":
    test_task()
