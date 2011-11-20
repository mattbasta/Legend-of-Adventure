
class AnimatSprite(object):

    def move(self, x_vel, y_vel, broadcast=True, event=True):
        """Start the animat moving in any direction, or stop it from moving."""

        super(AnimatSprite, self).move(x_vel, y_vel, broadcast=False, event=event)

        views = {(1, 0): "animat.%s.right",
                 (1, 1): "animat.%s.right",
                 (0, 1): "animat.%s.down",
                 (-1, 1): "animat.%s.left",
                 (-1, 0): "animat.%s.left",
                 (-1, -1): "animat.%s.left",
                 (0, -1): "animat.%s.up",
                 (1, -1): "animat.%s.right"}

        if any(self.velocity):
            self.view = views[tuple(self.velocity)] % "spr"
        elif any(self.old_velocity):
            self.view = views[tuple(self.old_velocity)] % "static"

        self.broadcast_changes(*self._movement_properties)
