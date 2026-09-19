# Robot / Model / Simulation adapters

The benchmark API accepts a model or policy plus an execution adapter. Available execution contracts include ROS 2, generic robot HTTP, MuJoCo, Isaac Lab and Gazebo. Simulation adapters execute through SIM_WORKER_COMMAND. The repository does not fabricate physical measurements: real robotics results require a connected simulator or robot gateway.
