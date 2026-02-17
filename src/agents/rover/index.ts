const Rover = {
  agent: () => import("./agent.ts"),
  sound: () => import("./sounds-mp3.ts"),
  map: () => import("./map.png"),
};
export default Rover;
