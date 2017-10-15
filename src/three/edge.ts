import {
  BackSide,
  DoubleSide,
  Face3,
  FrontSide,
  Geometry,
  ImageUtils,
  Mesh,
  MeshBasicMaterial,
  Path,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3
} from 'three';

function Edge(scene, edge, controls) {
  let scope = this;
  let scene = scene;
  let edge = edge;
  let controls = controls;
  let wall = edge.wall;
  let front = edge.front;

  let planes = [];
  let basePlanes = []; // always visible
  let texture = null;

  let lightMap = ImageUtils.loadTexture("rooms/textures/walllightmap.png");
  let fillerColor = 0xdddddd;
  let sideColor = 0xcccccc;
  let baseColor = 0xdddddd;

  this.visible = false;

  this.remove = function () {
    edge.redrawCallbacks.remove(redraw);
    controls.cameraMovedCallbacks.remove(updateVisibility);
    removeFromScene();
  }

  function init() {
    edge.redrawCallbacks.add(redraw);
    controls.cameraMovedCallbacks.add(updateVisibility);
    updateTexture();
    updatePlanes();
    addToScene();
  }

  function redraw() {
    removeFromScene();
    updateTexture();
    updatePlanes();
    addToScene();
  }

  function removeFromScene() {
    planes.forEach((plane) => {
      scene.remove(plane);
    });
    basePlanes.forEach((plane) => {
      scene.remove(plane);
    });
    planes = [];
    basePlanes = [];
  }

  function addToScene() {
    planes.forEach((plane) => {
      scene.add(plane);
    });
    basePlanes.forEach((plane) => {
      scene.add(plane);
    });
    updateVisibility();
  }

  function updateVisibility() {
    // finds the normal from the specified edge
    let start = edge.interiorStart();
    let end = edge.interiorEnd();
    let x = end.x - start.x;
    let y = end.y - start.y;
    // rotate 90 degrees CCW
    let normal = new Vector3(-y, 0, x);
    normal.normalize();

    // setup camera
    let position = controls.object.position.clone();
    let focus = new Vector3(
      (start.x + end.x) / 2.0,
      0,
      (start.y + end.y) / 2.0);
    let direction = position.sub(focus).normalize();

    // find dot
    let dot = normal.dot(direction);

    // update visible
    scope.visible = (dot >= 0);

    // show or hide plans
    planes.forEach((plane) => {
      plane.visible = scope.visible;
    });

    updateObjectVisibility();
  }

  function updateObjectVisibility() {
    wall.items.forEach((item) => {
      item.updateEdgeVisibility(scope.visible, front);
    });
    wall.onItems.forEach((item) => {
      item.updateEdgeVisibility(scope.visible, front);
    });
  }

  function updateTexture(callback?) {
    // callback is fired when texture loads
    callback = callback || function () {
      scene.needsUpdate = true;
    }
    let textureData = edge.getTexture();
    let stretch = textureData.stretch;
    let url = textureData.url;
    let scale = textureData.scale;
    texture = ImageUtils.loadTexture(url, null, callback);
    if (!stretch) {
      let height = wall.height;
      let width = edge.interiorDistance();
      texture.wrapT = RepeatWrapping;
      texture.wrapS = RepeatWrapping;
      texture.repeat.set(width / scale, height / scale);
      texture.needsUpdate = true;
    }
  }

  function updatePlanes() {
    let wallMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      // ambientColor: 0xffffff, TODO_Ekki
      //ambient: scope.wall.color,
      side: FrontSide,
      map: texture,
      // lightMap: lightMap TODO_Ekki
    });

    let fillerMaterial = new MeshBasicMaterial({
      color: fillerColor,
      side: DoubleSide
    });

    // exterior plane
    planes.push(makeWall(
      edge.exteriorStart(),
      edge.exteriorEnd(),
      edge.exteriorTransform,
      edge.invExteriorTransform,
      fillerMaterial));

    // interior plane
    planes.push(makeWall(
      edge.interiorStart(),
      edge.interiorEnd(),
      edge.interiorTransform,
      edge.invInteriorTransform,
      wallMaterial));

    // bottom
    // put into basePlanes since this is always visible
    basePlanes.push(buildFiller(
      edge, 0,
      BackSide, baseColor));

    // top
    planes.push(buildFiller(
      edge, wall.height,
      DoubleSide, fillerColor));

    // sides
    planes.push(buildSideFillter(
      edge.interiorStart(), edge.exteriorStart(),
      wall.height, sideColor));

    planes.push(buildSideFillter(
      edge.interiorEnd(), edge.exteriorEnd(),
      wall.height, sideColor));
  }

  // start, end have x and y attributes (i.e. corners)
  function makeWall(start, end, transform, invTransform, material) {
    let v1 = toVec3(start);
    let v2 = toVec3(end);
    let v3 = v2.clone();
    v3.y = wall.height;
    let v4 = v1.clone();
    v4.y = wall.height;

    let points = [v1.clone(), v2.clone(), v3.clone(), v4.clone()];

    points.forEach((p) => {
      p.applyMatrix4(transform);
    });

    let shape = new Shape([
      new Vector2(points[0].x, points[0].y),
      new Vector2(points[1].x, points[1].y),
      new Vector2(points[2].x, points[2].y),
      new Vector2(points[3].x, points[3].y)
    ]);

    // add holes for each wall item
    wall.items.forEach((item) => {
      let pos = item.position.clone();
      pos.applyMatrix4(transform)
      let halfSize = item.halfSize;
      let min = halfSize.clone().multiplyScalar(-1);
      let max = halfSize.clone();
      min.add(pos);
      max.add(pos);

      let holePoints = [
        new Vector2(min.x, min.y),
        new Vector2(max.x, min.y),
        new Vector2(max.x, max.y),
        new Vector2(min.x, max.y)
      ];

      shape.holes.push(new Path(holePoints));
    });

    let geometry = new ShapeGeometry(shape);

    geometry.vertices.forEach((v) => {
      v.applyMatrix4(invTransform);
    });

    // make UVs
    let totalDistance = Core.Utils.distance(v1.x, v1.z, v2.x, v2.z);
    let height = wall.height;
    geometry.faceVertexUvs[0] = [];

    function vertexToUv(vertex) {
      let x = Core.Utils.distance(v1.x, v1.z, vertex.x, vertex.z) / totalDistance;
      let y = vertex.y / height;
      return new Vector2(x, y);
    }

    geometry.faces.forEach((face) => {
      let vertA = geometry.vertices[face.a];
      let vertB = geometry.vertices[face.b];
      let vertC = geometry.vertices[face.c];
      geometry.faceVertexUvs[0].push([
        vertexToUv(vertA),
        vertexToUv(vertB),
        vertexToUv(vertC)]);
    });

    geometry.faceVertexUvs[1] = geometry.faceVertexUvs[0];

    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    let mesh = new Mesh(
      geometry,
      material);

    return mesh;
  }

  function buildSideFillter(p1, p2, height, color) {
    let points = [
      toVec3(p1),
      toVec3(p2),
      toVec3(p2, height),
      toVec3(p1, height)
    ];

    let geometry = new Geometry();
    points.forEach((p) => {
      geometry.vertices.push(p);
    });
    geometry.faces.push(new Face3(0, 1, 2));
    geometry.faces.push(new Face3(0, 2, 3));

    let fillerMaterial = new MeshBasicMaterial({
      color: color,
      side: DoubleSide
    });

    let filler = new Mesh(geometry, fillerMaterial);
    return filler;
  }

  function buildFiller(edge, height, side, color) {
    let points = [
      toVec2(edge.exteriorStart()),
      toVec2(edge.exteriorEnd()),
      toVec2(edge.interiorEnd()),
      toVec2(edge.interiorStart())
    ];

    let fillerMaterial = new MeshBasicMaterial({
      color: color,
      side: side
    });

    let shape = new Shape(points);
    let geometry = new ShapeGeometry(shape);

    let filler = new Mesh(geometry, fillerMaterial);
    filler.rotation.set(Math.PI / 2, 0, 0);
    filler.position.y = height;
    return filler;
  }

  function toVec2(pos) {
    return new Vector2(pos.x, pos.y);
  }

  function toVec3(pos, height?) {
    height = height || 0;
    return new Vector3(pos.x, height, pos.y);
  }

  init();
}

export default Edge;
