import sys
import os

sys.path.append(os.getcwd())
from app.core.celery_app import celery_app

def check_schedule():
      print("=== Celery Beat Schedule Check ===")

      # Get the beat schedule
      schedule = celery_app.conf.beat_schedule

      if not schedule:
          print("❌ No beat schedule configured!")
          return

      print(f"✅ Found {len(schedule)} scheduled tasks:")

      for task_name, config in schedule.items():
          print(f"\n📅 Task: {task_name}")
          print(f"   - Function: {config['task']}")
          print(f"   - Schedule: {config['schedule']}")

          # Show next run time
          try:
              from celery.schedules import crontab
              if isinstance(config['schedule'], crontab):
                  print(f"   - Cron: {config['schedule']}")
                  print(f"   - Description: Daily at {config['schedule'].hour}:{config['schedule'].minute:02d}")
          except Exception as e:
              print(f"   - Schedule details: {e}")

if __name__ == "__main__":
      check_schedule()
