import threading
import time


class Scheduler(object):
    """
    A class that schedules actions to occur regularly, allowing them to be
    rescheduled should new information become available.
    """

    def __init__(self, period, callback):
        self.timer = None
        self.callback = callback
        self.period = period
        self.last_tick = 0

    def deschedule(self):
        """Call this function before disposing of a client or entity."""
        if self.timer:
            self.timer.cancel()
            self.timer = None

    def schedule(self):
        """Schedules the event to happen again at a new point in time."""

        if self.timer:
            return

        def on_timer():
            value = self.callback(scheduled=True)
            self.last_tick = time.time()
            self.timer = None  # Clean up the old timer.
            if value is None or value != False:
                self.schedule()

        t = threading.Timer(self.period, on_timer)
        t.start()
        self.last_tick = time.time()
        self.timer = t

    def event_happened(self):
        """
        This should be called when an event happens that would otherwise reset
        the scheduler.
        """
        now = time.time()

        if not self.timer:
            self.last_tick = now
        self.deschedule()
        value = self.callback(scheduled=False)
        self.last_tick = now
        if value is None or value != False:
            self.schedule()

