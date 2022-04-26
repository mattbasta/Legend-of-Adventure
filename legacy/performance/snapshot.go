package performance


import "github.com/mattbasta/sojourner"


type PerformanceMixin struct {
    monitor *sojourner.Monitor
}


func (self *PerformanceMixin) GetSnapshot() *sojourner.PerformanceSnapshot {
    snapshot := self.monitor.Snapshot()
    return &snapshot
}


func NewPerfMixin() *PerformanceMixin {
    mixin := new(PerformanceMixin)
    mixin.monitor = sojourner.NewMonitor()
    return mixin
}
