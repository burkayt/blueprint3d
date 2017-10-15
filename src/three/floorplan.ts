import Edge from './edge'

function Floorplan(scene, floorplan, controls) {

  let scope = this;

  this.scene = scene;
  this.floorplan = floorplan;
  this.controls = controls;

  this.floors = [];
  this.edges = [];

  floorplan.fireOnUpdatedRooms(redraw);

  function redraw() {
    // clear scene
    scope.floors.forEach((floor) => {
      floor.removeFromScene();
    });

    scope.edges.forEach((edge) => {
      edge.remove();
    });
    scope.floors = [];
    scope.edges = [];

    // draw floors
    scope.floorplan.getRooms().forEach((room) => {
      let threeFloor = new t.BP3D.Three.Floor(scene, room);
      scope.floors.push(threeFloor);
      threeFloor.addToScene();
    });

    // draw edges
    scope.floorplan.wallEdges().forEach((edge) => {
      let threeEdge = Edge(scene, edge, scope.controls);
      scope.edges.push(threeEdge);
    });
  }
}

export default Floorplan;
